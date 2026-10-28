import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { authorizeAdmin } from "../../middleware/authorizeAdmin";
import {
approveAdminPropertyHandler,
getAdminDashboardHandler,
getAdminPropertyHandler,
getAdminUserByIdHandler,
listAdminUsersHandler,
listPendingPropertiesHandler,
reactivateAdminUserHandler,
rejectAdminPropertyHandler,
suspendAdminPropertyHandler,
suspendAdminUserHandler,
verifyAdminPropertyHandler,
} from "./admin.controller";

const router = Router();

router.use(authenticate, authorizeAdmin);

router.get("/dashboard", getAdminDashboardHandler);

router.get("/users", listAdminUsersHandler);
router.get("/users/:userId", getAdminUserByIdHandler);
router.patch("/users/:userId/suspend", suspendAdminUserHandler);
router.patch("/users/:userId/reactivate", reactivateAdminUserHandler);

router.get("/properties/pending", listPendingPropertiesHandler);
router.get("/properties/:propertyId", getAdminPropertyHandler);
router.patch(
"/properties/:propertyId/approve",
approveAdminPropertyHandler,
);
router.patch(
"/properties/:propertyId/reject",
rejectAdminPropertyHandler,
);
router.patch(
"/properties/:propertyId/suspend",
suspendAdminPropertyHandler,
);
router.patch(
"/properties/:propertyId/verify",
verifyAdminPropertyHandler,
);

export default router;
