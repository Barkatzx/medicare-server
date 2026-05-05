// src/controllers/order.controller.ts
import { Response } from "express";
import { prisma } from "../config/supabase";
import { DiscountService } from "../services/discount.service";
import { AuthRequest } from "../types";

interface CreateOrderBody {
  shippingAddressId: string;
  paymentMethod?: "cod";
}

interface UpdateOrderStatusBody {
  status: "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";
}

export class OrderController {
  static async createOrder(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { shippingAddressId, paymentMethod = "cod" } =
        req.body as CreateOrderBody;

      if (!shippingAddressId) {
        return res.status(400).json({
          success: false,
          error: "Shipping address is required",
        });
      }

      // Verify address belongs to user
      const address = await prisma.address.findFirst({
        where: {
          id: shippingAddressId,
          userId,
        },
      });

      if (!address) {
        return res.status(404).json({
          success: false,
          error: "Shipping address not found",
        });
      }

      // Get user's cart with items
      const cart = await prisma.cart.findUnique({
        where: { userId },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      if (!cart || cart.items.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Cart is empty",
        });
      }
      // Check stock availability and calculate totals with discounts
      let totalAmount = 0;
      let totalOriginalAmount = 0;

      for (const item of cart.items) {
        if (item.quantity > item.product.stock) {
          return res.status(400).json({
            success: false,
            error: `Insufficient stock for product: ${item.product.name}. Available: ${item.product.stock}`,
          });
        }

        const originalPrice = Number(item.product.price);
        const finalPrice = DiscountService.calculateFinalPrice(
          originalPrice,
          item.product.discountedPrice
            ? Number(item.product.discountedPrice)
            : null,
          item.product.discountPercent,
        );

        totalOriginalAmount += originalPrice * item.quantity;
        totalAmount += finalPrice * item.quantity;
      }
      // Create order with transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create order
        const order = await tx.order.create({
          data: {
            userId,
            shippingAddressId,
            totalAmount,
            status: "pending",
            items: {
              create: cart.items.map((item) => {
                const originalPrice = Number(item.product.price);
                const finalPrice = DiscountService.calculateFinalPrice(
                  originalPrice,
                  item.product.discountedPrice
                    ? Number(item.product.discountedPrice)
                    : null,
                  item.product.discountPercent,
                );

                return {
                  productId: item.productId,
                  quantity: item.quantity,
                  price: finalPrice,
                };
              }),
            },
            payment: {
              create: {
                method: paymentMethod,
                status: "pending",
              },
            },
          },
          include: {
            items: {
              include: {
                product: true,
              },
            },
            payment: true,
            shippingAddress: true,
          },
        });

        // Update product stock
        for (const item of cart.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                decrement: item.quantity,
              },
            },
          });
        }

        // Clear cart
        await tx.cartItem.deleteMany({
          where: { cartId: cart.id },
        });

        // Create notification with savings info
        const totalSavings = totalOriginalAmount - totalAmount;
        const savingsMessage =
          totalSavings > 0 ? ` You saved ${totalSavings.toFixed(2)}৳!` : "";

        await tx.notification.create({
          data: {
            userId,
            title: "Order Placed Successfully",
            message: `Your order #${order.id} has been placed successfully. Total amount: ${totalAmount}${savingsMessage}৳`,
            type: "order",
          },
        });

        return order;
      });

      res.status(201).json({
        success: true,
        data: result,
        message: "Order created successfully",
      });
    } catch (error) {
      console.error("Create order error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create order",
      });
    }
  }
  static async getMyOrders(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;
      const status = req.query.status as string;

      const where: any = { userId };
      if (status) {
        where.status = status;
      }

      const orders = await prisma.order.findMany({
        where,
        include: {
          items: {
            include: {
              product: {
                include: {
                  images: true,
                },
              },
            },
          },
          payment: true,
          shippingAddress: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      });

      const total = await prisma.order.count({ where });

      res.status(200).json({
        success: true,
        data: {
          orders,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      console.error("Get my orders error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch orders",
      });
    }
  }

  static async getMyOrderById(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { orderId } = req.params;

      const order = await prisma.order.findFirst({
        where: {
          id: orderId,
          userId,
        },
        include: {
          items: {
            include: {
              product: {
                include: {
                  images: true,
                },
              },
            },
          },
          payment: true,
          shippingAddress: true,
        },
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          error: "Order not found",
        });
      }

      res.status(200).json({
        success: true,
        data: order,
      });
    } catch (error) {
      console.error("Get order by id error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch order",
      });
    }
  }

  static async cancelOrder(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { orderId } = req.params;

      const order = await prisma.order.findFirst({
        where: {
          id: orderId,
          userId,
        },
        include: {
          items: true,
        },
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          error: "Order not found",
        });
      }

      if (order.status !== "pending") {
        return res.status(400).json({
          success: false,
          error: `Cannot cancel order with status: ${order.status}`,
        });
      }

      // Cancel order and restore stock
      const result = await prisma.$transaction(async (tx) => {
        // Restore product stock
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                increment: item.quantity,
              },
            },
          });
        }

        // Update order status
        const updatedOrder = await tx.order.update({
          where: { id: orderId },
          data: { status: "cancelled" },
        });

        // Update payment status
        await tx.payment.update({
          where: { orderId },
          data: { status: "failed" },
        });

        // Create notification
        await tx.notification.create({
          data: {
            userId,
            title: "Order Cancelled",
            message: `Your order #${orderId} has been cancelled.`,
            type: "order",
          },
        });

        return updatedOrder;
      });

      res.status(200).json({
        success: true,
        data: result,
        message: "Order cancelled successfully",
      });
    } catch (error) {
      console.error("Cancel order error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to cancel order",
      });
    }
  }

  static async getAllOrders(req: AuthRequest, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;
      const status = req.query.status as string;

      const where: any = {};
      if (status) {
        where.status = status;
      }

      const orders = await prisma.order.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone_number: true,
              pharmacy_name: true,
            },
          },
          items: {
            include: {
              product: true,
            },
          },
          payment: true,
          shippingAddress: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      });

      const total = await prisma.order.count({ where });

      res.status(200).json({
        success: true,
        data: {
          orders,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      console.error("Get all orders error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch orders",
      });
    }
  }

  static async getOrderById(req: AuthRequest, res: Response) {
    try {
      const { orderId } = req.params;

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone_number: true,
              pharmacy_name: true,
            },
          },
          items: {
            include: {
              product: {
                include: {
                  images: true,
                },
              },
            },
          },
          payment: true,
          shippingAddress: true,
        },
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          error: "Order not found",
        });
      }

      res.status(200).json({
        success: true,
        data: order,
      });
    } catch (error) {
      console.error("Get order by id error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch order",
      });
    }
  }

  static async updateOrderStatus(req: AuthRequest, res: Response) {
    try {
      const { orderId } = req.params;
      const { status } = req.body as UpdateOrderStatusBody;

      const validStatuses = [
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: "Invalid status",
        });
      }

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          user: true,
        },
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          error: "Order not found",
        });
      }

      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: { status },
      });

      // Create notification for user
      await prisma.notification.create({
        data: {
          userId: order.userId,
          title: `Order Status Updated`,
          message: `Your order #${orderId} status has been updated to: ${status}`,
          type: "order",
        },
      });

      res.status(200).json({
        success: true,
        data: updatedOrder,
        message: "Order status updated successfully",
      });
    } catch (error) {
      console.error("Update order status error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update order status",
      });
    }
  }

  static async confirmPaymentCOD(req: AuthRequest, res: Response) {
    try {
      const { orderId } = req.params;

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          payment: true,
        },
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          error: "Order not found",
        });
      }

      if (order.payment?.status === "paid") {
        return res.status(400).json({
          success: false,
          error: "Payment already confirmed",
        });
      }

      const updatedPayment = await prisma.payment.update({
        where: { orderId },
        data: {
          status: "paid",
          paidAt: new Date(),
        },
      });

      // Create notification
      await prisma.notification.create({
        data: {
          userId: order.userId,
          title: "Payment Confirmed",
          message: `Your payment for order #${orderId} has been confirmed.`,
          type: "order",
        },
      });

      res.status(200).json({
        success: true,
        data: updatedPayment,
        message: "Payment confirmed successfully",
      });
    } catch (error) {
      console.error("Confirm payment error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to confirm payment",
      });
    }
  }
}
