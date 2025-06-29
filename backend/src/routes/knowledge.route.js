/**
 * 知識庫路由
 * 定義知識庫相關的API端點
 */

import express from "express";
import {
  KnowledgeCategoryController,
  KnowledgeSummaryController,
  KnowledgeDocumentController,
  KnowledgeStatsController,
  KnowledgeController,
} from "../controllers/knowledge.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";
// import { rateLimiter } from '../middleware/rateLimiter.middleware.js';

const router = express.Router();

/**
 * 知識庫基礎路由（無需認證）
 */
// 獲取API信息
router.get("/", KnowledgeController.getApiInfo);

// 健康檢查
router.get("/health", KnowledgeController.healthCheck);

// 應用認證中間件到需要認證的路由
router.use(authenticateToken);

// 可選：應用速率限制
// router.use(rateLimiter);

/**
 * 分類相關路由
 */
// 獲取所有分類樹
router.get("/categories", KnowledgeCategoryController.getCategories);

// 獲取特定分類詳情
router.get("/categories/:id", KnowledgeCategoryController.getCategoryDetail);

/**
 * 摘要相關路由
 */
// 獲取特定分類下的摘要列表
router.get(
  "/summaries/:categoryCode",
  KnowledgeSummaryController.getSummariesByCategory
);

// 獲取摘要詳情
router.get("/summary/:id", KnowledgeSummaryController.getSummaryDetail);

// 更新摘要（需要管理員權限）
router.put("/summary/:id", KnowledgeSummaryController.updateSummary);

// 刪除摘要（需要管理員權限）
router.delete("/summary/:id", KnowledgeSummaryController.deleteSummary);

/**
 * 搜索相關路由
 */
// 搜索摘要
router.post("/search", KnowledgeSummaryController.searchSummaries);

/**
 * 文件相關路由
 */
// 獲取文件詳情
router.get("/document/:id", KnowledgeDocumentController.getDocumentDetail);

// 獲取文件下載信息
router.get(
  "/document/:id/download-info",
  KnowledgeDocumentController.getDownloadInfo
);

// 下載文件
router.get("/document/:id/download", KnowledgeDocumentController.downloadFile);

/**
 * 統計相關路由
 */
// 獲取知識庫統計信息
router.get("/stats", KnowledgeStatsController.getStats);

// 獲取活動統計
router.get("/stats/activity", KnowledgeStatsController.getActivityStats);

/**
 * 錯誤處理中間件
 */
router.use((error, req, res, next) => {
  console.error("知識庫路由錯誤:", error);

  res.status(500).json({
    success: false,
    data: null,
    message: "服務器內部錯誤",
    error: process.env.NODE_ENV === "development" ? error.message : undefined,
    timestamp: new Date().toISOString(),
  });
});

/**
 * 404 處理
 */
router.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    data: null,
    message: `API 端點不存在: ${req.method} ${req.originalUrl}`,
    timestamp: new Date().toISOString(),
  });
});

export default router;
