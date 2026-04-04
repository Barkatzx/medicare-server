import { Response } from "express";
import { prisma } from "../config/supabase";
import { AuthRequest } from "../middleware/auth.middleware";
import { DiscountService } from "../services/discount.service";

export class CartController {
  // Update addToCart method
  static async addToCart(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { productId, quantity } = req.body;

      if (!productId || !quantity || quantity < 1) {
        return res.status(400).json({
          success: false,
          error: "Product ID and valid quantity are required",
        });
      }

      // Get product with price information
      const product = await prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          error: "Product not found",
        });
      }

      if (product.stock < quantity) {
        return res.status(400).json({
          success: false,
          error: "Insufficient stock",
        });
      }

      // Calculate final price with discount
      const finalPrice = DiscountService.calculateFinalPrice(
        Number(product.price),
        product.discountedPrice ? Number(product.discountedPrice) : null,
        product.discountPercent,
      );

      // Get or create cart
      let cart = await prisma.cart.findUnique({
        where: { userId },
      });

      if (!cart) {
        cart = await prisma.cart.create({
          data: { userId },
        });
      }

      // Add or update cart item
      const existingItem = await prisma.cartItem.findUnique({
        where: {
          cartId_productId: {
            cartId: cart.id,
            productId,
          },
        },
      });

      if (existingItem) {
        await prisma.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: existingItem.quantity + quantity },
        });
      } else {
        await prisma.cartItem.create({
          data: {
            cartId: cart.id,
            productId,
            quantity,
          },
        });
      }

      res.status(200).json({
        success: true,
        message: "Product added to cart successfully",
      });
    } catch (error) {
      console.error("Add to cart error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to add to cart",
      });
    }
  }

  // Update getCart method to show discounted prices
  static async getCart(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;

      const cart = await prisma.cart.findUnique({
        where: { userId },
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
        },
      });

      if (!cart) {
        return res.status(200).json({
          success: true,
          data: {
            items: [],
            subtotal: 0,
            totalSavings: 0,
            total: 0,
          },
        });
      }

      // Calculate cart totals with discounts
      let subtotal = 0;
      let totalSavings = 0;

      const cartItems = cart.items.map((item) => {
        const originalPrice = Number(item.product.price);
        const finalPrice = DiscountService.calculateFinalPrice(
          originalPrice,
          item.product.discountedPrice
            ? Number(item.product.discountedPrice)
            : null,
          item.product.discountPercent,
        );
        const itemTotal = finalPrice * item.quantity;
        const itemOriginalTotal = originalPrice * item.quantity;
        const itemSavings = itemOriginalTotal - itemTotal;

        subtotal += itemOriginalTotal;
        totalSavings += itemSavings;

        return {
          id: item.id,
          quantity: item.quantity,
          product: {
            ...item.product,
            price: originalPrice,
            discountedPrice: item.product.discountedPrice
              ? Number(item.product.discountedPrice)
              : null,
            finalPrice,
            discountPercent:
              item.product.discountPercent ||
              DiscountService.calculateDiscountPercent(
                originalPrice,
                finalPrice,
              ),
          },
          itemTotal,
          itemSavings,
        };
      });

      res.status(200).json({
        success: true,
        data: {
          items: cartItems,
          subtotal,
          totalSavings,
          total: subtotal - totalSavings,
          itemCount: cartItems.reduce((sum, item) => sum + item.quantity, 0),
        },
      });
    } catch (error) {
      console.error("Get cart error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch cart",
      });
    }
  }

  // Update cart item quantity
  static async updateCartItem(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { itemId } = req.params;
      const { quantity } = req.body;

      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      if (!quantity || quantity < 1) {
        return res.status(400).json({ error: "Valid quantity is required" });
      }

      // Get user's cart
      const cart = await prisma.cart.findFirst({
        where: { userId: userId },
      });

      if (!cart) {
        return res.status(404).json({ error: "Cart not found" });
      }

      // Get cart item to check product stock
      const cartItem = await prisma.cartItem.findFirst({
        where: {
          id: itemId,
          cartId: cart.id,
        },
        include: { product: true },
      });

      if (!cartItem) {
        return res.status(404).json({ error: "Cart item not found" });
      }

      // Check stock
      if (cartItem.product.stock < quantity) {
        return res.status(400).json({
          error: `Insufficient stock. Available: ${cartItem.product.stock}`,
        });
      }

      // Update cart item
      const updatedItem = await prisma.cartItem.update({
        where: { id: itemId },
        data: { quantity },
        include: { product: true },
      });

      res.status(200).json({
        message: "Cart item updated successfully",
        data: updatedItem,
      });
    } catch (error: any) {
      console.error("Update cart item error:", error);
      res.status(400).json({
        error: error.message || "Failed to update cart item",
      });
    }
  }

  // Remove item from cart
  static async removeFromCart(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { itemId } = req.params;

      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      // Get user's cart
      const cart = await prisma.cart.findFirst({
        where: { userId: userId },
      });

      if (!cart) {
        return res.status(404).json({ error: "Cart not found" });
      }

      // Delete cart item
      await prisma.cartItem.delete({
        where: {
          id: itemId,
          cartId: cart.id,
        },
      });

      res.status(200).json({
        message: "Item removed from cart successfully",
      });
    } catch (error: any) {
      console.error("Remove from cart error:", error);
      res.status(400).json({
        error: error.message || "Failed to remove item from cart",
      });
    }
  }

  // Clear entire cart
  static async clearCart(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      // Get user's cart
      const cart = await prisma.cart.findFirst({
        where: { userId: userId },
      });

      if (!cart) {
        return res.status(404).json({ error: "Cart not found" });
      }

      // Delete all cart items
      await prisma.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      res.status(200).json({
        message: "Cart cleared successfully",
      });
    } catch (error: any) {
      console.error("Clear cart error:", error);
      res.status(400).json({
        error: error.message || "Failed to clear cart",
      });
    }
  }

  // Get cart item count
  static async getCartItemCount(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const cart = await prisma.cart.findFirst({
        where: { userId: userId },
        include: {
          items: {
            select: {
              quantity: true,
            },
          },
        },
      });

      if (!cart) {
        return res.status(200).json({
          message: "Cart item count fetched successfully",
          data: { count: 0 },
        });
      }

      const totalItems = cart.items.reduce(
        (sum, item) => sum + item.quantity,
        0,
      );

      res.status(200).json({
        message: "Cart item count fetched successfully",
        data: { count: totalItems },
      });
    } catch (error: any) {
      console.error("Get cart item count error:", error);
      res.status(500).json({
        error: error.message || "Failed to fetch cart item count",
      });
    }
  }
}
