/**
 * 認證狀態管理
 * 處理用戶登入、登出、token管理等
 */

import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { message } from "ant-design-vue";
import * as authAPI from "@/api/auth";
import { saveAuth, clearAuth, setAuthHeader } from "@/api/index";

export const useAuthStore = defineStore("auth", () => {
  // 狀態
  const user = ref(null);
  const token = ref(localStorage.getItem("token") || null);
  const refreshToken = ref(localStorage.getItem("refreshToken") || null);
  const isLoading = ref(false);
  const isInitialized = ref(false);

  // 計算屬性
  const isAuthenticated = computed(() => !!token.value && !!user.value);
  const userRole = computed(() => user.value?.role || "user");
  const isAdmin = computed(() =>
    ["admin", "super_admin"].includes(userRole.value)
  );

  // 初始化認證狀態
  const handleInitialize = async () => {
    if (isInitialized.value) return;

    if (!token.value) {
      isInitialized.value = true;
      return;
    }

    try {
      setAuthHeader(token.value);
      await handleGetProfile();
    } catch (error) {
      console.error("初始化認證失敗:", error);
      clearTokens();
    } finally {
      isInitialized.value = true;
    }
  };

  // 保存token
  const saveTokens = (accessToken, refreshTokenValue) => {
    token.value = accessToken;
    refreshToken.value = refreshTokenValue;
    saveAuth(accessToken, refreshTokenValue);
  };

  // 清除token
  const clearTokens = () => {
    token.value = null;
    refreshToken.value = null;
    user.value = null;
    clearAuth();
  };

  // 用戶登入
  const handleLogin = async (credentials) => {
    isLoading.value = true;
    try {
      const response = await authAPI.login(credentials);
      const {
        user: userData,
        access_token: accessToken,
        refresh_token: refreshTokenValue,
      } = response.data;

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
      const response = await authAPI.register(userData);
      const {
        user: newUser,
        access_token: accessToken,
        refresh_token: refreshTokenValue,
      } = response.data;

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
        await authAPI.logout();
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
      const response = await authAPI.getProfile();
      user.value = response.data;
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
      const response = await authAPI.updateProfile(updateData);
      user.value = response.data;
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
      await authAPI.changePassword(passwordData);
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
      const response = await authAPI.refreshToken(refreshToken.value);
      const { access_token: newToken, refresh_token: newRefreshToken } =
        response.data;
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

  return {
    // 狀態
    user,
    token,
    refreshToken,
    isLoading,
    isInitialized,

    // 計算屬性
    isAuthenticated,
    userRole,
    isAdmin,

    // 方法
    handleInitialize,
    handleLogin,
    handleRegister,
    handleLogout,
    handleGetProfile,
    handleUpdateProfile,
    handleChangePassword,
    handleRefreshToken,
    hasPermission,
    clearTokens,
  };
});
