import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET must be defined in environment variables");
}

export const protect = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as {
        id: string;
        role: string;
      };

      req.user = {
        id: decoded.id,
        role: decoded.role,
      };

      next();
      return; // Explicit return after calling next()
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: "Invalid or expired token" });
      return; // Early return, no returning res object
    }
  } else {
    res.status(401).json({ message: "No token provided" });
    return; // Early return, no returning res object
  }
};

export const adminOnly = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (req.user?.role !== "admin") {
    res.status(403).json({ message: "Access denied: Admins only" });
    return;
  }
  next();
};
