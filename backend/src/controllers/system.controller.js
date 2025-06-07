/**
 * 系統管理控制器
 * 處理系統統計、配置和審計日誌相關功能
 */

import { query } from "../config/database.config.js";
import {
  catchAsync,
  createSuccessResponse,
  ValidationError,
  BusinessError,
  AuthorizationError,
} from "../middleware/errorHandler.middleware.js";
import logger from "../utils/logger.util.js";
import Joi from "joi";

// 輸入驗證模式
const schemas = {
  updateSystemConfig: Joi.object({
    ai_models: Joi.object().optional(),
    system_settings: Joi.object().optional(),
    security_settings: Joi.object().optional(),
    notification_settings: Joi.object().optional(),
  }),
};

/**
 * 檢查管理員權限
 */
const checkAdminPermission = (user, requiredLevel = "admin") => {
  const roleHierarchy = {
    user: 1,
    admin: 2,
    super_admin: 3,
  };

  const userLevel = roleHierarchy[user.role] || 0;
  const requiredLevelNum = roleHierarchy[requiredLevel] || 0;

  if (userLevel < requiredLevelNum) {
    throw new AuthorizationError("權限不足，需要管理員權限");
  }
};

/**
 * 獲取系統統計信息
 */
export const handleGetSystemStats = catchAsync(async (req, res) => {
  checkAdminPermission(req.user, "admin");

  try {
    // 用戶統計
    const userStatsQuery = `
      SELECT 
        COUNT(*) as total_users,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_users,
        SUM(CASE WHEN role IN ('admin', 'super_admin') THEN 1 ELSE 0 END) as admin_users,
        SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as new_users_30d
      FROM users
    `;
    const {
      rows: [userStats],
    } = await query(userStatsQuery);

    // 對話統計
    const conversationStatsQuery = `
      SELECT 
        COUNT(*) as total_conversations,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_conversations,
        SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) as new_conversations_7d
      FROM conversations
    `;
    const {
      rows: [conversationStats],
    } = await query(conversationStatsQuery);

    // 消息統計
    const messageStatsQuery = `
      SELECT 
        COUNT(*) as total_messages,
        SUM(CASE WHEN role = 'user' THEN 1 ELSE 0 END) as user_messages,
        SUM(CASE WHEN role = 'assistant' THEN 1 ELSE 0 END) as assistant_messages,
        SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY) THEN 1 ELSE 0 END) as messages_24h
      FROM messages
    `;
    const {
      rows: [messageStats],
    } = await query(messageStatsQuery);

    // Token 統計
    const tokenStatsQuery = `
      SELECT 
        COALESCE(SUM(prompt_tokens), 0) + COALESCE(SUM(completion_tokens), 0) as total_tokens,
        COALESCE(SUM(total_cost), 0) as total_cost,
        CASE 
          WHEN COUNT(*) > 0 THEN 
            (COALESCE(SUM(prompt_tokens), 0) + COALESCE(SUM(completion_tokens), 0)) / COUNT(*)
          ELSE 0 
        END as avg_tokens_per_message
      FROM messages 
      WHERE role = 'assistant'
    `;
    const {
      rows: [tokenStats],
    } = await query(tokenStatsQuery);

    const systemStats = {
      users: userStats,
      conversations: conversationStats,
      messages: messageStats,
      tokens: tokenStats,
    };

    res.json(createSuccessResponse(systemStats, "獲取系統統計成功"));
  } catch (error) {
    logger.error("獲取系統統計失敗:", error);
    throw new BusinessError("獲取系統統計失敗");
  }
});

/**
 * 獲取系統配置
 */
export const handleGetSystemConfig = catchAsync(async (req, res) => {
  checkAdminPermission(req.user, "admin");

  try {
    const configQuery = `
      SELECT config_key, config_value, description 
      FROM system_configs 
      WHERE is_active = 1
      ORDER BY config_key
    `;
    const configs = await query(configQuery);

    // 將配置轉換為對象格式
    const configObject = {};
    configs.forEach((config) => {
      try {
        configObject[config.config_key] = JSON.parse(config.config_value);
      } catch (error) {
        configObject[config.config_key] = config.config_value;
      }
    });

    res.json(createSuccessResponse(configObject, "獲取系統配置成功"));
  } catch (error) {
    logger.error("獲取系統配置失敗:", error);
    throw new BusinessError("獲取系統配置失敗");
  }
});

/**
 * 更新系統配置
 */
export const handleUpdateSystemConfig = catchAsync(async (req, res) => {
  checkAdminPermission(req.user, "super_admin"); // 只有超級管理員可以修改系統配置

  // 驗證輸入
  const { error, value } = schemas.updateSystemConfig.validate(req.body);
  if (error) {
    throw new ValidationError(error.details[0].message);
  }

  try {
    // 批量更新配置
    for (const [key, configValue] of Object.entries(value)) {
      const configValueStr =
        typeof configValue === "object"
          ? JSON.stringify(configValue)
          : configValue;

      await query(
        `INSERT INTO system_configs (config_key, config_value, updated_by) 
         VALUES (?, ?, ?) 
         ON DUPLICATE KEY UPDATE 
         config_value = VALUES(config_value), 
         updated_by = VALUES(updated_by), 
         updated_at = NOW()`,
        [key, configValueStr, req.user.id]
      );
    }

    // 記錄審計日誌
    await query(
      "INSERT INTO audit_logs (user_id, action, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)",
      [
        req.user.id,
        "UPDATE_SYSTEM_CONFIG",
        JSON.stringify({ updated_configs: Object.keys(value) }),
        req.ip,
        req.get("User-Agent"),
      ]
    );

    res.json(createSuccessResponse(null, "系統配置更新成功"));
  } catch (error) {
    logger.error("更新系統配置失敗:", error);
    throw new BusinessError("更新系統配置失敗");
  }
});

/**
 * 獲取審計日誌
 */
export const handleGetAuditLogs = catchAsync(async (req, res) => {
  checkAdminPermission(req.user, "admin");

  const {
    page = 1,
    limit = 50,
    user_id,
    action,
    start_date,
    end_date,
    sortOrder = "DESC",
  } = req.query;

  // 構建查詢條件
  let whereConditions = [];
  let queryParams = [];

  if (user_id) {
    whereConditions.push("al.user_id = ?");
    queryParams.push(user_id);
  }

  if (action) {
    whereConditions.push("al.action = ?");
    queryParams.push(action);
  }

  if (start_date) {
    whereConditions.push("al.created_at >= ?");
    queryParams.push(start_date);
  }

  if (end_date) {
    whereConditions.push("al.created_at <= ?");
    queryParams.push(end_date + " 23:59:59");
  }

  const whereClause =
    whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

  // 獲取總數
  const countQuery = `
    SELECT COUNT(*) as total 
    FROM audit_logs al 
    ${whereClause}
  `;
  const {
    rows: [{ total }],
  } = await query(countQuery, queryParams);

  // 計算分頁
  const offset = (page - 1) * limit;
  const totalPages = Math.ceil(total / limit);

  // 獲取審計日誌
  const logsQuery = `
    SELECT 
      al.id, al.user_id, al.action, al.details, 
      al.ip_address, al.user_agent, al.created_at,
      u.username, u.email
    FROM audit_logs al
    LEFT JOIN users u ON al.user_id = u.id
    ${whereClause}
    ORDER BY al.created_at ${sortOrder}
    LIMIT ? OFFSET ?
  `;

  const logs = await query(logsQuery, [
    ...queryParams,
    parseInt(limit),
    offset,
  ]);

  // 處理響應數據
  const processedLogs = logs.map((log) => ({
    ...log,
    details: log.details ? JSON.parse(log.details) : null,
  }));

  const responseData = {
    data: processedLogs,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: totalPages,
    },
  };

  res.json(createSuccessResponse(responseData, "獲取審計日誌成功"));
});

export default {
  handleGetSystemStats,
  handleGetSystemConfig,
  handleUpdateSystemConfig,
  handleGetAuditLogs,
};
