import { defineStore } from "pinia";

export const useModelsStore = defineStore("models", {
  state: () => ({
    models: [],
    currentModel: null,
    loading: false,
    error: null,
  }),

  getters: {
    // 獲取可用的模型列表
    availableModels: (state) =>
      state.models.filter((model) => model.status === "active"),

    // 根據類型獲取模型
    getModelsByType: (state) => (type) => {
      return state.models.filter(
        (model) => model.type === type && model.status === "active"
      );
    },

    // 獲取當前選中的模型
    getCurrentModel: (state) => state.currentModel,

    // 檢查是否有模型正在載入
    isLoading: (state) => state.loading,
  },

  actions: {
    // 獲取所有模型
    async fetchModels() {
      this.loading = true;
      this.error = null;

      try {
        // TODO: 實現 API 調用
        const response = await fetch("/api/models");
        const data = await response.json();

        if (response.ok) {
          this.models = data.models || [];
        } else {
          throw new Error(data.message || "獲取模型列表失敗");
        }
      } catch (error) {
        this.error = error.message;
        console.error("獲取模型失敗:", error);
      } finally {
        this.loading = false;
      }
    },

    // 設置當前模型
    setCurrentModel(model) {
      this.currentModel = model;
      // 保存到本地存儲
      if (model) {
        localStorage.setItem("currentModel", JSON.stringify(model));
      } else {
        localStorage.removeItem("currentModel");
      }
    },

    // 從本地存儲恢復當前模型
    restoreCurrentModel() {
      try {
        const saved = localStorage.getItem("currentModel");
        if (saved) {
          this.currentModel = JSON.parse(saved);
        }
      } catch (error) {
        console.error("恢復當前模型失敗:", error);
        localStorage.removeItem("currentModel");
      }
    },

    // 清除錯誤
    clearError() {
      this.error = null;
    },
  },
});
