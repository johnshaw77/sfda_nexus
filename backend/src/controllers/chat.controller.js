/**
 * 聊天控制器
 * 處理對話和訊息相關的業務邏輯
 */

import ConversationModel from "../models/Conversation.model.js";
import MessageModel from "../models/Message.model.js";
import AIService from "../services/ai.service.js";
import { query } from "../config/database.config.js";
import {
  catchAsync,
  createSuccessResponse,
  ValidationError,
  BusinessError,
} from "../middleware/errorHandler.middleware.js";
import logger from "../utils/logger.util.js";
import Joi from "joi";

// 輸入驗證模式
const schemas = {
  createConversation: Joi.object({
    agent_id: Joi.number().integer().optional(),
    model_id: Joi.number().integer().required().messages({
      "any.required": "模型ID是必填項",
    }),
    title: Joi.string().max(200).optional(),
    context: Joi.object().optional(),
  }),

  sendMessage: Joi.object({
    content: Joi.string().required().messages({
      "string.empty": "訊息內容不能為空",
      "any.required": "訊息內容是必填項",
    }),
    content_type: Joi.string()
      .valid("text", "image", "file", "mixed")
      .default("text"),
    attachments: Joi.array().optional(),
    metadata: Joi.object().optional(),
    temperature: Joi.number().min(0).max(2).default(0.7),
    max_tokens: Joi.number().integer().min(1).max(32768).default(4096),
  }),

  updateConversation: Joi.object({
    title: Joi.string().max(200).optional(),
    summary: Joi.string().optional(),
    context: Joi.object().optional(),
    is_pinned: Joi.boolean().optional(),
  }),
};

/**
 * 創建新對話
 */
export const handleCreateConversation = catchAsync(async (req, res) => {
  // 輸入驗證
  const { error, value } = schemas.createConversation.validate(req.body);
  if (error) {
    throw new ValidationError("輸入驗證失敗", error.details);
  }

  const { agent_id, model_id, title, context } = value;
  const { user } = req;

  // 驗證模型是否存在
  const { rows: modelRows } = await query(
    "SELECT * FROM ai_models WHERE id = ? AND is_active = TRUE",
    [model_id]
  );

  if (modelRows.length === 0) {
    throw new BusinessError("指定的AI模型不存在或已停用");
  }

  const model = modelRows[0];

  // 如果指定了智能體，驗證智能體是否存在
  if (agent_id) {
    const { rows: agentRows } = await query(
      "SELECT * FROM agents WHERE id = ? AND is_active = TRUE",
      [agent_id]
    );

    if (agentRows.length === 0) {
      throw new BusinessError("指定的智能體不存在或已停用");
    }
  }

  // 創建對話
  const conversation = await ConversationModel.create({
    user_id: user.id,
    agent_id: agent_id || null,
    model_id: model_id,
    title: title || "新對話",
    context: context || null,
  });

  logger.info("創建對話成功", {
    userId: user.id,
    conversationId: conversation.id,
    modelId: model_id,
    agentId: agent_id,
  });

  res.status(201).json(createSuccessResponse(conversation, "對話創建成功"));
});

/**
 * 發送訊息並獲取AI回應
 */
export const handleSendMessage = catchAsync(async (req, res) => {
  // 輸入驗證
  const { error, value } = schemas.sendMessage.validate(req.body);
  if (error) {
    throw new ValidationError("輸入驗證失敗", error.details);
  }

  const {
    content,
    content_type,
    attachments,
    metadata,
    temperature,
    max_tokens,
  } = value;
  const { user } = req;
  const { conversationId } = req.params;

  // 獲取對話信息
  const conversation = await ConversationModel.findById(conversationId);
  if (!conversation) {
    throw new BusinessError("對話不存在");
  }

  // 檢查對話擁有權
  if (
    conversation.user_id !== user.id &&
    !["admin", "super_admin"].includes(user.role)
  ) {
    throw new BusinessError("無權訪問此對話");
  }

  // 獲取模型信息
  const { rows: modelRows } = await query(
    "SELECT * FROM ai_models WHERE id = ?",
    [conversation.model_id]
  );

  if (modelRows.length === 0) {
    throw new BusinessError("對話關聯的AI模型不存在");
  }

  const model = modelRows[0];

  // 創建用戶訊息
  const userMessage = await MessageModel.create({
    conversation_id: conversationId,
    role: "user",
    content: content,
    content_type: content_type,
    attachments: attachments || null,
    metadata: metadata || null,
  });

  logger.info("用戶訊息創建成功", {
    userId: user.id,
    conversationId: conversationId,
    messageId: userMessage.id,
  });

  try {
    // 獲取對話上下文
    const contextMessages = await MessageModel.getContextMessages(
      conversationId,
      20, // 最多20條訊息
      max_tokens * 0.7 // 保留30%給回應
    );

    // 準備AI調用參數
    const aiOptions = {
      provider: model.model_type,
      model: model.model_id,
      messages: contextMessages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature: temperature,
      max_tokens: max_tokens,
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

    logger.debug("調用AI模型", {
      provider: model.model_type,
      model: model.model_id,
      messageCount: aiOptions.messages.length,
      conversationId: conversationId,
    });

    // 調用AI模型
    const aiResponse = await AIService.callModel(aiOptions);

    // 創建AI回應訊息
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

    logger.info("AI回應生成成功", {
      conversationId: conversationId,
      messageId: assistantMessage.id,
      tokens: aiResponse.tokens_used,
      cost: aiResponse.cost,
      processingTime: aiResponse.processing_time,
    });

    // 返回用戶訊息和AI回應
    res.json(
      createSuccessResponse(
        {
          user_message: userMessage,
          assistant_message: assistantMessage,
          conversation: await ConversationModel.findById(conversationId),
        },
        "訊息發送成功"
      )
    );
  } catch (aiError) {
    logger.error("AI模型調用失敗", {
      conversationId: conversationId,
      error: aiError.message,
      model: model.model_id,
    });

    // 創建錯誤訊息記錄
    await MessageModel.create({
      conversation_id: conversationId,
      role: "system",
      content: `AI模型調用失敗: ${aiError.message}`,
      content_type: "text",
      metadata: { error: true, error_message: aiError.message },
    });

    throw new BusinessError(`AI模型調用失敗: ${aiError.message}`);
  }
});

/**
 * 獲取用戶對話列表
 */
export const handleGetConversations = catchAsync(async (req, res) => {
  const { user } = req;
  const {
    page = 1,
    limit = 20,
    status = "active",
    search,
    agent_id,
    sortBy = "last_message_at",
    sortOrder = "DESC",
  } = req.query;

  const result = await ConversationModel.findByUser(user.id, {
    page: parseInt(page),
    limit: parseInt(limit),
    status,
    search,
    agent_id: agent_id ? parseInt(agent_id) : null,
    sortBy,
    sortOrder,
  });

  // 重新格式化響應以符合前端期望
  const formattedResult = {
    data: result.conversations,
    pagination: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
    },
  };

  res.json(createSuccessResponse(formattedResult, "獲取對話列表成功"));
});

/**
 * 獲取單個對話詳情
 */
export const handleGetConversation = catchAsync(async (req, res) => {
  const { user } = req;
  const { conversationId } = req.params;

  const conversation = await ConversationModel.findById(conversationId);
  if (!conversation) {
    throw new BusinessError("對話不存在");
  }

  // 檢查權限
  if (
    conversation.user_id !== user.id &&
    !["admin", "super_admin"].includes(user.role)
  ) {
    throw new BusinessError("無權訪問此對話");
  }

  res.json(createSuccessResponse(conversation, "獲取對話詳情成功"));
});

/**
 * 獲取對話訊息
 */
export const handleGetMessages = catchAsync(async (req, res) => {
  const { user } = req;
  const { conversationId } = req.params;
  const {
    page = 1,
    limit = 50,
    role,
    content_type,
    sortOrder = "ASC",
  } = req.query;

  // 檢查對話權限
  const conversation = await ConversationModel.findById(conversationId);
  if (!conversation) {
    throw new BusinessError("對話不存在");
  }

  if (
    conversation.user_id !== user.id &&
    !["admin", "super_admin"].includes(user.role)
  ) {
    throw new BusinessError("無權訪問此對話");
  }

  const result = await MessageModel.findByConversation(conversationId, {
    page: parseInt(page),
    limit: parseInt(limit),
    role,
    content_type,
    sortOrder,
  });

  // 重新格式化響應以符合前端期望
  const formattedResult = {
    data: result.messages,
    pagination: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
    },
  };

  res.json(createSuccessResponse(formattedResult, "獲取訊息列表成功"));
});

/**
 * 更新對話
 */
export const handleUpdateConversation = catchAsync(async (req, res) => {
  // 輸入驗證
  const { error, value } = schemas.updateConversation.validate(req.body);
  if (error) {
    throw new ValidationError("輸入驗證失敗", error.details);
  }

  const { user } = req;
  const { conversationId } = req.params;

  // 檢查對話權限
  const conversation = await ConversationModel.findById(conversationId);
  if (!conversation) {
    throw new BusinessError("對話不存在");
  }

  if (
    conversation.user_id !== user.id &&
    !["admin", "super_admin"].includes(user.role)
  ) {
    throw new BusinessError("無權修改此對話");
  }

  const updatedConversation = await ConversationModel.update(
    conversationId,
    value
  );

  logger.audit(user.id, "CONVERSATION_UPDATED", {
    conversationId: conversationId,
    updates: Object.keys(value),
  });

  res.json(createSuccessResponse(updatedConversation, "對話更新成功"));
});

/**
 * 刪除對話
 */
export const handleDeleteConversation = catchAsync(async (req, res) => {
  const { user } = req;
  const { conversationId } = req.params;

  await ConversationModel.softDelete(conversationId, user.id);

  res.json(createSuccessResponse(null, "對話刪除成功"));
});

/**
 * 歸檔對話
 */
export const handleArchiveConversation = catchAsync(async (req, res) => {
  const { user } = req;
  const { conversationId } = req.params;

  await ConversationModel.archive(conversationId, user.id);

  res.json(createSuccessResponse(null, "對話歸檔成功"));
});

/**
 * 恢復對話
 */
export const handleRestoreConversation = catchAsync(async (req, res) => {
  const { user } = req;
  const { conversationId } = req.params;

  await ConversationModel.restore(conversationId, user.id);

  res.json(createSuccessResponse(null, "對話恢復成功"));
});

/**
 * 置頂/取消置頂對話
 */
export const handleTogglePinConversation = catchAsync(async (req, res) => {
  const { user } = req;
  const { conversationId } = req.params;
  const { pinned = true } = req.body;

  await ConversationModel.togglePin(conversationId, user.id, pinned);

  res.json(
    createSuccessResponse(null, pinned ? "對話已置頂" : "對話已取消置頂")
  );
});

/**
 * 獲取可用的AI模型
 */
export const handleGetAvailableModels = catchAsync(async (req, res) => {
  // 從資料庫獲取配置的模型
  const { rows: dbModels } = await query(
    "SELECT * FROM ai_models WHERE is_active = TRUE ORDER BY is_default DESC, name ASC"
  );

  // 獲取實際可用的模型
  const availableModels = await AIService.getAvailableModels();

  // 合併資料庫配置和實際可用性
  const models = {
    ollama: dbModels
      .filter((m) => m.model_type === "ollama")
      .map((m) => ({
        ...m,
        available: availableModels.ollama.some((am) => am.name === m.model_id),
      })),
    gemini: dbModels
      .filter((m) => m.model_type === "gemini")
      .map((m) => ({
        ...m,
        available: availableModels.gemini.some((am) => am.name === m.model_id),
      })),
  };

  res.json(createSuccessResponse(models, "獲取可用模型成功"));
});

/**
 * 獲取智能體列表
 */
export const handleGetAgents = catchAsync(async (req, res) => {
  const { category, search } = req.query;

  let query_sql = `
    SELECT 
      a.*,
      m.name as model_name,
      m.display_name as model_display_name
    FROM agents a
    LEFT JOIN ai_models m ON a.model_id = m.id
    WHERE a.is_active = TRUE AND a.is_public = TRUE
  `;

  const params = [];

  if (category) {
    query_sql += " AND a.category = ?";
    params.push(category);
  }

  if (search) {
    query_sql +=
      " AND (a.name LIKE ? OR a.display_name LIKE ? OR a.description LIKE ?)";
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }

  query_sql += " ORDER BY a.usage_count DESC, a.rating DESC";

  const { rows } = await query(query_sql, params);

  res.json(createSuccessResponse(rows, "獲取智能體列表成功"));
});

export default {
  handleCreateConversation,
  handleSendMessage,
  handleGetConversations,
  handleGetConversation,
  handleGetMessages,
  handleUpdateConversation,
  handleDeleteConversation,
  handleArchiveConversation,
  handleRestoreConversation,
  handleTogglePinConversation,
  handleGetAvailableModels,
  handleGetAgents,
};
