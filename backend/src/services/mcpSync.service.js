/**
 * MCP 同步服務
 * 負責與 MCP Server 的同步操作
 */

import axios from "axios";
import { query, transaction, dbConfig } from "../config/database.config.js";
import logger from "../utils/logger.util.js";

class McpSyncService {
  constructor() {
    // 預設端點，但建議通過參數傳入
    this.defaultMcpServerUrl =
      process.env.MCP_SERVER_URL || "http://localhost:8080";
  }

  /**
   * 完整同步 MCP 服務和工具
   * @param {string} mcpServerUrl - MCP 服務器端點 URL（可選，未提供時使用預設值）
   */
  async syncAll(mcpServerUrl = null) {
    const serverUrl = mcpServerUrl || this.defaultMcpServerUrl;

    try {
      logger.info(`開始 MCP 完整同步... (端點: ${serverUrl})`);

      // 獲取 MCP Server 資訊
      const serverInfo = await this.getMcpServerInfo(serverUrl);

      if (!serverInfo || !serverInfo.modules) {
        throw new Error("無法獲取 MCP Server 資訊或模組清單為空");
      }

      logger.info("MCP Server 資訊:", {
        version: serverInfo.version,
        toolsRegistered: serverInfo.toolsRegistered,
        modules: Object.keys(serverInfo.modules),
      });

      // 使用事務進行同步
      const result = await transaction(async (connection) => {
        // 同步服務
        const syncedServices = await this.syncServices(
          connection,
          serverInfo.modules,
          serverUrl
        );

        // 同步工具
        const syncedTools = await this.syncTools(
          connection,
          serverInfo.modules,
          serverUrl
        );

        return {
          success: true,
          message: "MCP 服務和工具同步完成",
          data: {
            services: syncedServices,
            tools: syncedTools,
            serverInfo: {
              version: serverInfo.version,
              toolsRegistered: serverInfo.toolsRegistered,
            },
          },
        };
      });

      logger.info("MCP 同步完成", result.data);
      return result;
    } catch (error) {
      logger.error("MCP 同步失敗:", error);
      return {
        success: false,
        message: `MCP 同步失敗: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * 獲取 MCP Server 資訊
   * @param {string} serverUrl - MCP 服務器端點 URL
   */
  async getMcpServerInfo(serverUrl) {
    try {
      const response = await axios.get(serverUrl, { timeout: 10000 });
      return response.data;
    } catch (error) {
      if (error.code === "ECONNREFUSED") {
        throw new Error(
          `無法連接到 MCP Server (${serverUrl})，請確認服務是否運行`
        );
      }
      throw new Error(`獲取 MCP Server 資訊失敗: ${error.message}`);
    }
  }

  /**
   * 同步服務
   * @param {Object} connection - 資料庫連接
   * @param {Object} modules - 模組資訊
   * @param {string} serverUrl - MCP 服務器端點 URL
   */
  async syncServices(connection, modules, serverUrl) {
    logger.info("開始同步服務...");
    const syncedServices = [];

    for (const [moduleKey, moduleInfo] of Object.entries(modules)) {
      try {
        // 完全動態構建服務資訊
        const serviceName = `${moduleKey.charAt(0).toUpperCase()}${moduleKey.slice(1)} 服務`;
        const serviceDesc =
          moduleInfo.description ||
          `${moduleKey.charAt(0).toUpperCase()}${moduleKey.slice(1)} 模組提供的 MCP 服務，包含 ${moduleInfo.tools.length} 個工具`;
        const endpointUrl = `${serverUrl}${moduleInfo.endpoint}`.replace(
          "/:toolName",
          ""
        );

        // 檢查是否已存在相同端點的服務（重複檢查）
        const [existingServices] = await connection.execute(
          `
          SELECT id, name, endpoint_url, is_deleted 
          FROM mcp_services 
          WHERE endpoint_url = ? AND is_deleted = 0
        `,
          [endpointUrl]
        );

        let action = "";
        let serviceId = null;

        if (existingServices.length > 0) {
          // 找到現有服務，進行更新
          const existingService = existingServices[0];
          serviceId = existingService.id;

          await connection.execute(
            `
            UPDATE mcp_services 
            SET description = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `,
            [serviceDesc, serviceId]
          );

          action = "updated";
          logger.info(
            `服務已存在，進行更新: ${serviceName} (ID: ${serviceId})`
          );
        } else {
          // 不存在，創建新服務
          const [result] = await connection.execute(
            `
            INSERT INTO mcp_services (name, endpoint_url, description, owner, is_active)
            VALUES (?, ?, ?, 'system', 1)
          `,
            [serviceName, endpointUrl, serviceDesc]
          );

          serviceId = result.insertId;
          action = "created";
          logger.info(`創建新服務: ${serviceName} (ID: ${serviceId})`);
        }

        syncedServices.push({
          id: serviceId,
          name: serviceName,
          endpoint: endpointUrl,
          tools: moduleInfo.tools.length,
          action: action,
        });

        logger.info(
          `服務同步成功: ${serviceName} (${moduleInfo.tools.length} 個工具) - ${action}`
        );
      } catch (error) {
        logger.error(`服務同步失敗 ${moduleKey}:`, error);
      }
    }

    return syncedServices;
  }

  /**
   * 同步工具
   * @param {Object} connection - 資料庫連接
   * @param {Object} modules - 模組資訊
   * @param {string} serverUrl - MCP 服務器端點 URL
   */
  async syncTools(connection, modules, serverUrl) {
    logger.info("開始同步工具...");
    const syncedTools = [];

    for (const [moduleKey, moduleInfo] of Object.entries(modules)) {
      try {
        // 動態獲取服務的端點 URL
        const endpointUrl = `${serverUrl}${moduleInfo.endpoint}`.replace(
          "/:toolName",
          ""
        );

        // 獲取對應的服務 ID
        const [serviceRows] = await connection.execute(
          `
          SELECT id FROM mcp_services 
          WHERE endpoint_url = ?
        `,
          [endpointUrl]
        );

        if (serviceRows.length === 0) {
          logger.warn(`找不到對應服務: ${moduleKey} (${endpointUrl})`);
          continue;
        }

        const serviceId = serviceRows[0].id;
        logger.info(`同步 ${moduleKey} 服務的工具...`);

        // 1. 先刪除該服務的所有現有工具（以 MCP Server 為準）
        const [deleteResult] = await connection.execute(
          `DELETE FROM mcp_tools WHERE mcp_service_id = ?`,
          [serviceId]
        );

        if (deleteResult.affectedRows > 0) {
          logger.info(
            `刪除服務 ${moduleKey} 的 ${deleteResult.affectedRows} 個舊工具`
          );
        }

        // 2. 重新插入 MCP Server 上的所有工具
        for (const toolName of moduleInfo.tools) {
          try {
            // 動態獲取工具詳細資訊
            const toolInfo = await this.getToolInfo(moduleKey, toolName);

            // 生成工具描述
            const toolDescription =
              toolInfo.description ||
              `${toolName.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())} 工具`;

            // 插入新工具
            const [result] = await connection.execute(
              `
              INSERT INTO mcp_tools (
                mcp_service_id, name, description, version, input_schema, 
                cacheable, cache_ttl, stats, priority, is_enabled
              )
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1)
            `,
              [
                serviceId,
                toolName,
                toolDescription,
                toolInfo.version || "1.0.0",
                JSON.stringify(toolInfo.schema || {}),
                toolInfo.cacheable ? 1 : 0,
                toolInfo.cacheTTL || 0,
                JSON.stringify(toolInfo.stats || {}),
              ]
            );

            syncedTools.push({
              service: moduleKey,
              name: toolName,
              description: toolDescription,
              action: "synced",
            });

            logger.info(`工具同步成功: ${toolName} (ID: ${result.insertId})`);
          } catch (error) {
            logger.error(`工具同步失敗 ${toolName}:`, error);
          }
        }

        logger.info(
          `服務 ${moduleKey} 工具同步完成，共 ${moduleInfo.tools.length} 個工具`
        );
      } catch (error) {
        logger.error(`模組工具同步失敗 ${moduleKey}:`, error);
      }
    }

    return syncedTools;
  }

  /**
   * 獲取工具詳細資訊
   */
  async getToolInfo(moduleKey, toolName) {
    try {
      // 動態嘗試從多個可能的端點獲取工具資訊
      const possibleEndpoints = [
        `${this.defaultMcpServerUrl}/api/${moduleKey}/tools`,
        `${this.defaultMcpServerUrl}/api/${moduleKey}/${toolName}`,
        `${this.defaultMcpServerUrl}/tools/${toolName}`,
      ];

      for (const endpoint of possibleEndpoints) {
        try {
          const response = await axios.get(endpoint, { timeout: 5000 });

          // 處理不同的回應格式
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

            // 如果是工具清單格式
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

            // 如果是單一工具格式
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

            // 如果是直接的 schema 格式
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
          // 繼續嘗試下一個端點
          continue;
        }
      }

      // 如果所有端點都失敗，回傳預設值
      logger.warn(`無法從任何端點獲取工具詳細資訊: ${toolName}`);
      return {
        description: `${toolName.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())} 工具`,
        version: "1.0.0",
        schema: {},
        cacheable: false,
        cacheTTL: 0,
        stats: {},
      };
    } catch (error) {
      logger.warn(`獲取工具資訊時發生錯誤: ${toolName} - ${error.message}`);
      return {
        description: `${toolName.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())} 工具`,
        version: "1.0.0",
        schema: {},
        cacheable: false,
        cacheTTL: 0,
        stats: {},
      };
    }
  }

  /**
   * 檢查與現有資料的差異
   * @param {string} mcpServerUrl - MCP 服務器端點 URL（可選）
   */
  async checkDifferences(mcpServerUrl = null) {
    const serverUrl = mcpServerUrl || this.defaultMcpServerUrl;

    try {
      // 獲取 MCP Server 資訊
      const serverInfo = await this.getMcpServerInfo(serverUrl);

      // 獲取現有的服務和工具
      const existingServicesResult = await query(`
        SELECT s.*, COUNT(t.id) as tool_count 
        FROM mcp_services s 
        LEFT JOIN mcp_tools t ON s.id = t.mcp_service_id 
        GROUP BY s.id
      `);

      const existingToolsResult = await query(`
        SELECT t.*, s.name as service_name 
        FROM mcp_tools t 
        JOIN mcp_services s ON t.mcp_service_id = s.id
      `);

      const existingServices = existingServicesResult.rows;
      const existingTools = existingToolsResult.rows;

      // 比較差異
      const differences = {
        newServices: [],
        updatedServices: [],
        newTools: [],
        removedTools: [],
        serverVersion: serverInfo.version,
      };

      // 檢查新服務和工具
      for (const [moduleKey, moduleInfo] of Object.entries(
        serverInfo.modules
      )) {
        const serviceName = `${moduleKey.charAt(0).toUpperCase()}${moduleKey.slice(1)} 服務`;
        const endpointUrl = `${serverUrl}${moduleInfo.endpoint}`.replace(
          "/:toolName",
          ""
        );

        const existingService = existingServices.find(
          (s) => s.endpoint_url === endpointUrl
        );

        if (!existingService) {
          differences.newServices.push({
            name: serviceName,
            endpoint: endpointUrl,
            tools: moduleInfo.tools,
          });
        } else {
          // 檢查工具差異
          for (const toolName of moduleInfo.tools) {
            const existingTool = existingTools.find(
              (t) =>
                t.name === toolName && t.service_name === existingService.name
            );

            if (!existingTool) {
              differences.newTools.push({
                service: serviceName,
                name: toolName,
                serviceId: existingService.id,
              });
            }
          }
        }
      }

      return {
        success: true,
        data: differences,
      };
    } catch (error) {
      logger.error("檢查差異失敗:", error);
      return {
        success: false,
        message: `檢查差異失敗: ${error.message}`,
        error: error.message,
      };
    }
  }
}

export default new McpSyncService();
