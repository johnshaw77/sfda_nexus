/**
 * 日誌工具 - 使用Winston進行日誌管理
 * 支持多級別日誌記錄、文件輪轉和結構化日誌
 */

import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// 獲取目錄路徑
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 日誌目錄
const logDir = process.env.LOG_DIR || path.join(__dirname, '../../logs');

// 確保日誌目錄存在
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 自定義日誌格式
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    // 提取調用來源資訊
    const { service, version, caller, ...customMeta } = meta;
    
    let logMessage = `${timestamp} [${level.toUpperCase()}]`;
    
    // 如果有調用來源資訊，顯示檔案和函數
    if (caller) {
      logMessage += ` [${caller}]`;
    }
    
    // 如果有堆疊信息（錯誤）
    if (stack) {
      logMessage += ` ${message}\n${stack}`;
    } else {
      logMessage += ` ${message}`;
    }
    
    // 如果有額外的元數據
    if (Object.keys(customMeta).length > 0) {
      logMessage += `\nMeta: ${JSON.stringify(customMeta, null, 2)}`;
    }
    
    return logMessage;
  })
);

// 控制台格式 (彩色輸出)
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    // 提取調用來源資訊
    const { service, version, caller, ...customMeta } = meta;
    
    let logMessage = `${timestamp} ${level}:`;
    
    // 如果有調用來源資訊，顯示檔案和函數
    if (caller) {
      logMessage += ` [${caller}]`;
    }
    
    logMessage += ` ${message}`;
    
    if (stack) {
      logMessage += `\n${stack}`;
    }
    
    // 如果還有其他 meta 資訊則顯示
    if (Object.keys(customMeta).length > 0) {
      logMessage += `\nMeta: ${JSON.stringify(customMeta, null, 2)}`;
    }
    
    return logMessage;
  })
);

// 創建日誌記錄器
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { 
    service: 'sfda-nexus-backend',
    version: process.env.npm_package_version || '1.0.0'
  },
  transports: [
    // 錯誤日誌文件
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    }),
    
    // 警告及以上級別日誌
    new winston.transports.File({
      filename: path.join(logDir, 'warn.log'),
      level: 'warn',
      maxsize: 5242880,
      maxFiles: 3,
      tailable: true
    }),
    
    // 所有日誌
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880,
      maxFiles: 5,
      tailable: true
    }),
    
    // 審計日誌 (重要操作記錄)
    new winston.transports.File({
      filename: path.join(logDir, 'audit.log'),
      level: 'info',
      maxsize: 10485760, // 10MB
      maxFiles: 10,
      tailable: true,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  ],
  
  // 異常處理
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'exceptions.log'),
      maxsize: 5242880,
      maxFiles: 3
    })
  ],
  
  // 拒絕處理
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'rejections.log'),
      maxsize: 5242880,
      maxFiles: 3
    })
  ]
});

// 開發環境輸出到控制台
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat,
    level: 'debug'
  }));
}

// 獲取調用來源資訊的輔助函數
function getCallerInfo() {
  const stack = new Error().stack;
  const stackLines = stack.split('\n');
  
  // 跳過前3行：Error, getCallerInfo, 和實際調用的 logger 方法
  for (let i = 3; i < stackLines.length; i++) {
    const line = stackLines[i];
    
    // 尋找第一個不是 node_modules 的調用
    if (line.includes('file://') && !line.includes('node_modules')) {
      const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):\d+\)/);
      if (match) {
        const [, functionName, filePath, lineNumber] = match;
        const fileName = filePath.split('/').pop().replace('file://', '');
        return `${fileName}:${lineNumber}:${functionName}`;
      }
      
      // 如果沒有函數名（匿名函數或頂層調用）
      const simpleMatch = line.match(/\((.+?):(\d+):\d+\)/);
      if (simpleMatch) {
        const [, filePath, lineNumber] = simpleMatch;
        const fileName = filePath.split('/').pop().replace('file://', '');
        return `${fileName}:${lineNumber}`;
      }
    }
  }
  
  return 'unknown';
}

// 創建增強的 logger 方法
const enhancedLogger = {
  error: (message, meta = {}) => {
    logger.error(message, { ...meta, caller: getCallerInfo() });
  },
  warn: (message, meta = {}) => {
    logger.warn(message, { ...meta, caller: getCallerInfo() });
  },
  info: (message, meta = {}) => {
    logger.info(message, { ...meta, caller: getCallerInfo() });
  },
  debug: (message, meta = {}) => {
    logger.debug(message, { ...meta, caller: getCallerInfo() });
  }
};

// 複製其他方法
Object.keys(logger).forEach(key => {
  if (!enhancedLogger[key] && typeof logger[key] === 'function') {
    enhancedLogger[key] = logger[key].bind(logger);
  }
});

// 擴展日誌方法

/**
 * 記錄API請求日誌
 * @param {Object} req - Express請求對象
 * @param {Object} res - Express響應對象
 * @param {number} responseTime - 響應時間(ms)
 */
enhancedLogger.logRequest = (req, res, responseTime) => {
  const logData = {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    statusCode: res.statusCode,
    responseTime: `${responseTime}ms`,
    contentLength: res.get('Content-Length') || 0
  };
  
  // 根據狀態碼選擇日誌級別
  if (res.statusCode >= 500) {
    enhancedLogger.error('API請求 - 服務器錯誤', logData);
  } else if (res.statusCode >= 400) {
    enhancedLogger.warn('API請求 - 客戶端錯誤', logData);
  } else {
    enhancedLogger.info('API請求', logData);
  }
};

/**
 * 記錄用戶操作審計日誌
 * @param {string} userId - 用戶ID
 * @param {string} action - 操作類型
 * @param {Object} details - 操作詳情
 * @param {string} ip - IP地址
 */
enhancedLogger.audit = (userId, action, details = {}, ip = '') => {
  enhancedLogger.info('用戶操作審計', {
    userId,
    action,
    details,
    ip,
    timestamp: new Date().toISOString(),
    category: 'AUDIT'
  });
};

/**
 * 記錄安全相關事件
 * @param {string} event - 事件類型
 * @param {Object} details - 事件詳情
 * @param {string} severity - 嚴重程度 (low, medium, high, critical)
 */
enhancedLogger.security = (event, details = {}, severity = 'medium') => {
  const logLevel = severity === 'critical' || severity === 'high' ? 'error' : 'warn';
  
  enhancedLogger[logLevel]('安全事件', {
    event,
    severity,
    details,
    timestamp: new Date().toISOString(),
    category: 'SECURITY'
  });
};

/**
 * 記錄AI模型調用日誌
 * @param {string} modelType - 模型類型 (ollama, gemini等)
 * @param {string} modelName - 模型名稱
 * @param {Object} usage - 使用統計
 * @param {number} responseTime - 響應時間
 */
enhancedLogger.aiUsage = (modelType, modelName, usage = {}, responseTime = 0) => {
  enhancedLogger.info('AI模型調用', {
    modelType,
    modelName,
    usage,
    responseTime: `${responseTime}ms`,
    timestamp: new Date().toISOString(),
    category: 'AI_USAGE'
  });
};

/**
 * 記錄資料庫操作日誌
 * @param {string} operation - 操作類型
 * @param {string} table - 表名
 * @param {Object} details - 操作詳情
 * @param {number} executionTime - 執行時間
 */
enhancedLogger.database = (operation, table, details = {}, executionTime = 0) => {
  enhancedLogger.debug('資料庫操作', {
    operation,
    table,
    details,
    executionTime: `${executionTime}ms`,
    timestamp: new Date().toISOString(),
    category: 'DATABASE'
  });
};

export default enhancedLogger; 