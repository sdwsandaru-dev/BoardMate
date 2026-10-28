
import { Router } from "express";

import { authenticate } from "../../middleware/authenticate";

import {
  addFavoriteHandler,
  listFavoritesHandler,
  removeFavoriteHandler,
} from "./favorite.controller";

const router = Router();

// All favorite endpoints require authentication.
router.use(authenticate);

router.post("/:propertyId", addFavoriteHandler);
router.get("/", listFavoritesHandler);
router.delete("/:propertyId", removeFavoriteHandler);

export default router;
