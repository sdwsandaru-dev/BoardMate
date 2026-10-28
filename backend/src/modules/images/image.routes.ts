import { Router } from "express";

import { authenticate } from "../../middleware/authenticate";
import { authorizeOwner } from "../../middleware/authorizeOwner";

import { imageUpload } from "./image.upload";

import {
  deleteImageHandler,
  listImagesHandler,
  listOwnerImagesHandler,
  uploadImagesHandler,
} from "./image.controller";

const router = Router();

// Public: images belonging to published and verified properties.
router.get(
  "/properties/:propertyId/images",
  listImagesHandler,
);

// Owner: list images, including images of draft properties.
router.get(
  "/properties/:propertyId/images/manage",
  authenticate,
  authorizeOwner,
  listOwnerImagesHandler,
);

// Owner: upload up to five images.
// Authenticate and authorize before processing uploaded files.
router.post(
  "/properties/:propertyId/images",
  authenticate,
  authorizeOwner,
  imageUpload.array("images", 5),
  uploadImagesHandler,
);

// Owner: delete an image belonging to their property.
router.delete(
  "/properties/:propertyId/images/:imageId",
  authenticate,
  authorizeOwner,
  deleteImageHandler,
);

export default router;