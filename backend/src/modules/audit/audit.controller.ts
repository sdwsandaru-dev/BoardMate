import type { Request, Response } from "express";
import { auditQuerySchema } from "./audit.validation";
import { listAuditLogs } from "./audit.service";

export async function listAuditLogsHandler(
req: Request,
res: Response,
) {
const parsed = auditQuerySchema.safeParse(req.query);

if (!parsed.success) {
return res.status(400).json({
success: false,
message: "Invalid audit log filters",
errors: parsed.error.flatten(),
});
}

try {
const data = await listAuditLogs(parsed.data);


return res.status(200).json({
  success: true,
  data,
});


} catch (error) {
console.error("Audit log retrieval failed:", error);


return res.status(500).json({
  success: false,
  message: "Unable to retrieve audit logs",
});


}
}
