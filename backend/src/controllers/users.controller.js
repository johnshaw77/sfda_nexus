/**
 * 用戶管理控制器
 * 處理用戶管理相關功能
 */

import UserModel from "../models/User.model.js";
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
  }),

  updateUser: Joi.object({
    username: Joi.string().alphanum().min(3).max(30).optional(),
    email: Joi.string().email().optional(),
    role: Joi.string().valid("user", "admin", "super_admin").optional(),
    is_active: Joi.boolean().optional(),
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
 * 獲取用戶統計信息
 */
const getUserStats = async (userId) => {
  try {
    // 獲取對話統計
    const conversationQuery = `
      SELECT 
        COUNT(*) as total_conversations,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_conversations,
        SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) as new_conversations_7d
      FROM conversations 
      WHERE user_id = ?
    `;
    const conversationResult = await query(conversationQuery, [userId]);
    const conversationStats =
      conversationResult.rows && conversationResult.rows.length > 0
        ? conversationResult.rows[0]
        : {};

    // 獲取消息統計
    const messageQuery = `
      SELECT 
        COUNT(*) as total_messages,
        SUM(CASE WHEN role = 'user' THEN 1 ELSE 0 END) as user_messages,
        SUM(CASE WHEN role = 'assistant' THEN 1 ELSE 0 END) as assistant_messages,
        SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY) THEN 1 ELSE 0 END) as messages_24h
      FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE c.user_id = ?
    `;
    const messageResult = await query(messageQuery, [userId]);
    const messageStats =
      messageResult.rows && messageResult.rows.length > 0
        ? messageResult.rows[0]
        : {};

    // 獲取 token 統計
    const tokenQuery = `
      SELECT 
        COALESCE(SUM(prompt_tokens), 0) + COALESCE(SUM(completion_tokens), 0) as total_tokens,
        COALESCE(SUM(total_cost), 0) as total_cost,
        CASE 
          WHEN COUNT(*) > 0 THEN 
            (COALESCE(SUM(prompt_tokens), 0) + COALESCE(SUM(completion_tokens), 0)) / COUNT(*)
          ELSE 0 
        END as avg_tokens_per_message
      FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE c.user_id = ? AND m.role = 'assistant'
    `;
    const tokenResult = await query(tokenQuery, [userId]);
    const tokenStats =
      tokenResult.rows && tokenResult.rows.length > 0
        ? tokenResult.rows[0]
        : {};

    return {
      conversations: conversationStats,
      messages: messageStats,
      tokens: tokenStats,
    };
  } catch (error) {
    logger.error("獲取用戶統計信息失敗:", error);
    throw new BusinessError("獲取用戶統計信息失敗");
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

  // 構建查詢條件
  let whereConditions = [];
  let queryParams = [];

  if (role) {
    whereConditions.push("role = ?");
    queryParams.push(role);
  }

  if (is_active !== undefined) {
    whereConditions.push("is_active = ?");
    queryParams.push(is_active === "true" ? 1 : 0);
  }

  if (search) {
    whereConditions.push("(username LIKE ? OR email LIKE ?)");
    queryParams.push(`%${search}%`, `%${search}%`);
  }

  const whereClause =
    whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

  // 獲取總數
  const countQuery = `SELECT COUNT(*) as total FROM users ${whereClause}`;
  const countResult = await query(countQuery, queryParams);
  const total =
    countResult.rows && countResult.rows.length > 0
      ? countResult.rows[0].total
      : 0;

  // 計算分頁
  const offset = (page - 1) * limit;
  const totalPages = Math.ceil(total / limit);

  // 獲取用戶列表
  const usersQuery = `
    SELECT 
      id, username, email, role, is_active, 
      created_at, updated_at
    FROM users 
    ${whereClause}
    ORDER BY ${sortBy} ${sortOrder}
    LIMIT ${parseInt(limit)} OFFSET ${offset}
  `;

  const usersResult = await query(usersQuery, queryParams);

  // 從查詢結果中提取數據
  const users = usersResult.rows || [];

  // 處理用戶數據
  const processedUsers = (users || []).map((user) => ({
    ...user,
    is_active: Boolean(user.is_active),
  }));

  const responseData = {
    data: processedUsers,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: totalPages,
    },
  };

  res.json(createSuccessResponse(responseData, "獲取用戶列表成功"));
});

/**
 * 獲取用戶詳情
 */
export const handleGetUser = catchAsync(async (req, res) => {
  checkAdminPermission(req.user, "admin");

  const { userId } = req.params;

  if (!userId || isNaN(userId)) {
    throw new ValidationError("用戶ID格式錯誤");
  }

  // 獲取用戶基本信息
  const userQuery = `
    SELECT id, username, email, role, is_active, created_at, updated_at
    FROM users 
    WHERE id = ?
  `;
  const userResult = await query(userQuery, [userId]);
  const user =
    userResult.rows && userResult.rows.length > 0 ? userResult.rows[0] : null;

  if (!user) {
    throw new BusinessError("用戶不存在", 404);
  }

  // 獲取用戶統計信息
  const stats = await getUserStats(userId);

  // 處理響應數據
  const responseData = {
    ...user,
    is_active: Boolean(user.is_active),
    stats,
  };

  res.json(createSuccessResponse(responseData, "獲取用戶詳情成功"));
});

/**
 * 創建用戶
 */
export const handleCreateUser = catchAsync(async (req, res) => {
  checkAdminPermission(req.user, "admin");

  // 驗證輸入
  const { error, value } = schemas.createUser.validate(req.body);
  if (error) {
    throw new ValidationError(error.details[0].message);
  }

  const { username, email, password, role, is_active } = value;

  // 檢查用戶名是否已存在
  const existingUser = await UserModel.findByUsername(username);
  if (existingUser) {
    throw new BusinessError("用戶名已存在", 409);
  }

  // 檢查郵箱是否已存在
  const existingEmail = await UserModel.findByEmail(email);
  if (existingEmail) {
    throw new BusinessError("郵箱已存在", 409);
  }

  // 檢查權限（只有超級管理員可以創建管理員）
  if (
    (role === "admin" || role === "super_admin") &&
    req.user.role !== "super_admin"
  ) {
    throw new AuthorizationError("只有超級管理員可以創建管理員帳戶");
  }

  // 加密密碼
  const hashedPassword = await bcrypt.hash(password, 12);

  // 創建用戶
  const userData = {
    username,
    email,
    password: hashedPassword,
    role,
    is_active,
  };

  const newUser = await UserModel.create(userData);

  // 記錄審計日誌
  await query(
    "INSERT INTO audit_logs (user_id, action, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)",
    [
      req.user.id,
      "CREATE_USER",
      JSON.stringify({ target_user_id: newUser.id, username, email, role }),
      req.ip,
      req.get("User-Agent"),
    ]
  );

  // 準備響應數據（不包含密碼）
  const { password: _, ...userResponse } = newUser;
  const responseData = {
    ...userResponse,
    is_active: Boolean(userResponse.is_active),
  };

  res.status(201).json(createSuccessResponse(responseData, "用戶創建成功"));
});

/**
 * 更新用戶
 */
export const handleUpdateUser = catchAsync(async (req, res) => {
  checkAdminPermission(req.user, "admin");

  const { userId } = req.params;

  if (!userId || isNaN(userId)) {
    throw new ValidationError("用戶ID格式錯誤");
  }

  // 驗證輸入
  const { error, value } = schemas.updateUser.validate(req.body);
  if (error) {
    throw new ValidationError(error.details[0].message);
  }

  // 檢查用戶是否存在
  const existingUser = await UserModel.findById(userId);
  if (!existingUser) {
    throw new BusinessError("用戶不存在", 404);
  }

  // 檢查權限
  if (req.user.id === parseInt(userId)) {
    throw new BusinessError("不能修改自己的帳戶");
  }

  if (value.role && (value.role === "admin" || value.role === "super_admin")) {
    if (req.user.role !== "super_admin") {
      throw new AuthorizationError("只有超級管理員可以設置管理員權限");
    }
  }

  // 檢查用戶名唯一性
  if (value.username && value.username !== existingUser.username) {
    const userWithSameUsername = await UserModel.findByUsername(value.username);
    if (userWithSameUsername) {
      throw new BusinessError("用戶名已存在", 409);
    }
  }

  // 檢查郵箱唯一性
  if (value.email && value.email !== existingUser.email) {
    const userWithSameEmail = await UserModel.findByEmail(value.email);
    if (userWithSameEmail) {
      throw new BusinessError("郵箱已存在", 409);
    }
  }

  // 準備更新數據
  const updateData = { ...value };
  if (updateData.profile) {
    updateData.profile = JSON.stringify(updateData.profile);
  }

  // 更新用戶
  const updatedUser = await UserModel.update(userId, updateData);

  // 記錄審計日誌
  await query(
    "INSERT INTO audit_logs (user_id, action, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)",
    [
      req.user.id,
      "UPDATE_USER",
      JSON.stringify({ target_user_id: userId, changes: value }),
      req.ip,
      req.get("User-Agent"),
    ]
  );

  // 準備響應數據
  const responseData = {
    ...updatedUser,
    profile: updatedUser.profile ? JSON.parse(updatedUser.profile) : null,
    is_active: Boolean(updatedUser.is_active),
  };

  res.json(createSuccessResponse(responseData, "用戶更新成功"));
});

/**
 * 刪除用戶
 */
export const handleDeleteUser = catchAsync(async (req, res) => {
  checkAdminPermission(req.user, "super_admin"); // 只有超級管理員可以刪除用戶

  const { userId } = req.params;

  if (!userId || isNaN(userId)) {
    throw new ValidationError("用戶ID格式錯誤");
  }

  // 檢查是否嘗試刪除自己
  if (req.user.id === parseInt(userId)) {
    throw new BusinessError("不能刪除自己的帳戶");
  }

  // 檢查用戶是否存在
  const existingUser = await UserModel.findById(userId);
  if (!existingUser) {
    throw new BusinessError("用戶不存在", 404);
  }

  // 軟刪除用戶
  await UserModel.softDelete(userId);

  // 記錄審計日誌
  await query(
    "INSERT INTO audit_logs (user_id, action, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)",
    [
      req.user.id,
      "DELETE_USER",
      JSON.stringify({
        target_user_id: userId,
        username: existingUser.username,
        email: existingUser.email,
      }),
      req.ip,
      req.get("User-Agent"),
    ]
  );

  res.json(createSuccessResponse(null, "用戶刪除成功"));
});

/**
 * 重置用戶密碼
 */
export const handleResetUserPassword = catchAsync(async (req, res) => {
  checkAdminPermission(req.user, "admin");

  const { userId } = req.params;
  const { newPassword } = req.body;

  if (!userId || isNaN(userId)) {
    throw new ValidationError("用戶ID格式錯誤");
  }

  if (!newPassword || newPassword.length < 6) {
    throw new ValidationError("新密碼至少需要6個字符");
  }

  // 檢查用戶是否存在
  const existingUser = await UserModel.findById(userId);
  if (!existingUser) {
    throw new BusinessError("用戶不存在", 404);
  }

  // 檢查權限（只有超級管理員可以重置管理員密碼）
  if (existingUser.role === "super_admin" && req.user.role !== "super_admin") {
    throw new AuthorizationError("權限不足");
  }

  // 加密新密碼
  const hashedPassword = await bcrypt.hash(newPassword, 12);

  // 更新密碼
  await query(
    "UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?",
    [hashedPassword, userId]
  );

  // 記錄審計日誌
  await query(
    "INSERT INTO audit_logs (user_id, action, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)",
    [
      req.user.id,
      "RESET_PASSWORD",
      JSON.stringify({ target_user_id: userId }),
      req.ip,
      req.get("User-Agent"),
    ]
  );

  res.json(createSuccessResponse(null, "密碼重置成功"));
});

export default {
  handleGetUsers,
  handleGetUser,
  handleCreateUser,
  handleUpdateUser,
  handleDeleteUser,
  handleResetUserPassword,
};
