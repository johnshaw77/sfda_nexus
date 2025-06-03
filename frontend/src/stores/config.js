import { defineStore } from "pinia";
import { ref } from "vue";

export const useConfigStore = defineStore("config", () => {
  // 配置狀態
  const apiBaseUrl = ref("http://localhost:3000/api"); // 預設值
  const appName = ref("SFDA_Nexus");
  const version = ref("1.0.0");
  const environment = ref("development");
  const isLoaded = ref(false);
  const loadError = ref(null);
  const colorPrimary = ref("#1677ff"); // 使用 Ant Design 預設主色調，確保與 ConfigProvider 一致

  // 主題相關狀態
  const isDarkMode = ref(localStorage.getItem("theme") === "dark");

  // 聊天設置狀態
  const chatSettings = ref({
    fontSize: parseInt(localStorage.getItem("chatFontSize")) || 14,
    useStreamMode: localStorage.getItem("useStreamMode") !== "false", // 默認啟用串流
    useRealtimeRender: localStorage.getItem("useRealtimeRender") === "true", // 默認為等待渲染
  });

  // 載入配置文件
  const loadConfig = async () => {
    if (isLoaded.value) return;

    try {
      const response = await fetch("/config.json?t=" + Date.now());
      if (!response.ok) {
        throw new Error(
          `無法載入配置文件: ${response.status} ${response.statusText}`
        );
      }

      const config = await response.json();

      // 更新配置值
      apiBaseUrl.value = config.apiBaseUrl || apiBaseUrl.value;
      appName.value = config.appName || appName.value;
      version.value = config.version || version.value;
      environment.value = config.environment || environment.value;
      colorPrimary.value = config.colorPrimary || colorPrimary.value;

      console.log("配置已載入:", {
        apiBaseUrl: apiBaseUrl.value,
        appName: appName.value,
        version: version.value,
        environment: environment.value,
        colorPrimary: colorPrimary.value,
      });

      isLoaded.value = true;
      loadError.value = null;
    } catch (error) {
      console.error("載入配置失敗:", error);
      loadError.value = error.message;
      isLoaded.value = true; // 即使失敗也標記為已嘗試載入
    }
  };

  // 重新載入配置
  const reloadConfig = () => {
    isLoaded.value = false;
    return loadConfig();
  };

  // 更新主色調
  const updatePrimaryColor = (color) => {
    colorPrimary.value = color;
    localStorage.setItem("primaryColor", color);
    console.log("主色調已更新為:", color);
  };

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
    isDarkMode.value = savedTheme === "dark";
    document.documentElement.setAttribute("data-theme", savedTheme);

    // 初始化主色調
    const savedColor = localStorage.getItem("primaryColor");
    if (savedColor) {
      colorPrimary.value = savedColor;
    }
  };

  // 更新聊天字體大小
  const updateChatFontSize = (size) => {
    chatSettings.value.fontSize = size;
    localStorage.setItem("chatFontSize", size.toString());
    console.log("聊天字體大小已更新為:", size);
  };

  // 切換串流模式
  const toggleStreamMode = () => {
    chatSettings.value.useStreamMode = !chatSettings.value.useStreamMode;
    localStorage.setItem(
      "useStreamMode",
      chatSettings.value.useStreamMode.toString()
    );
    console.log(
      "串流模式已切換為:",
      chatSettings.value.useStreamMode ? "啟用" : "停用"
    );
  };

  // 切換即時渲染模式
  const toggleRealtimeRender = () => {
    chatSettings.value.useRealtimeRender =
      !chatSettings.value.useRealtimeRender;
    localStorage.setItem(
      "useRealtimeRender",
      chatSettings.value.useRealtimeRender.toString()
    );
    console.log(
      "即時渲染模式已切換為:",
      chatSettings.value.useRealtimeRender ? "啟用" : "停用"
    );
  };

  return {
    apiBaseUrl,
    appName,
    version,
    environment,
    isLoaded,
    loadError,
    colorPrimary,
    loadConfig,
    reloadConfig,
    updatePrimaryColor,
    // 主題相關
    isDarkMode,
    toggleTheme,
    initTheme,
    // 聊天設置相關
    chatSettings,
    updateChatFontSize,
    toggleStreamMode,
    toggleRealtimeRender,
  };
});
