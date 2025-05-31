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

      console.log("配置已載入:", {
        apiBaseUrl: apiBaseUrl.value,
        appName: appName.value,
        version: version.value,
        environment: environment.value,
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

  return {
    apiBaseUrl,
    appName,
    version,
    environment,
    isLoaded,
    loadError,
    loadConfig,
    reloadConfig,
  };
});
