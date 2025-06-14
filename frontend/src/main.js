import { createApp } from "vue";
import { createPinia } from "pinia";
import router from "./router";
import App from "./App.vue";

// Ant Design Vue 樣式
import "ant-design-vue/dist/reset.css";

// 自定義樣式
import "./assets/styles/main.css";

// 引入 NProgress
import NProgress from "nprogress";
import "nprogress/nprogress.css";

// NProgress 配置
NProgress.configure({
  easing: "ease",
  speed: 300,
  showSpinner: false,
  trickleSpeed: 200,
  minimum: 0.3,
});

// 創建應用實例
const app = createApp(App);

// 使用插件
const pinia = createPinia();
app.use(pinia);
app.use(router);

// 引入 antd 的所有 icon
import * as Icons from "@ant-design/icons-vue";

// 註冊所有 icon
for (const [key, component] of Object.entries(Icons)) {
  app.component(key, component);
}

// 引入並註冊全域組件
import CodeHighlight from "./components/common/CodeHighlight.vue";
app.component("CodeHighlight", CodeHighlight);

// 初始化 WebSocket 連接
import { useWebSocketStore } from "./stores/websocket";
import { useAuthStore } from "./stores/auth";

// 在應用掛載後初始化 WebSocket
app.mount("#app");

// 等待 DOM 掛載完成後初始化 WebSocket
setTimeout(() => {
  const authStore = useAuthStore();
  const wsStore = useWebSocketStore();

  // 如果用戶已登錄，自動連接 WebSocket
  if (authStore.token) {
    console.log("🔌 自動連接 WebSocket...");
    wsStore.initialize();
    wsStore.connect();
  }
}, 100);
