/**
 * MCP 客戶端服務
 * 負責與 MCP 服務器進行通信和工具調用
 */

import axios from "axios";
import logger from "../utils/logger.util.js";
import McpServiceModel from "../models/McpService.model.js";
import McpToolModel from "../models/McpTool.model.js";

/**
 * MCP 客戶端類
 */
class McpClient {
  constructor() {
    this.clients = new Map(); // 儲存已連接的 MCP 客戶端
    this.connectionTimeout = 5000; // 連接超時時間（毫秒）
    this.retryAttempts = 3; // 重試次數
    this.retryDelay = 2000; // 重試延遲（毫秒）
    this.reconnectInterval = 30000; // 重新連接檢查間隔（30秒）
    this.reconnectTimer = null; // 重新連接定時器
  }

  /**
   * 初始化所有活躍的 MCP 服務連接
   */
  async initialize() {
    try {
      const activeServices = await McpServiceModel.getActiveMcpServices();

      logger.info("初始化 MCP 服務連接", {
        service_count: activeServices.length,
        services: activeServices.map(service => ({
          id: service.id,
          name: service.name,
          endpoint_url: service.endpoint_url
        }))
      });

      // 並行初始化所有服務（不等待全部成功）
      const initPromises = activeServices.map((service) =>
        this.connectToServiceWithRetry(service).catch((error) => {
          logger.warn(`服務 ${service.name} 初始化失敗，將在後台重試`, {
            service_id: service.id,
            error: error.message,
          });
        })
      );

      await Promise.allSettled(initPromises);

      // 啟動定期重新連接檢查
      this.startReconnectTimer();
    } catch (error) {
      console.log("MCP Fail", error);
      logger.error("初始化 MCP 服務失敗", { error: error.message });
    }
  }

  /**
   * 啟動重新連接定時器
   */
  startReconnectTimer() {
    if (this.reconnectTimer) {
      clearInterval(this.reconnectTimer);
    }

    this.reconnectTimer = setInterval(async () => {
      await this.checkAndReconnectServices();
    }, this.reconnectInterval);

    logger.info("MCP 重新連接定時器已啟動", {
      interval: this.reconnectInterval / 1000 + "秒",
    });
  }

  /**
   * 檢查並重新連接失敗的服務
   */
  async checkAndReconnectServices() {
    try {
      const activeServices = await McpServiceModel.getActiveMcpServices();

      for (const service of activeServices) {
        const clientInfo = this.clients.get(service.id);

        // 如果服務未連接或連接已失效，嘗試重新連接
        if (!clientInfo || !clientInfo.connected) {
          logger.info(`嘗試重新連接 MCP 服務: ${service.name}`, {
            service_id: service.id,
          });

          await this.connectToServiceWithRetry(service).catch((error) => {
            logger.debug(`重新連接失敗: ${service.name}`, {
              service_id: service.id,
              error: error.message,
            });
          });
        }
      }
    } catch (error) {
      logger.error("重新連接檢查失敗", { error: error.message });
    }
  }

  /**
   * 帶重試機制的服務連接
   * @param {Object} service - MCP 服務配置
   * @param {number} attempt - 當前重試次數
   */
  async connectToServiceWithRetry(service, attempt = 1) {
    try {
      await this.connectToService(service);

      const clientInfo = this.clients.get(service.id);
      if (clientInfo && clientInfo.connected) {
        logger.info(`MCP 服務連接成功: ${service.name}`, {
          service_id: service.id,
          attempt: attempt,
        });
        return;
      }

      throw new Error("連接失敗");
    } catch (error) {
      if (attempt < this.retryAttempts) {
        logger.info(
          `MCP 服務連接失敗，${this.retryDelay / 1000}秒後重試 (${attempt}/${this.retryAttempts}): ${service.name}`,
          {
            service_id: service.id,
            error: error.message,
          }
        );

        await this.sleep(this.retryDelay);
        return this.connectToServiceWithRetry(service, attempt + 1);
      } else {
        logger.warn(`MCP 服務連接失敗，已達最大重試次數: ${service.name}`, {
          service_id: service.id,
          attempts: this.retryAttempts,
          error: error.message,
        });
        throw error;
      }
    }
  }

  /**
   * 睡眠函數
   * @param {number} ms - 毫秒數
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 連接到指定的 MCP 服務
   * @param {Object} service - MCP 服務配置
   */
  async connectToService(service) {
    try {
      // 創建 HTTP 客戶端
      const client = axios.create({
        baseURL: service.endpoint_url,
        timeout: this.connectionTimeout,
        headers: {
          "Content-Type": "application/json",
          "User-Agent": `SFDA-Nexus-MCP-Client/1.0`,
        },
      });

      // 測試連接
      const connectionResult = await this.testConnection(service.endpoint_url);

      if (connectionResult.success) {
        this.clients.set(service.id, {
          client,
          service,
          connected: true,
          lastConnectionTest: new Date(),
        });

        logger.info("MCP 服務連接成功", {
          service_id: service.id,
          service_name: service.name,
          endpoint: service.endpoint_url,
        });
      } else {
        console.log("MCP 服務連接失敗", {
          service_id: service.id,
          service_name: service.name,
          endpoint: service.endpoint_url,
        });
        logger.debug("MCP 服務連接失敗", {
          service_id: service.id,
          service_name: service.name,
          endpoint: service.endpoint_url,
        });
      }
    } catch (error) {
      logger.error("連接 MCP 服務時發生錯誤", {
        service_id: service.id,
        service_name: service.name,
        error: error.message,
      });
    }
  }

  /**
   * 測試 MCP 服務連接
   * @param {string} endpointUrl - 服務端點 URL
   * @returns {Promise<boolean>} 連接狀態
   */
  async testConnection(endpointUrl) {
    try {
      const startTime = Date.now();

      // 構建正確的測試端點
      let testUrl;
      if (endpointUrl.includes('/api/')) {
        // 如果端點包含 /api/，直接加上 /tools
        testUrl = `${endpointUrl}/tools`;
      } else {
        // 如果端點是基礎 URL，加上 /api/tools
        testUrl = `${endpointUrl}/api/tools`;
      }

      logger.debug("測試 MCP 服務連接", {
        original_url: endpointUrl,
        test_url: testUrl,
      });

      // 嘗試連接工具列表端點（實際存在的端點）
      const response = await axios.get(testUrl, {
        timeout: this.connectionTimeout,
      });

      const responseTime = Date.now() - startTime;

      return {
        success: response.status === 200,
        response_time: responseTime,
        status_code: response.status,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error("MCP 服務連接測試失敗", {
        endpoint: endpointUrl,
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 獲取指定服務的可用工具列表
   * @param {number} serviceId - 服務 ID
   * @returns {Promise<Array>} 工具列表
   */
  async getAvailableTools(serviceId) {
    try {
      const clientInfo = this.clients.get(serviceId);

      if (!clientInfo) {
        throw new Error(`MCP 服務 ${serviceId} 未連接`);
      }

      const response = await clientInfo.client.get("/tools");

      if (response.status === 200 && response.data.tools) {
        return response.data.tools;
      }

      return [];
    } catch (error) {
      logger.error("獲取 MCP 工具列表失敗", {
        service_id: serviceId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 同步指定服務的工具到資料庫
   * @param {number} serviceId - 服務 ID
   * @returns {Promise<Object>} 同步結果
   */
  async syncToolsForService(serviceId) {
    try {
      const remoteTools = await this.getAvailableTools(serviceId);

      if (!remoteTools || remoteTools.length === 0) {
        return {
          total: 0,
          inserted: 0,
          updated: 0,
          errors: 0,
          message: "未發現可同步的工具",
        };
      }

      // 使用 Model 層的同步方法
      const syncResult = await McpToolModel.syncToolsForService(
        serviceId,
        remoteTools
      );

      logger.info("MCP 工具同步完成", {
        service_id: serviceId,
        sync_result: syncResult,
      });

      return syncResult;
    } catch (error) {
      logger.error("同步 MCP 工具失敗", {
        service_id: serviceId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 獲取服務模組名稱
   * @param {string} serviceName - 服務名稱
   * @returns {string} 模組名稱
   */
  getModuleName(serviceName) {
    const moduleMap = {
      "Hr 服務": "hr",
      "Finance 服務": "finance",
      "Tasks 服務": "tasks",
      "Mil 服務": "mil",
      // 支援多種命名格式和可能的編碼問題
      hr: "hr",
      finance: "finance",
      tasks: "tasks",
      mil: "mil",
      "Mil ??": "mil", // 處理可能的字符編碼問題
    };

    return moduleMap[serviceName] || serviceName.toLowerCase();
  }

  /**
   * 調用 MCP 工具
   * @param {number} toolId - 工具 ID
   * @param {Object} parameters - 工具參數
   * @param {Object} context - 調用上下文
   * @returns {Promise<Object>} 工具執行結果
   */
  async invokeTool(toolId, parameters = {}, context = {}) {
    logger.info("🔧 ===== MCP 工具調用開始 =====");
    logger.info("🔧 工具 ID:", toolId);
    logger.info("🔧 參數:", parameters);
    logger.info("🔧 上下文:", context);

    let tool = null; // 初始化 tool 變數

    try {
      // 獲取工具信息
      tool = await McpToolModel.getMcpToolById(toolId);
      logger.info("🔧 工具資訊:", tool);

      if (!tool) {
        throw new Error(`工具 ${toolId} 不存在`);
      }

      if (!tool.is_enabled) {
        throw new Error(`工具 ${tool.name} 已被停用`);
      }

      // 獲取對應的服務客戶端
      let clientInfo = this.clients.get(tool.mcp_service_id);
      logger.info("🔧 客戶端資訊存在:", !!clientInfo);

      // 如果客戶端不存在或未連接，嘗試即時重連
      if (!clientInfo || !clientInfo.connected) {
        logger.info(`🔧 服務未連接，嘗試即時重連: ${tool.service_name}`, {
          service_id: tool.mcp_service_id,
        });

        try {
          // 獲取服務配置
          const service = await McpServiceModel.getMcpServiceById(
            tool.mcp_service_id
          );
          if (service && service.is_active) {
            await this.connectToServiceWithRetry(service, 1);
            clientInfo = this.clients.get(tool.mcp_service_id);
          }
        } catch (reconnectError) {
          logger.warn(`即時重連失敗: ${tool.service_name}`, {
            service_id: tool.mcp_service_id,
            error: reconnectError.message,
          });
        }

        // 重連後仍然無法連接
        if (!clientInfo || !clientInfo.connected) {
          throw new Error(`MCP 服務 ${tool.mcp_service_id} 未連接，重連失敗`);
        }
      }

      // 獲取模組名稱
      const moduleName = this.getModuleName(tool.service_name);
      logger.info("🔧 服務名稱:", tool.service_name);
      logger.info("🔧 模組名稱:", moduleName);

      // 構建正確的端點 URL：/{toolName}（因為 baseURL 已經包含 /api/{module}）
      const endpoint = `/${tool.name}`;
      logger.info("🔧 最終端點:", endpoint);

      logger.info("調用 MCP 工具", {
        tool_id: toolId,
        tool_name: tool.name,
        service_id: tool.mcp_service_id,
        service_name: tool.service_name,
        module_name: moduleName,
        endpoint: endpoint,
        parameters,
        user_id: context.user_id,
      });

      console.log(clientInfo.service.endpoint_url + endpoint);
      logger.info(
        "🔧 準備發送請求到:123",
        clientInfo.service.endpoint_url + endpoint
      );

      // 發送工具調用請求 - 使用模組特定的端點
      const response = await clientInfo.client.post(endpoint, parameters);
      logger.info("🔧 工具調用成功！回應狀態:", response.status);
      logger.info("🔧 回應資料:", response.data);

      // 更新工具使用次數
      await McpToolModel.incrementToolUsage(toolId);

      // 記錄調用成功日誌
      logger.info("MCP 工具調用成功", {
        tool_id: toolId,
        tool_name: tool.name,
        service_id: tool.mcp_service_id,
        endpoint: endpoint,
        user_id: context.user_id,
        response_status: response.status,
      });

      // 提取 MCP 回應中的實際業務數據，同時保留元數據
      const mcpResult = response.data;
      const toolExecution = mcpResult?.result || {};
      let businessData =
        mcpResult?.result?.data || toolExecution?.data || toolExecution || {};

      // MCP 服務器已經統一了資料結構，包含 result 字段

      // 🚨 關鍵修正：檢查業務邏輯錯誤
      // 檢查 MCP 工具是否返回了業務錯誤
      const hasBusinessError =
        // 檢查是否有明確的錯誤標記
        toolExecution?.success === false ||
        mcpResult?.success === false ||
        // 檢查是否有錯誤信息
        toolExecution?.error ||
        mcpResult?.error ||
        // 檢查業務數據是否為空（對於查詢類工具，空數據通常表示未找到）
        (tool.name.includes("get_") &&
          (!businessData || Object.keys(businessData).length === 0));

      if (hasBusinessError) {
        // 提取錯誤信息
        const errorMessage =
          toolExecution?.error?.message ||
          toolExecution?.error ||
          mcpResult?.error?.message ||
          mcpResult?.error ||
          `${tool.name} 執行失敗：未找到相關數據`;

        logger.warn("MCP 工具業務邏輯錯誤", {
          tool_id: toolId,
          tool_name: tool.name,
          error: errorMessage,
          businessData,
          user_id: context.user_id,
        });

        return {
          success: false,
          tool_name: tool.name,
          service_name: tool.service_name,
          error: errorMessage,
          timestamp: new Date().toISOString(),
        };
      }

      return {
        success: true,
        tool_name: tool.name,
        service_name: tool.service_name,
        module: mcpResult.module,
        execution_time: toolExecution.executionTime,
        from_cache: toolExecution.fromCache,
        execution_id: toolExecution.executionId,
        version: toolExecution.version,
        data: businessData, // 實際的業務數據
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error("MCP 工具調用失敗", {
        tool_id: toolId,
        tool_name: tool?.name || "unknown",
        parameters,
        error: error.message,
        stack: error.stack,
        user_id: context.user_id,
      });

      return {
        success: false,
        tool_name: tool?.name || "unknown",
        service_name: tool?.service_name || "unknown",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 獲取所有已連接的服務狀態
   * @returns {Array} 服務狀態列表
   */
  getConnectionStatuses() {
    const statuses = [];

    for (const [serviceId, clientInfo] of this.clients.entries()) {
      statuses.push({
        service_id: serviceId,
        service_name: clientInfo.service.name,
        endpoint_url: clientInfo.service.endpoint_url,
        connected: clientInfo.connected,
        last_test: clientInfo.lastConnectionTest,
      });
    }

    return statuses;
  }

  /**
   * 斷開指定服務的連接
   * @param {number} serviceId - 服務 ID
   */
  async disconnectService(serviceId) {
    const clientInfo = this.clients.get(serviceId);

    if (clientInfo) {
      this.clients.delete(serviceId);

      logger.info("MCP 服務連接已斷開", {
        service_id: serviceId,
        service_name: clientInfo.service.name,
      });
    }
  }

  /**
   * 斷開所有服務連接
   */
  async disconnectAll() {
    // 清理重連定時器
    if (this.reconnectTimer) {
      clearInterval(this.reconnectTimer);
      this.reconnectTimer = null;
      logger.info("MCP 重新連接定時器已停止");
    }

    const serviceIds = Array.from(this.clients.keys());

    for (const serviceId of serviceIds) {
      await this.disconnectService(serviceId);
    }

    logger.info("已斷開所有 MCP 服務連接");
  }

  /**
   * 重新連接指定服務
   * @param {number} serviceId - 服務 ID
   */
  async reconnectService(serviceId) {
    // 先斷開現有連接
    await this.disconnectService(serviceId);

    // 重新獲取服務信息並連接
    const service = await McpServiceModel.getMcpServiceById(serviceId);

    if (service && service.is_active) {
      await this.connectToService(service);
    } else {
      throw new Error(`服務 ${serviceId} 不存在或已停用`);
    }
  }

  /**
   * 健康檢查 - 檢查所有連接狀態
   */
  async healthCheck() {
    const results = [];

    for (const [serviceId, clientInfo] of this.clients.entries()) {
      const testResult = await this.testConnection(
        clientInfo.service.endpoint_url
      );

      results.push({
        service_id: serviceId,
        service_name: clientInfo.service.name,
        endpoint_url: clientInfo.service.endpoint_url,
        ...testResult,
      });

      // 更新連接狀態
      clientInfo.connected = testResult.success;
      clientInfo.lastConnectionTest = new Date();
    }

    return results;
  }
}

// 創建全局 MCP 客戶端實例
const mcpClient = new McpClient();

export default mcpClient;
