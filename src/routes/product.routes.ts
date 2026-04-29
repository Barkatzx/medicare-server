// src/routes/product.routes.ts
import { Router } from "express";
import { ProductController } from "../controllers/product.controller";
import {
  authenticateToken,
  authorizeAdmin,
} from "../middleware/auth.middleware";
import { uploadMultiple } from "../middleware/upload.middleware";
import { cacheRoute, invalidateCache } from "../middleware/cache.middleware";

const router = Router();

// ==================== PUBLIC ROUTES ====================
router.get("/", cacheRoute(300), ProductController.getAllProducts);
router.get("/on-sale", cacheRoute(300), ProductController.getProductsOnSale);
router.get("/search", cacheRoute(60), ProductController.searchProducts); // Shorter cache for search
router.get("/:id", cacheRoute(300), ProductController.getProductById);

// ==================== PROTECTED ROUTES ====================
router.get(
  "/admin/low-stock",
  authenticateToken,
  authorizeAdmin,
  ProductController.getLowStockProducts,
);

// ==================== ADMIN ROUTES ====================
router.post(
  "/",
  authenticateToken,
  authorizeAdmin,
  invalidateCache("cache:*:*products*"),
  uploadMultiple,
  ProductController.createProductWithImages,
);

router.post(
  "/:id/images",
  authenticateToken,
  authorizeAdmin,
  uploadMultiple,
  ProductController.addProductImages,
);

router.delete(
  "/:productId/images/:imageId",
  authenticateToken,
  authorizeAdmin,
  ProductController.deleteProductImage,
);

router.patch(
  "/:productId/images/:imageId/default",
  authenticateToken,
  authorizeAdmin,
  invalidateCache("cache:*:*products*"),
  ProductController.setDefaultImage,
);


router.put(
  "/:id",
  authenticateToken,
  authorizeAdmin,
  invalidateCache("cache:*:*products*"),
  ProductController.updateProduct,
);
router.delete(
  "/:id",
  authenticateToken,
  authorizeAdmin,
  invalidateCache("cache:*:*products*"),
  ProductController.deleteProduct,
);
router.patch(
  "/:id/stock",
  authenticateToken,
  authorizeAdmin,
  invalidateCache("cache:*:*products*"),
  ProductController.updateStock,
);

export default router;
