import { Router } from "express";
import { CartController } from "../controllers/cart.controller";
import { UserController } from "../controllers/user.controller";
import {
  authenticateToken,
  authorizeAdmin,
  authorizeApproved,
} from "../middleware/auth.middleware";

const router = Router();

// ==================== PUBLIC ROUTES ====================
router.post("/register", UserController.register);
router.post("/login", UserController.login);

// ==================== USER PROFILE ROUTES ====================
router.get(
  "/profile",
  authenticateToken,
  authorizeApproved,
  UserController.getProfile,
);
router.put(
  "/profile",
  authenticateToken,
  authorizeApproved,
  UserController.updateProfile,
);
router.post(
  "/change-password",
  authenticateToken,
  authorizeApproved,
  UserController.changePassword,
);

// ==================== ADDRESS ROUTES ====================
router.get(
  "/addresses",
  authenticateToken,
  authorizeApproved,
  UserController.getAddresses,
);
router.post(
  "/addresses",
  authenticateToken,
  authorizeApproved,
  UserController.addAddress,
);
router.put(
  "/addresses/:addressId/default",
  authenticateToken,
  authorizeApproved,
  UserController.setDefaultAddress,
); // must be before /:addressId
router.put(
  "/addresses/:addressId",
  authenticateToken,
  authorizeApproved,
  UserController.updateAddress,
);
router.delete(
  "/addresses/:addressId",
  authenticateToken,
  authorizeApproved,
  UserController.deleteAddress,
);

// ==================== CART ROUTES ====================
router.get(
  "/cart",
  authenticateToken,
  authorizeApproved,
  CartController.getCart,
);
router.get(
  "/cart/count",
  authenticateToken,
  authorizeApproved,
  CartController.getCartItemCount,
);
router.post(
  "/cart/add",
  authenticateToken,
  authorizeApproved,
  CartController.addToCart,
);
router.put(
  "/cart/item/:itemId",
  authenticateToken,
  authorizeApproved,
  CartController.updateCartItem,
);
router.delete(
  "/cart/item/:itemId",
  authenticateToken,
  authorizeApproved,
  CartController.removeFromCart,
);
router.delete(
  "/cart/clear",
  authenticateToken,
  authorizeApproved,
  CartController.clearCart,
);

// ==================== NOTIFICATION ROUTES ====================
router.get(
  "/notifications",
  authenticateToken,
  authorizeApproved,
  UserController.getNotifications,
);
// FIX: "read-all" must come BEFORE "/:notificationId/read" or Express will treat "read-all" as a notificationId
router.put(
  "/notifications/read-all",
  authenticateToken,
  authorizeApproved,
  UserController.markAllNotificationsRead,
);
router.put(
  "/notifications/:notificationId/read",
  authenticateToken,
  authorizeApproved,
  UserController.markNotificationRead,
);

// ==================== ADMIN ROUTES ====================
router.get(
  "/all",
  authenticateToken,
  authorizeAdmin,
  UserController.getAllUsers,
);
router.put(
  "/approve/:userId",
  authenticateToken,
  authorizeAdmin,
  UserController.approveUser,
);
router.post(
  "/notifications/send",
  authenticateToken,
  authorizeAdmin,
  UserController.sendNotification,
);
router.post(
  "/notifications/send-bulk",
  authenticateToken,
  authorizeAdmin,
  UserController.sendBulkNotifications,
);

export default router;
