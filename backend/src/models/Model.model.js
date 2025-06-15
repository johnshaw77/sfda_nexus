/**
 * AI 模型管理模型
 * 處理 AI 模型相關的數據庫操作
 */

import { query, transaction } from "../config/database.config.js";

/**
 * 獲取所有可用模型
 * @param {Object} options - 查詢選項
 * @param {string} [options.provider] - 提供商過濾 (ollama, gemini, openai, claude)
 * @param {boolean} [options.is_active] - 是否只獲取啟用模型
 * @returns {Promise<Array>} 模型列表
 */
export const getAllModels = async (options = {}) => {
  const { provider, is_active } = options;

  let sql = `
    SELECT 
      id,
      name as model_name,
      display_name,
      model_type as provider,
      model_id,
      description,
      icon,
      max_tokens,
      temperature,
      top_p,
      pricing,
      capabilities,
      is_active,
      is_default,
      is_multimodal,
      can_call_tools,
      endpoint_url,
      api_key_encrypted,
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
  if (is_active !== undefined) {
    sql += " AND is_active = ?";
    params.push(is_active);
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
      icon,
      max_tokens,
      temperature,
      top_p,
      pricing,
      capabilities,
      is_active,
      is_default,
      is_multimodal,
      can_call_tools,
      endpoint_url,
      api_key_encrypted,
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
      icon,
      max_tokens,
      temperature,
      top_p,
      pricing,
      capabilities,
      is_active,
      is_default,
      is_multimodal,
      can_call_tools,
      endpoint_url,
      api_key_encrypted,
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
    icon,
    max_tokens = 4096,
    temperature = 0.7,
    top_p = 0.9,
    pricing,
    capabilities,
    is_default = false,
    is_multimodal = false,
    can_call_tools = false,
    endpoint_url,
    api_key_encrypted,
  } = modelData;

  const sql = `
    INSERT INTO ai_models (
      name, display_name, model_type, model_id, description,
      max_tokens, temperature, top_p, pricing, capabilities,
      is_default, is_multimodal, can_call_tools, endpoint_url, api_key_encrypted
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const result = await query(sql, [
    model_name,
    display_name,
    provider,
    model_id,
    description || null,
    max_tokens,
    temperature,
    top_p,
    pricing ? JSON.stringify(pricing) : null,
    capabilities ? JSON.stringify(capabilities) : null,
    is_default,
    is_multimodal,
    can_call_tools,
    endpoint_url || null,
    api_key_encrypted || null,
  ]);

  return {
    id: result.rows.insertId,
    model_name,
    display_name,
    provider,
    model_id,
    description,
    icon,
    max_tokens,
    temperature,
    top_p,
    pricing,
    capabilities,
    is_default,
    is_multimodal,
    can_call_tools,
    endpoint_url,
    api_key_encrypted,
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
    "name", // 對應前端的 model_name
    "model_id",
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
    "can_call_tools",
    "endpoint_url",
    "api_key_encrypted",
  ];

  // 過濾出允許更新的欄位
  const updateFields = {};
  Object.keys(updateData).forEach((key) => {
    if (allowedFields.includes(key)) {
      updateFields[key] = updateData[key];
    }
  });

  if (Object.keys(updateFields).length === 0) {
    throw new Error("沒有有效的更新欄位");
  }

  // 將 JSON 字段序列化
  if (updateFields.pricing) {
    updateFields.pricing = JSON.stringify(updateFields.pricing);
  }
  if (updateFields.capabilities) {
    updateFields.capabilities = JSON.stringify(updateFields.capabilities);
  }

  // 構建 SQL 更新語句
  const setClause = Object.keys(updateFields)
    .map((field) => `${field} = ?`)
    .join(", ");
  const values = Object.values(updateFields);

  const sql = `UPDATE ai_models SET ${setClause} WHERE id = ?`;
  values.push(modelId);

  await query(sql, values);
};

/**
 * 軟刪除模型（將 is_active 設為 false）
 * @param {number} modelId - 模型 ID
 * @returns {Promise<void>}
 */
export const deleteModel = async (modelId) => {
  const sql = "UPDATE ai_models SET is_active = false WHERE id = ?";
  await query(sql, [modelId]);
};

/**
 * 設置默認模型
 * @param {number} modelId - 模型 ID
 * @param {string} provider - 提供商類型（可選，如果提供則只在該提供商內設置默認）
 * @returns {Promise<void>}
 */
export const setDefaultModel = async (modelId, provider = null) => {
  await transaction(async (connection) => {
    if (provider) {
      // 清除指定提供商的其他默認模型
      await query(
        "UPDATE ai_models SET is_default = false WHERE model_type = ?",
        [provider],
        connection
      );
    } else {
      // 清除所有默認模型
      await query("UPDATE ai_models SET is_default = false", [], connection);
    }

    // 設置新的默認模型
    await query(
      "UPDATE ai_models SET is_default = true WHERE id = ?",
      [modelId],
      connection
    );
  });
};

/**
 * 檢查模型是否存在
 * @param {string} modelName - 模型名稱
 * @param {string} provider - 提供商
 * @returns {Promise<boolean>} 是否存在
 */
export const checkModelExists = async (modelName, provider) => {
  const model = await getModelByNameAndProvider(modelName, provider);
  return !!model;
};

/**
 * 獲取模型統計信息
 * @returns {Promise<Object>} 統計數據
 */
export const getModelStats = async () => {
  const sql = `
    SELECT 
      model_type as provider,
      COUNT(*) as total_count,
      SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_count,
      SUM(CASE WHEN is_default = 1 THEN 1 ELSE 0 END) as default_count,
      SUM(usage_count) as total_usage,
      SUM(total_tokens_used) as total_tokens
    FROM ai_models
    GROUP BY model_type
    ORDER BY provider
  `;

  const result = await query(sql);
  return result.rows;
};

/**
 * 同步模型可用性（批量更新）
 * @param {Array} modelUpdates - 模型更新數據數組
 * @returns {Promise<void>}
 */
export const syncModelAvailability = async (modelUpdates) => {
  await transaction(async (connection) => {
    for (const update of modelUpdates) {
      const { model_name, provider, is_active } = update;
      await query(
        "UPDATE ai_models SET is_active = ? WHERE name = ? AND model_type = ?",
        [is_active, model_name, provider],
        connection
      );
    }
  });
};

// 導出所有方法作為默認對象
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
