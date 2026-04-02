// src/routes/category.routes.ts
import { Router } from "express";
import { CategoryController } from "../controllers/category.controller";
import {
  authenticateToken,
  authorizeAdmin,
  authorizeApproved,
} from "../middleware/auth.middleware";

const router = Router();

// ==================== PUBLIC ROUTES ====================
router.get("/", CategoryController.getAllCategories);
router.get("/:id", CategoryController.getCategoryById);
router.get("/:id/products", CategoryController.getCategoryProducts);

// ==================== ADMIN ROUTES ====================
router.post(
  "/",
  authenticateToken,
  authorizeAdmin,
  CategoryController.createCategory,
);
router.put(
  "/:id",
  authenticateToken,
  authorizeAdmin,
  CategoryController.updateCategory,
);
router.delete(
  "/:id",
  authenticateToken,
  authorizeAdmin,
  CategoryController.deleteCategory,
);

export default router;
