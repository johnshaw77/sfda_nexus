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
  }

  /**
   * 初始化所有活躍的 MCP 服務連接
   */
  async initialize() {
    try {
      const activeServices = await McpServiceModel.getActiveMcpServices();

      logger.info("初始化 MCP 服務連接", {
        service_count: activeServices.length,
      });

      for (const service of activeServices) {
        await this.connectToService(service);
      }
    } catch (error) {
      logger.error("初始化 MCP 服務失敗", { error: error.message });
    }
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
        logger.warn("MCP 服務連接失敗", {
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

      // 嘗試連接健康檢查端點
      const response = await axios.get(`${endpointUrl}/health`, {
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
      // 支援多種命名格式
      hr: "hr",
      finance: "finance",
      tasks: "tasks",
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

    try {
      // 獲取工具信息
      const tool = await McpToolModel.getMcpToolById(toolId);
      logger.info("🔧 工具資訊:", tool);

      if (!tool) {
        throw new Error(`工具 ${toolId} 不存在`);
      }

      if (!tool.is_enabled) {
        throw new Error(`工具 ${tool.name} 已被停用`);
      }

      // 獲取對應的服務客戶端
      const clientInfo = this.clients.get(tool.mcp_service_id);
      logger.info("🔧 客戶端資訊存在:", !!clientInfo);

      if (!clientInfo) {
        throw new Error(`MCP 服務 ${tool.mcp_service_id} 未連接`);
      }

      // 獲取模組名稱
      const moduleName = this.getModuleName(tool.service_name);
      logger.info("🔧 服務名稱:", tool.service_name);
      logger.info("🔧 模組名稱:", moduleName);

      // 構建正確的端點 URL：/api/{module}/{toolName}
      const endpoint = `/api/${moduleName}/${tool.name}`;
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

      logger.info(
        "🔧 準備發送請求到:",
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

      return {
        success: true,
        tool_name: tool.name,
        service_name: tool.service_name,
        result: response.data,
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
