/**
 * 用戶管理相關 API
 */

import api from "./index.js";

// ===== 用戶管理 =====
export const getUsers = async (params = {}) => {
  const response = await api.get("/api/users", { params });
  return response.data;
};

export const createUser = async (userData) => {
  const response = await api.post("/api/users", userData);
  return response.data;
};

export const updateUser = async (userId, updateData) => {
  const response = await api.put(`/api/users/${userId}`, updateData);
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
