/**
 * API 基礎配置
 * 統一管理 axios 實例和攔截器
 */

import axios from "axios";
import { message } from "ant-design-vue";
import NProgress from "nprogress";
import "nprogress/nprogress.css";
import { useConfigStore } from "@/stores/config";

// NProgress 配置
NProgress.configure({
  showSpinner: false,
  minimum: 0.1,
  speed: 500,
});

// 確保配置已載入的函數
const ensureConfigLoaded = async () => {
  const configStore = useConfigStore();
  if (!configStore.isLoaded) {
    await configStore.loadConfig();
  }
  return configStore;
};

// 創建 axios 實例
const api = axios.create({
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
  async (config) => {
    // 獲取配置並設置 baseURL
    const configStore = await ensureConfigLoaded();
    if (!config.baseURL) {
      config.baseURL = configStore.apiBaseUrl;
    }

    // 啟動進度條
    NProgress.start();

    // 自動添加認證 header
    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }

    // 添加請求時間戳（用於調試）
    config.metadata = { startTime: new Date() };

    return config;
  },
  (error) => {
    NProgress.done();
    return Promise.reject(error);
  }
);

// 響應攔截器
api.interceptors.response.use(
  (response) => {
    // 完成進度條
    NProgress.done();

    // 計算請求耗時（用於調試）
    const endTime = new Date();
    const duration = endTime - response.config.metadata.startTime;
    //console.log(`API 請求耗時: ${duration}ms - ${response.config.url}`);

    // 調試：打印詳細回應信息（僅針對聊天 API）
    if (
      response.config.url.includes("/chat/conversations/") &&
      response.config.url.includes("/messages")
    ) {
      // console.log("=== API 回應攔截器調試 ===");
      // console.log("請求 URL:", response.config.url);
      // console.log("請求方法:", response.config.method);
      // console.log("回應狀態:", response.status);
      // console.log("回應 headers:", response.headers);
      // console.log("回應數據:", response.data);
      // console.log("=== API 回應攔截器調試結束 ===\n");
    }

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

    // 完成進度條
    NProgress.done();

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
