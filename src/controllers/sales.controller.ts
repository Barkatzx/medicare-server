// src/controllers/sales.controller.ts
import { Response } from "express";
import { prisma } from "../config/supabase";
import { SalesService } from "../services/sales.service";
import { AuthRequest } from "../types";

export class SalesController {
  /**
   * Get daily sales report
   */
  static async getDailySales(req: AuthRequest, res: Response) {
    try {
      const { date } = req.query;
      const targetDate = date ? new Date(date as string) : new Date();

      const salesData = await SalesService.getDailySales(targetDate);

      res.status(200).json({
        success: true,
        data: salesData,
        message: "Daily sales retrieved successfully",
      });
    } catch (error) {
      console.error("Get daily sales error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch daily sales",
      });
    }
  }

  /**
   * Get weekly sales report (last 7 days)
   */
  static async getWeeklySales(req: AuthRequest, res: Response) {
    try {
      const weeklyData = await SalesService.getWeeklySales();

      // Calculate weekly totals
      const weeklyTotals = weeklyData.reduce(
        (acc, day) => ({
          totalSales: acc.totalSales + day.totalSales,
          totalOrders: acc.totalOrders + day.totalOrders,
          totalItemsSold: acc.totalItemsSold + day.totalItemsSold,
        }),
        { totalSales: 0, totalOrders: 0, totalItemsSold: 0 },
      );

      res.status(200).json({
        success: true,
        data: {
          daily_breakdown: weeklyData,
          weekly_totals: weeklyTotals,
          average_daily_sales: weeklyTotals.totalSales / 7,
        },
        message: "Weekly sales retrieved successfully",
      });
    } catch (error) {
      console.error("Get weekly sales error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch weekly sales",
      });
    }
  }

  /**
   * Get monthly sales report (last 30 days)
   */
  static async getMonthlySales(req: AuthRequest, res: Response) {
    try {
      const monthlyData = await SalesService.getMonthlySales();

      // Calculate monthly totals
      const monthlyTotals = monthlyData.reduce(
        (acc, day) => ({
          totalSales: acc.totalSales + day.totalSales,
          totalOrders: acc.totalOrders + day.totalOrders,
          totalItemsSold: acc.totalItemsSold + day.totalItemsSold,
        }),
        { totalSales: 0, totalOrders: 0, totalItemsSold: 0 },
      );

      res.status(200).json({
        success: true,
        data: {
          daily_breakdown: monthlyData,
          monthly_totals: monthlyTotals,
          average_daily_sales: monthlyTotals.totalSales / 30,
          best_day: monthlyData.reduce(
            (best, day) => (day.totalSales > best.totalSales ? day : best),
            monthlyData[0],
          ),
        },
        message: "Monthly sales retrieved successfully",
      });
    } catch (error) {
      console.error("Get monthly sales error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch monthly sales",
      });
    }
  }

  /**
   * Get yearly sales report (last 12 months)
   */
  static async getYearlySales(req: AuthRequest, res: Response) {
    try {
      const yearlyData = await SalesService.getYearlySales();

      // Calculate yearly totals
      const yearlyTotals = yearlyData.reduce(
        (acc, month) => ({
          totalSales: acc.totalSales + month.totalSales,
          totalOrders: acc.totalOrders + month.totalOrders,
          totalItemsSold: acc.totalItemsSold + month.totalItemsSold,
        }),
        { totalSales: 0, totalOrders: 0, totalItemsSold: 0 },
      );

      res.status(200).json({
        success: true,
        data: {
          monthly_breakdown: yearlyData,
          yearly_totals: yearlyTotals,
          average_monthly_sales: yearlyTotals.totalSales / 12,
          best_month: yearlyData.reduce(
            (best, month) =>
              month.totalSales > best.totalSales ? month : best,
            yearlyData[0],
          ),
        },
        message: "Yearly sales retrieved successfully",
      });
    } catch (error) {
      console.error("Get yearly sales error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch yearly sales",
      });
    }
  }

  /**
   * Get sales summary (overall statistics)
   */
  static async getSalesSummary(req: AuthRequest, res: Response) {
    try {
      const summary = await SalesService.getSalesSummary();
      const growth = await SalesService.getSalesGrowth();
      const salesByStatus = await SalesService.getSalesByStatus();

      res.status(200).json({
        success: true,
        data: {
          overall_summary: summary,
          growth_percentage: growth,
          sales_by_status: salesByStatus,
        },
        message: "Sales summary retrieved successfully",
      });
    } catch (error) {
      console.error("Get sales summary error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch sales summary",
      });
    }
  }

  /**
   * Get custom date range sales
   */
  static async getCustomRangeSales(req: AuthRequest, res: Response) {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          error: "Start date and end date are required",
        });
      }

      const salesData = await SalesService.getCustomDateRangeSales(
        startDate as string,
        endDate as string,
      );

      res.status(200).json({
        success: true,
        data: salesData,
        message: "Custom range sales retrieved successfully",
      });
    } catch (error) {
      console.error("Get custom range sales error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch custom range sales",
      });
    }
  }

  /**
   * Get top selling products
   */
  static async getTopProducts(req: AuthRequest, res: Response) {
    try {
      const limit = parseInt(req.query.limit as string) || 10;

      const topProducts = await prisma.orderItem.groupBy({
        by: ["productId"],
        _sum: {
          quantity: true,
        },
        orderBy: {
          _sum: {
            quantity: "desc",
          },
        },
        take: limit,
      });

      const productsWithDetails = await Promise.all(
        topProducts.map(async (item) => {
          const product = await prisma.product.findUnique({
            where: { id: item.productId },
            include: {
              images: {
                take: 1,
              },
              category: true,
            },
          });

          // Calculate total revenue from this product
          const orders = await prisma.orderItem.findMany({
            where: {
              productId: item.productId,
            },
            include: {
              order: true,
            },
          });

          const totalRevenue = orders.reduce(
            (sum, orderItem) =>
              sum + Number(orderItem.price) * orderItem.quantity,
            0,
          );

          return {
            ...product,
            totalSold: item._sum.quantity,
            totalRevenue,
          };
        }),
      );

      res.status(200).json({
        success: true,
        data: productsWithDetails,
        message: "Top products retrieved successfully",
      });
    } catch (error) {
      console.error("Get top products error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch top products",
      });
    }
  }

  /**
   * Export sales report (CSV format)
   */
  static async exportSalesReport(req: AuthRequest, res: Response) {
    try {
      const { startDate, endDate } = req.query;

      let salesData;
      if (startDate && endDate) {
        salesData = await SalesService.getCustomDateRangeSales(
          startDate as string,
          endDate as string,
        );
      } else {
        // Default to last 30 days
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - 30);
        salesData = await SalesService.getCustomDateRangeSales(
          start.toISOString(),
          end.toISOString(),
        );
      }

      // Create CSV content
      let csv =
        "Date,Total Sales,Total Orders,Average Order Value,Total Items Sold\n";

      for (const day of salesData.dailyBreakdown) {
        csv += `${new Date().toISOString().split("T")[0]},${day.totalSales},${day.totalOrders},${day.averageOrderValue},${day.totalItemsSold}\n`;
      }

      csv += `\nSummary\n`;
      csv += `Total Sales,${salesData.salesData.totalSales}\n`;
      csv += `Total Orders,${salesData.salesData.totalOrders}\n`;
      csv += `Average Order Value,${salesData.salesData.averageOrderValue}\n`;
      csv += `Total Items Sold,${salesData.salesData.totalItemsSold}\n`;
      csv += `Total Discounts,${salesData.salesData.totalDiscounts}\n`;

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=sales-report-${Date.now()}.csv`,
      );
      res.status(200).send(csv);
    } catch (error) {
      console.error("Export sales report error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to export sales report",
      });
    }
  }

  // Add this to sales.controller.ts
  static async getDashboardStats(req: AuthRequest, res: Response) {
    try {
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const startOfYear = new Date(today.getFullYear(), 0, 1);

      const [todaySales, weekSales, monthSales, yearSales, summary, growth] =
        await Promise.all([
          SalesService.getDailySales(today),
          SalesService.getSalesData(startOfWeek, today),
          SalesService.getSalesData(startOfMonth, today),
          SalesService.getSalesData(startOfYear, today),
          SalesService.getSalesSummary(),
          SalesService.getSalesGrowth(),
        ]);

      // Get recent orders
      const recentOrders = await prisma.order.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
          payment: true,
        },
      });

      res.status(200).json({
        success: true,
        data: {
          today: {
            sales: todaySales.totalSales,
            orders: todaySales.totalOrders,
            items: todaySales.totalItemsSold,
          },
          this_week: {
            sales: weekSales.totalSales,
            orders: weekSales.totalOrders,
            items: weekSales.totalItemsSold,
          },
          this_month: {
            sales: monthSales.totalSales,
            orders: monthSales.totalOrders,
            items: monthSales.totalItemsSold,
          },
          this_year: {
            sales: yearSales.totalSales,
            orders: yearSales.totalOrders,
            items: yearSales.totalItemsSold,
          },
          lifetime: {
            sales: summary.totalSales,
            orders: summary.totalOrders,
            customers: summary.totalCustomers,
            products_sold: summary.totalItemsSold,
          },
          growth,
          recent_orders: recentOrders,
        },
      });
    } catch (error) {
      console.error("Get dashboard stats error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch dashboard statistics",
      });
    }
  }
}
