import argon2 from "argon2";
import jwt from "jsonwebtoken";

import { prisma } from "../../config/database";
import type { RegisterInput, LoginInput } from "./auth.validation";

const JWT_SECRET = process.env.JWT_ACCESS_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_ACCESS_SECRET is not configured");
}

const JWT_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || "15m";

export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

function createAccessToken(user: {
  id: string;
  role: "STUDENT" | "OWNER" | "ADMIN";
}) {
  return jwt.sign(
    {
      role: user.role,
    },
    JWT_SECRET!,
    {
      subject: user.id,
      expiresIn: "15m",
    },
  );
}

export async function registerUser(input: RegisterInput) {
  const existingUser = await prisma.user.findUnique({
    where: {
      email: input.email,
    },
    select: {
      id: true,
    },
  });

  if (existingUser) {
    throw new AuthError("An account with this email already exists", 409);
  }

  const passwordHash = await argon2.hash(input.password);

  const user = await prisma.user.create({
    data: {
      fullName: input.fullName,
      email: input.email,
      passwordHash,
      phone: input.phone,
      role: input.role,

      ...(input.role === "STUDENT"
        ? {
            studentProfile: {
              create: {},
            },
          }
        : {
            ownerProfile: {
              create: {},
            },
          }),
    },

    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  const accessToken = createAccessToken(user);

  return {
    user,
    accessToken,
    tokenType: "Bearer",
    expiresIn: JWT_EXPIRES_IN,
  };
}

export async function loginUser(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: {
      email: input.email,
    },
  });

  if (!user) {
    throw new AuthError("Invalid email or password", 401);
  }

  const passwordMatches = await argon2.verify(
    user.passwordHash,
    input.password,
  );

  if (!passwordMatches) {
    throw new AuthError("Invalid email or password", 401);
  }

  if (user.status !== "ACTIVE") {
    throw new AuthError("This account is not active", 403);
  }

  const accessToken = createAccessToken(user);

  return {
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      phone: user.phone,
    },
    accessToken,
    tokenType: "Bearer",
    expiresIn: JWT_EXPIRES_IN,
  };
}