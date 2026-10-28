
import type { Request, Response } from "express";

import type { AuthenticatedRequest } from "../../middleware/authenticate";

import {
  createRoomSchema,
  updateRoomSchema,
} from "./room.validation";

import {
  createRoom,
  deleteRoom,
  getRoomById,
  listRoomsByProperty,
  listOwnerRoomsByProperty,
  RoomError,
  updateRoom,
} from "./room.service";

function getParamString(
  value: string | string[] | undefined,
): string {
  if (typeof value === "string" && value.trim()) {
    return value;
  }

  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0];
  }

  throw new RoomError("Invalid or missing route parameter", 400);
}

function handleError(res: Response, error: unknown) {
  if (error instanceof RoomError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
    });
  }

  if (
    error instanceof Error &&
    error.message.toLowerCase().includes("invalid uuid")
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid room or property ID",
    });
  }

  console.error("Room API error:", error);

  return res.status(500).json({
    success: false,
    message: "An unexpected error occurred",
  });
}

/**
 * POST /api/v1/properties/:propertyId/rooms
 */
export async function createRoomHandler(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    if (!req.user || req.user.role !== "OWNER") {
      return res.status(403).json({
        success: false,
        message: "Only property owners can create rooms",
      });
    }

    const propertyId = getParamString(req.params.propertyId);
    const result = createRoomSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: result.error.issues,
      });
    }

    const room = await createRoom(
      propertyId,
      req.user.id,
      result.data,
    );

    return res.status(201).json({
      success: true,
      message: "Room created successfully",
      data: { room },
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function listOwnerRoomsHandler(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    if (!req.user || req.user.role !== "OWNER") {
      return res.status(403).json({
        success: false,
        message: "Only property owners can view their rooms",
      });
    }

    const propertyId = getParamString(req.params.propertyId);

    const rooms = await listOwnerRoomsByProperty(
      propertyId,
      req.user.id,
    );

    return res.status(200).json({
      success: true,
      data: { rooms },
    });
  } catch (error) {
    return handleError(res, error);
  }
}
/**
 * GET /api/v1/properties/:propertyId/rooms
 */
export async function listRoomsHandler(
  req: Request,
  res: Response,
) {
  try {
    const propertyId = getParamString(req.params.propertyId);

    const rooms = await listRoomsByProperty(propertyId);

    return res.status(200).json({
      success: true,
      data: { rooms },
    });
  } catch (error) {
    return handleError(res, error);
  }
}

/**
 * GET /api/v1/rooms/:roomId
 */
export async function getRoomHandler(
  req: Request,
  res: Response,
) {
  try {
    const roomId = getParamString(req.params.roomId);

    const room = await getRoomById(roomId);

    return res.status(200).json({
      success: true,
      data: { room },
    });
  } catch (error) {
    return handleError(res, error);
  }
}

/**
 * PATCH /api/v1/rooms/:roomId
 */
export async function updateRoomHandler(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    if (!req.user || req.user.role !== "OWNER") {
      return res.status(403).json({
        success: false,
        message: "Only property owners can update rooms",
      });
    }

    const roomId = getParamString(req.params.roomId);
    const result = updateRoomSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: result.error.issues,
      });
    }

    const room = await updateRoom(
      roomId,
      req.user.id,
      result.data,
    );

    return res.status(200).json({
      success: true,
      message: "Room updated successfully",
      data: { room },
    });
  } catch (error) {
    return handleError(res, error);
  }
}

/**
 * DELETE /api/v1/rooms/:roomId
 */
export async function deleteRoomHandler(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    if (!req.user || req.user.role !== "OWNER") {
      return res.status(403).json({
        success: false,
        message: "Only property owners can delete rooms",
      });
    }

    const roomId = getParamString(req.params.roomId);

    await deleteRoom(roomId, req.user.id);

    return res.status(200).json({
      success: true,
      message: "Room deleted successfully",
    });
  } catch (error) {
    return handleError(res, error);
  }
}

