/**
 * Qwen-Agent 相關 API
 * 處理 Qwen-Agent 的初始化、狀態檢查、工具管理和對話功能
 */

import api from "./index.js";

// ===== Qwen-Agent 服務管理 =====

/**
 * 初始化 Qwen-Agent 服務
 */
export const initializeQwenAgent = async () => {
  const response = await api.post("/api/qwen-agent/initialize");
  return response.data;
};

/**
 * 獲取 Qwen-Agent 狀態
 */
export const getQwenAgentStatus = async () => {
  const response = await api.get("/api/qwen-agent/status");
  return response.data;
};

/**
 * 獲取可用的 MCP 工具列表
 */
export const getMcpTools = async () => {
  const response = await api.get("/api/qwen-agent/tools");
  return response.data;
};

// ===== Qwen-Agent 對話功能 =====

/**
 * 與 Qwen-Agent 進行對話
 * @param {Object} params - 對話參數
 * @param {string} params.message - 用戶消息
 * @param {number} params.agentId - 智能體 ID
 * @param {number} params.conversationId - 對話 ID（可選）
 * @param {Array} params.tools - 可用工具列表（可選）
 * @param {Object} params.context - 對話上下文（可選）
 */
export const chatWithQwenAgent = async (params) => {
  const response = await api.post("/api/qwen-agent/chat", params);
  return response.data;
};

/**
 * 創建新的 Qwen-Agent 實例
 * @param {Object} config - Agent 配置
 * @param {string} config.name - Agent 名稱
 * @param {string} config.systemPrompt - 系統提示詞
 * @param {Array} config.tools - 工具列表
 * @param {Object} config.options - 其他選項
 */
export const createQwenAgent = async (config) => {
  const response = await api.post("/api/qwen-agent/create", config);
  return response.data;
};

// ===== Qwen-Agent 測試功能 =====

/**
 * 執行 Qwen-Agent 測試
 * @param {string} testType - 測試類型 ('basic', 'tools', 'conversation')
 */
export const testQwenAgent = async (testType = "basic") => {
  const response = await api.post("/api/qwen-agent/test", { testType });
  return response.data;
};

// ===== 工具調用相關 =====

/**
 * 直接調用 MCP 工具
 * @param {Object} params - 工具調用參數
 * @param {string} params.toolName - 工具名稱
 * @param {Object} params.arguments - 工具參數
 */
export const callMcpTool = async (params) => {
  const response = await api.post("/api/qwen-agent/tools/call", params);
  return response.data;
};

/**
 * 獲取工具調用歷史
 * @param {Object} params - 查詢參數
 * @param {number} params.limit - 限制數量
 * @param {number} params.offset - 偏移量
 */
export const getToolCallHistory = async (params = {}) => {
  const response = await api.get("/api/qwen-agent/tools/history", { params });
  return response.data;
};

// ===== 智能體配置管理 =====

/**
 * 更新 Qwen-Agent 配置
 * @param {Object} config - 新配置
 */
export const updateQwenAgentConfig = async (config) => {
  const response = await api.put("/api/qwen-agent/config", config);
  return response.data;
};

/**
 * 獲取 Qwen-Agent 配置
 */
export const getQwenAgentConfig = async () => {
  const response = await api.get("/api/qwen-agent/config");
  return response.data;
};

// ===== 錯誤處理和重試 =====

/**
 * 重置 Qwen-Agent 服務
 */
export const resetQwenAgent = async () => {
  const response = await api.post("/api/qwen-agent/reset");
  return response.data;
};

/**
 * 檢查服務健康狀態
 */
export const checkQwenAgentHealth = async () => {
  const response = await api.get("/api/qwen-agent/health");
  return response.data;
};

export default {
  initializeQwenAgent,
  getQwenAgentStatus,
  getMcpTools,
  chatWithQwenAgent,
  createQwenAgent,
  testQwenAgent,
  callMcpTool,
  getToolCallHistory,
  updateQwenAgentConfig,
  getQwenAgentConfig,
  resetQwenAgent,
  checkQwenAgentHealth,
};
