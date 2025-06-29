/**
 * sfda_nexus 企業AI聊天系統後端服務器
 * 主要入口文件 - 配置Express應用程式、中間件、路由和WebSocket
 */

import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";

// 導入自定義模組
import { corsConfig } from "./src/config/cors.config.js";
import logger from "./src/utils/logger.util.js";
import { errorHandler } from "./src/middleware/errorHandler.middleware.js";
import { loggerMiddleware } from "./src/middleware/logger.middleware.js";
import routes from "./src/routes/index.route.js";
import { setupSwagger } from "./src/config/swagger.config.js";
import { initializeWebSocket } from "./src/websocket/index.js";
import {
  initializeDatabase,
  initializeKessDatabase,
  closeDatabase,
} from "./src/config/database.config.js";
import mcpClient from "./src/services/mcp.service.js";

// 獲取目錄路徑 (ES模組環境)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 載入環境變數
dotenv.config();

// 建立Express應用程式
const app = express();
const PORT = process.env.PORT || 3000;
const WS_PORT = process.env.WS_PORT || 3001;

// 基本中間件配置
app.use(helmet()); // 安全標頭
app.use(cors(corsConfig)); // CORS配置
app.use(express.json({ limit: "10mb" })); // JSON解析
app.use(express.urlencoded({ extended: true, limit: "10mb" })); // URL編碼解析
app.use(loggerMiddleware); // 請求日誌記錄

// 靜態文件服務
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// API路由
app.use("/api", routes);

// Swagger API 文檔
setupSwagger(app);

// 健康檢查端點
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
    environment: process.env.NODE_ENV || "development",
  });
});

// 根路由
app.get("/", (req, res) => {
  res.json({
    message: "sfda_nexus 企業AI聊天系統 API",
    version: "1.0.0",
    documentation: "/api-docs",
    status: "running",
  });
});

// 404 處理
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `找不到路由: ${req.originalUrl}`,
    code: "ROUTE_NOT_FOUND",
  });
});

// 全域錯誤處理中間件
app.use(errorHandler);

// 建立HTTP服務器
const server = createServer(app);

// 啟動應用程式的主要函數
async function startServer() {
  try {
    // 初始化資料庫連接池
    logger.info("🔗 正在初始化資料庫連接...");
    await initializeDatabase();
    logger.info("✅ 資料庫連接池初始化成功");

    // 初始化 KESS 資料庫連接池
    logger.info("🔗 正在初始化 KESS 資料庫連接...");
    await initializeKessDatabase();
    logger.info("✅ KESS 資料庫連接池初始化成功");

    // 初始化 MCP 客戶端
    logger.info("🔗 正在初始化 MCP 客戶端...");
    await mcpClient.initialize();
    logger.info("✅ MCP 客戶端初始化成功");

    // 初始化WebSocket服務
    initializeWebSocket(server, WS_PORT);

    // 啟動HTTP服務器
    server.listen(PORT, () => {
      logger.info(`🚀 sfda_nexus 後端服務器啟動成功`);
      logger.info(`📍 HTTP服務器運行在: http://localhost:${PORT}`);
      logger.info(`📡 WebSocket服務器運行在: ws://localhost:${WS_PORT}`);
      logger.info(`📚 API文檔地址: http://localhost:${PORT}/api-docs`);
      logger.info(`🔍 健康檢查: http://localhost:${PORT}/health`);
      logger.info(`🌍 環境模式: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (error) {
    logger.error("❌ 服務器啟動失敗:", error.message);
    logger.error("錯誤詳情:", error);

    if (error.code === "ECONNREFUSED") {
      logger.error("💡 提示: 無法連接 MySQL 服務器，請確認:");
      logger.error("   1. MySQL 服務是否已啟動");
      logger.error("   2. 資料庫配置是否正確");
      logger.error("   3. 是否已執行資料庫初始化腳本");
    }

    process.exit(1);
  }
}

// 優雅關閉處理
const handleGracefulShutdown = async (signal) => {
  logger.info(`收到 ${signal} 信號，正在優雅關閉服務器...`);

  try {
    // 關閉 MCP 客戶端連接
    await mcpClient.disconnectAll();
    logger.info("✅ MCP 客戶端已關閉");
  } catch (error) {
    logger.error("關閉 MCP 客戶端時發生錯誤:", error);
  }

  try {
    // 關閉資料庫連接池
    await closeDatabase();
    logger.info("✅ 資料庫連接池已關閉");
  } catch (error) {
    logger.error("關閉資料庫連接池時發生錯誤:", error);
  }

  server.close((err) => {
    if (err) {
      logger.error("服務器關閉時發生錯誤:", err);
      process.exit(1);
    }

    logger.info("服務器已成功關閉");
    process.exit(0);
  });
};

// 監聽關閉信號
process.on("SIGTERM", () => handleGracefulShutdown("SIGTERM"));
process.on("SIGINT", () => handleGracefulShutdown("SIGINT"));

// 未捕獲異常處理
process.on("uncaughtException", (err) => {
  logger.error("未捕獲的異常:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("未處理的Promise拒絕:", reason);
  logger.error("Promise:", promise);
  process.exit(1);
});

// 啟動服務器
startServer();

export default app;
