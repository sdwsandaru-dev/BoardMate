import { Router } from "express";

import { authenticate } from "../../middleware/authenticate";
import { authorizeOwner } from "../../middleware/authorizeOwner";

import {
  createRoomHandler,
  deleteRoomHandler,
  getRoomHandler,
  listOwnerRoomsHandler,
  listRoomsHandler,
  updateRoomHandler,
} from "./room.controller";

const router = Router();

// Public room listing.
router.get(
  "/properties/:propertyId/rooms",
  listRoomsHandler,
);

// Owner: rooms of their own property in any status (drafts included).
router.get(
  "/properties/:propertyId/rooms/manage",
  authenticate,
  authorizeOwner,
  listOwnerRoomsHandler,
);

// Public room details.
router.get(
  "/rooms/:roomId",
  getRoomHandler,
);

// Owner-only operations.
router.post(
  "/properties/:propertyId/rooms",
  authenticate,
  authorizeOwner,
  createRoomHandler,
);

router.patch(
  "/rooms/:roomId",
  authenticate,
  authorizeOwner,
  updateRoomHandler,
);

router.delete(
  "/rooms/:roomId",
  authenticate,
  authorizeOwner,
  deleteRoomHandler,
);

export default router;