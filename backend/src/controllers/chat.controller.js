/**
 * 聊天控制器
 * 處理對話和訊息相關的業務邏輯
 */

import ConversationModel from "../models/Conversation.model.js";
import MessageModel from "../models/Message.model.js";
import AIService from "../services/ai.service.js";
import chatService from "../services/chat.service.js";
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
import { fixFilenameEncoding } from "../models/File.model.js";

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
    model_id: Joi.number().integer().optional(), // 允許指定不同的模型
    endpoint_url: Joi.string().uri().optional(), // 允許前端傳遞端點URL
    system_prompt: Joi.string().optional(), // 允許自定義系統提示詞
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
    title: title || null, // 不設置默認標題，等第一條消息後自動生成
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

  // 調試：檢查路由參數
  console.log("🔍 調試路由參數:", {
    conversationId,
    conversationIdType: typeof conversationId,
    params: req.params,
    url: req.url,
    method: req.method,
  });

  // 發送調試信息：開始處理
  const debugSession = {
    sessionId: `debug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    conversationId,
    userId: user.id,
    startTime: Date.now(),
    stages: [],
  };

  const sendDebugInfo = (stage, data) => {
    debugSession.stages.push({
      stage,
      timestamp: Date.now(),
      data,
    });

    // 嘗試通過 WebSocket 發送（如果有連接）
    try {
      sendToUser(user.id, {
        type: "debug_info",
        data: {
          sessionId: debugSession.sessionId,
          conversationId,
          stage,
          timestamp: Date.now(),
          ...data,
        },
      });
    } catch (error) {
      // WebSocket 發送失敗時忽略，調試信息會在響應中返回
    }
  };

  sendDebugInfo("start", {
    message: "開始處理聊天請求",
    userContent: content,
    parameters: {
      temperature,
      max_tokens,
      model_id: model_id || "使用對話默認模型",
    },
  });

  // 獲取對話信息
  logger.debug("查詢對話信息", {
    conversationId,
    userId: user.id,
    userRole: user.role,
  });

  const conversation = await ConversationModel.findById(conversationId);
  if (!conversation) {
    logger.error("對話不存在", { conversationId });
    throw new BusinessError("對話不存在");
  }

  logger.debug("對話信息獲取成功", {
    conversationId: conversation.id,
    conversationUserId: conversation.user_id,
    requestUserId: user.id,
  });

  // 檢查對話擁有權
  if (
    conversation.user_id !== user.id &&
    !["admin", "super_admin"].includes(user.role)
  ) {
    logger.error("權限檢查失敗", {
      conversationUserId: conversation.user_id,
      requestUserId: user.id,
      userRole: user.role,
    });
    throw new BusinessError("無權訪問此對話");
  }

  // 確定要使用的模型ID
  const targetModelId = model_id || conversation.model_id;

  // 獲取模型信息
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

  sendDebugInfo("model_selected", {
    message: "已選擇 AI 模型",
    model: {
      id: model.id,
      name: model.model_id,
      display_name: model.display_name,
      provider: model.model_type,
    },
  });

  // 創建用戶訊息
  logger.debug("創建用戶消息", {
    conversationId,
    contentLength: content.length,
    contentType: content_type,
  });

  // 調試：檢查創建用戶消息的參數
  console.log("🔍 調試用戶消息參數:", {
    conversation_id: conversationId,
    role: "user",
    content: content?.substring(0, 50) + "...",
    content_type: content_type,
    attachments: attachments,
    metadata: metadata,
    conversationIdType: typeof conversationId,
    contentType: typeof content,
    contentTypeType: typeof content_type,
  });

  const userMessage = await MessageModel.create({
    conversation_id: conversationId,
    role: "user",
    content: content,
    content_type: content_type || "text",
    attachments: attachments || null,
    metadata: metadata || null,
  });

  logger.debug("用戶消息創建成功", {
    messageId: userMessage?.id,
    conversationId,
  });

  logger.info("用戶訊息創建成功", {
    userId: user.id,
    conversationId: conversationId,
    messageId: userMessage.id,
  });

  try {
    // 獲取對話上下文
    sendDebugInfo("context_loading", {
      message: "正在獲取對話上下文",
    });

    // 調試：檢查 max_tokens 值
    console.log("🔍 調試 max_tokens:", {
      max_tokens,
      type: typeof max_tokens,
      calculation: max_tokens * 0.7,
      isNaN: isNaN(max_tokens * 0.7),
    });

    const maxContextTokens =
      max_tokens && !isNaN(max_tokens) ? max_tokens * 0.7 : 2800; // 默認值

    const contextMessages = await MessageModel.getContextMessages(
      conversationId,
      20,
      maxContextTokens
    );

    sendDebugInfo("context_loaded", {
      message: "對話上下文已載入",
      messageCount: contextMessages.length,
      contextPreview: contextMessages.slice(-3).map((msg) => ({
        role: msg.role,
        contentPreview:
          msg.content.substring(0, 100) +
          (msg.content.length > 100 ? "..." : ""),
      })),
    });

    // 添加系統提示詞
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

    sendDebugInfo("system_prompt_generating", {
      message: "正在生成系統提示詞",
      hasAgent: !!conversation.agent_id,
      agentId: conversation.agent_id,
      hasBasePrompt: !!baseSystemPrompt,
    });

    // 生成包含 MCP 工具資訊的動態系統提示詞
    const systemPromptContent = await chatService.generateSystemPrompt(
      baseSystemPrompt || "",
      {
        user_id: user.id,
        conversation_id: conversationId,
        model_type: model.model_type,
      }
    );

    sendDebugInfo("system_prompt_generated", {
      message: "系統提示詞已生成",
      promptLength: systemPromptContent?.length || 0,
      hasToolInfo: systemPromptContent?.includes("可用工具系統") || false,
      hasEmployeeTools:
        systemPromptContent?.includes("get_employee_info") || false,
      promptPreview:
        systemPromptContent?.substring(0, 500) +
          (systemPromptContent?.length > 500 ? "..." : "") || "",
    });

    // 準備AI調用參數
    const aiOptions = {
      provider: model.model_type,
      model: model.model_id,
      endpoint_url: model.endpoint_url,
      api_key: model.api_key_encrypted,
      messages: await Promise.all(
        contextMessages.map(async (msg) => {
          const formattedMessage = {
            role: msg.role,
            content: msg.content,
          };

          // 處理附件（特別是圖片）
          if (msg.attachments && msg.attachments.length > 0) {
            const attachmentContents = [];

            console.log(`=== 處理消息附件 ===`);
            console.log("消息ID:", msg.id);
            console.log("附件數量:", msg.attachments.length);
            console.log("當前模型類型:", model.model_type);
            console.log(
              "附件詳細信息:",
              JSON.stringify(msg.attachments, null, 2)
            );

            for (const attachment of msg.attachments) {
              // 修復檔案名稱編碼
              if (attachment.filename) {
                attachment.filename = fixFilenameEncoding(attachment.filename);
              }

              console.log("處理附件:", {
                id: attachment.id,
                filename: attachment.filename,
                mime_type: attachment.mime_type,
                file_size: attachment.file_size,
              });

              console.log("🔍 檢查附件類型條件:");
              console.log("  - mime_type:", attachment.mime_type);
              console.log("  - filename:", attachment.filename);
              console.log(
                "  - 是否為圖片:",
                attachment.mime_type?.startsWith("image/")
              );
              console.log(
                "  - 是否為文本 (startsWith):",
                attachment.mime_type?.startsWith("text/")
              );
              console.log(
                "  - 是否為 CSV (endsWith):",
                attachment.filename?.toLowerCase().endsWith(".csv")
              );

              // 檢查是否為圖片附件
              if (
                attachment.mime_type &&
                attachment.mime_type.startsWith("image/")
              ) {
                try {
                  // 獲取圖片文件信息
                  const { rows: fileRows } = await query(
                    "SELECT file_path, stored_filename FROM files WHERE id = ?",
                    [attachment.id]
                  );

                  console.log(`=== 處理圖片附件 ${attachment.id} ===`);
                  console.log("檔案查詢結果:", fileRows);

                  if (fileRows.length > 0) {
                    const filePath = fileRows[0].file_path;
                    console.log("圖片文件路徑:", filePath);

                    // 讀取圖片文件並轉換為base64
                    const fs = await import("fs/promises");

                    try {
                      const fileBuffer = await fs.readFile(filePath);
                      const base64Image = fileBuffer.toString("base64");
                      const mimeType = attachment.mime_type;

                      console.log(
                        "圖片讀取成功，base64長度:",
                        base64Image.length
                      );
                      console.log("MIME類型:", mimeType);

                      // 為多模態模型格式化圖片內容
                      if (model.model_type === "gemini") {
                        attachmentContents.push({
                          type: "image",
                          source: {
                            type: "base64",
                            media_type: mimeType,
                            data: base64Image,
                          },
                        });
                        console.log("已添加圖片到 Gemini 多模態內容");
                      } else if (model.model_type === "ollama") {
                        // Ollama 多模態格式（支援 llava, qwen2-vl 等視覺模型）
                        attachmentContents.push({
                          type: "image_url",
                          image_url: `data:${mimeType};base64,${base64Image}`,
                        });
                        console.log("已添加圖片到 Ollama 多模態內容");
                      }
                    } catch (fileError) {
                      console.error("讀取圖片文件失敗:", fileError);
                      logger.warn("無法讀取圖片文件", {
                        filePath,
                        error: fileError.message,
                        attachmentId: attachment.id,
                      });
                    }
                  } else {
                    console.warn("未找到檔案記錄:", attachment.id);
                  }
                } catch (dbError) {
                  console.error("查詢檔案信息失敗:", dbError);
                  logger.warn("無法獲取附件文件信息", {
                    attachmentId: attachment.id,
                    error: dbError.message,
                  });
                }
              }
              // 檢查是否為文本檔案（CSV、TXT、JSON 等）或 PDF
              else if (
                attachment.mime_type &&
                (attachment.mime_type.startsWith("text/") ||
                  attachment.mime_type === "application/json" ||
                  attachment.mime_type === "application/pdf" ||
                  attachment.filename.toLowerCase().endsWith(".csv") ||
                  attachment.filename.toLowerCase().endsWith(".txt") ||
                  attachment.filename.toLowerCase().endsWith(".md") ||
                  attachment.filename.toLowerCase().endsWith(".pdf"))
              ) {
                console.log("🔍 文本檔案/PDF條件匹配成功!");
                try {
                  // 獲取文本檔案信息
                  const { rows: fileRows } = await query(
                    "SELECT file_path, stored_filename FROM files WHERE id = ?",
                    [attachment.id]
                  );

                  console.log(`=== 處理文本檔案附件 ${attachment.id} ===`);
                  console.log("檔案查詢結果:", fileRows);
                  console.log("檔案類型:", attachment.mime_type);
                  console.log("檔案名稱:", attachment.filename);

                  if (fileRows.length > 0) {
                    const filePath = fileRows[0].file_path;
                    console.log("文本檔案路徑:", filePath);

                    // 根據檔案類型讀取內容
                    const fs = await import("fs/promises");
                    let fileContent = "";

                    try {
                      // 檢查是否為 PDF 檔案
                      if (
                        attachment.mime_type === "application/pdf" ||
                        attachment.filename.toLowerCase().endsWith(".pdf")
                      ) {
                        console.log("🔍 檢測到 PDF 檔案，使用 PDF 解析器");
                        const { extractPdfText } = await import(
                          "../services/pdf.service.js"
                        );
                        console.log("filePath:", filePath);
                        fileContent = await extractPdfText(filePath);
                      } else {
                        // 普通文本檔案
                        fileContent = await fs.readFile(filePath, "utf8");
                      }

                      console.log(
                        "檔案內容讀取成功，內容長度:",
                        fileContent.length
                      );
                      console.log(
                        "內容預覽:",
                        fileContent.substring(0, 200) + "..."
                      );

                      // 將檔案內容添加到消息中
                      const fileInfo = `

--- 檔案：${attachment.filename} ---
檔案類型：${attachment.mime_type}
檔案大小：${attachment.file_size} 位元組

檔案內容：
\`\`\`
${fileContent}
\`\`\`
--- 檔案結束 ---

`;

                      // 將檔案內容追加到消息內容中
                      if (typeof formattedMessage.content === "string") {
                        console.log("將檔案內容添加到文本消息中");
                        formattedMessage.content =
                          formattedMessage.content + fileInfo;
                      } else {
                        // 如果是多模態格式，添加到文本部分
                        if (Array.isArray(formattedMessage.content)) {
                          console.log("將檔案內容添加到多模態消息中");
                          const textPart = formattedMessage.content.find(
                            (part) => part.type === "text"
                          );
                          if (textPart) {
                            textPart.text = textPart.text + fileInfo;
                          }
                        }
                      }

                      console.log("✅ 已將文本檔案內容添加到消息中");
                      console.log(
                        "更新後的消息內容長度:",
                        typeof formattedMessage.content === "string"
                          ? formattedMessage.content.length
                          : formattedMessage.content[0]?.text?.length || 0
                      );
                    } catch (fileError) {
                      console.error("讀取文本檔案失敗:", fileError);
                      logger.warn("無法讀取文本檔案", {
                        filePath,
                        error: fileError.message,
                        attachmentId: attachment.id,
                      });
                    }
                  } else {
                    console.warn("未找到文本檔案記錄:", attachment.id);
                  }
                } catch (dbError) {
                  console.error("查詢文本檔案信息失敗:", dbError);
                  logger.warn("無法獲取文本檔案附件信息", {
                    attachmentId: attachment.id,
                    error: dbError.message,
                  });
                }
              }
            }

            // 如果有圖片內容，將消息轉換為多模態格式
            if (attachmentContents.length > 0) {
              console.log(`=== 轉換為多模態格式 (${model.model_type}) ===`);
              console.log("圖片內容數量:", attachmentContents.length);

              if (model.model_type === "gemini") {
                // Gemini格式：content是數組
                formattedMessage.content = [
                  {
                    type: "text",
                    text: msg.content,
                  },
                  ...attachmentContents,
                ];
                console.log("Gemini 多模態格式設置完成");
              } else if (model.model_type === "ollama") {
                // Ollama格式：保持OpenAI兼容的格式
                formattedMessage.content = [
                  {
                    type: "text",
                    text: msg.content,
                  },
                  ...attachmentContents,
                ];
                console.log("Ollama 多模態格式設置完成");
              }

              console.log("最終消息格式:", {
                role: formattedMessage.role,
                contentType: Array.isArray(formattedMessage.content)
                  ? "multimodal"
                  : "text",
                partCount: Array.isArray(formattedMessage.content)
                  ? formattedMessage.content.length
                  : 1,
              });
            } else {
              console.log("沒有可處理的圖片附件");
            }
          }

          return formattedMessage;
        })
      ),
      temperature: temperature || 0.7,
      max_tokens: max_tokens || 4096,
    };

    // 如果有系統提示詞，添加到消息開頭
    if (systemPromptContent) {
      aiOptions.messages.unshift({
        role: "system",
        content: systemPromptContent,
      });
    }

    sendDebugInfo("ai_calling", {
      message: "正在調用 AI 模型",
      finalMessagesCount: aiOptions.messages.length,
      systemPromptIncluded: aiOptions.messages[0]?.role === "system",
      lastUserMessage:
        content.substring(0, 200) + (content.length > 200 ? "..." : ""),
    });

    // 調用AI模型
    const aiResponse = await AIService.callModel(aiOptions);

    sendDebugInfo("ai_response_received", {
      message: "AI 模型回應已接收",
      provider: aiResponse.provider,
      model: aiResponse.model,
      responseLength: aiResponse.content.length,
      tokensUsed: aiResponse.tokens_used,
      processingTime: aiResponse.processing_time,
      responsePreview:
        aiResponse.content.substring(0, 300) +
        (aiResponse.content.length > 300 ? "..." : ""),
    });

    // 處理 AI 回應，包含 MCP 工具調用檢測和執行
    sendDebugInfo("tool_processing_start", {
      message: "開始處理工具調用檢測",
    });

    const chatResult = await chatService.processChatMessage(
      aiResponse.content,
      {
        user_id: user.id,
        conversation_id: conversationId,
        model_id: model.id,
        model_config: model,
        endpoint_url: model.endpoint_url,
        user_question: content, // 用戶的原始問題
        original_question: content,
      }
    );

    sendDebugInfo("tool_processing_complete", {
      message: "工具調用處理完成",
      hasToolCalls: chatResult.has_tool_calls,
      toolCallsCount: chatResult.tool_calls?.length || 0,
      toolResultsCount: chatResult.tool_results?.length || 0,
      usedSecondaryAI: chatResult.used_secondary_ai || false,
      toolCalls:
        chatResult.tool_calls?.map((call) => ({
          name: call.name,
          format: call.format,
          parameters: call.parameters,
        })) || [],
      toolResults:
        chatResult.tool_results?.map((result) => ({
          tool_name: result.tool_name,
          success: result.success,
          execution_time: result.execution_time,
          dataPreview:
            typeof result.data === "object"
              ? JSON.stringify(result.data).substring(0, 200) + "..."
              : String(result.data).substring(0, 200),
        })) || [],
    });

    // 使用處理後的回應內容
    const finalContent = chatResult.final_response || aiResponse.content;

    sendDebugInfo("final_response", {
      message: "最終回應已生成",
      finalLength: finalContent.length,
      isModified: finalContent !== aiResponse.content,
      finalPreview:
        finalContent.substring(0, 300) +
        (finalContent.length > 300 ? "..." : ""),
    });

    // 創建AI回應訊息（包含工具調用資訊）
    console.log("=== 創建 AI 訊息 ===");
    console.log("最終內容長度:", finalContent.length);
    console.log("即將存儲的 metadata:", {
      has_tool_calls: chatResult.has_tool_calls,
      tool_calls_count: chatResult.tool_calls?.length || 0,
      tool_results_count: chatResult.tool_results?.length || 0,
    });

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
        thinking_content:
          chatResult.thinking_content || aiResponse.thinking_content || null, // 添加思考內容
      },
    });

    console.log("=== AI 訊息創建完成 ===");
    console.log("訊息 ID:", assistantMessage.id);
    console.log(
      "訊息 metadata:",
      JSON.stringify(assistantMessage.metadata, null, 2)
    );

    logger.info("AI回應生成成功", {
      conversationId: conversationId,
      messageId: assistantMessage.id,
      tokens: aiResponse.tokens_used,
      cost: aiResponse.cost,
      processingTime: aiResponse.processing_time,
    });

    // 如果對話沒有標題，根據第一條用戶消息自動生成標題
    let updatedConversation = await ConversationModel.findById(conversationId);
    if (!updatedConversation.title) {
      // 生成標題：取用戶消息的前30個字符，去除換行符
      const autoTitle = content.replace(/\n/g, " ").trim().substring(0, 30);
      if (autoTitle) {
        await query(
          "UPDATE conversations SET title = ?, updated_at = NOW() WHERE id = ?",
          [autoTitle, conversationId]
        );
        // 重新獲取更新後的對話
        updatedConversation = await ConversationModel.findById(conversationId);
        logger.info("自動生成對話標題", {
          conversationId: conversationId,
          title: autoTitle,
        });
      }
    }

    // 調試：打印最終回應數據
    const responseData = {
      user_message: userMessage,
      assistant_message: assistantMessage,
      conversation: updatedConversation,
    };

    console.log("=== 最終回應數據調試 ===");
    console.log("用戶訊息 ID:", responseData.user_message?.id);
    console.log("AI 訊息 ID:", responseData.assistant_message?.id);
    console.log(
      "AI 訊息內容長度:",
      responseData.assistant_message?.content?.length
    );
    console.log("對話 ID:", responseData.conversation?.id);
    console.log("回應狀態: 準備發送給前端");
    console.log("=== 最終回應數據調試結束 ===\n");

    // 返回用戶訊息和AI回應
    console.log("=== 準備發送響應給前端 ===");
    console.log("responseData.assistant_message.metadata:", {
      has_tool_calls: responseData.assistant_message.metadata?.has_tool_calls,
      tool_calls_count:
        responseData.assistant_message.metadata?.tool_calls?.length || 0,
      tool_results_count:
        responseData.assistant_message.metadata?.tool_results?.length || 0,
    });
    console.log("=== 響應發送完成 ===");

    sendDebugInfo("complete", {
      message: "聊天請求處理完成",
      totalTime: Date.now() - debugSession.startTime,
      messageId: assistantMessage.id,
      success: true,
    });

    // 調試信息已移除以提升性能

    res.json(createSuccessResponse(responseData, "訊息發送成功"));
  } catch (aiError) {
    sendDebugInfo("error", {
      message: "AI 模型調用失敗",
      error: aiError.message,
      totalTime: Date.now() - debugSession.startTime,
    });

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
 * 支援 Server-Sent Events (SSE) 進行即時串流回應
 */
export const handleSendMessageStream = catchAsync(async (req, res) => {
  const { user } = req;
  const { conversationId } = req.params; // 從路由參數獲取
  const {
    content,
    content_type = "text",
    attachments,
    metadata,
    model_id,
    endpoint_url, // 前端傳遞的端點URL
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
      20, // 最多20條訊息
      max_tokens * 0.7 // 保留30%給回應
    );

    // 準備AI調用參數
    const aiOptions = {
      provider: model.model_type,
      model: model.model_id,
      endpoint_url: model.endpoint_url, // 使用資料庫中的 endpoint URL
      api_key: model.api_key_encrypted, // 使用資料庫中的 API key
      messages: await Promise.all(
        contextMessages.map(async (msg) => {
          const formattedMessage = {
            role: msg.role,
            content: msg.content,
          };

          // 處理附件（特別是圖片）
          if (msg.attachments && msg.attachments.length > 0) {
            const attachmentContents = [];

            console.log(`=== 處理消息附件 ===`);
            console.log("消息ID:", msg.id);
            console.log("附件數量:", msg.attachments.length);
            console.log("當前模型類型:", model.model_type);

            for (const attachment of msg.attachments) {
              // 修復檔案名稱編碼
              if (attachment.filename) {
                attachment.filename = fixFilenameEncoding(attachment.filename);
              }

              console.log("處理附件:", {
                id: attachment.id,
                filename: attachment.filename,
                mime_type: attachment.mime_type,
                file_size: attachment.file_size,
              });

              // 檢查是否為圖片附件
              if (
                attachment.mime_type &&
                attachment.mime_type.startsWith("image/")
              ) {
                try {
                  // 獲取圖片文件信息
                  const { rows: fileRows } = await query(
                    "SELECT file_path, stored_filename FROM files WHERE id = ?",
                    [attachment.id]
                  );

                  console.log(`=== 處理圖片附件 ${attachment.id} ===`);
                  console.log("檔案查詢結果:", fileRows);

                  if (fileRows.length > 0) {
                    const filePath = fileRows[0].file_path;
                    console.log("圖片文件路徑:", filePath);

                    // 讀取圖片文件並轉換為base64
                    const fs = await import("fs/promises");

                    try {
                      const fileBuffer = await fs.readFile(filePath);
                      const base64Image = fileBuffer.toString("base64");
                      const mimeType = attachment.mime_type;

                      console.log(
                        "圖片讀取成功，base64長度:",
                        base64Image.length
                      );
                      console.log("MIME類型:", mimeType);

                      // 為多模態模型格式化圖片內容
                      if (model.model_type === "gemini") {
                        attachmentContents.push({
                          type: "image",
                          source: {
                            type: "base64",
                            media_type: mimeType,
                            data: base64Image,
                          },
                        });
                        console.log("已添加圖片到 Gemini 多模態內容");
                      } else if (model.model_type === "ollama") {
                        // Ollama 多模態格式（支援 llava, qwen2-vl 等視覺模型）
                        attachmentContents.push({
                          type: "image_url",
                          image_url: `data:${mimeType};base64,${base64Image}`,
                        });
                        console.log("已添加圖片到 Ollama 多模態內容");
                      }
                    } catch (fileError) {
                      console.error("讀取圖片文件失敗:", fileError);
                      logger.warn("無法讀取圖片文件", {
                        filePath,
                        error: fileError.message,
                        attachmentId: attachment.id,
                      });
                    }
                  } else {
                    console.warn("未找到檔案記錄:", attachment.id);
                  }
                } catch (dbError) {
                  console.error("查詢檔案信息失敗:", dbError);
                  logger.warn("無法獲取附件文件信息", {
                    attachmentId: attachment.id,
                    error: dbError.message,
                  });
                }
              }
              // 檢查是否為文本檔案（CSV、TXT、JSON 等）或 PDF
              else if (
                attachment.mime_type &&
                (attachment.mime_type.startsWith("text/") ||
                  attachment.mime_type === "application/json" ||
                  attachment.mime_type === "application/pdf" ||
                  attachment.filename.toLowerCase().endsWith(".csv") ||
                  attachment.filename.toLowerCase().endsWith(".txt") ||
                  attachment.filename.toLowerCase().endsWith(".md") ||
                  attachment.filename.toLowerCase().endsWith(".pdf"))
              ) {
                console.log("🔍 串流模式：文本檔案/PDF條件匹配成功!");
                try {
                  // 獲取文本檔案信息
                  const { rows: fileRows } = await query(
                    "SELECT file_path, stored_filename FROM files WHERE id = ?",
                    [attachment.id]
                  );

                  console.log(
                    `=== 串流模式：處理文本檔案附件 ${attachment.id} ===`
                  );
                  console.log("檔案查詢結果:", fileRows);
                  console.log("檔案類型:", attachment.mime_type);
                  console.log("檔案名稱:", attachment.filename);

                  if (fileRows.length > 0) {
                    const filePath = fileRows[0].file_path;
                    console.log("文本檔案路徑:", filePath);

                    // 根據檔案類型讀取內容
                    const fs = await import("fs/promises");
                    let fileContent = "";

                    try {
                      // 檢查是否為 PDF 檔案
                      if (
                        attachment.mime_type === "application/pdf" ||
                        attachment.filename.toLowerCase().endsWith(".pdf")
                      ) {
                        console.log(
                          "🔍 串流模式：檢測到 PDF 檔案，使用 PDF 解析器"
                        );
                        const { extractPdfText } = await import(
                          "../services/pdf.service.js"
                        );
                        fileContent = await extractPdfText(filePath);
                      } else {
                        // 普通文本檔案
                        fileContent = await fs.readFile(filePath, "utf8");
                      }

                      console.log(
                        "串流模式：檔案內容讀取成功，內容長度:",
                        fileContent.length
                      );
                      console.log(
                        "內容預覽:",
                        fileContent.substring(0, 200) + "..."
                      );

                      // 將檔案內容添加到消息中
                      const fileInfo = `

--- 檔案：${attachment.filename} ---
檔案類型：${attachment.mime_type}
檔案大小：${attachment.file_size} 位元組

檔案內容：
\`\`\`
${fileContent}
\`\`\`
--- 檔案結束 ---

`;

                      // 將檔案內容追加到消息內容中
                      if (typeof formattedMessage.content === "string") {
                        console.log("串流模式：將檔案內容添加到文本消息中");
                        formattedMessage.content =
                          formattedMessage.content + fileInfo;
                      } else {
                        // 如果是多模態格式，添加到文本部分
                        if (Array.isArray(formattedMessage.content)) {
                          console.log("串流模式：將檔案內容添加到多模態消息中");
                          const textPart = formattedMessage.content.find(
                            (part) => part.type === "text"
                          );
                          if (textPart) {
                            textPart.text = textPart.text + fileInfo;
                          }
                        }
                      }

                      console.log("✅ 串流模式：已將文本檔案內容添加到消息中");
                      console.log(
                        "更新後的消息內容長度:",
                        typeof formattedMessage.content === "string"
                          ? formattedMessage.content.length
                          : formattedMessage.content[0]?.text?.length || 0
                      );
                    } catch (fileError) {
                      console.error("串流模式：讀取文本檔案失敗:", fileError);
                      logger.warn("無法讀取文本檔案", {
                        filePath,
                        error: fileError.message,
                        attachmentId: attachment.id,
                      });
                    }
                  } else {
                    console.warn(
                      "串流模式：未找到文本檔案記錄:",
                      attachment.id
                    );
                  }
                } catch (dbError) {
                  console.error("串流模式：查詢文本檔案信息失敗:", dbError);
                  logger.warn("無法獲取文本檔案附件信息", {
                    attachmentId: attachment.id,
                    error: dbError.message,
                  });
                }
              }
            }

            // 如果有圖片內容，將消息轉換為多模態格式
            if (attachmentContents.length > 0) {
              console.log(`=== 轉換為多模態格式 (${model.model_type}) ===`);
              console.log("圖片內容數量:", attachmentContents.length);

              if (model.model_type === "gemini") {
                // Gemini格式：content是數組
                formattedMessage.content = [
                  {
                    type: "text",
                    text: msg.content,
                  },
                  ...attachmentContents,
                ];
                console.log("Gemini 多模態格式設置完成");
              } else if (model.model_type === "ollama") {
                // Ollama格式：保持OpenAI兼容的格式
                formattedMessage.content = [
                  {
                    type: "text",
                    text: msg.content,
                  },
                  ...attachmentContents,
                ];
                console.log("Ollama 多模態格式設置完成");
              }

              console.log("最終消息格式:", {
                role: formattedMessage.role,
                contentType: Array.isArray(formattedMessage.content)
                  ? "multimodal"
                  : "text",
                partCount: Array.isArray(formattedMessage.content)
                  ? formattedMessage.content.length
                  : 1,
              });
            } else {
              console.log("沒有可處理的圖片附件");
            }
          }

          return formattedMessage;
        })
      ),
      temperature: temperature,
      max_tokens: max_tokens,
      stream: true, // 啟用串流模式
    };

    // 優先使用前端傳遞的 endpoint URL
    if (endpoint_url) {
      aiOptions.endpoint_url = endpoint_url;
    }

    // 添加系統提示詞（整合 MCP 工具資訊）
    let baseSystemPrompt = system_prompt;

    // 如果沒有自定義系統提示詞且有智能體，使用智能體的系統提示詞
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

    // 如果有系統提示詞，添加到消息開頭
    if (systemPromptContent) {
      aiOptions.messages.unshift({
        role: "system",
        content: systemPromptContent,
      });
    }

    logger.info("開始調用AI模型串流", {
      provider: model.model_type,
      model: model.model_id,
      messageCount: aiOptions.messages.length,
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
      // 檢查客戶端是否仍然連接
      if (!isClientConnected) {
        logger.info("客戶端已斷開，停止串流處理", { conversationId });
        break;
      }

      // 累積思考內容（如果有的話）
      if (chunk.thinking_content) {
        accumulatedThinkingContent = chunk.thinking_content;
        /*
        console.log(
          "=== 串流接收到思考內容 ===",
          accumulatedThinkingContent.substring(0, 100) + "..."
        );*/
      }

      if (chunk.type === "thinking") {
        // 🔧 新增：處理即時思考內容
        accumulatedThinkingContent = chunk.thinking_content;
        /*
        console.log(
          "🧠 即時思考內容更新:",
          chunk.thinking_delta?.substring(0, 50) + "...",
          "累積長度:",
          accumulatedThinkingContent.length
        );
        */

        // 確保有 assistant 消息 ID
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

          // 發送 assistant_message_created 事件
          sendSSE("assistant_message_created", {
            assistant_message_id: assistantMessageId,
            conversation_id: conversationId,
          });
        }

        // 🔧 立即發送思考內容更新
        const sent = sendSSE("stream_content", {
          content: "", // 思考階段沒有正式內容
          full_content: fullContent,
          thinking_content: accumulatedThinkingContent, // 即時思考內容
          thinking_delta: chunk.thinking_delta, // 新增的思考內容
          tokens_used: chunk.tokens_used,
          assistant_message_id: assistantMessageId,
        });

        if (!sent) {
          logger.info("思考內容SSE發送失敗，停止串流處理", { conversationId });
          break;
        }
      } else if (chunk.type === "content") {
        fullContent = chunk.full_content || fullContent + chunk.content;

        // 🔧 修復：如果是第一個內容塊，先創建assistant訊息記錄
        if (!assistantMessageId) {
          const assistantMessage = await MessageModel.create({
            conversation_id: conversationId,
            role: "assistant",
            content: fullContent,
            content_type: "text",
            tokens_used: chunk.tokens_used,
            model_info: { provider: chunk.provider, model: chunk.model },
            processing_time: null, // 串流模式下會在最後更新
          });
          assistantMessageId = assistantMessage.id;

          // 🔧 修復：先發送 assistant_message_created 事件
          sendSSE("assistant_message_created", {
            assistant_message_id: assistantMessageId,
            conversation_id: conversationId,
          });
        }

        // 🔧 修復：然後發送串流內容（確保前端已有 assistant 消息）
        const sent = sendSSE("stream_content", {
          content: chunk.content,
          full_content: fullContent,
          thinking_content: accumulatedThinkingContent, // 包含思考內容
          tokens_used: chunk.tokens_used,
          assistant_message_id: assistantMessageId,
        });

        // 如果發送失敗，說明客戶端已斷開
        if (!sent) {
          logger.info("SSE發送失敗，停止串流處理", { conversationId });
          break;
        }

        // 更新 assistant 訊息
        if (assistantMessageId) {
          await MessageModel.update(assistantMessageId, {
            content: fullContent,
            tokens_used: chunk.tokens_used,
          });
        }
      } else if (chunk.type === "done") {
        finalStats = chunk;

        // 🔧 處理工具調用 - 在串流完成後檢測和執行工具調用
        let finalContent = chunk.full_content;
        let finalThinkingContent =
          accumulatedThinkingContent || chunk.thinking_content;
        let toolCallMetadata = {
          has_tool_calls: false,
          tool_calls: [],
          tool_results: [],
          used_secondary_ai: false,
          original_response: chunk.full_content,
          thinking_content: finalThinkingContent, // 使用累積的思考內容
        };

        try {
          console.log("=== 串流模式：開始處理工具調用 ===");
          console.log("累積的思考內容長度:", finalThinkingContent?.length || 0);

          // 🔧 新增：在開始工具處理前發送處理狀態
          if (isClientConnected) {
            sendSSE("tool_processing_start", {
              assistant_message_id: assistantMessageId,
              message: "正在檢查並處理工具調用...",
              conversation_id: conversationId,
            });
          }

          // 🔧 包裝工具調用處理，添加心跳機制
          const toolCallPromise = chatService.processChatMessage(
            chunk.full_content,
            {
              user_id: user.id,
              conversation_id: conversationId,
              model_id: model.id,
              model_config: model,
              endpoint_url: model.endpoint_url,
              user_question: content, // 用戶的原始問題
              original_question: content,
              // 🚀 添加回調，通知前端二次調用開始
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

          // 🔧 添加心跳機制：每3秒發送一次心跳
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

          // 🔧 等待工具調用完成
          const chatResult = await toolCallPromise;

          // 清除心跳
          clearInterval(heartbeatInterval);

          console.log("串流模式工具調用結果:", {
            has_tool_calls: chatResult.has_tool_calls,
            tool_calls_count: chatResult.tool_calls?.length || 0,
            tool_results_count: chatResult.tool_results?.length || 0,
            has_thinking_content: !!chatResult.thinking_content,
            stream_thinking_content: !!finalThinkingContent,
          });

          // 更新最終內容（無論是否有工具調用）
          finalContent = chatResult.final_response || chunk.full_content;

          // 優先使用串流中的思考內容，如果沒有則使用chat service提取的
          if (!finalThinkingContent && chatResult.thinking_content) {
            finalThinkingContent = chatResult.thinking_content;
          }

          // 如果有工具調用，使用處理後的回應
          if (chatResult.has_tool_calls) {
            toolCallMetadata = {
              has_tool_calls: chatResult.has_tool_calls,
              tool_calls: chatResult.tool_calls || [],
              tool_results: chatResult.tool_results || [],
              used_secondary_ai: chatResult.used_secondary_ai || false,
              original_response: chatResult.original_response,
              thinking_content: finalThinkingContent, // 使用最終的思考內容
            };

            // 發送工具調用信息
            if (isClientConnected) {
              sendSSE("tool_calls_processed", {
                assistant_message_id: assistantMessageId,
                tool_calls: toolCallMetadata.tool_calls,
                tool_results: toolCallMetadata.tool_results,
                has_tool_calls: toolCallMetadata.has_tool_calls,
                thinking_content: finalThinkingContent, // 發送最終的思考內容
                conversation_id: conversationId,
              });
            }
          } else if (finalThinkingContent) {
            // 即使沒有工具調用，如果有思考內容也要發送
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

          // 🔧 發送工具處理錯誤事件
          if (isClientConnected) {
            sendSSE("tool_processing_error", {
              assistant_message_id: assistantMessageId,
              error: `工具處理失敗: ${toolError.message}`,
              conversation_id: conversationId,
            });
          }

          // 工具調用失敗時，繼續使用原始回應，但保留思考內容
          toolCallMetadata.thinking_content = finalThinkingContent;
        }

        // 最終更新assistant訊息（包含工具調用結果）
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

        // 發送完成事件（包含工具調用信息）
        sendSSE("stream_done", {
          assistant_message_id: assistantMessageId,
          full_content: finalContent,
          tokens_used: chunk.tokens_used,
          cost: chunk.cost,
          processing_time: chunk.processing_time,
          conversation_id: conversationId,
          // 🔧 添加工具調用信息
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

    // 如果對話沒有標題，根據第一條用戶消息自動生成標題
    let updatedConversation = await ConversationModel.findById(conversationId);
    if (!updatedConversation.title) {
      // 生成標題：取用戶消息的前30個字符，去除換行符
      const autoTitle = content.replace(/\n/g, " ").trim().substring(0, 30);
      if (autoTitle) {
        await query(
          "UPDATE conversations SET title = ?, updated_at = NOW() WHERE id = ?",
          [autoTitle, conversationId]
        );
        // 重新獲取更新後的對話
        updatedConversation = await ConversationModel.findById(conversationId);
        logger.info("自動生成對話標題（串流模式）", {
          conversationId: conversationId,
          title: autoTitle,
        });
      }
    }

    // 發送最終對話狀態（只有在客戶端仍連接時）
    if (isClientConnected) {
      sendSSE("conversation_updated", {
        conversation: updatedConversation,
      });
    }

    // 結束SSE連接
    if (isClientConnected) {
      res.end();
    }
  } catch (error) {
    logger.error("串流聊天失敗", {
      conversationId: conversationId,
      error: error.message,
      stack: error.stack,
    });

    // 發送錯誤事件
    sendSSE("error", {
      error: `AI模型調用失敗: ${error.message}`,
      conversation_id: conversationId,
    });

    // 創建錯誤訊息記錄
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
