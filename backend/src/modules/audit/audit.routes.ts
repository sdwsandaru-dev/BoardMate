import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { authorizeAdmin } from "../../middleware/authorizeAdmin";
import { listAuditLogsHandler } from "./audit.controller";

const router = Router();

router.use(authenticate, authorizeAdmin);

router.get("/", listAuditLogsHandler);

export default router;
