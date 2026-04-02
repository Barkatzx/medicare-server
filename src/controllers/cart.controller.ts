import { Response } from "express";
import { prisma } from "../config/supabase";
import { AuthRequest } from "../middleware/auth.middleware";

export class CartController {
  // Get user's cart
  static async getCart(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      // Find cart by userId (since userId is unique in Cart)
      const cart = await prisma.cart.findFirst({
        where: { userId: userId },
        include: {
          items: {
            include: {
              product: {
                include: {
                  category: true,
                  images: true,
                },
              },
            },
          },
        },
      });

      if (!cart) {
        return res.status(404).json({ error: "Cart not found" });
      }

      // Calculate total - convert Decimal to number
      const total = cart.items.reduce((sum: number, item: any) => {
        const price =
          typeof item.product.price === "number"
            ? item.product.price
            : item.product.price.toNumber();
        return sum + price * item.quantity;
      }, 0);

      // Calculate subtotal, tax, etc.
      const subtotal = total;
      const tax = subtotal * 0.1; // 10% tax
      const shipping = subtotal > 500 ? 0 : 50; // Free shipping over 500
      const grandTotal = subtotal + tax + shipping;

      res.status(200).json({
        message: "Cart fetched successfully",
        data: {
          ...cart,
          summary: {
            subtotal,
            tax,
            shipping,
            grandTotal,
            itemCount: cart.items.length,
            totalQuantity: cart.items.reduce(
              (sum, item) => sum + item.quantity,
              0,
            ),
          },
        },
      });
    } catch (error: any) {
      console.error("Get cart error:", error);
      res.status(500).json({
        error: error.message || "Failed to fetch cart",
      });
    }
  }

  // Add item to cart
  static async addToCart(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { productId, quantity } = req.body;

      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      if (!productId || !quantity || quantity < 1) {
        return res
          .status(400)
          .json({ error: "Product ID and valid quantity are required" });
      }

      // Get user's cart
      const cart = await prisma.cart.findFirst({
        where: { userId: userId },
      });

      if (!cart) {
        return res.status(404).json({ error: "Cart not found" });
      }

      // Check if product exists and has enough stock
      const product = await prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      if (product.stock < quantity) {
        return res.status(400).json({
          error: `Insufficient stock. Available: ${product.stock}`,
        });
      }

      // Check if item already exists in cart
      const existingItem = await prisma.cartItem.findUnique({
        where: {
          cartId_productId: {
            cartId: cart.id,
            productId: productId,
          },
        },
      });

      let cartItem;
      if (existingItem) {
        // Update existing item
        const newQuantity = existingItem.quantity + quantity;
        if (product.stock < newQuantity) {
          return res.status(400).json({
            error: `Cannot add more. Maximum available: ${product.stock - existingItem.quantity}`,
          });
        }

        cartItem = await prisma.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: newQuantity },
          include: { product: true },
        });
      } else {
        // Create new item
        cartItem = await prisma.cartItem.create({
          data: {
            cartId: cart.id,
            productId: productId,
            quantity: quantity,
          },
          include: { product: true },
        });
      }

      res.status(200).json({
        message: "Item added to cart successfully",
        data: cartItem,
      });
    } catch (error: any) {
      console.error("Add to cart error:", error);
      res.status(400).json({
        error: error.message || "Failed to add item to cart",
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
