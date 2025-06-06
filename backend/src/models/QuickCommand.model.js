/**
 * 快速命令詞模型
 * 處理快速命令詞相關的數據庫操作
 */

import { query } from "../config/database.config.js";

/**
 * 獲取智能體的快速命令詞
 * @param {number} agentId - 智能體 ID
 * @returns {Promise<Array>} 快速命令詞列表
 */
export const getAgentQuickCommands = async (agentId) => {
  const sql = `
    SELECT 
      qc.id,
      COALESCE(aqc.custom_text, qc.command_text) as text,
      qc.description,
      qc.icon,
      aqc.display_order,
      aqc.is_enabled
    FROM agent_quick_commands aqc
    JOIN quick_commands qc ON aqc.quick_command_id = qc.id
    WHERE aqc.agent_id = ? 
      AND aqc.is_enabled = TRUE 
      AND qc.is_active = TRUE
    ORDER BY aqc.display_order ASC, qc.id ASC
  `;

  const result = await query(sql, [agentId]);
  return result.rows;
};

/**
 * 獲取所有快速命令詞
 * @param {Object} options - 查詢選項
 * @param {boolean} [options.active=true] - 是否只獲取啟用的命令
 * @returns {Promise<Array>} 快速命令詞列表
 */
export const getAllQuickCommands = async (options = {}) => {
  const { active = true } = options;

  let sql = `
    SELECT 
      id,
      command_text as text,
      description,
      icon,
      usage_count,
      is_active,
      created_by,
      created_at,
      updated_at
    FROM quick_commands
    WHERE 1=1
  `;
  const params = [];

  // 添加啟用狀態過濾
  if (active === true) {
    sql += " AND is_active = TRUE";
  }

  sql += " ORDER BY usage_count DESC, id ASC";

  const result = await query(sql, params);
  return result.rows;
};

/**
 * 獲取所有快速命令詞及其智能體關聯資訊（用於管理介面）
 * @param {Object} options - 查詢選項
 * @param {boolean} [options.active] - 是否只獲取啟用的命令
 * @returns {Promise<Array>} 包含智能體關聯的快速命令詞列表
 */
export const getAllQuickCommandsWithAgents = async (options = {}) => {
  const { active } = options;

  let sql = `
    SELECT 
      qc.id,
      qc.command_text as text,
      qc.description,
      qc.icon,
      qc.usage_count,
      qc.is_active,
      qc.created_by,
      qc.created_at,
      qc.updated_at,
      aqc.agent_id,
      a.display_name as agent_name,
      a.name as agent_internal_name
    FROM quick_commands qc
    LEFT JOIN agent_quick_commands aqc ON qc.id = aqc.quick_command_id AND aqc.is_enabled = TRUE
    LEFT JOIN agents a ON aqc.agent_id = a.id
    WHERE 1=1
  `;
  const params = [];

  // 添加啟用狀態過濾
  if (active !== undefined) {
    sql += " AND qc.is_active = ?";
    params.push(active);
  }

  sql += " ORDER BY qc.usage_count DESC, qc.id ASC";

  const result = await query(sql, params);
  return result.rows;
};

/**
 * 增加快速命令詞使用次數
 * @param {number} commandId - 命令詞 ID
 * @returns {Promise<void>}
 */
export const incrementUsageCount = async (commandId) => {
  const sql = `
    UPDATE quick_commands 
    SET usage_count = usage_count + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  await query(sql, [commandId]);
};

/**
 * 檢查快速命令詞是否存在
 * @param {string} commandText - 命令詞文字
 * @returns {Promise<boolean>} 是否存在
 */
export const checkCommandExists = async (commandText) => {
  const sql = "SELECT id FROM quick_commands WHERE command_text = ?";
  const result = await query(sql, [commandText.trim()]);
  return result.rows.length > 0;
};

/**
 * 創建新的快速命令詞
 * @param {Object} commandData - 命令詞數據
 * @param {string} commandData.command_text - 命令詞文字
 * @param {string} [commandData.description] - 命令說明
 * @param {string} [commandData.icon] - 圖標名稱
 * @param {number} [commandData.created_by] - 創建者用戶 ID
 * @returns {Promise<Object>} 創建的命令詞數據
 */
export const createQuickCommand = async (commandData) => {
  const { command_text, description, icon, created_by } = commandData;

  const sql = `
    INSERT INTO quick_commands (
      command_text, description, icon, 
      is_system, created_by
    ) VALUES (?, ?, ?, FALSE, ?)
  `;

  const result = await query(sql, [
    command_text.trim(),
    description?.trim() || null,
    icon || null,
    created_by,
  ]);

  return {
    id: result.rows.insertId,
    command_text: command_text.trim(),
    description: description?.trim() || null,
    icon: icon || null,
  };
};

/**
 * 根據 ID 獲取快速命令詞
 * @param {number} commandId - 命令詞 ID
 * @returns {Promise<Object|null>} 命令詞數據
 */
export const getQuickCommandById = async (commandId) => {
  const sql = `
    SELECT 
      id,
      command_text,
      description,
      icon,
      usage_count,
      is_active,
      is_system,
      created_by,
      created_at,
      updated_at
    FROM quick_commands
    WHERE id = ?
  `;

  const result = await query(sql, [commandId]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * 更新快速命令詞
 * @param {number} commandId - 命令詞 ID
 * @param {Object} updateData - 更新數據
 * @returns {Promise<void>}
 */
export const updateQuickCommand = async (commandId, updateData) => {
  const allowedFields = ["command_text", "description", "icon", "is_active"];
  const updates = [];
  const params = [];

  Object.keys(updateData).forEach((key) => {
    if (allowedFields.includes(key) && updateData[key] !== undefined) {
      updates.push(`${key} = ?`);
      params.push(updateData[key]);
    }
  });

  if (updates.length === 0) {
    throw new Error("沒有有效的更新字段");
  }

  params.push(commandId);
  const sql = `UPDATE quick_commands SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;

  const result = await query(sql, params);

  // 檢查是否有記錄被更新
  if (result.rows.affectedRows === 0) {
    throw new Error(`快速命令詞不存在 (ID: ${commandId})`);
  }
};

/**
 * 刪除快速命令詞（軟刪除）
 * @param {number} commandId - 命令詞 ID
 * @returns {Promise<void>}
 */
export const deleteQuickCommand = async (commandId) => {
  const sql =
    "UPDATE quick_commands SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?";
  await query(sql, [commandId]);
};

export default {
  getAgentQuickCommands,
  getAllQuickCommands,
  getAllQuickCommandsWithAgents,
  incrementUsageCount,
  checkCommandExists,
  createQuickCommand,
  getQuickCommandById,
  updateQuickCommand,
  deleteQuickCommand,
};
