import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../middleware/authenticate";
import {
adminPropertyQuerySchema,
adminRejectPropertySchema,
adminSuspendPropertySchema,
adminUserQuerySchema,
} from "./admin.validation";
import {
AdminError,
approveAdminProperty,
getAdminDashboard,
getAdminProperty,
getAdminUserById,
listAdminUsers,
listPendingProperties,
reactivateAdminUser,
rejectAdminProperty,
suspendAdminProperty,
suspendAdminUser,
verifyAdminProperty,
} from "./admin.service";

function sendError(res: Response, error: unknown) {
if (error instanceof AdminError) {
return res.status(error.statusCode).json({
success: false,
message: error.message,
});
}

console.error("Admin API error:", error);

return res.status(500).json({
success: false,
message: "An unexpected server error occurred",
});
}

// Type guard: route params are typed string | string[], only a UUID string passes.
function validUuid(value: unknown): value is string {
return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
value,
);
}

export async function getAdminDashboardHandler(
_req: Request,
res: Response,
) {
try {
const data = await getAdminDashboard();
return res.status(200).json({ success: true, data });
} catch (error) {
return sendError(res, error);
}
}

export async function listAdminUsersHandler(
req: Request,
res: Response,
) {
const parsed = adminUserQuerySchema.safeParse(req.query);

if (!parsed.success) {
return res.status(400).json({
success: false,
message: "Invalid user filters",
errors: parsed.error.flatten(),
});
}

try {
const data = await listAdminUsers(parsed.data);
return res.status(200).json({ success: true, data });
} catch (error) {
return sendError(res, error);
}
}

export async function getAdminUserByIdHandler(
req: Request,
res: Response,
) {
const { userId } = req.params;

if (!userId || !validUuid(userId)) {
return res.status(400).json({
success: false,
message: "Invalid user ID",
});
}

try {
const data = await getAdminUserById(userId);
return res.status(200).json({ success: true, data });
} catch (error) {
return sendError(res, error);
}
}

export async function suspendAdminUserHandler(
req: AuthenticatedRequest,
res: Response,
) {
const { userId } = req.params;
const currentAdminId = req.user?.id;

if (!userId || !validUuid(userId)) {
return res.status(400).json({
success: false,
message: "Invalid user ID",
});
}

if (!currentAdminId) {
return res.status(401).json({
success: false,
message: "Authentication required",
});
}

try {
const data = await suspendAdminUser(userId, currentAdminId);
return res.status(200).json({
success: true,
message: "User suspended successfully",
data,
});
} catch (error) {
return sendError(res, error);
}
}

export async function reactivateAdminUserHandler(
req: AuthenticatedRequest,
res: Response,
) {
const { userId } = req.params;

if (!userId || !validUuid(userId)) {
return res.status(400).json({
success: false,
message: "Invalid user ID",
});
}

const currentAdminId = req.user?.id;

if (!currentAdminId) {
return res.status(401).json({
success: false,
message: "Authentication required",
});
}

try {
const data = await reactivateAdminUser(userId, currentAdminId);
return res.status(200).json({
success: true,
message: "User reactivated successfully",
data,
});
} catch (error) {
return sendError(res, error);
}
}

export async function listPendingPropertiesHandler(
req: Request,
res: Response,
) {
const parsed = adminPropertyQuerySchema.safeParse(req.query);

if (!parsed.success) {
return res.status(400).json({
success: false,
message: "Invalid pagination parameters",
errors: parsed.error.flatten(),
});
}

try {
const data = await listPendingProperties(parsed.data);
return res.status(200).json({ success: true, data });
} catch (error) {
return sendError(res, error);
}
}

export async function getAdminPropertyHandler(
req: Request,
res: Response,
) {
const { propertyId } = req.params;

if (!propertyId || !validUuid(propertyId)) {
return res.status(400).json({
success: false,
message: "Invalid property ID",
});
}

try {
const property = await getAdminProperty(propertyId);
return res.status(200).json({ success: true, data: { property } });
} catch (error) {
return sendError(res, error);
}
}

export async function approveAdminPropertyHandler(
req: AuthenticatedRequest,
res: Response,
) {
const { propertyId } = req.params;

if (!propertyId || !validUuid(propertyId)) {
return res.status(400).json({
success: false,
message: "Invalid property ID",
});
}

const currentAdminId = req.user?.id;

if (!currentAdminId) {
return res.status(401).json({
success: false,
message: "Authentication required",
});
}

try {
const data = await approveAdminProperty(propertyId, currentAdminId);
return res.status(200).json({
success: true,
message: "Property approved and published successfully",
data,
});
} catch (error) {
return sendError(res, error);
}
}

export async function rejectAdminPropertyHandler(
req: AuthenticatedRequest,
res: Response,
) {
const { propertyId } = req.params;

if (!propertyId || !validUuid(propertyId)) {
return res.status(400).json({
success: false,
message: "Invalid property ID",
});
}

const currentAdminId = req.user?.id;

if (!currentAdminId) {
return res.status(401).json({
success: false,
message: "Authentication required",
});
}

const parsed = adminRejectPropertySchema.safeParse(req.body);

if (!parsed.success) {
return res.status(400).json({
success: false,
message: "A rejection reason of 5–1000 characters is required",
errors: parsed.error.flatten(),
});
}

try {
const data = await rejectAdminProperty(
propertyId,
parsed.data.reason,
currentAdminId,
);


return res.status(200).json({
  success: true,
  message: "Property rejected",
  data,
});


} catch (error) {
return sendError(res, error);
}
}

export async function suspendAdminPropertyHandler(
req: AuthenticatedRequest,
res: Response,
) {
const { propertyId } = req.params;

if (!propertyId || !validUuid(propertyId)) {
return res.status(400).json({
success: false,
message: "Invalid property ID",
});
}

const currentAdminId = req.user?.id;

if (!currentAdminId) {
return res.status(401).json({
success: false,
message: "Authentication required",
});
}

const parsed = adminSuspendPropertySchema.safeParse(req.body);

if (!parsed.success) {
return res.status(400).json({
success: false,
message: "A suspension reason of 5–1000 characters is required",
errors: parsed.error.flatten(),
});
}

try {
const data = await suspendAdminProperty(
propertyId,
parsed.data.reason,
currentAdminId,
);


return res.status(200).json({
  success: true,
  message: "Property suspended",
  data,
});


} catch (error) {
return sendError(res, error);
}
}

export async function verifyAdminPropertyHandler(
req: AuthenticatedRequest,
res: Response,
) {
const { propertyId } = req.params;

if (!propertyId || !validUuid(propertyId)) {
return res.status(400).json({
success: false,
message: "Invalid property ID",
});
}

const currentAdminId = req.user?.id;

if (!currentAdminId) {
return res.status(401).json({
success: false,
message: "Authentication required",
});
}

try {
const data = await verifyAdminProperty(propertyId, currentAdminId);
return res.status(200).json({
success: true,
message: "Property verification completed",
data,
});
} catch (error) {
return sendError(res, error);
}
}
