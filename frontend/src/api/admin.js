/**
 * 管理員相關 API
 */

import api from "./index.js";

// ===== 用戶管理 =====
export const getUsers = async (params = {}) => {
  const response = await api.get("/api/admin/users", { params });
  return response.data;
};

export const createUser = async (userData) => {
  const response = await api.post("/api/admin/users", userData);
  return response.data;
};

export const updateUser = async (userId, updateData) => {
  const response = await api.put(`/api/admin/users/${userId}`, updateData);
  return response.data;
};

export const deleteUser = async (userId) => {
  const response = await api.delete(`/api/admin/users/${userId}`);
  return response.data;
};

export const resetUserPassword = async (userId, newPassword) => {
  const response = await api.post(`/api/admin/users/${userId}/reset-password`, {
    password: newPassword,
  });
  return response.data;
};

// ===== 模型管理 =====
export const getModels = async (params = {}) => {
  const response = await api.get("/api/admin/models", { params });
  return response.data;
};

export const createModel = async (modelData) => {
  const response = await api.post("/api/admin/models", modelData);
  return response.data;
};

export const updateModel = async (modelId, updateData) => {
  const response = await api.put(`/api/admin/models/${modelId}`, updateData);
  return response.data;
};

export const deleteModel = async (modelId) => {
  const response = await api.delete(`/api/admin/models/${modelId}`);
  return response.data;
};

export const testModel = async (modelId, testData) => {
  const response = await api.post(
    `/api/admin/models/${modelId}/test`,
    testData
  );
  return response.data;
};

// ===== 智能體管理 =====
export const getAgents = async (params = {}) => {
  const response = await api.get("/api/admin/agents", { params });
  return response.data;
};

export const createAgent = async (agentData) => {
  const response = await api.post("/api/admin/agents", agentData);
  return response.data;
};

export const updateAgent = async (agentId, updateData) => {
  const response = await api.put(`/api/admin/agents/${agentId}`, updateData);
  return response.data;
};

export const deleteAgent = async (agentId) => {
  const response = await api.delete(`/api/admin/agents/${agentId}`);
  return response.data;
};

export const duplicateAgent = async (agentId) => {
  const response = await api.post(`/api/admin/agents/${agentId}/duplicate`);
  return response.data;
};

// ===== 系統管理 =====
export const getSystemInfo = async () => {
  const response = await api.get("/api/admin/system/info");
  return response.data;
};

export const getSystemLogs = async (params = {}) => {
  const response = await api.get("/api/admin/system/logs", { params });
  return response.data;
};

export const backupDatabase = async () => {
  const response = await api.post("/api/admin/system/backup");
  return response.data;
};

export const optimizeDatabase = async () => {
  const response = await api.post("/api/admin/system/optimize");
  return response.data;
};

export const cleanupDatabase = async () => {
  const response = await api.post("/api/admin/system/cleanup");
  return response.data;
};

export const getSystemConfig = async () => {
  const response = await api.get("/api/admin/system/config");
  return response.data;
};

export const updateSystemConfig = async (configData) => {
  const response = await api.put("/api/admin/system/config", configData);
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
