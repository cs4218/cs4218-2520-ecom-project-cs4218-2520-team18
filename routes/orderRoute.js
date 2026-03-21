// Aw Jean Leng Adrian, A0277537N

import express from "express";
import {
  getOrdersController,
  getAllOrdersController,
  orderStatusController,
  createTestOrderController,
  deleteTestOrdersController,
} from "../controllers/orderController.js";
import { isAdmin, requireSignIn } from "../middlewares/authMiddleware.js";

const router = express.Router();

//orders
router.get("/orders", requireSignIn, getOrdersController);

//all orders
router.get("/all-orders", requireSignIn, isAdmin, getAllOrdersController);

// order status update
router.put(
  "/order-status/:orderId",
  requireSignIn,
  isAdmin,
  orderStatusController
);

// E2E Test routes (only available in test mode)
router.post("/test/create-order", requireSignIn, createTestOrderController);
router.delete("/test/delete-orders", requireSignIn, deleteTestOrdersController);

export default router;