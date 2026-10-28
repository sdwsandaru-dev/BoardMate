import { z } from "zod";

export const registerSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must contain at least 2 characters")
    .max(100, "Full name cannot exceed 100 characters"),

  email: z
    .string()
    .trim()
    .email("Please provide a valid email address")
    .transform((value) => value.toLowerCase()),

  password: z
    .string()
    .min(8, "Password must contain at least 8 characters")
    .max(128, "Password cannot exceed 128 characters"),

  phone: z
    .string()
    .trim()
    .max(30, "Phone number is too long")
    .optional(),

  role: z.enum(["STUDENT", "OWNER"]),
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Please provide a valid email address")
    .transform((value) => value.toLowerCase()),

  password: z.string().min(1, "Password is required"),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export type LoginInput = z.infer<typeof loginSchema>;