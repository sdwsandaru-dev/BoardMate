import type { Request, Response } from "express";
import {
updateOwnerProfileSchema,
updateStudentProfileSchema,
universityQuerySchema,
} from "./profile.validation";
import {
getOwnerProfile,
getStudentProfile,
listUniversities,
ProfileError,
updateOwnerProfile,
updateStudentProfile,
} from "./profile.service";

function sendError(res: Response, error: unknown) {
if (error instanceof ProfileError) {
return res.status(error.statusCode).json({
success: false,
message: error.message,
});
}

console.error("Profile API error:", error);

return res.status(500).json({
success: false,
message: "An unexpected server error occurred",
});
}

export async function getStudentProfileHandler(
req: Request,
res: Response,
) {
if (!req.user) {
return res.status(401).json({
success: false,
message: "Authentication required",
});
}

try {
const data = await getStudentProfile(req.user.id);
return res.status(200).json({ success: true, data });
} catch (error) {
return sendError(res, error);
}
}

export async function updateStudentProfileHandler(
req: Request,
res: Response,
) {
if (!req.user) {
return res.status(401).json({
success: false,
message: "Authentication required",
});
}

const parsed = updateStudentProfileSchema.safeParse(req.body);

if (!parsed.success) {
return res.status(400).json({
success: false,
message: "Invalid student profile data",
errors: parsed.error.flatten(),
});
}

try {
const data = await updateStudentProfile(req.user.id, parsed.data);
return res.status(200).json({
success: true,
message: "Student profile updated successfully",
data,
});
} catch (error) {
return sendError(res, error);
}
}

export async function getOwnerProfileHandler(
req: Request,
res: Response,
) {
if (!req.user) {
return res.status(401).json({
success: false,
message: "Authentication required",
});
}

try {
const data = await getOwnerProfile(req.user.id);
return res.status(200).json({ success: true, data });
} catch (error) {
return sendError(res, error);
}
}

export async function updateOwnerProfileHandler(
req: Request,
res: Response,
) {
if (!req.user) {
return res.status(401).json({
success: false,
message: "Authentication required",
});
}

const parsed = updateOwnerProfileSchema.safeParse(req.body);

if (!parsed.success) {
return res.status(400).json({
success: false,
message: "Invalid owner profile data",
errors: parsed.error.flatten(),
});
}

try {
const data = await updateOwnerProfile(req.user.id, parsed.data);
return res.status(200).json({
success: true,
message: "Owner profile updated successfully",
data,
});
} catch (error) {
return sendError(res, error);
}
}

export async function listUniversitiesHandler(
req: Request,
res: Response,
) {
const parsed = universityQuerySchema.safeParse(req.query);

if (!parsed.success) {
return res.status(400).json({
success: false,
message: "Invalid university search parameters",
errors: parsed.error.flatten(),
});
}

try {
const data = await listUniversities(parsed.data);
return res.status(200).json({ success: true, data });
} catch (error) {
return sendError(res, error);
}
}
