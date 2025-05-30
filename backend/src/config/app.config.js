/**
 * 應用程式總配置文件
 * 匯總所有配置項目，提供統一的配置管理
 */

import dotenv from 'dotenv';

// 載入環境變數
dotenv.config();

// 應用程式基本配置
export const appConfig = {
  // 服務器配置
  server: {
    port: parseInt(process.env.PORT) || 3000,
    wsPort: parseInt(process.env.WS_PORT) || 3001,
    env: process.env.NODE_ENV || 'development',
    apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3000'
  },

  // 安全配置
  security: {
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12
  },

  // 限流配置
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) * 60 * 1000 || 15 * 60 * 1000, // 轉換為毫秒
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100
  },

  // 檔案上傳配置
  upload: {
    dir: process.env.UPLOAD_DIR || './uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760, // 10MB
    allowedTypes: {
      images: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
      documents: ['.pdf', '.doc', '.docx', '.txt', '.md'],
      archives: ['.zip', '.rar', '.7z']
    }
  },

  // 日誌配置
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    dir: process.env.LOG_DIR || './logs',
    maxFileSize: 5242880, // 5MB
    maxFiles: 5
  },

  // AI模型配置
  ai: {
    // Gemini配置
    gemini: {
      apiKey: process.env.GEMINI_API_KEY,
      apiUrl: process.env.GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'
    },
    
    // Ollama配置
    ollama: {
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      defaultModel: process.env.OLLAMA_MODEL || 'qwen3:30b'
    },

    // 向量資料庫配置
    qdrant: {
      url: process.env.QDRANT_URL || 'http://localhost:6333',
      apiKey: process.env.QDRANT_API_KEY
    }
  }
};

// 驗證必要的環境變數
export const validateConfig = () => {
  const requiredEnvVars = [
    'DB_HOST',
    'DB_USER', 
    'DB_PASSWORD',
    'DB_NAME',
    'JWT_SECRET'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`缺少必要的環境變數: ${missingVars.join(', ')}`);
  }
};

// 開發環境檢查
export const isDevelopment = () => appConfig.server.env === 'development';
export const isProduction = () => appConfig.server.env === 'production';
export const isTest = () => appConfig.server.env === 'test';

export default appConfig; 