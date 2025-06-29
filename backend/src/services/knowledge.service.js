/**
 * 知識庫服務層
 * 提供知識庫相關的業務邏輯處理
 */

import {
  KnowledgeCategory,
  KnowledgeSummary,
  KnowledgeDocument,
  KnowledgeStats,
} from "../models/Knowledge.model.js";
import logger from "../utils/logger.util.js";

/**
 * 知識庫分類服務
 */
export class KnowledgeCategoryService {
  /**
   * 獲取分類樹結構
   * @returns {Promise<Array>} 分類樹
   */
  static async getCategoryTree() {
    try {
      const categories = await KnowledgeCategory.getActiveCategories();

      return categories.map((category) => ({
        code: category.category_code,
        name: category.category_name,
        icon: this.getCategoryIcon(category.category_code),
        stats: {
          total_documents: category.total_documents,
          completed_documents: category.completed_documents,
          pending_documents: category.pending_documents,
          failed_documents: category.failed_documents,
          archived_documents: category.archived_documents,
          total_file_size: category.total_file_size,
          avg_word_count: category.avg_word_count,
          total_summaries: category.total_summaries,
          avg_confidence_score: category.avg_confidence_score,
        },
      }));
    } catch (error) {
      logger.error("獲取分類樹失敗:", error);
      throw error;
    }
  }

  /**
   * 根據分類代碼獲取圖標
   * @param {string} categoryCode - 分類代碼
   * @returns {string} 圖標名稱
   */
  static getCategoryIcon(categoryCode) {
    const iconMap = {
      IT: "laptop",
      QUALITY: "shield-check",
      MANUFACTURING: "cog",
      HR: "users",
      FINANCE: "dollar-sign",
      LEGAL: "scale",
      default: "folder",
    };

    return iconMap[categoryCode] || iconMap.default;
  }

  /**
   * 獲取分類詳情
   * @param {string} categoryCode - 分類代碼
   * @returns {Promise<Object>} 分類詳情
   */
  static async getCategoryDetail(categoryCode) {
    try {
      const category = await KnowledgeCategory.getCategoryById(categoryCode);
      if (!category) {
        throw new Error("分類不存在");
      }

      return {
        ...category,
        icon: this.getCategoryIcon(category.category_code),
        total_file_size_formatted: this.formatFileSize(
          category.total_file_size
        ),
      };
    } catch (error) {
      logger.error("獲取分類詳情失敗:", error);
      throw error;
    }
  }

  /**
   * 格式化文件大小
   * @param {number} bytes - 文件大小（字節）
   * @returns {string} 格式化後的文件大小
   */
  static formatFileSize(bytes) {
    if (!bytes || bytes === 0) return "0 B";

    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }
}

/**
 * 知識庫摘要服務
 */
export class KnowledgeSummaryService {
  /**
   * 根據分類獲取摘要列表
   * @param {string} categoryCode - 分類代碼
   * @param {Object} options - 選項
   * @returns {Promise<Object>} 摘要列表和分頁信息
   */
  static async getSummariesByCategory(categoryCode, options = {}) {
    try {
      const { page = 1, limit = 20, search = "" } = options;

      const summaries = await KnowledgeSummary.getSummariesByCategory(
        categoryCode,
        page,
        limit,
        search
      );

      const total = await KnowledgeSummary.getSummariesCountByCategory(
        categoryCode,
        search
      );

      return {
        summaries: summaries.map((summary) => ({
          ...summary,
          file_size_formatted: this.formatFileSize(summary.file_size),
        })),
        pagination: {
          current: page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error("獲取摘要列表失敗:", error);
      throw error;
    }
  }

  /**
   * 獲取摘要詳情
   * @param {number} summaryId - 摘要ID
   * @returns {Promise<Object>} 摘要詳情
   */
  static async getSummaryDetail(summaryId) {
    try {
      const summary = await KnowledgeSummary.getSummaryById(summaryId);
      if (!summary) {
        throw new Error("摘要不存在");
      }

      return {
        ...summary,
        file_size_formatted: this.formatFileSize(summary.file_size),
      };
    } catch (error) {
      logger.error("獲取摘要詳情失敗:", error);
      throw error;
    }
  }

  /**
   * 搜索摘要
   * @param {string} query - 搜索關鍵字
   * @param {Object} options - 選項
   * @returns {Promise<Object>} 搜索結果
   */
  static async searchSummaries(query, options = {}) {
    try {
      const { page = 1, limit = 20 } = options;

      const summaries = await KnowledgeSummary.searchSummaries(
        query,
        page,
        limit
      );
      const total = await KnowledgeSummary.getSearchCount(query);

      return {
        summaries: summaries.map((summary) => ({
          ...summary,
          file_size_formatted: this.formatFileSize(summary.file_size),
          highlighted: this.highlightSearchTerms(summary, query),
        })),
        pagination: {
          current: page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        query,
      };
    } catch (error) {
      logger.error("搜索摘要失敗:", error);
      throw error;
    }
  }

  /**
   * 更新摘要
   * @param {number} summaryId - 摘要ID
   * @param {Object} updateData - 更新數據
   * @returns {Promise<boolean>} 更新結果
   */
  static async updateSummary(summaryId, updateData) {
    try {
      const success = await KnowledgeSummary.updateSummary(
        summaryId,
        updateData
      );
      if (!success) {
        throw new Error("更新摘要失敗");
      }
      return success;
    } catch (error) {
      logger.error("更新摘要失敗:", error);
      throw error;
    }
  }

  /**
   * 刪除摘要
   * @param {number} summaryId - 摘要ID
   * @returns {Promise<boolean>} 刪除結果
   */
  static async deleteSummary(summaryId) {
    try {
      const success = await KnowledgeSummary.deleteSummary(summaryId);
      if (!success) {
        throw new Error("刪除摘要失敗");
      }
      return success;
    } catch (error) {
      logger.error("刪除摘要失敗:", error);
      throw error;
    }
  }

  /**
   * 格式化文件大小
   * @param {number} bytes - 文件大小（字節）
   * @returns {string} 格式化後的文件大小
   */
  static formatFileSize(bytes) {
    if (!bytes || bytes === 0) return "0 B";

    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  /**
   * 在搜索結果中高亮關鍵字
   * @param {Object} summary - 摘要對象
   * @param {string} query - 搜索關鍵字
   * @returns {Object} 高亮信息
   */
  static highlightSearchTerms(summary, query) {
    const searchTerms = query.toLowerCase().split(/\s+/);
    const fields = ["file_name", "summary_text"];
    const highlighted = {};

    fields.forEach((field) => {
      if (summary[field]) {
        const text = summary[field].toLowerCase();
        const hasMatch = searchTerms.some((term) => text.includes(term));
        highlighted[field] = hasMatch;
      }
    });

    return highlighted;
  }
}

/**
 * 知識庫文檔服務
 */
export class KnowledgeDocumentService {
  /**
   * 獲取文檔詳情
   * @param {number} documentId - 文檔ID
   * @returns {Promise<Object>} 文檔詳情
   */
  static async getDocumentDetail(documentId) {
    try {
      const document = await KnowledgeDocument.getDocumentById(documentId);
      if (!document) {
        throw new Error("文檔不存在");
      }

      // 獲取文檔的所有摘要
      const summaries =
        await KnowledgeDocument.getDocumentSummaries(documentId);

      return {
        ...document,
        file_size_formatted: KnowledgeCategoryService.formatFileSize(
          document.file_size
        ),
        summaries: summaries,
      };
    } catch (error) {
      logger.error("獲取文檔詳情失敗:", error);
      throw error;
    }
  }

  /**
   * 檢查文檔是否可以下載
   * @param {number} documentId - 文檔ID
   * @returns {Promise<Object>} 文檔下載信息
   */
  static async getDownloadInfo(documentId) {
    try {
      const document = await KnowledgeDocument.getDocumentById(documentId);
      if (!document) {
        throw new Error("文檔不存在");
      }

      // 檢查文件路徑是否存在
      return {
        id: document.id,
        fileName: document.file_name,
        fileSize: document.file_size,
        downloadable: !!document.archive_path || !!document.file_path,
        path: document.archive_path || document.file_path,
      };
    } catch (error) {
      logger.error("獲取文檔下載信息失敗:", error);
      throw error;
    }
  }
}

/**
 * 知識庫統計服務
 */
export class KnowledgeStatsService {
  /**
   * 獲取知識庫概覽統計
   * @returns {Promise<Object>} 統計信息
   */
  static async getOverviewStats() {
    try {
      const stats = await KnowledgeStats.getOverviewStats();
      const categoryStats = await KnowledgeStats.getCategoryStats();

      return {
        overview: {
          ...stats,
          total_file_size_formatted: KnowledgeCategoryService.formatFileSize(
            stats.total_file_size
          ),
        },
        categories: categoryStats.map((cat) => ({
          ...cat,
          total_file_size_formatted: KnowledgeCategoryService.formatFileSize(
            cat.total_file_size
          ),
          icon: KnowledgeCategoryService.getCategoryIcon(cat.category_code),
        })),
      };
    } catch (error) {
      logger.error("獲取統計信息失敗:", error);
      throw error;
    }
  }

  /**
   * 獲取知識庫活動統計
   * @param {number} days - 統計天數
   * @returns {Promise<Object>} 活動統計
   */
  static async getActivityStats(days = 30) {
    try {
      // 這裡可以擴展更詳細的活動統計
      const basicStats = await KnowledgeStats.getOverviewStats();

      return {
        period: `最近 ${days} 天`,
        totalDocuments: basicStats.total_documents,
        totalSummaries: basicStats.total_summaries,
        // 可以添加更多統計指標
        trends: {
          documentsGrowth: 0, // 需要時間序列數據才能計算
          summariesGrowth: 0,
        },
      };
    } catch (error) {
      logger.error("獲取活動統計失敗:", error);
      throw error;
    }
  }
}
