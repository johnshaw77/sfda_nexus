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
app.use(createPinia());
app.use(router);

// 掛載應用
app.mount("#app");
