// src/routes/order.routes.ts
import { Router } from "express";
import { OrderController } from "../controllers/order.controller";
import {
  authenticateToken,
  authorizeAdmin,
  authorizeApproved,
} from "../middleware/auth.middleware";

const router = Router();

// ==================== USER ROUTES ====================
router.post(
  "/",
  authenticateToken,
  authorizeApproved,
  OrderController.createOrder,
);
router.get(
  "/my-orders",
  authenticateToken,
  authorizeApproved,
  OrderController.getMyOrders,
);
router.get(
  "/my-orders/:orderId",
  authenticateToken,
  authorizeApproved,
  OrderController.getMyOrderById,
);
router.put(
  "/:orderId/cancel",
  authenticateToken,
  authorizeApproved,
  OrderController.cancelOrder,
);

// ==================== ADMIN ROUTES ====================
router.get(
  "/",
  authenticateToken,
  authorizeAdmin,
  OrderController.getAllOrders,
);
router.get(
  "/:orderId",
  authenticateToken,
  authorizeAdmin,
  OrderController.getOrderById,
);
router.put(
  "/:orderId/status",
  authenticateToken,
  authorizeAdmin,
  OrderController.updateOrderStatus,
);
router.put(
  "/:orderId/payment/confirm",
  authenticateToken,
  authorizeAdmin,
  OrderController.confirmPaymentCOD,
);

export default router;
