/**
 * 知識庫管理 API
 * 提供 KESS 知識庫的前端 API 調用方法
 */

import request from "./index.js";

/**
 * 知識庫 API 類
 */
export class KnowledgeAPI {
  /**
   * 獲取 API 信息
   * @returns {Promise} API 信息
   */
  static async getApiInfo() {
    return request.get("/api/knowledge");
  }

  /**
   * 健康檢查
   * @returns {Promise} 健康狀態
   */
  static async healthCheck() {
    return request.get("/api/knowledge/health");
  }

  /**
   * 獲取分類列表
   * @returns {Promise} 分類樹列表
   */
  static async getCategories() {
    return request.get("/api/knowledge/categories");
  }

  /**
   * 獲取分類詳情
   * @param {string} categoryCode - 分類代碼
   * @returns {Promise} 分類詳情
   */
  static async getCategoryDetail(categoryCode) {
    return request.get(`/api/knowledge/categories/${categoryCode}`);
  }

  /**
   * 獲取分類下的摘要列表
   * @param {string} categoryCode - 分類代碼
   * @param {Object} params - 查詢參數
   * @param {number} params.page - 頁碼
   * @param {number} params.limit - 每頁數量
   * @param {string} params.search - 搜索關鍵字
   * @returns {Promise} 摘要列表
   */
  static async getSummariesByCategory(categoryCode, params = {}) {
    const { page = 1, limit = 20, search = "" } = params;
    return request.get(`/api/knowledge/summaries/${categoryCode}`, {
      params: { page, limit, search },
    });
  }

  /**
   * 獲取摘要詳情
   * @param {number} summaryId - 摘要ID
   * @returns {Promise} 摘要詳情
   */
  static async getSummaryDetail(summaryId) {
    return request.get(`/api/knowledge/summary/${summaryId}`);
  }

  /**
   * 更新摘要
   * @param {number} summaryId - 摘要ID
   * @param {Object} data - 更新數據
   * @returns {Promise} 更新結果
   */
  static async updateSummary(summaryId, data) {
    return request.put(`/api/knowledge/summary/${summaryId}`, data);
  }

  /**
   * 刪除摘要
   * @param {number} summaryId - 摘要ID
   * @returns {Promise} 刪除結果
   */
  static async deleteSummary(summaryId) {
    return request.delete(`/api/knowledge/summary/${summaryId}`);
  }

  /**
   * 搜索摘要
   * @param {string} query - 搜索關鍵字
   * @param {Object} options - 搜索選項
   * @param {number} options.page - 頁碼
   * @param {number} options.limit - 每頁數量
   * @returns {Promise} 搜索結果
   */
  static async searchSummaries(query, options = {}) {
    return request.post("/api/knowledge/search", {
      query,
      options,
    });
  }

  /**
   * 獲取文檔詳情
   * @param {number} documentId - 文檔ID
   * @returns {Promise} 文檔詳情
   */
  static async getDocumentDetail(documentId) {
    return request.get(`/api/knowledge/document/${documentId}`);
  }

  /**
   * 獲取文檔下載信息
   * @param {number} documentId - 文檔ID
   * @returns {Promise} 下載信息
   */
  static async getDownloadInfo(documentId) {
    return request.get(`/api/knowledge/document/${documentId}/download-info`);
  }

  /**
   * 下載文檔
   * @param {number} documentId - 文檔ID
   * @returns {Promise} 下載結果
   */
  static async downloadDocument(documentId) {
    return request.get(`/api/knowledge/document/${documentId}/download`, {
      responseType: "blob",
    });
  }

  /**
   * 獲取統計信息
   * @returns {Promise} 統計信息
   */
  static async getStats() {
    return request.get("/api/knowledge/stats");
  }

  /**
   * 獲取活動統計
   * @param {number} days - 統計天數
   * @returns {Promise} 活動統計
   */
  static async getActivityStats(days = 30) {
    return request.get("/api/knowledge/stats/activity", {
      params: { days },
    });
  }
}

// 導出便捷方法
export const {
  getApiInfo,
  healthCheck,
  getCategories,
  getCategoryDetail,
  getSummariesByCategory,
  getSummaryDetail,
  updateSummary,
  deleteSummary,
  searchSummaries,
  getDocumentDetail,
  getDownloadInfo,
  downloadDocument,
  getStats,
  getActivityStats,
} = KnowledgeAPI;

// 默認導出
export default KnowledgeAPI;
