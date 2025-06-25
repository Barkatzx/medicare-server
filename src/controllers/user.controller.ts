import bcrypt from "bcryptjs";
import { NextFunction, Request, Response } from "express";
import jwt, { SignOptions } from "jsonwebtoken";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { User } from "../models/user.model";

interface JwtPayload {
  id: string;
  role: string;
}

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in environment variables");
}

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRE = process.env.JWT_EXPIRE || "30d";

export const registerUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  // Changed return type to Promise<void>
  try {
    const { name, email, password, role, billInfo } = req.body;

    let user = await User.findOne({ email });
    if (user) {
      res.status(400).json({ message: "User already exists" }); // Removed 'return'
      return; // Explicit return to exit function
    }

    user = new User({
      name,
      email,
      password,
      role: role || "customer",
      billInfo,
    });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    await user.save();

    const token = jwt.sign(
      { id: user.id, role: user.role } as JwtPayload,
      JWT_SECRET,
      { expiresIn: JWT_EXPIRE } as SignOptions
    );

    // Removed 'return' before response
    res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" }); // Removed 'return'
  }
};

export const loginUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      res.status(400).json({ message: "Invalid credentials" });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(400).json({ message: "Invalid credentials" });
      return;
    }

    user.activity.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      { id: user.id, role: user.role } as JwtPayload,
      JWT_SECRET,
      { expiresIn: JWT_EXPIRE } as SignOptions
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getUserProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction // Add next for error handling
): Promise<void> => {
  try {
    const user = await User.findById(req.user?.id)
      .select("-password -__v")
      .populate("wishlist.productId", "name price images")
      .populate("cart.productId", "name price images");

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.json(user);
  } catch (error) {
    console.error(error);
    // Pass error to Express error handler middleware
    next(error);
  }
};

export const updateUserProfile = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { name, avatar, billInfo } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user?.id,
      { name, avatar, billInfo },
      { new: true, runValidators: true }
    ).select("-password -__v");

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return; // Early exit, no return of res object
    }

    res.json(user); // Send response without returning
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const updatePassword = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user?.id);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return; // Early exit, no return of res object
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      res.status(400).json({ message: "Current password is incorrect" });
      return; // Early exit
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const addToCart = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { productId, name, quantity, price } = req.body;

    const user = await User.findById(req.user?.id);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return; // Early exit, no return of res object
    }

    const existingItemIndex = user.cart.findIndex(
      (item) => item.productId.toString() === productId
    );

    if (existingItemIndex >= 0) {
      user.cart[existingItemIndex].quantity += quantity;
    } else {
      user.cart.push({ productId, name, quantity, price });
    }

    await user.save();

    res.json(user.cart);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const removeFromCart = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { productId } = req.params;

    const user = await User.findById(req.user?.id);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return; // Early exit, no return of res object
    }

    user.cart = user.cart.filter(
      (item) => item.productId.toString() !== productId
    );

    await user.save();

    res.json(user.cart);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const addToWishlist = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { productId } = req.body;

    const user = await User.findById(req.user?.id);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return; // Early exit, no return of res object
    }

    const existingItem = user.wishlist.find(
      (item) => item.productId.toString() === productId
    );

    if (!existingItem) {
      user.wishlist.push({ productId, addedAt: new Date() });
      await user.save();
    }

    res.json(user.wishlist);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const removeFromWishlist = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { productId } = req.params;

    const user = await User.findById(req.user?.id);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return; // Early exit, no return of res object
    }

    user.wishlist = user.wishlist.filter(
      (item) => item.productId.toString() !== productId
    );

    await user.save();

    res.json(user.wishlist);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getAllUsers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const users = await User.find().select("-password -__v");
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getUserById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = await User.findById(req.params.id).select("-password -__v");
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return; // Early exit, no return of res object
    }
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { name, email, role, isActive } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, role, isActive },
      { new: true, runValidators: true }
    ).select("-password -__v");

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return; // Early exit, no return of res object
    }

    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return; // Early exit, no return of res object
    }
    res.json({ message: "User removed" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
