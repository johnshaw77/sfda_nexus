/**
 * 模型管理相關 API
 */

import api from "./index.js";
import { prepareDataForSubmit, MODEL_BOOL_FIELDS } from "@/utils/dataConverter";

// ===== 模型管理 =====
export const getModels = async (params = {}) => {
  const response = await api.get("/api/models", { params });
  return response.data;
};

export const createModel = async (modelData) => {
  // 準備提交資料，將布林值轉換為數字
  const preparedData = prepareDataForSubmit(modelData, MODEL_BOOL_FIELDS);
  const response = await api.post("/api/models", preparedData);
  return response.data;
};

export const updateModel = async (modelId, updateData) => {
  // 準備提交資料，將布林值轉換為數字
  const preparedData = prepareDataForSubmit(updateData, MODEL_BOOL_FIELDS);
  const response = await api.put(`/api/models/${modelId}`, preparedData);
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

export const copyModel = async (modelId, copyOptions = {}) => {
  const response = await api.post(`/api/models/${modelId}/copy`, copyOptions);
  return response.data;
};
