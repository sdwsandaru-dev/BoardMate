import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import {
deleteNotificationHandler,
getUnreadNotificationCountHandler,
listNotificationsHandler,
markAllNotificationsAsReadHandler,
markNotificationAsReadHandler,
} from "./notification.controller";

const router = Router();

router.use(authenticate);

router.get("/unread-count", getUnreadNotificationCountHandler);
router.get("/", listNotificationsHandler);

router.patch("/read-all", markAllNotificationsAsReadHandler);
router.patch("/:notificationId/read", markNotificationAsReadHandler);

router.delete("/:notificationId", deleteNotificationHandler);

export default router;
