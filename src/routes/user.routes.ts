import express from "express";
import {
  addToCart,
  addToWishlist,
  deleteUser,
  getAllUsers,
  getUserById,
  getUserProfile,
  loginUser,
  registerUser,
  removeFromCart,
  removeFromWishlist,
  updatePassword,
  updateUser,
  updateUserProfile,
} from "../controllers/user.controller";

import { adminOnly, protect } from "../middlewares/auth.middleware";

const router = express.Router();

// Public Routes
router.post("/register", registerUser);
router.post("/login", loginUser);

// Protected Routes
router.get("/profile", protect, getUserProfile);
router.put("/profile", protect, updateUserProfile);
router.put("/update-password", protect, updatePassword);

// Cart
router.post("/cart", protect, addToCart);
router.delete("/cart/:productId", protect, removeFromCart);

// Wishlist
router.post("/wishlist", protect, addToWishlist);
router.delete("/wishlist/:productId", protect, removeFromWishlist);

// Admin
router.get("/", protect, adminOnly, getAllUsers);
router.get("/:id", protect, adminOnly, getUserById);
router.put("/:id", protect, adminOnly, updateUser);
router.delete("/:id", protect, adminOnly, deleteUser);

export default router;
