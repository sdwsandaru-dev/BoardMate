
import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../config/database";

export class FavoriteError extends Error {
  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = "FavoriteError";
  }
}

export async function addFavorite(
  userId: string,
  propertyId: string,
) {
  // Only published and verified properties can be favorited.
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
    throw new FavoriteError(
      "Property not found or is not publicly available",
      404,
    );
  }

  // Avoid duplicate favorites.
  const existingFavorite = await prisma.favorite.findUnique({
    where: {
      userId_propertyId: {
        userId,
        propertyId,
      },
    },
  });

  if (existingFavorite) {
    throw new FavoriteError(
      "This property is already in your favorites",
      409,
    );
  }

  return prisma.favorite.create({
    data: {
      userId,
      propertyId,
    },
    include: {
      property: {
        select: {
          id: true,
          title: true,
          slug: true,
          city: true,
          address: true,
          monthlyRent: true,
          propertyType: true,
          images: {
            orderBy: {
              sortOrder: "asc",
            },
            take: 1,
          },
        },
      },
    },
  });
}

export async function listFavorites(userId: string) {
  return prisma.favorite.findMany({
    where: {
      userId,
      property: {
        status: "PUBLISHED",
        verificationStatus: "VERIFIED",
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      property: {
        select: {
          id: true,
          title: true,
          slug: true,
          city: true,
          address: true,
          monthlyRent: true,
          propertyType: true,
          status: true,
          images: {
            orderBy: {
              sortOrder: "asc",
            },
            take: 1,
          },
        },
      },
    },
  });
}

export async function removeFavorite(
  userId: string,
  propertyId: string,
) {
  const favorite = await prisma.favorite.findUnique({
    where: {
      userId_propertyId: {
        userId,
        propertyId,
      },
    },
    select: {
      id: true,
    },
  });

  if (!favorite) {
    throw new FavoriteError(
      "Favorite not found",
      404,
    );
  }

  await prisma.favorite.delete({
    where: {
      id: favorite.id,
    },
  });

  return { success: true };
}
