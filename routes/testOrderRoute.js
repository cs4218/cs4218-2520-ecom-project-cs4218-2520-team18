import express from "express";
import {
  createTestOrderController,
  deleteTestOrdersController,
} from "../e2e/support/testOrderController.js";
import { requireSignIn } from "../middlewares/authMiddleware.js";

const router = express.Router();

// E2E Test routes
router.post("/test/create-order", requireSignIn, createTestOrderController);
router.delete("/test/delete-orders", requireSignIn, deleteTestOrdersController);

export default router;
