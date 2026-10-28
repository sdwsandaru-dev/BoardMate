import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "./authenticate";

export function authorizeOwner(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: "Authentication required",
    });
    return;
  }

  if (req.user.role !== "OWNER") {
    res.status(403).json({
      success: false,
      message: "Property owner access required",
    });
    return;
  }

  next();
}