/**
 * 對話資料模型
 * 處理對話相關的資料庫操作
 */

import { query, transaction } from "../config/database.config.js";
import logger from "../utils/logger.util.js";

export class ConversationModel {
  /**
   * 創建新對話
   * @param {Object} conversationData - 對話數據
   * @returns {Promise<Object>} 創建的對話信息
   */
  static async create(conversationData) {
    const {
      user_id,
      agent_id,
      model_id,
      title = null, // 不設置默認標題，等第一條消息後自動生成
      context = null,
    } = conversationData;

    try {
      const { rows } = await query(
        `INSERT INTO conversations (
          user_id, agent_id, model_id, title, context
        ) VALUES (?, ?, ?, ?, ?)`,
        [
          user_id,
          agent_id,
          model_id,
          title,
          context ? JSON.stringify(context) : null,
        ]
      );

      logger.audit(user_id, "CONVERSATION_CREATED", {
        conversation_id: rows.insertId,
        agent_id,
        model_id,
      });

      return await this.findById(rows.insertId);
    } catch (error) {
      logger.error("創建對話失敗", {
        user_id,
        agent_id,
        model_id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 根據ID獲取對話
   * @param {number} id - 對話ID
   * @returns {Promise<Object|null>} 對話信息
   */
  static async findById(id) {
    try {
      const { rows } = await query(
        `SELECT 
          c.*,
          u.username,
          u.display_name as user_display_name,
          a.name as agent_name,
          a.display_name as agent_display_name,
          m.name as model_name,
          m.display_name as model_display_name
        FROM conversations c
        LEFT JOIN users u ON c.user_id = u.id
        LEFT JOIN agents a ON c.agent_id = a.id
        LEFT JOIN ai_models m ON c.model_id = m.id
        WHERE c.id = ? AND c.status != 'deleted'`,
        [id]
      );

      return rows.length > 0 ? this.formatConversation(rows[0]) : null;
    } catch (error) {
      logger.error("根據ID查詢對話失敗", { id, error: error.message });
      throw error;
    }
  }

  /**
   * 獲取用戶的對話列表
   * @param {number} userId - 用戶ID
   * @param {Object} options - 查詢選項
   * @returns {Promise<Object>} 對話列表和總數
   */
  static async findByUser(userId, options = {}) {
    const {
      page = 1,
      limit = 20,
      status = "active",
      search,
      agent_id,
      sortBy = "last_message_at",
      sortOrder = "DESC",
    } = options;

    const offset = (page - 1) * limit;
    const conditions = ["c.user_id = ?", "c.status != ?"];
    const params = [userId, "deleted"];

    // 構建查詢條件
    if (status && status !== "all") {
      conditions.push("c.status = ?");
      params.push(status);
    }

    if (agent_id) {
      conditions.push("c.agent_id = ?");
      params.push(agent_id);
    }

    if (search) {
      conditions.push("(c.title LIKE ? OR c.summary LIKE ?)");
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const orderClause = `ORDER BY c.${sortBy} ${sortOrder}`;

    try {
      // 獲取總數
      const { rows: countRows } = await query(
        `SELECT COUNT(*) as total FROM conversations c ${whereClause}`,
        params
      );
      const total = countRows[0].total;

      // 獲取對話列表
      const { rows } = await query(
        `SELECT 
          c.*,
          a.name as agent_name,
          a.display_name as agent_display_name,
          a.avatar as agent_avatar_url,
          m.name as model_name,
          m.display_name as model_display_name
        FROM conversations c
        LEFT JOIN agents a ON c.agent_id = a.id
        LEFT JOIN ai_models m ON c.model_id = m.id
        ${whereClause} ${orderClause}
        LIMIT ${limit} OFFSET ${offset}`,
        params
      );

      return {
        conversations: rows.map((conv) => this.formatConversation(conv)),
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error("獲取用戶對話列表失敗", {
        userId,
        options,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 更新對話信息
   * @param {number} id - 對話ID
   * @param {Object} updateData - 更新數據
   * @returns {Promise<Object>} 更新後的對話信息
   */
  static async update(id, updateData) {
    const allowedFields = [
      "title",
      "summary",
      "context",
      "status",
      "is_pinned",
    ];

    const updateFields = [];
    const updateValues = [];

    // 過濾允許更新的字段
    Object.keys(updateData).forEach((key) => {
      if (allowedFields.includes(key) && updateData[key] !== undefined) {
        updateFields.push(`${key} = ?`);
        if (key === "context" && updateData[key]) {
          updateValues.push(JSON.stringify(updateData[key]));
        } else {
          updateValues.push(updateData[key]);
        }
      }
    });

    if (updateFields.length === 0) {
      throw new Error("沒有可更新的字段");
    }

    updateValues.push(id);

    try {
      await query(
        `UPDATE conversations SET ${updateFields.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        updateValues
      );

      return await this.findById(id);
    } catch (error) {
      logger.error("更新對話失敗", {
        id,
        updateData,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 軟刪除對話
   * @param {number} id - 對話ID
   * @param {number} userId - 用戶ID（用於權限檢查）
   * @returns {Promise<boolean>} 刪除結果
   */
  static async softDelete(id, userId) {
    try {
      const { rows } = await query(
        "UPDATE conversations SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?",
        ["deleted", id, userId]
      );

      if (rows.affectedRows === 0) {
        throw new Error("對話不存在或無權限刪除");
      }

      logger.audit(userId, "CONVERSATION_DELETED", { conversation_id: id });
      return true;
    } catch (error) {
      logger.error("軟刪除對話失敗", {
        id,
        userId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 更新對話統計信息
   * @param {number} id - 對話ID
   * @param {Object} stats - 統計數據
   * @returns {Promise<void>}
   */
  static async updateStats(id, stats) {
    const { message_count_delta = 0, tokens_delta = 0, cost_delta = 0 } = stats;

    try {
      await query(
        `UPDATE conversations SET 
          message_count = message_count + ?,
          total_tokens = total_tokens + ?,
          total_cost = total_cost + ?,
          last_message_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
        [message_count_delta, tokens_delta, cost_delta, id]
      );
    } catch (error) {
      logger.error("更新對話統計失敗", {
        id,
        stats,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 歸檔對話
   * @param {number} id - 對話ID
   * @param {number} userId - 用戶ID
   * @returns {Promise<boolean>} 歸檔結果
   */
  static async archive(id, userId) {
    try {
      const { rows } = await query(
        "UPDATE conversations SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?",
        ["archived", id, userId]
      );

      if (rows.affectedRows === 0) {
        throw new Error("對話不存在或無權限歸檔");
      }

      logger.audit(userId, "CONVERSATION_ARCHIVED", { conversation_id: id });
      return true;
    } catch (error) {
      logger.error("歸檔對話失敗", {
        id,
        userId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 恢復歸檔的對話
   * @param {number} id - 對話ID
   * @param {number} userId - 用戶ID
   * @returns {Promise<boolean>} 恢復結果
   */
  static async restore(id, userId) {
    try {
      const { rows } = await query(
        "UPDATE conversations SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?",
        ["active", id, userId]
      );

      if (rows.affectedRows === 0) {
        throw new Error("對話不存在或無權限恢復");
      }

      logger.audit(userId, "CONVERSATION_RESTORED", { conversation_id: id });
      return true;
    } catch (error) {
      logger.error("恢復對話失敗", {
        id,
        userId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 置頂/取消置頂對話
   * @param {number} id - 對話ID
   * @param {number} userId - 用戶ID
   * @param {boolean} pinned - 是否置頂
   * @returns {Promise<boolean>} 操作結果
   */
  static async togglePin(id, userId, pinned) {
    try {
      const { rows } = await query(
        "UPDATE conversations SET is_pinned = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?",
        [pinned, id, userId]
      );

      if (rows.affectedRows === 0) {
        throw new Error("對話不存在或無權限操作");
      }

      logger.audit(
        userId,
        pinned ? "CONVERSATION_PINNED" : "CONVERSATION_UNPINNED",
        {
          conversation_id: id,
        }
      );
      return true;
    } catch (error) {
      logger.error("切換對話置頂狀態失敗", {
        id,
        userId,
        pinned,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 獲取對話統計信息
   * @param {number} userId - 用戶ID（可選）
   * @returns {Promise<Object>} 統計信息
   */
  static async getStats(userId = null) {
    try {
      let query_sql = `
        SELECT 
          COUNT(*) as total_conversations,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_conversations,
          COUNT(CASE WHEN status = 'archived' THEN 1 END) as archived_conversations,
          COUNT(CASE WHEN is_pinned = TRUE THEN 1 END) as pinned_conversations,
          AVG(message_count) as avg_message_count,
          SUM(total_tokens) as total_tokens_used,
          SUM(total_cost) as total_cost
        FROM conversations
      `;

      const params = [];

      if (userId) {
        query_sql += " WHERE user_id = ? AND status != ?";
        params.push(userId, "deleted");
      } else {
        query_sql += " WHERE status != ?";
        params.push("deleted");
      }

      const { rows } = await query(query_sql, params);
      return rows[0];
    } catch (error) {
      logger.error("獲取對話統計失敗", { userId, error: error.message });
      throw error;
    }
  }

  /**
   * 格式化對話數據
   * @param {Object} conversation - 原始對話數據
   * @returns {Object} 格式化後的對話數據
   */
  static formatConversation(conversation) {
    if (!conversation) return null;

    // 解析JSON字段
    if (conversation.context && typeof conversation.context === "string") {
      try {
        conversation.context = JSON.parse(conversation.context);
      } catch (e) {
        conversation.context = null;
      }
    }

    return conversation;
  }
}

export default ConversationModel;
