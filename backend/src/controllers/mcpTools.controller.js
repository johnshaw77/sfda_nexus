/**
 * MCP 工具管理控制器
 * 處理 MCP 工具相關的 HTTP 請求
 */

import McpToolModel from "../models/McpTool.model.js";
import McpServiceModel from "../models/McpService.model.js";
import {
  catchAsync,
  createSuccessResponse,
  ValidationError,
  BusinessError,
  NotFoundError,
} from "../middleware/errorHandler.middleware.js";
import logger from "../utils/logger.util.js";

/**
 * 獲取所有 MCP 工具
 * @route GET /api/mcp/tools
 * @access Private
 */
export const handleGetAllMcpTools = catchAsync(async (req, res) => {
  const { is_enabled, category, mcp_service_id } = req.query;

  const options = {};
  if (is_enabled !== undefined) options.is_enabled = is_enabled === "true";
  if (category) options.category = category;
  if (mcp_service_id) options.mcp_service_id = parseInt(mcp_service_id);

  const tools = await McpToolModel.getAllMcpTools(options);

  logger.info("獲取 MCP 工具列表", {
    user_id: req.user.id,
    total_tools: tools.length,
    options,
  });

  res.json(createSuccessResponse(tools, "獲取 MCP 工具列表成功"));
});

/**
 * 獲取已啟用的 MCP 工具
 * @route GET /api/mcp/tools/enabled
 * @access Private
 */
export const handleGetEnabledMcpTools = catchAsync(async (req, res) => {
  const enabledTools = await McpToolModel.getEnabledMcpTools();

  logger.info("獲取已啟用 MCP 工具", {
    user_id: req.user.id,
    enabled_count: enabledTools.length,
  });

  res.json(createSuccessResponse(enabledTools, "獲取已啟用 MCP 工具成功"));
});

/**
 * 根據服務ID獲取工具
 * @route GET /api/mcp/services/:serviceId/tools
 * @access Private
 */
export const handleGetMcpToolsByService = catchAsync(async (req, res) => {
  const { serviceId } = req.params;
  const { enabled_only } = req.query;

  // 檢查服務是否存在
  const service = await McpServiceModel.getMcpServiceById(parseInt(serviceId));
  if (!service) {
    throw new NotFoundError("MCP 服務不存在");
  }

  const tools = await McpToolModel.getMcpToolsByServiceId(
    parseInt(serviceId),
    enabled_only === "true"
  );

  logger.info("獲取服務工具列表", {
    user_id: req.user.id,
    service_id: serviceId,
    service_name: service.name,
    tool_count: tools.length,
    enabled_only: enabled_only === "true",
  });

  res.json(createSuccessResponse(tools, "獲取服務工具列表成功"));
});

/**
 * 同步指定服務的工具
 * @route POST /api/mcp/services/:serviceId/tools/sync
 * @access Admin
 */
export const handleSyncToolsForService = catchAsync(async (req, res) => {
  const { serviceId } = req.params;
  const { tools } = req.body;

  // 檢查服務是否存在
  const service = await McpServiceModel.getMcpServiceById(parseInt(serviceId));
  if (!service) {
    throw new NotFoundError("MCP 服務不存在");
  }

  // 驗證工具數據
  if (!Array.isArray(tools)) {
    throw new ValidationError("工具數據必須是陣列格式");
  }

  // 同步工具
  const syncResult = await McpToolModel.syncToolsForService(
    parseInt(serviceId),
    tools
  );

  logger.audit(req.user.id, "MCP_TOOLS_SYNCED", {
    service_id: serviceId,
    service_name: service.name,
    sync_result: syncResult,
  });

  res.json(createSuccessResponse(syncResult, "工具同步成功"));
});

/**
 * 更新工具狀態
 * @route PATCH /api/mcp/tools/:id/status
 * @access Admin
 */
export const handleUpdateMcpToolStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { is_enabled } = req.body;

  // 檢查工具是否存在
  const existingTool = await McpToolModel.getMcpToolById(parseInt(id));
  if (!existingTool) {
    throw new NotFoundError("MCP 工具不存在");
  }

  // 更新工具狀態
  const updatedTool = await McpToolModel.updateMcpTool(parseInt(id), {
    is_enabled,
  });

  logger.audit(req.user.id, "MCP_TOOL_STATUS_UPDATED", {
    tool_id: id,
    tool_name: existingTool.name,
    service_name: existingTool.service_name,
    new_status: is_enabled ? "enabled" : "disabled",
  });

  res.json(
    createSuccessResponse(updatedTool, `工具已${is_enabled ? "啟用" : "停用"}`)
  );
});

/**
 * 根據ID獲取工具詳情
 * @route GET /api/mcp/tools/:id
 * @access Private
 */
export const handleGetMcpToolById = catchAsync(async (req, res) => {
  const { id } = req.params;

  const tool = await McpToolModel.getMcpToolById(parseInt(id));

  if (!tool) {
    throw new NotFoundError("MCP 工具不存在");
  }

  // 解析 JSON 字段
  if (tool.input_schema && typeof tool.input_schema === "string") {
    try {
      tool.input_schema = JSON.parse(tool.input_schema);
    } catch (e) {
      tool.input_schema = null;
    }
  }

  logger.info("獲取 MCP 工具詳情", {
    user_id: req.user.id,
    tool_id: id,
    tool_name: tool.name,
    service_name: tool.service_name,
  });

  res.json(createSuccessResponse(tool, "獲取 MCP 工具詳情成功"));
});

/**
 * 創建新的 MCP 工具
 * @route POST /api/mcp/tools
 * @access Admin
 */
export const handleCreateMcpTool = catchAsync(async (req, res) => {
  const toolData = req.body;

  // 驗證必填欄位
  if (!toolData.mcp_service_id) {
    throw new ValidationError("服務ID為必填欄位");
  }
  if (!toolData.name) {
    throw new ValidationError("工具名稱為必填欄位");
  }

  // 檢查服務是否存在
  const service = await McpServiceModel.getMcpServiceById(
    parseInt(toolData.mcp_service_id)
  );
  if (!service) {
    throw new NotFoundError("指定的 MCP 服務不存在");
  }

  // 檢查工具名稱在服務中是否已存在
  const toolExists = await McpToolModel.checkToolExistsInService(
    parseInt(toolData.mcp_service_id),
    toolData.name
  );
  if (toolExists) {
    throw new BusinessError("該服務中已存在相同名稱的工具");
  }

  // 創建工具
  const newTool = await McpToolModel.createMcpTool(toolData);

  logger.audit(req.user.id, "MCP_TOOL_CREATED", {
    tool_id: newTool.id,
    tool_name: toolData.name,
    service_id: toolData.mcp_service_id,
    service_name: service.name,
  });

  res.status(201).json(createSuccessResponse(newTool, "MCP 工具創建成功"));
});

/**
 * 更新 MCP 工具
 * @route PUT /api/mcp/tools/:id
 * @access Admin
 */
export const handleUpdateMcpTool = catchAsync(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  // 檢查工具是否存在
  const existingTool = await McpToolModel.getMcpToolById(parseInt(id));
  if (!existingTool) {
    throw new NotFoundError("MCP 工具不存在");
  }

  // 如果更新名稱，檢查是否與同服務中的其他工具衝突
  if (updateData.name && updateData.name !== existingTool.name) {
    const nameExists = await McpToolModel.checkToolExistsInService(
      existingTool.mcp_service_id,
      updateData.name,
      parseInt(id)
    );
    if (nameExists) {
      throw new BusinessError("該服務中已存在相同名稱的工具");
    }
  }

  // 處理布林值欄位
  const processedUpdateData = { ...updateData };
  if ("is_enabled" in processedUpdateData) {
    processedUpdateData.is_enabled = processedUpdateData.is_enabled ? 1 : 0;
  }

  // 更新工具
  const updatedTool = await McpToolModel.updateMcpTool(
    parseInt(id),
    processedUpdateData
  );

  logger.audit(req.user.id, "MCP_TOOL_UPDATED", {
    tool_id: id,
    tool_name: existingTool.name,
    service_name: existingTool.service_name,
    updated_fields: Object.keys(updateData),
  });

  res.json(createSuccessResponse(updatedTool, "MCP 工具更新成功"));
});

/**
 * 刪除 MCP 工具（軟刪除）
 * @route DELETE /api/mcp/tools/:id
 * @access Admin
 */
export const handleDeleteMcpTool = catchAsync(async (req, res) => {
  const { id } = req.params;

  // 檢查工具是否存在
  const existingTool = await McpToolModel.getMcpToolById(parseInt(id));
  if (!existingTool) {
    throw new NotFoundError("MCP 工具不存在");
  }

  // 軟刪除工具
  const deleteSuccess = await McpToolModel.deleteMcpTool(parseInt(id));

  if (!deleteSuccess) {
    throw new BusinessError("刪除 MCP 工具失敗");
  }

  logger.audit(req.user.id, "MCP_TOOL_DELETED", {
    tool_id: id,
    tool_name: existingTool.name,
    service_name: existingTool.service_name,
  });

  res.json(createSuccessResponse(null, "MCP 工具刪除成功"));
});

/**
 * 批量更新工具狀態
 * @route PATCH /api/mcp/tools/batch/status
 * @access Admin
 */
export const handleBatchUpdateToolStatus = catchAsync(async (req, res) => {
  const { tool_ids, is_enabled } = req.body;

  // 驗證參數
  if (!Array.isArray(tool_ids) || tool_ids.length === 0) {
    throw new ValidationError("工具ID列表不能為空");
  }

  if (typeof is_enabled !== "boolean") {
    throw new ValidationError("啟用狀態必須是布林值");
  }

  // 批量更新
  const updatedCount = await McpToolModel.batchUpdateToolStatus(
    tool_ids,
    is_enabled
  );

  logger.audit(req.user.id, "MCP_TOOLS_BATCH_UPDATED", {
    tool_ids,
    updated_count: updatedCount,
    new_status: is_enabled ? "enabled" : "disabled",
  });

  res.json(
    createSuccessResponse(
      { updated_count },
      `已${is_enabled ? "啟用" : "停用"} ${updatedCount} 個工具`
    )
  );
});

/**
 * 獲取工具分類統計
 * @route GET /api/mcp/tools/stats/categories
 * @access Private
 */
export const handleGetToolCategoryStats = catchAsync(async (req, res) => {
  const categoryStats = await McpToolModel.getToolCategoryStats();

  logger.info("獲取工具分類統計", {
    user_id: req.user.id,
    category_count: categoryStats.length,
  });

  res.json(createSuccessResponse(categoryStats, "獲取工具分類統計成功"));
});

/**
 * 獲取最常用的工具
 * @route GET /api/mcp/tools/stats/top-used
 * @access Private
 */
export const handleGetTopUsedTools = catchAsync(async (req, res) => {
  const { limit = 10 } = req.query;

  const topTools = await McpToolModel.getTopUsedTools(parseInt(limit));

  logger.info("獲取最常用工具", {
    user_id: req.user.id,
    limit: parseInt(limit),
    result_count: topTools.length,
  });

  res.json(createSuccessResponse(topTools, "獲取最常用工具成功"));
});

// 導出所有控制器方法
export default {
  handleGetAllMcpTools,
  handleGetEnabledMcpTools,
  handleGetMcpToolsByService,
  handleSyncToolsForService,
  handleUpdateMcpToolStatus,
  handleGetMcpToolById,
  handleCreateMcpTool,
  handleUpdateMcpTool,
  handleDeleteMcpTool,
  handleBatchUpdateToolStatus,
  handleGetToolCategoryStats,
  handleGetTopUsedTools,
};
