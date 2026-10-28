
import type { Request, Response } from "express";

import type { AuthenticatedRequest } from "../../middleware/authenticate";

import {
  createPropertySchema,
  deletePropertySchema,
  updatePropertySchema,
  propertySearchSchema
} from "./property.validation";

import {
  createProperty,
  deleteProperty,
  getOwnerProperty,
  getPropertyById,
  listOwnerProperties,
  listProperties,
  PropertyError,
  submitPropertyForApproval,
  updateProperty,
} from "./property.service";

/**
 * Safely extract a route parameter as a string.
 */
function getParamString(
  value: string | string[] | undefined,
): string {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }

  if (
    Array.isArray(value) &&
    typeof value[0] === "string" &&
    value[0].trim().length > 0
  ) {
    return value[0];
  }

  throw new PropertyError("Invalid or missing property ID", 400);
}

/**
 * Handle API errors consistently.
 */
function handleError(res: Response, error: unknown) {
  if (error instanceof PropertyError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
    });
  }

  console.error("Property API error:", error);

  return res.status(500).json({
    success: false,
    message: "An unexpected error occurred",
  });
}

/**
 * POST /api/v1/properties
 * Create a new property.
 */
export async function createPropertyHandler(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    if (!req.user || req.user.role !== "OWNER") {
      return res.status(403).json({
        success: false,
        message: "Only boarding owners can create properties",
      });
    }

    const result = createPropertySchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: result.error.issues,
      });
    }

    const property = await createProperty(req.user.id, result.data);

    return res.status(201).json({
      success: true,
      message: "Property created as a draft",
      data: { property },
    });
  } catch (error) {
    return handleError(res, error);
  }
}

/**
 * GET /api/v1/properties
 * List published and verified properties.
 */

export async function listPropertiesHandler(
  req: Request,
  res: Response,
) {
  try {
    const parsed = propertySearchSchema.safeParse(req.query);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid property search parameters",
        errors: parsed.error.flatten(),
      });
    }

    const result = await listProperties(parsed.data);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

/**
 * GET /api/v1/properties/:id
 * Get a published and verified property.
 */
export async function getPropertyHandler(
  req: Request,
  res: Response,
) {
  try {
    const propertyId = getParamString(req.params.id);

    const property = await getPropertyById(propertyId);

    return res.status(200).json({
      success: true,
      data: { property },
    });
  } catch (error) {
    return handleError(res, error);
  }
}

/**
 * PATCH /api/v1/properties/:id
 * Update an owner's property.
 */
export async function updatePropertyHandler(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    if (!req.user || req.user.role !== "OWNER") {
      return res.status(403).json({
        success: false,
        message: "Only boarding owners can update properties",
      });
    }

    const result = updatePropertySchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: result.error.issues,
      });
    }

    const propertyId = getParamString(req.params.id);

    const property = await updateProperty(
      propertyId,
      req.user.id,
      result.data,
    );

    return res.status(200).json({
      success: true,
      message: "Property updated successfully",
      data: { property },
    });
  } catch (error) {
    return handleError(res, error);
  }
}

/**
 * DELETE /api/v1/properties/:id
 * Delete an eligible property owned by the current user.
 */
export async function deletePropertyHandler(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    if (!req.user || req.user.role !== "OWNER") {
      return res.status(403).json({
        success: false,
        message: "Only boarding owners can delete properties",
      });
    }

    const propertyId = getParamString(req.params.id);
    const parsed = deletePropertySchema.safeParse(req.body ?? {});

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: parsed.error.issues[0]?.message ?? "Invalid delete request",
        errors: parsed.error.flatten(),
      });
    }

    const result = await deleteProperty(
      propertyId,
      req.user.id,
      parsed.data.reason,
    );

    return res.status(200).json({
      success: true,
      message: "Property deleted. The admin team has been notified.",
      data: result,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

/**
 * GET /api/v1/properties/mine
 * List every property owned by the current user, in any status.
 */
export async function listMyPropertiesHandler(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    if (!req.user || req.user.role !== "OWNER") {
      return res.status(403).json({
        success: false,
        message: "Only boarding owners can list their properties",
      });
    }

    const properties = await listOwnerProperties(req.user.id);

    return res.status(200).json({
      success: true,
      data: { properties },
    });
  } catch (error) {
    return handleError(res, error);
  }
}

/**
 * GET /api/v1/properties/mine/:id
 * Full details of one of the current owner's properties, in any status.
 */
export async function getMyPropertyHandler(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    if (!req.user || req.user.role !== "OWNER") {
      return res.status(403).json({
        success: false,
        message: "Only boarding owners can view their properties",
      });
    }

    const property = await getOwnerProperty(
      getParamString(req.params.id),
      req.user.id,
    );

    return res.status(200).json({
      success: true,
      data: { property },
    });
  } catch (error) {
    return handleError(res, error);
  }
}

/**
 * PATCH /api/v1/properties/:id/submit
 * Submit a draft or rejected property for admin approval.
 */
export async function submitPropertyHandler(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    if (!req.user || req.user.role !== "OWNER") {
      return res.status(403).json({
        success: false,
        message: "Only boarding owners can submit properties",
      });
    }

    const propertyId = getParamString(req.params.id);

    const property = await submitPropertyForApproval(
      propertyId,
      req.user.id,
    );

    return res.status(200).json({
      success: true,
      message: "Property submitted for approval",
      data: { property },
    });
  } catch (error) {
    return handleError(res, error);
  }
}
