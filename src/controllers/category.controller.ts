// src/controllers/category.controller.ts
import { Request, Response } from "express";
import { prisma } from "../config/supabase";
import { AuthRequest } from "../types";

export class CategoryController {
  static async getAllCategories(req: Request, res: Response) {
    try {
      const categories = await prisma.category.findMany({
        include: {
          _count: {
            select: { products: true },
          },
        },
        orderBy: {
          name: "asc",
        },
      });

      res.status(200).json({
        success: true,
        data: categories,
      });
    } catch (error) {
      console.error("Get categories error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch categories",
      });
    }
  }

  static async getCategoryById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const category = await prisma.category.findUnique({
        where: { id },
        include: {
          products: {
            where: { stock: { gt: 0 } },
            take: 20,
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          error: "Category not found",
        });
      }

      res.status(200).json({
        success: true,
        data: category,
      });
    } catch (error) {
      console.error("Get category error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch category",
      });
    }
  }

  static async getCategoryProducts(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;

      const category = await prisma.category.findUnique({
        where: { id },
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          error: "Category not found",
        });
      }

      const products = await prisma.product.findMany({
        where: {
          categoryId: id,
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

      const total = await prisma.product.count({
        where: {
          categoryId: id,
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
      console.error("Get category products error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch category products",
      });
    }
  }

  static async createCategory(req: AuthRequest, res: Response) {
    try {
      const { name, description } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          error: "Category name is required",
        });
      }

      const existingCategory = await prisma.category.findUnique({
        where: { name },
      });

      if (existingCategory) {
        return res.status(400).json({
          success: false,
          error: "Category with this name already exists",
        });
      }

      const category = await prisma.category.create({
        data: {
          name,
          description,
        },
      });

      res.status(201).json({
        success: true,
        data: category,
        message: "Category created successfully",
      });
    } catch (error) {
      console.error("Create category error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create category",
      });
    }
  }

  static async updateCategory(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { name, description } = req.body;

      const existingCategory = await prisma.category.findUnique({
        where: { id },
      });

      if (!existingCategory) {
        return res.status(404).json({
          success: false,
          error: "Category not found",
        });
      }

      if (name && name !== existingCategory.name) {
        const nameExists = await prisma.category.findUnique({
          where: { name },
        });
        if (nameExists) {
          return res.status(400).json({
            success: false,
            error: "Category with this name already exists",
          });
        }
      }

      const category = await prisma.category.update({
        where: { id },
        data: {
          name: name || undefined,
          description: description !== undefined ? description : undefined,
        },
      });

      res.status(200).json({
        success: true,
        data: category,
        message: "Category updated successfully",
      });
    } catch (error) {
      console.error("Update category error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update category",
      });
    }
  }

  static async deleteCategory(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const category = await prisma.category.findUnique({
        where: { id },
        include: {
          products: {
            take: 1,
          },
        },
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          error: "Category not found",
        });
      }

      if (category.products.length > 0) {
        return res.status(400).json({
          success: false,
          error: "Cannot delete category with existing products",
        });
      }

      await prisma.category.delete({
        where: { id },
      });

      res.status(200).json({
        success: true,
        message: "Category deleted successfully",
      });
    } catch (error) {
      console.error("Delete category error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete category",
      });
    }
  }
}
