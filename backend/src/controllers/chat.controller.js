/**
 * 聊天控制器
 * 處理對話和訊息相關的業務邏輯
 */

import ConversationModel from "../models/Conversation.model.js";
import MessageModel from "../models/Message.model.js";
import AIService from "../services/ai.service.js";
import chatService from "../services/chat.service.js";
import AttachmentService from "../services/attachment.service.js";
import MessageFormattingService from "../services/messageFormatting.service.js";
import { query } from "../config/database.config.js";
import {
  catchAsync,
  createSuccessResponse,
  ValidationError,
  BusinessError,
} from "../middleware/errorHandler.middleware.js";
import logger from "../utils/logger.util.js";
import Joi from "joi";
import { sendToUser } from "../websocket/index.js";

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
    model_id: Joi.number().integer().optional(),
    endpoint_url: Joi.string().uri().optional(),
    system_prompt: Joi.string().optional(),
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
    title: title || null,
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
    model_id,
    endpoint_url,
    system_prompt,
  } = value;
  const { user } = req;
  const { conversationId } = req.params;

  // 獲取對話和權限檢查
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

  // 確定要使用的模型
  const targetModelId = model_id || conversation.model_id;
  const { rows: modelRows } = await query(
    "SELECT * FROM ai_models WHERE id = ? AND is_active = TRUE",
    [targetModelId]
  );

  if (modelRows.length === 0) {
    throw new BusinessError(
      model_id ? "指定的AI模型不存在或已停用" : "對話關聯的AI模型不存在或已停用"
    );
  }

  const model = modelRows[0];

  // 創建用戶訊息
  const userMessage = await MessageModel.create({
    conversation_id: conversationId,
    role: "user",
    content: content,
    content_type: content_type || "text",
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
    const maxContextTokens = max_tokens && !isNaN(max_tokens) ? max_tokens * 0.7 : 2800;
    const contextMessages = await MessageModel.getContextMessages(
      conversationId,
      20,
      maxContextTokens
    );

    // 格式化消息（包含附件處理）
    const formattedMessages = await MessageFormattingService.formatContextMessages(
      contextMessages,
      model.model_type
    );

    // 準備系統提示詞
    let baseSystemPrompt = system_prompt;
    if (!baseSystemPrompt && conversation.agent_id) {
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
        user_id: user.id,
        conversation_id: conversationId,
        model_type: model.model_type,
      }
    );

    // 組裝最終消息列表
    const finalMessages = MessageFormattingService.assembleFinalMessages(
      formattedMessages,
      systemPromptContent
    );

    // 準備AI調用參數
    const aiOptions = {
      provider: model.model_type,
      model: model.model_id,
      endpoint_url: model.endpoint_url,
      api_key: model.api_key_encrypted,
      messages: finalMessages,
      temperature: temperature || 0.7,
      max_tokens: max_tokens || 4096,
    };

    // 調用AI模型
    const aiResponse = await AIService.callModel(aiOptions);

    // 處理 AI 回應，包含 MCP 工具調用檢測和執行
    const chatResult = await chatService.processChatMessage(
      aiResponse.content,
      {
        user_id: user.id,
        conversation_id: conversationId,
        model_id: model.id,
        model_config: model,
        endpoint_url: model.endpoint_url,
        user_question: content,
        original_question: content,
      }
    );

    // 使用處理後的回應內容
    const finalContent = chatResult.final_response || aiResponse.content;

    // 創建AI回應訊息
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
        original_response: chatResult.original_response,
        thinking_content: chatResult.thinking_content || aiResponse.thinking_content || null,
      },
    });

    logger.info("AI回應生成成功", {
      conversationId: conversationId,
      messageId: assistantMessage.id,
      tokens: aiResponse.tokens_used,
      cost: aiResponse.cost,
      processingTime: aiResponse.processing_time,
    });

    // 自動生成對話標題（如果需要）
    let updatedConversation = await ConversationModel.findById(conversationId);
    if (!updatedConversation.title) {
      const autoTitle = content.replace(/\n/g, " ").trim().substring(0, 30);
      if (autoTitle) {
        await query(
          "UPDATE conversations SET title = ?, updated_at = NOW() WHERE id = ?",
          [autoTitle, conversationId]
        );
        updatedConversation = await ConversationModel.findById(conversationId);
        logger.info("自動生成對話標題", {
          conversationId: conversationId,
          title: autoTitle,
        });
      }
    }

    // 返回結果
    const responseData = {
      user_message: userMessage,
      assistant_message: assistantMessage,
      conversation: updatedConversation,
    };

    res.json(createSuccessResponse(responseData, "訊息發送成功"));
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
 * 發送訊息（串流模式）
 */
export const handleSendMessageStream = catchAsync(async (req, res) => {
  const { user } = req;
  const { conversationId } = req.params;
  const {
    content,
    content_type = "text",
    attachments,
    metadata,
    model_id,
    endpoint_url,
    temperature = 0.7,
    max_tokens = 8192,
    system_prompt,
  } = req.body;

  logger.info("開始串流聊天", {
    userId: user.id,
    conversationId,
    contentLength: content?.length,
    modelId: model_id,
  });

  // 設置 SSE headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": req.headers.origin || "*",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Requested-With, Accept, Cache-Control, Connection, Keep-Alive",
    "Access-Control-Expose-Headers": "Cache-Control, Connection, Content-Type",
  });

  // 客戶端斷開檢測
  let isClientConnected = true;
  const abortController = new AbortController();

  req.on("close", () => {
    logger.info("客戶端斷開連接", { conversationId, userId: user.id });
    isClientConnected = false;
    abortController.abort();
  });

  req.on("error", (error) => {
    logger.error("請求錯誤", {
      conversationId,
      userId: user.id,
      error: error.message,
    });
    isClientConnected = false;
    abortController.abort();
  });

  const sendSSE = (eventType, data) => {
    if (!isClientConnected) {
      return false;
    }
    try {
      res.write(`event: ${eventType}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
      return true;
    } catch (error) {
      logger.error("SSE發送失敗", { error: error.message });
      isClientConnected = false;
      return false;
    }
  };

  try {
    // 驗證對話存在且用戶有權限
    const conversation = await ConversationModel.findById(conversationId);
    if (!conversation) {
      sendSSE("error", { error: "對話不存在" });
      res.end();
      return;
    }

    if (conversation.user_id !== user.id) {
      sendSSE("error", { error: "無權限訪問該對話" });
      res.end();
      return;
    }

    // 獲取模型配置
    const modelQuery = model_id
      ? "SELECT * FROM ai_models WHERE id = ? AND is_active = TRUE"
      : "SELECT * FROM ai_models WHERE id = ? AND is_active = TRUE";

    const modelParams = model_id ? [model_id] : [conversation.model_id];
    const { rows: modelRows } = await query(modelQuery, modelParams);

    if (modelRows.length === 0) {
      sendSSE("error", { error: "指定的模型不存在或不可用" });
      res.end();
      return;
    }

    const model = modelRows[0];

    // 如果使用了不同的模型，更新對話的默認模型
    if (model_id && model_id !== conversation.model_id) {
      await query(
        "UPDATE conversations SET model_id = ?, updated_at = NOW() WHERE id = ?",
        [model_id, conversationId]
      );

      logger.info("對話模型已更新", {
        conversationId: conversationId,
        oldModelId: conversation.model_id,
        newModelId: model_id,
      });
    }

    // 創建用戶訊息
    const userMessage = await MessageModel.create({
      conversation_id: conversationId,
      role: "user",
      content: content,
      content_type: content_type,
      attachments: attachments || null,
      metadata: metadata || null,
    });

    // 發送用戶訊息創建成功事件
    sendSSE("user_message", {
      user_message: userMessage,
      conversation_id: conversationId,
    });

    // 獲取對話上下文
    const contextMessages = await MessageModel.getContextMessages(
      conversationId,
      20,
      max_tokens * 0.7
    );

    // 格式化消息（包含附件處理）
    const formattedMessages = await MessageFormattingService.formatContextMessages(
      contextMessages,
      model.model_type
    );

    // 準備系統提示詞
    let baseSystemPrompt = system_prompt;
    if (!baseSystemPrompt && conversation.agent_id) {
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
        user_id: user.id,
        conversation_id: conversationId,
        model_type: model.model_type,
      }
    );

    // 組裝最終消息列表
    const finalMessages = MessageFormattingService.assembleFinalMessages(
      formattedMessages,
      systemPromptContent
    );

    // 準備AI調用參數
    const aiOptions = {
      provider: model.model_type,
      model: model.model_id,
      endpoint_url: endpoint_url || model.endpoint_url,
      api_key: model.api_key_encrypted,
      messages: finalMessages,
      temperature: temperature,
      max_tokens: max_tokens,
      stream: true,
    };

    logger.info("開始調用AI模型串流", {
      provider: model.model_type,
      model: model.model_id,
      messageCount: finalMessages.length,
      conversationId: conversationId,
    });

    // 調用AI模型串流
    const aiStreamGenerator = await AIService.callModel(aiOptions);

    let assistantMessageId = null;
    let fullContent = "";
    let finalStats = null;

    // 處理串流回應
    let accumulatedThinkingContent = "";

    for await (const chunk of aiStreamGenerator) {
      if (!isClientConnected) {
        logger.info("客戶端已斷開，停止串流處理", { conversationId });
        break;
      }

      if (chunk.thinking_content) {
        accumulatedThinkingContent = chunk.thinking_content;
      }

      if (chunk.type === "thinking") {
        accumulatedThinkingContent = chunk.thinking_content;

        if (!assistantMessageId) {
          const assistantMessage = await MessageModel.create({
            conversation_id: conversationId,
            role: "assistant",
            content: "",
            content_type: "text",
            tokens_used: chunk.tokens_used,
            model_info: { provider: chunk.provider, model: chunk.model },
            processing_time: null,
          });
          assistantMessageId = assistantMessage.id;

          sendSSE("assistant_message_created", {
            assistant_message_id: assistantMessageId,
            conversation_id: conversationId,
          });
        }

        const sent = sendSSE("stream_content", {
          content: "",
          full_content: fullContent,
          thinking_content: accumulatedThinkingContent,
          thinking_delta: chunk.thinking_delta,
          tokens_used: chunk.tokens_used,
          assistant_message_id: assistantMessageId,
        });

        if (!sent) {
          logger.info("思考內容SSE發送失敗，停止串流處理", { conversationId });
          break;
        }
      } else if (chunk.type === "content") {
        fullContent = chunk.full_content || fullContent + chunk.content;

        if (!assistantMessageId) {
          const assistantMessage = await MessageModel.create({
            conversation_id: conversationId,
            role: "assistant",
            content: fullContent,
            content_type: "text",
            tokens_used: chunk.tokens_used,
            model_info: { provider: chunk.provider, model: chunk.model },
            processing_time: null,
          });
          assistantMessageId = assistantMessage.id;

          sendSSE("assistant_message_created", {
            assistant_message_id: assistantMessageId,
            conversation_id: conversationId,
          });
        }

        const sent = sendSSE("stream_content", {
          content: chunk.content,
          full_content: fullContent,
          thinking_content: accumulatedThinkingContent,
          tokens_used: chunk.tokens_used,
          assistant_message_id: assistantMessageId,
        });

        if (!sent) {
          logger.info("SSE發送失敗，停止串流處理", { conversationId });
          break;
        }

        if (assistantMessageId) {
          await MessageModel.update(assistantMessageId, {
            content: fullContent,
            tokens_used: chunk.tokens_used,
          });
        }
      } else if (chunk.type === "done") {
        finalStats = chunk;

        // 處理工具調用
        let finalContent = chunk.full_content;
        let finalThinkingContent = accumulatedThinkingContent || chunk.thinking_content;
        let toolCallMetadata = {
          has_tool_calls: false,
          tool_calls: [],
          tool_results: [],
          used_secondary_ai: false,
          original_response: chunk.full_content,
          thinking_content: finalThinkingContent,
        };

        try {
          if (isClientConnected) {
            sendSSE("tool_processing_start", {
              assistant_message_id: assistantMessageId,
              message: "正在檢查並處理工具調用...",
              conversation_id: conversationId,
            });
          }

          const toolCallPromise = chatService.processChatMessage(
            chunk.full_content,
            {
              user_id: user.id,
              conversation_id: conversationId,
              model_id: model.id,
              model_config: model,
              endpoint_url: model.endpoint_url,
              user_question: content,
              original_question: content,
              onSecondaryAIStart: () => {
                if (isClientConnected) {
                  sendSSE("secondary_ai_start", {
                    assistant_message_id: assistantMessageId,
                    message: "正在優化回應內容...",
                    conversation_id: conversationId,
                  });
                }
              },
            }
          );

          const heartbeatInterval = setInterval(() => {
            if (isClientConnected) {
              sendSSE("tool_processing_heartbeat", {
                assistant_message_id: assistantMessageId,
                message: "工具處理中，請稍候...",
                timestamp: Date.now(),
                conversation_id: conversationId,
              });
            } else {
              clearInterval(heartbeatInterval);
            }
          }, 3000);

          const chatResult = await toolCallPromise;
          clearInterval(heartbeatInterval);

          finalContent = chatResult.final_response || chunk.full_content;

          if (!finalThinkingContent && chatResult.thinking_content) {
            finalThinkingContent = chatResult.thinking_content;
          }

          if (chatResult.has_tool_calls) {
            toolCallMetadata = {
              has_tool_calls: chatResult.has_tool_calls,
              tool_calls: chatResult.tool_calls || [],
              tool_results: chatResult.tool_results || [],
              used_secondary_ai: chatResult.used_secondary_ai || false,
              original_response: chatResult.original_response,
              thinking_content: finalThinkingContent,
            };

            if (isClientConnected) {
              sendSSE("tool_calls_processed", {
                assistant_message_id: assistantMessageId,
                tool_calls: toolCallMetadata.tool_calls,
                tool_results: toolCallMetadata.tool_results,
                has_tool_calls: toolCallMetadata.has_tool_calls,
                thinking_content: finalThinkingContent,
                conversation_id: conversationId,
              });
            }
          } else if (finalThinkingContent) {
            if (isClientConnected) {
              sendSSE("thinking_content_processed", {
                assistant_message_id: assistantMessageId,
                thinking_content: finalThinkingContent,
                conversation_id: conversationId,
              });
            }
          }
        } catch (toolError) {
          console.error("串流模式工具調用處理失敗:", toolError.message);

          if (isClientConnected) {
            sendSSE("tool_processing_error", {
              assistant_message_id: assistantMessageId,
              error: `工具處理失敗: ${toolError.message}`,
              conversation_id: conversationId,
            });
          }

          toolCallMetadata.thinking_content = finalThinkingContent;
        }

        // 最終更新assistant訊息
        if (assistantMessageId) {
          await MessageModel.update(assistantMessageId, {
            content: finalContent,
            tokens_used: chunk.tokens_used,
            cost: chunk.cost,
            processing_time: chunk.processing_time,
            metadata: toolCallMetadata,
            model_info: {
              provider: chunk.provider,
              model: chunk.model_info,
              processing_time: chunk.processing_time,
              tokens_used: chunk.tokens_used,
              cost: chunk.cost,
            },
          });
        }

        // 發送完成事件
        sendSSE("stream_done", {
          assistant_message_id: assistantMessageId,
          full_content: finalContent,
          tokens_used: chunk.tokens_used,
          cost: chunk.cost,
          processing_time: chunk.processing_time,
          conversation_id: conversationId,
          tool_info: {
            has_tool_calls: toolCallMetadata.has_tool_calls,
            tool_calls_count: toolCallMetadata.tool_calls?.length || 0,
            tool_results_count: toolCallMetadata.tool_results?.length || 0,
            used_secondary_ai: toolCallMetadata.used_secondary_ai,
          },
        });

        logger.info("AI串流回應完成", {
          conversationId: conversationId,
          messageId: assistantMessageId,
          tokens: chunk.tokens_used,
          cost: chunk.cost,
          processingTime: chunk.processing_time,
          contentLength: chunk.full_content?.length,
        });
      }
    }

    // 自動生成對話標題（如果需要）
    let updatedConversation = await ConversationModel.findById(conversationId);
    if (!updatedConversation.title) {
      const autoTitle = content.replace(/\n/g, " ").trim().substring(0, 30);
      if (autoTitle) {
        await query(
          "UPDATE conversations SET title = ?, updated_at = NOW() WHERE id = ?",
          [autoTitle, conversationId]
        );
        updatedConversation = await ConversationModel.findById(conversationId);
        logger.info("自動生成對話標題（串流模式）", {
          conversationId: conversationId,
          title: autoTitle,
        });
      }
    }

    // 發送最終對話狀態
    if (isClientConnected) {
      sendSSE("conversation_updated", {
        conversation: updatedConversation,
      });
    }

    if (isClientConnected) {
      res.end();
    }
  } catch (error) {
    logger.error("串流聊天失敗", {
      conversationId: conversationId,
      error: error.message,
      stack: error.stack,
    });

    sendSSE("error", {
      error: `AI模型調用失敗: ${error.message}`,
      conversation_id: conversationId,
    });

    try {
      await MessageModel.create({
        conversation_id: conversationId,
        role: "system",
        content: `AI模型調用失敗: ${error.message}`,
        content_type: "text",
        metadata: { error: true, error_message: error.message },
      });
    } catch (dbError) {
      logger.error("創建錯誤訊息失敗", { error: dbError.message });
    }

    res.end();
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

  // 獲取實際可用的模型（如果 AIService 可用的話）
  let availableModels = { ollama: [], gemini: [], openai: [], claude: [] };
  try {
    availableModels = await AIService.getAvailableModels();
  } catch (error) {
    console.warn("無法獲取實際可用模型，使用資料庫配置:", error.message);
  }

  // 支援的提供商列表
  const supportedProviders = ["ollama", "gemini", "openai", "claude"];

  // 合併資料庫配置和實際可用性
  const models = {};

  supportedProviders.forEach((provider) => {
    models[provider] = dbModels
      .filter((m) => m.model_type === provider)
      .map((m) => ({
        id: m.id,
        name: m.name,
        display_name: m.display_name || m.name,
        model_id: m.model_id,
        provider: m.model_type,
        description: m.description,
        icon: m.icon,
        endpoint_url: m.endpoint_url,
        max_tokens: m.max_tokens,
        temperature: m.temperature,
        pricing:
          typeof m.pricing === "string" ? JSON.parse(m.pricing) : m.pricing,
        capabilities:
          typeof m.capabilities === "string"
            ? JSON.parse(m.capabilities)
            : m.capabilities,
        is_active: m.is_active,
        is_default: m.is_default,
        is_multimodal: m.is_multimodal,
        available: availableModels[provider]
          ? availableModels[provider].some((am) => am.name === m.model_id)
          : true, // 如果無法檢測實際可用性，默認為可用
        created_at: m.created_at,
        updated_at: m.updated_at,
      }));
  });

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

  query_sql += " ORDER BY a.sort_order ASC, a.usage_count DESC, a.rating DESC";

  const { rows } = await query(query_sql, params);

  res.json(createSuccessResponse(rows, "獲取智能體列表成功"));
});

/**
 * 獲取 MCP 工具統計資訊
 */
export const handleGetToolStats = catchAsync(async (req, res) => {
  const { user } = req;

  logger.debug("獲取工具統計資訊", {
    userId: user.id,
  });

  try {
    const stats = await chatService.getToolStats();

    if (!stats) {
      throw new BusinessError("無法獲取工具統計資訊");
    }

    logger.info("工具統計資訊獲取成功", {
      userId: user.id,
      totalTools: stats.total_tools,
      enabledTools: stats.enabled_tools,
    });

    res.json(createSuccessResponse(stats, "工具統計資訊獲取成功"));
  } catch (error) {
    logger.error("獲取工具統計失敗", {
      userId: user.id,
      error: error.message,
    });
    throw new BusinessError(`獲取工具統計失敗: ${error.message}`);
  }
});

/**
 * 預覽動態系統提示詞
 */
export const handlePreviewSystemPrompt = catchAsync(async (req, res) => {
  const { user } = req;
  const { base_prompt = "", model_type = "ollama" } = req.body;

  logger.debug("預覽系統提示詞", {
    userId: user.id,
    basePromptLength: base_prompt.length,
    modelType: model_type,
  });

  try {
    const systemPrompt = await chatService.generateSystemPrompt(base_prompt, {
      user_id: user.id,
      model_type: model_type,
    });

    const preview = {
      base_prompt: base_prompt,
      full_system_prompt: systemPrompt,
      prompt_length: systemPrompt.length,
      generated_at: new Date().toISOString(),
    };

    logger.info("系統提示詞預覽生成成功", {
      userId: user.id,
      promptLength: systemPrompt.length,
    });

    res.json(createSuccessResponse(preview, "系統提示詞預覽生成成功"));
  } catch (error) {
    logger.error("預覽系統提示詞失敗", {
      userId: user.id,
      error: error.message,
    });
    throw new BusinessError(`預覽系統提示詞失敗: ${error.message}`);
  }
});

/**
 * 清除系統提示詞快取
 */
export const handleClearPromptCache = catchAsync(async (req, res) => {
  const { user } = req;

  logger.debug("清除系統提示詞快取", {
    userId: user.id,
  });

  try {
    chatService.clearCache();

    logger.info("系統提示詞快取清除成功", {
      userId: user.id,
    });

    res.json(createSuccessResponse(null, "系統提示詞快取清除成功"));
  } catch (error) {
    logger.error("清除快取失敗", {
      userId: user.id,
      error: error.message,
    });
    throw new BusinessError(`清除快取失敗: ${error.message}`);
  }
});

export default {
  handleCreateConversation,
  handleSendMessage,
  handleSendMessageStream,
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
  handleGetToolStats,
  handlePreviewSystemPrompt,
  handleClearPromptCache,
};
