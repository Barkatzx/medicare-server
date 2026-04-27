import { Response, NextFunction } from "express";
import redisClient from "../config/redis";
import { AuthRequest } from "../types";

// Map to track in-flight requests for cache stampede protection
const inFlightRequests = new Map<string, Promise<any>>();

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
      // 1. Check Redis
      const cachedData = await redisClient.get(key);

      if (cachedData) {
        console.log(`[Cache] HIT: ${key}`);
        return res.status(200).json(JSON.parse(cachedData));
      }

      console.log(`[Cache] MISS: ${key}`);

      // 2. Stampede Protection: Check if another request is already fetching this
      if (inFlightRequests.has(key)) {
        console.log(`[Cache] STAMPEDE PROTECTION: Waiting for in-flight request: ${key}`);
        const data = await inFlightRequests.get(key);
        return res.status(200).json(data);
      }

      // 3. Intercept res.json to cache the response
      const originalJson = res.json.bind(res);
      
      // We wrap the controller execution in a promise to track it
      let resolveInFlight: (value: any) => void;
      const inFlightPromise = new Promise((resolve) => {
        resolveInFlight = resolve;
      });
      inFlightRequests.set(key, inFlightPromise);

      res.json = (body: any) => {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          redisClient.setEx(key, ttlSeconds, JSON.stringify(body));
        }
        
        // Resolve the in-flight promise and cleanup
        resolveInFlight(body);
        inFlightRequests.delete(key);
        
        return originalJson(body);
      };

      next();
    } catch (error) {
      console.error("Redis Cache Error:", error);
      inFlightRequests.delete(key);
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
          
          console.log(`[Cache] INVALIDATING: ${finalPattern}`);
          
          const keys = await redisClient.keys(finalPattern);
          if (keys.length > 0) {
            await redisClient.del(keys);
            console.log(`[Cache] DELETED ${keys.length} keys`);
          }
        } catch (error) {
          console.error("Redis Cache Invalidation Error:", error);
        }
      }
    });
  };
};
