/**
 * 速率限制中間件
 * 用於限制API請求頻率，防止濫用
 */

import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import Redis from "ioredis";
import logger from "../utils/logger.util.js";

// Redis 客戶端（如果有配置）
let redisClient = null;

// 嘗試連接 Redis（可選）
try {
  if (process.env.REDIS_URL) {
    redisClient = new Redis(process.env.REDIS_URL);
    logger.info("Redis 連接成功，使用 Redis 作為速率限制存儲");
  }
} catch (error) {
  logger.warn("Redis 連接失敗，使用內存存儲進行速率限制", {
    error: error.message,
  });
}

/**
 * 創建速率限制中間件
 * @param {string} name - 限制器名稱
 * @param {number} max - 最大請求數
 * @param {number} windowMs - 時間窗口（毫秒）
 * @param {object} options - 額外選項
 * @returns {Function} Express 中間件
 */
export const rateLimitMiddleware = (
  name,
  max = 100,
  windowMs = 15 * 60 * 1000,
  options = {}
) => {
  const config = {
    windowMs,
    max,
    message: {
      success: false,
      message: "請求過於頻繁，請稍後再試",
      error: "RATE_LIMIT_EXCEEDED",
      retryAfter: Math.ceil(windowMs / 1000),
    },
    standardHeaders: true, // 返回 `RateLimit-*` 標頭
    legacyHeaders: false, // 禁用 `X-RateLimit-*` 標頭
    keyGenerator: (req) => {
      // 使用用戶ID（如果已認證）或IP地址作為鍵
      return req.user?.id ? `user:${req.user.id}` : `ip:${req.ip}`;
    },
    handler: (req, res) => {
      logger.warn("速率限制觸發", {
        name,
        key: req.rateLimit?.key || "unknown",
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        userId: req.user?.id,
      });

      res.status(429).json(config.message);
    },
    ...options,
  };

  // 如果有 Redis，使用 Redis 存儲
  if (redisClient) {
    config.store = new RedisStore({
      sendCommand: (...args) => redisClient.call(...args),
      prefix: `rate_limit:${name}:`,
    });
  }

  return rateLimit(config);
};

/**
 * 預定義的速率限制器
 */
export const rateLimiters = {
  // 認證相關
  auth: rateLimitMiddleware("auth", 5, 15 * 60 * 1000), // 15分鐘5次
  login: rateLimitMiddleware("login", 5, 15 * 60 * 1000), // 15分鐘5次
  register: rateLimitMiddleware("register", 3, 60 * 60 * 1000), // 1小時3次

  // API 通用
  api: rateLimitMiddleware("api", 1000, 15 * 60 * 1000), // 15分鐘1000次

  // 聊天相關
  chat: rateLimitMiddleware("chat", 100, 15 * 60 * 1000), // 15分鐘100次
  message: rateLimitMiddleware("message", 50, 15 * 60 * 1000), // 15分鐘50次

  // 管理員相關
  admin: rateLimitMiddleware("admin", 200, 15 * 60 * 1000), // 15分鐘200次

  // 上傳相關
  upload: rateLimitMiddleware("upload", 10, 15 * 60 * 1000), // 15分鐘10次
};

/**
 * 全局速率限制中間件
 */
export const globalRateLimit = rateLimitMiddleware(
  "global",
  1000,
  15 * 60 * 1000
);

export default rateLimitMiddleware;
