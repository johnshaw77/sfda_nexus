import { defineStore } from "pinia";
import * as adminApi from "@/api/admin.js";

export const useAdminAgentsStore = defineStore("adminAgents", {
  state: () => ({
    agents: [],
    loading: false,
    error: null,
    pagination: {
      page: 1,
      limit: 20,
      total: 0,
      pages: 0,
    },
  }),

  getters: {
    // 獲取所有智能體
    getAllAgents: (state) => state.agents,

    // 根據 ID 獲取智能體
    getAgentById: (state) => (id) => {
      return state.agents.find((agent) => agent.id === parseInt(id));
    },

    // 檢查是否正在載入
    isLoading: (state) => state.loading,

    // 獲取錯誤信息
    getError: (state) => state.error,

    // 獲取分頁信息
    getPagination: (state) => state.pagination,
  },

  actions: {
    // 獲取智能體列表
    async fetchAgents(params = {}) {
      this.loading = true;
      this.error = null;

      try {
        const response = await adminApi.getAgents(params);

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

    // 創建智能體
    async createAgent(agentData) {
      try {
        const response = await adminApi.createAgent(agentData);

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
        const response = await adminApi.updateAgent(agentId, updateData);

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
        const response = await adminApi.deleteAgent(agentId);

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

    // 複製智能體
    async duplicateAgent(agentId) {
      try {
        const response = await adminApi.duplicateAgent(agentId);

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

    // 更新智能體狀態
    async updateAgentStatus(agentId, isActive) {
      try {
        const response = await adminApi.updateAgent(agentId, {
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
