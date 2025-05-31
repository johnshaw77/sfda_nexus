<script setup>
import { ref, computed, watchEffect, provide, onMounted } from "vue";
import { theme } from "ant-design-vue";
import { useConfigStore } from "@/stores/config";

const { darkAlgorithm, defaultAlgorithm } = theme;

// 初始化配置存儲
const configStore = useConfigStore();

// 在 App 中管理暗黑模式狀態
const isDarkMode = ref(localStorage.getItem("theme") === "dark");

// 主題算法
const themeAlgorithm = computed(() =>
  isDarkMode.value ? darkAlgorithm : defaultAlgorithm
);

// 切換主題
const toggleTheme = () => {
  isDarkMode.value = !isDarkMode.value;
  const themeValue = isDarkMode.value ? "dark" : "light";
  localStorage.setItem("theme", themeValue);
  document.documentElement.setAttribute("data-theme", themeValue);
  console.log("主題已切換為:", isDarkMode.value ? "暗黑" : "亮色");
};

// 初始化主題
const initTheme = () => {
  const savedTheme = localStorage.getItem("theme") || "dark";
  document.documentElement.setAttribute("data-theme", savedTheme);
};

// 為子組件提供主題和切換函數
provide("isDarkMode", isDarkMode);
provide("toggleTheme", toggleTheme);
// 提供配置存儲給全局使用
provide("configStore", configStore);

// 組件掛載時載入配置
onMounted(async () => {
  try {
    await configStore.loadConfig();
  } catch (error) {
    console.error("載入應用配置失敗:", error);
  }
});

// 監聽主題變化
watchEffect(() => {
  // console.log("App 主題當前為:", isDarkMode.value ? "暗黑" : "亮色");
});

// 執行初始化
initTheme();
</script>

<template>
  <a-config-provider
    :theme="{
      token: {
        colorPrimary: '#52c41a',
      },
      algorithm: themeAlgorithm,
    }">
    <router-view />
  </a-config-provider>
</template>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  margin: 0;
  padding: 0;
}

/* 暗黑模式下的全局背景顏色設定 - 只針對主佈局組件 */
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
/* #nprogress .bar {
  background: v-bind('isDarkMode ? "#52c41a" : "#52c41a"') !important;
  height: 6px !important;
} */

/* NProgress 自定義樣式 */
#nprogress .bar {
  background: #52c41a !important;
  height: 2px !important;
}

/* 暗黑模式下的 NProgress 設定 */
[data-theme="dark"] #nprogress .bar {
  opacity: 0.8;
}

/* 亮色模式下的 NProgress 設定 
[data-theme="light"] #nprogress .bar {
  box-shadow: 0 0 10px rgba(24, 144, 255, 0.7);
}*/
</style>
