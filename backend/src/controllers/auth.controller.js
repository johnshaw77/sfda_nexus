/**
 * 認證控制器
 * 處理用戶認證相關的業務邏輯
 */

import UserModel from "../models/User.model.js";
import JWTUtil from "../utils/jwt.util.js";
import { query } from "../config/database.config.js";
import {
  catchAsync,
  createSuccessResponse,
  ValidationError,
  AuthenticationError,
  BusinessError,
} from "../middleware/errorHandler.middleware.js";
import logger from "../utils/logger.util.js";
import Joi from "joi";

// 輸入驗證模式
const schemas = {
  login: Joi.object({
    identifier: Joi.string().required().messages({
      "string.empty": "用戶名或郵箱不能為空",
      "any.required": "用戶名或郵箱是必填項",
    }),
    password: Joi.string().min(6).required().messages({
      "string.min": "密碼長度不能少於6位",
      "string.empty": "密碼不能為空",
      "any.required": "密碼是必填項",
    }),
    remember: Joi.boolean().default(false),
  }),

  register: Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required().messages({
      "string.alphanum": "用戶名只能包含字母和數字",
      "string.min": "用戶名長度不能少於3位",
      "string.max": "用戶名長度不能超過30位",
      "any.required": "用戶名是必填項",
    }),
    email: Joi.string().email().required().messages({
      "string.email": "請輸入有效的郵箱地址",
      "any.required": "郵箱是必填項",
    }),
    password: Joi.string()
      .min(8)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .required()
      .messages({
        "string.min": "密碼長度不能少於8位",
        "string.pattern.base":
          "密碼必須包含至少一個大寫字母、一個小寫字母和一個數字",
        "any.required": "密碼是必填項",
      }),
    display_name: Joi.string().max(100).optional(),
    department: Joi.string().max(100).optional(),
    position: Joi.string().max(100).optional(),
    phone: Joi.string()
      .pattern(/^[\d\-\+\(\)]{10,20}$/)
      .optional()
      .messages({
        "string.pattern.base": "請輸入有效的電話號碼",
      }),
  }),

  changePassword: Joi.object({
    current_password: Joi.string().required().messages({
      "any.required": "當前密碼是必填項",
    }),
    new_password: Joi.string()
      .min(8)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .required()
      .messages({
        "string.min": "新密碼長度不能少於8位",
        "string.pattern.base":
          "新密碼必須包含至少一個大寫字母、一個小寫字母和一個數字",
        "any.required": "新密碼是必填項",
      }),
    confirm_password: Joi.string()
      .valid(Joi.ref("new_password"))
      .required()
      .messages({
        "any.only": "確認密碼必須與新密碼一致",
        "any.required": "確認密碼是必填項",
      }),
  }),

  refreshToken: Joi.object({
    refresh_token: Joi.string().required().messages({
      "any.required": "刷新令牌是必填項",
    }),
  }),
};

/**
 * 用戶登入
 */
export const handleLogin = catchAsync(async (req, res) => {
  // 輸入驗證
  const { error, value } = schemas.login.validate(req.body);
  if (error) {
    throw new ValidationError("輸入驗證失敗", error.details);
  }

  const { identifier, password, remember } = value;
  const clientIp = req.ip;
  const userAgent = req.get("User-Agent");

  // 查找用戶（支援用戶名或郵箱登入）
  let user = await UserModel.findByUsernameForAuth(identifier);
  if (!user) {
    user = await UserModel.findByEmailForAuth(identifier);
  }

  if (!user) {
    logger.security(
      "登入失敗 - 用戶不存在",
      {
        identifier,
        ip: clientIp,
      },
      "medium"
    );
    throw new AuthenticationError("用戶名、郵箱或密碼錯誤");
  }

  // 驗證密碼
  const isPasswordValid = await UserModel.verifyPassword(
    password,
    user.password_hash
  );

  if (!isPasswordValid) {
    logger.security(
      "登入失敗 - 密碼錯誤",
      {
        userId: user.id,
        username: user.username,
        ip: clientIp,
      },
      "medium"
    );
    throw new AuthenticationError("用戶名、郵箱或密碼錯誤");
  }

  // 檢查用戶狀態
  if (!user.is_active) {
    logger.security(
      "登入失敗 - 用戶已禁用",
      {
        userId: user.id,
        username: user.username,
        ip: clientIp,
      },
      "high"
    );
    throw new AuthenticationError("帳號已被禁用，請聯繫管理員");
  }

  // 生成JWT令牌
  const tokenOptions = remember ? { expiresIn: "30d" } : {};
  const accessToken = JWTUtil.generateAccessToken(user, tokenOptions);
  const refreshToken = JWTUtil.generateRefreshToken(user);

  // 記錄會話
  const sessionInfo = {
    deviceInfo: req.get("X-Device-Info"),
    ipAddress: clientIp,
    userAgent: userAgent,
  };

  await JWTUtil.recordSession(user.id, accessToken, sessionInfo);

  // 更新最後登入信息
  await UserModel.updateLastLogin(user.id, clientIp);

  // 移除敏感信息
  const { password_hash, ...safeUser } = user;

  logger.info("用戶登入成功", {
    userId: user.id,
    username: user.username,
    ip: clientIp,
  });

  res.json(
    createSuccessResponse(
      {
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: "Bearer",
        expires_in: remember ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60, // 秒
        user: safeUser,
      },
      "登入成功"
    )
  );
});

/**
 * 用戶註冊
 */
export const handleRegister = catchAsync(async (req, res) => {
  // 輸入驗證
  const { error, value } = schemas.register.validate(req.body);
  if (error) {
    throw new ValidationError("輸入驗證失敗", error.details);
  }

  const userData = value;
  const clientIp = req.ip;

  // 創建用戶
  const user = await UserModel.create({
    ...userData,
    role: "user", // 新註冊用戶默認為普通用戶
  });

  logger.info("用戶註冊成功", {
    userId: user.id,
    username: user.username,
    email: user.email,
    ip: clientIp,
  });

  // 生成JWT令牌
  const accessToken = JWTUtil.generateAccessToken(user);
  const refreshToken = JWTUtil.generateRefreshToken(user);

  // 記錄會話
  const sessionInfo = {
    deviceInfo: req.get("X-Device-Info"),
    ipAddress: clientIp,
    userAgent: req.get("User-Agent"),
  };

  await JWTUtil.recordSession(user.id, accessToken, sessionInfo);

  res.status(201).json(
    createSuccessResponse(
      {
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: "Bearer",
        expires_in: 7 * 24 * 60 * 60,
        user: user,
      },
      "註冊成功"
    )
  );
});

/**
 * 用戶登出
 */
export const handleLogout = catchAsync(async (req, res) => {
  const { user, token } = req;

  if (token) {
    // 將當前token加入黑名單
    await JWTUtil.blacklistToken(token, user.id, "logout");

    // 註銷會話
    await JWTUtil.revokeSession(user.id, token);
  }

  logger.info("用戶登出成功", {
    userId: user.id,
    username: user.username,
    ip: req.ip,
  });

  res.json(createSuccessResponse(null, "登出成功"));
});

/**
 * 登出所有設備
 */
export const handleLogoutAll = catchAsync(async (req, res) => {
  const { user } = req;

  // 註銷用戶的所有會話
  await JWTUtil.revokeSession(user.id);

  logger.info("用戶登出所有設備", {
    userId: user.id,
    username: user.username,
    ip: req.ip,
  });

  res.json(createSuccessResponse(null, "已登出所有設備"));
});

/**
 * 刷新訪問令牌
 */
export const handleRefreshToken = catchAsync(async (req, res) => {
  // 輸入驗證
  const { error, value } = schemas.refreshToken.validate(req.body);
  if (error) {
    throw new ValidationError("輸入驗證失敗", error.details);
  }

  const { refresh_token } = value;

  // 刷新令牌
  const result = await JWTUtil.refreshAccessToken(refresh_token);

  // 記錄新會話
  const sessionInfo = {
    deviceInfo: req.get("X-Device-Info"),
    ipAddress: req.ip,
    userAgent: req.get("User-Agent"),
  };

  await JWTUtil.recordSession(result.user.id, result.accessToken, sessionInfo);

  res.json(
    createSuccessResponse(
      {
        access_token: result.accessToken,
        refresh_token: result.refreshToken,
        token_type: "Bearer",
        expires_in: 7 * 24 * 60 * 60,
        user: result.user,
      },
      "令牌刷新成功"
    )
  );
});

/**
 * 獲取當前用戶信息
 */
export const handleGetProfile = catchAsync(async (req, res) => {
  const { user } = req;

  // 獲取最新的用戶信息
  const currentUser = await UserModel.findById(user.id);
  if (!currentUser) {
    throw new AuthenticationError("用戶不存在");
  }

  res.json(createSuccessResponse(currentUser, "獲取用戶信息成功"));
});

/**
 * 更新用戶資料
 */
export const handleUpdateProfile = catchAsync(async (req, res) => {
  const { user } = req;
  const updateData = req.body;

  // 過濾不允許更新的字段
  const allowedFields = [
    "display_name",
    "avatar",
    "department",
    "position",
    "phone",
    "bio",
    "preferences",
  ];
  const filteredData = {};

  allowedFields.forEach((field) => {
    if (updateData[field] !== undefined) {
      filteredData[field] = updateData[field];
    }
  });

  if (Object.keys(filteredData).length === 0) {
    throw new ValidationError("沒有可更新的字段");
  }

  // 更新用戶信息
  const updatedUser = await UserModel.update(user.id, filteredData);

  logger.audit(user.id, "PROFILE_UPDATED", filteredData);

  res.json(createSuccessResponse(updatedUser, "資料更新成功"));
});

/**
 * 修改密碼
 */
export const handleChangePassword = catchAsync(async (req, res) => {
  // 輸入驗證
  const { error, value } = schemas.changePassword.validate(req.body);
  if (error) {
    throw new ValidationError("輸入驗證失敗", error.details);
  }

  const { current_password, new_password } = value;
  const { user } = req;

  // 獲取完整用戶信息（包含密碼雜湊）
  const { rows } = await query("SELECT password_hash FROM users WHERE id = ?", [
    user.id,
  ]);
  if (rows.length === 0) {
    throw new AuthenticationError("用戶不存在");
  }

  // 驗證當前密碼
  const isCurrentPasswordValid = await UserModel.verifyPassword(
    current_password,
    rows[0].password_hash
  );
  if (!isCurrentPasswordValid) {
    throw new AuthenticationError("當前密碼錯誤");
  }

  // 檢查新密碼是否與當前密碼相同
  const isSamePassword = await UserModel.verifyPassword(
    new_password,
    rows[0].password_hash
  );
  if (isSamePassword) {
    throw new BusinessError("新密碼不能與當前密碼相同");
  }

  // 更新密碼
  await UserModel.updatePassword(user.id, new_password);

  // 註銷所有其他會話（強制重新登入）
  await JWTUtil.revokeSession(user.id);

  logger.audit(user.id, "PASSWORD_CHANGED", {
    ip: req.ip,
  });

  res.json(createSuccessResponse(null, "密碼修改成功，請重新登入"));
});

/**
 * 獲取用戶活躍會話
 */
export const handleGetSessions = catchAsync(async (req, res) => {
  const { user } = req;

  const sessions = await JWTUtil.getUserActiveSessions(user.id);

  res.json(createSuccessResponse(sessions, "獲取會話列表成功"));
});

/**
 * 註銷指定會話
 */
export const handleRevokeSession = catchAsync(async (req, res) => {
  const { user } = req;
  const { sessionId } = req.params;

  // TODO: 實現根據會話ID註銷特定會話的邏輯
  // 這需要在資料庫中根據會話ID查找對應的token並將其列入黑名單

  logger.audit(user.id, "SESSION_REVOKED_BY_USER", {
    sessionId,
    ip: req.ip,
  });

  res.json(createSuccessResponse(null, "會話已註銷"));
});

/**
 * 驗證令牌有效性
 */
export const handleVerifyToken = catchAsync(async (req, res) => {
  const { user, tokenPayload } = req;

  res.json(
    createSuccessResponse(
      {
        valid: true,
        user: user,
        token_info: {
          type: tokenPayload.type,
          issued_at: new Date(tokenPayload.iat * 1000),
          expires_at: new Date(tokenPayload.exp * 1000),
        },
      },
      "令牌有效"
    )
  );
});

export default {
  handleLogin,
  handleRegister,
  handleLogout,
  handleLogoutAll,
  handleRefreshToken,
  handleGetProfile,
  handleUpdateProfile,
  handleChangePassword,
  handleGetSessions,
  handleRevokeSession,
  handleVerifyToken,
};
