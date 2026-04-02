// src/routes/product.routes.ts
import { Router } from "express";
import { ProductController } from "../controllers/product.controller";
import {
  authenticateToken,
  authorizeAdmin,
  authorizeApproved,
} from "../middleware/auth.middleware";

const router = Router();

// ==================== PUBLIC ROUTES ====================
router.get("/", ProductController.getAllProducts);
router.get("/search", ProductController.searchProducts);
router.get("/:id", ProductController.getProductById);

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
  ProductController.createProduct,
);
router.put(
  "/:id",
  authenticateToken,
  authorizeAdmin,
  ProductController.updateProduct,
);
router.delete(
  "/:id",
  authenticateToken,
  authorizeAdmin,
  ProductController.deleteProduct,
);
router.patch(
  "/:id/stock",
  authenticateToken,
  authorizeAdmin,
  ProductController.updateStock,
);

export default router;
