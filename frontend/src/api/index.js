/**
 * API 基礎配置
 * 統一管理 axios 實例和攔截器
 */

import axios from "axios";
import { message } from "ant-design-vue";

// 創建 axios 實例
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:3000",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Token 管理
let authToken = localStorage.getItem("token");
let refreshToken = localStorage.getItem("refreshToken");

// 設置認證 header
export const setAuthHeader = (token) => {
  authToken = token;
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
};

// 清除認證信息
export const clearAuth = () => {
  authToken = null;
  refreshToken = null;
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  setAuthHeader(null);
};

// 保存認證信息
export const saveAuth = (token, refresh) => {
  authToken = token;
  refreshToken = refresh;
  localStorage.setItem("token", token);
  localStorage.setItem("refreshToken", refresh);
  setAuthHeader(token);
};

// 請求攔截器
api.interceptors.request.use(
  (config) => {
    // 自動添加認證 header
    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }

    // 添加請求時間戳（用於調試）
    config.metadata = { startTime: new Date() };

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 響應攔截器
api.interceptors.response.use(
  (response) => {
    // 計算請求耗時（用於調試）
    const endTime = new Date();
    const duration = endTime - response.config.metadata.startTime;
    console.log(`API 請求耗時: ${duration}ms - ${response.config.url}`);

    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // 處理 401 錯誤（token 過期）
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // 嘗試刷新 token
        if (refreshToken) {
          const response = await api.post("/api/auth/refresh", {
            refreshToken,
          });

          const { token: newToken, refreshToken: newRefreshToken } =
            response.data.data;
          saveAuth(newToken, newRefreshToken);

          // 重新發送原始請求
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // 刷新失敗，清除認證信息並跳轉到登入頁
        clearAuth();
        window.location.href = "/auth/login";
        return Promise.reject(refreshError);
      }
    }

    // 處理其他錯誤
    const errorMessage =
      error.response?.data?.message || error.message || "請求失敗";

    // 只在非靜默請求時顯示錯誤消息
    if (!originalRequest.silent) {
      message.error(errorMessage);
    }

    return Promise.reject(error);
  }
);

// 初始化認證狀態
if (authToken) {
  setAuthHeader(authToken);
}

export default api;
