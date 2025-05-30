/**
 * 認證相關 API
 */

import api from "./index.js";

// 用戶登入
export const login = async (credentials) => {
  // 轉換前端參數到後端期望的格式
  const loginData = {
    identifier: credentials.username, // 後端期望 identifier
    password: credentials.password,
    remember: credentials.rememberMe || false, // 後端期望 remember
  };

  const response = await api.post("/api/auth/login", loginData);
  return response.data;
};

// 用戶註冊
export const register = async (userData) => {
  const response = await api.post("/api/auth/register", userData);
  return response.data;
};

// 用戶登出
export const logout = async () => {
  const response = await api.post("/api/auth/logout");
  return response.data;
};

// 獲取用戶資料
export const getProfile = async () => {
  const response = await api.get("/api/auth/profile");
  return response.data;
};

// 更新用戶資料
export const updateProfile = async (updateData) => {
  const response = await api.put("/api/auth/profile", updateData);
  return response.data;
};

// 修改密碼
export const changePassword = async (passwordData) => {
  const response = await api.put("/api/auth/change-password", passwordData);
  return response.data;
};

// 刷新 token
export const refreshToken = async (refreshTokenValue) => {
  const response = await api.post("/api/auth/refresh", {
    refresh_token: refreshTokenValue, // 後端期望 refresh_token
  });
  return response.data;
};

// 忘記密碼
export const forgotPassword = async (email) => {
  const response = await api.post("/api/auth/forgot-password", { email });
  return response.data;
};

// 重置密碼
export const resetPassword = async (token, newPassword) => {
  const response = await api.post("/api/auth/reset-password", {
    token,
    password: newPassword,
  });
  return response.data;
};

// 驗證郵箱
export const verifyEmail = async (token) => {
  const response = await api.post("/api/auth/verify-email", { token });
  return response.data;
};
