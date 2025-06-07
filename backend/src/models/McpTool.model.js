/**
 * MCP 工具管理模型
 * 處理 MCP 工具相關的數據庫操作
 */

import { query, transaction } from "../config/database.config.js";

/**
 * 獲取所有 MCP 工具
 * @param {Object} options - 查詢選項
 * @param {boolean} [options.is_enabled] - 是否只獲取啟用工具
 * @param {number} [options.mcp_service_id] - 按服務過濾
 * @returns {Promise<Array>} MCP 工具列表
 */
export const getAllMcpTools = async (options = {}) => {
  const { is_enabled, mcp_service_id } = options;

  let sql = `
    SELECT 
      t.id,
      t.mcp_service_id,
      t.name,
      t.description,
      t.input_schema,
      t.priority,
      t.usage_count,
      t.is_enabled,
      t.is_deleted,
      t.created_at,
      t.updated_at,
      s.name as service_name,
      s.endpoint_url as service_endpoint
    FROM mcp_tools t
    LEFT JOIN mcp_services s ON t.mcp_service_id = s.id
    WHERE t.is_deleted = 0 AND s.is_deleted = 0
  `;
  const params = [];

  // 添加啟用狀態過濾
  if (is_enabled !== undefined) {
    sql += " AND t.is_enabled = ?";
    params.push(is_enabled);
  }

  // 添加服務過濾
  if (mcp_service_id) {
    sql += " AND t.mcp_service_id = ?";
    params.push(mcp_service_id);
  }

  sql += " ORDER BY t.priority DESC, t.name ASC";

  const result = await query(sql, params);
  return result.rows;
};

/**
 * 根據服務 ID 獲取工具
 * @param {number} serviceId - 服務 ID
 * @param {boolean} [enabledOnly=false] - 是否只獲取啟用的工具
 * @returns {Promise<Array>} MCP 工具列表
 */
export const getMcpToolsByServiceId = async (
  serviceId,
  enabledOnly = false
) => {
  let sql = `
    SELECT 
      id,
      mcp_service_id,
      name,
      description,
      input_schema,
      priority,
      usage_count,
      is_enabled,
      is_deleted,
      created_at,
      updated_at
    FROM mcp_tools
    WHERE mcp_service_id = ? AND is_deleted = 0
  `;
  const params = [serviceId];

  if (enabledOnly) {
    sql += " AND is_enabled = 1";
  }

  sql += " ORDER BY priority DESC, name ASC";

  const result = await query(sql, params);
  return result.rows;
};

/**
 * 獲取已啟用的 MCP 工具（用於聊天系統）
 * @returns {Promise<Array>} 已啟用的 MCP 工具列表
 */
export const getEnabledMcpTools = async () => {
  const sql = `
    SELECT 
      t.id,
      t.mcp_service_id,
      t.name,
      t.description,
      t.input_schema,
      t.priority,
      t.usage_count,
      s.name as service_name,
      s.endpoint_url as service_endpoint
    FROM mcp_tools t
    INNER JOIN mcp_services s ON t.mcp_service_id = s.id
    WHERE t.is_enabled = 1 AND t.is_deleted = 0 
      AND s.is_active = 1 AND s.is_deleted = 0
    ORDER BY t.priority DESC, t.name ASC
  `;

  const result = await query(sql);
  return result.rows;
};

/**
 * 根據 ID 獲取 MCP 工具
 * @param {number} toolId - 工具 ID
 * @returns {Promise<Object|null>} MCP 工具資料
 */
export const getMcpToolById = async (toolId) => {
  const sql = `
    SELECT 
      t.id,
      t.mcp_service_id,
      t.name,
      t.description,
      t.input_schema,
      t.priority,
      t.usage_count,
      t.is_enabled,
      t.is_deleted,
      t.created_at,
      t.updated_at,
      s.name as service_name,
      s.endpoint_url as service_endpoint
    FROM mcp_tools t
    LEFT JOIN mcp_services s ON t.mcp_service_id = s.id
    WHERE t.id = ? AND t.is_deleted = 0
  `;

  const result = await query(sql, [toolId]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * 創建新的 MCP 工具
 * @param {Object} toolData - MCP 工具資料
 * @returns {Promise<Object>} 創建的 MCP 工具資料
 */
export const createMcpTool = async (toolData) => {
  const {
    mcp_service_id,
    name,
    description,
    input_schema,
    priority = 1,
    is_enabled = true,
  } = toolData;

  const sql = `
    INSERT INTO mcp_tools (
      mcp_service_id, name, description, input_schema, priority, is_enabled
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  const result = await query(sql, [
    mcp_service_id,
    name,
    description,
    input_schema ? JSON.stringify(input_schema) : null,
    priority,
    is_enabled ? 1 : 0,
  ]);

  // 獲取創建的工具資料
  return await getMcpToolById(result.rows.insertId);
};

/**
 * 更新 MCP 工具
 * @param {number} toolId - 工具 ID
 * @param {Object} updateData - 更新資料
 * @returns {Promise<Object>} 更新後的 MCP 工具資料
 */
export const updateMcpTool = async (toolId, updateData) => {
  const { name, description, input_schema, priority, is_enabled } = updateData;

  const updateFields = [];
  const params = [];

  if (name !== undefined) {
    updateFields.push("name = ?");
    params.push(name);
  }
  if (description !== undefined) {
    updateFields.push("description = ?");
    params.push(description);
  }
  if (input_schema !== undefined) {
    updateFields.push("input_schema = ?");
    params.push(input_schema ? JSON.stringify(input_schema) : null);
  }

  if (priority !== undefined) {
    updateFields.push("priority = ?");
    params.push(priority);
  }
  if (is_enabled !== undefined) {
    updateFields.push("is_enabled = ?");
    params.push(is_enabled ? 1 : 0);
  }

  if (updateFields.length === 0) {
    throw new Error("沒有提供要更新的字段");
  }

  updateFields.push("updated_at = CURRENT_TIMESTAMP");
  params.push(toolId);

  const sql = `
    UPDATE mcp_tools 
    SET ${updateFields.join(", ")}
    WHERE id = ? AND is_deleted = 0
  `;

  await query(sql, params);

  // 獲取更新後的工具資料
  return await getMcpToolById(toolId);
};

/**
 * 軟刪除 MCP 工具
 * @param {number} toolId - 工具 ID
 * @returns {Promise<boolean>} 是否刪除成功
 */
export const deleteMcpTool = async (toolId) => {
  const sql = `
    UPDATE mcp_tools 
    SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND is_deleted = 0
  `;

  const result = await query(sql, [toolId]);
  return result.rows.affectedRows > 0;
};

/**
 * 同步服務的工具（批量更新/插入）
 * @param {number} serviceId - 服務 ID
 * @param {Array} tools - 工具列表
 * @returns {Promise<Object>} 同步結果統計
 */
export const syncToolsForService = async (serviceId, tools) => {
  return await transaction(async (connection) => {
    let insertedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    for (const tool of tools) {
      try {
        // 檢查工具是否已存在
        const existingResult = await connection.execute(
          "SELECT id FROM mcp_tools WHERE mcp_service_id = ? AND name = ? AND is_deleted = 0",
          [serviceId, tool.name]
        );

        if (existingResult[0].length > 0) {
          // 更新現有工具
          await connection.execute(
            "UPDATE mcp_tools SET description = ?, input_schema = ?, updated_at = CURRENT_TIMESTAMP WHERE mcp_service_id = ? AND name = ? AND is_deleted = 0",
            [
              tool.description,
              tool.input_schema ? JSON.stringify(tool.input_schema) : null,
              serviceId,
              tool.name,
            ]
          );
          updatedCount++;
        } else {
          // 插入新工具
          await connection.execute(
            "INSERT INTO mcp_tools (mcp_service_id, name, description, input_schema, priority) VALUES (?, ?, ?, ?, ?, ?)",
            [
              serviceId,
              tool.name,
              tool.description,
              tool.input_schema ? JSON.stringify(tool.input_schema) : null,
              tool.priority || 1,
            ]
          );
          insertedCount++;
        }
      } catch (error) {
        console.error(`同步工具 ${tool.name} 失敗:`, error.message);
        errorCount++;
      }
    }

    return {
      total: tools.length,
      inserted: insertedCount,
      updated: updatedCount,
      errors: errorCount,
    };
  });
};

/**
 * 增加工具使用次數
 * @param {number} toolId - 工具 ID
 * @returns {Promise<boolean>} 是否更新成功
 */
export const incrementToolUsage = async (toolId) => {
  const sql = `
    UPDATE mcp_tools 
    SET usage_count = usage_count + 1, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND is_deleted = 0
  `;

  const result = await query(sql, [toolId]);
  return result.rows.affectedRows > 0;
};

/**
 * 批量更新工具狀態
 * @param {Array} toolIds - 工具 ID 列表
 * @param {boolean} isEnabled - 是否啟用
 * @returns {Promise<number>} 更新的工具數量
 */
export const batchUpdateToolStatus = async (toolIds, isEnabled) => {
  if (!toolIds || toolIds.length === 0) {
    return 0;
  }

  const placeholders = toolIds.map(() => "?").join(",");
  const sql = `
    UPDATE mcp_tools 
    SET is_enabled = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id IN (${placeholders}) AND is_deleted = 0
  `;

  const params = [isEnabled ? 1 : 0, ...toolIds];
  const result = await query(sql, params);
  return result.rows.affectedRows;
};

/**
 * 獲取最常用的工具
 * @param {number} [limit=10] - 限制數量
 * @returns {Promise<Array>} 最常用工具列表
 */
export const getTopUsedTools = async (limit = 10) => {
  const sql = `
    SELECT 
      t.id,
      t.name,
      t.description,     
      t.usage_count,
      s.name as service_name
    FROM mcp_tools t
    INNER JOIN mcp_services s ON t.mcp_service_id = s.id
    WHERE t.is_deleted = 0 AND s.is_deleted = 0
    ORDER BY t.usage_count DESC
    LIMIT ?
  `;

  const result = await query(sql, [limit]);
  return result.rows;
};

/**
 * 檢查工具名稱是否在服務中已存在
 * @param {number} serviceId - 服務 ID
 * @param {string} toolName - 工具名稱
 * @param {number} [excludeId] - 排除的工具 ID（用於更新時檢查）
 * @returns {Promise<boolean>} 是否已存在
 */
export const checkToolExistsInService = async (
  serviceId,
  toolName,
  excludeId = null
) => {
  let sql = `
    SELECT id FROM mcp_tools 
    WHERE mcp_service_id = ? AND name = ? AND is_deleted = 0
  `;
  const params = [serviceId, toolName];

  if (excludeId) {
    sql += " AND id != ?";
    params.push(excludeId);
  }

  const result = await query(sql, params);
  return result.rows.length > 0;
};

// 導出所有方法
export default {
  getAllMcpTools,
  getMcpToolsByServiceId,
  getEnabledMcpTools,
  getMcpToolById,
  createMcpTool,
  updateMcpTool,
  deleteMcpTool,
  syncToolsForService,
  incrementToolUsage,
  batchUpdateToolStatus,
  getTopUsedTools,
  checkToolExistsInService,
};
