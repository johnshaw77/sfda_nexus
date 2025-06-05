/**
 * 資料庫配置文件
 * 使用mysql2進行MySQL連接配置和連接池管理
 */

import mysql from "mysql2/promise";
import dotenv from "dotenv";
import logger from "../utils/logger.util.js";

// 載入環境變數
dotenv.config();

// 資料庫連接配置
export const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "sfda_nexus",

  // 連接池配置
  connectionLimit: 10,
  //acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true,

  // 字符集和時區配置
  charset: "utf8mb4",
  timezone: "+08:00",

  // 確保使用正確的字符集
  typeCast: function (field, next) {
    if (field.type === "VAR_STRING" || field.type === "STRING") {
      return field.string();
    }
    return next();
  },

  // SSL配置 (生產環境建議啟用)
  ssl:
    process.env.NODE_ENV === "production"
      ? {
          rejectUnauthorized: false,
        }
      : false,

  // 其他配置
  supportBigNumbers: true,
  bigNumberStrings: true,
  dateStrings: true,
};

// 建立連接池
let pool = null;

/**
 * 初始化資料庫連接池
 */
export const initializeDatabase = async () => {
  try {
    pool = mysql.createPool(dbConfig);

    // 測試連接並設置字符集
    const connection = await pool.getConnection();

    // 確保字符集設置正確
    await connection.execute("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
    await connection.execute("SET character_set_client = utf8mb4");
    await connection.execute("SET character_set_connection = utf8mb4");
    await connection.execute("SET character_set_results = utf8mb4");

    logger.info("✅ 資料庫連接池初始化成功");
    logger.info("✅ 字符集設置為 utf8mb4");
    logger.info(
      `📊 連接到資料庫: ${dbConfig.database}@${dbConfig.host}:${dbConfig.port}`
    );
    connection.release();

    return pool;
  } catch (error) {
    logger.error("❌ 資料庫連接失敗:", error.message);
    throw error;
  }
};

/**
 * 獲取資料庫連接池
 */
export const getPool = () => {
  if (!pool) {
    throw new Error("資料庫連接池尚未初始化，請先調用 initializeDatabase()");
  }
  return pool;
};

/**
 * 執行SQL查詢
 * @param {string} sql - SQL語句
 * @param {Array} params - 參數陣列
 * @returns {Promise<Object>} 查詢結果
 */
export const query = async (sql, params = []) => {
  const connection = await getPool().getConnection();

  try {
    // 確保每個連接都設置正確的字符集
    await connection.execute("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");

    // 根據 PRINT_SQL 環境變數決定是否打印 SQL 調試信息
    const shouldPrintSQL =
      process.env.PRINT_SQL === "true" ||
      (process.env.NODE_ENV === "development" &&
        process.env.PRINT_SQL !== "false");

    if (shouldPrintSQL) {
      console.log("🔍 執行 SQL 查詢:");
      console.log("SQL:", sql);
      console.log("參數:", params);
      console.log("格式化 SQL:", formatQuery(sql, params));
    }

    const [rows, fields] = await connection.execute(sql, params);

    // 根據 PRINT_SQL 環境變數決定是否打印結果統計
    if (shouldPrintSQL) {
      console.log(
        "✅ 查詢成功，返回",
        Array.isArray(rows) ? rows.length : "N/A",
        "行數據"
      );
    }

    return { rows, fields };
  } catch (error) {
    // 直接在控制台打印詳細錯誤信息
    console.error("❌ SQL查詢執行失敗:");
    console.error("SQL:", sql);
    console.error("參數:", params);
    console.error("格式化 SQL:", formatQuery(sql, params));
    console.error("錯誤代碼:", error.code);
    console.error("錯誤編號:", error.errno);
    console.error("SQL狀態:", error.sqlState);
    console.error("錯誤訊息:", error.message);
    console.error("完整錯誤:", error);

    logger.error("SQL查詢執行失敗:", {
      sql: sql,
      params: params,
      formattedSql: formatQuery(sql, params),
      error: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
    });
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * 執行事務
 * @param {Function} callback - 事務回調函數
 * @returns {Promise<any>} 事務結果
 */
export const transaction = async (callback) => {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 提供connection給回調函數
    const result = await callback(connection);

    await connection.commit();
    logger.debug("事務提交成功");

    return result;
  } catch (error) {
    await connection.rollback();
    logger.error("事務回滾:", error.message);
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * 檢查資料庫連接狀態
 * @returns {Promise<boolean>} 連接狀態
 */
export const checkConnection = async () => {
  try {
    const pool = getPool();
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    return true;
  } catch (error) {
    logger.error("資料庫連接檢查失敗:", error.message);
    return false;
  }
};

/**
 * 關閉資料庫連接池
 */
export const closeDatabase = async () => {
  if (pool) {
    try {
      await pool.end();
      pool = null;
      logger.info("資料庫連接池已關閉");
    } catch (error) {
      logger.error("關閉資料庫連接池時發生錯誤:", error.message);
    }
  }
};

/**
 * 格式化SQL查詢參數 (用於調試)
 * @param {string} sql - SQL語句
 * @param {Array} params - 參數陣列
 * @returns {string} 格式化後的SQL
 */
export const formatQuery = (sql, params) => {
  if (!params || params.length === 0) return sql;

  let formattedSql = sql;
  params.forEach((param) => {
    formattedSql = formattedSql.replace(
      "?",
      typeof param === "string" ? `'${param}'` : param
    );
  });

  return formattedSql;
};

// 導出預設的資料庫工具
export default {
  initializeDatabase,
  getPool,
  query,
  transaction,
  checkConnection,
  closeDatabase,
  formatQuery,
};
