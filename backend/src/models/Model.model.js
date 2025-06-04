/**
 * AI 模型管理模型
 * 處理 AI 模型相關的數據庫操作
 */

import { query } from "../config/database.config.js";

/**
 * 獲取所有可用模型
 * @param {Object} options - 查詢選項
 * @param {string} [options.provider] - 提供商過濾 (ollama, gemini, openai, claude)
 * @param {boolean} [options.available] - 是否只獲取可用模型
 * @param {boolean} [options.active] - 是否只獲取啟用模型
 * @returns {Promise<Array>} 模型列表
 */
export const getAllModels = async (options = {}) => {
  const { provider, available, active } = options;

  let sql = `
    SELECT 
      id,
      name as model_name,
      display_name,
      model_type as provider,
      model_id,
      description,
      max_tokens,
      temperature,
      top_p,
      pricing,
      capabilities,
      is_active,
      is_default,
      is_multimodal,
      endpoint_url,
      usage_count,
      total_tokens_used,
      created_at,
      updated_at
    FROM ai_models
    WHERE 1=1
  `;
  const params = [];

  // 添加提供商過濾
  if (provider) {
    sql += " AND model_type = ?";
    params.push(provider);
  }

  // 添加啟用狀態過濾
  if (active !== undefined) {
    sql += " AND is_active = ?";
    params.push(active);
  }

  sql += " ORDER BY model_type, display_name";

  const result = await query(sql, params);
  return result.rows;
};

/**
 * 根據提供商分組獲取模型
 * @param {Object} options - 查詢選項
 * @returns {Promise<Object>} 分組的模型數據
 */
export const getModelsByProvider = async (options = {}) => {
  const models = await getAllModels(options);

  const groupedModels = {};
  models.forEach((model) => {
    if (!groupedModels[model.provider]) {
      groupedModels[model.provider] = [];
    }
    groupedModels[model.provider].push(model);
  });

  return groupedModels;
};

/**
 * 根據 ID 獲取模型
 * @param {number} modelId - 模型 ID
 * @returns {Promise<Object|null>} 模型數據
 */
export const getModelById = async (modelId) => {
  const sql = `
    SELECT 
      id,
      name as model_name,
      display_name,
      model_type as provider,
      model_id,
      description,
      max_tokens,
      temperature,
      top_p,
      pricing,
      capabilities,
      is_active,
      is_default,
      is_multimodal,
      endpoint_url,
      usage_count,
      total_tokens_used,
      created_at,
      updated_at
    FROM ai_models
    WHERE id = ?
  `;

  const result = await query(sql, [modelId]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * 根據模型名稱和提供商獲取模型
 * @param {string} modelName - 模型名稱
 * @param {string} provider - 提供商
 * @returns {Promise<Object|null>} 模型數據
 */
export const getModelByNameAndProvider = async (modelName, provider) => {
  const sql = `
    SELECT 
      id,
      name as model_name,
      display_name,
      model_type as provider,
      model_id,
      description,
      max_tokens,
      temperature,
      top_p,
      pricing,
      capabilities,
      is_active,
      is_default,
      is_multimodal,
      endpoint_url,
      usage_count,
      total_tokens_used,
      created_at,
      updated_at
    FROM ai_models
    WHERE name = ? AND model_type = ?
  `;

  const result = await query(sql, [modelName, provider]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * 創建新模型
 * @param {Object} modelData - 模型數據
 * @returns {Promise<Object>} 創建的模型數據
 */
export const createModel = async (modelData) => {
  const {
    model_name,
    display_name,
    provider,
    model_id,
    description,
    max_tokens = 4096,
    temperature = 0.7,
    top_p = 0.9,
    pricing,
    capabilities,
    is_default = false,
    is_multimodal = false,
    endpoint_url,
  } = modelData;

  const sql = `
    INSERT INTO ai_models (
      name, display_name, model_type, model_id, description,
      max_tokens, temperature, top_p, pricing, capabilities,
      is_default, is_multimodal, endpoint_url
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const result = await query(sql, [
    model_name,
    display_name,
    provider,
    model_id,
    description,
    max_tokens,
    temperature,
    top_p,
    pricing ? JSON.stringify(pricing) : null,
    capabilities ? JSON.stringify(capabilities) : null,
    is_default,
    is_multimodal,
    endpoint_url,
  ]);

  return {
    id: result.rows.insertId,
    model_name,
    display_name,
    provider,
    model_id,
    description,
    max_tokens,
    temperature,
    top_p,
    pricing,
    capabilities,
    is_default,
    is_multimodal,
    endpoint_url,
  };
};

/**
 * 更新模型
 * @param {number} modelId - 模型 ID
 * @param {Object} updateData - 更新數據
 * @returns {Promise<void>}
 */
export const updateModel = async (modelId, updateData) => {
  const allowedFields = [
    "display_name",
    "description",
    "max_tokens",
    "temperature",
    "top_p",
    "pricing",
    "capabilities",
    "is_default",
    "is_active",
    "is_multimodal",
    "endpoint_url",
  ];

  const updates = [];
  const params = [];

  Object.keys(updateData).forEach((key) => {
    if (allowedFields.includes(key) && updateData[key] !== undefined) {
      updates.push(`${key} = ?`);
      // 如果是 JSON 欄位，需要 JSON 序列化
      if (
        (key === "pricing" || key === "capabilities") &&
        updateData[key] !== null
      ) {
        params.push(JSON.stringify(updateData[key]));
      } else {
        params.push(updateData[key]);
      }
    }
  });

  if (updates.length === 0) {
    throw new Error("沒有有效的更新字段");
  }

  params.push(modelId);
  const sql = `UPDATE ai_models SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;

  await query(sql, params);
};

/**
 * 軟刪除模型
 * @param {number} modelId - 模型 ID
 * @returns {Promise<void>}
 */
export const deleteModel = async (modelId) => {
  const sql =
    "UPDATE ai_models SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?";
  await query(sql, [modelId]);
};

/**
 * 設置默認模型
 * @param {number} modelId - 模型 ID
 * @param {string} provider - 提供商（可選，如果提供則只在該提供商內設置默認）
 * @returns {Promise<void>}
 */
export const setDefaultModel = async (modelId, provider = null) => {
  // 開始事務
  await query("START TRANSACTION");

  try {
    // 清除其他默認模型
    let clearSql =
      "UPDATE ai_models SET is_default = FALSE WHERE is_default = TRUE";
    const clearParams = [];

    if (provider) {
      clearSql += " AND provider = ?";
      clearParams.push(provider);
    }

    await query(clearSql, clearParams);

    // 設置新的默認模型
    await query("UPDATE ai_models SET is_default = TRUE WHERE id = ?", [
      modelId,
    ]);

    // 提交事務
    await query("COMMIT");
  } catch (error) {
    // 回滾事務
    await query("ROLLBACK");
    throw error;
  }
};

/**
 * 檢查模型是否存在
 * @param {string} modelName - 模型名稱
 * @param {string} provider - 提供商
 * @returns {Promise<boolean>} 是否存在
 */
export const checkModelExists = async (modelName, provider) => {
  const sql = "SELECT id FROM ai_models WHERE name = ? AND model_type = ?";
  const result = await query(sql, [modelName, provider]);
  return result.rows.length > 0;
};

/**
 * 獲取模型統計信息
 * @returns {Promise<Object>} 統計數據
 */
export const getModelStats = async () => {
  const sql = `
    SELECT 
      model_type as provider,
      COUNT(*) as total_models,
      SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) as available_models,
      SUM(CASE WHEN is_default = TRUE THEN 1 ELSE 0 END) as default_models,
      SUM(CASE WHEN is_active = FALSE THEN 1 ELSE 0 END) as inactive_models
    FROM ai_models
    GROUP BY model_type
  `;

  const result = await query(sql);
  return result.rows;
};

/**
 * 同步模型可用性狀態
 * @param {Array} modelUpdates - 模型更新數據 [{model_name, provider, available}, ...]
 * @returns {Promise<number>} 更新的模型數量
 */
export const syncModelAvailability = async (modelUpdates) => {
  if (!modelUpdates || modelUpdates.length === 0) {
    return 0;
  }

  let updatedCount = 0;

  for (const update of modelUpdates) {
    const { model_name, provider, available } = update;

    const sql = `
      UPDATE ai_models 
      SET is_active = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE name = ? AND model_type = ?
    `;

    const result = await query(sql, [available, model_name, provider]);
    if (result.rows.affectedRows > 0) {
      updatedCount++;
    }
  }

  return updatedCount;
};

export default {
  getAllModels,
  getModelsByProvider,
  getModelById,
  getModelByNameAndProvider,
  createModel,
  updateModel,
  deleteModel,
  setDefaultModel,
  checkModelExists,
  getModelStats,
  syncModelAvailability,
};
