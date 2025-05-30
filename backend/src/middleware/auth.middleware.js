/**
 * 認證中間件
 * 處理JWT驗證、用戶身份確認、權限檢查等
 */

import JWTUtil from '../utils/jwt.util.js';
import UserModel from '../models/User.model.js';
import { AuthenticationError, AuthorizationError } from '../middleware/errorHandler.middleware.js';
import logger from '../utils/logger.util.js';

/**
 * JWT認證中間件
 * 驗證請求中的JWT Token並設置用戶信息
 */
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = JWTUtil.extractTokenFromHeader(authHeader);

    if (!token) {
      throw new AuthenticationError('缺少認證令牌');
    }

    // 驗證Token
    const decoded = await JWTUtil.verifyToken(token, { type: 'access' });
    
    // 獲取完整的用戶信息
    const user = await UserModel.findById(decoded.id);
    if (!user) {
      throw new AuthenticationError('用戶不存在或已被禁用');
    }

    // 將用戶信息和原始token添加到請求對象
    req.user = user;
    req.token = token;
    req.tokenPayload = decoded;

    // 記錄認證日誌
    logger.debug('用戶認證成功', {
      userId: user.id,
      username: user.username,
      ip: req.ip,
      path: req.path
    });

    next();
  } catch (error) {
    logger.security('認證失敗', {
      error: error.message,
      ip: req.ip,
      path: req.path,
      userAgent: req.get('User-Agent')
    }, 'medium');

    next(new AuthenticationError(error.message));
  }
};

/**
 * 可選認證中間件
 * 如果有Token則驗證，沒有Token則繼續（適用於部分公開接口）
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = JWTUtil.extractTokenFromHeader(authHeader);

    if (token) {
      const decoded = await JWTUtil.verifyToken(token, { type: 'access' });
      const user = await UserModel.findById(decoded.id);
      
      if (user) {
        req.user = user;
        req.token = token;
        req.tokenPayload = decoded;
      }
    }

    next();
  } catch (error) {
    // 可選認證失敗時不阻塞請求
    logger.debug('可選認證失敗', { error: error.message });
    next();
  }
};

/**
 * 角色檢查中間件
 * @param {string|Array} allowedRoles - 允許的角色
 */
export const requireRole = (allowedRoles) => {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  
  return (req, res, next) => {
    if (!req.user) {
      return next(new AuthenticationError('需要認證'));
    }

    if (!roles.includes(req.user.role)) {
      logger.security('權限不足', {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: roles,
        ip: req.ip,
        path: req.path
      }, 'high');

      return next(new AuthorizationError(`需要以下角色之一: ${roles.join(', ')}`));
    }

    next();
  };
};

/**
 * 管理員權限檢查
 */
export const requireAdmin = requireRole(['admin', 'super_admin']);

/**
 * 超級管理員權限檢查
 */
export const requireSuperAdmin = requireRole('super_admin');

/**
 * 資源擁有者檢查中間件
 * @param {string} resourceIdParam - 資源ID參數名
 * @param {string} resourceType - 資源類型
 */
export const requireOwnership = (resourceIdParam = 'id', resourceType = 'resource') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return next(new AuthenticationError('需要認證'));
      }

      const resourceId = req.params[resourceIdParam];
      if (!resourceId) {
        return next(new Error(`缺少資源ID參數: ${resourceIdParam}`));
      }

      // 管理員可以訪問所有資源
      if (['admin', 'super_admin'].includes(req.user.role)) {
        return next();
      }

      // 檢查資源擁有權（這裡需要根據具體資源類型實現）
      // 這是一個通用框架，具體實現需要在各個控制器中處理
      req.resourceId = resourceId;
      req.requireOwnershipCheck = true;

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * 用戶狀態檢查中間件
 */
export const checkUserStatus = (req, res, next) => {
  if (!req.user) {
    return next(new AuthenticationError('需要認證'));
  }

  if (!req.user.is_active) {
    logger.security('已禁用用戶嘗試訪問', {
      userId: req.user.id,
      ip: req.ip,
      path: req.path
    }, 'high');

    return next(new AuthenticationError('用戶帳號已被禁用'));
  }

  if (!req.user.email_verified) {
    return next(new AuthenticationError('郵箱尚未驗證，請先驗證郵箱'));
  }

  next();
};

/**
 * API密鑰認證中間件（用於第三方整合）
 */
export const authenticateApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      throw new AuthenticationError('缺少API密鑰');
    }

    // TODO: 實現API密鑰驗證邏輯
    // 這裡可以查詢資料庫中的API密鑰配置
    
    logger.info('API密鑰認證', { apiKeyPrefix: apiKey.substring(0, 8) + '...' });
    
    next();
  } catch (error) {
    next(new AuthenticationError(error.message));
  }
};

/**
 * 部門權限檢查中間件
 * @param {string} requiredDepartment - 必需的部門
 */
export const requireDepartment = (requiredDepartment) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AuthenticationError('需要認證'));
    }

    // 管理員可以跨部門訪問
    if (['admin', 'super_admin'].includes(req.user.role)) {
      return next();
    }

    if (req.user.department !== requiredDepartment) {
      return next(new AuthorizationError(`需要所屬部門: ${requiredDepartment}`));
    }

    next();
  };
};

/**
 * 速率限制中間件（基於用戶）
 * @param {number} maxRequests - 最大請求數
 * @param {number} windowMs - 時間窗口（毫秒）
 */
export const userRateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const userRequests = new Map();

  return (req, res, next) => {
    if (!req.user) {
      return next();
    }

    const userId = req.user.id;
    const now = Date.now();
    const windowStart = now - windowMs;

    // 清理過期記錄
    if (userRequests.has(userId)) {
      const requests = userRequests.get(userId).filter(time => time > windowStart);
      userRequests.set(userId, requests);
    } else {
      userRequests.set(userId, []);
    }

    const requests = userRequests.get(userId);
    
    if (requests.length >= maxRequests) {
      logger.security('用戶速率限制觸發', {
        userId,
        requestCount: requests.length,
        maxRequests,
        ip: req.ip
      }, 'medium');

      return next(new Error('請求過於頻繁，請稍後再試'));
    }

    requests.push(now);
    next();
  };
};

/**
 * 會話驗證中間件
 */
export const validateSession = async (req, res, next) => {
  try {
    if (!req.user || !req.token) {
      return next();
    }

    // 檢查會話是否仍然有效
    const isBlacklisted = await JWTUtil.isTokenBlacklisted(req.token);
    if (isBlacklisted) {
      throw new AuthenticationError('會話已失效，請重新登入');
    }

    next();
  } catch (error) {
    next(new AuthenticationError(error.message));
  }
};

/**
 * 記錄用戶活動中間件
 */
export const logUserActivity = (req, res, next) => {
  if (req.user) {
    // 記錄用戶活動（非同步，不阻塞請求）
    setImmediate(() => {
      logger.audit(req.user.id, 'API_ACCESS', {
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
    });
  }

  next();
};

export default {
  authenticateToken,
  optionalAuth,
  requireRole,
  requireAdmin,
  requireSuperAdmin,
  requireOwnership,
  checkUserStatus,
  authenticateApiKey,
  requireDepartment,
  userRateLimit,
  validateSession,
  logUserActivity
}; 