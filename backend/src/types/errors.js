/**
 * 標準化錯誤格式和錯誤類型定義
 * 用於統一整個應用的錯誤處理
 */

/**
 * 基礎錯誤類
 */
export class BaseError extends Error {
  constructor(message, code, statusCode = 500, details = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.traceId = this.generateTraceId();
    
    // 確保錯誤堆疊追蹤正確
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  generateTraceId() {
    return Math.random().toString(36).substr(2, 9);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp,
      traceId: this.traceId,
      stack: this.stack
    };
  }
}

/**
 * 驗證錯誤
 */
export class ValidationError extends BaseError {
  constructor(message, field = null, value = null, details = {}) {
    super(message, 'VALIDATION_ERROR', 400, {
      field,
      value,
      ...details
    });
  }
}

/**
 * 業務邏輯錯誤
 */
export class BusinessError extends BaseError {
  constructor(message, code = 'BUSINESS_ERROR', details = {}) {
    super(message, code, 422, details);
  }
}

/**
 * 認證錯誤
 */
export class AuthenticationError extends BaseError {
  constructor(message = '認證失敗', details = {}) {
    super(message, 'AUTHENTICATION_ERROR', 401, details);
  }
}

/**
 * 授權錯誤
 */
export class AuthorizationError extends BaseError {
  constructor(message = '權限不足', details = {}) {
    super(message, 'AUTHORIZATION_ERROR', 403, details);
  }
}

/**
 * 資源未找到錯誤
 */
export class NotFoundError extends BaseError {
  constructor(message = '資源未找到', resource = null, resourceId = null, details = {}) {
    super(message, 'NOT_FOUND_ERROR', 404, {
      resource,
      resourceId,
      ...details
    });
  }
}

/**
 * 衝突錯誤
 */
export class ConflictError extends BaseError {
  constructor(message = '資源衝突', details = {}) {
    super(message, 'CONFLICT_ERROR', 409, details);
  }
}

/**
 * 限流錯誤
 */
export class RateLimitError extends BaseError {
  constructor(message = '請求過於頻繁', limit = null, retryAfter = null, details = {}) {
    super(message, 'RATE_LIMIT_ERROR', 429, {
      limit,
      retryAfter,
      ...details
    });
  }
}

/**
 * AI 服務錯誤
 */
export class AIServiceError extends BaseError {
  constructor(message, modelType = null, modelName = null, details = {}) {
    super(message, 'AI_SERVICE_ERROR', 500, {
      modelType,
      modelName,
      ...details
    });
  }
}

/**
 * MCP 服務錯誤
 */
export class MCPServiceError extends BaseError {
  constructor(message, toolName = null, serviceName = null, details = {}) {
    super(message, 'MCP_SERVICE_ERROR', 500, {
      toolName,
      serviceName,
      ...details
    });
  }
}

/**
 * 工具檢測錯誤
 */
export class ToolDetectionError extends BaseError {
  constructor(message, detectionStrategy = null, details = {}) {
    super(message, 'TOOL_DETECTION_ERROR', 500, {
      detectionStrategy,
      ...details
    });
  }
}

/**
 * 工具執行錯誤
 */
export class ToolExecutionError extends BaseError {
  constructor(message, toolName = null, executionTime = null, details = {}) {
    super(message, 'TOOL_EXECUTION_ERROR', 500, {
      toolName,
      executionTime,
      ...details
    });
  }
}

/**
 * 資料庫錯誤
 */
export class DatabaseError extends BaseError {
  constructor(message, operation = null, table = null, details = {}) {
    super(message, 'DATABASE_ERROR', 500, {
      operation,
      table,
      ...details
    });
  }
}

/**
 * 檔案處理錯誤
 */
export class FileProcessingError extends BaseError {
  constructor(message, fileName = null, fileType = null, details = {}) {
    super(message, 'FILE_PROCESSING_ERROR', 500, {
      fileName,
      fileType,
      ...details
    });
  }
}

/**
 * 網路錯誤
 */
export class NetworkError extends BaseError {
  constructor(message, url = null, method = null, statusCode = 500, details = {}) {
    super(message, 'NETWORK_ERROR', statusCode, {
      url,
      method,
      ...details
    });
  }
}

/**
 * 配置錯誤
 */
export class ConfigurationError extends BaseError {
  constructor(message, configKey = null, details = {}) {
    super(message, 'CONFIGURATION_ERROR', 500, {
      configKey,
      ...details
    });
  }
}

/**
 * 流程錯誤
 */
export class FlowError extends BaseError {
  constructor(message, flowId = null, step = null, details = {}) {
    super(message, 'FLOW_ERROR', 500, {
      flowId,
      step,
      ...details
    });
  }
}

/**
 * 錯誤工廠類
 */
export class ErrorFactory {
  /**
   * 創建標準化錯誤
   */
  static create(type, message, details = {}) {
    const errorMap = {
      'validation': ValidationError,
      'business': BusinessError,
      'authentication': AuthenticationError,
      'authorization': AuthorizationError,
      'not_found': NotFoundError,
      'conflict': ConflictError,
      'rate_limit': RateLimitError,
      'ai_service': AIServiceError,
      'mcp_service': MCPServiceError,
      'tool_detection': ToolDetectionError,
      'tool_execution': ToolExecutionError,
      'database': DatabaseError,
      'file_processing': FileProcessingError,
      'network': NetworkError,
      'configuration': ConfigurationError,
      'flow': FlowError
    };

    const ErrorClass = errorMap[type] || BaseError;
    return new ErrorClass(message, details);
  }

  /**
   * 從原始錯誤創建標準化錯誤
   */
  static fromError(error, type = 'base', details = {}) {
    if (error instanceof BaseError) {
      return error;
    }

    const message = error.message || '未知錯誤';
    const newError = this.create(type, message, {
      originalError: error.name,
      originalStack: error.stack,
      ...details
    });

    return newError;
  }

  /**
   * 包裝異步操作的錯誤
   */
  static async wrapAsync(operation, errorType = 'base', details = {}) {
    try {
      return await operation();
    } catch (error) {
      throw this.fromError(error, errorType, details);
    }
  }
}

/**
 * 錯誤響應格式化器
 */
export class ErrorResponseFormatter {
  /**
   * 格式化錯誤響應
   */
  static format(error, includeStack = false) {
    const baseResponse = {
      success: false,
      error: {
        message: error.message,
        code: error.code || 'UNKNOWN_ERROR',
        timestamp: error.timestamp || new Date().toISOString(),
        traceId: error.traceId || 'unknown'
      }
    };

    // 添加詳細信息（如果存在）
    if (error.details && Object.keys(error.details).length > 0) {
      baseResponse.error.details = error.details;
    }

    // 添加堆疊信息（僅在開發環境）
    if (includeStack && error.stack) {
      baseResponse.error.stack = error.stack;
    }

    return baseResponse;
  }

  /**
   * 格式化用於日誌的錯誤信息
   */
  static formatForLogging(error, context = {}) {
    return {
      message: error.message,
      code: error.code || 'UNKNOWN_ERROR',
      statusCode: error.statusCode || 500,
      details: error.details || {},
      timestamp: error.timestamp || new Date().toISOString(),
      traceId: error.traceId || 'unknown',
      stack: error.stack,
      context
    };
  }
}

/**
 * 錯誤收集器
 */
export class ErrorCollector {
  constructor() {
    this.errors = [];
    this.maxErrors = 100;
  }

  /**
   * 收集錯誤
   */
  collect(error, context = {}) {
    const errorRecord = {
      error: error instanceof BaseError ? error.toJSON() : ErrorFactory.fromError(error).toJSON(),
      context,
      collectedAt: new Date().toISOString()
    };

    this.errors.unshift(errorRecord);

    // 限制錯誤數量
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(0, this.maxErrors);
    }
  }

  /**
   * 獲取錯誤統計
   */
  getStats() {
    const stats = {
      total: this.errors.length,
      byType: {},
      byCode: {},
      recent: this.errors.slice(0, 10)
    };

    this.errors.forEach(record => {
      const errorType = record.error.name;
      const errorCode = record.error.code;

      stats.byType[errorType] = (stats.byType[errorType] || 0) + 1;
      stats.byCode[errorCode] = (stats.byCode[errorCode] || 0) + 1;
    });

    return stats;
  }

  /**
   * 清空錯誤記錄
   */
  clear() {
    this.errors = [];
  }
}

// 全局錯誤收集器實例
export const globalErrorCollector = new ErrorCollector();