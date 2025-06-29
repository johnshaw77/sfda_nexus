/**
 * 知識庫控制器
 * 處理知識庫相關的HTTP請求
 */

import {
  KnowledgeCategoryService,
  KnowledgeSummaryService,
  KnowledgeDocumentService,
  KnowledgeStatsService,
} from "../services/knowledge.service.js";
import logger from "../utils/logger.util.js";

/**
 * 統一響應格式
 * @param {Object} res - Express響應對象
 * @param {boolean} success - 是否成功
 * @param {*} data - 響應數據
 * @param {string} message - 響應消息
 * @param {number} statusCode - HTTP狀態碼
 */
const sendResponse = (
  res,
  success,
  data = null,
  message = "",
  statusCode = 200
) => {
  res.status(statusCode).json({
    success,
    data,
    message,
    timestamp: new Date().toISOString(),
  });
};

/**
 * 知識庫分類控制器
 */
export class KnowledgeCategoryController {
  /**
   * 獲取分類樹
   * GET /api/knowledge/categories
   */
  static async getCategories(req, res) {
    try {
      const categories = await KnowledgeCategoryService.getCategoryTree();
      sendResponse(res, true, categories, "獲取分類樹成功");
    } catch (error) {
      logger.error("獲取分類樹失敗:", error);
      sendResponse(res, false, null, error.message, 500);
    }
  }

  /**
   * 獲取分類詳情
   * GET /api/knowledge/categories/:id
   */
  static async getCategoryDetail(req, res) {
    try {
      const { id } = req.params;
      const categoryId = parseInt(id);

      if (isNaN(categoryId)) {
        return sendResponse(res, false, null, "無效的分類ID", 400);
      }

      const category =
        await KnowledgeCategoryService.getCategoryDetail(categoryId);
      sendResponse(res, true, category, "獲取分類詳情成功");
    } catch (error) {
      logger.error("獲取分類詳情失敗:", error);
      const statusCode = error.message === "分類不存在" ? 404 : 500;
      sendResponse(res, false, null, error.message, statusCode);
    }
  }
}

/**
 * 知識庫摘要控制器
 */
export class KnowledgeSummaryController {
  /**
   * 獲取分類下的摘要列表
   * GET /api/knowledge/summaries/:categoryCode
   */
  static async getSummariesByCategory(req, res) {
    try {
      const { categoryCode } = req.params;

      if (!categoryCode || typeof categoryCode !== "string") {
        return sendResponse(res, false, null, "無效的分類代碼", 400);
      }

      // 解析查詢參數
      const options = {
        page: parseInt(req.query.page) || 1,
        limit: Math.min(parseInt(req.query.limit) || 20, 100), // 限制最大每頁數量
        search: req.query.search || "",
      };

      const result = await KnowledgeSummaryService.getSummariesByCategory(
        categoryCode,
        options
      );
      sendResponse(res, true, result, "獲取摘要列表成功");
    } catch (error) {
      logger.error("獲取摘要列表失敗:", error);
      const statusCode = error.message === "分類不存在" ? 404 : 500;
      sendResponse(res, false, null, error.message, statusCode);
    }
  }

  /**
   * 獲取摘要詳情
   * GET /api/knowledge/summary/:id
   */
  static async getSummaryDetail(req, res) {
    try {
      const { id } = req.params;
      const summaryId = parseInt(id);

      if (isNaN(summaryId)) {
        return sendResponse(res, false, null, "無效的摘要ID", 400);
      }

      const summary = await KnowledgeSummaryService.getSummaryDetail(summaryId);
      sendResponse(res, true, summary, "獲取摘要詳情成功");
    } catch (error) {
      logger.error("獲取摘要詳情失敗:", error);
      const statusCode = error.message === "摘要不存在" ? 404 : 500;
      sendResponse(res, false, null, error.message, statusCode);
    }
  }

  /**
   * 搜索摘要
   * POST /api/knowledge/search
   */
  static async searchSummaries(req, res) {
    try {
      const { query, options = {} } = req.body;

      if (!query || typeof query !== "string") {
        return sendResponse(res, false, null, "搜索關鍵字不能為空", 400);
      }

      // 處理搜索選項
      const searchOptions = {
        page: parseInt(options.page) || 1,
        pageSize: Math.min(parseInt(options.pageSize) || 20, 100),
        categoryIds: Array.isArray(options.categoryIds)
          ? options.categoryIds
          : [],
        summaryTypes: Array.isArray(options.summaryTypes)
          ? options.summaryTypes
          : [],
      };

      const result = await KnowledgeSummaryService.searchSummaries(
        query,
        searchOptions
      );
      sendResponse(res, true, result, "搜索摘要成功");
    } catch (error) {
      logger.error("搜索摘要失敗:", error);
      sendResponse(res, false, null, error.message, 500);
    }
  }

  /**
   * 更新摘要
   * PUT /api/knowledge/summary/:id
   */
  static async updateSummary(req, res) {
    try {
      const { id } = req.params;
      const summaryId = parseInt(id);

      if (isNaN(summaryId)) {
        return sendResponse(res, false, null, "無效的摘要ID", 400);
      }

      const updateData = req.body;

      // 基本驗證
      if (!updateData || Object.keys(updateData).length === 0) {
        return sendResponse(res, false, null, "更新數據不能為空", 400);
      }

      const result = await KnowledgeSummaryService.updateSummary(
        summaryId,
        updateData
      );
      sendResponse(res, true, result, "更新摘要成功");
    } catch (error) {
      logger.error("更新摘要失敗:", error);
      const statusCode = error.message === "摘要不存在" ? 404 : 500;
      sendResponse(res, false, null, error.message, statusCode);
    }
  }

  /**
   * 刪除摘要
   * DELETE /api/knowledge/summary/:id
   */
  static async deleteSummary(req, res) {
    try {
      const { id } = req.params;
      const summaryId = parseInt(id);

      if (isNaN(summaryId)) {
        return sendResponse(res, false, null, "無效的摘要ID", 400);
      }

      const success = await KnowledgeSummaryService.deleteSummary(summaryId);

      if (success) {
        sendResponse(res, true, null, "刪除摘要成功");
      } else {
        sendResponse(res, false, null, "刪除摘要失敗", 500);
      }
    } catch (error) {
      logger.error("刪除摘要失敗:", error);
      const statusCode = error.message === "摘要不存在" ? 404 : 500;
      sendResponse(res, false, null, error.message, statusCode);
    }
  }
}

/**
 * 知識庫文件控制器
 */
export class KnowledgeDocumentController {
  /**
   * 獲取文件詳情
   * GET /api/knowledge/document/:id
   */
  static async getDocumentDetail(req, res) {
    try {
      const { id } = req.params;
      const documentId = parseInt(id);

      if (isNaN(documentId)) {
        return sendResponse(res, false, null, "無效的文件ID", 400);
      }

      const document =
        await KnowledgeDocumentService.getDocumentDetail(documentId);
      sendResponse(res, true, document, "獲取文件詳情成功");
    } catch (error) {
      logger.error("獲取文件詳情失敗:", error);
      const statusCode = error.message === "文件不存在" ? 404 : 500;
      sendResponse(res, false, null, error.message, statusCode);
    }
  }

  /**
   * 獲取文件下載信息
   * GET /api/knowledge/document/:id/download-info
   */
  static async getDownloadInfo(req, res) {
    try {
      const { id } = req.params;
      const documentId = parseInt(id);

      if (isNaN(documentId)) {
        return sendResponse(res, false, null, "無效的文件ID", 400);
      }

      const downloadInfo =
        await KnowledgeDocumentService.getDownloadInfo(documentId);
      sendResponse(res, true, downloadInfo, "獲取下載信息成功");
    } catch (error) {
      logger.error("獲取下載信息失敗:", error);
      const statusCode = error.message === "文件不存在" ? 404 : 500;
      sendResponse(res, false, null, error.message, statusCode);
    }
  }

  /**
   * 下載文件
   * GET /api/knowledge/document/:id/download
   * 注意：這個端點需要實際的文件系統支持
   */
  static async downloadFile(req, res) {
    try {
      const { id } = req.params;
      const documentId = parseInt(id);

      if (isNaN(documentId)) {
        return sendResponse(res, false, null, "無效的文件ID", 400);
      }

      const downloadInfo =
        await KnowledgeDocumentService.getDownloadInfo(documentId);

      if (!downloadInfo.downloadable) {
        return sendResponse(res, false, null, "文件不可下載", 400);
      }

      // 這裡需要實際的文件下載邏輯
      // 目前只返回下載信息，實際實現需要根據文件存儲方式調整
      sendResponse(
        res,
        true,
        {
          message: "文件下載功能需要配置文件存儲系統",
          downloadInfo,
        },
        "下載信息獲取成功"
      );
    } catch (error) {
      logger.error("文件下載失敗:", error);
      const statusCode = error.message === "文件不存在" ? 404 : 500;
      sendResponse(res, false, null, error.message, statusCode);
    }
  }
}

/**
 * 知識庫統計控制器
 */
export class KnowledgeStatsController {
  /**
   * 獲取知識庫統計信息
   * GET /api/knowledge/stats
   */
  static async getStats(req, res) {
    try {
      const stats = await KnowledgeStatsService.getOverviewStats();
      sendResponse(res, true, stats, "獲取統計信息成功");
    } catch (error) {
      logger.error("獲取統計信息失敗:", error);
      sendResponse(res, false, null, error.message, 500);
    }
  }

  /**
   * 獲取活動統計
   * GET /api/knowledge/stats/activity
   */
  static async getActivityStats(req, res) {
    try {
      const days = parseInt(req.query.days) || 30;
      const stats = await KnowledgeStatsService.getActivityStats(days);
      sendResponse(res, true, stats, "獲取活動統計成功");
    } catch (error) {
      logger.error("獲取活動統計失敗:", error);
      sendResponse(res, false, null, error.message, 500);
    }
  }
}

/**
 * 通用知識庫控制器
 */
export class KnowledgeController {
  /**
   * 健康檢查
   * GET /api/knowledge/health
   */
  static async healthCheck(req, res) {
    try {
      // 簡單檢查資料庫連接
      const categories = await KnowledgeCategoryService.getCategoryTree();

      sendResponse(
        res,
        true,
        {
          status: "healthy",
          database: "connected",
          categories: categories.length,
          timestamp: new Date().toISOString(),
        },
        "知識庫服務正常"
      );
    } catch (error) {
      logger.error("知識庫健康檢查失敗:", error);
      sendResponse(
        res,
        false,
        {
          status: "unhealthy",
          error: error.message,
        },
        "知識庫服務異常",
        503
      );
    }
  }

  /**
   * 獲取API信息
   * GET /api/knowledge
   */
  static async getApiInfo(req, res) {
    sendResponse(
      res,
      true,
      {
        name: "SFDA Nexus 知識庫 API",
        version: "1.0.0",
        description: "提供 KESS 知識庫的查詢和管理功能",
        endpoints: {
          categories: "/api/knowledge/categories",
          summaries: "/api/knowledge/summaries/:categoryCode",
          summary: "/api/knowledge/summary/:id",
          document: "/api/knowledge/document/:id",
          search: "/api/knowledge/search",
          stats: "/api/knowledge/stats",
          health: "/api/knowledge/health",
        },
        documentation: "請參考項目文檔了解詳細使用方法",
      },
      "API 信息獲取成功"
    );
  }
}

// 導出所有控制器
export default {
  KnowledgeCategoryController,
  KnowledgeSummaryController,
  KnowledgeDocumentController,
  KnowledgeStatsController,
  KnowledgeController,
};
