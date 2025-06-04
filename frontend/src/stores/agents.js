import { defineStore } from "pinia";
import { getAgents } from "@/api/chat.js";
import * as agentsApi from "@/api/agents.js";

export const useAgentsStore = defineStore("agents", {
  state: () => ({
    agents: [],
    currentAgent: null,
    loading: false,
    error: null,
    // 管理功能的分頁信息
    pagination: {
      page: 1,
      limit: 20,
      total: 0,
      pages: 0,
    },
  }),

  getters: {
    // 獲取可用的智能體列表
    availableAgents: (state) => state.agents.filter((agent) => agent.is_active),

    // 根據類型獲取智能體
    getAgentsByCategory: (state) => (category) => {
      return state.agents.filter(
        (agent) => agent.category === category && agent.is_active
      );
    },

    // 獲取當前選中的智能體
    getCurrentAgent: (state) => state.currentAgent,

    // 檢查是否有智能體正在載入
    isLoading: (state) => state.loading,

    // 根據 ID 獲取智能體
    getAgentById: (state) => (id) => {
      return state.agents.find((agent) => agent.id === parseInt(id));
    },

    // 根據名稱獲取智能體
    getAgentByName: (state) => (name) => {
      return state.agents.find((agent) => agent.name === name);
    },

    // 獲取所有智能體（包括管理功能）
    getAllAgents: (state) => state.agents,

    // 獲取錯誤信息
    getError: (state) => state.error,

    // 獲取分頁信息
    getPagination: (state) => state.pagination,
  },

  actions: {
    // 獲取所有智能體（聊天功能用）
    async fetchAgents(params = {}) {
      this.loading = true;
      this.error = null;

      try {
        const response = await getAgents(params);

        if (response.success) {
          // 安全的 JSON 解析函數
          const safeJsonParse = (str, fallback = null) => {
            if (typeof str !== "string") return str;
            if (str.startsWith("data:")) return str; // 如果是 data URL，直接返回
            try {
              return JSON.parse(str);
            } catch {
              return fallback;
            }
          };

          // 處理智能體數據，解析 JSON 字段
          this.agents = response.data.map((agent) => ({
            ...agent,
            // 解析 JSON 字段
            avatar: safeJsonParse(agent.avatar, agent.avatar),
            tags: safeJsonParse(agent.tags, []),
            capabilities: safeJsonParse(agent.capabilities, []),
            tools: safeJsonParse(agent.tools, []),
          }));
        } else {
          throw new Error(response.message || "獲取智能體列表失敗");
        }
      } catch (error) {
        this.error = error.message;
        console.error("獲取智能體失敗:", error);
        // 如果 API 失敗，使用空數組避免界面崩潰
        this.agents = [];
      } finally {
        this.loading = false;
      }
    },

    // 獲取智能體列表（管理功能用）
    async fetchAgentsForAdmin(params = {}) {
      this.loading = true;
      this.error = null;

      try {
        const response = await agentsApi.getAgents(params);

        if (response.success) {
          this.agents = response.data.data || [];
          this.pagination = response.data.pagination || {
            page: 1,
            limit: 20,
            total: 0,
            pages: 0,
          };
        } else {
          throw new Error(response.message || "獲取智能體列表失敗");
        }
      } catch (error) {
        this.error = error.message;
        console.error("獲取智能體失敗:", error);
        // 如果 API 失敗，使用空數組避免界面崩潰
        this.agents = [];
        this.pagination = {
          page: 1,
          limit: 20,
          total: 0,
          pages: 0,
        };
      } finally {
        this.loading = false;
      }
    },

    // 創建智能體（管理功能）
    async createAgent(agentData) {
      try {
        const response = await agentsApi.createAgent(agentData);

        if (response.success) {
          // 將新智能體添加到列表開頭
          this.agents.unshift(response.data);
          this.pagination.total += 1;
          return response.data;
        } else {
          throw new Error(response.message || "創建智能體失敗");
        }
      } catch (error) {
        this.error = error.message;
        console.error("創建智能體失敗:", error);
        throw error;
      }
    },

    // 更新智能體
    async updateAgent(agentId, updateData) {
      try {
        const response = await agentsApi.updateAgent(agentId, updateData);

        if (response.success) {
          // 更新本地數據
          const index = this.agents.findIndex(
            (agent) => agent.id === parseInt(agentId)
          );
          if (index > -1) {
            this.agents[index] = response.data;
          }
          return response.data;
        } else {
          throw new Error(response.message || "更新智能體失敗");
        }
      } catch (error) {
        this.error = error.message;
        console.error("更新智能體失敗:", error);
        throw error;
      }
    },

    // 刪除智能體
    async deleteAgent(agentId) {
      try {
        const response = await agentsApi.deleteAgent(agentId);

        if (response.success) {
          // 從本地數據中移除
          const index = this.agents.findIndex(
            (agent) => agent.id === parseInt(agentId)
          );
          if (index > -1) {
            this.agents.splice(index, 1);
            this.pagination.total -= 1;
          }
          return true;
        } else {
          throw new Error(response.message || "刪除智能體失敗");
        }
      } catch (error) {
        this.error = error.message;
        console.error("刪除智能體失敗:", error);
        throw error;
      }
    },

    // 複製智能體（管理功能）
    async duplicateAgent(agentId) {
      try {
        const response = await agentsApi.duplicateAgent(agentId);

        if (response.success) {
          // 將複製的智能體添加到列表
          this.agents.unshift(response.data);
          this.pagination.total += 1;
          return response.data;
        } else {
          throw new Error(response.message || "複製智能體失敗");
        }
      } catch (error) {
        this.error = error.message;
        console.error("複製智能體失敗:", error);
        throw error;
      }
    },

    // 設置當前智能體
    setCurrentAgent(agent) {
      this.currentAgent = agent;
      // 保存到本地存儲
      if (agent) {
        localStorage.setItem("currentAgent", JSON.stringify(agent));
      } else {
        localStorage.removeItem("currentAgent");
      }
    },

    // 從本地存儲恢復當前智能體
    restoreCurrentAgent() {
      try {
        const saved = localStorage.getItem("currentAgent");
        if (saved) {
          this.currentAgent = JSON.parse(saved);
        }
      } catch (error) {
        console.error("恢復當前智能體失敗:", error);
        localStorage.removeItem("currentAgent");
      }
    },

    // 根據 ID 設置當前智能體
    setCurrentAgentById(agentId) {
      const agent = this.getAgentById(agentId);
      if (agent) {
        this.setCurrentAgent(agent);
      }
      return agent;
    },

    // 根據名稱設置當前智能體
    setCurrentAgentByName(agentName) {
      const agent = this.getAgentByName(agentName);
      if (agent) {
        this.setCurrentAgent(agent);
      }
      return agent;
    },

    // 初始化智能體數據
    async initialize() {
      // 恢復當前智能體
      this.restoreCurrentAgent();

      // 獲取智能體列表
      await this.fetchAgents();

      // 如果有當前智能體但不在列表中，清除它
      if (this.currentAgent) {
        const exists = this.getAgentById(this.currentAgent.id);
        if (!exists) {
          this.setCurrentAgent(null);
        }
      }
    },

    // 更新智能體狀態
    async updateAgentStatus(agentId, isActive) {
      try {
        const response = await agentsApi.updateAgent(agentId, {
          is_active: isActive,
        });

        if (response.success) {
          // 更新本地數據
          const agent = this.agents.find(
            (agent) => agent.id === parseInt(agentId)
          );
          if (agent) {
            agent.is_active = isActive;
          }
          return true;
        } else {
          throw new Error(response.message || "更新智能體狀態失敗");
        }
      } catch (error) {
        this.error = error.message;
        console.error("更新智能體狀態失敗:", error);
        throw error;
      }
    },

    // 添加智能體
    async addAgent(agentData) {
      try {
        // 這裡應該調用 API 添加智能體
        // const newAgent = await createAgent(agentData);

        // 暫時添加到本地數組
        const newAgent = {
          ...agentData,
          id: Date.now(), // 臨時 ID
          created_at: new Date().toISOString(),
          is_active: true,
        };

        this.agents.unshift(newAgent);
        return newAgent;
      } catch (error) {
        console.error("添加智能體失敗:", error);
        this.error = error.message || "添加智能體失敗";
        throw error;
      }
    },

    // 清除錯誤
    clearError() {
      this.error = null;
    },

    // 重置狀態
    reset() {
      this.agents = [];
      this.loading = false;
      this.error = null;
      this.pagination = {
        page: 1,
        limit: 20,
        total: 0,
        pages: 0,
      };
    },
  },
});
