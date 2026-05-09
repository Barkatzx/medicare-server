import { prisma } from "../config/supabase";
import redisClient from "../config/redis";
import { DiscountService } from "./discount.service";

export class ProductService {
  private static CACHE_TTL = 300; // 5 minutes

  /**
   * Helper to format products with discount calculations
   */
  private static formatProducts(products: any[]) {
    return products.map((product) => {
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
  }

  /**
   * Invalidates product-related caches
   */
  static async invalidateProductCaches() {
    await redisClient.del("products:trending", "products:featured");
  }

  /**
   * Get trending products (cached)
   */
  static async getTrendingProducts() {
    const cacheKey = "products:trending";
    const cachedProducts = await redisClient.get(cacheKey);

    if (cachedProducts) {
      return cachedProducts;
    }

    const products = await prisma.product.findMany({
      where: {
        trending: true,
        stock: { gt: 0 },
      },
      include: {
        images: true,
        category: true,
      },
      orderBy: {
        createdAt: "desc"
      },
    });

    const formattedProducts = this.formatProducts(products);

    await redisClient.setex(
      cacheKey,
      this.CACHE_TTL,
      formattedProducts,
    );

    return formattedProducts;
  }

  /**
   * Get featured products (cached)
   */
  static async getFeaturedProducts() {
    const cacheKey = "products:featured";
    const cachedProducts = await redisClient.get(cacheKey);

    if (cachedProducts) {
      return cachedProducts;
    }

    const products = await prisma.product.findMany({
      where: {
        featured: true,
        stock: { gt: 0 },
      },
      include: {
        images: true,
        category: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const formattedProducts = this.formatProducts(products);

    await redisClient.setex(
      cacheKey,
      this.CACHE_TTL,
      formattedProducts,
    );

    return formattedProducts;
  }

  /**
   * Update trending status for a product
   */
  static async updateTrendingStatus(
    productId: string,
    trending: boolean,
  ) {
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        trending,
      },
      include: {
        images: true,
        category: true,
      },
    });

    await this.invalidateProductCaches();
    
    const formattedProducts = this.formatProducts([updatedProduct]);
    return formattedProducts[0];
  }

  /**
   * Update featured status for a product
   */
  static async updateFeaturedStatus(productId: string, featured: boolean) {
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        featured,
      },
      include: {
        images: true,
        category: true,
      },
    });

    await this.invalidateProductCaches();

    const formattedProducts = this.formatProducts([updatedProduct]);
    return formattedProducts[0];
  }
}
