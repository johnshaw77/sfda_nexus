/**
 * 認證狀態管理
 * 處理用戶登入、登出、token管理等
 */

import { defineStore } from "pinia";
import { ref, computed } from "vue";
import axios from "axios";
import { message } from "ant-design-vue";

export const useAuthStore = defineStore("auth", () => {
  // 狀態
  const user = ref(null);
  const token = ref(localStorage.getItem("token") || null);
  const refreshToken = ref(localStorage.getItem("refreshToken") || null);
  const isLoading = ref(false);

  // 計算屬性
  const isAuthenticated = computed(() => !!token.value && !!user.value);
  const userRole = computed(() => user.value?.role || "user");
  const isAdmin = computed(() =>
    ["admin", "super_admin"].includes(userRole.value)
  );

  // 設置axios默認headers
  const setAuthHeader = (authToken) => {
    if (authToken) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${authToken}`;
    } else {
      delete axios.defaults.headers.common["Authorization"];
    }
  };

  // 保存token到localStorage
  const saveTokens = (accessToken, refreshTokenValue) => {
    token.value = accessToken;
    refreshToken.value = refreshTokenValue;
    localStorage.setItem("token", accessToken);
    localStorage.setItem("refreshToken", refreshTokenValue);
    setAuthHeader(accessToken);
  };

  // 清除token
  const clearTokens = () => {
    token.value = null;
    refreshToken.value = null;
    user.value = null;
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    setAuthHeader(null);
  };

  // 初始化認證狀態
  const initializeAuth = async () => {
    if (!token.value) return;

    try {
      setAuthHeader(token.value);
      await handleGetProfile();
    } catch (error) {
      console.error("初始化認證失敗:", error);
      clearTokens();
    }
  };

  // 用戶登入
  const handleLogin = async (credentials) => {
    isLoading.value = true;
    try {
      const response = await axios.post("/api/auth/login", credentials);
      const {
        user: userData,
        token: accessToken,
        refreshToken: refreshTokenValue,
      } = response.data.data;

      user.value = userData;
      saveTokens(accessToken, refreshTokenValue);

      message.success("登入成功");
      return { success: true, user: userData };
    } catch (error) {
      const errorMessage = error.response?.data?.message || "登入失敗";
      message.error(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      isLoading.value = false;
    }
  };

  // 用戶註冊
  const handleRegister = async (userData) => {
    isLoading.value = true;
    try {
      const response = await axios.post("/api/auth/register", userData);
      const {
        user: newUser,
        token: accessToken,
        refreshToken: refreshTokenValue,
      } = response.data.data;

      user.value = newUser;
      saveTokens(accessToken, refreshTokenValue);

      message.success("註冊成功");
      return { success: true, user: newUser };
    } catch (error) {
      const errorMessage = error.response?.data?.message || "註冊失敗";
      message.error(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      isLoading.value = false;
    }
  };

  // 用戶登出
  const handleLogout = async () => {
    try {
      if (token.value) {
        await axios.post("/api/auth/logout");
      }
    } catch (error) {
      console.error("登出請求失敗:", error);
    } finally {
      clearTokens();
      message.success("已登出");
    }
  };

  // 獲取用戶資料
  const handleGetProfile = async () => {
    try {
      const response = await axios.get("/api/auth/profile");
      user.value = response.data.data;
      return user.value;
    } catch (error) {
      console.error("獲取用戶資料失敗:", error);
      throw error;
    }
  };

  // 更新用戶資料
  const handleUpdateProfile = async (updateData) => {
    isLoading.value = true;
    try {
      const response = await axios.put("/api/auth/profile", updateData);
      user.value = response.data.data;
      message.success("資料更新成功");
      return { success: true, user: user.value };
    } catch (error) {
      const errorMessage = error.response?.data?.message || "更新失敗";
      message.error(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      isLoading.value = false;
    }
  };

  // 修改密碼
  const handleChangePassword = async (passwordData) => {
    isLoading.value = true;
    try {
      await axios.put("/api/auth/change-password", passwordData);
      message.success("密碼修改成功");
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || "密碼修改失敗";
      message.error(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      isLoading.value = false;
    }
  };

  // 刷新token
  const handleRefreshToken = async () => {
    if (!refreshToken.value) {
      throw new Error("沒有refresh token");
    }

    try {
      const response = await axios.post("/api/auth/refresh", {
        refreshToken: refreshToken.value,
      });

      const { token: newToken, refreshToken: newRefreshToken } =
        response.data.data;
      saveTokens(newToken, newRefreshToken);

      return newToken;
    } catch (error) {
      clearTokens();
      throw error;
    }
  };

  // 檢查權限
  const hasPermission = (requiredRole) => {
    if (!user.value) return false;

    const roleHierarchy = {
      user: 1,
      admin: 2,
      super_admin: 3,
    };

    const userLevel = roleHierarchy[user.value.role] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;

    return userLevel >= requiredLevel;
  };

  // 設置axios攔截器處理token刷新
  const setupAxiosInterceptors = () => {
    // 請求攔截器
    axios.interceptors.request.use(
      (config) => {
        if (token.value) {
          config.headers.Authorization = `Bearer ${token.value}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // 響應攔截器
    axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const newToken = await handleRefreshToken();
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return axios(originalRequest);
          } catch (refreshError) {
            clearTokens();
            window.location.href = "/login";
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  };

  return {
    // 狀態
    user,
    token,
    refreshToken,
    isLoading,

    // 計算屬性
    isAuthenticated,
    userRole,
    isAdmin,

    // 方法
    initializeAuth,
    handleLogin,
    handleRegister,
    handleLogout,
    handleGetProfile,
    handleUpdateProfile,
    handleChangePassword,
    handleRefreshToken,
    hasPermission,
    setupAxiosInterceptors,
    clearTokens,
  };
});
