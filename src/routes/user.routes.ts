import { Router } from "express";
import { CartController } from "../controllers/cart.controller";
import { UserController } from "../controllers/user.controller";
import {
  authenticateToken,
  authorizeAdmin,
  authorizeApproved,
} from "../middleware/auth.middleware";
import { cacheRoute, invalidateCache } from "../middleware/cache.middleware";

const router = Router();

// ==================== PUBLIC ROUTES ====================
router.post("/register", UserController.register);
router.post("/login", UserController.login);

// ==================== USER PROFILE ROUTES ====================
router.get(
  "/profile",
  authenticateToken,
  authorizeApproved,
  cacheRoute(3600), // Cache profile for 1 hour
  UserController.getProfile,
);
router.put(
  "/profile",
  authenticateToken,
  authorizeApproved,
  invalidateCache("cache:{userId}:/api/users/profile*"),
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
  cacheRoute(3600),
  UserController.getAddresses,
);
router.post(
  "/addresses",
  authenticateToken,
  authorizeApproved,
  invalidateCache("cache:{userId}:/api/users/addresses*"),
  UserController.addAddress,
);
router.put(
  "/addresses/:addressId/default",
  authenticateToken,
  authorizeApproved,
  invalidateCache("cache:{userId}:/api/users/addresses*"),
  UserController.setDefaultAddress,
); // must be before /:addressId
router.put(
  "/addresses/:addressId",
  authenticateToken,
  authorizeApproved,
  invalidateCache("cache:{userId}:/api/users/addresses*"),
  UserController.updateAddress,
);
router.delete(
  "/addresses/:addressId",
  authenticateToken,
  authorizeApproved,
  invalidateCache("cache:{userId}:/api/users/addresses*"),
  UserController.deleteAddress,
);

// ==================== CART ROUTES ====================
router.get(
  "/cart",
  authenticateToken,
  authorizeApproved,
  cacheRoute(300),
  CartController.getCart,
);
router.get(
  "/cart/count",
  authenticateToken,
  authorizeApproved,
  cacheRoute(300),
  CartController.getCartItemCount,
);
router.post(
  "/cart/add",
  authenticateToken,
  authorizeApproved,
  invalidateCache("cache:{userId}:/api/users/cart*"),
  CartController.addToCart,
);
router.put(
  "/cart/item/:itemId",
  authenticateToken,
  authorizeApproved,
  invalidateCache("cache:{userId}:/api/users/cart*"),
  CartController.updateCartItem,
);
router.delete(
  "/cart/item/:itemId",
  authenticateToken,
  authorizeApproved,
  invalidateCache("cache:{userId}:/api/users/cart*"),
  CartController.removeFromCart,
);
router.delete(
  "/cart/clear",
  authenticateToken,
  authorizeApproved,
  invalidateCache("cache:{userId}:/api/users/cart*"),
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
  "/notifications/:notificationId",
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
router.delete(
  "/:userId",
  authenticateToken,
  authorizeAdmin,
  UserController.deleteProfile,
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
