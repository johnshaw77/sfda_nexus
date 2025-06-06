/**
 * 快速命令詞控制器
 * 處理快速命令詞相關的 HTTP 請求
 */

import logger from "../utils/logger.util.js";
import QuickCommandModel from "../models/QuickCommand.model.js";
import {
  createSuccessResponse,
  catchAsync,
  ValidationError,
  BusinessError,
  NotFoundError,
} from "../middleware/errorHandler.middleware.js";

/**
 * 獲取智能體的快速命令詞
 * GET /api/quick-commands/agent/:agentId
 */
export const getAgentQuickCommands = catchAsync(async (req, res) => {
  const { agentId } = req.params;

  if (!agentId) {
    throw new ValidationError("智能體 ID 不能為空");
  }

  const quickCommands = await QuickCommandModel.getAgentQuickCommands(agentId);

  // 格式化返回數據，符合前端預期的格式
  const formattedCommands = quickCommands.map((row) => ({
    id: row.id,
    text: row.text,
    description: row.description,
    category: row.category,
    icon: row.icon,
  }));

  res.json(createSuccessResponse(formattedCommands, "獲取快速命令詞成功"));
});

/**
 * 獲取所有快速命令詞
 * GET /api/quick-commands
 */
export const getAllQuickCommands = catchAsync(async (req, res) => {
  const { active = true } = req.query;

  const quickCommands = await QuickCommandModel.getAllQuickCommands({
    active: active === "true",
  });

  res.json(createSuccessResponse(quickCommands, "獲取快速命令詞列表成功"));
});

/**
 * 獲取所有快速命令詞及智能體關聯（用於管理介面）
 * GET /api/quick-commands/admin
 */
export const getAllQuickCommandsForAdmin = catchAsync(async (req, res) => {
  const { active } = req.query;

  let activeFilter;
  if (active === "true") {
    activeFilter = true;
  } else if (active === "false") {
    activeFilter = false;
  } else {
    activeFilter = undefined; // 不過濾
  }

  const quickCommands = await QuickCommandModel.getAllQuickCommandsWithAgents({
    active: activeFilter,
  });

  res.json(createSuccessResponse(quickCommands, "獲取快速命令詞管理列表成功"));
});

/**
 * 增加快速命令詞使用次數統計
 * POST /api/quick-commands/:commandId/usage
 */
export const incrementCommandUsage = catchAsync(async (req, res) => {
  const { commandId } = req.params;

  if (!commandId) {
    throw new ValidationError("命令詞 ID 不能為空");
  }

  // 檢查命令詞是否存在
  const command = await QuickCommandModel.getQuickCommandById(commandId);
  if (!command) {
    throw new NotFoundError("命令詞不存在");
  }

  await QuickCommandModel.incrementUsageCount(commandId);

  res.json(createSuccessResponse(null, "使用次數統計已更新"));
});

/**
 * 創建新的快速命令詞
 * POST /api/quick-commands
 */
export const createQuickCommand = catchAsync(async (req, res) => {
  const { command_text, description, icon } = req.body;
  const userId = req.user?.id;

  if (!command_text?.trim()) {
    throw new ValidationError("命令詞文字不能為空");
  }

  // 檢查是否已存在相同的命令詞
  const exists = await QuickCommandModel.checkCommandExists(command_text);
  if (exists) {
    throw new BusinessError("該命令詞已存在", 409);
  }

  const newCommand = await QuickCommandModel.createQuickCommand({
    command_text,
    description,
    icon,
    created_by: userId,
  });

  res.status(201).json(createSuccessResponse(newCommand, "快速命令詞創建成功"));
});

/**
 * 根據 ID 獲取快速命令詞
 * GET /api/quick-commands/:commandId
 */
export const getQuickCommandById = catchAsync(async (req, res) => {
  const { commandId } = req.params;

  if (!commandId) {
    throw new ValidationError("命令詞 ID 不能為空");
  }

  const command = await QuickCommandModel.getQuickCommandById(commandId);

  if (!command) {
    throw new NotFoundError("命令詞不存在");
  }

  res.json(createSuccessResponse(command, "獲取快速命令詞成功"));
});

/**
 * 更新快速命令詞
 * PUT /api/quick-commands/:commandId
 */
export const updateQuickCommand = catchAsync(async (req, res) => {
  const { commandId } = req.params;
  const updateData = req.body;

  if (!commandId) {
    throw new ValidationError("命令詞 ID 不能為空");
  }

  // 檢查命令詞是否存在
  const command = await QuickCommandModel.getQuickCommandById(commandId);
  if (!command) {
    throw new NotFoundError("命令詞不存在");
  }

  await QuickCommandModel.updateQuickCommand(commandId, updateData);

  res.json(createSuccessResponse(null, "快速命令詞更新成功"));
});

/**
 * 刪除快速命令詞
 * DELETE /api/quick-commands/:commandId
 */
export const deleteQuickCommand = catchAsync(async (req, res) => {
  const { commandId } = req.params;

  if (!commandId) {
    throw new ValidationError("命令詞 ID 不能為空");
  }

  // 檢查命令詞是否存在
  const command = await QuickCommandModel.getQuickCommandById(commandId);
  if (!command) {
    throw new NotFoundError("命令詞不存在");
  }

  await QuickCommandModel.deleteQuickCommand(commandId);

  res.json(createSuccessResponse(null, "快速命令詞刪除成功"));
});

export default {
  getAgentQuickCommands,
  getAllQuickCommands,
  getAllQuickCommandsForAdmin,
  incrementCommandUsage,
  createQuickCommand,
  getQuickCommandById,
  updateQuickCommand,
  deleteQuickCommand,
};
