<template>
  <a-config-provider
    :theme="{
      token: {
        colorPrimary: '#1677ff',
      },
      algorithm: themeAlgorithm,
    }">
    <div id="app">
      <router-view />
    </div>
  </a-config-provider>
</template>

<script setup>
import { onMounted, computed, watchEffect, provide } from "vue";
import { theme } from "ant-design-vue";
import { useAuthStore } from "@/stores/auth";
import { useWebSocketStore } from "@/stores/websocket";
import { useConfigStore } from "@/stores/config";

const { darkAlgorithm, defaultAlgorithm } = theme;

const authStore = useAuthStore();
const wsStore = useWebSocketStore();
const configStore = useConfigStore();

// 主題算法
const themeAlgorithm = computed(() =>
  configStore.isDarkMode ? darkAlgorithm : defaultAlgorithm
);

// 為子組件提供主題相關功能
provide("isDarkMode", configStore.isDarkMode);
provide("toggleTheme", configStore.toggleTheme);
provide("configStore", configStore);

onMounted(async () => {
  // 初始化主題
  configStore.initTheme();

  // 初始化認證狀態
  await authStore.handleInitialize();

  // 如果已登入，初始化WebSocket連接
  if (authStore.isAuthenticated) {
    wsStore.connect();
  }

  // 載入配置
  try {
    await configStore.loadConfig();
  } catch (error) {
    console.error("載入應用配置失敗:", error);
  }
});

// 監聽主題變化
watchEffect(() => {
  console.log("App 主題當前為:", configStore.isDarkMode ? "暗黑" : "亮色");
});
</script>

<style>
#app {
  min-height: 100vh;
  background: #f8fafc;
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  margin: 0;
  padding: 0;
}

/* 暗黑模式下的全局背景顏色設定 */
[data-theme="dark"] #app {
  background: #141414;
}

[data-theme="dark"] .ant-layout-sider,
[data-theme="dark"] .ant-menu-dark,
[data-theme="dark"] .site-layout-header {
  background-color: #141414 !important;
}

[data-theme="dark"] .site-layout-header {
  border-bottom: 1px solid #303030;
}

[data-theme="dark"] .ant-layout-sider {
  border-right: 1px solid #303030;
}

/* 確保暗黑模式下的文字和圖標顏色 */
[data-theme="dark"] .trigger,
[data-theme="dark"] .ant-dropdown-link,
[data-theme="dark"] .theme-toggle {
  color: rgba(255, 255, 255, 0.85);
}

/* NProgress 自定義樣式 */
#nprogress .bar {
  /* background: #52c41a !important; */
  height: 2px !important;
}

/* 暗黑模式下的 NProgress 設定 */
[data-theme="dark"] #nprogress .bar {
  opacity: 0.8;
}

/* 全局滾動條樣式 */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

[data-theme="dark"] ::-webkit-scrollbar-track {
  background: #2a2a2a;
}

::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

[data-theme="dark"] ::-webkit-scrollbar-thumb {
  background: #555;
}

::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

[data-theme="dark"] ::-webkit-scrollbar-thumb:hover {
  background: #777;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .ant-layout-sider {
    position: fixed !important;
    z-index: 1000;
    height: 100vh;
  }

  .ant-layout-content {
    margin-left: 0 !important;
  }
}
</style>
