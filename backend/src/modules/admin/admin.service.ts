import { prisma } from "../../config/database";
import { Prisma } from "../../generated/prisma/client";
import type {
  AdminPropertyQuery,
  AdminUserQuery,
} from "./admin.validation";

export class AdminError extends Error {
  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = "AdminError";
  }
}

/* =========================================================
   AUDIT LOGGING
========================================================= */

async function recordAdminAudit(
  tx: Prisma.TransactionClient,
  input: {
    actorId: string;
    action: string;
    resourceType: string;
    resourceId: string;
    description: string;
    metadata?: Prisma.InputJsonValue;
  },
) {
  return tx.auditLog.create({
    data: {
      actorId: input.actorId,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      description: input.description,
      ...(input.metadata !== undefined
        ? { metadata: input.metadata }
        : {}),
    },
  });
}

/* =========================================================
   NOTIFICATION CREATION
========================================================= */

async function recordAdminNotification(
  tx: Prisma.TransactionClient,
  input: {
    userId: string;
    type: string;
    title: string;
    message: string;
    data?: Prisma.InputJsonValue;
  },
) {
  return tx.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      ...(input.data !== undefined
        ? { data: input.data }
        : {}),
    },
  });
}

/* =========================================================
   ADMIN DASHBOARD
========================================================= */

export async function getAdminDashboard() {
  const [
    totalUsers,
    totalStudents,
    totalOwners,
    totalProperties,
    pendingProperties,
    publishedProperties,
    rejectedProperties,
    suspendedProperties,
    suspendedUsers,
    totalBookings,
    pendingBookings,
    confirmedBookings,
    rejectedBookings,
    cancelledBookings,
  ] = await Promise.all([
    prisma.user.count(),

    prisma.user.count({
      where: { role: "STUDENT" },
    }),

    prisma.user.count({
      where: { role: "OWNER" },
    }),

    prisma.property.count(),

    prisma.property.count({
      where: { status: "PENDING_APPROVAL" },
    }),

    prisma.property.count({
      where: { status: "PUBLISHED" },
    }),

    prisma.property.count({
      where: { status: "REJECTED" },
    }),

    prisma.property.count({
      where: { status: "SUSPENDED" },
    }),

    prisma.user.count({
      where: { status: "SUSPENDED" },
    }),

    prisma.booking.count(),

    prisma.booking.count({
      where: { status: "PENDING" },
    }),

    prisma.booking.count({
      where: { status: "CONFIRMED" },
    }),

    prisma.booking.count({
      where: { status: "REJECTED" },
    }),

    prisma.booking.count({
      where: { status: "CANCELLED" },
    }),
  ]);

  return {
    users: {
      total: totalUsers,
      students: totalStudents,
      owners: totalOwners,
      suspended: suspendedUsers,
    },

    properties: {
      total: totalProperties,
      pendingApproval: pendingProperties,
      published: publishedProperties,
      rejected: rejectedProperties,
      suspended: suspendedProperties,
    },

    bookings: {
      total: totalBookings,
      pending: pendingBookings,
      confirmed: confirmedBookings,
      rejected: rejectedBookings,
      cancelled: cancelledBookings,
    },
  };
}

/* =========================================================
   LIST USERS
========================================================= */

export async function listAdminUsers(
  filters: AdminUserQuery,
) {
  const {
    search,
    role,
    status,
    page,
    limit,
  } = filters;

  const where: Prisma.UserWhereInput = {
    ...(role ? { role } : {}),
    ...(status ? { status } : {}),

    ...(search
      ? {
          OR: [
            {
              fullName: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              email: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              phone: {
                contains: search,
                mode: "insensitive",
              },
            },
          ],
        }
      : {}),
  };

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    }),

    prisma.user.count({ where }),
  ]);

  return {
    users,

    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/* =========================================================
   GET USER DETAILS
========================================================= */

export async function getAdminUserById(
  userId: string,
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },

    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      createdAt: true,
      updatedAt: true,

      studentProfile: {
        include: {
          university: true,
        },
      },

      ownerProfile: true,

      properties: {
        select: {
          id: true,
          title: true,
          status: true,
          verificationStatus: true,
          city: true,
          monthlyRent: true,
        },
      },
    },
  });

  if (!user) {
    throw new AdminError("User not found", 404);
  }

  return user;
}

/* =========================================================
   SUSPEND USER
========================================================= */

export async function suspendAdminUser(
  userId: string,
  currentAdminId: string,
  reason?: string,
) {
  if (userId === currentAdminId) {
    throw new AdminError(
      "You cannot suspend your own account",
      400,
    );
  }

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },

      select: {
        id: true,
        role: true,
        status: true,
      },
    });

    if (!user) {
      throw new AdminError("User not found", 404);
    }

    if (user.status === "SUSPENDED") {
      throw new AdminError(
        "User is already suspended",
        409,
      );
    }

    if (user.role === "ADMIN") {
      throw new AdminError(
        "Admin accounts cannot be suspended through this endpoint",
        403,
      );
    }

    const updated = await tx.user.update({
      where: { id: userId },

      data: {
        status: "SUSPENDED",
      },

      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        status: true,
      },
    });

    await recordAdminAudit(tx, {
      actorId: currentAdminId,
      action: "USER_SUSPENDED",
      resourceType: "USER",
      resourceId: userId,
      description: `Administrator suspended user ${userId}`,

      metadata: {
        previousStatus: user.status,
        newStatus: "SUSPENDED",
        reason: reason ?? "No reason provided",
      },
    });

    await recordAdminNotification(tx, {
      userId,
      type: "ACCOUNT_SUSPENDED",
      title: "Account suspended",
      message:
        "Your BoardMate account has been suspended by an administrator.",

      data: {
        userId,
        reason: reason ?? "No reason provided",
      },
    });

    return updated;
  });
}

/* =========================================================
   REACTIVATE USER
========================================================= */

export async function reactivateAdminUser(
  userId: string,
  currentAdminId: string,
) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },

      select: {
        id: true,
        role: true,
        status: true,
      },
    });

    if (!user) {
      throw new AdminError("User not found", 404);
    }

    if (user.status === "ACTIVE") {
      throw new AdminError(
        "User is already active",
        409,
      );
    }

    if (user.role === "ADMIN") {
      throw new AdminError(
        "Admin accounts cannot be reactivated through this endpoint",
        403,
      );
    }

    const updated = await tx.user.update({
      where: { id: userId },

      data: {
        status: "ACTIVE",
      },

      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        status: true,
      },
    });

    await recordAdminAudit(tx, {
      actorId: currentAdminId,
      action: "USER_REACTIVATED",
      resourceType: "USER",
      resourceId: userId,
      description: `Administrator reactivated user ${userId}`,

      metadata: {
        previousStatus: user.status,
        newStatus: "ACTIVE",
      },
    });

    await recordAdminNotification(tx, {
      userId,
      type: "ACCOUNT_REACTIVATED",
      title: "Account reactivated",
      message:
        "Your BoardMate account has been reactivated. You can sign in again.",

      data: { userId },
    });

    return updated;
  });
}

/* =========================================================
   GET PROPERTY FOR REVIEW (any status)
========================================================= */

export async function getAdminProperty(propertyId: string) {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: {
      owner: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          status: true,
          createdAt: true,
          ownerProfile: { select: { verificationStatus: true } },
        },
      },
      university: { select: { id: true, name: true, city: true } },
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
    throw new AdminError("Property not found", 404);
  }

  return property;
}

/* =========================================================
   LIST PENDING PROPERTIES
========================================================= */

export async function listPendingProperties(
  filters: AdminPropertyQuery,
) {
  const { page, limit } = filters;

  const where: Prisma.PropertyWhereInput = {
    status: "PENDING_APPROVAL",
  };

  const [properties, total] = await prisma.$transaction([
    prisma.property.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,

      orderBy: {
        createdAt: "asc",
      },

      include: {
        owner: {
          select: {
            id: true,
            fullName: true,
            email: true,
            status: true,

            ownerProfile: {
              select: {
                verificationStatus: true,
              },
            },
          },
        },

        university: {
          select: {
            id: true,
            name: true,
            city: true,
          },
        },

        images: {
          orderBy: {
            sortOrder: "asc",
          },
        },

        rooms: {
          select: {
            id: true,
            name: true,
            roomType: true,
            capacity: true,
            monthlyRent: true,
            status: true,
          },
        },
      },
    }),

    prisma.property.count({ where }),
  ]);

  return {
    properties,

    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/* =========================================================
   APPROVE PROPERTY
========================================================= */

export async function approveAdminProperty(
  propertyId: string,
  currentAdminId: string,
) {
  return prisma.$transaction(async (tx) => {
    const property = await tx.property.findUnique({
      where: { id: propertyId },

      select: {
        id: true,
        ownerId: true,
        status: true,
        verificationStatus: true,
        title: true,
      },
    });

    if (!property) {
      throw new AdminError(
        "Property not found",
        404,
      );
    }

    if (property.status !== "PENDING_APPROVAL") {
      throw new AdminError(
        "Only properties awaiting approval can be approved",
        409,
      );
    }

    if (property.verificationStatus !== "VERIFIED") {
      throw new AdminError(
        "Property verification must be completed before publication",
        409,
      );
    }

    const updated = await tx.property.update({
      where: { id: propertyId },

      data: {
        status: "PUBLISHED",
      },

      select: {
        id: true,
        title: true,
        status: true,
        verificationStatus: true,
        updatedAt: true,
      },
    });

    await recordAdminAudit(tx, {
      actorId: currentAdminId,
      action: "PROPERTY_APPROVED",
      resourceType: "PROPERTY",
      resourceId: propertyId,
      description: `Administrator approved property ${propertyId}`,

      metadata: {
        previousStatus: property.status,
        newStatus: "PUBLISHED",
      },
    });

    await recordAdminNotification(tx, {
      userId: property.ownerId,
      type: "PROPERTY_APPROVED",
      title: "Property approved",
      message:
        `Your property "${property.title}" has been approved and published on BoardMate.`,

      data: {
        propertyId,
      },
    });

    return updated;
  });
}

/* =========================================================
   REJECT PROPERTY
========================================================= */

export async function rejectAdminProperty(
  propertyId: string,
  reason: string,
  currentAdminId: string,
) {
  return prisma.$transaction(async (tx) => {
    const property = await tx.property.findUnique({
      where: { id: propertyId },

      select: {
        id: true,
        ownerId: true,
        status: true,
        title: true,
      },
    });

    if (!property) {
      throw new AdminError(
        "Property not found",
        404,
      );
    }

    if (property.status !== "PENDING_APPROVAL") {
      throw new AdminError(
        "Only properties awaiting approval can be rejected",
        409,
      );
    }

    const updated = await tx.property.update({
      where: { id: propertyId },

      data: {
        status: "REJECTED",
        verificationStatus: "REJECTED",
      },

      select: {
        id: true,
        title: true,
        status: true,
        verificationStatus: true,
        updatedAt: true,
      },
    });

    await recordAdminAudit(tx, {
      actorId: currentAdminId,
      action: "PROPERTY_REJECTED",
      resourceType: "PROPERTY",
      resourceId: propertyId,
      description: `Administrator rejected property ${propertyId}`,

      metadata: {
        previousStatus: property.status,
        newStatus: "REJECTED",
        reason,
      },
    });

    await recordAdminNotification(tx, {
      userId: property.ownerId,
      type: "PROPERTY_REJECTED",
      title: "Property rejected",
      message:
        `Your property "${property.title}" was rejected. Reason: ${reason}`,

      data: {
        propertyId,
        reason,
      },
    });

    return {
      ...updated,
      rejectionReason: reason,
    };
  });
}

/* =========================================================
   SUSPEND PROPERTY
========================================================= */

export async function suspendAdminProperty(
  propertyId: string,
  reason: string,
  currentAdminId: string,
) {
  return prisma.$transaction(async (tx) => {
    const property = await tx.property.findUnique({
      where: { id: propertyId },

      select: {
        id: true,
        ownerId: true,
        status: true,
        title: true,
      },
    });

    if (!property) {
      throw new AdminError(
        "Property not found",
        404,
      );
    }

    if (property.status !== "PUBLISHED") {
      throw new AdminError(
        "Only published properties can be suspended",
        409,
      );
    }

    const updated = await tx.property.update({
      where: { id: propertyId },

      data: {
        status: "SUSPENDED",
      },

      select: {
        id: true,
        title: true,
        status: true,
        verificationStatus: true,
        updatedAt: true,
      },
    });

    await recordAdminAudit(tx, {
      actorId: currentAdminId,
      action: "PROPERTY_SUSPENDED",
      resourceType: "PROPERTY",
      resourceId: propertyId,
      description: `Administrator suspended property ${propertyId}`,

      metadata: {
        previousStatus: property.status,
        newStatus: "SUSPENDED",
        reason,
      },
    });

    await recordAdminNotification(tx, {
      userId: property.ownerId,
      type: "PROPERTY_SUSPENDED",
      title: "Property suspended",
      message:
        `Your property "${property.title}" was suspended. Reason: ${reason}`,

      data: {
        propertyId,
        reason,
      },
    });

    return {
      ...updated,
      suspensionReason: reason,
    };
  });
}

/* =========================================================
   VERIFY PROPERTY
========================================================= */

export async function verifyAdminProperty(
  propertyId: string,
  currentAdminId: string,
) {
  return prisma.$transaction(async (tx) => {
    const property = await tx.property.findUnique({
      where: { id: propertyId },

      select: {
        id: true,
        ownerId: true,
        title: true,
        status: true,
        verificationStatus: true,
      },
    });

    if (!property) {
      throw new AdminError(
        "Property not found",
        404,
      );
    }

    if (property.verificationStatus === "VERIFIED") {
      throw new AdminError(
        "Property is already verified",
        409,
      );
    }

    const updated = await tx.property.update({
      where: { id: propertyId },

      data: {
        verificationStatus: "VERIFIED",
      },

      select: {
        id: true,
        title: true,
        status: true,
        verificationStatus: true,
        updatedAt: true,
      },
    });

    await recordAdminAudit(tx, {
      actorId: currentAdminId,
      action: "PROPERTY_VERIFIED",
      resourceType: "PROPERTY",
      resourceId: propertyId,
      description: `Administrator verified property ${propertyId}`,

      metadata: {
        previousVerificationStatus: property.verificationStatus,
        newVerificationStatus: "VERIFIED",
      },
    });

    await recordAdminNotification(tx, {
      userId: property.ownerId,
      type: "PROPERTY_VERIFIED",
      title: "Property verified",
      message:
        `Your property "${property.title}" has successfully passed verification.`,

      data: {
        propertyId,
      },
    });

    return updated;
  });
}