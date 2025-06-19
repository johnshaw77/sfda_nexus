/**
 * MCP 服務發現服務
 * 負責探索和管理 MCP 服務
 */

import axios from "axios";
import { query, transaction, dbConfig } from "../config/database.config.js";
import logger from "../utils/logger.util.js";

// 創建專用的 axios 實例，避免循環引用
const createHttpClient = () => {
  return axios.create({
    timeout: 10000,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });
};

class McpDiscoveryService {
  constructor() {
    // 預設端點，但建議通過參數傳入
    this.defaultMcpServerUrl =
      process.env.MCP_SERVER_URL || "http://localhost:8080";
  }

  /**
   * 探索 MCP Server 上的所有可用服務
   * @param {string} mcpServerUrl - MCP 服務器端點 URL（可選，未提供時使用預設值）
   */
  async discoverServices(mcpServerUrl = null) {
    const serverUrl = mcpServerUrl || this.defaultMcpServerUrl;

    try {
      logger.info(`開始探索 MCP 服務... (端點: ${serverUrl})`);

      // 獲取 MCP Server 資訊
      const httpClient = createHttpClient();
      console.log("🔍 正在連接到:", serverUrl);
      const response = await httpClient.get(serverUrl);
      console.log("✅ 連接成功，狀態:", response.status);
      const serverInfo = response.data;

      if (!serverInfo || !serverInfo.modules) {
        throw new Error("MCP Server 回應格式不正確或無模組資訊");
      }

      // 轉換為前端友善的格式
      const discoveredServices = [];

      for (const [moduleKey, moduleInfo] of Object.entries(
        serverInfo.modules
      )) {
        const serviceName = `${moduleKey.charAt(0).toUpperCase()}${moduleKey.slice(1)} 服務`;
        const endpointUrl = `${serverUrl}${moduleInfo.endpoint}`.replace(
          "/:toolName",
          ""
        );

        // 修正：處理新的工具格式，工具現在已經是完整的對象數組
        const rawTools = Array.isArray(moduleInfo.tools)
          ? moduleInfo.tools
          : [];
        const tools = [];

        for (const toolItem of rawTools) {
          // 處理新格式：工具已經是完整對象
          if (typeof toolItem === "object" && toolItem.name) {
            tools.push({
              name: toolItem.name,
              displayName: toolItem.name
                .replace(/_/g, " ")
                .replace(/\b\w/g, (l) => l.toUpperCase()),
              description: toolItem.description || `${toolItem.name} 工具`,
              version: toolItem.version || "1.0.0",
              schema: toolItem.inputSchema || toolItem.schema || {},
              cacheable: toolItem.cacheable || false,
              cacheTTL: toolItem.cacheTTL || 0,
              stats: toolItem.stats || {},
              enabled: false, // 預設未啟用
            });
          } else if (typeof toolItem === "string") {
            // 向後兼容：如果還是字符串格式，使用舊的方式獲取詳細資訊
            const toolInfo = await this.getToolDetails(
              moduleKey,
              toolItem,
              serverUrl
            );
            tools.push({
              name: toolItem,
              displayName: toolItem
                .replace(/_/g, " ")
                .replace(/\b\w/g, (l) => l.toUpperCase()),
              description: toolInfo.description || `${toolItem} 工具`,
              version: toolInfo.version || "1.0.0",
              schema: toolInfo.schema || {},
              cacheable: toolInfo.cacheable || false,
              cacheTTL: toolInfo.cacheTTL || 0,
              stats: toolInfo.stats || {},
              enabled: false, // 預設未啟用
            });
          }
        }

        discoveredServices.push({
          moduleKey,
          name: serviceName,
          endpoint: endpointUrl,
          description:
            moduleInfo.description ||
            `${moduleKey.charAt(0).toUpperCase()}${moduleKey.slice(1)} 模組提供的 MCP 服務，包含 ${tools.length} 個工具`,
          tools,
          enabled: false, // 預設未啟用
          isNew: true, // 標記為新發現的服務
        });
      }

      logger.info(`探索完成，發現 ${discoveredServices.length} 個服務`);

      const result = {
        success: true,
        data: {
          services: discoveredServices,
          serverInfo: {
            version: serverInfo.version,
            toolsRegistered: serverInfo.toolsRegistered,
            url: serverUrl,
          },
        },
      };

      console.log("🧪 測試 JSON 序列化...");
      try {
        JSON.stringify(result);
        console.log("✅ JSON 序列化成功");
      } catch (jsonError) {
        console.error("❌ JSON 序列化失敗:", jsonError.message);
        throw jsonError;
      }

      return result;
    } catch (error) {
      logger.error("探索 MCP 服務失敗:", error.message || error);

      if (error.code === "ECONNREFUSED") {
        return {
          success: false,
          message: `無法連接到 MCP Server (${serverUrl})，請確認服務是否運行`,
          error: "CONNECTION_REFUSED",
        };
      }

      // 避免循環引用，只返回錯誤訊息
      const errorMessage =
        error.response?.data?.message || error.message || "未知錯誤";

      return {
        success: false,
        message: `探索 MCP 服務失敗: ${errorMessage}`,
        error: errorMessage,
      };
    }
  }

  /**
   * 獲取工具詳細資訊
   * @param {string} moduleKey - 模組鍵值
   * @param {string} toolName - 工具名稱
   * @param {string} serverUrl - MCP 服務器端點 URL
   */
  async getToolDetails(moduleKey, toolName, serverUrl) {
    try {
      const possibleEndpoints = [
        `${serverUrl}/api/${moduleKey}/tools`,
        `${serverUrl}/api/${moduleKey}/${toolName}`,
        `${serverUrl}/tools/${toolName}`,
      ];

      for (const endpoint of possibleEndpoints) {
        try {
          const httpClient = createHttpClient();
          const response = await httpClient.get(endpoint);

          if (response.data) {
            // HR 服務格式：{ module: "hr", tools: [...] }
            if (response.data.tools && Array.isArray(response.data.tools)) {
              const tool = response.data.tools.find((t) => t.name === toolName);
              if (tool) {
                return {
                  description: tool.description || "",
                  version: tool.version || "1.0.0",
                  schema: tool.inputSchema || tool.schema || {},
                  cacheable: tool.cacheable || false,
                  cacheTTL: tool.cacheTTL || 0,
                  stats: tool.stats || {},
                };
              }
            }

            // 工具清單格式
            if (response.data[toolName]) {
              return {
                description: response.data[toolName].description || "",
                version: response.data[toolName].version || "1.0.0",
                schema:
                  response.data[toolName].schema ||
                  response.data[toolName].input_schema ||
                  response.data[toolName].inputSchema ||
                  {},
                cacheable: response.data[toolName].cacheable || false,
                cacheTTL: response.data[toolName].cacheTTL || 0,
                stats: response.data[toolName].stats || {},
              };
            }

            // 單一工具格式
            if (
              response.data.name === toolName ||
              response.data.tool === toolName
            ) {
              return {
                description: response.data.description || "",
                version: response.data.version || "1.0.0",
                schema:
                  response.data.schema ||
                  response.data.input_schema ||
                  response.data.inputSchema ||
                  {},
                cacheable: response.data.cacheable || false,
                cacheTTL: response.data.cacheTTL || 0,
                stats: response.data.stats || {},
              };
            }

            // 直接 schema 格式
            if (
              response.data.schema ||
              response.data.input_schema ||
              response.data.inputSchema
            ) {
              return {
                description: response.data.description || "",
                version: response.data.version || "1.0.0",
                schema:
                  response.data.schema ||
                  response.data.input_schema ||
                  response.data.inputSchema ||
                  {},
                cacheable: response.data.cacheable || false,
                cacheTTL: response.data.cacheTTL || 0,
                stats: response.data.stats || {},
              };
            }
          }
        } catch (endpointError) {
          continue;
        }
      }

      return {
        description: "",
        version: "1.0.0",
        schema: {},
        cacheable: false,
        cacheTTL: 0,
        stats: {},
      };
    } catch (error) {
      return {
        description: "",
        version: "1.0.0",
        schema: {},
        cacheable: false,
        cacheTTL: 0,
        stats: {},
      };
    }
  }

  /**
   * 比較發現的服務與資料庫中現有的服務
   * @param {string} mcpServerUrl - MCP 服務器端點 URL（可選）
   */
  async compareWithExisting(mcpServerUrl = null) {
    try {
      // 獲取發現的服務
      const discoveryResult = await this.discoverServices(mcpServerUrl);
      if (!discoveryResult.success) {
        return discoveryResult;
      }

      const discoveredServices = discoveryResult.data.services;

      // 獲取現有的服務和工具
      const existingServicesResult = await query(`
        SELECT s.*, COUNT(t.id) as tool_count 
        FROM mcp_services s 
        LEFT JOIN mcp_tools t ON s.id = t.mcp_service_id AND t.is_enabled = 1
        WHERE s.is_active = 1
        GROUP BY s.id
      `);

      const existingToolsResult = await query(`
        SELECT t.*, s.endpoint_url 
        FROM mcp_tools t 
        JOIN mcp_services s ON t.mcp_service_id = s.id
        WHERE s.is_active = 1 AND t.is_enabled = 1
      `);

      const existingServices = existingServicesResult.rows;
      const existingTools = existingToolsResult.rows;

      // 標記服務狀態
      const comparedServices = discoveredServices.map((discovered) => {
        const existing = existingServices.find(
          (s) => s.endpoint_url === discovered.endpoint
        );

        if (existing) {
          // 檢查工具差異
          const existingToolNames = existingTools
            .filter((t) => t.endpoint_url === discovered.endpoint)
            .map((t) => t.name);

          const newTools = discovered.tools.filter(
            (t) => !existingToolNames.includes(t.name)
          );
          const enabledTools = discovered.tools.map((t) => ({
            ...t,
            enabled: existingToolNames.includes(t.name),
          }));

          return {
            ...discovered,
            enabled: true,
            isNew: false,
            existingId: existing.id,
            tools: enabledTools,
            newToolsCount: newTools.length,
            enabledToolsCount: existingToolNames.length,
          };
        }

        return discovered; // 新服務保持原狀
      });

      // 統計資訊
      const stats = {
        total: comparedServices.length,
        enabled: comparedServices.filter((s) => s.enabled).length,
        new: comparedServices.filter((s) => s.isNew).length,
        totalTools: comparedServices.reduce(
          (sum, s) => sum + s.tools.length,
          0
        ),
        enabledTools: comparedServices.reduce(
          (sum, s) => sum + s.enabledToolsCount || 0,
          0
        ),
        newTools: comparedServices.reduce(
          (sum, s) => sum + s.newToolsCount || 0,
          0
        ),
      };

      return {
        success: true,
        data: {
          services: comparedServices,
          stats,
          serverInfo: discoveryResult.data.serverInfo,
        },
      };
    } catch (error) {
      logger.error("比較服務差異失敗:", error);
      return {
        success: false,
        message: `比較服務差異失敗: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * 啟用選中的服務和工具
   */
  async enableSelectedServices(selectedServices) {
    try {
      const results = await transaction(async (connection) => {
        const txResults = {
          enabledServices: [],
          enabledTools: [],
          errors: [],
        };

        for (const service of selectedServices) {
          try {
            // 檢查服務是否已存在
            console.log(`🔍 檢查服務是否存在: ${service.endpoint}`);
            const [existing] = await connection.execute(
              "SELECT id FROM mcp_services WHERE endpoint_url = ? AND is_deleted = 0",
              [service.endpoint]
            );
            console.log(`📊 查詢結果: 找到 ${existing.length} 個現有服務`);

            let serviceId;
            let action;

            if (existing.length > 0) {
              // 服務已存在，更新
              serviceId = existing[0].id;
              await connection.execute(
                `UPDATE mcp_services 
                 SET name = ?, description = ?, is_active = 1, updated_at = CURRENT_TIMESTAMP 
                 WHERE id = ?`,
                [service.name, service.description, serviceId]
              );
              action = "updated";
            } else {
              // 新服務，插入
              const [insertResult] = await connection.execute(
                `INSERT INTO mcp_services (name, endpoint_url, description, owner, is_active)
                 VALUES (?, ?, ?, 'system', 1)`,
                [service.name, service.endpoint, service.description]
              );
              serviceId = insertResult.insertId;
              action = "created";
            }

            txResults.enabledServices.push({
              id: serviceId,
              name: service.name,
              action: action,
            });

            // 啟用服務的所有工具（除非明確指定不啟用）
            for (const tool of service.tools) {
              try {
                await connection.execute(
                  `
                  INSERT INTO mcp_tools (mcp_service_id, name, description, input_schema, priority, is_enabled)
                  VALUES (?, ?, ?, ?, 1, 1)
                  ON DUPLICATE KEY UPDATE
                    is_enabled = 1,
                    description = VALUES(description),
                    input_schema = VALUES(input_schema),
                    updated_at = CURRENT_TIMESTAMP
                `,
                  [
                    serviceId,
                    tool.name,
                    tool.description,
                    JSON.stringify(tool.schema),
                  ]
                );

                txResults.enabledTools.push({
                  service: service.name,
                  name: tool.name,
                  description: tool.description,
                });
              } catch (toolError) {
                txResults.errors.push(
                  `工具 ${tool.name} 啟用失敗: ${toolError.message}`
                );
              }
            }
          } catch (serviceError) {
            txResults.errors.push(
              `服務 ${service.name} 啟用失敗: ${serviceError.message}`
            );
          }
        }

        return txResults;
      });

      logger.info("服務啟用完成", results);

      return {
        success: true,
        message: `成功啟用 ${results.enabledServices.length} 個服務和 ${results.enabledTools.length} 個工具`,
        data: results,
      };
    } catch (error) {
      logger.error("啟用服務失敗:", error);
      return {
        success: false,
        message: `啟用服務失敗: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * 停用服務或工具
   */
  async disableServices(serviceIds, toolIds = []) {
    try {
      const results = await transaction(async (connection) => {
        const txResults = {
          disabledServices: [],
          disabledTools: [],
        };

        // 停用服務
        if (serviceIds && serviceIds.length > 0) {
          const placeholders = serviceIds.map(() => "?").join(",");
          await connection.execute(
            `UPDATE mcp_services SET is_active = 0 WHERE id IN (${placeholders})`,
            serviceIds
          );

          txResults.disabledServices = serviceIds;
        }

        // 停用工具
        if (toolIds && toolIds.length > 0) {
          const placeholders = toolIds.map(() => "?").join(",");
          await connection.execute(
            `UPDATE mcp_tools SET is_enabled = 0 WHERE id IN (${placeholders})`,
            toolIds
          );

          txResults.disabledTools = toolIds;
        }

        return txResults;
      });

      return {
        success: true,
        message: `成功停用 ${results.disabledServices.length} 個服務和 ${results.disabledTools.length} 個工具`,
        data: results,
      };
    } catch (error) {
      logger.error("停用服務失敗:", error);
      return {
        success: false,
        message: `停用服務失敗: ${error.message}`,
        error: error.message,
      };
    }
  }
}

export default new McpDiscoveryService();
