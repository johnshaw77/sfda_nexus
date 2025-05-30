import { defineStore } from "pinia";

export const useWorkflowsStore = defineStore("workflows", {
  state: () => ({
    workflows: [],
    currentWorkflow: null,
    executions: [],
    loading: false,
    error: null,
  }),

  getters: {
    // 獲取可用的工作流列表
    availableWorkflows: (state) =>
      state.workflows.filter((workflow) => workflow.status === "active"),

    // 根據類型獲取工作流
    getWorkflowsByType: (state) => (type) => {
      return state.workflows.filter(
        (workflow) => workflow.type === type && workflow.status === "active"
      );
    },

    // 獲取當前選中的工作流
    getCurrentWorkflow: (state) => state.currentWorkflow,

    // 檢查是否有工作流正在載入
    isLoading: (state) => state.loading,

    // 獲取我的工作流（用戶創建的）
    getMyWorkflows: (state) => (userId) => {
      return state.workflows.filter(
        (workflow) => workflow.createdBy === userId
      );
    },

    // 獲取工作流執行歷史
    getExecutionHistory: (state) => (workflowId) => {
      return state.executions.filter(
        (execution) => execution.workflowId === workflowId
      );
    },
  },

  actions: {
    // 獲取所有工作流
    async fetchWorkflows() {
      this.loading = true;
      this.error = null;

      try {
        // TODO: 實現 API 調用
        const response = await fetch("/api/workflows");
        const data = await response.json();

        if (response.ok) {
          this.workflows = data.workflows || [];
        } else {
          throw new Error(data.message || "獲取工作流列表失敗");
        }
      } catch (error) {
        this.error = error.message;
        console.error("獲取工作流失敗:", error);
      } finally {
        this.loading = false;
      }
    },

    // 獲取工作流執行歷史
    async fetchExecutions(workflowId) {
      this.loading = true;
      this.error = null;

      try {
        // TODO: 實現 API 調用
        const response = await fetch(`/api/workflows/${workflowId}/executions`);
        const data = await response.json();

        if (response.ok) {
          this.executions = data.executions || [];
        } else {
          throw new Error(data.message || "獲取執行歷史失敗");
        }
      } catch (error) {
        this.error = error.message;
        console.error("獲取執行歷史失敗:", error);
      } finally {
        this.loading = false;
      }
    },

    // 設置當前工作流
    setCurrentWorkflow(workflow) {
      this.currentWorkflow = workflow;
      // 保存到本地存儲
      if (workflow) {
        localStorage.setItem("currentWorkflow", JSON.stringify(workflow));
      } else {
        localStorage.removeItem("currentWorkflow");
      }
    },

    // 從本地存儲恢復當前工作流
    restoreCurrentWorkflow() {
      try {
        const saved = localStorage.getItem("currentWorkflow");
        if (saved) {
          this.currentWorkflow = JSON.parse(saved);
        }
      } catch (error) {
        console.error("恢復當前工作流失敗:", error);
        localStorage.removeItem("currentWorkflow");
      }
    },

    // 創建新工作流
    async createWorkflow(workflowData) {
      this.loading = true;
      this.error = null;

      try {
        // TODO: 實現 API 調用
        const response = await fetch("/api/workflows", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(workflowData),
        });

        const data = await response.json();

        if (response.ok) {
          this.workflows.push(data.workflow);
          return data.workflow;
        } else {
          throw new Error(data.message || "創建工作流失敗");
        }
      } catch (error) {
        this.error = error.message;
        console.error("創建工作流失敗:", error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // 更新工作流
    async updateWorkflow(workflowId, updateData) {
      this.loading = true;
      this.error = null;

      try {
        // TODO: 實現 API 調用
        const response = await fetch(`/api/workflows/${workflowId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updateData),
        });

        const data = await response.json();

        if (response.ok) {
          const index = this.workflows.findIndex((w) => w.id === workflowId);
          if (index !== -1) {
            this.workflows[index] = data.workflow;
          }
          return data.workflow;
        } else {
          throw new Error(data.message || "更新工作流失敗");
        }
      } catch (error) {
        this.error = error.message;
        console.error("更新工作流失敗:", error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // 刪除工作流
    async deleteWorkflow(workflowId) {
      this.loading = true;
      this.error = null;

      try {
        // TODO: 實現 API 調用
        const response = await fetch(`/api/workflows/${workflowId}`, {
          method: "DELETE",
        });

        if (response.ok) {
          this.workflows = this.workflows.filter((w) => w.id !== workflowId);

          // 如果刪除的是當前工作流，清除當前工作流
          if (this.currentWorkflow && this.currentWorkflow.id === workflowId) {
            this.setCurrentWorkflow(null);
          }
        } else {
          const data = await response.json();
          throw new Error(data.message || "刪除工作流失敗");
        }
      } catch (error) {
        this.error = error.message;
        console.error("刪除工作流失敗:", error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // 執行工作流
    async executeWorkflow(workflowId, inputData = {}) {
      this.loading = true;
      this.error = null;

      try {
        // TODO: 實現 API 調用
        const response = await fetch(`/api/workflows/${workflowId}/execute`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(inputData),
        });

        const data = await response.json();

        if (response.ok) {
          // 添加到執行歷史
          this.executions.unshift(data.execution);
          return data.execution;
        } else {
          throw new Error(data.message || "執行工作流失敗");
        }
      } catch (error) {
        this.error = error.message;
        console.error("執行工作流失敗:", error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // 停止工作流執行
    async stopExecution(executionId) {
      this.loading = true;
      this.error = null;

      try {
        // TODO: 實現 API 調用
        const response = await fetch(
          `/api/workflows/executions/${executionId}/stop`,
          {
            method: "POST",
          }
        );

        const data = await response.json();

        if (response.ok) {
          // 更新執行狀態
          const index = this.executions.findIndex((e) => e.id === executionId);
          if (index !== -1) {
            this.executions[index] = data.execution;
          }
          return data.execution;
        } else {
          throw new Error(data.message || "停止執行失敗");
        }
      } catch (error) {
        this.error = error.message;
        console.error("停止執行失敗:", error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // 複製工作流
    async cloneWorkflow(workflowId, newName) {
      this.loading = true;
      this.error = null;

      try {
        // TODO: 實現 API 調用
        const response = await fetch(`/api/workflows/${workflowId}/clone`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: newName }),
        });

        const data = await response.json();

        if (response.ok) {
          this.workflows.push(data.workflow);
          return data.workflow;
        } else {
          throw new Error(data.message || "複製工作流失敗");
        }
      } catch (error) {
        this.error = error.message;
        console.error("複製工作流失敗:", error);
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
