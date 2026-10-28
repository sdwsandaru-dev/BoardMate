
import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../config/database";
import type {
  CreateReviewInput,
  UpdateReviewInput,
} from "./review.validation";

export class ReviewError extends Error {
  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = "ReviewError";
  }
}

/**
 * Create a review.
 * The student must have a confirmed booking for this property.
 */
export async function createReview(
  studentId: string,
  propertyId: string,
  input: CreateReviewInput,
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
    throw new ReviewError(
      "Property not found or is not publicly available",
      404,
    );
  }

  const confirmedBooking = await prisma.booking.findFirst({
    where: {
      studentId,
      propertyId,
      status: "CONFIRMED",
    },
    select: {
      id: true,
    },
  });

  if (!confirmedBooking) {
    throw new ReviewError(
      "You must have a confirmed booking for this property before submitting a review",
      403,
    );
  }

  try {
    return await prisma.review.create({
      data: {
        studentId,
        propertyId,
        rating: input.rating,
        comment: input.comment || null,
      },
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ReviewError(
        "You have already reviewed this property",
        409,
      );
    }

    throw error;
  }
}

/**
 * List reviews for a publicly available property.
 */
export async function listPropertyReviews(
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
    throw new ReviewError(
      "Property not found or is not publicly available",
      404,
    );
  }

  const reviews = await prisma.review.findMany({
    where: {
      propertyId,
    },
    include: {
      student: {
        select: {
          id: true,
          fullName: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const totalReviews = reviews.length;

  const averageRating =
    totalReviews === 0
      ? 0
      : reviews.reduce(
          (total, review) => total + review.rating,
          0,
        ) / totalReviews;

  return {
    averageRating: Number(averageRating.toFixed(2)),
    totalReviews,
    reviews,
  };
}

/**
 * Update a student's own review.
 */
export async function updateReview(
  reviewId: string,
  studentId: string,
  input: UpdateReviewInput,
) {
  const review = await prisma.review.findUnique({
    where: {
      id: reviewId,
    },
    select: {
      id: true,
      studentId: true,
      propertyId: true,
    },
  });

  if (!review) {
    throw new ReviewError("Review not found", 404);
  }

  if (review.studentId !== studentId) {
    throw new ReviewError(
      "You can only update your own reviews",
      403,
    );
  }

  const confirmedBooking = await prisma.booking.findFirst({
    where: {
      studentId,
      propertyId: review.propertyId,
      status: "CONFIRMED",
    },
    select: {
      id: true,
    },
  });

  if (!confirmedBooking) {
    throw new ReviewError(
      "A confirmed booking is required to update this review",
      403,
    );
  }

  return prisma.review.update({
    where: {
      id: reviewId,
    },
    data: {
      ...(input.rating !== undefined && {
        rating: input.rating,
      }),
      ...(input.comment !== undefined && {
        comment: input.comment,
      }),
    },
    include: {
      student: {
        select: {
          id: true,
          fullName: true,
        },
      },
    },
  });
}

/**
 * Delete a student's own review.
 */
export async function deleteReview(
  reviewId: string,
  studentId: string,
) {
  const review = await prisma.review.findUnique({
    where: {
      id: reviewId,
    },
    select: {
      id: true,
      studentId: true,
    },
  });

  if (!review) {
    throw new ReviewError("Review not found", 404);
  }

  if (review.studentId !== studentId) {
    throw new ReviewError(
      "You can only delete your own reviews",
      403,
    );
  }

  return prisma.review.delete({
    where: {
      id: reviewId,
    },
  });
}
