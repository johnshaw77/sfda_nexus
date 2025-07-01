/**
 * 模型與智能體管理 Composable
 * 處理可用模型、智能體的獲取和管理
 */

import { ref } from "vue";
import api from "@/api/index.js";
import { message } from "ant-design-vue";

export function useModels() {
  // 狀態管理
  const availableModels = ref({
    ollama: [],
    gemini: [],
    openai: [],
    claude: [],
  });
  const availableAgents = ref([]);
  const isLoadingModels = ref(false);
  const isLoadingAgents = ref(false);

  // 獲取可用模型
  const handleGetAvailableModels = async () => {
    isLoadingModels.value = true;
    try {
      const response = await api.get("/api/chat/models");
      availableModels.value = response.data.data;
      return availableModels.value;
    } catch (error) {
      console.error("獲取可用模型失敗:", error);
      message.error("獲取可用模型失敗");
      return { ollama: [], gemini: [], openai: [], claude: [] };
    } finally {
      isLoadingModels.value = false;
    }
  };

  // 獲取可用智能體
  const handleGetAvailableAgents = async (params = {}) => {
    isLoadingAgents.value = true;
    try {
      const response = await api.get("/api/chat/agents", { params });
      availableAgents.value = response.data.data;
      return availableAgents.value;
    } catch (error) {
      console.error("獲取可用智能體失敗:", error);
      message.error("獲取可用智能體失敗");
      return [];
    } finally {
      isLoadingAgents.value = false;
    }
  };

  // 獲取特定模型信息
  const getModelInfo = (modelId) => {
    for (const provider in availableModels.value) {
      const model = availableModels.value[provider].find(
        (m) => m.id === modelId
      );
      if (model) {
        return { ...model, provider };
      }
    }
    return null;
  };

  // 獲取特定智能體信息
  const getAgentInfo = (agentId) => {
    return availableAgents.value.find((agent) => agent.id === agentId) || null;
  };

  // 檢查模型是否可用
  const isModelAvailable = (modelId) => {
    return getModelInfo(modelId) !== null;
  };

  // 檢查智能體是否可用
  const isAgentAvailable = (agentId) => {
    return getAgentInfo(agentId) !== null;
  };

  // 按提供商獲取模型
  const getModelsByProvider = (provider) => {
    return availableModels.value[provider] || [];
  };

  // 獲取所有模型（扁平化）
  const getAllModels = () => {
    const allModels = [];
    for (const provider in availableModels.value) {
      availableModels.value[provider].forEach((model) => {
        allModels.push({ ...model, provider });
      });
    }
    return allModels;
  };

  // 搜索模型
  const searchModels = (keyword) => {
    const allModels = getAllModels();
    return allModels.filter(
      (model) =>
        model.name.toLowerCase().includes(keyword.toLowerCase()) ||
        model.id.toLowerCase().includes(keyword.toLowerCase()) ||
        model.provider.toLowerCase().includes(keyword.toLowerCase())
    );
  };

  // 搜索智能體
  const searchAgents = (keyword) => {
    return availableAgents.value.filter(
      (agent) =>
        agent.name.toLowerCase().includes(keyword.toLowerCase()) ||
        agent.description?.toLowerCase().includes(keyword.toLowerCase())
    );
  };

  // 初始化模型和智能體數據
  const initializeModelsAndAgents = async () => {
    await Promise.all([handleGetAvailableModels(), handleGetAvailableAgents()]);
  };

  return {
    // 狀態
    availableModels,
    availableAgents,
    isLoadingModels,
    isLoadingAgents,

    // 方法
    handleGetAvailableModels,
    handleGetAvailableAgents,
    getModelInfo,
    getAgentInfo,
    isModelAvailable,
    isAgentAvailable,
    getModelsByProvider,
    getAllModels,
    searchModels,
    searchAgents,
    initializeModelsAndAgents,
  };
}
