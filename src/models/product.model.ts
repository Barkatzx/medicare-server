import { Document, Schema, Types, model } from "mongoose";

// Interface for Product Variants
export interface IProductVariant {
  name: string;
  sku: string;
  price: number;
  originalPrice?: number;
  stock: number;
  images: string[];
  isAvailable: boolean;
}

// Interface for Product Discount
export interface IProductDiscount {
  type: "percentage" | "fixed";
  value: number;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
}

// Main Product Interface
export interface IProduct extends Document {
  name: string;
  slug: string;
  description: string;
  category: Types.ObjectId;
  brand: Types.ObjectId;
  variants: IProductVariant[];
  tags: string[];
  discount?: IProductDiscount;
  isFeatured: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Product Variant Schema
const productVariantSchema = new Schema<IProductVariant>({
  name: { type: String, required: true },
  sku: { type: String, required: true, unique: true },
  price: { type: Number, required: true, min: 0 },
  originalPrice: { type: Number, min: 0 },
  stock: { type: Number, required: true, min: 0 },
  images: [{ type: String, required: true }],
  isAvailable: { type: Boolean, default: true },
});

// Product Discount Schema
const productDiscountSchema = new Schema<IProductDiscount>({
  type: { type: String, enum: ["percentage", "fixed"], required: true },
  value: { type: Number, required: true, min: 0 },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  isActive: { type: Boolean, default: true },
});

// Main Product Schema
const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, required: true },
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    brand: { type: Schema.Types.ObjectId, ref: "Brand" },
    tags: [{ type: String }],
    discount: productDiscountSchema,
    isFeatured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better performance
productSchema.index({ name: "text", description: "text", tags: "text" });
productSchema.index({ category: 1, brand: 1, "variants.price": 1 });
productSchema.index({ slug: 1 }, { unique: true });
// Virtual for checking if product is on discount
productSchema.virtual("isOnDiscount").get(function () {
  if (!this.discount) return false;
  const now = new Date();
  return (
    this.discount.isActive &&
    now >= this.discount.startDate &&
    now <= this.discount.endDate
  );
});

// Create and export the Product model
export const Product = model<IProduct>("Product", productSchema);
