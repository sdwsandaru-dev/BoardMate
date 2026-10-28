
import { z } from "zod";

export const createRoomSchema = z.object({
  name: z.string().trim().min(1).max(100),

  roomType: z.string().trim().min(1).max(50),

  capacity: z.number().int().min(1).max(20).default(1),

  monthlyRent: z.number().positive().max(10000000),
});

export const updateRoomSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),

    roomType: z.string().trim().min(1).max(50).optional(),

    capacity: z.number().int().min(1).max(20).optional(),

    monthlyRent: z.number().positive().max(10000000).optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    {
      message: "Provide at least one field to update",
    },
  );

export type CreateRoomInput = z.infer<typeof createRoomSchema>;

export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;

