// src/routes/sales.routes.ts
import { Router } from "express";
import { SalesController } from "../controllers/sales.controller";
import {
  authenticateToken,
  authorizeAdmin,
} from "../middleware/auth.middleware";

const router = Router();

// All sales routes require admin authentication
router.use(authenticateToken, authorizeAdmin);

// Daily sales report
router.get("/daily", SalesController.getDailySales);

// Weekly sales report
router.get("/weekly", SalesController.getWeeklySales);

// Monthly sales report
router.get("/monthly", SalesController.getMonthlySales);

// Yearly sales report
router.get("/yearly", SalesController.getYearlySales);

// Sales summary (overall statistics)
router.get("/summary", SalesController.getSalesSummary);

// Custom date range sales
router.get("/custom-range", SalesController.getCustomRangeSales);

// Top selling products
router.get("/top-products", SalesController.getTopProducts);

// Export sales report
router.get("/export", SalesController.exportSalesReport);

// See Dashboard Statistics
router.get("/dashboard", SalesController.getDashboardStats);

export default router;
