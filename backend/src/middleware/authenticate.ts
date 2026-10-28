import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../config/database";

const secret = process.env.JWT_ACCESS_SECRET;

if (!secret) {
  throw new Error("JWT_ACCESS_SECRET is not configured");
}

const JWT_SECRET: string = secret;

type AuthUser = {
  id: string;
  role: "STUDENT" | "OWNER" | "ADMIN";
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      message: "Authentication required",
    });
    return;
  }

  const token = authorization.slice(7).trim();

  if (!token) {
    res.status(401).json({
      success: false,
      message: "Authentication required",
    });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET, {
      algorithms: ["HS256"],
    });

    if (
      typeof payload === "string" ||
      typeof payload.sub !== "string" ||
      !payload.sub ||
      !["STUDENT", "OWNER", "ADMIN"].includes(
        String(payload.role),
      )
    ) {
      res.status(401).json({
        success: false,
        message: "Invalid access token",
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: {
        id: payload.sub,
      },
      select: {
        id: true,
        role: true,
        status: true,
      },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: "User account not found",
      });
      return;
    }

    if (user.status !== "ACTIVE") {
      res.status(403).json({
        success: false,
        message: "Your account is not active",
      });
      return;
    }

    // Always use the current database role.
    req.user = {
      id: user.id,
      role: user.role,
    };

    next();
  } catch (error) {
    if (
      error instanceof jwt.JsonWebTokenError ||
      error instanceof jwt.TokenExpiredError
    ) {
      res.status(401).json({
        success: false,
        message: "Invalid or expired access token",
      });
      return;
    }

    console.error("Authentication error:", error);

    res.status(500).json({
      success: false,
      message: "Authentication service unavailable",
    });
  }
}