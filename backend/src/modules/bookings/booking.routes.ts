
import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";

import {
  createBookingHandler,
  listMyBookingsHandler,
  listOwnerBookingsHandler,
  getBookingHandler,
  cancelBookingHandler,
  approveBookingHandler,
  rejectBookingHandler,
} from "./booking.controller";

const router = Router();

router.use(authenticate);

// Student routes
router.post("/", createBookingHandler);
router.get("/my", listMyBookingsHandler);
router.patch("/:bookingId/cancel", cancelBookingHandler);

// Owner route
router.get("/owner", listOwnerBookingsHandler);
router.patch("/:bookingId/approve", approveBookingHandler);
router.patch("/:bookingId/reject", rejectBookingHandler);

// Shared route: authorization is checked by the service.
router.get("/:bookingId", getBookingHandler);

export default router;
