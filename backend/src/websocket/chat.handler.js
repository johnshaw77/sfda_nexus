/**
 * WebSocket 聊天處理器
 * 處理實時聊天相關的WebSocket事件
 */

import ConversationModel from "../models/Conversation.model.js";
import MessageModel from "../models/Message.model.js";
import AIService from "../services/ai.service.js";
import { query } from "../config/database.config.js";
import logger from "../utils/logger.util.js";
import jwt from "jsonwebtoken";

/**
 * 驗證WebSocket JWT Token
 * @param {string} token - JWT Token
 * @returns {Object|null} 用戶信息或null
 */
export const verifyWebSocketToken = async (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 檢查token是否在黑名單中
    const { rows: blacklistRows } = await query(
      "SELECT * FROM token_blacklist WHERE token = ?",
      [token]
    );

    if (blacklistRows.length > 0) {
      return null;
    }

    // 獲取用戶信息
    const { rows: userRows } = await query(
      "SELECT id, username, email, role, is_active FROM users WHERE id = ?",
      [decoded.id]
    );

    if (userRows.length === 0 || !userRows[0].is_active) {
      return null;
    }

    return userRows[0];
  } catch (error) {
    logger.error("WebSocket token驗證失敗", { error: error.message });
    return null;
  }
};

/**
 * 處理實時聊天消息
 * @param {string} clientId - 客戶端ID
 * @param {Object} data - 消息數據
 * @param {Map} clients - 客戶端連接映射
 * @param {Function} sendToClient - 發送消息到客戶端的函數
 * @param {Function} broadcastToRoom - 廣播消息到房間的函數
 */
export const handleRealtimeChat = async (
  clientId,
  data,
  clients,
  sendToClient,
  broadcastToRoom
) => {
  const client = clients.get(clientId);
  if (!client || !client.userId) {
    sendToClient(clientId, {
      type: "error",
      data: { message: "未認證的連接", code: "UNAUTHORIZED" },
    });
    return;
  }

  try {
    const {
      conversationId,
      content,
      contentType = "text",
      attachments,
      metadata,
    } = data;

    // 驗證對話權限
    const conversation = await ConversationModel.findById(conversationId);
    if (!conversation) {
      sendToClient(clientId, {
        type: "error",
        data: { message: "對話不存在", code: "CONVERSATION_NOT_FOUND" },
      });
      return;
    }

    if (conversation.user_id !== client.userId) {
      sendToClient(clientId, {
        type: "error",
        data: { message: "無權訪問此對話", code: "ACCESS_DENIED" },
      });
      return;
    }

    // 創建用戶消息
    const userMessage = await MessageModel.create({
      conversation_id: conversationId,
      role: "user",
      content: content,
      content_type: contentType,
      attachments: attachments || null,
      metadata: metadata || null,
    });

    // 發送用戶消息確認
    sendToClient(clientId, {
      type: "message_sent",
      data: {
        message: userMessage,
        conversationId: conversationId,
      },
    });

    // 廣播用戶消息到房間（如果是群組對話）
    broadcastToRoom(
      `conversation_${conversationId}`,
      {
        type: "new_message",
        data: {
          message: userMessage,
          conversationId: conversationId,
        },
      },
      clientId
    );

    // 獲取AI模型信息
    const { rows: modelRows } = await query(
      "SELECT * FROM ai_models WHERE id = ?",
      [conversation.model_id]
    );

    if (modelRows.length === 0) {
      sendToClient(clientId, {
        type: "error",
        data: { message: "對話關聯的AI模型不存在", code: "MODEL_NOT_FOUND" },
      });
      return;
    }

    const model = modelRows[0];

    // 發送AI正在輸入的狀態
    sendToClient(clientId, {
      type: "ai_typing",
      data: {
        conversationId: conversationId,
        isTyping: true,
      },
    });

    // 獲取對話上下文
    const contextMessages = await MessageModel.getContextMessages(
      conversationId,
      20,
      4096 * 0.7
    );

    // 準備AI調用參數
    const aiOptions = {
      provider: model.model_type,
      model: model.model_id,
      messages: contextMessages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature: 0.7,
      max_tokens: 4096,
    };

    // 如果有智能體，添加系統提示
    if (conversation.agent_id) {
      const { rows: agentRows } = await query(
        "SELECT system_prompt FROM agents WHERE id = ?",
        [conversation.agent_id]
      );

      if (agentRows.length > 0) {
        aiOptions.messages.unshift({
          role: "system",
          content: agentRows[0].system_prompt,
        });
      }
    }

    // 調用AI模型
    const aiResponse = await AIService.callModel(aiOptions);

    // 創建AI回應消息
    const assistantMessage = await MessageModel.create({
      conversation_id: conversationId,
      role: "assistant",
      content: aiResponse.content,
      content_type: "text",
      tokens_used: aiResponse.tokens_used,
      cost: aiResponse.cost,
      model_info: aiResponse.model_info,
      processing_time: aiResponse.processing_time,
    });

    // 停止AI輸入狀態
    sendToClient(clientId, {
      type: "ai_typing",
      data: {
        conversationId: conversationId,
        isTyping: false,
      },
    });

    // 發送AI回應
    sendToClient(clientId, {
      type: "ai_response",
      data: {
        message: assistantMessage,
        conversationId: conversationId,
        tokens: aiResponse.tokens_used,
        cost: aiResponse.cost,
      },
    });

    // 廣播AI回應到房間
    broadcastToRoom(
      `conversation_${conversationId}`,
      {
        type: "new_message",
        data: {
          message: assistantMessage,
          conversationId: conversationId,
        },
      },
      clientId
    );

    logger.info("實時聊天處理成功", {
      userId: client.userId,
      conversationId: conversationId,
      userMessageId: userMessage.id,
      assistantMessageId: assistantMessage.id,
      tokens: aiResponse.tokens_used,
    });
  } catch (error) {
    logger.error("實時聊天處理失敗", {
      clientId,
      userId: client.userId,
      error: error.message,
    });

    // 停止AI輸入狀態
    sendToClient(clientId, {
      type: "ai_typing",
      data: {
        conversationId: data.conversationId,
        isTyping: false,
      },
    });

    sendToClient(clientId, {
      type: "error",
      data: {
        message: `聊天處理失敗: ${error.message}`,
        code: "CHAT_ERROR",
      },
    });
  }
};

/**
 * 處理對話狀態更新
 * @param {string} clientId - 客戶端ID
 * @param {Object} data - 狀態數據
 * @param {Map} clients - 客戶端連接映射
 * @param {Function} sendToClient - 發送消息到客戶端的函數
 * @param {Function} broadcastToRoom - 廣播消息到房間的函數
 */
export const handleConversationStatus = async (
  clientId,
  data,
  clients,
  sendToClient,
  broadcastToRoom
) => {
  const client = clients.get(clientId);
  if (!client || !client.userId) {
    return;
  }

  const { conversationId, status, metadata } = data;

  // 廣播狀態更新
  broadcastToRoom(`conversation_${conversationId}`, {
    type: "conversation_status",
    data: {
      conversationId: conversationId,
      status: status,
      userId: client.userId,
      metadata: metadata,
      timestamp: new Date().toISOString(),
    },
  });
};

/**
 * 處理用戶輸入狀態
 * @param {string} clientId - 客戶端ID
 * @param {Object} data - 輸入狀態數據
 * @param {Map} clients - 客戶端連接映射
 * @param {Function} broadcastToRoom - 廣播消息到房間的函數
 */
export const handleTypingStatus = async (
  clientId,
  data,
  clients,
  broadcastToRoom
) => {
  const client = clients.get(clientId);
  if (!client || !client.userId) {
    return;
  }

  const { conversationId, isTyping } = data;

  // 廣播輸入狀態到房間（排除發送者）
  broadcastToRoom(
    `conversation_${conversationId}`,
    {
      type: "user_typing",
      data: {
        conversationId: conversationId,
        userId: client.userId,
        isTyping: isTyping,
        timestamp: new Date().toISOString(),
      },
    },
    clientId
  );
};

export default {
  verifyWebSocketToken,
  handleRealtimeChat,
  handleConversationStatus,
  handleTypingStatus,
};
