/**
 * AI 模型管理控制器
 * 處理 AI 模型相關的 HTTP 請求
 */

import ModelModel from "../models/Model.model.js";
import {
  catchAsync,
  createSuccessResponse,
  ValidationError,
  BusinessError,
  NotFoundError,
} from "../middleware/errorHandler.middleware.js";
import logger from "../utils/logger.util.js";

/**
 * 獲取所有AI模型
 * @route GET /api/models
 * @access Private
 */
export const handleGetAllModels = catchAsync(async (req, res) => {
  const { provider, is_active, group_by_provider } = req.query;

  const options = {};
  if (provider) options.provider = provider;
  if (is_active !== undefined) options.is_active = is_active === "true";

  let models;
  if (group_by_provider === "true") {
    models = await ModelModel.getModelsByProvider(options);
  } else {
    models = await ModelModel.getAllModels(options);
  }

  logger.info("獲取AI模型列表", {
    user_id: req.user.id,
    total_models: Array.isArray(models)
      ? models.length
      : Object.keys(models).length,
    options,
  });

  res.json(createSuccessResponse(models, "獲取模型列表成功"));
});

/**
 * 根據ID獲取模型詳情
 * @route GET /api/models/:id
 * @access Private
 */
export const handleGetModelById = catchAsync(async (req, res) => {
  const { id } = req.params;

  const model = await ModelModel.getModelById(parseInt(id));

  if (!model) {
    throw new NotFoundError("模型不存在");
  }

  // 解析 JSON 字段
  ["pricing", "capabilities"].forEach((field) => {
    if (model[field] && typeof model[field] === "string") {
      try {
        model[field] = JSON.parse(model[field]);
      } catch (e) {
        model[field] = null;
      }
    }
  });

  logger.info("獲取模型詳情", {
    user_id: req.user.id,
    model_id: id,
    model_name: model.model_name,
  });

  res.json(createSuccessResponse(model, "獲取模型詳情成功"));
});

/**
 * 創建新模型
 * @route POST /api/models
 * @access Admin
 */
export const handleCreateModel = catchAsync(async (req, res) => {
  const modelData = req.body;

  // 調試：打印接收到的數據
  console.log("📥 接收到的模型數據:", JSON.stringify(modelData, null, 2));
  console.log("🔍 icon 欄位值:", modelData.icon);

  // 檢查模型是否已存在
  const existingModel = await ModelModel.checkModelExists(
    modelData.model_name,
    modelData.provider
  );

  if (existingModel) {
    throw new BusinessError("該提供商下的模型名稱已存在");
  }

  // 創建模型
  const newModel = await ModelModel.createModel(modelData);

  logger.audit(req.user.id, "MODEL_CREATED", {
    model_id: newModel.id,
    model_name: modelData.model_name,
    provider: modelData.provider,
  });

  res.status(201).json(createSuccessResponse(newModel, "模型創建成功"));
});

/**
 * 更新模型
 * @route PUT /api/models/:id
 * @access Admin
 */
export const handleUpdateModel = catchAsync(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  // 調試：打印接收到的數據
  console.log("📝 更新模型數據:", JSON.stringify(updateData, null, 2));
  console.log("🔍 icon 欄位值:", updateData.icon);

  // 檢查模型是否存在
  const existingModel = await ModelModel.getModelById(parseInt(id));
  if (!existingModel) {
    throw new NotFoundError("模型不存在");
  }

  // 處理布林值欄位，確保 MySQL 相容性
  const processedUpdateData = { ...updateData };

  // 將 JavaScript 布林值轉換為 MySQL 相容的數字 //NOTE: 這個前端也能做
  const booleanFields = ["is_active", "is_default", "is_multimodal"];
  booleanFields.forEach((field) => {
    if (field in processedUpdateData) {
      processedUpdateData[field] = processedUpdateData[field] ? 1 : 0;
    }
  });

  // 更新模型
  await ModelModel.updateModel(parseInt(id), processedUpdateData);

  // 獲取更新後的模型
  const updatedModel = await ModelModel.getModelById(parseInt(id));

  logger.audit(req.user.id, "MODEL_UPDATED", {
    model_id: id,
    model_name: existingModel.model_name,
    updated_fields: Object.keys(updateData),
  });

  res.json(createSuccessResponse(updatedModel, "模型更新成功"));
});

/**
 * 刪除模型（軟刪除）
 * @route DELETE /api/models/:id
 * @access Admin
 */
export const handleDeleteModel = catchAsync(async (req, res) => {
  const { id } = req.params;

  // 檢查模型是否存在
  const existingModel = await ModelModel.getModelById(parseInt(id));
  if (!existingModel) {
    throw new NotFoundError("模型不存在");
  }

  // 軟刪除模型
  await ModelModel.deleteModel(parseInt(id));

  logger.audit(req.user.id, "MODEL_DELETED", {
    model_id: id,
    model_name: existingModel.model_name,
  });

  res.json(createSuccessResponse(null, "模型刪除成功"));
});

/**
 * 設置默認模型
 * @route PATCH /api/models/:id/default
 * @access Admin
 */
export const handleSetDefaultModel = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { provider } = req.body;

  // 檢查模型是否存在
  const existingModel = await ModelModel.getModelById(parseInt(id));
  if (!existingModel) {
    throw new NotFoundError("模型不存在");
  }

  // 設置默認模型
  await ModelModel.setDefaultModel(parseInt(id), provider);

  logger.audit(req.user.id, "MODEL_SET_DEFAULT", {
    model_id: id,
    model_name: existingModel.model_name,
    provider: provider || "all",
  });

  res.json(createSuccessResponse(null, "默認模型設置成功"));
});

/**
 * 獲取模型統計信息
 * @route GET /api/models/stats
 * @access Private
 */
export const handleGetModelStats = catchAsync(async (req, res) => {
  const stats = await ModelModel.getModelStats();

  const totalStats = {
    total_providers: stats.length,
    total_models: stats.reduce((sum, stat) => sum + stat.total_models, 0),
    total_available: stats.reduce(
      (sum, stat) => sum + stat.available_models,
      0
    ),
    total_default: stats.reduce((sum, stat) => sum + stat.default_models, 0),
    total_inactive: stats.reduce((sum, stat) => sum + stat.inactive_models, 0),
    by_provider: stats,
  };

  logger.info("獲取模型統計信息", {
    user_id: req.user.id,
    stats: totalStats,
  });

  res.json(createSuccessResponse(totalStats, "獲取模型統計成功"));
});

/**
 * 同步模型可用性
 * @route POST /api/models/sync
 * @access Admin
 */
export const handleSyncModelAvailability = catchAsync(async (req, res) => {
  const { model_updates } = req.body;

  if (!Array.isArray(model_updates) || model_updates.length === 0) {
    throw new ValidationError("無效的模型更新數據");
  }

  const updatedCount = await ModelModel.syncModelAvailability(model_updates);

  logger.audit(req.user.id, "MODEL_AVAILABILITY_SYNCED", {
    total_updates: model_updates.length,
    successful_updates: updatedCount,
  });

  res.json(
    createSuccessResponse(
      { updated_count: updatedCount, total_count: model_updates.length },
      `成功同步 ${updatedCount} 個模型的可用性狀態`
    )
  );
});

/**
 * 測試模型連接
 * @route POST /api/models/:id/test
 * @access Admin
 */
export const handleTestModel = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { test_message = "Hello, this is a test message." } = req.body;

  // 檢查模型是否存在
  const model = await ModelModel.getModelById(parseInt(id));
  if (!model) {
    throw new NotFoundError("模型不存在");
  }

  // TODO: 實現實際的模型測試邏輯
  // 這裡需要根據不同的提供商調用相應的 AI 服務
  // 暫時返回模擬結果

  const testResult = {
    model_id: id,
    model_name: model.model_name,
    provider: model.provider,
    test_message,
    success: model.is_active,
    response_time: Math.floor(Math.random() * 1000) + 500, // 模擬響應時間
    error_message: model.is_active ? null : "模型暫時不可用",
    tested_at: new Date().toISOString(),
  };

  logger.info("測試模型連接", {
    user_id: req.user.id,
    model_id: id,
    success: testResult.success,
    response_time: testResult.response_time,
  });

  res.json(createSuccessResponse(testResult, "模型測試完成"));
});

export default {
  handleGetAllModels,
  handleGetModelById,
  handleCreateModel,
  handleUpdateModel,
  handleDeleteModel,
  handleSetDefaultModel,
  handleGetModelStats,
  handleSyncModelAvailability,
  handleTestModel,
};
