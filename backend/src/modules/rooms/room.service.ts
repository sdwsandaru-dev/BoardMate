import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../config/database";

import type {
  CreateRoomInput,
  UpdateRoomInput,
} from "./room.validation";

export class RoomError extends Error {
  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = "RoomError";
  }
}

/**
 * Ensure the property exists and belongs to the owner.
 */
async function verifyPropertyOwnership(
  propertyId: string,
  ownerId: string,
) {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: {
      id: true,
      ownerId: true,
      status: true,
    },
  });

  if (!property) {
    throw new RoomError("Property not found", 404);
  }

  if (property.ownerId !== ownerId) {
    throw new RoomError(
      "You do not have permission to manage this property",
      403,
    );
  }

  if (
    property.status === "ARCHIVED" ||
    property.status === "SUSPENDED"
  ) {
    throw new RoomError(
      "Rooms cannot be managed for an archived or suspended property",
      409,
    );
  }

  return property;
}

/**
 * Create a room under a property owned by the current user.
 */
export async function createRoom(
  propertyId: string,
  ownerId: string,
  input: CreateRoomInput,
) {
  await verifyPropertyOwnership(propertyId, ownerId);

  try {
    return await prisma.room.create({
      data: {
        propertyId,
        name: input.name,
        roomType: input.roomType,
        capacity: input.capacity,
        monthlyRent: new Prisma.Decimal(input.monthlyRent),
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2003" || error.code === "P2025") {
        throw new RoomError(
          "The property could not be found or is no longer available",
          404,
        );
      }

      throw new RoomError(
        "Unable to create the room. Check the property and room information.",
        400,
      );
    }

    throw error;
  }
}

/**
 * List rooms belonging to a published and verified property.
 */
export async function listRoomsByProperty(
  propertyId: string,
) {
  const property = await prisma.property.findFirst({
    where: {
      id: propertyId,
      status: "PUBLISHED",
      verificationStatus: "VERIFIED",
    },
    select: {
      id: true,
    },
  });

  if (!property) {
    throw new RoomError(
      "Property not found or is not publicly available",
      404,
    );
  }

  return prisma.room.findMany({
    where: {
      propertyId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

/**
 * List rooms for a property belonging to the current owner.
 */
export async function listOwnerRoomsByProperty(
  propertyId: string,
  ownerId: string,
) {
  const property = await prisma.property.findFirst({
    where: {
      id: propertyId,
      ownerId,
    },
    select: {
      id: true,
    },
  });

  if (!property) {
    throw new RoomError(
      "Property not found or you do not have permission to view it",
      404,
    );
  }

  return prisma.room.findMany({
    where: {
      propertyId,
    },
    // Oldest first, so rooms appear in the order the owner added them.
    orderBy: {
      createdAt: "asc",
    },
  });
}

/**
 * Get one room belonging to a publicly available property.
 */
export async function getRoomById(
  roomId: string,
) {
  const room = await prisma.room.findFirst({
    where: {
      id: roomId,
      property: {
        is: {
          status: "PUBLISHED",
          verificationStatus: "VERIFIED",
        },
      },
    },
    include: {
      property: {
        select: {
          id: true,
          title: true,
          city: true,
          address: true,
          status: true,
          verificationStatus: true,
        },
      },
    },
  });

  if (!room) {
    throw new RoomError(
      "Room not found or is not publicly available",
      404,
    );
  }

  return room;
}

/**
 * Update a room belonging to the current property owner.
 */
export async function updateRoom(
  roomId: string,
  ownerId: string,
  input: UpdateRoomInput,
) {
  const room = await prisma.room.findUnique({
    where: {
      id: roomId,
    },
    include: {
      property: {
        select: {
          id: true,
          ownerId: true,
          status: true,
        },
      },
    },
  });

  if (!room) {
    throw new RoomError("Room not found", 404);
  }

  await verifyPropertyOwnership(room.property.id, ownerId);

  // Explicitly whitelist editable room fields.
  const data: Prisma.RoomUpdateInput = {};

  if (input.name !== undefined) {
    data.name = input.name;
  }

  if (input.roomType !== undefined) {
    data.roomType = input.roomType;
  }

  if (input.capacity !== undefined) {
    data.capacity = input.capacity;
  }

  if (input.monthlyRent !== undefined) {
    data.monthlyRent = new Prisma.Decimal(input.monthlyRent);
  }

  // Recheck ownership and property status inside the mutation.
  // The room's propertyId is immutable through this endpoint.
  try {
    return await prisma.room.update({
      where: {
        id: roomId,
        property: {
          is: {
            ownerId,
            status: {
              notIn: ["ARCHIVED", "SUSPENDED"],
            },
          },
        },
      },
      data,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        throw new RoomError(
          "Room not found or you no longer have permission to manage it",
          404,
        );
      }
    }

    throw error;
  }
}

/**
 * Delete a room belonging to the current property owner.
 */
export async function deleteRoom(
  roomId: string,
  ownerId: string,
) {
  const room = await prisma.room.findUnique({
    where: {
      id: roomId,
    },
    include: {
      property: {
        select: {
          id: true,
          ownerId: true,
          status: true,
        },
      },
      bookings: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  });

  if (!room) {
    throw new RoomError("Room not found", 404);
  }

  await verifyPropertyOwnership(room.property.id, ownerId);

  const activeBookings = room.bookings.some(
    (booking) =>
      booking.status === "PENDING" ||
      booking.status === "CONFIRMED",
  );

  if (activeBookings) {
    throw new RoomError(
      "This room cannot be deleted while it has active bookings",
      409,
    );
  }

  try {
    return await prisma.$transaction(async (tx) => {
      // Recheck active bookings immediately before deletion.
      const activeBooking = await tx.booking.findFirst({
        where: {
          roomId,
          status: {
            in: ["PENDING", "CONFIRMED"],
          },
        },
        select: {
          id: true,
        },
      });

      if (activeBooking) {
        throw new RoomError(
          "This room cannot be deleted while it has active bookings",
          409,
        );
      }

      return tx.room.delete({
        where: {
          id: roomId,
          property: {
            is: {
              ownerId,
              status: {
                notIn: ["ARCHIVED", "SUSPENDED"],
              },
            },
          },
        },
      });
    });
  } catch (error) {
    if (error instanceof RoomError) {
      throw error;
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        throw new RoomError(
          "Room not found or you no longer have permission to manage it",
          404,
        );
      }

      if (error.code === "P2003" || error.code === "P2014") {
        throw new RoomError(
          "This room cannot be deleted because it is referenced by another record",
          409,
        );
      }
    }

    throw error;
  }
}