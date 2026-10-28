
import { z } from "zod";

export const createBookingSchema = z
  .object({
    roomId: z.string().uuid("A valid room ID is required"),

    moveInDate: z.coerce.date(),

    moveOutDate: z.coerce.date().optional(),

    message: z
      .string()
      .trim()
      .max(1000, "Message cannot exceed 1000 characters")
      .optional(),
  })
  .refine(
    (data) =>
      !data.moveOutDate ||
      data.moveOutDate > data.moveInDate,
    {
      message: "Move-out date must be after move-in date",
      path: ["moveOutDate"],
    },
  )
  .refine(
    (data) => data.moveInDate >= startOfToday(),
    {
      message: "Move-in date cannot be in the past",
      path: ["moveInDate"],
    },
  );

function startOfToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

export type CreateBookingInput = z.infer<
  typeof createBookingSchema
>;
