/**
 * MCP 服務管理模型
 * 處理 MCP 服務相關的數據庫操作
 */

import { query, transaction } from "../config/database.config.js";

/**
 * 獲取所有 MCP 服務
 * @param {Object} options - 查詢選項
 * @param {boolean} [options.is_active] - 是否只獲取啟用服務
 * @param {string} [options.owner] - 按擁有者過濾
 * @returns {Promise<Array>} MCP 服務列表
 */
export const getAllMcpServices = async (options = {}) => {
  const { is_active, owner } = options;

  let sql = `
    SELECT 
      id,
      name,
      endpoint_url,
      description,
      is_active,
      version,
      owner,
      icon,
      is_deleted,
      created_at,
      updated_at
    FROM mcp_services
    WHERE is_deleted = 0
  `;
  const params = [];

  // 添加啟用狀態過濾
  if (is_active !== undefined) {
    sql += " AND is_active = ?";
    params.push(is_active);
  }

  // 添加擁有者過濾
  if (owner) {
    sql += " AND owner = ?";
    params.push(owner);
  }

  sql += " ORDER BY created_at DESC";

  const result = await query(sql, params);
  return result.rows;
};

/**
 * 根據 ID 獲取 MCP 服務
 * @param {number} serviceId - 服務 ID
 * @returns {Promise<Object|null>} MCP 服務資料
 */
export const getMcpServiceById = async (serviceId) => {
  const sql = `
    SELECT 
      id,
      name,
      endpoint_url,
      description,
      is_active,
      version,
      owner,
      icon,
      is_deleted,
      created_at,
      updated_at
    FROM mcp_services
    WHERE id = ? AND is_deleted = 0
  `;

  const result = await query(sql, [serviceId]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * 根據名稱獲取 MCP 服務
 * @param {string} serviceName - 服務名稱
 * @returns {Promise<Object|null>} MCP 服務資料
 */
export const getMcpServiceByName = async (serviceName) => {
  const sql = `
    SELECT 
      id,
      name,
      endpoint_url,
      description,
      is_active,
      version,
      owner,
      icon,
      is_deleted,
      created_at,
      updated_at
    FROM mcp_services
    WHERE name = ? AND is_deleted = 0
  `;

  const result = await query(sql, [serviceName]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * 創建新的 MCP 服務
 * @param {Object} serviceData - MCP 服務資料
 * @returns {Promise<Object>} 創建的 MCP 服務資料
 */
export const createMcpService = async (serviceData) => {
  const {
    name,
    endpoint_url,
    description,
    owner,
    icon,
    version = 1,
    is_active = true,
  } = serviceData;

  const sql = `
    INSERT INTO mcp_services (
      name, endpoint_url, description, owner, icon, version, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  const result = await query(sql, [
    name,
    endpoint_url,
    description,
    owner,
    icon,
    version,
    is_active ? 1 : 0,
  ]);

  // 獲取創建的服務資料
  return await getMcpServiceById(result.rows.insertId);
};

/**
 * 更新 MCP 服務
 * @param {number} serviceId - 服務 ID
 * @param {Object} updateData - 更新資料
 * @returns {Promise<Object>} 更新後的 MCP 服務資料
 */
export const updateMcpService = async (serviceId, updateData) => {
  const { name, endpoint_url, description, owner, icon, version, is_active } =
    updateData;

  const updateFields = [];
  const params = [];

  if (name !== undefined) {
    updateFields.push("name = ?");
    params.push(name);
  }
  if (endpoint_url !== undefined) {
    updateFields.push("endpoint_url = ?");
    params.push(endpoint_url);
  }
  if (description !== undefined) {
    updateFields.push("description = ?");
    params.push(description);
  }
  if (owner !== undefined) {
    updateFields.push("owner = ?");
    params.push(owner);
  }
  if (icon !== undefined) {
    updateFields.push("icon = ?");
    params.push(icon);
  }
  if (version !== undefined) {
    updateFields.push("version = ?");
    params.push(version);
  }
  if (is_active !== undefined) {
    updateFields.push("is_active = ?");
    params.push(is_active ? 1 : 0);
  }

  if (updateFields.length === 0) {
    throw new Error("沒有提供要更新的字段");
  }

  updateFields.push("updated_at = CURRENT_TIMESTAMP");
  params.push(serviceId);

  const sql = `
    UPDATE mcp_services 
    SET ${updateFields.join(", ")}
    WHERE id = ? AND is_deleted = 0
  `;

  await query(sql, params);

  // 獲取更新後的服務資料
  return await getMcpServiceById(serviceId);
};

/**
 * 軟刪除 MCP 服務
 * @param {number} serviceId - 服務 ID
 * @returns {Promise<boolean>} 是否刪除成功
 */
export const deleteMcpService = async (serviceId) => {
  return await transaction(async (connection) => {
    // 軟刪除服務
    const serviceResult = await connection.execute(
      "UPDATE mcp_services SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND is_deleted = 0",
      [serviceId]
    );

    // 軟刪除關聯的工具
    await connection.execute(
      "UPDATE mcp_tools SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE mcp_service_id = ? AND is_deleted = 0",
      [serviceId]
    );

    return serviceResult[0].affectedRows > 0;
  });
};

/**
 * 切換 MCP 服務的啟用狀態
 * @param {number} serviceId - 服務 ID
 * @param {boolean} isActive - 是否啟用
 * @returns {Promise<Object>} 更新後的 MCP 服務資料
 */
export const toggleMcpServiceStatus = async (serviceId, isActive) => {
  const sql = `
    UPDATE mcp_services 
    SET is_active = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND is_deleted = 0
  `;

  await query(sql, [isActive ? 1 : 0, serviceId]);

  // 獲取更新後的服務資料
  return await getMcpServiceById(serviceId);
};

/**
 * 檢查 MCP 服務名稱是否已存在
 * @param {string} serviceName - 服務名稱
 * @param {number} [excludeId] - 排除的服務 ID（用於更新時檢查）
 * @returns {Promise<boolean>} 是否已存在
 */
export const checkMcpServiceExists = async (serviceName, excludeId = null) => {
  let sql = `
    SELECT id FROM mcp_services 
    WHERE name = ? AND is_deleted = 0
  `;
  const params = [serviceName];

  if (excludeId) {
    sql += " AND id != ?";
    params.push(excludeId);
  }

  const result = await query(sql, params);
  return result.rows.length > 0;
};

/**
 * 獲取 MCP 服務統計資訊
 * @returns {Promise<Object>} 統計資訊
 */
export const getMcpServiceStats = async () => {
  const sql = `
    SELECT 
      COUNT(*) as total_services,
      SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_services,
      SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactive_services,
      COUNT(DISTINCT owner) as unique_owners
    FROM mcp_services
    WHERE is_deleted = 0
  `;

  const result = await query(sql);
  return result.rows[0];
};

/**
 * 根據擁有者分組獲取服務
 * @returns {Promise<Array>} 按擁有者分組的服務數據
 */
export const getMcpServicesByOwner = async () => {
  const sql = `
    SELECT 
      owner,
      COUNT(*) as service_count,
      SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_count
    FROM mcp_services
    WHERE is_deleted = 0
    GROUP BY owner
    ORDER BY service_count DESC
  `;

  const result = await query(sql);
  return result.rows;
};

/**
 * 獲取活躍的 MCP 服務（用於工具調用）
 * @returns {Promise<Array>} 活躍的 MCP 服務列表
 */
export const getActiveMcpServices = async () => {
  const sql = `
    SELECT 
      id,
      name,
      endpoint_url,
      description,
      version
    FROM mcp_services
    WHERE is_active = 1 AND is_deleted = 0
    ORDER BY name
  `;

  const result = await query(sql);
  return result.rows;
};

// 導出所有方法
export default {
  getAllMcpServices,
  getMcpServiceById,
  getMcpServiceByName,
  createMcpService,
  updateMcpService,
  deleteMcpService,
  toggleMcpServiceStatus,
  checkMcpServiceExists,
  getMcpServiceStats,
  getMcpServicesByOwner,
  getActiveMcpServices,
};
