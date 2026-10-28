import { z } from "zod";

export const auditQuerySchema = z
.object({
page: z.coerce.number().int().min(1).default(1),
limit: z.coerce.number().int().min(1).max(100).default(20),
action: z.string().trim().min(1).max(100).optional(),
resourceType: z.string().trim().min(1).max(50).optional(),
actorId: z.string().uuid().optional(),
resourceId: z.string().trim().min(1).max(100).optional(),
from: z.coerce.date().optional(),
to: z.coerce.date().optional(),
})
.refine(
(data) => !data.from || !data.to || data.from <= data.to,
{
message: "'from' must be earlier than or equal to 'to'",
path: ["to"],
},
);

export type AuditQueryInput = z.infer<typeof auditQuerySchema>;
