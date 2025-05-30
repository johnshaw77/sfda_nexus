/**
 * JWT Token 工具
 * 處理JWT的生成、驗證、刷新等操作
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { appConfig } from '../config/app.config.js';
import { query } from '../config/database.config.js';
import logger from './logger.util.js';

export class JWTUtil {
  /**
   * 生成訪問令牌
   * @param {Object} user - 用戶信息
   * @param {Object} options - 額外選項
   * @returns {string} JWT Token
   */
  static generateAccessToken(user, options = {}) {
    const payload = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      type: 'access',
      iat: Math.floor(Date.now() / 1000)
    };

    const tokenOptions = {
      expiresIn: options.expiresIn || appConfig.security.jwtExpiresIn,
      issuer: 'sfda-nexus',
      audience: 'sfda-nexus-users'
    };

    return jwt.sign(payload, appConfig.security.jwtSecret, tokenOptions);
  }

  /**
   * 生成刷新令牌
   * @param {Object} user - 用戶信息
   * @returns {string} 刷新令牌
   */
  static generateRefreshToken(user) {
    const payload = {
      id: user.id,
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000)
    };

    return jwt.sign(payload, appConfig.security.jwtSecret, {
      expiresIn: '30d',
      issuer: 'sfda-nexus',
      audience: 'sfda-nexus-users'
    });
  }

  /**
   * 驗證並解析JWT Token
   * @param {string} token - JWT Token
   * @param {Object} options - 驗證選項
   * @returns {Promise<Object>} 解析後的用戶信息
   */
  static async verifyToken(token, options = {}) {
    try {
      if (!token) {
        throw new Error('Token不能為空');
      }

      // 移除Bearer前綴
      if (token.startsWith('Bearer ')) {
        token = token.slice(7);
      }

      const decoded = jwt.verify(token, appConfig.security.jwtSecret, {
        issuer: 'sfda-nexus',
        audience: 'sfda-nexus-users'
      });

      // 檢查token類型
      if (options.type && decoded.type !== options.type) {
        throw new Error(`期望的token類型: ${options.type}, 實際: ${decoded.type}`);
      }

      // 檢查是否在黑名單中
      if (decoded.type === 'access') {
        const isBlacklisted = await this.isTokenBlacklisted(token);
        if (isBlacklisted) {
          throw new Error('Token已被列入黑名單');
        }
      }

      return decoded;
    } catch (error) {
      logger.error('JWT驗證失敗', { 
        error: error.message,
        tokenPreview: token ? token.substring(0, 20) + '...' : null
      });
      throw error;
    }
  }

  /**
   * 刷新訪問令牌
   * @param {string} refreshToken - 刷新令牌
   * @returns {Promise<Object>} 新的令牌對
   */
  static async refreshAccessToken(refreshToken) {
    try {
      // 驗證刷新令牌
      const decoded = await this.verifyToken(refreshToken, { type: 'refresh' });
      
      // 獲取用戶信息
      const { rows } = await query(
        'SELECT id, username, email, role FROM users WHERE id = ? AND is_active = TRUE',
        [decoded.id]
      );

      if (rows.length === 0) {
        throw new Error('用戶不存在或已被禁用');
      }

      const user = rows[0];

      // 生成新的訪問令牌
      const newAccessToken = this.generateAccessToken(user);
      
      // 可選：生成新的刷新令牌
      const newRefreshToken = this.generateRefreshToken(user);

      logger.info('Token刷新成功', { userId: user.id });

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        user: user
      };
    } catch (error) {
      logger.error('Token刷新失敗', { error: error.message });
      throw error;
    }
  }

  /**
   * 將Token加入黑名單
   * @param {string} token - 要加入黑名單的token
   * @param {number} userId - 用戶ID
   * @param {string} reason - 加入原因
   * @returns {Promise<void>}
   */
  static async blacklistToken(token, userId, reason = 'logout') {
    try {
      const tokenHash = this.hashToken(token);
      const decoded = jwt.decode(token);
      
      if (!decoded) {
        throw new Error('無效的token格式');
      }

      const expiresAt = new Date(decoded.exp * 1000);

      await query(
        'INSERT INTO user_sessions (user_id, token_hash, expires_at, is_active) VALUES (?, ?, ?, FALSE)',
        [userId, tokenHash, expiresAt]
      );

      logger.audit(userId, 'TOKEN_BLACKLISTED', { reason });
    } catch (error) {
      logger.error('Token加入黑名單失敗', { 
        userId, reason, error: error.message 
      });
      throw error;
    }
  }

  /**
   * 檢查Token是否在黑名單中
   * @param {string} token - 要檢查的token
   * @returns {Promise<boolean>} 是否在黑名單中
   */
  static async isTokenBlacklisted(token) {
    try {
      const tokenHash = this.hashToken(token);
      
      const { rows } = await query(
        'SELECT id FROM user_sessions WHERE token_hash = ? AND is_active = FALSE',
        [tokenHash]
      );

      return rows.length > 0;
    } catch (error) {
      logger.error('檢查Token黑名單失敗', { error: error.message });
      return false; // 發生錯誤時默認不在黑名單中
    }
  }

  /**
   * 記錄用戶會話
   * @param {number} userId - 用戶ID
   * @param {string} token - 訪問令牌
   * @param {Object} sessionInfo - 會話信息
   * @returns {Promise<number>} 會話ID
   */
  static async recordSession(userId, token, sessionInfo = {}) {
    try {
      const tokenHash = this.hashToken(token);
      const decoded = jwt.decode(token);
      const expiresAt = new Date(decoded.exp * 1000);
      
      const { rows } = await query(
        `INSERT INTO user_sessions (
          user_id, token_hash, device_info, ip_address, 
          user_agent, expires_at, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
        [
          userId,
          tokenHash,
          sessionInfo.deviceInfo || null,
          sessionInfo.ipAddress || null,
          sessionInfo.userAgent || null,
          expiresAt
        ]
      );

      return rows.insertId;
    } catch (error) {
      logger.error('記錄用戶會話失敗', { 
        userId, error: error.message 
      });
      throw error;
    }
  }

  /**
   * 註銷用戶會話
   * @param {number} userId - 用戶ID
   * @param {string} token - 訪問令牌（可選）
   * @returns {Promise<void>}
   */
  static async revokeSession(userId, token = null) {
    try {
      if (token) {
        // 註銷特定會話
        const tokenHash = this.hashToken(token);
        await query(
          'UPDATE user_sessions SET is_active = FALSE WHERE user_id = ? AND token_hash = ?',
          [userId, tokenHash]
        );
      } else {
        // 註銷用戶的所有會話
        await query(
          'UPDATE user_sessions SET is_active = FALSE WHERE user_id = ?',
          [userId]
        );
      }

      logger.audit(userId, 'SESSION_REVOKED', { 
        all_sessions: !token 
      });
    } catch (error) {
      logger.error('註銷用戶會話失敗', { 
        userId, error: error.message 
      });
      throw error;
    }
  }

  /**
   * 獲取用戶活躍會話
   * @param {number} userId - 用戶ID
   * @returns {Promise<Array>} 活躍會話列表
   */
  static async getUserActiveSessions(userId) {
    try {
      const { rows } = await query(
        `SELECT 
          id, device_info, ip_address, user_agent, 
          created_at, expires_at
        FROM user_sessions 
        WHERE user_id = ? AND is_active = TRUE AND expires_at > NOW()
        ORDER BY created_at DESC`,
        [userId]
      );

      return rows;
    } catch (error) {
      logger.error('獲取用戶活躍會話失敗', { 
        userId, error: error.message 
      });
      throw error;
    }
  }

  /**
   * 清理過期會話
   * @returns {Promise<number>} 清理的會話數量
   */
  static async cleanupExpiredSessions() {
    try {
      const { rows } = await query(
        'DELETE FROM user_sessions WHERE expires_at < NOW()'
      );

      const deletedCount = rows.affectedRows || 0;
      logger.info('清理過期會話完成', { deletedCount });
      
      return deletedCount;
    } catch (error) {
      logger.error('清理過期會話失敗', { error: error.message });
      throw error;
    }
  }

  /**
   * 生成Token雜湊值
   * @param {string} token - 原始token
   * @returns {string} 雜湊值
   */
  static hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * 解析Authorization標頭
   * @param {string} authHeader - Authorization標頭值
   * @returns {string|null} 提取的token
   */
  static extractTokenFromHeader(authHeader) {
    if (!authHeader) return null;
    
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }
    
    return parts[1];
  }

  /**
   * 驗證Token強度
   * @param {string} token - JWT Token
   * @returns {Object} 驗證結果
   */
  static validateTokenStrength(token) {
    try {
      const decoded = jwt.decode(token, { complete: true });
      
      if (!decoded) {
        return { valid: false, message: '無效的token格式' };
      }

      const { header, payload } = decoded;
      
      // 檢查演算法
      if (header.alg !== 'HS256') {
        return { valid: false, message: '不支持的簽名演算法' };
      }

      // 檢查必要字段
      const requiredFields = ['id', 'username', 'role', 'iat', 'exp'];
      const missingFields = requiredFields.filter(field => !payload[field]);
      
      if (missingFields.length > 0) {
        return { 
          valid: false, 
          message: `缺少必要字段: ${missingFields.join(', ')}` 
        };
      }

      // 檢查過期時間
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp <= now) {
        return { valid: false, message: 'Token已過期' };
      }

      return { valid: true, message: 'Token格式正確' };
    } catch (error) {
      return { valid: false, message: `Token驗證錯誤: ${error.message}` };
    }
  }
}

export default JWTUtil; 