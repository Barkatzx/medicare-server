import { Document, Schema, Types, model } from "mongoose";

export interface IAddress {
  label?: string;
  road: string;
  area: string;
  district: string;
  division: string;
  postalCode: string;
  isDefault?: boolean;
}

export interface ICartItem {
  productId: Types.ObjectId | string;
  name: string;
  quantity: number;
  price: number;
}

export interface IWishlistItem {
  productId: Types.ObjectId | string;
  addedAt: Date;
}

export interface IOrderProduct {
  productId: Types.ObjectId | string;
  name: string;
  quantity: number;
  price: number;
}

export interface IOrderInfo {
  orderId: string;
  products: IOrderProduct[];
  totalAmount: number;
  orderDate: Date;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  paymentMethod: "cash_on_delivery" | "online_payment" | "card";
}

export interface IUser extends Document {
  name: string;
  avatar?: string;
  email: string;
  password: string;
  role: "customer" | "admin";

  billInfo: {
    pharmacyName: string;
    pharmacyAddress: Omit<IAddress, "label" | "isDefault">;
    phone: string;
  };

  wishlist: IWishlistItem[];
  cart: ICartItem[];
  orderInfo: IOrderInfo[];

  activity: {
    lastLogin?: Date;
    lastOrderDate?: Date;
  };

  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    avatar: { type: String },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["customer", "admin"], default: "customer" },
    billInfo: {
      pharmacyName: { type: String },
      pharmacyAddress: {
        road: { type: String, required: true },
        area: { type: String, required: true },
        district: { type: String, required: true },
        division: { type: String, required: true },
        postalCode: { type: String, required: true },
      },
      phone: { type: String, required: true },
    },
    wishlist: [
      {
        productId: { type: Types.ObjectId, ref: "Product", required: true },
        addedAt: { type: Date, default: Date.now },
      },
    ],
    cart: [
      {
        productId: { type: Types.ObjectId, ref: "Product", required: true },
        name: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true, min: 0 },
      },
    ],
    orderInfo: [
      {
        orderId: { type: String, required: true },
        products: [
          {
            productId: { type: Types.ObjectId, ref: "Product", required: true },
            name: { type: String, required: true },
            quantity: { type: Number, required: true, min: 1 },
            price: { type: Number, required: true, min: 0 },
          },
        ],
        totalAmount: { type: Number, required: true, min: 0 },
        orderDate: { type: Date, default: Date.now },
        status: {
          type: String,
          enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
          default: "pending",
        },
        paymentMethod: {
          type: String,
          enum: ["cash_on_delivery", "online_payment", "card"],
          required: true,
        },
      },
    ],
    activity: {
      lastLogin: { type: Date },
      lastOrderDate: { type: Date },
    },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true, // This will automatically manage createdAt and updatedAt
  }
);

// Create and export the model
export const User = model<IUser>("User", userSchema);
