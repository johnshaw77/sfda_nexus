/**
 * MCP 服務管理 API
 */

import request from "./index.js";

// MCP 服務發現與管理
export default {
  /**
   * 探索 MCP 服務
   * @param {string} endpoint - MCP 服務器端點（可選）
   */
  discoverServices(endpoint = null) {
    const params = endpoint ? { endpoint } : {};
    return request.get("/api/mcp/services/discover", { params });
  },

  /**
   * 比較服務差異
   * @param {string} endpoint - MCP 服務器端點（可選）
   */
  compareServices(endpoint = null) {
    const params = endpoint ? { endpoint } : {};
    return request.get("/api/mcp/services/compare", { params });
  },

  /**
   * 啟用選中的服務
   * @param {Array} services - 選中的服務列表
   */
  enableServices(services) {
    return request.post("/api/mcp/services/enable", { services });
  },

  /**
   * 啟用選中的服務（新版本）
   * @param {Array} services - 選中的服務列表
   */
  enableSelectedServices(services) {
    return request.post("/api/mcp/services/enable", { services });
  },

  /**
   * 停用服務
   * @param {Array} serviceIds - 服務 ID 列表
   * @param {Array} toolIds - 工具 ID 列表（可選）
   */
  disableServices(serviceIds, toolIds = []) {
    return request.post("/api/mcp/services/disable", { serviceIds, toolIds });
  },

  /**
   * 完整同步 MCP 服務
   * @param {string} endpoint - MCP 服務器端點（可選）
   */
  syncServices(endpoint = null) {
    const data = endpoint ? { endpoint } : {};
    return request.post("/api/mcp/services/sync", data);
  },

  /**
   * 獲取同步狀態
   */
  getSyncStatus() {
    return request.get("/api/mcp/services/sync/status");
  },

  /**
   * 獲取服務差異
   * @param {string} endpoint - MCP 服務器端點（可選）
   */
  getServiceDifferences(endpoint = null) {
    const params = endpoint ? { endpoint } : {};
    return request.get("/api/mcp/services/differences", { params });
  },

  /**
   * 獲取已啟用的服務列表
   */
  getEnabledServices() {
    return request.get("/api/mcp/services/enabled");
  },

  /**
   * 獲取所有 MCP 服務（從資料庫）
   */
  getAllServices() {
    return request.get("/api/mcp/services");
  },

  /**
   * 獲取已同步的服務和工具（從資料庫，用於日常管理）
   */
  getSyncedServices() {
    return request.get("/api/mcp/services/synced");
  },

  /**
   * 更新 MCP 服務
   * @param {number} serviceId - 服務 ID
   * @param {object} updateData - 更新數據
   */
  updateMcpService(serviceId, updateData) {
    return request.put(`/api/mcp/services/${serviceId}`, updateData);
  },

  /**
   * 獲取所有 MCP 工具
   */
  getAllTools() {
    return request.get("/api/mcp/tools");
  },

  /**
   * 為智能體分配服務權限
   * @param {number} agentId - 智能體 ID
   * @param {Array} serviceIds - 服務 ID 列表
   */
  assignAgentServices(agentId, serviceIds) {
    return request.post(`/api/mcp/agents/${agentId}/services`, { serviceIds });
  },

  /**
   * 獲取智能體的服務權限
   * @param {number} agentId - 智能體 ID
   */
  getAgentServices(agentId) {
    return request.get(`/api/mcp/agents/${agentId}/services`);
  },

  /**
   * 移除智能體服務權限
   * @param {number} agentId - 智能體 ID
   * @param {number} serviceId - 服務 ID
   */
  removeAgentService(agentId, serviceId) {
    return request.delete(`/api/mcp/agents/${agentId}/services/${serviceId}`);
  },

  /**
   * 批量更新智能體服務權限
   * @param {number} agentId - 智能體 ID
   * @param {Array} serviceIds - 服務 ID 列表
   */
  batchUpdateAgentServices(agentId, serviceIds) {
    return request.put(`/api/mcp/agents/${agentId}/services/batch`, {
      serviceIds,
    });
  },

  /**
   * 刪除 MCP 服務（軟刪除）
   * @param {number} serviceId - 服務 ID
   * @param {boolean} permanent - 是否永久刪除
   */
  deleteService(serviceId, permanent = false) {
    const endpoint = permanent
      ? `/api/mcp/services/${serviceId}/permanent`
      : `/api/mcp/services/${serviceId}`;
    return request.delete(endpoint);
  },

  /**
   * 永久刪除 MCP 服務（硬刪除）
   * @param {number} serviceId - 服務 ID
   */
  permanentDeleteService(serviceId) {
    return request.delete(`/api/mcp/services/${serviceId}/permanent`);
  },

  /**
   * 批量刪除 MCP 服務
   * @param {Array} serviceIds - 服務 ID 列表
   * @param {boolean} permanent - 是否永久刪除
   */
  batchDeleteServices(serviceIds, permanent = false) {
    const endpoint = permanent
      ? "/api/mcp/services/batch/permanent"
      : "/api/mcp/services/batch";
    return request.delete(endpoint, { data: { serviceIds } });
  },

  /**
   * 批量永久刪除 MCP 服務（硬刪除）
   * @param {Array} serviceIds - 服務 ID 列表
   */
  batchPermanentDeleteServices(serviceIds) {
    return request.delete("/api/mcp/services/batch/permanent", {
      data: { serviceIds },
    });
  },

  /**
   * 切換工具狀態
   * @param {number} toolId - 工具 ID
   * @param {boolean} enabled - 是否啟用
   */
  toggleTool(toolId, enabled) {
    return request.patch(`/api/mcp/tools/${toolId}/status`, {
      is_enabled: enabled,
    });
  },

  /**
   * 批量切換工具狀態
   * @param {Array} toolIds - 工具 ID 列表
   * @param {boolean} enabled - 是否啟用
   */
  batchToggleTools(toolIds, enabled) {
    return request.patch("/api/mcp/tools/batch/status", {
      tool_ids: toolIds,
      is_enabled: enabled,
    });
  },

  /**
   * 調用 MCP 工具
   * @param {Object} params - 調用參數
   * @param {number} params.serviceId - 服務 ID
   * @param {number} params.toolId - 工具 ID
   * @param {string} params.toolName - 工具名稱
   * @param {Object} params.parameters - 工具參數
   */
  callTool({ serviceId, toolId, toolName, parameters }) {
    return request.post("/api/mcp/tools/call", {
      serviceId,
      toolId,
      toolName,
      parameters,
    });
  },

  /**
   * 獲取工具調用歷史
   * @param {number} toolId - 工具 ID（可選）
   * @param {number} limit - 限制條數（可選）
   */
  getToolCallHistory(toolId = null, limit = 50) {
    const params = { limit };
    if (toolId) params.toolId = toolId;
    return request.get("/api/mcp/tools/call/history", { params });
  },

  /**
   * 獲取工具調用統計
   */
  getToolCallStats() {
    return request.get("/api/mcp/tools/call/stats");
  },
};
