import { Redis } from "@upstash/redis";
import dotenv from "dotenv";

dotenv.config();

const redisClient = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const connectRedis = async () => {
  try {
    // Upstash Redis uses HTTP, so we just ping to verify the connection.
    await redisClient.ping();
    console.log("Upstash Redis Client Connected");
  } catch (error) {
    console.error("Failed to connect to Upstash Redis:", error);
  }
};

export default redisClient;
