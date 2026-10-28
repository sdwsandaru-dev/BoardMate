import { z } from "zod";

export const notificationQuerySchema = z.object({
page: z.coerce.number().int().min(1).default(1),
limit: z.coerce.number().int().min(1).max(100).default(20),
unreadOnly: z.enum(["true", "false"]).default("false"),
});

export const notificationIdSchema = z.object({
notificationId: z.string().uuid(),
});

export type NotificationQuery = z.infer<
typeof notificationQuerySchema

> ;
