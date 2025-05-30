/**
 * 資料庫配置文件
 * 使用mysql2進行MySQL連接配置和連接池管理
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import logger from '../utils/logger.util.js';

// 載入環境變數
dotenv.config();

// 資料庫連接配置
export const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'sfda_nexus',
  
  // 連接池配置
  connectionLimit: 10,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true,
  
  // 字符集和時區配置
  charset: 'utf8mb4',
  timezone: '+08:00',
  
  // SSL配置 (生產環境建議啟用)
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false,
  
  // 其他配置
  supportBigNumbers: true,
  bigNumberStrings: true,
  dateStrings: true
};

// 建立連接池
let pool = null;

/**
 * 初始化資料庫連接池
 */
export const initializeDatabase = async () => {
  try {
    pool = mysql.createPool(dbConfig);
    
    // 測試連接
    const connection = await pool.getConnection();
    logger.info('✅ 資料庫連接池初始化成功');
    logger.info(`📊 連接到資料庫: ${dbConfig.database}@${dbConfig.host}:${dbConfig.port}`);
    connection.release();
    
    return pool;
  } catch (error) {
    logger.error('❌ 資料庫連接失敗:', error.message);
    throw error;
  }
};

/**
 * 獲取資料庫連接池
 */
export const getPool = () => {
  if (!pool) {
    throw new Error('資料庫連接池尚未初始化，請先調用 initializeDatabase()');
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
  try {
    const pool = getPool();
    const [rows, fields] = await pool.execute(sql, params);
    return { rows, fields };
  } catch (error) {
    logger.error('SQL查詢執行失敗:', {
      sql: sql.substring(0, 100) + (sql.length > 100 ? '...' : ''),
      params: params,
      error: error.message
    });
    throw error;
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
    logger.debug('事務提交成功');
    
    return result;
  } catch (error) {
    await connection.rollback();
    logger.error('事務回滾:', error.message);
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
    logger.error('資料庫連接檢查失敗:', error.message);
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
      logger.info('資料庫連接池已關閉');
    } catch (error) {
      logger.error('關閉資料庫連接池時發生錯誤:', error.message);
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
    formattedSql = formattedSql.replace('?', 
      typeof param === 'string' ? `'${param}'` : param
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
  formatQuery
}; 