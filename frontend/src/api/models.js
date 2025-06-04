/**
 * 模型管理相關 API
 */

import api from "./index.js";

// ===== 模型管理 =====
export const getModels = async (params = {}) => {
  const response = await api.get("/api/models", { params });
  return response.data;
};

export const createModel = async (modelData) => {
  const response = await api.post("/api/models", modelData);
  return response.data;
};

export const updateModel = async (modelId, updateData) => {
  const response = await api.put(`/api/models/${modelId}`, updateData);
  return response.data;
};

export const deleteModel = async (modelId) => {
  const response = await api.delete(`/api/models/${modelId}`);
  return response.data;
};

export const testModel = async (modelId, testData) => {
  const response = await api.post(`/api/models/${modelId}/test`, testData);
  return response.data;
};
