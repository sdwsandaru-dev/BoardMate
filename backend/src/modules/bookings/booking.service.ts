import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../config/database";
import type { CreateBookingInput } from "./booking.validation";

export class BookingError extends Error {
  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = "BookingError";
  }
}

/**
 * Convert a date to midnight UTC for a PostgreSQL DATE column.
 */
function dateOnly(value: Date): Date {
  return new Date(
    Date.UTC(
      value.getUTCFullYear(),
      value.getUTCMonth(),
      value.getUTCDate(),
    ),
  );
}

/**
 * Bookings on a room whose stay overlaps [moveInDate, moveOutDate).
 * A null moveOutDate means the stay has no end.
 */
function overlapping(
  roomId: string,
  moveInDate: Date,
  moveOutDate: Date | null,
): Prisma.BookingWhereInput {
  return {
    roomId,
    moveInDate: {
      lt: moveOutDate ?? new Date("9999-12-31T00:00:00.000Z"),
    },
    OR: [{ moveOutDate: null }, { moveOutDate: { gt: moveInDate } }],
  };
}

const fmtDay = (d: Date) =>
  d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/**
 * Create a booking request for a publicly available room.
 * Only confirmed stays block a room; several students may request the same dates
 * and the owner picks one.
 */
export async function createBooking(
  studentId: string,
  input: CreateBookingInput,
) {
  const room = await prisma.room.findFirst({
    where: {
      id: input.roomId,
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
          ownerId: true,
          status: true,
          verificationStatus: true,
        },
      },
    },
  });

  if (!room) {
    throw new BookingError(
      "Room not found or is not publicly available",
      404,
    );
  }

  if (room.status !== "AVAILABLE") {
    throw new BookingError(
      "This room is not currently available",
      409,
    );
  }

  const moveInDate = dateOnly(input.moveInDate);
  const moveOutDate = input.moveOutDate
    ? dateOnly(input.moveOutDate)
    : null;

  if (moveInDate < dateOnly(new Date())) {
    throw new BookingError(
      "Move-in date cannot be in the past",
      400,
    );
  }

  if (moveOutDate && moveOutDate <= moveInDate) {
    throw new BookingError(
      "Move-out date must be after move-in date",
      400,
    );
  }

  const conflict = await prisma.booking.findFirst({
    where: {
      ...overlapping(room.id, moveInDate, moveOutDate),
      status: "CONFIRMED",
    },
    orderBy: { moveInDate: "asc" },
    select: { moveInDate: true, moveOutDate: true },
  });

  if (conflict) {
    throw new BookingError(
      conflict.moveOutDate
        ? `This room is booked from ${fmtDay(conflict.moveInDate)} until ${fmtDay(conflict.moveOutDate)}. Choose dates outside that period.`
        : `This room is booked from ${fmtDay(conflict.moveInDate)} with no end date. Choose a stay that ends before then.`,
      409,
    );
  }

  const duplicate = await prisma.booking.findFirst({
    where: {
      ...overlapping(room.id, moveInDate, moveOutDate),
      studentId,
      status: "PENDING",
    },
    select: { id: true },
  });

  if (duplicate) {
    throw new BookingError(
      "You already have a pending request for this room on these dates",
      409,
    );
  }

  try {
    return await prisma.$transaction(async (tx) => {
      // Recheck overlapping bookings inside the transaction.
      // For high-concurrency production use, a database constraint or
      // suitable locking strategy is also needed to prevent race conditions.
      const confirmed = await tx.booking.findFirst({
        where: {
          ...overlapping(room.id, moveInDate, moveOutDate),
          status: "CONFIRMED",
        },
        select: { id: true },
      });

      if (confirmed) {
        throw new BookingError(
          "This room was just booked for those dates. Choose other dates.",
          409,
        );
      }

      const booking = await tx.booking.create({
        data: {
          studentId,
          propertyId: room.propertyId,
          roomId: room.id,
          moveInDate,
          moveOutDate,
          message: input.message || null,
          status: "PENDING",
        },
        include: {
          property: {
            select: {
              id: true,
              title: true,
              city: true,
            },
          },
          room: {
            select: {
              id: true,
              name: true,
              roomType: true,
              monthlyRent: true,
            },
          },
        },
      });

      const notificationData: Prisma.InputJsonObject = {
        bookingId: booking.id,
        propertyId: room.property.id,
        roomId: room.id,
      };

      // Notify the owner.
      await tx.notification.create({
        data: {
          userId: room.property.ownerId,
          type: "BOOKING_REQUESTED",
          title: "New booking request",
          message: `You have a new booking request for ${room.property.title}.`,
          data: notificationData,
        },
      });

      // Confirm submission to the student.
      await tx.notification.create({
        data: {
          userId: studentId,
          type: "BOOKING_SUBMITTED",
          title: "Booking request sent",
          message: `Your booking request for ${room.property.title} has been sent to the owner.`,
          data: notificationData,
        },
      });

      return booking;
    });
  } catch (error) {
    if (error instanceof BookingError) {
      throw error;
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        throw new BookingError(
          "A conflicting booking already exists",
          409,
        );
      }

      throw new BookingError(
        "Unable to create the booking. Please check the booking details.",
        400,
      );
    }

    throw error;
  }
}

/**
 * List bookings belonging to a student.
 */
export async function listStudentBookings(studentId: string) {
  return prisma.booking.findMany({
    where: { studentId },
    include: {
      property: {
        select: {
          id: true,
          title: true,
          city: true,
        },
      },
      room: {
        select: {
          id: true,
          name: true,
          roomType: true,
          monthlyRent: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * List bookings for properties owned by the current owner.
 */
export async function listOwnerBookings(ownerId: string) {
  return prisma.booking.findMany({
    where: {
      property: {
        is: { ownerId },
      },
    },
    include: {
      student: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
      property: {
        select: {
          id: true,
          title: true,
          city: true,
        },
      },
      room: {
        select: {
          id: true,
          name: true,
          roomType: true,
          monthlyRent: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Get a booking only if the current student or property owner
 * is authorized to access it.
 */
export async function getBookingById(
  bookingId: string,
  userId: string,
  role: string,
) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      student: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
      property: {
        select: {
          id: true,
          title: true,
          city: true,
          ownerId: true,
        },
      },
      room: {
        select: {
          id: true,
          name: true,
          roomType: true,
          monthlyRent: true,
        },
      },
    },
  });

  if (!booking) {
    throw new BookingError("Booking not found", 404);
  }

  const isStudent = booking.studentId === userId;
  const isOwner =
    role === "OWNER" && booking.property.ownerId === userId;

  if (!isStudent && !isOwner && role !== "ADMIN") {
    throw new BookingError(
      "You do not have permission to view this booking",
      403,
    );
  }

  return booking;
}

/**
 * Change booking status and create the appropriate notification
 * in the same database transaction.
 */
export async function updateBookingStatus(
  bookingId: string,
  userId: string,
  role: string,
  action: "CANCELLED" | "CONFIRMED" | "REJECTED",
) {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            ownerId: true,
          },
        },
        room: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!booking) {
      throw new BookingError("Booking not found", 404);
    }

    if (action === "CANCELLED") {
      if (booking.studentId !== userId) {
        throw new BookingError(
          "Only the student who created this booking can cancel it",
          403,
        );
      }

      if (
        booking.status !== "PENDING" &&
        booking.status !== "CONFIRMED"
      ) {
        throw new BookingError(
          "Only pending or confirmed bookings can be cancelled",
          409,
        );
      }
    } else {
      if (
        role !== "OWNER" ||
        booking.property.ownerId !== userId
      ) {
        throw new BookingError(
          "Only the owner of this property can approve or reject this booking",
          403,
        );
      }

      if (booking.status !== "PENDING") {
        throw new BookingError(
          "Only pending bookings can be approved or rejected",
          409,
        );
      }
    }

    if (action === "CONFIRMED") {
      const clash = await tx.booking.findFirst({
        where: {
          ...overlapping(booking.roomId, booking.moveInDate, booking.moveOutDate),
          status: "CONFIRMED",
          id: { not: booking.id },
        },
        select: { id: true },
      });

      if (clash) {
        throw new BookingError(
          "Another booking for this room is already confirmed for these dates",
          409,
        );
      }
    }

    const updated = await tx.booking.update({
      where: { id: bookingId },
      data: { status: action },
      include: {
        property: {
          select: {
            id: true,
            title: true,
          },
        },
        room: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const notificationData: Prisma.InputJsonObject = {
      bookingId: booking.id,
      propertyId: booking.propertyId,
      roomId: booking.roomId,
      status: action,
    };

    if (action === "CONFIRMED") {
      // The room is now taken for these dates, so the other requests cannot go ahead.
      const others = await tx.booking.findMany({
        where: {
          ...overlapping(booking.roomId, booking.moveInDate, booking.moveOutDate),
          status: "PENDING",
          id: { not: booking.id },
        },
        select: { id: true, studentId: true },
      });

      if (others.length) {
        await tx.booking.updateMany({
          where: { id: { in: others.map((o) => o.id) } },
          data: { status: "REJECTED" },
        });

        await tx.notification.createMany({
          data: others.map((o) => ({
            userId: o.studentId,
            type: "BOOKING_REJECTED",
            title: "Room no longer available",
            message: `${booking.room.name} at ${booking.property.title} was booked by another student for the dates you asked for, so your request was closed. Other rooms or dates may still be free.`,
            data: {
              bookingId: o.id,
              propertyId: booking.propertyId,
              roomId: booking.roomId,
              status: "REJECTED",
            },
          })),
        });
      }

      await tx.notification.create({
        data: {
          userId: booking.studentId,
          type: "BOOKING_APPROVED",
          title: "Booking approved",
          message: `Your booking request for ${booking.property.title} has been approved.`,
          data: notificationData,
        },
      });
    } else if (action === "REJECTED") {
      await tx.notification.create({
        data: {
          userId: booking.studentId,
          type: "BOOKING_REJECTED",
          title: "Booking rejected",
          message: `Your booking request for ${booking.property.title} has been rejected.`,
          data: notificationData,
        },
      });
    } else if (action === "CANCELLED") {
      await tx.notification.create({
        data: {
          userId: booking.property.ownerId,
          type: "BOOKING_CANCELLED",
          title: "Booking cancelled",
          message: `A booking request for ${booking.property.title} has been cancelled by the student.`,
          data: notificationData,
        },
      });
    }

    return updated;
  });
}