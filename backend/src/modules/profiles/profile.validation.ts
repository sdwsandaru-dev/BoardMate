import { z } from "zod";

const optionalName = z
.string()
.trim()
.min(2, "Name must contain at least 2 characters")
.max(100, "Name cannot exceed 100 characters");

const optionalPhone = z
.string()
.trim()
.max(25, "Phone number is too long")
.nullable();

export const updateStudentProfileSchema = z
.object({
fullName: optionalName.optional(),
phone: optionalPhone.optional(),
universityId: z.string().uuid().nullable().optional(),
budgetMin: z.coerce.number().min(0).max(100000000).nullable().optional(),
budgetMax: z.coerce.number().min(0).max(100000000).nullable().optional(),
preferredCity: z
.string()
.trim()
.min(1)
.max(100)
.nullable()
.optional(),
})
.strict()
.refine(
(data) =>
data.budgetMin === undefined ||
data.budgetMax === undefined ||
data.budgetMin === null ||
data.budgetMax === null ||
data.budgetMin <= data.budgetMax,
{
message: "Minimum budget cannot exceed maximum budget",
path: ["budgetMin"],
},
)
.refine((data) => Object.keys(data).length > 0, {
message: "At least one field must be provided",
});

export const updateOwnerProfileSchema = z
.object({
fullName: optionalName.optional(),
phone: optionalPhone.optional(),
})
.strict()
.refine((data) => Object.keys(data).length > 0, {
message: "At least one field must be provided",
});

export const universityQuerySchema = z.object({
search: z.string().trim().max(100).optional(),
city: z.string().trim().max(100).optional(),
page: z.coerce.number().int().min(1).default(1),
limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type UpdateStudentProfileInput = z.infer<
typeof updateStudentProfileSchema

> ;

export type UpdateOwnerProfileInput = z.infer<
typeof updateOwnerProfileSchema

> ;

export type UniversityQuery = z.infer<typeof universityQuerySchema>;
