import { createClient } from "redis"
import { config } from "../config"

let redisErrorLogged = false

export const redis =
  !config.redisDisabled && config.redisUrl
    ? createClient({
        url: config.redisUrl,
        socket: {
          connectTimeout: 500,
          reconnectStrategy: () => new Error("redis disabled reconnect")
        }
      })
    : undefined

redis?.on("error", (err) => {
  if (!redisErrorLogged) {
    redisErrorLogged = true
    // Suppressed per request: no console output
  }
})

export async function connectRedis() {
  if (!redis) return
  if (!redis.isOpen) {
    try {
      await redis.connect()
    } catch (err) {
      if (!redisErrorLogged) {
        redisErrorLogged = true
        // Suppressed per request: no console output
      }
    }
  }
}
