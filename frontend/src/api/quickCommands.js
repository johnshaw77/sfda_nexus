/**
 * 快速命令詞 API
 * 處理快速命令詞相關的 HTTP 請求
 */

import api from "./index.js";

/**
 * 獲取智能體的快速命令詞
 * @param {number} agentId - 智能體 ID
 * @returns {Promise<Array>} 快速命令詞列表
 */
export const getAgentQuickCommands = async (agentId) => {
  try {
    const response = await api.get(`/api/quick-commands/agent/${agentId}`);
    return response.data.data; // 提取實際的數據
  } catch (error) {
    console.error("獲取智能體快速命令詞失敗:", error);
    throw error;
  }
};

/**
 * 獲取所有快速命令詞（通用版本）
 * @param {Object} params - 查詢參數
 * @param {string} [params.category] - 分類過濾
 * @param {boolean} [params.active=true] - 是否只獲取啟用的命令
 * @returns {Promise<Array>} 快速命令詞列表
 */
export const getAllQuickCommands = async (params = {}) => {
  try {
    const response = await api.get("/api/quick-commands", { params });

    // 返回 response.data.data（實際的數據陣列）
    return response.data.data;
  } catch (error) {
    console.error("獲取快速命令詞失敗:", error);
    throw error;
  }
};

/**
 * 獲取所有快速命令詞及智能體關聯（管理介面專用）
 * @param {Object} params - 查詢參數
 * @param {string} [params.category] - 分類過濾
 * @param {boolean} [params.active] - 是否只獲取啟用的命令（undefined = 不過濾）
 * @returns {Promise<Array>} 包含智能體關聯的快速命令詞列表
 */
export const getAllQuickCommandsForAdmin = async (params = {}) => {
  try {
    const response = await api.get("/api/quick-commands/admin", { params });

    // 返回 response.data.data（實際的數據陣列）
    return response.data.data;
  } catch (error) {
    console.error("獲取快速命令詞管理列表失敗:", error);
    throw error;
  }
};

/**
 * 增加快速命令詞使用次數統計
 * @param {number} commandId - 命令詞 ID
 * @returns {Promise<void>}
 */
export const incrementCommandUsage = async (commandId) => {
  try {
    await api.post(`/api/quick-commands/${commandId}/usage`);
  } catch (error) {
    console.error("更新命令詞使用次數失敗:", error);
    // 使用次數統計失敗不應該影響用戶體驗，只記錄錯誤
  }
};

/**
 * 創建新的快速命令詞
 * @param {Object} commandData - 命令詞數據
 * @param {string} commandData.command_text - 命令詞文字
 * @param {string} [commandData.description] - 命令說明
 * @param {string} [commandData.category='general'] - 分類
 * @param {string} [commandData.icon] - 圖標名稱
 * @returns {Promise<Object>} 創建的命令詞數據
 */
export const createQuickCommand = async (commandData) => {
  try {
    const response = await api.post("/api/quick-commands", commandData);
    return response.data; // 保持完整響應，因為需要 success 字段
  } catch (error) {
    console.error("創建快速命令詞失敗:", error);
    throw error;
  }
};

/**
 * 更新快速命令詞
 * @param {number} commandId - 命令詞 ID
 * @param {Object} updateData - 更新數據
 * @returns {Promise<Object>} 更新後的命令詞數據
 */
export const updateQuickCommand = async (commandId, updateData) => {
  try {
    const response = await api.put(
      `/api/quick-commands/${commandId}`,
      updateData
    );
    return response.data;
  } catch (error) {
    console.error("更新快速命令詞失敗:", error);
    throw error;
  }
};

/**
 * 刪除快速命令詞
 * @param {number} commandId - 命令詞 ID
 * @returns {Promise<void>}
 */
export const deleteQuickCommand = async (commandId) => {
  try {
    const response = await api.delete(`/api/quick-commands/${commandId}`);
    return response.data;
  } catch (error) {
    console.error("刪除快速命令詞失敗:", error);
    throw error;
  }
};

/**
 * 獲取快速命令詞統計數據
 * @returns {Promise<Object>} 統計數據
 */
export const getQuickCommandStats = async () => {
  try {
    const response = await api.get("/api/quick-commands/stats");
    return response.data;
  } catch (error) {
    console.error("獲取快速命令詞統計失敗:", error);
    throw error;
  }
};

export default {
  getAgentQuickCommands,
  getAllQuickCommands,
  getAllQuickCommandsForAdmin,
  incrementCommandUsage,
  createQuickCommand,
};
