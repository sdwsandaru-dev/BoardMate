import type { Request, Response } from "express";
import { prisma } from "../../config/database";
import type { AuthenticatedRequest } from "../../middleware/authenticate";
import { registerSchema, loginSchema } from "./auth.validation";
import { AuthError, loginUser, registerUser } from "./auth.service";

export async function register(req: Request, res: Response) {
  try {
    const result = registerSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const data = await registerUser(result.data);

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      data,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    console.error("Registration error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to register account",
    });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const result = loginSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const data = await loginUser(result.data);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to log in",
    });
  }
}

export async function getMe(
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

    const user = await prisma.user.findUnique({
      where: {
        id: req.user.id,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    if (!user || user.status !== "ACTIVE") {
      return res.status(401).json({
        success: false,
        message: "Account is unavailable",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        user,
      },
    });
  } catch (error) {
    console.error("Get profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve profile",
    });
  }
}