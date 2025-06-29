/**
 * 訊息資料模型
 * 處理對話訊息相關的資料庫操作
 */

import { query, transaction } from "../config/database.config.js";
import logger from "../utils/logger.util.js";

export class MessageModel {
  /**
   * 創建新訊息
   * @param {Object} messageData - 訊息數據
   * @returns {Promise<Object>} 創建的訊息信息
   */
  /**
   * 處理內容（由於現在使用LONGTEXT，不再需要截斷）
   * @param {string} content - 原始內容
   * @returns {Object} 處理後的內容和元數據
   */
  static processLongContent(content) {
    // 🎯 資料庫已改為LONGTEXT，不再需要長度限制
    return {
      processedContent: content,
      isTruncated: false,
      originalLength: content ? content.length : 0
    };
  }

  static async create(messageData) {
    const {
      conversation_id,
      role,
      content,
      content_type = "text",
      attachments = null,
      metadata = null,
      tokens_used = 0,
      cost = 0,
      model_info = null,
      processing_time = 0,
      parent_message_id = null,
      agent_id = null,
      agent_name = null,
    } = messageData;

    // 🎯 使用LONGTEXT後不再需要內容處理
    const processedContent = content;
    const processedMetadata = metadata || {};

    try {
      return await transaction(async (connection) => {
        // 插入訊息
        const [messageResult] = await connection.execute(
          `INSERT INTO messages (
            conversation_id, role, content, content_type, attachments,
            metadata, tokens_used, cost, model_info, processing_time, parent_message_id,
            agent_id, agent_name
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            conversation_id,
            role,
            processedContent, // 🔧 使用處理過的內容
            content_type,
            attachments ? JSON.stringify(attachments) : null,
            processedMetadata ? JSON.stringify(processedMetadata) : null, // 🔧 使用處理過的metadata
            tokens_used,
            cost,
            model_info ? JSON.stringify(model_info) : null,
            processing_time,
            parent_message_id,
            agent_id,
            agent_name,
          ]
        );

        // 更新對話統計
        await connection.execute(
          `UPDATE conversations SET 
            message_count = message_count + 1,
            total_tokens = total_tokens + ?,
            total_cost = total_cost + ?,
            last_message_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?`,
          [tokens_used, cost, conversation_id]
        );

        logger.debug("訊息插入成功", {
          insertId: messageResult.insertId,
          affectedRows: messageResult.affectedRows,
          conversation_id,
          role,
        });

        // 在事務內部直接查詢剛插入的數據
        const [newMessageRows] = await connection.execute(
          `SELECT * FROM messages WHERE id = ? AND is_deleted = FALSE`,
          [messageResult.insertId]
        );

        if (newMessageRows.length === 0) {
          logger.error("插入後查詢訊息失敗", {
            insertId: messageResult.insertId,
            conversation_id,
          });
          throw new Error(
            `無法獲取剛創建的訊息，ID: ${messageResult.insertId}`
          );
        }

        return this.formatMessage(newMessageRows[0]);
      });
    } catch (error) {
      logger.error("創建訊息失敗", {
        conversation_id,
        role,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 根據ID獲取訊息
   * @param {number} id - 訊息ID
   * @returns {Promise<Object|null>} 訊息信息
   */
  static async findById(id) {
    try {
      //logger.debug("查詢訊息", { id });

      const { rows } = await query(
        `SELECT * FROM messages WHERE id = ? AND is_deleted = FALSE`,
        [id]
      );

      // logger.debug("訊息查詢結果", {
      //   id,
      //   found: rows.length > 0,
      //   rowCount: rows.length,
      // });

      return rows.length > 0 ? this.formatMessage(rows[0]) : null;
    } catch (error) {
      logger.error("根據ID查詢訊息失敗", {
        id,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * 獲取對話的訊息列表
   * @param {number} conversationId - 對話ID
   * @param {Object} options - 查詢選項
   * @returns {Promise<Object>} 訊息列表和總數
   */
  static async findByConversation(conversationId, options = {}) {
    const {
      page = 1,
      limit = 50,
      role,
      content_type,
      sortBy = "created_at",
      sortOrder = "ASC",
      after_message_id,
      before_message_id,
    } = options;

    const offset = (page - 1) * limit;
    const conditions = ["conversation_id = ?", "is_deleted = FALSE"];
    const params = [conversationId];

    // 構建查詢條件
    if (role) {
      conditions.push("role = ?");
      params.push(role);
    }

    if (content_type) {
      conditions.push("content_type = ?");
      params.push(content_type);
    }

    if (after_message_id) {
      conditions.push("id > ?");
      params.push(after_message_id);
    }

    if (before_message_id) {
      conditions.push("id < ?");
      params.push(before_message_id);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const orderClause = `ORDER BY ${sortBy} ${sortOrder}`;

    try {
      // 獲取總數
      const { rows: countRows } = await query(
        `SELECT COUNT(*) as total 
        FROM messages m
        LEFT JOIN conversations c ON m.conversation_id = c.id
        ${whereClause.replace("conversation_id", "m.conversation_id").replace("is_deleted", "m.is_deleted")}`,
        params
      );
      const total = countRows[0].total;

      // 獲取訊息列表，包含 agent 信息
      const { rows } = await query(
        `SELECT 
          m.*,
          c.agent_id,
          a.display_name as agent_name
        FROM messages m
        LEFT JOIN conversations c ON m.conversation_id = c.id
        LEFT JOIN agents a ON c.agent_id = a.id
        ${whereClause.replace("conversation_id", "m.conversation_id").replace("is_deleted", "m.is_deleted")} 
        ${orderClause.replace("created_at", "m.created_at")} 
        LIMIT ${limit} OFFSET ${offset}`,
        params
      );

      return {
        messages: rows.map((msg) => this.formatMessage(msg)),
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error("獲取對話訊息列表失敗", {
        conversationId,
        options,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 更新訊息
   * @param {number} id - 訊息ID
   * @param {Object} updateData - 更新數據
   * @returns {Promise<Object>} 更新後的訊息信息
   */
  static async update(id, updateData) {
    const allowedFields = [
      "content",
      "attachments",
      "metadata",
      "is_edited",
      "tokens_used",
      "cost",
      "processing_time",
      "model_info",
      "agent_id",
      "agent_name",
    ];

    const updateFields = [];
    const updateValues = [];

    // 🎯 使用LONGTEXT後不再需要內容長度檢查
    let processedUpdateData = { ...updateData };

    // 過濾允許更新的字段
    Object.keys(processedUpdateData).forEach((key) => {
      if (allowedFields.includes(key) && processedUpdateData[key] !== undefined) {
        updateFields.push(`${key} = ?`);
        if (
          ["attachments", "metadata", "model_info"].includes(key) &&
          processedUpdateData[key]
        ) {
          updateValues.push(JSON.stringify(processedUpdateData[key]));
        } else {
          updateValues.push(processedUpdateData[key]);
        }
      }
    });

    if (updateFields.length === 0) {
      throw new Error("沒有可更新的字段");
    }

    // 如果更新內容，標記為已編輯
    if (processedUpdateData.content) {
      updateFields.push("is_edited = TRUE");
    }

    updateFields.push("updated_at = CURRENT_TIMESTAMP");
    updateValues.push(id);

    try {
      await query(
        `UPDATE messages SET ${updateFields.join(", ")} WHERE id = ?`,
        updateValues
      );

      return await this.findById(id);
    } catch (error) {
      logger.error("更新訊息失敗", {
        id,
        updateData,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 獲取訊息的完整內容（如果被截斷了）
   * @param {number} id - 訊息ID
   * @returns {Promise<Object|null>} 完整內容或null
   */
  static async getFullContent(id) {
    try {
      const message = await this.findById(id);
      if (!message) {
        return null;
      }

      // 檢查是否有被截斷的內容
      if (message.metadata && message.metadata.contentTruncated) {
        return {
          id: message.id,
          fullContent: message.metadata.contentTruncated.fullContent,
          originalLength: message.metadata.contentTruncated.originalLength,
          truncatedAt: message.metadata.contentTruncated.truncatedAt,
          displayedContent: message.content
        };
      }

      // 內容沒有被截斷，返回原始內容
      return {
        id: message.id,
        fullContent: message.content,
        originalLength: message.content.length,
        isTruncated: false
      };
    } catch (error) {
      logger.error("獲取完整內容失敗", {
        id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 軟刪除訊息
   * @param {number} id - 訊息ID
   * @returns {Promise<boolean>} 刪除結果
   */
  static async softDelete(id) {
    try {
      return await transaction(async (connection) => {
        // 獲取訊息信息
        const [messageRows] = await connection.execute(
          "SELECT conversation_id, tokens_used, cost FROM messages WHERE id = ?",
          [id]
        );

        if (messageRows.length === 0) {
          throw new Error("訊息不存在");
        }

        const message = messageRows[0];

        // 軟刪除訊息
        await connection.execute(
          "UPDATE messages SET is_deleted = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
          [id]
        );

        // 更新對話統計
        await connection.execute(
          `UPDATE conversations SET 
            message_count = message_count - 1,
            total_tokens = total_tokens - ?,
            total_cost = total_cost - ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?`,
          [message.tokens_used, message.cost, message.conversation_id]
        );

        return true;
      });
    } catch (error) {
      logger.error("軟刪除訊息失敗", { id, error: error.message });
      throw error;
    }
  }

  /**
   * 獲取對話的最新訊息
   * @param {number} conversationId - 對話ID
   * @param {number} limit - 數量限制
   * @returns {Promise<Array>} 最新訊息列表
   */
  static async getLatestMessages(conversationId, limit = 10) {
    try {
      const { rows } = await query(
        `SELECT * FROM messages 
        WHERE conversation_id = ? AND is_deleted = FALSE 
        ORDER BY created_at DESC 
        LIMIT ?`,
        [conversationId, limit]
      );

      return rows.map((msg) => this.formatMessage(msg)).reverse();
    } catch (error) {
      logger.error("獲取最新訊息失敗", {
        conversationId,
        limit,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 搜索訊息
   * @param {Object} searchOptions - 搜索選項
   * @returns {Promise<Object>} 搜索結果
   */
  static async search(searchOptions) {
    const {
      query: searchQuery,
      user_id,
      conversation_id,
      role,
      content_type,
      start_date,
      end_date,
      page = 1,
      limit = 20,
    } = searchOptions;

    const offset = (page - 1) * limit;
    const conditions = ["m.is_deleted = FALSE"];
    const params = [];

    // 構建搜索條件
    if (searchQuery) {
      conditions.push("m.content LIKE ?");
      params.push(`%${searchQuery}%`);
    }

    if (user_id) {
      conditions.push("c.user_id = ?");
      params.push(user_id);
    }

    if (conversation_id) {
      conditions.push("m.conversation_id = ?");
      params.push(conversation_id);
    }

    if (role) {
      conditions.push("m.role = ?");
      params.push(role);
    }

    if (content_type) {
      conditions.push("m.content_type = ?");
      params.push(content_type);
    }

    if (start_date) {
      conditions.push("m.created_at >= ?");
      params.push(start_date);
    }

    if (end_date) {
      conditions.push("m.created_at <= ?");
      params.push(end_date);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    try {
      // 獲取總數
      const { rows: countRows } = await query(
        `SELECT COUNT(*) as total 
        FROM messages m 
        LEFT JOIN conversations c ON m.conversation_id = c.id 
        ${whereClause}`,
        params
      );
      const total = countRows[0].total;

      // 獲取搜索結果
      const { rows } = await query(
        `SELECT 
          m.*,
          c.title as conversation_title,
          c.user_id
        FROM messages m 
        LEFT JOIN conversations c ON m.conversation_id = c.id 
        ${whereClause}
        ORDER BY m.created_at DESC
        LIMIT ${limit} OFFSET ${offset}`,
        params
      );

      return {
        messages: rows.map((msg) => this.formatMessage(msg)),
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error("搜索訊息失敗", {
        searchOptions,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 獲取訊息統計信息
   * @param {number} userId - 用戶ID（可選）
   * @param {number} conversationId - 對話ID（可選）
   * @returns {Promise<Object>} 統計信息
   */
  static async getStats(userId = null, conversationId = null) {
    try {
      let query_sql = `
        SELECT 
          COUNT(*) as total_messages,
          COUNT(CASE WHEN m.role = 'user' THEN 1 END) as user_messages,
          COUNT(CASE WHEN m.role = 'assistant' THEN 1 END) as assistant_messages,
          COUNT(CASE WHEN m.role = 'system' THEN 1 END) as system_messages,
          COUNT(CASE WHEN m.content_type = 'text' THEN 1 END) as text_messages,
          COUNT(CASE WHEN m.content_type = 'image' THEN 1 END) as image_messages,
          COUNT(CASE WHEN m.content_type = 'file' THEN 1 END) as file_messages,
          AVG(m.tokens_used) as avg_tokens_per_message,
          SUM(m.tokens_used) as total_tokens,
          SUM(m.cost) as total_cost,
          AVG(m.processing_time) as avg_processing_time
        FROM messages m
      `;

      const params = [];
      const conditions = ["m.is_deleted = FALSE"];

      if (userId) {
        query_sql += " LEFT JOIN conversations c ON m.conversation_id = c.id";
        conditions.push("c.user_id = ?");
        params.push(userId);
      }

      if (conversationId) {
        conditions.push("m.conversation_id = ?");
        params.push(conversationId);
      }

      if (conditions.length > 0) {
        query_sql += ` WHERE ${conditions.join(" AND ")}`;
      }

      const { rows } = await query(query_sql, params);
      return rows[0];
    } catch (error) {
      logger.error("獲取訊息統計失敗", {
        userId,
        conversationId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 獲取對話上下文訊息
   * @param {number} conversationId - 對話ID
   * @param {number} maxMessages - 最大訊息數
   * @param {number} maxTokens - 最大token數
   * @returns {Promise<Array>} 上下文訊息列表
   */
  static async getContextMessages(
    conversationId,
    maxMessages = 20,
    maxTokens = 4000
  ) {
    try {
      const { rows } = await query(
        `SELECT * FROM messages 
        WHERE conversation_id = ? AND is_deleted = FALSE 
        ORDER BY created_at DESC 
        LIMIT ${maxMessages}`,
        [conversationId]
      );

      const messages = rows.map((msg) => this.formatMessage(msg)).reverse();

      // 計算token數並截取適當的上下文
      let totalTokens = 0;
      const contextMessages = [];

      for (let i = messages.length - 1; i >= 0; i--) {
        const message = messages[i];
        if (totalTokens + message.tokens_used <= maxTokens) {
          contextMessages.unshift(message);
          totalTokens += message.tokens_used;
        } else {
          break;
        }
      }

      return contextMessages;
    } catch (error) {
      logger.error("獲取對話上下文失敗", {
        conversationId,
        maxMessages,
        maxTokens,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 格式化訊息數據
   * @param {Object} message - 原始訊息數據
   * @returns {Object} 格式化後的訊息數據
   */
  static formatMessage(message) {
    if (!message) return null;

    // 解析JSON字段
    ["attachments", "metadata", "model_info"].forEach((field) => {
      if (message[field] && typeof message[field] === "string") {
        try {
          message[field] = JSON.parse(message[field]);
        } catch (e) {
          message[field] = null;
        }
      }
    });

    return message;
  }
}

export default MessageModel;
