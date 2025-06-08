/**
 * 智能體管理相關 API
 */

import api from "./index.js";

// ===== 智能體管理 =====
export const getAgents = async (params = {}) => {
  const response = await api.get("/api/agents", { params });
  return response.data;
};

export const createAgent = async (agentData) => {
  const response = await api.post("/api/agents", agentData);
  return response.data;
};

export const updateAgent = async (agentId, updateData) => {
  const response = await api.put(`/api/agents/${agentId}`, updateData);
  return response.data;
};

export const deleteAgent = async (agentId) => {
  const response = await api.delete(`/api/agents/${agentId}`);
  return response.data;
};

export const duplicateAgent = async (agentId, data = {}) => {
  const response = await api.post(`/api/agents/${agentId}/duplicate`, data);
  return response.data;
};
