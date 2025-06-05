/**
 * 用戶管理相關 API
 */

import api from "./index.js";
import { prepareDataForSubmit, USER_BOOL_FIELDS } from "@/utils/dataConverter";

// ===== 用戶管理 =====
export const getUsers = async (params = {}) => {
  const response = await api.get("/api/users", { params });
  return response.data;
};

export const createUser = async (userData) => {
  // 準備提交資料，將布林值轉換為數字
  const preparedData = prepareDataForSubmit(userData, USER_BOOL_FIELDS);
  const response = await api.post("/api/users", preparedData);
  return response.data;
};

export const updateUser = async (userId, updateData) => {
  // 準備提交資料，將布林值轉換為數字
  const preparedData = prepareDataForSubmit(updateData, USER_BOOL_FIELDS);
  const response = await api.put(`/api/users/${userId}`, preparedData);
  return response.data;
};

export const deleteUser = async (userId) => {
  const response = await api.delete(`/api/users/${userId}`);
  return response.data;
};

export const resetUserPassword = async (userId, newPassword) => {
  const response = await api.post(`/api/users/${userId}/reset-password`, {
    password: newPassword,
  });
  return response.data;
};
