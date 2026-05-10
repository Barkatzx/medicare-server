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
  invalidateCache("cache:{userId}:/v1/users/profile*"),
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
  invalidateCache("cache:{userId}:/v1/users/addresses*"),
  invalidateCache("cache:{userId}:/v1/users/profile*"),
  UserController.addAddress,
);
router.put(
  "/addresses/:addressId/default",
  authenticateToken,
  authorizeApproved,
  invalidateCache("cache:{userId}:/v1/users/addresses*"),
  invalidateCache("cache:{userId}:/v1/users/profile*"),
  UserController.setDefaultAddress,
); // must be before /:addressId
router.put(
  "/addresses/:addressId",
  authenticateToken,
  authorizeApproved,
  invalidateCache("cache:{userId}:/v1/users/addresses*"),
  invalidateCache("cache:{userId}:/v1/users/profile*"),
  UserController.updateAddress,
);
router.delete(
  "/addresses/:addressId",
  authenticateToken,
  authorizeApproved,
  invalidateCache("cache:{userId}:/v1/users/addresses*"),
  invalidateCache("cache:{userId}:/v1/users/profile*"),
  UserController.deleteAddress,
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

// ==================== NOTIFICATION ROUTES ====================
router.get(
  "/notifications",
  authenticateToken,
  authorizeApproved,
  UserController.getNotifications,
);
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
// ==================== CART ROUTES ====================
// No Redis caching on cart routes — cart data is user-specific, small, and
// frequently mutated.  Direct DB queries are already optimized and respond
// in ~50-100ms, which is faster than adding Upstash HTTP roundtrips for
// cache get/set/invalidation on every request.
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

export default router;
