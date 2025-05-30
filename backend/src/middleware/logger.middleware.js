/**
 * 日誌記錄中間件
 * 記錄所有API請求的詳細信息，包括響應時間和狀態
 */

import logger from '../utils/logger.util.js';

/**
 * 請求日誌記錄中間件
 * 記錄每個API請求的基本信息和響應時間
 */
export const loggerMiddleware = (req, res, next) => {
  const startTime = Date.now();
  
  // 記錄請求開始
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  req.requestId = requestId;
  
  // 獲取客戶端IP地址
  const clientIp = req.ip || 
                   req.connection.remoteAddress || 
                   req.socket.remoteAddress ||
                   (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
                   req.headers['x-forwarded-for']?.split(',')[0]?.trim();
  
  // 記錄請求基本信息
  logger.debug('收到API請求', {
    requestId,
    method: req.method,
    url: req.originalUrl || req.url,
    ip: clientIp,
    userAgent: req.get('User-Agent'),
    referer: req.get('Referer'),
    contentType: req.get('Content-Type'),
    contentLength: req.get('Content-Length'),
    authorization: req.get('Authorization') ? '***' : undefined // 隱藏授權信息
  });
  
  // 攔截響應結束事件
  const originalSend = res.send;
  res.send = function(data) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    // 記錄響應信息
    logger.logRequest(req, res, responseTime);
    
    // 記錄詳細的響應信息（僅在debug級別）
    logger.debug('API請求完成', {
      requestId,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      contentLength: res.get('Content-Length') || (data ? Buffer.byteLength(data, 'utf8') : 0)
    });
    
    // 調用原始的send方法
    originalSend.call(this, data);
  };
  
  // 處理響應錯誤
  res.on('error', (error) => {
    logger.error('響應錯誤', {
      requestId,
      error: error.message,
      stack: error.stack
    });
  });
  
  // 繼續處理請求
  next();
};

/**
 * 慢查詢記錄中間件
 * 記錄響應時間超過閾值的請求
 */
export const slowQueryLogger = (threshold = 2000) => {
  return (req, res, next) => {
    const startTime = Date.now();
    
    res.on('finish', () => {
      const responseTime = Date.now() - startTime;
      
      if (responseTime > threshold) {
        logger.warn('慢查詢檢測', {
          method: req.method,
          url: req.originalUrl,
          responseTime: `${responseTime}ms`,
          threshold: `${threshold}ms`,
          statusCode: res.statusCode,
          ip: req.ip
        });
      }
    });
    
    next();
  };
};

/**
 * 錯誤請求記錄中間件
 * 專門記錄4xx和5xx狀態碼的請求
 */
export const errorRequestLogger = (req, res, next) => {
  res.on('finish', () => {
    if (res.statusCode >= 400) {
      const logLevel = res.statusCode >= 500 ? 'error' : 'warn';
      
      logger[logLevel]('錯誤請求記錄', {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        referer: req.get('Referer'),
        requestId: req.requestId
      });
    }
  });
  
  next();
};

/**
 * 安全敏感操作記錄中間件
 * 記錄登入、權限變更等安全相關操作
 */
export const securityLogger = (req, res, next) => {
  // 定義需要特殊記錄的路徑
  const securityPaths = [
    '/api/auth/login',
    '/api/auth/logout', 
    '/api/auth/register',
    '/api/admin',
    '/api/users/password',
    '/api/models',
    '/api/agents'
  ];
  
  const isSecurityPath = securityPaths.some(path => 
    req.originalUrl.startsWith(path)
  );
  
  if (isSecurityPath) {
    res.on('finish', () => {
      logger.security('安全敏感操作', {
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user?.id || 'anonymous',
        timestamp: new Date().toISOString()
      }, res.statusCode >= 400 ? 'high' : 'medium');
    });
  }
  
  next();
};

/**
 * API版本記錄中間件
 * 記錄客戶端版本信息，用於API版本管理
 */
export const apiVersionLogger = (req, res, next) => {
  const clientVersion = req.get('X-Client-Version');
  const apiVersion = req.get('X-API-Version') || 'v1';
  
  if (clientVersion) {
    logger.debug('客戶端版本信息', {
      clientVersion,
      apiVersion,
      url: req.originalUrl,
      userAgent: req.get('User-Agent')
    });
  }
  
  next();
};

export default {
  loggerMiddleware,
  slowQueryLogger,
  errorRequestLogger,
  securityLogger,
  apiVersionLogger
}; 