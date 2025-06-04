/**
 * 系統管理相關 API
 */

import api from "./index.js";

// ===== 系統管理 =====
export const getSystemStats = async () => {
  const response = await api.get("/api/system/stats");
  return response.data;
};

export const getSystemConfig = async () => {
  const response = await api.get("/api/system/config");
  return response.data;
};

export const updateSystemConfig = async (configData) => {
  const response = await api.put("/api/system/config", configData);
  return response.data;
};

export const getAuditLogs = async (params = {}) => {
  const response = await api.get("/api/system/audit-logs", { params });
  return response.data;
};

// ===== 統計數據 =====
export const getDashboardStats = async () => {
  const response = await api.get("/api/admin/stats/dashboard");
  return response.data;
};

export const getUserStats = async (params = {}) => {
  const response = await api.get("/api/admin/stats/users", { params });
  return response.data;
};

export const getChatStats = async (params = {}) => {
  const response = await api.get("/api/admin/stats/chats", { params });
  return response.data;
};

export const getModelUsageStats = async (params = {}) => {
  const response = await api.get("/api/admin/stats/models", { params });
  return response.data;
};
