
import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../middleware/authenticate";

import {
  ReviewError,
  createReview,
  listPropertyReviews,
  updateReview,
  deleteReview,
} from "./review.service";

import {
  createReviewSchema,
  updateReviewSchema,
} from "./review.validation";

// Express types params as string | string[]; only a plain string is a valid ID.
function getParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

function getUser(req: AuthenticatedRequest) {
  return req.user as {
    id: string;
    role: string;
  };
}

function handleError(
  error: unknown,
  res: Response,
  next: NextFunction,
) {
  if (error instanceof ReviewError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
    });
  }

  return next(error);
}

/**
 * POST /properties/:propertyId/reviews
 */
export async function createReviewHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const user = getUser(req);
    const propertyId = getParam(req.params.propertyId);

    if (user.role !== "STUDENT") {
      return res.status(403).json({
        success: false,
        message: "Only students can submit reviews",
      });
    }

    if (!propertyId) {
      return res.status(400).json({
        success: false,
        message: "Property ID is required",
      });
    }

    const parsed = createReviewSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid review information",
        errors: parsed.error.flatten(),
      });
    }

    const review = await createReview(
      user.id,
      propertyId,
      parsed.data,
    );

    return res.status(201).json({
      success: true,
      message: "Review submitted successfully",
      data: review,
    });
  } catch (error) {
    return handleError(error, res, next);
  }
}

/**
 * GET /properties/:propertyId/reviews
 */
export async function listPropertyReviewsHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const propertyId = getParam(req.params.propertyId);

    if (!propertyId) {
      return res.status(400).json({
        success: false,
        message: "Property ID is required",
      });
    }

    const result = await listPropertyReviews(propertyId);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return handleError(error, res, next);
  }
}

/**
 * PATCH /reviews/:reviewId
 */
export async function updateReviewHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const user = getUser(req);
    const reviewId = getParam(req.params.reviewId);

    if (user.role !== "STUDENT") {
      return res.status(403).json({
        success: false,
        message: "Only students can update reviews",
      });
    }

    if (!reviewId) {
      return res.status(400).json({
        success: false,
        message: "Review ID is required",
      });
    }

    const parsed = updateReviewSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid review information",
        errors: parsed.error.flatten(),
      });
    }

    const review = await updateReview(
      reviewId,
      user.id,
      parsed.data,
    );

    return res.status(200).json({
      success: true,
      message: "Review updated successfully",
      data: review,
    });
  } catch (error) {
    return handleError(error, res, next);
  }
}

/**
 * DELETE /reviews/:reviewId
 */
export async function deleteReviewHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const user = getUser(req);
    const reviewId = getParam(req.params.reviewId);

    if (user.role !== "STUDENT") {
      return res.status(403).json({
        success: false,
        message: "Only students can delete reviews",
      });
    }

    if (!reviewId) {
      return res.status(400).json({
        success: false,
        message: "Review ID is required",
      });
    }

    await deleteReview(reviewId, user.id);

    return res.status(200).json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error) {
    return handleError(error, res, next);
  }
}
