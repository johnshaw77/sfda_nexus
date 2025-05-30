import { defineStore } from "pinia";

export const useAgentsStore = defineStore("agents", {
  state: () => ({
    agents: [],
    currentAgent: null,
    loading: false,
    error: null,
  }),

  getters: {
    // 獲取可用的智能體列表
    availableAgents: (state) =>
      state.agents.filter((agent) => agent.status === "active"),

    // 根據類型獲取智能體
    getAgentsByType: (state) => (type) => {
      return state.agents.filter(
        (agent) => agent.type === type && agent.status === "active"
      );
    },

    // 獲取當前選中的智能體
    getCurrentAgent: (state) => state.currentAgent,

    // 檢查是否有智能體正在載入
    isLoading: (state) => state.loading,

    // 獲取我的智能體（用戶創建的）
    getMyAgents: (state) => (userId) => {
      return state.agents.filter((agent) => agent.createdBy === userId);
    },
  },

  actions: {
    // 獲取所有智能體
    async fetchAgents() {
      this.loading = true;
      this.error = null;

      try {
        // TODO: 實現 API 調用
        const response = await fetch("/api/agents");
        const data = await response.json();

        if (response.ok) {
          this.agents = data.agents || [];
        } else {
          throw new Error(data.message || "獲取智能體列表失敗");
        }
      } catch (error) {
        this.error = error.message;
        console.error("獲取智能體失敗:", error);
      } finally {
        this.loading = false;
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

    // 創建新智能體
    async createAgent(agentData) {
      this.loading = true;
      this.error = null;

      try {
        // TODO: 實現 API 調用
        const response = await fetch("/api/agents", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(agentData),
        });

        const data = await response.json();

        if (response.ok) {
          this.agents.push(data.agent);
          return data.agent;
        } else {
          throw new Error(data.message || "創建智能體失敗");
        }
      } catch (error) {
        this.error = error.message;
        console.error("創建智能體失敗:", error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // 更新智能體
    async updateAgent(agentId, updateData) {
      this.loading = true;
      this.error = null;

      try {
        // TODO: 實現 API 調用
        const response = await fetch(`/api/agents/${agentId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updateData),
        });

        const data = await response.json();

        if (response.ok) {
          const index = this.agents.findIndex((a) => a.id === agentId);
          if (index !== -1) {
            this.agents[index] = data.agent;
          }
          return data.agent;
        } else {
          throw new Error(data.message || "更新智能體失敗");
        }
      } catch (error) {
        this.error = error.message;
        console.error("更新智能體失敗:", error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // 刪除智能體
    async deleteAgent(agentId) {
      this.loading = true;
      this.error = null;

      try {
        // TODO: 實現 API 調用
        const response = await fetch(`/api/agents/${agentId}`, {
          method: "DELETE",
        });

        if (response.ok) {
          this.agents = this.agents.filter((a) => a.id !== agentId);

          // 如果刪除的是當前智能體，清除當前智能體
          if (this.currentAgent && this.currentAgent.id === agentId) {
            this.setCurrentAgent(null);
          }
        } else {
          const data = await response.json();
          throw new Error(data.message || "刪除智能體失敗");
        }
      } catch (error) {
        this.error = error.message;
        console.error("刪除智能體失敗:", error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // 複製智能體
    async cloneAgent(agentId, newName) {
      this.loading = true;
      this.error = null;

      try {
        // TODO: 實現 API 調用
        const response = await fetch(`/api/agents/${agentId}/clone`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: newName }),
        });

        const data = await response.json();

        if (response.ok) {
          this.agents.push(data.agent);
          return data.agent;
        } else {
          throw new Error(data.message || "複製智能體失敗");
        }
      } catch (error) {
        this.error = error.message;
        console.error("複製智能體失敗:", error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // 測試智能體
    async testAgent(agentId, testMessage) {
      this.loading = true;
      this.error = null;

      try {
        // TODO: 實現 API 調用
        const response = await fetch(`/api/agents/${agentId}/test`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message: testMessage }),
        });

        const data = await response.json();

        if (response.ok) {
          return data.response;
        } else {
          throw new Error(data.message || "智能體測試失敗");
        }
      } catch (error) {
        this.error = error.message;
        console.error("智能體測試失敗:", error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // 清除錯誤
    clearError() {
      this.error = null;
    },
  },
});
