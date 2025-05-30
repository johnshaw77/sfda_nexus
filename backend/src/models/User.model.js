/**
 * 用戶資料模型
 * 處理用戶相關的資料庫操作
 */

import { query, transaction } from '../config/database.config.js';
import bcrypt from 'bcryptjs';
import { appConfig } from '../config/app.config.js';
import logger from '../utils/logger.util.js';

export class UserModel {
  /**
   * 根據ID獲取用戶
   * @param {number} id - 用戶ID
   * @returns {Promise<Object|null>} 用戶信息
   */
  static async findById(id) {
    try {
      const { rows } = await query(
        'SELECT * FROM users WHERE id = ? AND is_active = TRUE',
        [id]
      );
      return rows.length > 0 ? this.formatUser(rows[0]) : null;
    } catch (error) {
      logger.error('根據ID查詢用戶失敗', { id, error: error.message });
      throw error;
    }
  }

  /**
   * 根據用戶名獲取用戶
   * @param {string} username - 用戶名
   * @returns {Promise<Object|null>} 用戶信息
   */
  static async findByUsername(username) {
    try {
      const { rows } = await query(
        'SELECT * FROM users WHERE username = ? AND is_active = TRUE',
        [username]
      );
      return rows.length > 0 ? this.formatUser(rows[0]) : null;
    } catch (error) {
      logger.error('根據用戶名查詢用戶失敗', { username, error: error.message });
      throw error;
    }
  }

  /**
   * 根據郵箱獲取用戶
   * @param {string} email - 郵箱地址
   * @returns {Promise<Object|null>} 用戶信息
   */
  static async findByEmail(email) {
    try {
      const { rows } = await query(
        'SELECT * FROM users WHERE email = ? AND is_active = TRUE',
        [email]
      );
      return rows.length > 0 ? this.formatUser(rows[0]) : null;
    } catch (error) {
      logger.error('根據郵箱查詢用戶失敗', { email, error: error.message });
      throw error;
    }
  }

  /**
   * 創建新用戶
   * @param {Object} userData - 用戶數據
   * @returns {Promise<Object>} 創建的用戶信息
   */
  static async create(userData) {
    const {
      username,
      email,
      password,
      display_name,
      department,
      position,
      phone,
      role = 'user'
    } = userData;

    try {
      // 檢查用戶名和郵箱是否已存在
      await this.checkExisting(username, email);

      // 加密密碼
      const password_hash = await bcrypt.hash(password, appConfig.security.bcryptRounds);

      const { rows } = await query(
        `INSERT INTO users (
          username, email, password_hash, display_name, 
          department, position, phone, role, email_verified
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          username,
          email, 
          password_hash,
          display_name || username,
          department,
          position,
          phone,
          role,
          false
        ]
      );

      logger.audit(null, 'USER_CREATED', { 
        username, email, role 
      });

      return await this.findById(rows.insertId);
    } catch (error) {
      logger.error('創建用戶失敗', { 
        username, email, error: error.message 
      });
      throw error;
    }
  }

  /**
   * 更新用戶信息
   * @param {number} id - 用戶ID
   * @param {Object} updateData - 更新數據
   * @returns {Promise<Object>} 更新後的用戶信息
   */
  static async update(id, updateData) {
    const allowedFields = [
      'display_name', 'avatar_url', 'department', 
      'position', 'phone', 'preferences'
    ];

    const updateFields = [];
    const updateValues = [];

    // 過濾允許更新的字段
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key) && updateData[key] !== undefined) {
        updateFields.push(`${key} = ?`);
        updateValues.push(
          key === 'preferences' ? JSON.stringify(updateData[key]) : updateData[key]
        );
      }
    });

    if (updateFields.length === 0) {
      throw new Error('沒有可更新的字段');
    }

    updateValues.push(id);

    try {
      await query(
        `UPDATE users SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        updateValues
      );

      logger.audit(id, 'USER_UPDATED', { 
        fields: Object.keys(updateData)
      });

      return await this.findById(id);
    } catch (error) {
      logger.error('更新用戶失敗', { 
        id, updateData, error: error.message 
      });
      throw error;
    }
  }

  /**
   * 更新密碼
   * @param {number} id - 用戶ID
   * @param {string} newPassword - 新密碼
   * @returns {Promise<boolean>} 更新結果
   */
  static async updatePassword(id, newPassword) {
    try {
      const password_hash = await bcrypt.hash(newPassword, appConfig.security.bcryptRounds);
      
      await query(
        'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [password_hash, id]
      );

      logger.audit(id, 'PASSWORD_UPDATED', {});
      logger.security('PASSWORD_CHANGED', { userId: id }, 'medium');

      return true;
    } catch (error) {
      logger.error('更新密碼失敗', { id, error: error.message });
      throw error;
    }
  }

  /**
   * 驗證密碼
   * @param {string} password - 明文密碼
   * @param {string} hash - 密碼雜湊值
   * @returns {Promise<boolean>} 驗證結果
   */
  static async verifyPassword(password, hash) {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      logger.error('密碼驗證失敗', { error: error.message });
      return false;
    }
  }

  /**
   * 更新最後登入信息
   * @param {number} id - 用戶ID
   * @param {string} ip - IP地址
   * @returns {Promise<void>}
   */
  static async updateLastLogin(id, ip) {
    try {
      await query(
        `UPDATE users SET 
          last_login_at = CURRENT_TIMESTAMP,
          last_login_ip = ?,
          login_count = login_count + 1
        WHERE id = ?`,
        [ip, id]
      );

      logger.audit(id, 'USER_LOGIN', { ip });
    } catch (error) {
      logger.error('更新最後登入信息失敗', { 
        id, ip, error: error.message 
      });
    }
  }

  /**
   * 軟刪除用戶
   * @param {number} id - 用戶ID
   * @returns {Promise<boolean>} 刪除結果
   */
  static async softDelete(id) {
    try {
      await query(
        'UPDATE users SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [id]
      );

      logger.audit(id, 'USER_DELETED', {});
      return true;
    } catch (error) {
      logger.error('軟刪除用戶失敗', { id, error: error.message });
      throw error;
    }
  }

  /**
   * 獲取用戶列表（分頁）
   * @param {Object} options - 查詢選項
   * @returns {Promise<Object>} 用戶列表和總數
   */
  static async findAll(options = {}) {
    const {
      page = 1,
      limit = 20,
      role,
      department,
      search,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = options;

    const offset = (page - 1) * limit;
    const conditions = ['is_active = TRUE'];
    const params = [];

    // 構建查詢條件
    if (role) {
      conditions.push('role = ?');
      params.push(role);
    }

    if (department) {
      conditions.push('department = ?');
      params.push(department);
    }

    if (search) {
      conditions.push('(username LIKE ? OR email LIKE ? OR display_name LIKE ?)');
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const orderClause = `ORDER BY ${sortBy} ${sortOrder}`;

    try {
      // 獲取總數
      const { rows: countRows } = await query(
        `SELECT COUNT(*) as total FROM users ${whereClause}`,
        params
      );
      const total = countRows[0].total;

      // 獲取用戶列表
      const { rows } = await query(
        `SELECT 
          id, username, email, display_name, avatar_url, role,
          department, position, phone, is_active, email_verified,
          last_login_at, login_count, created_at, updated_at
        FROM users ${whereClause} ${orderClause} LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      return {
        users: rows.map(user => this.formatUser(user)),
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error('獲取用戶列表失敗', { options, error: error.message });
      throw error;
    }
  }

  /**
   * 檢查用戶名和郵箱是否已存在
   * @param {string} username - 用戶名
   * @param {string} email - 郵箱
   * @param {number} excludeId - 排除的用戶ID（用於更新時）
   * @returns {Promise<void>}
   */
  static async checkExisting(username, email, excludeId = null) {
    try {
      let usernameQuery = 'SELECT id FROM users WHERE username = ?';
      let emailQuery = 'SELECT id FROM users WHERE email = ?';
      const usernameParams = [username];
      const emailParams = [email];

      if (excludeId) {
        usernameQuery += ' AND id != ?';
        emailQuery += ' AND id != ?';
        usernameParams.push(excludeId);
        emailParams.push(excludeId);
      }

      const [usernameResult, emailResult] = await Promise.all([
        query(usernameQuery, usernameParams),
        query(emailQuery, emailParams)
      ]);

      if (usernameResult.rows.length > 0) {
        throw new Error('用戶名已存在');
      }

      if (emailResult.rows.length > 0) {
        throw new Error('郵箱已存在');
      }
    } catch (error) {
      logger.error('檢查用戶存在性失敗', { 
        username, email, error: error.message 
      });
      throw error;
    }
  }

  /**
   * 格式化用戶數據（移除敏感信息）
   * @param {Object} user - 原始用戶數據
   * @returns {Object} 格式化後的用戶數據
   */
  static formatUser(user) {
    if (!user) return null;

    const {
      password_hash,
      ...safeUser
    } = user;

    // 解析JSON字段
    if (safeUser.preferences && typeof safeUser.preferences === 'string') {
      try {
        safeUser.preferences = JSON.parse(safeUser.preferences);
      } catch (e) {
        safeUser.preferences = null;
      }
    }

    return safeUser;
  }

  /**
   * 統計用戶數據
   * @returns {Promise<Object>} 統計信息
   */
  static async getStats() {
    try {
      const { rows } = await query(`
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active_users,
          COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_users,
          COUNT(CASE WHEN role = 'super_admin' THEN 1 END) as super_admin_users,
          COUNT(CASE WHEN email_verified = TRUE THEN 1 END) as verified_users,
          COUNT(CASE WHEN last_login_at > DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as active_30_days
        FROM users
      `);

      return rows[0];
    } catch (error) {
      logger.error('獲取用戶統計失敗', { error: error.message });
      throw error;
    }
  }
}

export default UserModel; 