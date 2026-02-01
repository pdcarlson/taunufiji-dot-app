/**
 * Redis Client
 *
 * Provides a singleton Redis connection for caching.
 * Uses 'ioredis' for robust support (Sentinel/Cluster ready).
 */

import Redis from "ioredis";
import { env } from "@/lib/infrastructure/config/env";
import { logger } from "@/lib/utils/logger";

let redis: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redis) {
    // Determine connection string or options
    // For now, we assume a simple local connection from env or default
    // In production, this might be a full URL
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

    logger.log(`Initializing Redis Client: ${redisUrl}`);

    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    redis.on("error", (err) => {
      logger.error("Redis Client Error", err);
    });

    redis.on("connect", () => {
      logger.log("Redis Client Connected");
    });
  }

  return redis;
}
