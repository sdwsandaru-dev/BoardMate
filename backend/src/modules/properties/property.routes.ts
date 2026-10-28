import { Router } from "express";

import { authenticate } from "../../middleware/authenticate";
import { authorizeOwner } from "../../middleware/authorizeOwner";

import {
  createPropertyHandler,
  deletePropertyHandler,
  getMyPropertyHandler,
  getPropertyHandler,
  listMyPropertiesHandler,
  listPropertiesHandler,
  submitPropertyHandler,
  updatePropertyHandler,
} from "./property.controller";

const router = Router();

// Public endpoints
router.get("/", listPropertiesHandler);

// Owner: all own listings, any status. Must precede "/:id".
router.get(
  "/mine",
  authenticate,
  authorizeOwner,
  listMyPropertiesHandler,
);

router.get(
  "/mine/:id",
  authenticate,
  authorizeOwner,
  getMyPropertyHandler,
);

router.get("/:id", getPropertyHandler);

// Owner-only endpoints
router.post(
  "/",
  authenticate,
  authorizeOwner,
  createPropertyHandler,
);

router.patch(
  "/:id",
  authenticate,
  authorizeOwner,
  updatePropertyHandler,
);

router.patch(
  "/:id/submit",
  authenticate,
  authorizeOwner,
  submitPropertyHandler,
);

router.delete(
  "/:id",
  authenticate,
  authorizeOwner,
  deletePropertyHandler,
);

export default router;