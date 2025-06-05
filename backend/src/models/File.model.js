/**
 * 檔案管理模型
 * 處理檔案相關的資料庫操作
 */

import { query } from "../config/database.config.js";
import crypto from "crypto";
import path from "path";

/**
 * 創建檔案記錄
 * @param {Object} fileData - 檔案數據
 * @returns {Promise<Object>} 創建的檔案記錄
 */
export const createFile = async (fileData) => {
  const {
    user_id,
    filename,
    stored_filename,
    file_path,
    file_size,
    mime_type,
    file_hash,
    file_type = "attachment",
    metadata = null,
    is_public = false,
  } = fileData;

  const sql = `
    INSERT INTO files (
      user_id, filename, stored_filename, file_path, file_size,
      mime_type, file_hash, file_type, metadata, is_public
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const result = await query(sql, [
    user_id,
    filename,
    stored_filename,
    file_path,
    file_size,
    mime_type,
    file_hash,
    file_type,
    metadata ? JSON.stringify(metadata) : null,
    is_public,
  ]);

  return {
    id: result.rows.insertId,
    user_id,
    filename,
    stored_filename,
    file_path,
    file_size,
    mime_type,
    file_hash,
    file_type,
    metadata,
    is_public,
    download_count: 0,
    created_at: new Date(),
  };
};

/**
 * 根據 ID 獲取檔案
 * @param {number} fileId - 檔案 ID
 * @returns {Promise<Object|null>} 檔案數據
 */
export const getFileById = async (fileId) => {
  const sql = `
    SELECT 
      id, user_id, filename, stored_filename, file_path, file_size,
      mime_type, file_hash, file_type, metadata, is_public,
      download_count, created_at
    FROM files
    WHERE id = ?
  `;

  const result = await query(sql, [fileId]);

  if (result.rows.length === 0) {
    return null;
  }

  const file = result.rows[0];

  // 解析 JSON 欄位
  if (file.metadata && typeof file.metadata === "string") {
    try {
      file.metadata = JSON.parse(file.metadata);
    } catch (e) {
      file.metadata = null;
    }
  }

  return file;
};

/**
 * 根據檔案雜湊值獲取檔案（用於去重）
 * @param {string} fileHash - 檔案雜湊值
 * @returns {Promise<Object|null>} 檔案數據
 */
export const getFileByHash = async (fileHash) => {
  const sql = `
    SELECT 
      id, user_id, filename, stored_filename, file_path, file_size,
      mime_type, file_hash, file_type, metadata, is_public,
      download_count, created_at
    FROM files
    WHERE file_hash = ?
    LIMIT 1
  `;

  const result = await query(sql, [fileHash]);

  if (result.rows.length === 0) {
    return null;
  }

  const file = result.rows[0];

  // 解析 JSON 欄位
  if (file.metadata && typeof file.metadata === "string") {
    try {
      file.metadata = JSON.parse(file.metadata);
    } catch (e) {
      file.metadata = null;
    }
  }

  return file;
};

/**
 * 獲取用戶的檔案列表
 * @param {number} userId - 用戶 ID
 * @param {Object} options - 查詢選項
 * @returns {Promise<Array>} 檔案列表
 */
export const getUserFiles = async (userId, options = {}) => {
  const { file_type, limit = 50, offset = 0 } = options;

  let sql = `
    SELECT 
      id, user_id, filename, stored_filename, file_path, file_size,
      mime_type, file_hash, file_type, metadata, is_public,
      download_count, created_at
    FROM files
    WHERE user_id = ?
  `;
  const params = [userId];

  if (file_type) {
    sql += " AND file_type = ?";
    params.push(file_type);
  }

  sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
  params.push(limit, offset);

  const result = await query(sql, params);

  return result.rows.map((file) => {
    // 解析 JSON 欄位
    if (file.metadata && typeof file.metadata === "string") {
      try {
        file.metadata = JSON.parse(file.metadata);
      } catch (e) {
        file.metadata = null;
      }
    }
    return file;
  });
};

/**
 * 更新檔案下載次數
 * @param {number} fileId - 檔案 ID
 * @returns {Promise<void>}
 */
export const incrementDownloadCount = async (fileId) => {
  const sql = `
    UPDATE files 
    SET download_count = download_count + 1 
    WHERE id = ?
  `;

  await query(sql, [fileId]);
};

/**
 * 刪除檔案記錄
 * @param {number} fileId - 檔案 ID
 * @returns {Promise<void>}
 */
export const deleteFile = async (fileId) => {
  const sql = "DELETE FROM files WHERE id = ?";
  await query(sql, [fileId]);
};

/**
 * 檢查用戶是否有檔案存取權限
 * @param {number} fileId - 檔案 ID
 * @param {number} userId - 用戶 ID
 * @returns {Promise<boolean>} 是否有權限
 */
export const checkFileAccess = async (fileId, userId) => {
  const sql = `
    SELECT id, user_id, is_public
    FROM files
    WHERE id = ?
  `;

  const result = await query(sql, [fileId]);

  if (result.rows.length === 0) {
    return false;
  }

  const file = result.rows[0];

  // 檔案擁有者或公開檔案可以存取
  return file.user_id === userId || file.is_public;
};

/**
 * 生成檔案雜湊值
 * @param {Buffer} fileBuffer - 檔案緩衝區
 * @returns {string} 檔案雜湊值
 */
export const generateFileHash = (fileBuffer) => {
  return crypto.createHash("sha256").update(fileBuffer).digest("hex");
};

/**
 * 生成唯一的存儲檔案名
 * @param {string} originalFilename - 原始檔案名
 * @returns {string} 唯一的存儲檔案名
 */
export const generateStoredFilename = (originalFilename) => {
  const ext = path.extname(originalFilename);
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString("hex");
  return `${timestamp}_${random}${ext}`;
};

/**
 * 獲取檔案統計信息
 * @param {number} userId - 用戶 ID（可選）
 * @returns {Promise<Object>} 統計信息
 */
export const getFileStats = async (userId = null) => {
  let sql = `
    SELECT 
      COUNT(*) as total_files,
      SUM(file_size) as total_size,
      COUNT(CASE WHEN file_type = 'image' THEN 1 END) as image_count,
      COUNT(CASE WHEN file_type = 'document' THEN 1 END) as document_count,
      COUNT(CASE WHEN file_type = 'attachment' THEN 1 END) as attachment_count,
      AVG(file_size) as avg_file_size
    FROM files
  `;
  const params = [];

  if (userId) {
    sql += " WHERE user_id = ?";
    params.push(userId);
  }

  const result = await query(sql, params);
  return result.rows[0];
};

export default {
  createFile,
  getFileById,
  getFileByHash,
  getUserFiles,
  incrementDownloadCount,
  deleteFile,
  checkFileAccess,
  generateFileHash,
  generateStoredFilename,
  getFileStats,
};
