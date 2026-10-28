
import type { Response } from "express";
import type { AuthenticatedRequest } from "../../middleware/authenticate";

import {
  addFavorite,
  FavoriteError,
  listFavorites,
  removeFavorite,
} from "./favorite.service";

function getParamString(
  value: string | string[] | undefined,
): string {
  if (typeof value === "string" && value.trim()) {
    return value;
  }

  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0];
  }

  throw new FavoriteError("Invalid property ID", 400);
}

function handleError(res: Response, error: unknown) {
  if (error instanceof FavoriteError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
    });
  }

  if (
    error instanceof Error &&
    "code" in error &&
    error.code === "P2002"
  ) {
    return res.status(409).json({
      success: false,
      message: "This property is already in your favorites",
    });
  }

  console.error("Favorites API error:", error);

  return res.status(500).json({
    success: false,
    message: "An unexpected error occurred",
  });
}

function ensureStudent(req: AuthenticatedRequest, res: Response) {
  if (!req.user || req.user.role !== "STUDENT") {
    res.status(403).json({
      success: false,
      message: "Only students can manage favorites",
    });

    return false;
  }

  return true;
}

export async function addFavoriteHandler(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    if (!ensureStudent(req, res)) return;

    const propertyId = getParamString(req.params.propertyId);
    const favorite = await addFavorite(req.user!.id, propertyId);

    return res.status(201).json({
      success: true,
      message: "Property added to favorites",
      data: { favorite },
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function listFavoritesHandler(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    if (!ensureStudent(req, res)) return;

    const favorites = await listFavorites(req.user!.id);

    return res.status(200).json({
      success: true,
      data: { favorites },
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function removeFavoriteHandler(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    if (!ensureStudent(req, res)) return;

    const propertyId = getParamString(req.params.propertyId);

    await removeFavorite(req.user!.id, propertyId);

    return res.status(200).json({
      success: true,
      message: "Property removed from favorites",
    });
  } catch (error) {
    return handleError(res, error);
  }
}
