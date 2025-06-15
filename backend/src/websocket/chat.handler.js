/**
 * WebSocket 聊天處理器
 * 處理實時聊天相關的 WebSocket 消息
 */

import ConversationModel from "../models/Conversation.model.js";
import MessageModel from "../models/Message.model.js";
import AIService from "../services/ai.service.js";
import chatService from "../services/chat.service.js";
import { query } from "../config/database.config.js";
import logger from "../utils/logger.util.js";
import jwt from "jsonwebtoken";

/**
 * 驗證 WebSocket Token
 * @param {string} token - JWT Token
 * @returns {Promise<Object|null>} 用戶信息或 null
 */
export const verifyWebSocketToken = async (token) => {
  try {
    if (!token) return null;

    // 移除 Bearer 前綴（如果存在）
    const cleanToken = token.replace(/^Bearer\s+/, "");

    // 驗證 JWT
    const decoded = jwt.verify(cleanToken, process.env.JWT_SECRET);

    // 查詢用戶信息 - 修復：使用 decoded.id 而不是 decoded.userId
    const { rows } = await query(
      "SELECT id, username, email, role, is_active FROM users WHERE id = ?",
      [decoded.id]
    );

    if (rows.length === 0 || !rows[0].is_active) {
      return null;
    }

    return rows[0];
  } catch (error) {
    logger.error("WebSocket Token 驗證失敗", {
      error: error.message,
    });
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

    // 🔧 生成包含 MCP 工具資訊的動態系統提示詞
    let baseSystemPrompt = "";
    if (conversation.agent_id) {
      const { rows: agentRows } = await query(
        "SELECT system_prompt FROM agents WHERE id = ?",
        [conversation.agent_id]
      );

      if (agentRows.length > 0) {
        baseSystemPrompt = agentRows[0].system_prompt;
      }
    }

    // 生成包含 MCP 工具資訊的動態系統提示詞
    const systemPromptContent = await chatService.generateSystemPrompt(
      baseSystemPrompt || "",
      {
        user_id: client.userId,
        conversation_id: conversationId,
        model_type: model.model_type,
      }
    );

    // 準備AI調用參數
    const aiOptions = {
      provider: model.model_type,
      model: model.model_id,
      endpoint_url: model.endpoint_url,
      api_key: model.api_key_encrypted,
      messages: contextMessages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature: 0.7,
      max_tokens: 4096,
    };

    // 如果有系統提示詞，添加到消息開頭
    if (systemPromptContent) {
      aiOptions.messages.unshift({
        role: "system",
        content: systemPromptContent,
      });
    }

    // 調用AI模型
    const aiResponse = await AIService.callModel(aiOptions);

    // 🔧 處理 AI 回應，包含 MCP 工具調用檢測和執行
    const chatResult = await chatService.processChatMessage(
      aiResponse.content,
      {
        user_id: client.userId,
        conversation_id: conversationId,
        model_id: model.id,
        endpoint_url: model.endpoint_url,
      }
    );

    // 使用處理後的回應內容
    const finalContent = chatResult.final_response || aiResponse.content;

    // 創建AI回應消息（包含工具調用資訊）
    const assistantMessage = await MessageModel.create({
      conversation_id: conversationId,
      role: "assistant",
      content: finalContent,
      content_type: "text",
      tokens_used: aiResponse.tokens_used,
      cost: aiResponse.cost,
      model_info: aiResponse.model_info,
      processing_time: aiResponse.processing_time,
      metadata: {
        has_tool_calls: chatResult.has_tool_calls,
        tool_calls: chatResult.tool_calls || [],
        tool_results: chatResult.tool_results || [],
        used_secondary_ai: chatResult.used_secondary_ai || false,
        original_response: chatResult.original_response,
      },
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
        // 🔧 添加工具調用相關信息
        toolInfo: {
          hasToolCalls: chatResult.has_tool_calls,
          toolCallsCount: chatResult.tool_calls?.length || 0,
          toolResultsCount: chatResult.tool_results?.length || 0,
          usedSecondaryAI: chatResult.used_secondary_ai || false,
        },
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
      hasToolCalls: chatResult.has_tool_calls,
      toolCallsCount: chatResult.tool_calls?.length || 0,
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
