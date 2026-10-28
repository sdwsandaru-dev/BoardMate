import { z } from "zod";

export const adminUserQuerySchema = z.object({
search: z.string().trim().max(150).optional(),
role: z.enum(["STUDENT", "OWNER", "ADMIN"]).optional(),
status: z.enum(["ACTIVE", "SUSPENDED", "DEACTIVATED"]).optional(),
page: z.coerce.number().int().min(1).default(1),
limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const adminRejectPropertySchema = z.object({
reason: z.string().trim().min(5).max(1000),
});

export const adminSuspendPropertySchema = z.object({
reason: z.string().trim().min(5).max(1000),
});

export const adminPropertyQuerySchema = z.object({
page: z.coerce.number().int().min(1).default(1),
limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type AdminUserQuery = z.infer<typeof adminUserQuerySchema>;
export type AdminPropertyQuery = z.infer<typeof adminPropertyQuerySchema>;
