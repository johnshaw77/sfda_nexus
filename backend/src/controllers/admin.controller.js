/**
 * 管理員控制器
 * 處理用戶管理、系統管理等管理員功能
 */

import UserModel from "../models/User.model.js";
import ConversationModel from "../models/Conversation.model.js";
import MessageModel from "../models/Message.model.js";
import { query } from "../config/database.config.js";
import {
  catchAsync,
  createSuccessResponse,
  ValidationError,
  BusinessError,
  ForbiddenError,
} from "../middleware/errorHandler.middleware.js";
import logger from "../utils/logger.util.js";
import Joi from "joi";
import bcrypt from "bcryptjs";

// 輸入驗證模式
const schemas = {
  createUser: Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required().messages({
      "string.alphanum": "用戶名只能包含字母和數字",
      "string.min": "用戶名至少需要3個字符",
      "string.max": "用戶名不能超過30個字符",
      "any.required": "用戶名是必填項",
    }),
    email: Joi.string().email().required().messages({
      "string.email": "請輸入有效的電子郵件地址",
      "any.required": "電子郵件是必填項",
    }),
    password: Joi.string().min(6).required().messages({
      "string.min": "密碼至少需要6個字符",
      "any.required": "密碼是必填項",
    }),
    role: Joi.string().valid("user", "admin", "super_admin").default("user"),
    is_active: Joi.boolean().default(true),
    profile: Joi.object({
      display_name: Joi.string().max(50).optional(),
      avatar_url: Joi.string().uri().optional(),
      bio: Joi.string().max(500).optional(),
    }).optional(),
  }),

  updateUser: Joi.object({
    username: Joi.string().alphanum().min(3).max(30).optional(),
    email: Joi.string().email().optional(),
    role: Joi.string().valid("user", "admin", "super_admin").optional(),
    is_active: Joi.boolean().optional(),
    profile: Joi.object({
      display_name: Joi.string().max(50).optional(),
      avatar_url: Joi.string().uri().optional(),
      bio: Joi.string().max(500).optional(),
    }).optional(),
  }),

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
    throw new ForbiddenError("權限不足，需要管理員權限");
  }
};

/**
 * 獲取用戶列表
 */
export const handleGetUsers = catchAsync(async (req, res) => {
  checkAdminPermission(req.user, "admin");

  const {
    page = 1,
    limit = 20,
    role,
    is_active,
    search,
    sortBy = "created_at",
    sortOrder = "DESC",
  } = req.query;

  const result = await UserModel.findAll({
    page: parseInt(page),
    limit: parseInt(limit),
    role,
    is_active: is_active !== undefined ? is_active === "true" : undefined,
    search,
    sortBy,
    sortOrder,
  });

  res.json(createSuccessResponse(result, "獲取用戶列表成功"));
});

/**
 * 獲取單個用戶詳情
 */
export const handleGetUser = catchAsync(async (req, res) => {
  checkAdminPermission(req.user, "admin");

  const { userId } = req.params;
  const user = await UserModel.findById(userId);

  if (!user) {
    throw new BusinessError("用戶不存在");
  }

  // 獲取用戶統計信息
  const stats = await getUserStats(userId);

  res.json(
    createSuccessResponse(
      {
        ...user,
        stats,
      },
      "獲取用戶詳情成功"
    )
  );
});

/**
 * 創建用戶
 */
export const handleCreateUser = catchAsync(async (req, res) => {
  checkAdminPermission(req.user, "admin");

  // 輸入驗證
  const { error, value } = schemas.createUser.validate(req.body);
  if (error) {
    throw new ValidationError("輸入驗證失敗", error.details);
  }

  const { username, email, password, role, is_active, profile } = value;

  // 檢查用戶名和郵箱是否已存在
  const existingUser = await UserModel.findByUsernameOrEmail(username, email);
  if (existingUser) {
    throw new BusinessError("用戶名或郵箱已存在");
  }

  // 檢查權限：只有super_admin可以創建admin用戶
  if (role === "admin" && req.user.role !== "super_admin") {
    throw new ForbiddenError("只有超級管理員可以創建管理員用戶");
  }

  if (role === "super_admin" && req.user.role !== "super_admin") {
    throw new ForbiddenError("只有超級管理員可以創建超級管理員用戶");
  }

  // 加密密碼
  const hashedPassword = await bcrypt.hash(password, 12);

  // 創建用戶
  const newUser = await UserModel.create({
    username,
    email,
    password: hashedPassword,
    role,
    is_active,
    profile: profile || {},
  });

  logger.audit(req.user.id, "USER_CREATED", {
    targetUserId: newUser.id,
    username: newUser.username,
    role: newUser.role,
  });

  // 移除密碼字段
  delete newUser.password;

  res.status(201).json(createSuccessResponse(newUser, "用戶創建成功"));
});

/**
 * 更新用戶
 */
export const handleUpdateUser = catchAsync(async (req, res) => {
  checkAdminPermission(req.user, "admin");

  const { userId } = req.params;

  // 輸入驗證
  const { error, value } = schemas.updateUser.validate(req.body);
  if (error) {
    throw new ValidationError("輸入驗證失敗", error.details);
  }

  // 檢查目標用戶是否存在
  const targetUser = await UserModel.findById(userId);
  if (!targetUser) {
    throw new BusinessError("用戶不存在");
  }

  // 權限檢查
  if (value.role) {
    // 不能修改自己的角色
    if (targetUser.id === req.user.id) {
      throw new BusinessError("不能修改自己的角色");
    }

    // 只有super_admin可以修改admin角色
    if (
      (targetUser.role === "admin" || value.role === "admin") &&
      req.user.role !== "super_admin"
    ) {
      throw new ForbiddenError("只有超級管理員可以修改管理員角色");
    }

    // 只有super_admin可以修改super_admin角色
    if (
      (targetUser.role === "super_admin" || value.role === "super_admin") &&
      req.user.role !== "super_admin"
    ) {
      throw new ForbiddenError("只有超級管理員可以修改超級管理員角色");
    }
  }

  // 檢查用戶名和郵箱唯一性
  if (value.username || value.email) {
    const existingUser = await UserModel.findByUsernameOrEmail(
      value.username || targetUser.username,
      value.email || targetUser.email
    );

    if (existingUser && existingUser.id !== parseInt(userId)) {
      throw new BusinessError("用戶名或郵箱已存在");
    }
  }

  // 更新用戶
  const updatedUser = await UserModel.update(userId, value);

  logger.audit(req.user.id, "USER_UPDATED", {
    targetUserId: userId,
    updates: Object.keys(value),
  });

  res.json(createSuccessResponse(updatedUser, "用戶更新成功"));
});

/**
 * 刪除用戶（軟刪除）
 */
export const handleDeleteUser = catchAsync(async (req, res) => {
  checkAdminPermission(req.user, "admin");

  const { userId } = req.params;

  // 檢查目標用戶
  const targetUser = await UserModel.findById(userId);
  if (!targetUser) {
    throw new BusinessError("用戶不存在");
  }

  // 不能刪除自己
  if (targetUser.id === req.user.id) {
    throw new BusinessError("不能刪除自己的帳戶");
  }

  // 只有super_admin可以刪除admin用戶
  if (targetUser.role === "admin" && req.user.role !== "super_admin") {
    throw new ForbiddenError("只有超級管理員可以刪除管理員用戶");
  }

  if (targetUser.role === "super_admin" && req.user.role !== "super_admin") {
    throw new ForbiddenError("只有超級管理員可以刪除超級管理員用戶");
  }

  // 軟刪除用戶
  await UserModel.softDelete(userId);

  logger.audit(req.user.id, "USER_DELETED", {
    targetUserId: userId,
    username: targetUser.username,
  });

  res.json(createSuccessResponse(null, "用戶刪除成功"));
});

/**
 * 重置用戶密碼
 */
export const handleResetUserPassword = catchAsync(async (req, res) => {
  checkAdminPermission(req.user, "admin");

  const { userId } = req.params;
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    throw new ValidationError("新密碼至少需要6個字符");
  }

  // 檢查目標用戶
  const targetUser = await UserModel.findById(userId);
  if (!targetUser) {
    throw new BusinessError("用戶不存在");
  }

  // 權限檢查
  if (targetUser.role === "admin" && req.user.role !== "super_admin") {
    throw new ForbiddenError("只有超級管理員可以重置管理員密碼");
  }

  if (targetUser.role === "super_admin" && req.user.role !== "super_admin") {
    throw new ForbiddenError("只有超級管理員可以重置超級管理員密碼");
  }

  // 加密新密碼
  const hashedPassword = await bcrypt.hash(newPassword, 12);

  // 更新密碼
  await UserModel.update(userId, { password: hashedPassword });

  // 使該用戶的所有token失效
  await query(
    "INSERT INTO token_blacklist (token, user_id, reason, created_at) SELECT token, user_id, 'password_reset', NOW() FROM user_sessions WHERE user_id = ?",
    [userId]
  );

  // 刪除用戶會話
  await query("DELETE FROM user_sessions WHERE user_id = ?", [userId]);

  logger.audit(req.user.id, "PASSWORD_RESET", {
    targetUserId: userId,
    username: targetUser.username,
  });

  res.json(createSuccessResponse(null, "密碼重置成功"));
});

/**
 * 獲取系統統計信息
 */
export const handleGetSystemStats = catchAsync(async (req, res) => {
  checkAdminPermission(req.user, "admin");

  const stats = await getSystemStats();

  res.json(createSuccessResponse(stats, "獲取系統統計成功"));
});

/**
 * 獲取系統配置
 */
export const handleGetSystemConfig = catchAsync(async (req, res) => {
  checkAdminPermission(req.user, "admin");

  const { rows } = await query(
    "SELECT config_key, config_value, description FROM system_config ORDER BY config_key"
  );

  const config = {};
  rows.forEach((row) => {
    try {
      config[row.config_key] = JSON.parse(row.config_value);
    } catch {
      config[row.config_key] = row.config_value;
    }
  });

  res.json(createSuccessResponse(config, "獲取系統配置成功"));
});

/**
 * 更新系統配置
 */
export const handleUpdateSystemConfig = catchAsync(async (req, res) => {
  checkAdminPermission(req.user, "super_admin");

  // 輸入驗證
  const { error, value } = schemas.updateSystemConfig.validate(req.body);
  if (error) {
    throw new ValidationError("輸入驗證失敗", error.details);
  }

  const updates = [];
  for (const [key, val] of Object.entries(value)) {
    const configValue = typeof val === "object" ? JSON.stringify(val) : val;

    await query(
      `INSERT INTO system_config (config_key, config_value, updated_at) 
       VALUES (?, ?, NOW()) 
       ON DUPLICATE KEY UPDATE config_value = VALUES(config_value), updated_at = NOW()`,
      [key, configValue]
    );

    updates.push(key);
  }

  logger.audit(req.user.id, "SYSTEM_CONFIG_UPDATED", {
    updatedKeys: updates,
  });

  res.json(createSuccessResponse(null, "系統配置更新成功"));
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

  let whereClause = "WHERE 1=1";
  const params = [];

  if (user_id) {
    whereClause += " AND user_id = ?";
    params.push(user_id);
  }

  if (action) {
    whereClause += " AND action = ?";
    params.push(action);
  }

  if (start_date) {
    whereClause += " AND created_at >= ?";
    params.push(start_date);
  }

  if (end_date) {
    whereClause += " AND created_at <= ?";
    params.push(end_date);
  }

  const offset = (parseInt(page) - 1) * parseInt(limit);

  // 獲取總數
  const { rows: countRows } = await query(
    `SELECT COUNT(*) as total FROM audit_logs ${whereClause}`,
    params
  );
  const total = countRows[0].total;

  // 獲取日誌列表
  const { rows } = await query(
    `SELECT 
      al.*,
      u.username,
      u.email
    FROM audit_logs al
    LEFT JOIN users u ON al.user_id = u.id
    ${whereClause}
    ORDER BY al.created_at ${sortOrder}
    LIMIT ? OFFSET ?`,
    [...params, parseInt(limit), offset]
  );

  const result = {
    data: rows,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
  };

  res.json(createSuccessResponse(result, "獲取審計日誌成功"));
});

/**
 * 獲取用戶統計信息
 */
const getUserStats = async (userId) => {
  const [conversationStats, messageStats, tokenStats] = await Promise.all([
    // 對話統計
    query(
      `SELECT 
        COUNT(*) as total_conversations,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_conversations,
        COUNT(CASE WHEN is_pinned = 1 THEN 1 END) as pinned_conversations
      FROM conversations WHERE user_id = ?`,
      [userId]
    ),

    // 消息統計
    query(
      `SELECT 
        COUNT(*) as total_messages,
        COUNT(CASE WHEN role = 'user' THEN 1 END) as user_messages,
        COUNT(CASE WHEN role = 'assistant' THEN 1 END) as assistant_messages
      FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE c.user_id = ?`,
      [userId]
    ),

    // Token使用統計
    query(
      `SELECT 
        SUM(COALESCE(tokens_used, 0)) as total_tokens,
        SUM(COALESCE(cost, 0)) as total_cost
      FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE c.user_id = ? AND m.role = 'assistant'`,
      [userId]
    ),
  ]);

  return {
    conversations: conversationStats.rows[0],
    messages: messageStats.rows[0],
    tokens: tokenStats.rows[0],
  };
};

/**
 * 獲取系統統計信息
 */
const getSystemStats = async () => {
  const [userStats, conversationStats, messageStats, tokenStats] =
    await Promise.all([
      // 用戶統計
      query(`
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_users,
          COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_users,
          COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as new_users_30d
        FROM users WHERE deleted_at IS NULL
      `),

      // 對話統計
      query(`
        SELECT 
          COUNT(*) as total_conversations,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_conversations,
          COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as new_conversations_7d
        FROM conversations
      `),

      // 消息統計
      query(`
        SELECT 
          COUNT(*) as total_messages,
          COUNT(CASE WHEN role = 'user' THEN 1 END) as user_messages,
          COUNT(CASE WHEN role = 'assistant' THEN 1 END) as assistant_messages,
          COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 1 END) as messages_24h
        FROM messages
      `),

      // Token和成本統計
      query(`
        SELECT 
          SUM(COALESCE(tokens_used, 0)) as total_tokens,
          SUM(COALESCE(cost, 0)) as total_cost,
          AVG(COALESCE(tokens_used, 0)) as avg_tokens_per_message
        FROM messages WHERE role = 'assistant'
      `),
    ]);

  return {
    users: userStats.rows[0],
    conversations: conversationStats.rows[0],
    messages: messageStats.rows[0],
    tokens: tokenStats.rows[0],
  };
};

export default {
  handleGetUsers,
  handleGetUser,
  handleCreateUser,
  handleUpdateUser,
  handleDeleteUser,
  handleResetUserPassword,
  handleGetSystemStats,
  handleGetSystemConfig,
  handleUpdateSystemConfig,
  handleGetAuditLogs,
};
