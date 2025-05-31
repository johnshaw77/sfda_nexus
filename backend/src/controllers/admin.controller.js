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
  AuthorizationError,
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

  createAgent: Joi.object({
    name: Joi.string().min(2).max(100).required().messages({
      "string.min": "智能體名稱至少需要2個字符",
      "string.max": "智能體名稱不能超過100個字符",
      "any.required": "智能體名稱是必填項",
    }),
    display_name: Joi.string().min(2).max(200).required().messages({
      "string.min": "顯示名稱至少需要2個字符",
      "string.max": "顯示名稱不能超過200個字符",
      "any.required": "顯示名稱是必填項",
    }),
    description: Joi.string().max(1000).required().messages({
      "string.max": "描述不能超過1000個字符",
      "any.required": "描述是必填項",
    }),
    avatar: Joi.string().optional(),
    system_prompt: Joi.string().min(10).required().messages({
      "string.min": "系統提示詞至少需要10個字符",
      "any.required": "系統提示詞是必填項",
    }),
    model_id: Joi.number().integer().positive().required().messages({
      "number.base": "模型ID必須是數字",
      "number.integer": "模型ID必須是整數",
      "number.positive": "模型ID必須是正數",
      "any.required": "模型ID是必填項",
    }),
    category: Joi.string()
      .valid(
        "general",
        "assistant",
        "coding",
        "writing",
        "analysis",
        "customer_service"
      )
      .default("general")
      .messages({
        "any.only": "分類必須是有效值",
      }),
    tags: Joi.array().items(Joi.string()).optional(),
    capabilities: Joi.object().optional(),
    tools: Joi.object().optional(),
    is_active: Joi.any()
      .custom((value, helpers) => {
        if (value === true || value === false || value === 1 || value === 0) {
          return Boolean(value);
        }
        return helpers.error("any.invalid");
      })
      .default(true),
    is_public: Joi.any()
      .custom((value, helpers) => {
        if (value === true || value === false || value === 1 || value === 0) {
          return Boolean(value);
        }
        return helpers.error("any.invalid");
      })
      .default(true),
  }),

  updateAgent: Joi.object({
    id: Joi.any().strip(),
    name: Joi.string().min(2).max(100).optional(),
    display_name: Joi.string().min(2).max(200).optional(),
    description: Joi.string().max(1000).optional(),
    avatar: Joi.string().optional(),
    system_prompt: Joi.string().min(10).optional(),
    model_id: Joi.number().integer().positive().optional(),
    category: Joi.string()
      .valid(
        "general",
        "assistant",
        "coding",
        "writing",
        "analysis",
        "customer_service"
      )
      .optional(),
    tags: Joi.array().items(Joi.string()).optional(),
    capabilities: Joi.object().optional(),
    tools: Joi.object().optional(),
    is_active: Joi.any()
      .custom((value, helpers) => {
        if (value === true || value === false || value === 1 || value === 0) {
          return Boolean(value);
        }
        return helpers.error("any.invalid");
      })
      .optional(),
    is_public: Joi.any()
      .custom((value, helpers) => {
        if (value === true || value === false || value === 1 || value === 0) {
          return Boolean(value);
        }
        return helpers.error("any.invalid");
      })
      .optional(),
    usage_count: Joi.any().strip(),
    rating: Joi.any().strip(),
    rating_count: Joi.any().strip(),
    created_at: Joi.any().strip(),
    updated_at: Joi.any().strip(),
    created_by: Joi.any().strip(),
    model_name: Joi.any().strip(),
    model_display_name: Joi.any().strip(),
    created_by_username: Joi.any().strip(),
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

  // 檢查用戶是否存在
  const user = await UserModel.findById(userId);
  if (!user) {
    throw new BusinessError("用戶不存在");
  }

  res.json(createSuccessResponse(user, "獲取用戶詳情成功"));
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
    throw new AuthorizationError("只有超級管理員可以創建管理員用戶");
  }

  if (role === "super_admin" && req.user.role !== "super_admin") {
    throw new AuthorizationError("只有超級管理員可以創建超級管理員用戶");
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
      throw new AuthorizationError("只有超級管理員可以修改管理員角色");
    }

    // 只有super_admin可以修改super_admin角色
    if (
      (targetUser.role === "super_admin" || value.role === "super_admin") &&
      req.user.role !== "super_admin"
    ) {
      throw new AuthorizationError("只有超級管理員可以修改超級管理員角色");
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
    throw new AuthorizationError("只有超級管理員可以刪除管理員用戶");
  }

  if (targetUser.role === "super_admin" && req.user.role !== "super_admin") {
    throw new AuthorizationError("只有超級管理員可以刪除超級管理員用戶");
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
    throw new AuthorizationError("只有超級管理員可以重置管理員密碼");
  }

  if (targetUser.role === "super_admin" && req.user.role !== "super_admin") {
    throw new AuthorizationError("只有超級管理員可以重置超級管理員密碼");
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
    limit = 20,
    action,
    user_id,
    start_date,
    end_date,
  } = req.query;
  const offset = (page - 1) * limit;

  let whereClause = "WHERE 1=1";
  const params = [];

  if (action) {
    whereClause += " AND action = ?";
    params.push(action);
  }

  if (user_id) {
    whereClause += " AND user_id = ?";
    params.push(user_id);
  }

  if (start_date) {
    whereClause += " AND created_at >= ?";
    params.push(start_date);
  }

  if (end_date) {
    whereClause += " AND created_at <= ?";
    params.push(end_date);
  }

  const { rows: logs } = await query(
    `SELECT al.*, u.username 
     FROM audit_logs al 
     LEFT JOIN users u ON al.user_id = u.id 
     ${whereClause} 
     ORDER BY al.created_at DESC 
     LIMIT ? OFFSET ?`,
    [...params, parseInt(limit), offset]
  );

  const { rows: totalRows } = await query(
    `SELECT COUNT(*) as total FROM audit_logs al ${whereClause}`,
    params
  );

  const total = totalRows[0].total;
  const pages = Math.ceil(total / limit);

  res.json(
    createSuccessResponse(
      {
        data: logs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages,
        },
      },
      "獲取審計日誌成功"
    )
  );
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

// ===== 智能體管理方法 =====

/**
 * 獲取智能體列表（管理員）
 */
export const handleGetAgents = catchAsync(async (req, res) => {
  checkAdminPermission(req.user, "admin");

  const { page = 1, limit = 20, category, is_active, search } = req.query;
  const offset = (page - 1) * limit;

  let whereClause = "WHERE 1=1";
  const params = [];

  if (category) {
    whereClause += " AND a.category = ?";
    params.push(category);
  }

  if (is_active !== undefined) {
    whereClause += " AND a.is_active = ?";
    params.push(is_active === "true");
  }

  if (search) {
    whereClause +=
      " AND (a.name LIKE ? OR a.display_name LIKE ? OR a.description LIKE ?)";
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }

  const { rows: agents } = await query(
    `SELECT 
      a.*,
      m.name as model_name,
      m.display_name as model_display_name,
      u.username as created_by_username
     FROM agents a
     LEFT JOIN ai_models m ON a.model_id = m.id
     LEFT JOIN users u ON a.created_by = u.id
     ${whereClause}
     ORDER BY a.created_at DESC
     LIMIT ${parseInt(limit)} OFFSET ${offset}`,
    params
  );

  const { rows: totalRows } = await query(
    `SELECT COUNT(*) as total FROM agents a ${whereClause}`,
    params
  );

  const total = totalRows[0].total;
  const pages = Math.ceil(total / limit);

  res.json(
    createSuccessResponse(
      {
        data: agents,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages,
        },
      },
      "獲取智能體列表成功"
    )
  );
});

/**
 * 創建智能體
 */
export const handleCreateAgent = catchAsync(async (req, res) => {
  checkAdminPermission(req.user, "admin");

  // 輸入驗證
  const { error, value } = schemas.createAgent.validate(req.body);
  if (error) {
    throw new ValidationError("輸入驗證失敗", error.details);
  }

  const {
    name,
    display_name,
    description,
    avatar,
    system_prompt,
    model_id,
    category,
    tags,
    capabilities,
    tools,
    is_active,
    is_public,
  } = value;

  // 檢查智能體名稱是否已存在
  const { rows: existingAgent } = await query(
    "SELECT id FROM agents WHERE name = ?",
    [name]
  );

  if (existingAgent.length > 0) {
    throw new BusinessError("智能體名稱已存在");
  }

  // 檢查模型是否存在
  const { rows: modelRows } = await query(
    "SELECT id FROM ai_models WHERE id = ? AND is_active = TRUE",
    [model_id]
  );

  if (modelRows.length === 0) {
    throw new BusinessError("指定的AI模型不存在或已停用");
  }

  // 創建智能體
  const { rows } = await query(
    `INSERT INTO agents (
      name, display_name, description, avatar, system_prompt, 
      model_id, category, tags, capabilities, tools, is_active, is_public, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      name,
      display_name,
      description,
      avatar || null,
      system_prompt,
      model_id,
      category,
      tags ? JSON.stringify(tags) : null,
      capabilities ? JSON.stringify(capabilities) : null,
      tools ? JSON.stringify(tools) : null,
      is_active,
      is_public,
      req.user.id,
    ]
  );

  const agentId = rows.insertId;

  // 獲取創建的智能體詳情
  const { rows: newAgent } = await query(
    `SELECT 
      a.*,
      m.name as model_name,
      m.display_name as model_display_name
     FROM agents a
     LEFT JOIN ai_models m ON a.model_id = m.id
     WHERE a.id = ?`,
    [agentId]
  );

  logger.audit(req.user.id, "AGENT_CREATED", {
    agentId: agentId,
    agentName: name,
    category: category,
  });

  res.status(201).json(createSuccessResponse(newAgent[0], "智能體創建成功"));
});

/**
 * 更新智能體
 */
export const handleUpdateAgent = catchAsync(async (req, res) => {
  checkAdminPermission(req.user, "admin");

  const { agentId } = req.params;

  console.log("🔍 更新智能體請求數據:", JSON.stringify(req.body, null, 2));

  // 輸入驗證
  const { error, value } = schemas.updateAgent.validate(req.body);
  if (error) {
    console.error("❌ 驗證失敗詳情:", error.details);
    console.error(
      "❌ 驗證失敗的字段:",
      error.details.map((d) => ({
        field: d.path.join("."),
        message: d.message,
        value: d.context?.value,
      }))
    );
    throw new ValidationError("輸入驗證失敗", error.details);
  }

  console.log("✅ 驗證通過，處理後的數據:", JSON.stringify(value, null, 2));

  // 檢查智能體是否存在
  const { rows: existingAgent } = await query(
    "SELECT * FROM agents WHERE id = ?",
    [agentId]
  );

  if (existingAgent.length === 0) {
    throw new BusinessError("智能體不存在");
  }

  const agent = existingAgent[0];

  // 如果更新名稱，檢查是否與其他智能體重複
  if (value.name && value.name !== agent.name) {
    const { rows: nameCheck } = await query(
      "SELECT id FROM agents WHERE name = ? AND id != ?",
      [value.name, agentId]
    );

    if (nameCheck.length > 0) {
      throw new BusinessError("智能體名稱已存在");
    }
  }

  // 如果更新模型，檢查模型是否存在
  if (value.model_id) {
    console.log(
      "🔍 檢查模型 ID:",
      value.model_id,
      "類型:",
      typeof value.model_id
    );

    const { rows: modelRows } = await query(
      "SELECT id FROM ai_models WHERE id = ? AND is_active = TRUE",
      [value.model_id]
    );

    console.log("🔍 模型查詢結果:", modelRows);

    if (modelRows.length === 0) {
      throw new BusinessError("指定的AI模型不存在或已停用");
    }
  }

  // 構建更新語句
  const updateFields = [];
  const updateValues = [];

  // 過濾掉不能更新的字段
  const excludeFields = ["id", "created_at", "created_by", "updated_at"];

  Object.keys(value).forEach((key) => {
    if (value[key] !== undefined && !excludeFields.includes(key)) {
      updateFields.push(`${key} = ?`);

      // 處理特殊字段
      if (key === "tags" || key === "capabilities" || key === "tools") {
        updateValues.push(
          typeof value[key] === "object"
            ? JSON.stringify(value[key])
            : value[key]
        );
      } else if (key === "is_active" || key === "is_public") {
        updateValues.push(value[key]);
      } else {
        updateValues.push(value[key]);
      }
    }
  });

  if (updateFields.length === 0) {
    throw new ValidationError("沒有提供要更新的字段");
  }

  updateFields.push("updated_at = CURRENT_TIMESTAMP");
  updateValues.push(agentId);

  const finalSQL = `UPDATE agents SET ${updateFields.join(", ")} WHERE id = ?`;

  console.log("🔍 準備執行的 UPDATE SQL:");
  console.log("SQL:", finalSQL);
  console.log("參數:", updateValues);
  console.log(
    "格式化 SQL:",
    finalSQL.replace(/\?/g, () => {
      const val = updateValues.shift();
      updateValues.push(val); // 重新放回去
      return typeof val === "string" ? `'${val}'` : val;
    })
  );

  // 執行更新
  await query(finalSQL, updateValues);

  // 獲取更新後的智能體詳情
  const { rows: updatedAgent } = await query(
    `SELECT 
      a.*,
      m.name as model_name,
      m.display_name as model_display_name
     FROM agents a
     LEFT JOIN ai_models m ON a.model_id = m.id
     WHERE a.id = ?`,
    [agentId]
  );

  logger.audit(req.user.id, "AGENT_UPDATED", {
    agentId: parseInt(agentId),
    agentName: updatedAgent[0].name,
    updatedFields: Object.keys(value),
  });

  res.json(createSuccessResponse(updatedAgent[0], "智能體更新成功"));
});

/**
 * 刪除智能體
 */
export const handleDeleteAgent = catchAsync(async (req, res) => {
  checkAdminPermission(req.user, "admin");

  const { agentId } = req.params;

  // 檢查智能體是否存在
  const { rows: existingAgent } = await query(
    "SELECT * FROM agents WHERE id = ?",
    [agentId]
  );

  if (existingAgent.length === 0) {
    throw new BusinessError("智能體不存在");
  }

  const agent = existingAgent[0];

  // 檢查是否有相關的對話
  const { rows: conversationCheck } = await query(
    "SELECT COUNT(*) as count FROM conversations WHERE agent_id = ?",
    [agentId]
  );

  if (conversationCheck[0].count > 0) {
    // 如果有相關對話，只是標記為不活躍而不是物理刪除
    await query(
      "UPDATE agents SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [agentId]
    );

    logger.audit(req.user.id, "AGENT_DEACTIVATED", {
      agentId: parseInt(agentId),
      agentName: agent.name,
      reason: "有相關對話，僅停用",
    });

    res.json(createSuccessResponse(null, "智能體已停用（因為有相關對話）"));
  } else {
    // 沒有相關對話，可以物理刪除
    await query("DELETE FROM agents WHERE id = ?", [agentId]);

    logger.audit(req.user.id, "AGENT_DELETED", {
      agentId: parseInt(agentId),
      agentName: agent.name,
    });

    res.json(createSuccessResponse(null, "智能體刪除成功"));
  }
});

/**
 * 複製智能體
 */
export const handleDuplicateAgent = catchAsync(async (req, res) => {
  checkAdminPermission(req.user, "admin");

  const { agentId } = req.params;

  // 檢查原智能體是否存在
  const { rows: existingAgent } = await query(
    "SELECT * FROM agents WHERE id = ?",
    [agentId]
  );

  if (existingAgent.length === 0) {
    throw new BusinessError("智能體不存在");
  }

  const originalAgent = existingAgent[0];

  // 生成新的名稱
  let newName = `${originalAgent.name}_copy`;
  let counter = 1;

  // 檢查名稱是否重複，如果重複則添加數字後綴
  while (true) {
    const { rows: nameCheck } = await query(
      "SELECT id FROM agents WHERE name = ?",
      [newName]
    );

    if (nameCheck.length === 0) {
      break;
    }

    counter++;
    newName = `${originalAgent.name}_copy_${counter}`;
  }

  // 創建複製的智能體
  const { rows } = await query(
    `INSERT INTO agents (
      name, display_name, description, avatar, system_prompt, 
      model_id, category, tags, capabilities, tools, is_active, is_public, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      newName,
      `${originalAgent.display_name} (副本)`,
      originalAgent.description,
      originalAgent.avatar,
      originalAgent.system_prompt,
      originalAgent.model_id,
      originalAgent.category,
      originalAgent.tags,
      originalAgent.capabilities,
      originalAgent.tools,
      false, // 複製的智能體默認為不活躍
      originalAgent.is_public,
      req.user.id,
    ]
  );

  const newAgentId = rows.insertId;

  // 獲取新創建的智能體詳情
  const { rows: newAgent } = await query(
    `SELECT 
      a.*,
      m.name as model_name,
      m.display_name as model_display_name
     FROM agents a
     LEFT JOIN ai_models m ON a.model_id = m.id
     WHERE a.id = ?`,
    [newAgentId]
  );

  logger.audit(req.user.id, "AGENT_DUPLICATED", {
    originalAgentId: parseInt(agentId),
    newAgentId: newAgentId,
    originalName: originalAgent.name,
    newName: newName,
  });

  res.status(201).json(createSuccessResponse(newAgent[0], "智能體複製成功"));
});

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
  handleGetAgents,
  handleCreateAgent,
  handleUpdateAgent,
  handleDeleteAgent,
  handleDuplicateAgent,
};
