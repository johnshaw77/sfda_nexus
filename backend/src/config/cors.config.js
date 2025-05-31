/**
 * CORS (跨域資源共享) 配置文件
 * 配置允許的域名、方法和標頭
 */

import { appConfig } from "./app.config.js";

// 允許的來源域名
const allowedOrigins = [
  "http://localhost:5173", // Vite 開發服務器預設端口
  "http://localhost:3000", // 備用前端端口
  "http://127.0.0.1:5173",
  "http://127.0.0.1:3000",
  "http://localhost:8080",
  "http://localhost:5174", // Vue CLI 預設端口
];

// 生產環境額外允許的域名
if (appConfig.server.env === "production") {
  allowedOrigins
    .push
    // 'https://your-domain.com', // 生產環境域名
    // 'https://www.your-domain.com'
    ();
}

// CORS 配置選項
export const corsConfig = {
  // 動態設置允許的來源
  origin: (origin, callback) => {
    // 允許沒有來源的請求 (如移動應用或Postman)
    if (!origin) return callback(null, true);

    // 檢查來源是否在允許列表中
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`來源 ${origin} 不被CORS政策允許`));
    }
  },

  // 允許的HTTP方法
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],

  // 允許的請求標頭
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
    "Access-Control-Request-Method",
    "Access-Control-Request-Headers",
    "X-API-Key",
    "X-Client-Version",
  ],

  // 允許暴露的響應標頭
  exposedHeaders: [
    "X-Total-Count",
    "X-Page-Count",
    "X-Current-Page",
    "X-Per-Page",
    "X-Rate-Limit-Remaining",
    "X-Rate-Limit-Reset",
  ],

  // 是否允許發送Cookie
  credentials: true,

  // 預檢請求的緩存時間 (秒)
  maxAge: 86400, // 24小時

  // 是否成功處理OPTIONS請求
  optionsSuccessStatus: 200,
};

// 開發環境的寬鬆配置
export const developmentCorsConfig = {
  origin: true, // 允許所有來源
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: "*",
  credentials: true,
  optionsSuccessStatus: 200,
};

// 根據環境選擇配置
export const getActiveCorsConfig = () => {
  return appConfig.server.env === "development"
    ? developmentCorsConfig
    : corsConfig;
};

// 手動CORS檢查中間件 (備用)
export const manualCorsCheck = (req, res, next) => {
  const origin = req.headers.origin;

  // 設置CORS標頭
  if (
    allowedOrigins.includes(origin) ||
    appConfig.server.env === "development"
  ) {
    res.header("Access-Control-Allow-Origin", origin || "*");
    res.header("Access-Control-Allow-Credentials", "true");
    res.header(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    );
    res.header(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With"
    );
  }

  // 處理預檢請求
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  next();
};

export default corsConfig;
