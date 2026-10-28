import type { Request, Response } from "express";
import { z } from "zod";
import type { AuthenticatedRequest } from "../../middleware/authenticate";

import {
deletePropertyImage,
ImageError,
listOwnerPropertyImages,
listPropertyImages,
uploadPropertyImages,
} from "./image.service";

/**

* Safely extracts a route parameter.
  */
  function getParamString(
  value: string | string[] | undefined,
  ): string {
  if (typeof value === "string" && value.trim()) {
  return value.trim();
  }

if (Array.isArray(value) && typeof value[0] === "string" && value[0].trim()) {
return value[0].trim();
}

throw new ImageError("Invalid or missing route parameter", 400);
}

/**

* Handles Multer upload errors and unexpected errors consistently.
  */
  function handleError(res: Response, error: unknown) {
  if (error instanceof ImageError) {
  return res.status(error.statusCode).json({
  success: false,
  message: error.message,
  });
  }

console.error("Image API error:", error);

return res.status(500).json({
success: false,
message: "An unexpected error occurred",
});
}

/**

* Upload property images.
* Requires an authenticated property owner.
  */
  export async function uploadImagesHandler(
  req: AuthenticatedRequest,
  res: Response,
  ) {
  try {
  if (!req.user) {
  return res.status(401).json({
  success: false,
  message: "Authentication required",
  });
  }

  if (req.user.role !== "OWNER") {
  return res.status(403).json({
  success: false,
  message: "Only property owners can upload images",
  });
  }

  const propertyId = getParamString(req.params.propertyId);
  const files = req.files;

  if (!Array.isArray(files) || files.length === 0) {
  return res.status(400).json({
  success: false,
  message: "Please attach at least one image using the 'images' field",
  });
  }

  // Optional text field sent with the files: the room these photos show.
  const roomIdField = typeof req.body?.roomId === "string" ? req.body.roomId.trim() : "";

  if (roomIdField && !z.string().uuid().safeParse(roomIdField).success) {
  return res.status(400).json({
  success: false,
  message: "roomId must be a valid room ID",
  });
  }

  const images = await uploadPropertyImages(
  propertyId,
  req.user.id,
  files.map((file) => ({
  buffer: file.buffer,
  mimetype: file.mimetype,
  originalname: file.originalname,
  })),
  roomIdField || null,
  );

  return res.status(201).json({
  success: true,
  message: "Property images uploaded successfully",
  data: { images },
  });
  } catch (error) {
  return handleError(res, error);
  }
  }

/**

* List images for a publicly visible property.
  */
  export async function listImagesHandler(
  req: Request,
  res: Response,
  ) {
  try {
  const propertyId = getParamString(req.params.propertyId);
  const images = await listPropertyImages(propertyId);

  return res.status(200).json({
  success: true,
  data: { images },
  });
  } catch (error) {
  return handleError(res, error);
  }
  }

/**

* List images belonging to a property managed by the authenticated owner.
  */
  export async function listOwnerImagesHandler(
  req: AuthenticatedRequest,
  res: Response,
  ) {
  try {
  if (!req.user) {
  return res.status(401).json({
  success: false,
  message: "Authentication required",
  });
  }

  if (req.user.role !== "OWNER") {
  return res.status(403).json({
  success: false,
  message: "Only property owners can manage property images",
  });
  }

  const propertyId = getParamString(req.params.propertyId);

  const images = await listOwnerPropertyImages(
  propertyId,
  req.user.id,
  );

  return res.status(200).json({
  success: true,
  data: { images },
  });
  } catch (error) {
  return handleError(res, error);
  }
  }

/**

* Delete an image belonging to a property managed by the authenticated owner.
  */
  export async function deleteImageHandler(
  req: AuthenticatedRequest,
  res: Response,
  ) {
  try {
  if (!req.user) {
  return res.status(401).json({
  success: false,
  message: "Authentication required",
  });
  }

  if (req.user.role !== "OWNER") {
  return res.status(403).json({
  success: false,
  message: "Only property owners can delete images",
  });
  }

  const propertyId = getParamString(req.params.propertyId);
  const imageId = getParamString(req.params.imageId);

  await deletePropertyImage(
  propertyId,
  imageId,
  req.user.id,
  );

  return res.status(200).json({
  success: true,
  message: "Property image deleted successfully",
  });
  } catch (error) {
  return handleError(res, error);
  }
  }
