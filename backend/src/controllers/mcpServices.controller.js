/**
 * MCP 服務管理控制器
 * 處理 MCP 服務相關的 HTTP 請求
 */

import McpServiceModel from "../models/McpService.model.js";
import {
  catchAsync,
  createSuccessResponse,
  ValidationError,
  BusinessError,
  NotFoundError,
} from "../middleware/errorHandler.middleware.js";
import logger from "../utils/logger.util.js";
import mcpDiscoveryService from "../services/mcpDiscovery.service.js";
import mcpSyncService from "../services/mcpSync.service.js";
import { query, transaction } from "../config/database.config.js";

/**
 * 獲取所有 MCP 服務
 * @route GET /api/mcp/services
 * @access Private
 */
export const handleGetAllMcpServices = catchAsync(async (req, res) => {
  const { is_active, owner } = req.query;

  const options = {};
  if (is_active !== undefined) options.is_active = is_active === "true";
  if (owner) options.owner = owner;

  const services = await McpServiceModel.getAllMcpServices(options);

  logger.info("獲取 MCP 服務列表", {
    user_id: req.user.id,
    total_services: services.length,
    options,
  });

  res.json(createSuccessResponse(services, "獲取 MCP 服務列表成功"));
});

/**
 * 根據ID獲取 MCP 服務詳情
 * @route GET /api/mcp/services/:id
 * @access Private
 */
export const handleGetMcpServiceById = catchAsync(async (req, res) => {
  const { id } = req.params;

  const service = await McpServiceModel.getMcpServiceById(parseInt(id));

  if (!service) {
    throw new NotFoundError("MCP 服務不存在");
  }

  logger.info("獲取 MCP 服務詳情", {
    user_id: req.user.id,
    service_id: id,
    service_name: service.name,
  });

  res.json(createSuccessResponse(service, "獲取 MCP 服務詳情成功"));
});

/**
 * 創建新的 MCP 服務
 * @route POST /api/mcp/services
 * @access Admin
 */
export const handleCreateMcpService = catchAsync(async (req, res) => {
  const serviceData = req.body;

  // 驗證必填欄位
  if (!serviceData.name) {
    throw new ValidationError("服務名稱為必填欄位");
  }

  // 檢查服務名稱是否已存在
  const existingService = await McpServiceModel.checkMcpServiceExists(
    serviceData.name
  );

  if (existingService) {
    throw new BusinessError("該服務名稱已存在");
  }

  // 添加創建者資訊
  serviceData.owner = serviceData.owner || req.user.username || req.user.email;

  // 創建服務
  const newService = await McpServiceModel.createMcpService(serviceData);

  logger.audit(req.user.id, "MCP_SERVICE_CREATED", {
    service_id: newService.id,
    service_name: serviceData.name,
    endpoint_url: serviceData.endpoint_url,
  });

  res.status(201).json(createSuccessResponse(newService, "MCP 服務創建成功"));
});

/**
 * 更新 MCP 服務
 * @route PUT /api/mcp/services/:id
 * @access Admin
 */
export const handleUpdateMcpService = catchAsync(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  // 檢查服務是否存在
  const existingService = await McpServiceModel.getMcpServiceById(parseInt(id));
  if (!existingService) {
    throw new NotFoundError("MCP 服務不存在");
  }

  // 如果更新名稱，檢查是否與其他服務衝突
  if (updateData.name && updateData.name !== existingService.name) {
    const nameExists = await McpServiceModel.checkMcpServiceExists(
      updateData.name,
      parseInt(id)
    );
    if (nameExists) {
      throw new BusinessError("該服務名稱已存在");
    }
  }

  // 處理布林值欄位，確保 MySQL 相容性
  const processedUpdateData = { ...updateData };
  if ("is_active" in processedUpdateData) {
    processedUpdateData.is_active = processedUpdateData.is_active ? 1 : 0;
  }

  // 更新服務
  const updatedService = await McpServiceModel.updateMcpService(
    parseInt(id),
    processedUpdateData
  );

  logger.audit(req.user.id, "MCP_SERVICE_UPDATED", {
    service_id: id,
    service_name: existingService.name,
    updated_fields: Object.keys(updateData),
  });

  res.json(createSuccessResponse(updatedService, "MCP 服務更新成功"));
});

/**
 * 刪除 MCP 服務（軟刪除）
 * @route DELETE /api/mcp/services/:id
 * @access Admin
 */
export const handleDeleteMcpService = catchAsync(async (req, res) => {
  const { id } = req.params;

  // 檢查服務是否存在
  const existingService = await McpServiceModel.getMcpServiceById(parseInt(id));
  if (!existingService) {
    throw new NotFoundError("MCP 服務不存在");
  }

  // 軟刪除服務（同時會刪除關聯的工具）
  const deleteSuccess = await McpServiceModel.deleteMcpService(parseInt(id));

  if (!deleteSuccess) {
    throw new BusinessError("刪除 MCP 服務失敗");
  }

  logger.audit(req.user.id, "MCP_SERVICE_DELETED", {
    service_id: id,
    service_name: existingService.name,
  });

  res.json(createSuccessResponse(null, "MCP 服務刪除成功"));
});

/**
 * 永久刪除 MCP 服務（硬刪除）
 * @route DELETE /api/mcp/services/:id/permanent
 * @access Admin
 */
export const handlePermanentDeleteMcpService = catchAsync(async (req, res) => {
  const { id } = req.params;

  // 檢查服務是否存在
  const existingService = await McpServiceModel.getMcpServiceById(parseInt(id));
  if (!existingService) {
    throw new NotFoundError("MCP 服務不存在");
  }

  // 使用事務來確保數據一致性
  const result = await transaction(async (connection) => {
    // 首先刪除所有關聯的工具
    await connection.execute("DELETE FROM mcp_tools WHERE mcp_service_id = ?", [
      parseInt(id),
    ]);

    // 刪除服務
    const [deleteResult] = await connection.execute(
      "DELETE FROM mcp_services WHERE id = ?",
      [parseInt(id)]
    );

    return deleteResult.affectedRows > 0;
  });

  if (!result) {
    throw new BusinessError("永久刪除 MCP 服務失敗");
  }

  logger.audit(req.user.id, "MCP_SERVICE_PERMANENT_DELETED", {
    service_id: id,
    service_name: existingService.name,
  });

  res.json(createSuccessResponse(null, "MCP 服務永久刪除成功"));
});

/**
 * 批量刪除 MCP 服務（軟刪除）
 * @route DELETE /api/mcp/services/batch
 * @access Admin
 */
export const handleBatchDeleteMcpServices = catchAsync(async (req, res) => {
  const { serviceIds } = req.body;

  if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
    throw new ValidationError("請提供要刪除的服務ID列表");
  }

  // 驗證所有ID都是數字
  const validIds = serviceIds.filter((id) => !isNaN(parseInt(id)));
  if (validIds.length !== serviceIds.length) {
    throw new ValidationError("所有服務ID必須是有效的數字");
  }

  const result = await transaction(async (connection) => {
    const deletedServices = [];

    for (const id of validIds) {
      // 檢查服務是否存在
      const [serviceRows] = await connection.execute(
        "SELECT id, name FROM mcp_services WHERE id = ? AND is_deleted = 0",
        [parseInt(id)]
      );

      if (serviceRows.length > 0) {
        // 軟刪除服務
        await connection.execute(
          "UPDATE mcp_services SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
          [parseInt(id)]
        );

        // 軟刪除關聯的工具
        await connection.execute(
          "UPDATE mcp_tools SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE mcp_service_id = ?",
          [parseInt(id)]
        );

        deletedServices.push({
          id: parseInt(id),
          name: serviceRows[0].name,
        });
      }
    }

    return deletedServices;
  });

  logger.audit(req.user.id, "MCP_SERVICES_BATCH_DELETED", {
    deleted_services: result,
    total_count: result.length,
  });

  res.json(
    createSuccessResponse(
      { deletedServices: result, deletedCount: result.length },
      `成功刪除 ${result.length} 個 MCP 服務`
    )
  );
});

/**
 * 批量永久刪除 MCP 服務（硬刪除）
 *
 * 🔧 設計理念：
 * - 完全獨立的本地數據庫操作，不依賴 mcp-server 狀態
 * - 支持刪除任何本地記錄的服務，無論 mcp-server 是否可用
 * - 適用於清理過時服務、測試服務或不再需要的服務
 *
 * @route DELETE /api/mcp/services/batch/permanent
 * @access Admin
 */
export const handleBatchPermanentDeleteMcpServices = catchAsync(
  async (req, res) => {
    const { serviceIds } = req.body;

    if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
      throw new ValidationError("請提供要永久刪除的服務ID列表");
    }

    // 驗證所有ID都是數字
    const validIds = serviceIds.filter((id) => !isNaN(parseInt(id)));
    if (validIds.length !== serviceIds.length) {
      throw new ValidationError("所有服務ID必須是有效的數字");
    }

    const result = await transaction(async (connection) => {
      const deletedServices = [];

      for (const id of validIds) {
        // 檢查服務是否存在
        const [serviceRows] = await connection.execute(
          "SELECT id, name FROM mcp_services WHERE id = ?",
          [parseInt(id)]
        );

        if (serviceRows.length > 0) {
          // 刪除關聯的工具
          await connection.execute(
            "DELETE FROM mcp_tools WHERE mcp_service_id = ?",
            [parseInt(id)]
          );

          // 刪除服務
          await connection.execute("DELETE FROM mcp_services WHERE id = ?", [
            parseInt(id),
          ]);

          deletedServices.push({
            id: parseInt(id),
            name: serviceRows[0].name,
          });
        }
      }

      return deletedServices;
    });

    logger.audit(req.user.id, "MCP_SERVICES_BATCH_PERMANENT_DELETED", {
      deleted_services: result,
      total_count: result.length,
    });

    res.json(
      createSuccessResponse(
        { deletedServices: result, deletedCount: result.length },
        `成功永久刪除 ${result.length} 個 MCP 服務`
      )
    );
  }
);

/**
 * 切換 MCP 服務狀態
 * @route PATCH /api/mcp/services/:id/toggle
 * @access Admin
 */
export const handleToggleMcpService = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { is_active } = req.body;

  // 檢查服務是否存在
  const existingService = await McpServiceModel.getMcpServiceById(parseInt(id));
  if (!existingService) {
    throw new NotFoundError("MCP 服務不存在");
  }

  // 切換服務狀態
  const updatedService = await McpServiceModel.toggleMcpServiceStatus(
    parseInt(id),
    is_active
  );

  logger.audit(req.user.id, "MCP_SERVICE_TOGGLED", {
    service_id: id,
    service_name: existingService.name,
    new_status: is_active ? "active" : "inactive",
  });

  res.json(
    createSuccessResponse(
      updatedService,
      `MCP 服務已${is_active ? "啟用" : "停用"}`
    )
  );
});

/**
 * 測試 MCP 服務連線
 * @route POST /api/mcp/services/:id/test
 * @access Admin
 */
export const handleTestMcpConnection = catchAsync(async (req, res) => {
  const { id } = req.params;

  // 檢查服務是否存在
  const service = await McpServiceModel.getMcpServiceById(parseInt(id));
  if (!service) {
    throw new NotFoundError("MCP 服務不存在");
  }

  if (!service.endpoint_url) {
    throw new ValidationError("服務端點 URL 未設定");
  }

  try {
    // TODO: 實際的連線測試邏輯（將在 mcp.service.js 中實現）
    // 這裡暫時模擬測試結果
    const testResult = {
      status: "success",
      endpoint_url: service.endpoint_url,
      response_time: Math.random() * 1000 + 100, // 模擬響應時間
      timestamp: new Date().toISOString(),
    };

    logger.info("MCP 服務連線測試", {
      user_id: req.user.id,
      service_id: id,
      service_name: service.name,
      endpoint_url: service.endpoint_url,
      test_result: testResult.status,
    });

    res.json(createSuccessResponse(testResult, "MCP 服務連線測試成功"));
  } catch (error) {
    logger.error("MCP 服務連線測試失敗", {
      user_id: req.user.id,
      service_id: id,
      service_name: service.name,
      endpoint_url: service.endpoint_url,
      error: error.message,
    });

    throw new BusinessError(`連線測試失敗: ${error.message}`);
  }
});

/**
 * 獲取 MCP 服務統計資訊
 * @route GET /api/mcp/services/stats
 * @access Private
 */
export const handleGetMcpServiceStats = catchAsync(async (req, res) => {
  const stats = await McpServiceModel.getMcpServiceStats();
  const ownerStats = await McpServiceModel.getMcpServicesByOwner();

  const result = {
    ...stats,
    by_owner: ownerStats,
  };

  logger.info("獲取 MCP 服務統計", {
    user_id: req.user.id,
    total_services: stats.total_services,
  });

  res.json(createSuccessResponse(result, "獲取 MCP 服務統計成功"));
});

/**
 * 獲取活躍的 MCP 服務
 * @route GET /api/mcp/services/active
 * @access Private
 */
export const handleGetActiveMcpServices = catchAsync(async (req, res) => {
  const activeServices = await McpServiceModel.getActiveMcpServices();

  logger.info("獲取活躍 MCP 服務", {
    user_id: req.user.id,
    active_count: activeServices.length,
  });

  res.json(createSuccessResponse(activeServices, "獲取活躍 MCP 服務成功"));
});

/**
 * 獲取已同步的 MCP 服務和工具（用於日常管理）
 * @route GET /api/mcp/services/synced
 * @access Private
 */
export const handleGetSyncedServices = catchAsync(async (req, res) => {
  logger.info("開始獲取已同步的 MCP 服務和工具", { user_id: req.user.id });

  // 獲取所有已同步的服務
  const services = await McpServiceModel.getAllMcpServices();
  logger.info(`找到 ${services.length} 個已同步的服務`);

  // 為每個服務獲取關聯的工具
  const servicesWithTools = await Promise.all(
    services.map(async (service) => {
      try {
        logger.info(`正在獲取服務 ${service.name} (ID: ${service.id}) 的工具`);

        const { rows: toolsResult } = await query(
          `SELECT 
            id, name, description, version, input_schema, 
            priority, usage_count, is_enabled, created_at, updated_at
           FROM mcp_tools 
           WHERE mcp_service_id = ? AND is_deleted = 0
           ORDER BY priority DESC, name ASC`,
          [service.id]
        );

        logger.info(`服務 ${service.name} 有 ${toolsResult.length} 個工具`);

        const processedTools = toolsResult.map((tool) => {
          // 安全解析 JSON schema
          let parsedSchema = {};
          try {
            if (tool.input_schema) {
              if (typeof tool.input_schema === "string") {
                parsedSchema = JSON.parse(tool.input_schema);
              } else if (typeof tool.input_schema === "object") {
                parsedSchema = tool.input_schema;
              }
            }
          } catch (error) {
            logger.warn(`解析工具 ${tool.name} 的 schema 失敗:`, error);
            parsedSchema = {};
          }

          return {
            ...tool,
            input_schema: parsedSchema,
            enabled: Boolean(tool.is_enabled), // 前端兼容性
            displayName: tool.name
              .replace(/_/g, " ")
              .replace(/\b\w/g, (l) => l.toUpperCase()),
            schema: parsedSchema,
          };
        });

        return {
          ...service,
          enabled: Boolean(service.is_active), // 前端兼容性
          endpoint: service.endpoint_url, // 前端兼容性
          tools: processedTools,
        };
      } catch (error) {
        logger.error(`處理服務 ${service.name} 時出錯:`, error);
        // 返回沒有工具的服務，而不是失敗
        return {
          ...service,
          enabled: Boolean(service.is_active),
          endpoint: service.endpoint_url, // 前端兼容性
          tools: [],
        };
      }
    })
  );

  const totalTools = servicesWithTools.reduce(
    (sum, service) => sum + service.tools.length,
    0
  );

  logger.info("獲取已同步 MCP 服務和工具成功", {
    user_id: req.user.id,
    total_services: servicesWithTools.length,
    total_tools: totalTools,
  });

  res.json(
    createSuccessResponse(servicesWithTools, "獲取已同步 MCP 服務和工具成功")
  );
});

/**
 * 探索 MCP Server 上的可用服務
 */
export const discoverServices = async (req, res) => {
  try {
    const result = await mcpDiscoveryService.discoverServices();

    if (result.success) {
      res.json({
        success: true,
        message: "服務探索成功",
        data: result.data,
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
        error: result.error,
      });
    }
  } catch (error) {
    logger.error("探索 MCP 服務失敗:", error);
    res.status(500).json({
      success: false,
      message: "探索 MCP 服務失敗",
      error: error.message,
    });
  }
};

/**
 * 比較發現的服務與現有服務的差異
 */
export const compareWithExisting = async (req, res) => {
  try {
    const result = await mcpDiscoveryService.compareWithExisting();

    if (result.success) {
      res.json({
        success: true,
        message: "服務比較成功",
        data: result.data,
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
        error: result.error,
      });
    }
  } catch (error) {
    logger.error("比較服務差異失敗:", error);
    res.status(500).json({
      success: false,
      message: "比較服務差異失敗",
      error: error.message,
    });
  }
};

/**
 * 啟用選中的服務和工具
 */
export const enableSelectedServices = async (req, res) => {
  try {
    const { services } = req.body;

    if (!services || !Array.isArray(services)) {
      return res.status(400).json({
        success: false,
        message: "請提供要啟用的服務清單",
      });
    }

    const result = await mcpDiscoveryService.enableSelectedServices(services);

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        data: result.data,
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
        error: result.error,
      });
    }
  } catch (error) {
    logger.error("啟用服務失敗:", error);
    res.status(500).json({
      success: false,
      message: "啟用服務失敗",
      error: error.message,
    });
  }
};

/**
 * 停用服務或工具
 */
export const disableServices = async (req, res) => {
  try {
    const { serviceIds, toolIds } = req.body;

    if (
      (!serviceIds || serviceIds.length === 0) &&
      (!toolIds || toolIds.length === 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "請提供要停用的服務或工具 ID",
      });
    }

    const result = await mcpDiscoveryService.disableServices(
      serviceIds,
      toolIds
    );

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        data: result.data,
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
        error: result.error,
      });
    }
  } catch (error) {
    logger.error("停用服務失敗:", error);
    res.status(500).json({
      success: false,
      message: "停用服務失敗",
      error: error.message,
    });
  }
};

/**
 * 觸發完整同步
 */
export const triggerSync = async (req, res) => {
  try {
    const { endpoint } = req.body;
    const result = await mcpSyncService.syncAll(endpoint);

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        data: result.data,
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
        error: result.error,
      });
    }
  } catch (error) {
    logger.error("觸發同步失敗:", error);
    res.status(500).json({
      success: false,
      message: "觸發同步失敗",
      error: error.message,
    });
  }
};

/**
 * 檢查與現有資料的差異
 */
export const checkDifferences = async (req, res) => {
  try {
    const result = await mcpSyncService.checkDifferences();

    if (result.success) {
      res.json({
        success: true,
        message: "差異檢查成功",
        data: result.data,
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
        error: result.error,
      });
    }
  } catch (error) {
    logger.error("檢查差異失敗:", error);
    res.status(500).json({
      success: false,
      message: "檢查差異失敗",
      error: error.message,
    });
  }
};

/**
 * 獲取同步狀態
 */
export const getSyncStatus = async (req, res) => {
  try {
    // 獲取最近的同步記錄（如果有的話）
    const services = await query(`
      SELECT COUNT(*) as total_services,
             SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_services,
             MAX(updated_at) as last_sync
      FROM mcp_services
    `);

    const tools = await query(`
      SELECT COUNT(*) as total_tools,
             SUM(CASE WHEN is_enabled = 1 THEN 1 ELSE 0 END) as enabled_tools
      FROM mcp_tools
    `);

    res.json({
      success: true,
      data: {
        services: services[0],
        tools: tools[0],
        lastSync: services[0].last_sync,
        mcpServerUrl: process.env.MCP_SERVER_URL || "http://localhost:8080",
      },
    });
  } catch (error) {
    logger.error("獲取同步狀態失敗:", error);
    res.status(500).json({
      success: false,
      message: "獲取同步狀態失敗",
      error: error.message,
    });
  }
};

// 導出所有控制器方法
export default {
  handleGetAllMcpServices,
  handleGetMcpServiceById,
  handleCreateMcpService,
  handleUpdateMcpService,
  handleDeleteMcpService,
  handleToggleMcpService,
  handleTestMcpConnection,
  handleGetMcpServiceStats,
  handleGetActiveMcpServices,
  handleGetSyncedServices,
  discoverServices,
  compareWithExisting,
  enableSelectedServices,
  disableServices,
  triggerSync,
  checkDifferences,
  getSyncStatus,
};
