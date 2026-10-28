
import { z } from "zod";

export const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),

  comment: z
    .string()
    .trim()
    .max(2000, "Comment cannot exceed 2000 characters")
    .optional(),
});

export const updateReviewSchema = z
  .object({
    rating: z.number().int().min(1).max(5).optional(),

    comment: z
      .string()
      .trim()
      .max(2000, "Comment cannot exceed 2000 characters")
      .nullable()
      .optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    {
      message: "Provide at least one field to update",
    },
  );

export type CreateReviewInput = z.infer<
  typeof createReviewSchema
>;

export type UpdateReviewInput = z.infer<
  typeof updateReviewSchema
>;
