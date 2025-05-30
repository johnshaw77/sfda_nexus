<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script setup>
import { onMounted } from "vue";
import { useAuthStore } from "@/store/auth";
import { useWebSocketStore } from "@/store/websocket";

const authStore = useAuthStore();
const wsStore = useWebSocketStore();

onMounted(async () => {
  // 初始化認證狀態
  await authStore.initializeAuth();

  // 如果已登入，初始化WebSocket連接
  if (authStore.isAuthenticated) {
    wsStore.connect();
  }
});
</script>

<style>
#app {
  min-height: 100vh;
  background: #f5f5f5;
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

::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
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
