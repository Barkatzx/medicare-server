import { Response, NextFunction } from "express";
import redisClient from "../config/redis";
import { AuthRequest } from "../types";

/**
 * Middleware to cache route responses
 * @param ttlSeconds Time to live in seconds
 */
export const cacheRoute = (ttlSeconds: number) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== "GET") {
      return next();
    }

    const userId = req.user?.id || "public";
    const key = `cache:${userId}:${req.originalUrl}`;

    try {
      const cachedData = await redisClient.get(key);

      if (cachedData) {
        return res.status(200).json(JSON.parse(cachedData));
      }

      const originalJson = res.json.bind(res);
      res.json = (body: any) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          redisClient.setEx(key, ttlSeconds, JSON.stringify(body));
        }
        return originalJson(body);
      };

      next();
    } catch (error) {
      console.error("Redis Cache Error:", error);
      next();
    }
  };
};

/**
 * Middleware to clear cache after successful mutation
 * @param pattern The pattern to clear, e.g., "cache:public:/api/products*" or "cache:{userId}:/api/users/cart*"
 */
export const invalidateCache = (pattern: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    next(); // Proceed to the controller

    // When the request finishes, if successful, clear the cache
    res.on("finish", async () => {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        try {
          const userId = req.user?.id || "public";
          const finalPattern = pattern.replace("{userId}", userId);
          
          // Use keys to find and delete. In a huge production DB, SCAN is better.
          const keys = await redisClient.keys(finalPattern);
          if (keys.length > 0) {
            await redisClient.del(keys);
          }
        } catch (error) {
          console.error("Redis Cache Invalidation Error:", error);
        }
      }
    });
  };
};
