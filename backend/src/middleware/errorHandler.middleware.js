/**
 * 全域錯誤處理中間件
 * 統一處理所有未捕獲的錯誤，並返回標準化的錯誤響應
 */

import logger from '../utils/logger.util.js';
import { appConfig } from '../config/app.config.js';

/**
 * 自定義錯誤類別
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 業務邏輯錯誤
 */
export class BusinessError extends AppError {
  constructor(message, code = 'BUSINESS_ERROR', details = null) {
    super(message, 400, code, details);
  }
}

/**
 * 驗證錯誤
 */
export class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 422, 'VALIDATION_ERROR', details);
  }
}

/**
 * 認證錯誤
 */
export class AuthenticationError extends AppError {
  constructor(message = '認證失敗') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

/**
 * 授權錯誤
 */
export class AuthorizationError extends AppError {
  constructor(message = '權限不足') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

/**
 * 資源未找到錯誤
 */
export class NotFoundError extends AppError {
  constructor(message = '資源未找到') {
    super(message, 404, 'NOT_FOUND');
  }
}

/**
 * 速率限制錯誤
 */
export class RateLimitError extends AppError {
  constructor(message = '請求過於頻繁，請稍後重試') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

/**
 * 資料庫錯誤處理
 */
const handleDatabaseError = (error) => {
  logger.error('資料庫錯誤:', error);
  
  // MySQL錯誤碼處理
  switch (error.code) {
    case 'ER_DUP_ENTRY':
      return new BusinessError('數據已存在，請檢查唯一性約束', 'DUPLICATE_ENTRY');
    
    case 'ER_NO_REFERENCED_ROW_2':
      return new BusinessError('關聯數據不存在', 'FOREIGN_KEY_CONSTRAINT');
    
    case 'ER_ROW_IS_REFERENCED_2':
      return new BusinessError('數據被其他記錄引用，無法刪除', 'FOREIGN_KEY_CONSTRAINT');
    
    case 'ER_DATA_TOO_LONG':
      return new ValidationError('數據長度超出限制', 'DATA_TOO_LONG');
    
    case 'ER_BAD_NULL_ERROR':
      return new ValidationError('必填字段不能為空', 'NULL_CONSTRAINT');
    
    case 'ECONNREFUSED':
      return new AppError('資料庫連接失敗', 500, 'DATABASE_CONNECTION_ERROR');
    
    default:
      return new AppError('資料庫操作失敗', 500, 'DATABASE_ERROR');
  }
};

/**
 * JWT錯誤處理
 */
const handleJWTError = (error) => {
  if (error.name === 'JsonWebTokenError') {
    return new AuthenticationError('無效的認證令牌');
  }
  
  if (error.name === 'TokenExpiredError') {
    return new AuthenticationError('認證令牌已過期');
  }
  
  if (error.name === 'NotBeforeError') {
    return new AuthenticationError('認證令牌尚未生效');
  }
  
  return new AuthenticationError('認證令牌錯誤');
};

/**
 * Joi驗證錯誤處理
 */
const handleValidationError = (error) => {
  const errors = error.details.map(detail => ({
    field: detail.path.join('.'),
    message: detail.message,
    value: detail.context?.value
  }));
  
  return new ValidationError('數據驗證失敗', errors);
};

/**
 * 檔案上傳錯誤處理
 */
const handleMulterError = (error) => {
  switch (error.code) {
    case 'LIMIT_FILE_SIZE':
      return new ValidationError('檔案大小超過限制');
    
    case 'LIMIT_FILE_COUNT':
      return new ValidationError('檔案數量超過限制');
    
    case 'LIMIT_UNEXPECTED_FILE':
      return new ValidationError('不允許的檔案字段');
    
    default:
      return new AppError('檔案上傳失敗', 400, 'FILE_UPLOAD_ERROR');
  }
};

/**
 * 格式化錯誤響應
 */
const formatErrorResponse = (error, req) => {
  const response = {
    success: false,
    message: error.message,
    code: error.code || 'UNKNOWN_ERROR',
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method
  };
  
  // 開發環境顯示詳細錯誤信息
  if (appConfig.server.env === 'development') {
    response.stack = error.stack;
    response.details = error.details;
  }
  
  // 驗證錯誤顯示詳細信息
  if (error instanceof ValidationError && error.details) {
    response.details = error.details;
  }
  
  // 業務錯誤顯示詳細信息
  if (error instanceof BusinessError && error.details) {
    response.details = error.details;
  }
  
  return response;
};

/**
 * 主要錯誤處理中間件
 */
export const errorHandler = (error, req, res, next) => {
  let processedError = error;
  
  // 如果不是我們自定義的錯誤，則進行轉換
  if (!error.isOperational) {
    // 資料庫錯誤
    if (error.code && error.code.startsWith('ER_')) {
      processedError = handleDatabaseError(error);
    }
    // JWT錯誤
    else if (error.name && error.name.includes('Token')) {
      processedError = handleJWTError(error);
    }
    // Joi驗證錯誤
    else if (error.isJoi) {
      processedError = handleValidationError(error);
    }
    // Multer錯誤
    else if (error.code && error.code.startsWith('LIMIT_')) {
      processedError = handleMulterError(error);
    }
    // 一般錯誤
    else {
      processedError = new AppError(
        appConfig.server.env === 'development' ? error.message : '服務器內部錯誤',
        500,
        'INTERNAL_ERROR'
      );
    }
  }
  
  // 記錄錯誤日誌
  logger.error('API錯誤處理', {
    error: processedError.message,
    code: processedError.code,
    statusCode: processedError.statusCode,
    stack: processedError.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    requestId: req.requestId
  });
  
  // 發送錯誤響應
  res.status(processedError.statusCode || 500).json(
    formatErrorResponse(processedError, req)
  );
};

/**
 * 處理未找到的路由
 */
export const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError(`路由 ${req.originalUrl} 不存在`);
  next(error);
};

/**
 * 非同步錯誤捕獲包裝器
 */
export const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 創建標準化成功響應
 */
export const createSuccessResponse = (data = null, message = '操作成功', meta = null) => {
  const response = {
    success: true,
    message,
    timestamp: new Date().toISOString()
  };
  
  if (data !== null) {
    response.data = data;
  }
  
  if (meta) {
    response.meta = meta;
  }
  
  return response;
};

/**
 * 創建分頁響應
 */
export const createPaginationResponse = (data, page, limit, total) => {
  const totalPages = Math.ceil(total / limit);
  
  return createSuccessResponse(data, '查詢成功', {
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: parseInt(total),
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  });
};

export default {
  errorHandler,
  notFoundHandler,
  catchAsync,
  createSuccessResponse,
  createPaginationResponse,
  AppError,
  BusinessError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError
}; 