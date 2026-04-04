// src/controllers/product.controller.ts
import { Request, Response } from "express";
import { prisma } from "../config/supabase";
import { DiscountService } from "../services/discount.service";
import { ImageService } from "../services/image.service";
import { AuthRequest } from "../types";

export class ProductController {
  // Get all products with discount calculation
  static async getAllProducts(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;
      const categoryId = req.query.categoryId as string;
      const minPrice = parseFloat(req.query.minPrice as string);
      const maxPrice = parseFloat(req.query.maxPrice as string);
      const sortBy = (req.query.sortBy as string) || "createdAt";
      const sortOrder = (req.query.sortOrder as string) || "desc";
      const onSale = req.query.onSale === "true"; // Filter for discounted products

      const where: any = {
        stock: { gt: 0 },
      };

      if (categoryId) {
        where.categoryId = categoryId;
      }

      // Price filtering considering discounts
      if (minPrice || maxPrice) {
        where.OR = [{ price: {} }, { discountedPrice: {} }];

        if (minPrice) {
          where.OR[0].price.gte = minPrice;
          where.OR[1].discountedPrice.gte = minPrice;
        }
        if (maxPrice) {
          where.OR[0].price.lte = maxPrice;
          where.OR[1].discountedPrice.lte = maxPrice;
        }
      }

      // Filter for products on sale
      if (onSale) {
        where.OR = [
          { discountedPrice: { not: null } },
          { discountPercent: { gt: 0 } },
        ];
      }

      const orderBy: any = {};
      orderBy[sortBy] = sortOrder;

      const products = await prisma.product.findMany({
        where,
        include: {
          images: true,
          category: true,
        },
        skip,
        take: limit,
        orderBy,
      });

      // Calculate final price for each product
      const productsWithDiscount = products.map((product) => {
        const finalPrice = DiscountService.calculateFinalPrice(
          Number(product.price),
          product.discountedPrice ? Number(product.discountedPrice) : null,
          product.discountPercent,
        );
        const savings = DiscountService.calculateSavings(
          Number(product.price),
          finalPrice,
        );

        return {
          ...product,
          price: Number(product.price),
          discountedPrice: product.discountedPrice
            ? Number(product.discountedPrice)
            : null,
          finalPrice,
          savings,
          discountBadge: DiscountService.getDiscountBadge(
            Number(product.price),
            finalPrice,
          ),
          discountPercent:
            product.discountPercent ||
            (savings > 0
              ? DiscountService.calculateDiscountPercent(
                  Number(product.price),
                  finalPrice,
                )
              : 0),
        };
      });

      const total = await prisma.product.count({ where });

      res.status(200).json({
        success: true,
        data: {
          products: productsWithDiscount,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      console.error("Get products error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch products",
      });
    }
  }

  // Get single product with discount calculation
  static async getProductById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const product = await prisma.product.findUnique({
        where: { id },
        include: {
          images: true,
          category: true,
        },
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          error: "Product not found",
        });
      }

      const finalPrice = DiscountService.calculateFinalPrice(
        Number(product.price),
        product.discountedPrice ? Number(product.discountedPrice) : null,
        product.discountPercent,
      );
      const savings = DiscountService.calculateSavings(
        Number(product.price),
        finalPrice,
      );

      const productWithDiscount = {
        ...product,
        price: Number(product.price),
        discountedPrice: product.discountedPrice
          ? Number(product.discountedPrice)
          : null,
        finalPrice,
        savings,
        discountBadge: DiscountService.getDiscountBadge(
          Number(product.price),
          finalPrice,
        ),
        discountPercent:
          product.discountPercent ||
          (savings > 0
            ? DiscountService.calculateDiscountPercent(
                Number(product.price),
                finalPrice,
              )
            : 0),
      };

      res.status(200).json({
        success: true,
        data: productWithDiscount,
      });
    } catch (error) {
      console.error("Get product error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch product",
      });
    }
  }

  // Create product with discount support
  static async createProductWithImages(req: AuthRequest, res: Response) {
    try {
      const {
        name,
        description,
        price,
        discountedPrice,
        discountPercent,
        stock,
        categoryId,
      } = req.body;

      const files = req.files as Express.Multer.File[];

      // Validation
      if (!name || !description || !price || !categoryId) {
        return res.status(400).json({
          success: false,
          error:
            "Missing required fields: name, description, price, categoryId",
        });
      }

      const parsedPrice = parseFloat(price);
      if (parsedPrice <= 0) {
        return res.status(400).json({
          success: false,
          error: "Price must be greater than 0",
        });
      }

      // Validate discount
      const parsedDiscountedPrice = discountedPrice
        ? parseFloat(discountedPrice)
        : undefined;
      const parsedDiscountPercent = discountPercent
        ? parseInt(discountPercent)
        : undefined;

      const discountValidation = DiscountService.validateDiscount(
        parsedPrice,
        parsedDiscountedPrice,
        parsedDiscountPercent,
      );

      if (!discountValidation.valid) {
        return res.status(400).json({
          success: false,
          error: discountValidation.error,
        });
      }

      const category = await prisma.category.findUnique({
        where: { id: categoryId },
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          error: "Category not found",
        });
      }

      // Upload images if provided
      let imageUrls: string[] = [];
      if (files && files.length > 0) {
        imageUrls = await ImageService.uploadMultipleImages(files, "products");
      }

      const product = await prisma.product.create({
        data: {
          name,
          description,
          price: parsedPrice,
          discountedPrice: parsedDiscountedPrice,
          discountPercent: parsedDiscountPercent,
          stock: stock ? parseInt(stock) : 0,
          categoryId,
          images:
            imageUrls.length > 0
              ? {
                  create: imageUrls.map((url, index) => ({
                    url,
                    altText: `${name} image ${index + 1}`,
                  })),
                }
              : undefined,
        },
        include: {
          images: true,
          category: true,
        },
      });

      const finalPrice = DiscountService.calculateFinalPrice(
        Number(product.price),
        product.discountedPrice ? Number(product.discountedPrice) : null,
        product.discountPercent,
      );

      res.status(201).json({
        success: true,
        data: {
          ...product,
          price: Number(product.price),
          discountedPrice: product.discountedPrice
            ? Number(product.discountedPrice)
            : null,
          finalPrice,
          savings: DiscountService.calculateSavings(
            Number(product.price),
            finalPrice,
          ),
        },
        message: "Product created successfully",
      });
    } catch (error) {
      console.error("Create product error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create product",
      });
    }
  }

  // Update product with discount support
  static async updateProduct(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const {
        name,
        description,
        price,
        discountedPrice,
        discountPercent,
        stock,
        categoryId,
      } = req.body;

      const existingProduct = await prisma.product.findUnique({
        where: { id },
      });

      if (!existingProduct) {
        return res.status(404).json({
          success: false,
          error: "Product not found",
        });
      }

      if (categoryId) {
        const category = await prisma.category.findUnique({
          where: { id: categoryId },
        });
        if (!category) {
          return res.status(404).json({
            success: false,
            error: "Category not found",
          });
        }
      }

      const parsedPrice = price ? parseFloat(price) : undefined;
      const parsedDiscountedPrice = discountedPrice
        ? parseFloat(discountedPrice)
        : undefined;
      const parsedDiscountPercent = discountPercent
        ? parseInt(discountPercent)
        : undefined;

      // Validate discount if price or discount is being updated
      if (
        parsedPrice ||
        parsedDiscountedPrice !== undefined ||
        parsedDiscountPercent !== undefined
      ) {
        const currentPrice = parsedPrice || Number(existingProduct.price);
        const discountValidation = DiscountService.validateDiscount(
          currentPrice,
          parsedDiscountedPrice,
          parsedDiscountPercent,
        );

        if (!discountValidation.valid) {
          return res.status(400).json({
            success: false,
            error: discountValidation.error,
          });
        }
      }

      const product = await prisma.product.update({
        where: { id },
        data: {
          name: name || undefined,
          description: description || undefined,
          price: parsedPrice,
          discountedPrice: parsedDiscountedPrice,
          discountPercent: parsedDiscountPercent,
          stock: stock !== undefined ? parseInt(stock) : undefined,
          categoryId: categoryId || undefined,
        },
        include: {
          images: true,
          category: true,
        },
      });

      const finalPrice = DiscountService.calculateFinalPrice(
        Number(product.price),
        product.discountedPrice ? Number(product.discountedPrice) : null,
        product.discountPercent,
      );

      res.status(200).json({
        success: true,
        data: {
          ...product,
          price: Number(product.price),
          discountedPrice: product.discountedPrice
            ? Number(product.discountedPrice)
            : null,
          finalPrice,
          savings: DiscountService.calculateSavings(
            Number(product.price),
            finalPrice,
          ),
        },
        message: "Product updated successfully",
      });
    } catch (error) {
      console.error("Update product error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update product",
      });
    }
  }

  // Get products on sale
  static async getProductsOnSale(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;

      const products = await prisma.product.findMany({
        where: {
          OR: [
            { discountedPrice: { not: null } },
            { discountPercent: { gt: 0 } },
          ],
          stock: { gt: 0 },
        },
        include: {
          images: true,
          category: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      });

      const productsWithDiscount = products.map((product) => {
        const finalPrice = DiscountService.calculateFinalPrice(
          Number(product.price),
          product.discountedPrice ? Number(product.discountedPrice) : null,
          product.discountPercent,
        );

        return {
          ...product,
          price: Number(product.price),
          discountedPrice: product.discountedPrice
            ? Number(product.discountedPrice)
            : null,
          finalPrice,
          savings: DiscountService.calculateSavings(
            Number(product.price),
            finalPrice,
          ),
          discountPercent:
            product.discountPercent ||
            DiscountService.calculateDiscountPercent(
              Number(product.price),
              finalPrice,
            ),
        };
      });

      const total = await prisma.product.count({
        where: {
          OR: [
            { discountedPrice: { not: null } },
            { discountPercent: { gt: 0 } },
          ],
          stock: { gt: 0 },
        },
      });

      res.status(200).json({
        success: true,
        data: {
          products: productsWithDiscount,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      console.error("Get sale products error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch sale products",
      });
    }
  }

  static async addProductImages(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const files = req.files as Express.Multer.File[];

      const product = await prisma.product.findUnique({
        where: { id },
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          error: "Product not found",
        });
      }

      // Upload new images
      const imageUrls = await ImageService.uploadMultipleImages(
        files,
        "products",
      );

      // Add images to product
      const images = await prisma.productImage.createMany({
        data: imageUrls.map((url, index) => ({
          url,
          altText: `${product.name} image`,
          productId: id,
        })),
      });

      res.status(200).json({
        success: true,
        data: { added: imageUrls.length },
        message: "Images added successfully",
      });
    } catch (error) {
      console.error("Add product images error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to add images",
      });
    }
  }

  static async deleteProductImage(req: AuthRequest, res: Response) {
    try {
      const { productId, imageId } = req.params;

      const image = await prisma.productImage.findFirst({
        where: {
          id: imageId,
          productId: productId,
        },
      });

      if (!image) {
        return res.status(404).json({
          success: false,
          error: "Image not found",
        });
      }

      // Delete from storage
      await ImageService.deleteImage(image.url);

      // Delete from database
      await prisma.productImage.delete({
        where: { id: imageId },
      });

      res.status(200).json({
        success: true,
        message: "Image deleted successfully",
      });
    } catch (error) {
      console.error("Delete product image error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete image",
      });
    }
  }

  static async searchProducts(req: Request, res: Response) {
    try {
      const { q } = req.query;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;

      if (!q || typeof q !== "string") {
        return res.status(400).json({
          success: false,
          error: "Search query is required",
        });
      }

      const products = await prisma.product.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
          stock: { gt: 0 },
        },
        include: {
          images: true,
          category: true,
        },
        skip,
        take: limit,
        orderBy: { name: "asc" },
      });

      const total = await prisma.product.count({
        where: {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
          stock: { gt: 0 },
        },
      });

      res.status(200).json({
        success: true,
        data: {
          products,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      console.error("Search products error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to search products",
      });
    }
  }

  static async createProduct(req: AuthRequest, res: Response) {
    try {
      const { name, description, price, stock, categoryId, images } = req.body;

      // Validation
      if (!name || !description || !price || !categoryId) {
        return res.status(400).json({
          success: false,
          error:
            "Missing required fields: name, description, price, categoryId",
        });
      }

      if (price <= 0) {
        return res.status(400).json({
          success: false,
          error: "Price must be greater than 0",
        });
      }

      const category = await prisma.category.findUnique({
        where: { id: categoryId },
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          error: "Category not found",
        });
      }

      const product = await prisma.product.create({
        data: {
          name,
          description,
          price,
          stock: stock || 0,
          categoryId,
          images:
            images && images.length > 0
              ? {
                  create: images.map((img: any) => ({
                    url: img.url,
                    altText: img.altText,
                  })),
                }
              : undefined,
        },
        include: {
          images: true,
          category: true,
        },
      });

      res.status(201).json({
        success: true,
        data: product,
        message: "Product created successfully",
      });
    } catch (error) {
      console.error("Create product error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create product",
      });
    }
  }

  static async deleteProduct(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const product = await prisma.product.findUnique({
        where: { id },
        include: {
          orderItems: {
            take: 1,
          },
        },
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          error: "Product not found",
        });
      }

      if (product.orderItems.length > 0) {
        return res.status(400).json({
          success: false,
          error: "Cannot delete product with existing orders",
        });
      }

      // Delete associated images first
      await prisma.productImage.deleteMany({
        where: { productId: id },
      });

      await prisma.product.delete({
        where: { id },
      });

      res.status(200).json({
        success: true,
        message: "Product deleted successfully",
      });
    } catch (error) {
      console.error("Delete product error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete product",
      });
    }
  }

  static async updateStock(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { stock, operation } = req.body;

      const product = await prisma.product.findUnique({
        where: { id },
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          error: "Product not found",
        });
      }

      let newStock = stock;
      if (operation === "increment") {
        newStock = product.stock + (stock || 0);
      } else if (operation === "decrement") {
        newStock = product.stock - (stock || 0);
        if (newStock < 0) {
          return res.status(400).json({
            success: false,
            error: "Insufficient stock",
          });
        }
      }

      const updatedProduct = await prisma.product.update({
        where: { id },
        data: { stock: newStock },
      });

      res.status(200).json({
        success: true,
        data: updatedProduct,
        message: "Stock updated successfully",
      });
    } catch (error) {
      console.error("Update stock error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update stock",
      });
    }
  }

  static async getLowStockProducts(req: AuthRequest, res: Response) {
    try {
      const threshold = parseInt(req.query.threshold as string) || 10;

      const products = await prisma.product.findMany({
        where: {
          stock: {
            lte: threshold,
          },
        },
        include: {
          category: true,
          images: true,
        },
        orderBy: {
          stock: "asc",
        },
      });

      res.status(200).json({
        success: true,
        data: products,
      });
    } catch (error) {
      console.error("Get low stock products error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch low stock products",
      });
    }
  }
}
