import { defineStore } from "pinia";

export const useAppStore = defineStore("app", {
  state: () => ({
    // 主題設置
    theme: "light",

    // 語言設置
    locale: "zh-TW",

    // 側邊欄狀態
    sidebarCollapsed: false,

    // 載入狀態
    globalLoading: false,

    // 通知設置
    notifications: {
      enabled: true,
      sound: true,
      desktop: false,
    },

    // 系統設置
    settings: {
      autoSave: true,
      autoSaveInterval: 30000, // 30秒
      maxChatHistory: 100,
      enableShortcuts: true,
    },

    // 用戶偏好設置
    preferences: {
      chatBubbleStyle: "modern",
      fontSize: "medium",
      codeTheme: "vs-dark",
      showTimestamp: true,
      enableMarkdown: true,
    },

    // 系統狀態
    systemStatus: {
      online: true,
      lastSync: null,
      version: "1.0.0",
    },

    // 錯誤狀態
    errors: [],

    // 成功訊息
    messages: [],
  }),

  getters: {
    // 檢查是否為暗色主題
    isDarkTheme: (state) => state.theme === "dark",

    // 獲取當前語言
    getCurrentLocale: (state) => state.locale,

    // 檢查側邊欄是否收起
    isSidebarCollapsed: (state) => state.sidebarCollapsed,

    // 檢查是否有全局載入
    isGlobalLoading: (state) => state.globalLoading,

    // 獲取通知設置
    getNotificationSettings: (state) => state.notifications,

    // 獲取系統設置
    getSystemSettings: (state) => state.settings,

    // 獲取用戶偏好
    getUserPreferences: (state) => state.preferences,

    // 獲取系統狀態
    getSystemStatus: (state) => state.systemStatus,

    // 檢查是否在線
    isOnline: (state) => state.systemStatus.online,

    // 獲取未讀錯誤數量
    getErrorCount: (state) =>
      state.errors.filter((error) => !error.read).length,

    // 獲取未讀訊息數量
    getMessageCount: (state) =>
      state.messages.filter((message) => !message.read).length,
  },

  actions: {
    // 設置主題
    setTheme(theme) {
      this.theme = theme;
      document.documentElement.setAttribute("data-theme", theme);
      localStorage.setItem("app-theme", theme);
    },

    // 切換主題
    toggleTheme() {
      const newTheme = this.theme === "light" ? "dark" : "light";
      this.setTheme(newTheme);
    },

    // 設置語言
    setLocale(locale) {
      this.locale = locale;
      localStorage.setItem("app-locale", locale);
    },

    // 切換側邊欄
    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed;
      localStorage.setItem(
        "sidebar-collapsed",
        this.sidebarCollapsed.toString()
      );
    },

    // 設置側邊欄狀態
    setSidebarCollapsed(collapsed) {
      this.sidebarCollapsed = collapsed;
      localStorage.setItem("sidebar-collapsed", collapsed.toString());
    },

    // 設置全局載入狀態
    setGlobalLoading(loading) {
      this.globalLoading = loading;
    },

    // 更新通知設置
    updateNotificationSettings(settings) {
      this.notifications = { ...this.notifications, ...settings };
      localStorage.setItem(
        "notification-settings",
        JSON.stringify(this.notifications)
      );
    },

    // 更新系統設置
    updateSystemSettings(settings) {
      this.settings = { ...this.settings, ...settings };
      localStorage.setItem("system-settings", JSON.stringify(this.settings));
    },

    // 更新用戶偏好
    updateUserPreferences(preferences) {
      this.preferences = { ...this.preferences, ...preferences };
      localStorage.setItem(
        "user-preferences",
        JSON.stringify(this.preferences)
      );
    },

    // 更新系統狀態
    updateSystemStatus(status) {
      this.systemStatus = { ...this.systemStatus, ...status };
    },

    // 設置在線狀態
    setOnlineStatus(online) {
      this.systemStatus.online = online;
      if (online) {
        this.systemStatus.lastSync = new Date().toISOString();
      }
    },

    // 添加錯誤
    addError(error) {
      const errorItem = {
        id: Date.now(),
        message: error.message || error,
        type: error.type || "error",
        timestamp: new Date().toISOString(),
        read: false,
      };
      this.errors.unshift(errorItem);

      // 限制錯誤數量
      if (this.errors.length > 50) {
        this.errors = this.errors.slice(0, 50);
      }
    },

    // 添加成功訊息
    addMessage(message) {
      const messageItem = {
        id: Date.now(),
        message: message.message || message,
        type: message.type || "success",
        timestamp: new Date().toISOString(),
        read: false,
      };
      this.messages.unshift(messageItem);

      // 限制訊息數量
      if (this.messages.length > 50) {
        this.messages = this.messages.slice(0, 50);
      }
    },

    // 標記錯誤為已讀
    markErrorAsRead(errorId) {
      const error = this.errors.find((e) => e.id === errorId);
      if (error) {
        error.read = true;
      }
    },

    // 標記訊息為已讀
    markMessageAsRead(messageId) {
      const message = this.messages.find((m) => m.id === messageId);
      if (message) {
        message.read = true;
      }
    },

    // 清除所有錯誤
    clearErrors() {
      this.errors = [];
    },

    // 清除所有訊息
    clearMessages() {
      this.messages = [];
    },

    // 從本地存儲恢復設置
    restoreSettings() {
      try {
        // 恢復主題
        const savedTheme = localStorage.getItem("app-theme");
        if (savedTheme) {
          this.setTheme(savedTheme);
        }

        // 恢復語言
        const savedLocale = localStorage.getItem("app-locale");
        if (savedLocale) {
          this.locale = savedLocale;
        }

        // 恢復側邊欄狀態
        const savedSidebarState = localStorage.getItem("sidebar-collapsed");
        if (savedSidebarState !== null) {
          this.sidebarCollapsed = savedSidebarState === "true";
        }

        // 恢復通知設置
        const savedNotifications = localStorage.getItem(
          "notification-settings"
        );
        if (savedNotifications) {
          this.notifications = JSON.parse(savedNotifications);
        }

        // 恢復系統設置
        const savedSystemSettings = localStorage.getItem("system-settings");
        if (savedSystemSettings) {
          this.settings = JSON.parse(savedSystemSettings);
        }

        // 恢復用戶偏好
        const savedPreferences = localStorage.getItem("user-preferences");
        if (savedPreferences) {
          this.preferences = JSON.parse(savedPreferences);
        }
      } catch (error) {
        console.error("恢復設置失敗:", error);
      }
    },

    // 重置所有設置
    resetSettings() {
      // 清除本地存儲
      localStorage.removeItem("app-theme");
      localStorage.removeItem("app-locale");
      localStorage.removeItem("sidebar-collapsed");
      localStorage.removeItem("notification-settings");
      localStorage.removeItem("system-settings");
      localStorage.removeItem("user-preferences");

      // 重置狀態
      this.theme = "light";
      this.locale = "zh-TW";
      this.sidebarCollapsed = false;
      this.notifications = {
        enabled: true,
        sound: true,
        desktop: false,
      };
      this.settings = {
        autoSave: true,
        autoSaveInterval: 30000,
        maxChatHistory: 100,
        enableShortcuts: true,
      };
      this.preferences = {
        chatBubbleStyle: "modern",
        fontSize: "medium",
        codeTheme: "vs-dark",
        showTimestamp: true,
        enableMarkdown: true,
      };

      // 應用主題
      document.documentElement.setAttribute("data-theme", this.theme);
    },
  },
});
