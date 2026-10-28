import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import {
getOwnerProfileHandler,
getStudentProfileHandler,
listUniversitiesHandler,
updateOwnerProfileHandler,
updateStudentProfileHandler,
} from "./profile.controller";

const router = Router();

// University directory is public.
router.get("/universities", listUniversitiesHandler);

// Student profile endpoints.
router.get("/student/me", authenticate, getStudentProfileHandler);
router.patch("/student/me", authenticate, updateStudentProfileHandler);

// Owner profile endpoints.
router.get("/owner/me", authenticate, getOwnerProfileHandler);
router.patch("/owner/me", authenticate, updateOwnerProfileHandler);

export default router;
