// src/services/discount.service.ts
export class DiscountService {
  /**
   * Calculate final price after discount
   */
  static calculateFinalPrice(
    price: number,
    discountedPrice?: number | null,
    discountPercent?: number | null,
  ): number {
    // If discountedPrice is provided, use it
    if (discountedPrice && discountedPrice > 0) {
      return discountedPrice;
    }

    // If discountPercent is provided, calculate from original price
    if (discountPercent && discountPercent > 0) {
      return price - (price * discountPercent) / 100;
    }

    // No discount, return original price
    return price;
  }

  /**
   * Calculate savings amount
   */
  static calculateSavings(price: number, finalPrice: number): number {
    return price - finalPrice;
  }

  /**
   * Calculate discount percentage
   */
  static calculateDiscountPercent(price: number, finalPrice: number): number {
    if (price === 0) return 0;
    return Math.round(((price - finalPrice) / price) * 100);
  }

  /**
   * Validate discount values
   */
  static validateDiscount(
    price: number,
    discountedPrice?: number,
    discountPercent?: number,
  ): { valid: boolean; error?: string } {
    if (discountedPrice && discountedPrice >= price) {
      return {
        valid: false,
        error: "Discounted price must be less than original price",
      };
    }

    if (discountedPrice && discountedPrice <= 0) {
      return { valid: false, error: "Discounted price must be greater than 0" };
    }

    if (discountPercent && (discountPercent <= 0 || discountPercent > 100)) {
      return {
        valid: false,
        error: "Discount percentage must be between 1 and 100",
      };
    }

    return { valid: true };
  }

  /**
   * Get discount badge text
   */
  static getDiscountBadge(price: number, finalPrice: number): string | null {
    if (finalPrice >= price) return null;
    const percent = this.calculateDiscountPercent(price, finalPrice);
    return `${percent}% OFF`;
  }
}
