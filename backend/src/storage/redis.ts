import { createClient } from "redis"
import { config } from "../config"

export const redis = createClient({
  url: config.redisUrl,
  socket: {
    connectTimeout: 3000
  }
})

redis.on("error", (err) => {
  console.error("Redis error", err)
})

export async function connectRedis() {
  if (!config.redisUrl) return
  if (!redis.isOpen) {
    try {
      await redis.connect()
    } catch (err) {
      console.error("Redis connect failed", err)
    }
  }
}
