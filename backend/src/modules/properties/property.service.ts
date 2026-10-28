
import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../config/database";
import { createAuditLog } from "../audit/audit.service";
import {
  activeConfirmedBookings,
  propertyAvailability,
  roomAvailability,
  todayUtc,
} from "./property.availability";

import type {
  CreatePropertyInput,
  UpdatePropertyInput,
  PropertySearchInput,
} from "./property.validation";

export class PropertyError extends Error {
  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = "PropertyError";
  }
}

export async function createProperty(
  ownerId: string,
  input: CreatePropertyInput,
) {
  const existingSlug = await prisma.property.findUnique({
    where: { slug: input.slug },
    select: { id: true },
  });

  if (existingSlug) {
    throw new PropertyError(
      "This property slug is already in use",
      409,
    );
  }

  if (input.universityId) {
    const university = await prisma.university.findUnique({
      where: { id: input.universityId },
      select: { id: true },
    });

    if (!university) {
      throw new PropertyError("University not found", 400);
    }
  }

  return prisma.property.create({
    data: {
      ownerId,
      title: input.title,
      slug: input.slug,
      description: input.description,
      propertyType: input.propertyType,
      address: input.address,
      city: input.city,
      monthlyRent: input.monthlyRent,
      securityDeposit: input.securityDeposit,
      latitude: input.latitude,
      longitude: input.longitude,
      mapUrl: input.mapUrl,
      universityId: input.universityId,

      // New listings require moderation before becoming public.
      status: "DRAFT",
      verificationStatus: "PENDING",
    },

    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      propertyType: true,
      address: true,
      city: true,
      monthlyRent: true,
      securityDeposit: true,
      latitude: true,
      longitude: true,
      mapUrl: true,
      status: true,
      verificationStatus: true,
      universityId: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function listProperties(
  filters: PropertySearchInput,
) {
  const where: Prisma.PropertyWhereInput = {
    status: "PUBLISHED",
    verificationStatus: "VERIFIED",
  };

  // Search property titles and descriptions.
  if (filters.search) {
    where.OR = [
      {
        title: {
          contains: filters.search,
          mode: "insensitive",
        },
      },
      {
        description: {
          contains: filters.search,
          mode: "insensitive",
        },
      },
    ];
  }

  // Filter by city.
  if (filters.city) {
    where.city = {
      contains: filters.city,
      mode: "insensitive",
    };
  }

  // Filter by property type.
  if (filters.propertyType) {
    where.propertyType = filters.propertyType;
  }

  // Filter by university.
  if (filters.universityId) {
    where.universityId = filters.universityId;
  }

  // Filter by monthly rent.
  if (
    filters.minRent !== undefined ||
    filters.maxRent !== undefined
  ) {
    where.monthlyRent = {
      ...(filters.minRent !== undefined
        ? {
            gte: new Prisma.Decimal(filters.minRent),
          }
        : {}),
      ...(filters.maxRent !== undefined
        ? {
            lte: new Prisma.Decimal(filters.maxRent),
          }
        : {}),
    };
  }

  // Sort results.
  const primaryOrder: Prisma.PropertyOrderByWithRelationInput =
    filters.sortBy === "price_asc"
      ? { monthlyRent: "asc" }
      : filters.sortBy === "price_desc"
        ? { monthlyRent: "desc" }
        : { createdAt: "desc" };

  const skip = (filters.page - 1) * filters.limit;
  const today = todayUtc();

  // Rank all matches so fully booked places come after ones with free rooms.
  // shortcut: loads every match's rooms and active bookings; move to SQL if listings reach the thousands.
  const ranked = await prisma.property.findMany({
    where,
    orderBy: [primaryOrder, { id: "asc" }],
    select: {
      id: true,
      rooms: {
        where: { status: "AVAILABLE" },
        select: {
          bookings: {
            where: activeConfirmedBookings(today),
            select: { moveInDate: true, moveOutDate: true },
          },
        },
      },
    },
  });

  const availabilityById = new Map(
    ranked.map((p) => [
      p.id,
      propertyAvailability(p.rooms.map((r) => roomAvailability(r.bookings, today))),
    ]),
  );
  const pageIds = ranked
    .map((p, index) => ({ id: p.id, index, full: availabilityById.get(p.id)!.fullyBooked }))
    .sort((a, b) => Number(a.full) - Number(b.full) || a.index - b.index)
    .slice(skip, skip + filters.limit)
    .map((p) => p.id);
  const total = ranked.length;

  const rows = await prisma.property.findMany({
      where: { id: { in: pageIds } },

      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        propertyType: true,
        city: true,
        monthlyRent: true,
        securityDeposit: true,
        latitude: true,
        longitude: true,
        universityId: true,
        createdAt: true,

        images: {
          orderBy: { sortOrder: "asc" },
          take: 1,
          select: {
            imageUrl: true,
          },
        },
      },
    });

  const byId = new Map(rows.map((p) => [p.id, p]));
  const properties = pageIds.flatMap((id) => {
    const p = byId.get(id);
    return p ? [{ ...p, availability: availabilityById.get(id)! }] : [];
  });

  return {
    properties,

    pagination: {
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages: Math.ceil(total / filters.limit),
    },
  };
}

export async function getPropertyById(id: string) {
  const today = todayUtc();
  const property = await prisma.property.findFirst({
    where: {
      id,
      status: "PUBLISHED",
      verificationStatus: "VERIFIED",
    },

    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      propertyType: true,
      address: true,
      city: true,
      monthlyRent: true,
      securityDeposit: true,
      latitude: true,
      longitude: true,
      mapUrl: true,
      createdAt: true,

      owner: {
        select: {
          id: true,
          fullName: true,
        },
      },

      rooms: {
        where: {
          status: "AVAILABLE",
        },

        select: {
          id: true,
          name: true,
          roomType: true,
          capacity: true,
          monthlyRent: true,
          status: true,

          images: {
            orderBy: { sortOrder: "asc" },
            select: { id: true, imageUrl: true },
          },

          bookings: {
            where: activeConfirmedBookings(today),
            orderBy: { moveInDate: "asc" },
            select: { moveInDate: true, moveOutDate: true },
          },
        },
      },

      images: {
        orderBy: {
          sortOrder: "asc",
        },

        select: {
          id: true,
          roomId: true,
          imageUrl: true,
          sortOrder: true,
        },
      },
    },
  });

  if (!property) {
    throw new PropertyError("Property not found", 404);
  }

  // Only dates leave the server; who booked stays private.
  const rooms = property.rooms.map(({ bookings, ...room }) => ({
    ...room,
    availability: roomAvailability(bookings, today),
    bookedPeriods: bookings.map((b) => ({ from: b.moveInDate, until: b.moveOutDate })),
  }));

  return {
    ...property,
    rooms,
    availability: propertyAvailability(rooms.map((r) => r.availability)),
  };
}

export async function updateProperty(
  propertyId: string,
  ownerId: string,
  input: UpdatePropertyInput,
) {
  const property = await prisma.property.findUnique({
    where: {
      id: propertyId,
    },

    select: {
      id: true,
      ownerId: true,
      status: true,
    },
  });

  if (!property || property.ownerId !== ownerId) {
    throw new PropertyError("Property not found", 404);
  }

  if (property.status === "PUBLISHED") {
    throw new PropertyError(
      "Published listings cannot be edited until an editing workflow is implemented",
      409,
    );
  }

  if (input.universityId) {
    const university = await prisma.university.findUnique({
      where: {
        id: input.universityId,
      },

      select: {
        id: true,
      },
    });

    if (!university) {
      throw new PropertyError("University not found", 400);
    }
  }

  if (input.slug) {
    const existingSlug = await prisma.property.findFirst({
      where: {
        slug: input.slug,
        NOT: {
          id: propertyId,
        },
      },

      select: {
        id: true,
      },
    });

    if (existingSlug) {
      throw new PropertyError(
        "This property slug is already in use",
        409,
      );
    }
  }

  return prisma.property.update({
    where: {
      id: propertyId,
      ownerId,
      status: {
      not: "PUBLISHED",
      },
    },

    data: {
  ...(input.title !== undefined
    ? { title: input.title }
    : {}),
  ...(input.slug !== undefined
    ? { slug: input.slug }
    : {}),
  ...(input.description !== undefined
    ? { description: input.description }
    : {}),
  ...(input.propertyType !== undefined
    ? { propertyType: input.propertyType }
    : {}),
  ...(input.address !== undefined
    ? { address: input.address }
    : {}),
  ...(input.city !== undefined
    ? { city: input.city }
    : {}),
  ...(input.monthlyRent !== undefined
    ? { monthlyRent: input.monthlyRent }
    : {}),
  ...(input.securityDeposit !== undefined
    ? { securityDeposit: input.securityDeposit }
    : {}),
  ...(input.latitude !== undefined
    ? { latitude: input.latitude }
    : {}),
  ...(input.longitude !== undefined
    ? { longitude: input.longitude }
    : {}),
  ...(input.mapUrl !== undefined
    ? { mapUrl: input.mapUrl }
    : {}),
  ...(input.universityId !== undefined
    ? { universityId: input.universityId }
    : {}),
},

    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      propertyType: true,
      address: true,
      city: true,
      monthlyRent: true,
      securityDeposit: true,
      latitude: true,
      longitude: true,
      mapUrl: true,
      status: true,
      verificationStatus: true,
      universityId: true,
      updatedAt: true,
    },
  });
}

/**
 * Owner removes a listing and every active admin is told why.
 * Listings with booking or review history are archived (hidden) instead of
 * erased, because those records must keep pointing at the property.
 */
export async function deleteProperty(
  propertyId: string,
  ownerId: string,
  reason: string,
) {
  return prisma.$transaction(async (tx) => {
    const property = await tx.property.findFirst({
      where: { id: propertyId, ownerId, status: { not: "ARCHIVED" } },
      select: {
        id: true,
        title: true,
        status: true,
        city: true,
        owner: { select: { fullName: true, email: true } },
        _count: { select: { bookings: true, reviews: true } },
      },
    });

    if (!property) {
      throw new PropertyError("Property not found", 404);
    }

    const activeBookings = await tx.booking.count({
      where: { propertyId, status: { in: ["PENDING", "CONFIRMED"] } },
    });

    if (activeBookings > 0) {
      throw new PropertyError(
        `This property has ${activeBookings} pending or confirmed booking${activeBookings === 1 ? "" : "s"}. Respond to or cancel them before deleting it.`,
        409,
      );
    }

    const archived =
      property._count.bookings > 0 || property._count.reviews > 0;

    if (archived) {
      await tx.property.update({
        where: { id: propertyId },
        data: { status: "ARCHIVED" },
      });
    } else {
      // shortcut: Cloudinary files of deleted photos are not removed; add a cleanup job if storage grows.
      await tx.property.delete({ where: { id: propertyId } });
    }

    await createAuditLog(
      {
        actorId: ownerId,
        action: archived ? "PROPERTY_ARCHIVED_BY_OWNER" : "PROPERTY_DELETED_BY_OWNER",
        resourceType: "PROPERTY",
        resourceId: propertyId,
        description: `Owner removed property "${property.title}"`,
        metadata: { reason, previousStatus: property.status, archived },
      },
      tx,
    );

    const admins = await tx.user.findMany({
      where: { role: "ADMIN", status: "ACTIVE" },
      select: { id: true },
    });

    await tx.notification.createMany({
      data: admins.map((admin) => ({
        userId: admin.id,
        type: "PROPERTY_DELETED_BY_OWNER",
        title: "Owner deleted a listing",
        message: `${property.owner.fullName} deleted "${property.title}" (${property.city}, was ${property.status.toLowerCase().replace(/_/g, " ")}). Reason: ${reason}`,
        data: {
          propertyId,
          ownerId,
          ownerEmail: property.owner.email,
          reason,
          previousStatus: property.status,
          archived,
        },
      })),
    });

    return { archived };
  });
}

export async function listOwnerProperties(ownerId: string) {
  return prisma.property.findMany({
    where: { ownerId, status: { not: "ARCHIVED" } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      propertyType: true,
      city: true,
      monthlyRent: true,
      status: true,
      verificationStatus: true,
      mapUrl: true,
      createdAt: true,
      updatedAt: true,
      images: {
        orderBy: { sortOrder: "asc" },
        take: 1,
        select: { imageUrl: true },
      },
      _count: {
        select: { rooms: true, images: true },
      },
    },
  });
}

/** Full details of one of the owner's properties, in any status, for editing. */
export async function getOwnerProperty(propertyId: string, ownerId: string) {
  const property = await prisma.property.findFirst({
    where: { id: propertyId, ownerId, status: { not: "ARCHIVED" } },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      propertyType: true,
      address: true,
      city: true,
      monthlyRent: true,
      securityDeposit: true,
      mapUrl: true,
      universityId: true,
      status: true,
      verificationStatus: true,
      createdAt: true,
      updatedAt: true,
      rooms: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          roomType: true,
          capacity: true,
          monthlyRent: true,
          status: true,
          images: {
            orderBy: { sortOrder: "asc" },
            select: { id: true, imageUrl: true },
          },
        },
      },
      images: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, roomId: true, imageUrl: true, sortOrder: true },
      },
    },
  });

  if (!property) {
    throw new PropertyError("Property not found", 404);
  }

  return property;
}

export async function submitPropertyForApproval(
  propertyId: string,
  ownerId: string,
) {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: {
      id: true,
      ownerId: true,
      status: true,
      _count: { select: { rooms: true, images: true } },
    },
  });

  if (!property || property.ownerId !== ownerId) {
    throw new PropertyError("Property not found", 404);
  }

  // Rejected listings may be fixed and resubmitted.
  if (
    property.status !== "DRAFT" &&
    property.status !== "REJECTED"
  ) {
    throw new PropertyError(
      "Only draft or rejected listings can be submitted for approval",
      409,
    );
  }

  const missing = [
    property._count.rooms === 0 ? "one room" : null,
    property._count.images === 0 ? "one photo" : null,
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new PropertyError(
      `Add at least ${missing.join(" and ")} before submitting for approval`,
      400,
    );
  }

  return prisma.property.update({
    where: {
      id: propertyId,
      ownerId,
      status: { in: ["DRAFT", "REJECTED"] },
    },
    data: {
      status: "PENDING_APPROVAL",
      verificationStatus: "PENDING",
    },
    select: {
      id: true,
      title: true,
      status: true,
      verificationStatus: true,
      updatedAt: true,
    },
  });
}
