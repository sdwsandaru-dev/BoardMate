
import { Router } from "express";

import { authenticate } from "../../middleware/authenticate";

import {
  createReviewHandler,
  listPropertyReviewsHandler,
  updateReviewHandler,
  deleteReviewHandler,
} from "./review.controller";

const router = Router();

// Public endpoint: view reviews for a property.
router.get(
  "/properties/:propertyId/reviews",
  listPropertyReviewsHandler,
);

// All routes below require authentication.
router.post(
  "/properties/:propertyId/reviews",
  authenticate,
  createReviewHandler,
);

router.patch(
  "/reviews/:reviewId",
  authenticate,
  updateReviewHandler,
);

router.delete(
  "/reviews/:reviewId",
  authenticate,
  deleteReviewHandler,
);

export default router;
