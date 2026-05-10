import { CartController } from "../controllers/cart.controller";
import {
  authenticateToken,
  authorizeApproved,
} from "../middleware/auth.middleware";
import { cacheRoute, invalidateCache } from "../middleware/cache.middleware";
import router from "./sales.routes";

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
