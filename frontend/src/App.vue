<template>
  <a-config-provider
    :locale="zhTW"
    :theme="{
      token: {
        colorPrimary: configStore.colorPrimary,
      },
      algorithm: themeAlgorithm,
    }">
    <div
      id="app"
      :style="{
        '--ant-primary-color': configStore.colorPrimary,
        '--primary-color': configStore.colorPrimary,
      }">
      <router-view />
    </div>
  </a-config-provider>
</template>

<script setup>
import { onMounted, computed, watchEffect, provide } from "vue";
import { theme } from "ant-design-vue";
import zhTW from "ant-design-vue/es/locale/zh_TW";
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
  // console.log("App 主題當前為:", configStore.isDarkMode ? "暗黑" : "亮色");
  // console.log("主色調為:", configStore.colorPrimary);
});
</script>

<style>
html,
body {
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
}

#app {
  height: 100vh;
  background: var(--custom-bg-primary);
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* 暗黑模式下的全局背景顏色設定 */
[data-theme="dark"] #app {
  background: var(--custom-bg-primary);
}

/* Ant Design 組件的暗黑模式適配 */
[data-theme="dark"] .ant-layout-sider,
[data-theme="dark"] .ant-menu-dark {
  background-color: #1f1f1f !important;
}

[data-theme="dark"] .ant-layout-header {
  background-color: #1f1f1f !important;
  border-bottom: 1px solid #303030;
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
