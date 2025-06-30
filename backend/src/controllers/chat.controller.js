/**
 * 聊天控制器
 * 處理對話和訊息相關的業務邏輯
 */

import ConversationModel from "../models/Conversation.model.js";
import MessageModel from "../models/Message.model.js";
import AIService from "../services/ai.service.js";
import chatService from "../services/chat.service.js";
import MessageFormattingService from "../services/messageFormatting.service.js";
import smartChartDetectionService from "../services/smartChartDetection.service.js";
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
import mcpToolParser from "../services/mcpToolParser.service.js";
import mcpClient from "../services/mcp.service.js";

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
    const maxContextTokens =
      max_tokens && !isNaN(max_tokens) ? max_tokens * 0.7 : 2800;
    const contextMessages = await MessageModel.getContextMessages(
      conversationId,
      20,
      maxContextTokens
    );

    // 格式化消息（包含附件處理）
    const formattedMessages =
      await MessageFormattingService.formatContextMessages(
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

    // 🎯 智能圖表檢測
    let chartDetectionResult = null;
    try {
      console.log("🎯 [智能圖表檢測] 開始檢測...", {
        conversationId,
        userInput: content,
        aiResponse: finalContent.substring(0, 200) + "...",
      });

      chartDetectionResult = await smartChartDetectionService.detectChartIntent(
        content, // 用戶輸入
        finalContent, // AI回應
        model // 🔧 傳遞模型配置，使用與用戶選擇相同的模型
      );

      console.log("🎯 [智能圖表檢測] 檢測完成", {
        conversationId,
        hasChartData: chartDetectionResult?.hasChartData,
        confidence: chartDetectionResult?.confidence,
        chartType: chartDetectionResult?.chartType,
        dataLength: chartDetectionResult?.data?.length,
      });

      logger.info("智能圖表檢測結果", {
        conversationId,
        hasChartData: chartDetectionResult.hasChartData,
        confidence: chartDetectionResult.confidence,
        chartType: chartDetectionResult.chartType,
      });
    } catch (chartError) {
      console.error("🎯 [智能圖表檢測] 檢測失敗", {
        conversationId,
        error: chartError.message,
        stack: chartError.stack,
      });

      logger.error("智能圖表檢測失敗", {
        conversationId,
        error: chartError.message,
      });
    }

    // 創建AI回應訊息
    const assistantMessage = await MessageModel.create({
      conversation_id: conversationId,
      role: "assistant",
      content: finalContent,
      content_type: "text",
      tokens_used: aiResponse.tokens_used,
      cost: aiResponse.cost,
      model_info: {
        provider: model.model_type,
        model: model.model_id,
        display_name: model.display_name,
        processing_time: aiResponse.processing_time,
        tokens_used: aiResponse.tokens_used,
        cost: aiResponse.cost,
      },
      processing_time: aiResponse.processing_time,
      agent_id: conversation.agent_id,
      agent_name: conversation.agent_id
        ? await (async () => {
            const { rows: agentRows } = await query(
              "SELECT display_name, name FROM agents WHERE id = ?",
              [conversation.agent_id]
            );
            return agentRows.length > 0
              ? agentRows[0].display_name || agentRows[0].name
              : null;
          })()
        : null,
      metadata: {
        has_tool_calls: chatResult.has_tool_calls,
        tool_calls: chatResult.tool_calls || [],
        tool_results: chatResult.tool_results || [],
        original_response: chatResult.original_response,
        thinking_content:
          chatResult.thinking_content || aiResponse.thinking_content || null,
        chart_detection: chartDetectionResult,
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
    const modelQuery =
      "SELECT * FROM ai_models WHERE id = ? AND is_active = TRUE";
    const modelParams = [model_id || conversation.model_id];
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
    const formattedMessages =
      await MessageFormattingService.formatContextMessages(
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
          // 獲取智能體信息（如果有）
          let agentInfo = null;
          if (conversation.agent_id) {
            const { rows: agentRows } = await query(
              "SELECT id, name, display_name FROM agents WHERE id = ?",
              [conversation.agent_id]
            );
            if (agentRows.length > 0) {
              agentInfo = agentRows[0];
            }
          }

          const assistantMessage = await MessageModel.create({
            conversation_id: conversationId,
            role: "assistant",
            content: "",
            content_type: "text",
            tokens_used: chunk.tokens_used,
            // 🔧 修復：正確保存模型信息，使用用戶選擇的模型
            model_info: {
              provider: model.model_type,
              model: model.model_id,
              display_name: model.display_name,
            },
            // 🔧 修復：保存智能體信息
            agent_id: conversation.agent_id,
            agent_name: agentInfo
              ? agentInfo.display_name || agentInfo.name
              : null,
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
          // 獲取智能體信息（如果有）
          let agentInfo = null;
          if (conversation.agent_id) {
            const { rows: agentRows } = await query(
              "SELECT id, name, display_name FROM agents WHERE id = ?",
              [conversation.agent_id]
            );
            if (agentRows.length > 0) {
              agentInfo = agentRows[0];
            }
          }

          const assistantMessage = await MessageModel.create({
            conversation_id: conversationId,
            role: "assistant",
            content: fullContent,
            content_type: "text",
            tokens_used: chunk.tokens_used,
            // 🔧 修復：正確保存模型信息，使用用戶選擇的模型
            model_info: {
              provider: model.model_type,
              model: model.model_id,
              display_name: model.display_name,
            },
            // 🔧 修復：保存智能體信息
            agent_id: conversation.agent_id,
            agent_name: agentInfo
              ? agentInfo.display_name || agentInfo.name
              : null,
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
        let finalThinkingContent =
          accumulatedThinkingContent || chunk.thinking_content;
        let toolCallMetadata = {
          has_tool_calls: false,
          tool_calls: [],
          tool_results: [],
          used_secondary_ai: false,
          original_response: chunk.full_content,
          thinking_content: finalThinkingContent,
        };

        try {
          // 🔧 先進行快速工具調用檢測，避免不必要的處理提示
          const hasToolCallsQuickCheck = mcpToolParser.hasToolCalls(
            chunk.full_content,
            {
              user_id: user.id,
              conversation_id: conversationId,
              user_question: content,
              original_question: content,
            }
          );

          // 🔧 只有真正需要工具調用時才顯示處理訊息
          if (hasToolCallsQuickCheck && isClientConnected) {
            sendSSE("tool_processing_start", {
              assistant_message_id: assistantMessageId,
              message: "🔍 正在分析回應內容，檢測是否需要調用工具...",
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
              stream: true, // 🔧 啟用流式二次 AI 調用
              enableSecondaryStream: true, // 🔧 明確啟用二次流式調用
              onSecondaryAIStart: () => {
                if (isClientConnected) {
                  sendSSE("secondary_ai_start", {
                    assistant_message_id: assistantMessageId,
                    message: "✨ 正在優化回應內容...",
                    conversation_id: conversationId,
                  });
                }
              },
              // 🚀 新增：工具調用進度回調
              onToolCallStart: (toolName, toolCount, currentIndex) => {
                if (isClientConnected) {
                  sendSSE("tool_processing_heartbeat", {
                    assistant_message_id: assistantMessageId,
                    message: `🔧 正在調用工具 ${currentIndex}/${toolCount}: ${toolName}`,
                    progress: Math.round((currentIndex / toolCount) * 100),
                    timestamp: Date.now(),
                    conversation_id: conversationId,
                  });
                }
              },
              // 🎬 新增：工具結果分段串流回調
              onToolResultSection: async (sectionData) => {
                if (isClientConnected) {
                  sendSSE("tool_result_section", {
                    assistant_message_id: assistantMessageId,
                    section_type: sectionData.type,
                    section_content: sectionData.content,
                    section_index: sectionData.index,
                    total_sections: sectionData.total,
                    progress: Math.round(
                      ((sectionData.index + 1) / sectionData.total) * 100
                    ),
                    conversation_id: conversationId,
                    timestamp: Date.now(),
                  });
                }
              },
              // 🎬 新增：AI總結開始回調
              onAISummaryStart: () => {
                if (isClientConnected) {
                  sendSSE("ai_summary_start", {
                    assistant_message_id: assistantMessageId,
                    message: "🤖 正在生成智能總結...",
                    conversation_id: conversationId,
                    timestamp: Date.now(),
                  });
                }
              },
              onToolCallComplete: (toolName, result) => {
                if (isClientConnected) {
                  // 🚀 新增：檢查工具調用是否失敗，發送錯誤事件
                  if (result && result.success === false) {
                    sendSSE("mcp_tool_error", {
                      assistant_message_id: assistantMessageId,
                      tool_name: result.tool_name || toolName,
                      service_name: result.service_name || "unknown",
                      error: result.error || "工具調用失敗",
                      error_type: result.error_type || "UNKNOWN_ERROR",
                      suggestion: result.suggestion || "請重試或聯繫技術支援",
                      timestamp: Date.now(),
                      conversation_id: conversationId,
                    });
                  } else {
                    sendSSE("tool_processing_heartbeat", {
                      assistant_message_id: assistantMessageId,
                      message: `✅ 工具 ${toolName} 調用完成`,
                      timestamp: Date.now(),
                      conversation_id: conversationId,
                    });
                  }
                }
              },
            }
          );

          // 🔧 優化心跳間隔，更頻繁的更新讓用戶感覺不會卡住
          let heartbeatInterval = null;
          let heartbeatCount = 0;
          const heartbeatMessages = [
            "🔍 正在檢測工具調用需求...",
            "⚙️ 正在準備工具參數...",
            "🚀 正在執行工具調用...",
            "📊 正在處理工具結果...",
            "✨ 正在整合回應內容...",
          ];

          if (hasToolCallsQuickCheck) {
            heartbeatInterval = setInterval(() => {
              if (isClientConnected) {
                const message =
                  heartbeatMessages[heartbeatCount % heartbeatMessages.length];
                sendSSE("tool_processing_heartbeat", {
                  assistant_message_id: assistantMessageId,
                  message: message,
                  timestamp: Date.now(),
                  conversation_id: conversationId,
                });
                heartbeatCount++;
              } else {
                clearInterval(heartbeatInterval);
              }
            }, 1500); // 🚀 縮短到1.5秒，讓用戶感覺更流暢
          }

          const chatResult = await toolCallPromise;

          // 🔧 清理心跳間隔
          if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
          }

          // 🔧 檢查是否有流式二次 AI 調用
          if (
            chatResult.is_streaming_secondary &&
            chatResult.secondary_ai_generator
          ) {
            console.log("=== 開始處理流式二次 AI 調用 ===");

            if (isClientConnected) {
              sendSSE("secondary_ai_stream_start", {
                assistant_message_id: assistantMessageId,
                message: "開始流式生成回應...",
                conversation_id: conversationId,
              });
            }

            let secondaryContent = "";
            let secondaryFullContent = "";

            try {
              // 處理二次 AI 調用的流式輸出
              for await (const secondaryChunk of chatResult.secondary_ai_generator) {
                if (!isClientConnected) {
                  console.log("客戶端已斷開，停止二次 AI 流式處理");
                  break;
                }

                // 🔧 修復：二次 AI 調用期間不處理思考內容，只處理主要回答內容
                // 移除思考內容處理邏輯，避免重複顯示

                // 處理主要內容
                if (
                  secondaryChunk.type === "content" ||
                  secondaryChunk.content
                ) {
                  secondaryContent =
                    secondaryChunk.content ||
                    secondaryChunk.full_content ||
                    secondaryContent;
                  secondaryFullContent =
                    secondaryChunk.full_content || secondaryContent;

                  const sent = sendSSE("stream_content", {
                    content: secondaryContent,
                    full_content: secondaryFullContent,
                    thinking_content: finalThinkingContent, // 🔧 使用已有的思考內容，不更新
                    tokens_used: secondaryChunk.tokens_used,
                    assistant_message_id: assistantMessageId,
                  });

                  if (!sent) {
                    console.log("二次 AI 內容 SSE 發送失敗，停止處理");
                    break;
                  }

                  // 實時更新資料庫中的消息內容
                  if (assistantMessageId) {
                    await MessageModel.update(assistantMessageId, {
                      content: secondaryFullContent,
                      tokens_used: secondaryChunk.tokens_used,
                    });
                  }
                }

                // 處理完成事件
                if (secondaryChunk.type === "done") {
                  finalContent =
                    secondaryChunk.full_content || secondaryFullContent;

                  if (isClientConnected) {
                    sendSSE("secondary_ai_stream_done", {
                      assistant_message_id: assistantMessageId,
                      full_content: finalContent,
                      tokens_used: secondaryChunk.tokens_used,
                      conversation_id: conversationId,
                    });
                  }
                  break;
                }
              }

              // 使用流式生成的內容作為最終內容
              finalContent =
                secondaryFullContent ||
                chatResult.final_response ||
                chunk.full_content;
            } catch (secondaryStreamError) {
              console.error(
                "二次 AI 流式調用失敗:",
                secondaryStreamError.message
              );

              if (isClientConnected) {
                sendSSE("secondary_ai_stream_error", {
                  assistant_message_id: assistantMessageId,
                  error: `二次 AI 流式調用失敗: ${secondaryStreamError.message}`,
                  conversation_id: conversationId,
                });
              }

              // 回退到非流式結果
              finalContent = chatResult.final_response || chunk.full_content;
            }
          } else {
            // 原有的非流式邏輯
            finalContent = chatResult.final_response || chunk.full_content;
          }

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
              is_streaming_secondary:
                chatResult.is_streaming_secondary || false, // 🔧 添加流式標記
              used_summary: chatResult.used_summary || false, // 🔧 添加 Summary 使用標記
            };

            if (isClientConnected) {
              sendSSE("tool_calls_processed", {
                assistant_message_id: assistantMessageId,
                tool_calls: toolCallMetadata.tool_calls,
                tool_results: toolCallMetadata.tool_results,
                has_tool_calls: toolCallMetadata.has_tool_calls,
                thinking_content: finalThinkingContent,
                is_streaming_secondary: toolCallMetadata.is_streaming_secondary, // 🔧 傳遞流式標記
                debug_info: chatResult.debug_info, // 🔧 新增：傳遞調試信息
                used_summary: chatResult.used_summary, // 🔧 傳遞 Summary 使用標記
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

        // 🎬 新增：AI總結流處理
        if (
          toolCallMetadata.has_tool_calls &&
          toolCallMetadata.tool_results &&
          toolCallMetadata.tool_results.some((r) => r.success) &&
          isClientConnected
        ) {
          try {
            console.log("=== 開始AI總結流處理 ===");

            // 發送AI總結開始事件
            sendSSE("ai_summary_start", {
              assistant_message_id: assistantMessageId,
              message: "🤖 正在生成智能總結...",
              conversation_id: conversationId,
              timestamp: Date.now(),
            });

            // 🎯 改進：只提取核心數據，避免格式化噪音
            const coreData = toolCallMetadata.tool_results
              .filter((r) => r.success)
              .map((r) => {
                // 🎯 直接從工具結果的 data 字段提取原始數據
                let data = null;
                const toolName = r.tool_name;

                // 關鍵修復：直接使用工具結果的原始 data，而不是格式化後的 result //NOTE: 這裡要規範，就只有 r.result.data ??
                if (r.data) {
                  // 工具結果的原始數據
                  data = r.data;
                } else if (r.result?.data) {
                  // 備選路徑：result.data
                  data = r.result.data;
                } else if (r.result) {
                  // 使用整個 result
                  data = r.result;
                } else {
                  // 最後備選
                  data = r;
                }

                // 🔍 調試：記錄原始工具結果結構
                console.log("🔍 [調試] 工具結果結構:", {
                  toolName: toolName,
                  resultStructure: {
                    hasResult: !!r.result,
                    hasResultData: !!r.result?.data,
                    hasNestedData: !!r.result?.result?.data,
                    hasContent: !!r.result?.content,
                    resultType: typeof r.result,
                    extractedDataType: typeof data,
                    resultKeys: r.result ? Object.keys(r.result) : [],
                    extractedDataLength: Array.isArray(data)
                      ? data.length
                      : typeof data === "string"
                        ? data.length
                        : 0,
                    // 完整的結果結構 - 安全處理
                    fullResult: r.result
                      ? JSON.stringify(r.result, null, 2).substring(0, 500)
                      : "undefined",
                  },
                });

                // 🔍 如果是數組，檢查內容樣本
                if (Array.isArray(data) && data.length > 0) {
                  console.log("🔍 [調試] 數據樣本 (前3筆):", {
                    toolName: toolName,
                    totalRecords: data.length,
                    sampleData: data.slice(0, 3),
                  });
                }

                // 返回結構化的核心數據
                return {
                  tool: toolName,
                  data: data,
                  // 只包含基本統計信息
                  summary: r.result?.summary || r.result?.result?.summary,
                  // 🤖 新增：提取 AI 指導提示詞
                  aiInstructions:
                    r.result?.aiInstructions ||
                    r.data?.aiInstructions ||
                    r.result?.data?.aiInstructions ||
                    null,
                };
              });

            // 🔍 調試：記錄最終核心數據
            console.log("🔍 [調試] 最終核心數據:", {
              coreDataLength: coreData.length,
              coreDataStructure: coreData.map((item) => ({
                tool: item.tool,
                dataType: typeof item.data,
                dataLength: Array.isArray(item.data)
                  ? item.data.length
                  : typeof item.data === "string"
                    ? item.data.length
                    : 0,
                hasSummary: !!item.summary,
              })),
            });

            // 生成AI總結流
            const summaryGenerator = chatService.generateAISummaryStream(
              coreData, // 只傳遞核心數據
              content, // 用戶問題
              {
                user_id: user.id,
                conversation_id: conversationId,
                model_config: model,
              }
            );

            let summaryContent = "";

            // 處理AI總結流
            for await (const summaryChunk of summaryGenerator) {
              if (!isClientConnected) {
                console.log("客戶端已斷開，停止AI總結流處理");
                break;
              }

              if (summaryChunk.type === "ai_summary_delta") {
                summaryContent += summaryChunk.content;

                // 發送AI總結增量事件
                sendSSE("ai_summary_delta", {
                  assistant_message_id: assistantMessageId,
                  content: summaryChunk.content,
                  accumulated_content: summaryContent,
                  progress: summaryChunk.progress || 0,
                  conversation_id: conversationId,
                  timestamp: summaryChunk.timestamp,
                });
              } else if (summaryChunk.type === "ai_summary_error") {
                sendSSE("ai_summary_error", {
                  assistant_message_id: assistantMessageId,
                  error: summaryChunk.error,
                  conversation_id: conversationId,
                  timestamp: summaryChunk.timestamp,
                });
                break;
              }
            }

            // 發送AI總結完成事件
            if (summaryContent && isClientConnected) {
              sendSSE("ai_summary_complete", {
                assistant_message_id: assistantMessageId,
                summary_content: summaryContent,
                conversation_id: conversationId,
                timestamp: Date.now(),
              });

              // 🎯 不要在後端添加總結到finalContent，前端會處理
              // finalContent保持原樣，讓前端通過SSE事件來處理總結顯示
            }

            console.log("=== AI總結流處理完成 ===");
          } catch (summaryError) {
            console.error("AI總結流處理失敗:", summaryError.message);

            if (isClientConnected) {
              sendSSE("ai_summary_error", {
                assistant_message_id: assistantMessageId,
                error: `AI總結生成失敗: ${summaryError.message}`,
                conversation_id: conversationId,
                timestamp: Date.now(),
              });
            }
          }
        }

        // 🎯 智能圖表檢測（串流模式）
        let chartDetectionResult = null;
        try {
          console.log("🎯 [智能圖表檢測-串流] 開始檢測...", {
            conversationId,
            userInput: content,
            aiResponse: finalContent.substring(0, 200) + "...",
          });

          chartDetectionResult =
            await smartChartDetectionService.detectChartIntent(
              content, // 用戶輸入
              finalContent, // AI回應
              model // 🔧 傳遞模型配置，使用與用戶選擇相同的模型
            );

          console.log("🎯 [智能圖表檢測-串流] 檢測完成", {
            conversationId,
            hasChartData: chartDetectionResult?.hasChartData,
            confidence: chartDetectionResult?.confidence,
            chartType: chartDetectionResult?.chartType,
            dataLength: chartDetectionResult?.data?.length,
          });

          logger.info("智能圖表檢測結果（串流）", {
            conversationId,
            hasChartData: chartDetectionResult.hasChartData,
            confidence: chartDetectionResult.confidence,
            chartType: chartDetectionResult.chartType,
          });
        } catch (chartError) {
          console.error("🎯 [智能圖表檢測-串流] 檢測失敗", {
            conversationId,
            error: chartError.message,
            stack: chartError.stack,
          });

          logger.error("智能圖表檢測失敗（串流）", {
            conversationId,
            error: chartError.message,
          });
        }

        // 🎯 將圖表檢測結果添加到metadata中
        const finalMetadata = {
          ...toolCallMetadata,
          chart_detection: chartDetectionResult,
        };

        // 🎯 調試：記錄最終metadata
        if (chartDetectionResult?.hasChartData) {
          console.log("🎯 [智能圖表檢測-串流] 最終metadata:", {
            conversationId,
            chart_detection: finalMetadata.chart_detection,
          });
        }

        // 最終更新assistant訊息
        if (assistantMessageId) {
          // 獲取智能體信息（如果有）
          let agentInfo = null;
          if (conversation.agent_id) {
            const { rows: agentRows } = await query(
              "SELECT id, name, display_name FROM agents WHERE id = ?",
              [conversation.agent_id]
            );
            if (agentRows.length > 0) {
              agentInfo = agentRows[0];
            }
          }

          // 🎯 關鍵修復：如果有工具調用，不要覆蓋已經組裝好的內容
          let updateContent = finalContent;
          if (
            toolCallMetadata.has_tool_calls &&
            toolCallMetadata.tool_results &&
            toolCallMetadata.tool_results.some((r) => r.success)
          ) {
            // 有成功的工具調用時，保持現有內容不變
            // 因為前端已經通過SSE事件處理了內容組裝
            console.log(
              "🎯 有工具調用，跳過final content更新，避免覆蓋已組裝的內容"
            );

            // 只更新metadata和其他信息，不更新content
            await MessageModel.update(assistantMessageId, {
              tokens_used: chunk.tokens_used,
              cost: chunk.cost,
              processing_time: chunk.processing_time,
              metadata: finalMetadata,
              agent_id: conversation.agent_id,
              agent_name: agentInfo
                ? agentInfo.display_name || agentInfo.name
                : null,
              model_info: {
                provider: model.model_type,
                model: model.model_id,
                display_name: model.display_name,
                processing_time: chunk.processing_time,
                tokens_used: chunk.tokens_used,
                cost: chunk.cost,
              },
            });
          } else {
            // 沒有工具調用時，正常更新內容
            await MessageModel.update(assistantMessageId, {
              content: finalContent,
              tokens_used: chunk.tokens_used,
              cost: chunk.cost,
              processing_time: chunk.processing_time,
              metadata: finalMetadata,
              agent_id: conversation.agent_id,
              agent_name: agentInfo
                ? agentInfo.display_name || agentInfo.name
                : null,
              model_info: {
                provider: model.model_type,
                model: model.model_id,
                display_name: model.display_name,
                processing_time: chunk.processing_time,
                tokens_used: chunk.tokens_used,
                cost: chunk.cost,
              },
            });
          }
        }

        // 🎯 獲取更新後的完整消息（包含 metadata）
        const updatedMessage = await MessageModel.findById(assistantMessageId);

        // 發送完成事件
        sendSSE("stream_done", {
          assistant_message_id: assistantMessageId,
          full_content: finalContent,
          tokens_used: chunk.tokens_used,
          cost: chunk.cost,
          processing_time: chunk.processing_time,
          conversation_id: conversationId,
          // 🎯 包含完整的更新後消息（包含 chart_detection metadata）
          updated_message: updatedMessage,
          metadata: finalMetadata,
          // 🔧 修復：包含 Summary 使用標記，防止流式完成後丟失
          used_summary: toolCallMetadata.used_summary,
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

/**
 * 優化提示詞
 */
export const handleOptimizePrompt = catchAsync(async (req, res) => {
  // 輸入驗證
  const schema = Joi.object({
    prompt: Joi.string().required().min(1).max(2000).messages({
      "string.empty": "提示詞不能為空",
      "any.required": "提示詞是必填項",
      "string.max": "提示詞長度不能超過2000個字符",
    }),
    context: Joi.string().max(500).optional(),
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    throw new ValidationError("輸入驗證失敗", error.details);
  }

  const { prompt, context } = value;
  const { user } = req;

  logger.info("開始優化提示詞", {
    userId: user.id,
    promptLength: prompt.length,
    hasContext: !!context,
  });

  try {
    // 🔧 從環境變數讀取提示詞優化專用模型配置
    const targetModelId = process.env.PROMPT_OPTIMIZATION_MODEL_ID || 46;
    const targetModelName =
      process.env.PROMPT_OPTIMIZATION_MODEL_NAME || "qwen2.5:1.5b";

    logger.info("提示詞優化模型配置", {
      userId: user.id,
      targetModelId: targetModelId,
      targetModelName: targetModelName,
    });

    const { rows: modelRows } = await query(
      "SELECT * FROM ai_models WHERE id = ? AND is_active = TRUE",
      [targetModelId]
    );

    if (modelRows.length === 0) {
      // 🔧 如果指定 ID 的模型不存在，嘗試按模型名稱查找
      const { rows: fallbackModelRows } = await query(
        "SELECT * FROM ai_models WHERE model_id = ? AND is_active = TRUE",
        [targetModelName]
      );

      if (fallbackModelRows.length === 0) {
        throw new BusinessError(
          `優化提示詞專用模型不可用（ID: ${targetModelId}, 名稱: ${targetModelName}），請聯繫管理員檢查模型配置`
        );
      }

      // 使用 fallback 模型
      logger.warn("指定 ID 的模型不存在，使用名稱匹配的模型", {
        userId: user.id,
        fallbackModel: fallbackModelRows[0],
      });

      var model = fallbackModelRows[0];
    } else {
      var model = modelRows[0];
    }

    // 構建優化提示詞的系統提示（禁用思考模式，使用繁體中文）
    const systemPrompt = `/no_think 你是一個專業的提示詞優化專家。你的任務是幫助用戶優化他們的提示詞，使其更加清晰、具體和有效。請使用繁體中文回應。

優化原則：
1. 保持原意不變，但讓表達更準確
2. 增加必要的細節和具體要求
3. 使用更專業和精確的語言
4. 確保指令清晰易懂
5. 添加適當的格式要求或輸出結構
6. 所有優化內容都使用繁體中文

請以 JSON 格式回應，包含以下字段：
{
  "optimized_prompt": "優化後的提示詞（繁體中文）",
  "improvements": ["改進要點1", "改進要點2", "改進要點3"],
  "confidence": 0.95
}

注意：
- optimized_prompt 應該是完整的、可直接使用的提示詞，使用繁體中文
- improvements 應該列出具體的改進點（最多5個），使用繁體中文
- confidence 是你對優化結果的信心度（0-1之間的數值）
- 請確保回應是有效的 JSON 格式
- 所有內容都必須使用繁體中文`;

    // 構建用戶消息（禁用思考模式）
    let userMessage = `/no_think 請優化以下提示詞，並使用繁體中文回應：

原始提示詞：
${prompt}`;

    if (context) {
      userMessage += `

額外上下文：
${context}`;
    }

    // 準備AI調用參數
    const aiOptions = {
      provider: model.model_type,
      model: model.model_id,
      endpoint_url: model.endpoint_url,
      api_key: model.api_key_encrypted,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userMessage,
        },
      ],
      temperature: 0.3, // 使用較低的溫度確保穩定性
      max_tokens: 1500,
    };

    logger.info("調用AI進行提示詞優化", {
      userId: user.id,
      model: model.model_id,
      provider: model.model_type,
    });

    // 調用AI模型
    const aiResponse = await AIService.callModel(aiOptions);

    // AIService.callModel 直接返回結果對象，不是包裝在 success/error 中
    if (!aiResponse || !aiResponse.content) {
      throw new BusinessError(`AI模型調用失敗: 無效的回應`);
    }

    // 解析AI回應
    let optimizationResult;
    try {
      // 嘗試解析JSON回應
      const responseContent = aiResponse.content.trim();

      // 如果回應被包裹在代碼塊中，提取出來
      const jsonMatch = responseContent.match(
        /```(?:json)?\s*(\{[\s\S]*\})\s*```/
      );
      const jsonContent = jsonMatch ? jsonMatch[1] : responseContent;

      optimizationResult = JSON.parse(jsonContent);

      // 驗證必要字段
      if (!optimizationResult.optimized_prompt) {
        throw new Error("AI回應缺少優化後的提示詞");
      }

      // 設置默認值
      optimizationResult.improvements = optimizationResult.improvements || [];
      optimizationResult.confidence = optimizationResult.confidence || 0.8;
    } catch (parseError) {
      logger.warn("AI回應解析失敗，使用備用格式", {
        userId: user.id,
        parseError: parseError.message,
        aiResponse: aiResponse.content.substring(0, 200),
      });

      // 備用方案：直接使用AI回應作為優化結果
      optimizationResult = {
        optimized_prompt: aiResponse.content.trim(),
        improvements: ["AI提供了改進建議"],
        confidence: 0.7,
      };
    }

    // 記錄優化結果
    logger.info("提示詞優化完成", {
      userId: user.id,
      originalLength: prompt.length,
      optimizedLength: optimizationResult.optimized_prompt.length,
      confidence: optimizationResult.confidence,
      improvementsCount: optimizationResult.improvements.length,
    });

    // 返回結果
    res.json(
      createSuccessResponse(
        {
          original_prompt: prompt,
          optimized_prompt: optimizationResult.optimized_prompt,
          improvements: optimizationResult.improvements,
          confidence: optimizationResult.confidence,
          model_info: {
            id: model.id,
            name: model.display_name || model.model_id,
            display_name: model.display_name || model.model_id,
            provider: model.model_type,
          },
        },
        "提示詞優化成功"
      )
    );
  } catch (error) {
    logger.error("提示詞優化失敗", {
      userId: user.id,
      error: error.message,
      stack: error.stack,
    });

    if (error instanceof BusinessError || error instanceof ValidationError) {
      throw error;
    }

    throw new BusinessError("提示詞優化失敗，請稍後重試");
  }
});

/**
 * 獲取 MCP 服務狀態監控資訊
 */
export const handleGetMCPStatus = catchAsync(async (req, res) => {
  const { user } = req;

  logger.debug("獲取 MCP 服務狀態", {
    userId: user.id,
    userRole: user.role,
  });

  // 檢查權限（只有管理員可以查看）
  if (!["admin", "super_admin"].includes(user.role)) {
    throw new BusinessError("權限不足，只有管理員可以查看 MCP 服務狀態");
  }

  try {
    // 獲取健康檢查結果
    const healthResults = await mcpClient.healthCheck();

    // 獲取連接狀態
    const connectionStatuses = mcpClient.getConnectionStatuses();

    // 合併健康檢查和連接狀態數據
    const servicesStatus = connectionStatuses.map((status) => {
      const healthResult = healthResults.find(
        (h) => h.service_id === status.service_id
      );
      return {
        ...status,
        health_check: healthResult,
        is_healthy: healthResult?.success || false,
        response_time: healthResult?.response_time,
        last_health_check: healthResult?.timestamp,
      };
    });

    // 計算總體統計
    const totalServices = servicesStatus.length;
    const healthyServices = servicesStatus.filter((s) => s.is_healthy).length;
    const connectedServices = servicesStatus.filter((s) => s.connected).length;

    const statusSummary = {
      total_services: totalServices,
      healthy_services: healthyServices,
      connected_services: connectedServices,
      unhealthy_services: totalServices - healthyServices,
      disconnected_services: totalServices - connectedServices,
      overall_health_rate:
        totalServices > 0
          ? ((healthyServices / totalServices) * 100).toFixed(1)
          : 0,
      last_updated: new Date().toISOString(),
    };

    logger.info("MCP 服務狀態獲取成功", {
      userId: user.id,
      totalServices: totalServices,
      healthyServices: healthyServices,
      connectedServices: connectedServices,
    });

    res.json(
      createSuccessResponse(
        {
          summary: statusSummary,
          services: servicesStatus,
          health_results: healthResults,
          connection_statuses: connectionStatuses,
          timestamp: new Date().toISOString(),
        },
        "MCP 服務狀態獲取成功"
      )
    );
  } catch (error) {
    logger.error("獲取 MCP 服務狀態失敗", {
      userId: user.id,
      error: error.message,
      stack: error.stack,
    });
    throw new BusinessError(`獲取 MCP 服務狀態失敗: ${error.message}`);
  }
});

/**
 * 重新連接指定的 MCP 服務
 */
export const handleReconnectMCPService = catchAsync(async (req, res) => {
  const { user } = req;
  const { serviceId } = req.params;

  logger.debug("重新連接 MCP 服務", {
    userId: user.id,
    serviceId: serviceId,
  });

  // 檢查權限（只有管理員可以操作）
  if (!["admin", "super_admin"].includes(user.role)) {
    throw new BusinessError("權限不足，只有管理員可以操作 MCP 服務");
  }

  try {
    // 驗證服務 ID
    const serviceIdNum = parseInt(serviceId);
    if (isNaN(serviceIdNum)) {
      throw new ValidationError("無效的服務 ID");
    }

    // 重新連接服務
    await mcpClient.reconnectService(serviceIdNum);

    // 檢查重連後的狀態
    const isHealthy = await mcpClient.isServiceHealthy(serviceIdNum);

    logger.info("MCP 服務重新連接完成", {
      userId: user.id,
      serviceId: serviceIdNum,
      isHealthy: isHealthy,
    });

    res.json(
      createSuccessResponse(
        {
          service_id: serviceIdNum,
          reconnected: true,
          is_healthy: isHealthy,
          timestamp: new Date().toISOString(),
        },
        `MCP 服務 ${serviceIdNum} 重新連接${isHealthy ? "成功" : "完成，但服務仍不健康"}`
      )
    );
  } catch (error) {
    logger.error("重新連接 MCP 服務失敗", {
      userId: user.id,
      serviceId: serviceId,
      error: error.message,
    });
    throw new BusinessError(`重新連接 MCP 服務失敗: ${error.message}`);
  }
});

/**
 * 獲取訊息的完整內容
 */
const handleGetFullMessageContent = catchAsync(async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user.id;

  logger.info("獲取訊息完整內容", {
    messageId,
    userId,
  });

  try {
    // 首先驗證訊息是否存在且用戶有權限訪問
    const message = await MessageModel.findById(messageId);
    if (!message) {
      throw new BusinessError("訊息不存在", 404);
    }

    // 驗證用戶是否有權限訪問這個訊息
    const conversation = await ConversationModel.findById(
      message.conversation_id
    );
    if (!conversation || conversation.user_id !== userId) {
      throw new BusinessError("無權限訪問此訊息", 403);
    }

    // 獲取完整內容
    const fullContent = await MessageModel.getFullContent(messageId);

    res.json(
      createSuccessResponse({
        message: "獲取完整內容成功",
        data: fullContent,
      })
    );
  } catch (error) {
    logger.error("獲取訊息完整內容失敗", {
      messageId,
      userId,
      error: error.message,
    });
    throw error;
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
  handleOptimizePrompt,
  handleGetMCPStatus,
  handleReconnectMCPService,
  handleGetFullMessageContent,
};
