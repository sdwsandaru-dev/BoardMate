import type { Request, Response } from "express";
import {
notificationIdSchema,
notificationQuerySchema,
} from "./notification.validation";
import {
deleteNotification,
getUnreadNotificationCount,
listNotifications,
markAllNotificationsAsRead,
markNotificationAsRead,
NotificationError,
} from "./notification.service";

function sendError(res: Response, error: unknown) {
if (error instanceof NotificationError) {
return res.status(error.statusCode).json({
success: false,
message: error.message,
});
}

console.error("Notification API error:", error);

return res.status(500).json({
success: false,
message: "An unexpected server error occurred",
});
}

export async function listNotificationsHandler(
req: Request,
res: Response,
) {
if (!req.user) {
return res.status(401).json({
success: false,
message: "Authentication required",
});
}

const parsed = notificationQuerySchema.safeParse(req.query);

if (!parsed.success) {
return res.status(400).json({
success: false,
message: "Invalid notification filters",
errors: parsed.error.flatten(),
});
}

try {
const data = await listNotifications(req.user.id, parsed.data);

return res.status(200).json({
  success: true,
  data,
});

} catch (error) {
return sendError(res, error);
}
}

export async function getUnreadNotificationCountHandler(
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
const unreadCount = await getUnreadNotificationCount(req.user.id);

return res.status(200).json({
  success: true,
  data: { unreadCount },
});

} catch (error) {
return sendError(res, error);
}
}

export async function markNotificationAsReadHandler(
req: Request,
res: Response,
) {
if (!req.user) {
return res.status(401).json({
success: false,
message: "Authentication required",
});
}

const parsed = notificationIdSchema.safeParse(req.params);

if (!parsed.success) {
return res.status(400).json({
success: false,
message: "Invalid notification ID",
errors: parsed.error.flatten(),
});
}

try {
const data = await markNotificationAsRead(
req.user.id,
parsed.data.notificationId,
);

return res.status(200).json({
  success: true,
  message: "Notification marked as read",
  data,
});

} catch (error) {
return sendError(res, error);
}
}

export async function markAllNotificationsAsReadHandler(
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
const data = await markAllNotificationsAsRead(req.user.id);

return res.status(200).json({
  success: true,
  message: "Notifications marked as read",
  data,
});

} catch (error) {
return sendError(res, error);
}
}

export async function deleteNotificationHandler(
req: Request,
res: Response,
) {
if (!req.user) {
return res.status(401).json({
success: false,
message: "Authentication required",
});
}

const parsed = notificationIdSchema.safeParse(req.params);

if (!parsed.success) {
return res.status(400).json({
success: false,
message: "Invalid notification ID",
errors: parsed.error.flatten(),
});
}

try {
await deleteNotification(
req.user.id,
parsed.data.notificationId,
);


return res.status(200).json({
  success: true,
  message: "Notification deleted successfully",
});


} catch (error) {
return sendError(res, error);
}
}
