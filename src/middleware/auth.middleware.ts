import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { UserPayload } from "../types";
import redisClient from "../config/redis";

export interface AuthRequest extends Request {
  user?: UserPayload;
}

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "Access token required" });
    }

    // Check if token is blacklisted
    const isBlacklisted = await redisClient.get(`blacklist:${token}`);
    if (isBlacklisted) {
      return res.status(401).json({ error: "Token has been revoked. Please log in again." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as UserPayload;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
};

export const authorizeAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};

export const authorizeApproved = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  if (!req.user?.isApproved && req.user?.role !== "admin") {
    return res.status(403).json({ error: "Account pending approval" });
  }
  next();
};
