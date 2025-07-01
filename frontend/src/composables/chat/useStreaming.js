/**
 * 串流處理 Composable
 * 處理串流聊天、SSE事件、打字機動畫等功能
 */

import { ref } from "vue";
import { message } from "ant-design-vue";
import { useConfigStore } from "@/stores/config";

export function useStreaming(
  conversationState,
  messageState,
  textConversionState
) {
  // 串流狀態
  const isStreaming = ref(false);
  const streamController = ref(null);
  const streamingMessageId = ref(null);

  /**
   * 發送訊息（串流模式）
   * 支援 ChatGPT 風格的逐字顯示效果
   */
  const sendMessageStream = async (conversationId, content, options = {}) => {
    const {
      model_id,
      temperature,
      max_tokens,
      system_prompt,
      content_type = "text",
      attachments,
      metadata,
    } = options;

    try {
      messageState.isSendingMessage.value = true;
      isStreaming.value = true;
      messageState.aiTyping.value = true;

      const requestBody = {
        conversation_id: conversationId,
        content,
        content_type,
        attachments,
        metadata,
        model_id,
        endpoint_url: options.endpoint_url,
        temperature,
        max_tokens,
        system_prompt,
      };

      // 獲取認證token
      const authToken =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      if (!authToken) {
        throw new Error("未找到認證token");
      }

      // 獲取正確的 API base URL
      const configStore = useConfigStore();
      if (!configStore.isLoaded) {
        await configStore.loadConfig();
      }

      // 創建 AbortController 用於停止串流
      const controller = new AbortController();
      streamController.value = controller;

      // 增加超時時間以應對工具調用延遲
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.log("=== 串流請求超時，已中止連接 ===");
        message.warning("請求超時，可能是網絡問題或工具調用時間過長");
      }, 600000); // 10分鐘超時

      const streamUrl = `${configStore.apiBaseUrl}/api/chat/conversations/${conversationId}/messages/stream`;

      const response = await fetch(streamUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      // 清除超時計時器
      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMsg = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
        } catch (e) {
          // 如果無法解析 JSON，使用預設錯誤訊息
        }
        throw new Error(errorMsg);
      }

      // 處理 SSE 串流
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      let currentAssistantMessage = null;
      let streamingContent = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          console.log("🏁 SSE 串流讀取結束");

          // 確保串流狀態被清除（防止狀態殘留）
          setTimeout(() => {
            if (isStreaming.value) {
              console.log("⚠️ 檢測到串流狀態未清除，強制清除");
              isStreaming.value = false;
              messageState.isSendingMessage.value = false;
              messageState.aiTyping.value = false;
              streamController.value = null;
            }
          }, 1000);

          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");

        // 保留最後一個可能不完整的行
        buffer = lines.pop() || "";

        let currentEventType = null;

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEventType = line.slice(7).trim();
            continue;
          }

          if (line.startsWith("data: ")) {
            const jsonStr = line.slice(6).trim();

            if (jsonStr && currentEventType) {
              try {
                const data = JSON.parse(jsonStr);

                // 處理不同類型的 SSE 事件
                await handleSSEEvent(data, currentEventType, {
                  conversationId,
                  currentAssistantMessage: (msg) => {
                    currentAssistantMessage = msg;
                  },
                  updateStreamingContent: (content) => {
                    streamingContent = content;
                  },
                });

                // 重置事件類型
                currentEventType = null;
              } catch (parseError) {
                console.warn(
                  "SSE 數據解析錯誤:",
                  parseError.message,
                  "數據:",
                  jsonStr
                );
              }
            }
          }
        }
      }
    } catch (err) {
      if (err.name === "AbortError") {
        message.info("對話已停止");
      } else {
        console.error("錯誤:", err.message);
        console.error("堆疊:", err.stack);
        message.error(err.message || "串流聊天失敗");
        throw err;
      }
    } finally {
      messageState.isSendingMessage.value = false;
      isStreaming.value = false;
      messageState.aiTyping.value = false;
      streamController.value = null;
    }
  };

  /**
   * 停止當前串流
   */
  const stopCurrentStream = () => {
    if (streamController.value && isStreaming.value) {
      streamController.value.abort();
      console.log("=== 用戶手動停止串流 ===");
    }
  };

  /**
   * 打字機動畫效果
   */
  const animateTyping = (messageIndex, currentContent, targetContent) => {
    // 如果已經有動畫在進行，先清除
    if (messageState.messages.value[messageIndex].typingTimer) {
      clearTimeout(messageState.messages.value[messageIndex].typingTimer);
    }

    const startIndex = currentContent.length;
    const endIndex = targetContent.length;

    // 如果沒有新內容要添加，直接返回
    if (startIndex >= endIndex) {
      messageState.messages.value[messageIndex].content = targetContent;
      return;
    }

    let currentIndex = startIndex;

    const typeNextChar = () => {
      if (currentIndex < endIndex) {
        // 逐字符添加
        messageState.messages.value[messageIndex].content =
          targetContent.substring(0, currentIndex + 1);
        currentIndex++;

        // 設置下一個字符的延遲（調整這個值來控制打字速度）
        const delay = Math.random() * 30 + 10; // 10-40ms 隨機延遲，模擬真實打字
        messageState.messages.value[messageIndex].typingTimer = setTimeout(
          typeNextChar,
          delay
        );
      } else {
        // 動畫完成，清除計時器
        delete messageState.messages.value[messageIndex].typingTimer;
      }
    };

    // 開始打字動畫
    typeNextChar();
  };

  /**
   * 處理 SSE 事件
   */
  const handleSSEEvent = async (data, eventType, context) => {
    const { conversationId, currentAssistantMessage, updateStreamingContent } =
      context;

    switch (eventType) {
      case "user_message":
        // 用戶訊息創建成功
        if (
          conversationState.currentConversation.value &&
          conversationState.currentConversation.value.id === conversationId
        ) {
          messageState.messages.value.push(data.user_message);
        }
        break;

      case "assistant_message_created":
        // AI 助手訊息記錄已創建
        streamingMessageId.value = data.assistant_message_id;

        // 創建新的 AI 訊息對象，準備接收串流內容
        const newAssistantMessage = {
          id: data.assistant_message_id,
          conversation_id: conversationId,
          role: "assistant",
          content: "",
          content_type: "text",
          tokens_used: 0,
          created_at: new Date().toISOString(),
          isStreaming: true,
        };

        // 添加到當前對話的訊息列表
        if (
          conversationState.currentConversation.value &&
          conversationState.currentConversation.value.id === conversationId
        ) {
          messageState.messages.value.push(newAssistantMessage);
        }

        // 更新當前助手訊息引用
        currentAssistantMessage(newAssistantMessage);
        break;

      case "stream_content":
        // 串流內容更新
        const streamMessage = messageState.messages.value.find(
          (msg) => msg.id === data.assistant_message_id
        );

        if (streamMessage) {
          // 找到消息在數組中的索引（用於打字機動畫）
          const messageIndex = messageState.messages.value.findIndex(
            (msg) => msg.id === data.assistant_message_id
          );

          // 處理思考內容的即時顯示
          if (data.thinking_content !== undefined) {
            // 應用文字轉換後更新思考內容
            const convertedThinkingContent =
              textConversionState.isTextConverterEnabled.value &&
              textConversionState.convertStreamContent
                ? textConversionState.convertStreamContent(
                    data.thinking_content,
                    textConversionState.textConversionMode.value
                  )
                : data.thinking_content;

            streamMessage.thinking_content = convertedThinkingContent;
          }

          // 檢查是否有工具調用或工具結果，如果有則跳過原始AI內容顯示
          const hasToolActivity =
            streamMessage.isProcessingTools ||
            streamMessage.toolResultSections ||
            streamMessage.isGeneratingSummary ||
            streamMessage.finalContent;

          // 處理主要內容的即時顯示（使用打字機效果）
          if (
            data.content !== undefined &&
            messageIndex !== -1 &&
            !hasToolActivity
          ) {
            const currentContent = streamMessage.content || "";

            // 對 AI 回應內容也應用文字轉換
            const convertedContent =
              textConversionState.isTextConverterEnabled.value &&
              textConversionState.convertStreamContent
                ? textConversionState.convertStreamContent(
                    data.content,
                    textConversionState.textConversionMode.value
                  )
                : data.content;

            const newContent = convertedContent;

            // 如果有新內容，使用打字機動畫
            if (newContent.length > currentContent.length) {
              animateTyping(messageIndex, currentContent, newContent);
            } else {
              // 如果內容沒有增加，直接更新
              streamMessage.content = newContent;
            }
          }

          // 只在沒有工具活動時更新完整內容
          if (data.full_content !== undefined && !hasToolActivity) {
            // 對完整內容也應用文字轉換
            const convertedFullContent =
              textConversionState.isTextConverterEnabled.value &&
              textConversionState.convertStreamContent
                ? textConversionState.convertStreamContent(
                    data.full_content,
                    textConversionState.textConversionMode.value
                  )
                : data.full_content;

            streamMessage.full_content = convertedFullContent;
          }

          // 更新其他屬性
          if (data.tokens_used !== undefined) {
            streamMessage.tokens_used = data.tokens_used;
          }
          if (data.cost !== undefined) {
            streamMessage.cost = data.cost;
          }
          if (data.processing_time !== undefined) {
            streamMessage.processing_time = data.processing_time;
          }

          // 確保消息仍在流式狀態
          streamMessage.isStreaming = true;
          streamingMessageId.value = data.assistant_message_id;
        }
        break;

      case "stream_done":
        // 串流完成
        console.log("🏁 串流完成事件:", data);

        // 強制清除全局串流狀態
        isStreaming.value = false;
        messageState.isSendingMessage.value = false;
        messageState.aiTyping.value = false;
        streamController.value = null;

        // 清除當前串流的消息 ID
        if (streamingMessageId.value === data.assistant_message_id) {
          streamingMessageId.value = null;
        }

        // 更新最終訊息狀態
        const finalMessageIndex = messageState.messages.value.findIndex(
          (msg) => msg.id === data.assistant_message_id
        );

        if (finalMessageIndex !== -1) {
          // 清除打字機動畫計時器
          if (messageState.messages.value[finalMessageIndex].typingTimer) {
            clearTimeout(
              messageState.messages.value[finalMessageIndex].typingTimer
            );
            delete messageState.messages.value[finalMessageIndex].typingTimer;
          }

          // 確保清除所有處理狀態
          messageState.messages.value[finalMessageIndex].isProcessingTools =
            false;
          messageState.messages.value[finalMessageIndex].toolProcessingMessage =
            null;
          messageState.messages.value[finalMessageIndex].toolProcessingError =
            null;
          messageState.messages.value[finalMessageIndex].isOptimizing = false;
          messageState.messages.value[finalMessageIndex].optimizingMessage =
            null;
          messageState.messages.value[finalMessageIndex].isStreamingSecondary =
            false;

          // 處理工具結果分段狀態
          if (
            messageState.messages.value[finalMessageIndex].toolResultSections
          ) {
            messageState.messages.value[finalMessageIndex].finalContent = true;
          }

          // 保存現有的思考內容
          const existingThinkingContent =
            messageState.messages.value[finalMessageIndex].thinking_content;

          // 檢查是否有工具活動，決定是否更新內容
          const hasToolActivity =
            messageState.messages.value[finalMessageIndex].toolResultSections ||
            messageState.messages.value[finalMessageIndex]
              .isGeneratingSummary ||
            messageState.messages.value[finalMessageIndex].finalContent;

          let finalConvertedContent = null;

          // 只有在沒有工具活動時才更新內容，避免覆蓋工具結果
          if (!hasToolActivity && data.full_content) {
            finalConvertedContent =
              textConversionState.isTextConverterEnabled.value &&
              textConversionState.convertStreamContent
                ? textConversionState.convertStreamContent(
                    data.full_content,
                    textConversionState.textConversionMode.value
                  )
                : data.full_content;
          }

          // 如果有updated_message，使用完整的更新後消息信息
          if (data.updated_message) {
            // 保留當前的串流狀態相關字段
            const currentImportantFields = {
              isStreaming:
                messageState.messages.value[finalMessageIndex].isStreaming,
              typingTimer:
                messageState.messages.value[finalMessageIndex].typingTimer,
              used_summary:
                messageState.messages.value[finalMessageIndex].used_summary,
              toolResultSections:
                messageState.messages.value[finalMessageIndex]
                  .toolResultSections,
              isGeneratingSummary:
                messageState.messages.value[finalMessageIndex]
                  .isGeneratingSummary,
              finalContent:
                messageState.messages.value[finalMessageIndex].finalContent,
            };

            // 準備更新對象
            const updateObject = {
              isStreaming: false,
              used_summary: currentImportantFields.used_summary,
              toolResultSections: currentImportantFields.toolResultSections,
              isGeneratingSummary: currentImportantFields.isGeneratingSummary,
              finalContent: currentImportantFields.finalContent,
            };

            // 只有在沒有工具活動且有最終內容時才更新 content
            if (!hasToolActivity && finalConvertedContent !== null) {
              updateObject.content = finalConvertedContent;
            } else if (
              hasToolActivity &&
              currentImportantFields.content !== undefined
            ) {
              updateObject.content = currentImportantFields.content;
            }

            // 用updated_message的數據覆蓋，但保留重要字段
            Object.assign(
              messageState.messages.value[finalMessageIndex],
              data.updated_message,
              updateObject
            );

            // 清除typingTimer
            if (currentImportantFields.typingTimer) {
              clearTimeout(currentImportantFields.typingTimer);
              delete messageState.messages.value[finalMessageIndex].typingTimer;
            }
          } else {
            // 原有的更新邏輯
            if (!hasToolActivity && finalConvertedContent !== null) {
              messageState.messages.value[finalMessageIndex].content =
                finalConvertedContent;
            }

            messageState.messages.value[finalMessageIndex].tokens_used =
              data.tokens_used;
            messageState.messages.value[finalMessageIndex].cost = data.cost;
            messageState.messages.value[finalMessageIndex].processing_time =
              data.processing_time;
            messageState.messages.value[finalMessageIndex].isStreaming = false;

            // 更新 metadata
            if (data.metadata) {
              messageState.messages.value[finalMessageIndex].metadata = {
                ...messageState.messages.value[finalMessageIndex].metadata,
                ...data.metadata,
              };
            }

            // 處理 stream_done 事件中的 used_summary
            if (data.used_summary !== undefined) {
              messageState.messages.value[finalMessageIndex].used_summary =
                data.used_summary;
              if (!messageState.messages.value[finalMessageIndex].metadata) {
                messageState.messages.value[finalMessageIndex].metadata = {};
              }
              messageState.messages.value[
                finalMessageIndex
              ].metadata.used_summary = data.used_summary;
            }
          }

          // 保留思考內容
          if (existingThinkingContent) {
            messageState.messages.value[finalMessageIndex].thinking_content =
              existingThinkingContent;
          }
        }
        break;

      case "tool_calls_processed":
        // 工具調用處理完成
        console.log("工具調用處理完成:", data);
        const toolMessageIndex = messageState.messages.value.findIndex(
          (msg) => msg.id === data.assistant_message_id
        );

        if (toolMessageIndex !== -1) {
          const existingThinkingContent =
            messageState.messages.value[toolMessageIndex].thinking_content;

          // 添加工具調用相關信息
          messageState.messages.value[toolMessageIndex].tool_calls =
            data.tool_calls || [];
          messageState.messages.value[toolMessageIndex].tool_results =
            data.tool_results || [];
          messageState.messages.value[toolMessageIndex].has_tool_calls =
            data.has_tool_calls || false;

          // 保存調試信息
          if (data.debug_info) {
            messageState.messages.value[toolMessageIndex].debug_info =
              data.debug_info;
          }

          // 保存 Summary 使用標記
          if (data.used_summary !== undefined) {
            messageState.messages.value[toolMessageIndex].used_summary =
              data.used_summary;
          }

          // 更新 metadata 中的工具調用信息
          if (!messageState.messages.value[toolMessageIndex].metadata) {
            messageState.messages.value[toolMessageIndex].metadata = {};
          }
          messageState.messages.value[toolMessageIndex].metadata.tool_calls =
            data.tool_calls || [];
          messageState.messages.value[toolMessageIndex].metadata.tool_results =
            data.tool_results || [];
          messageState.messages.value[
            toolMessageIndex
          ].metadata.has_tool_calls = data.has_tool_calls || false;

          if (data.debug_info) {
            messageState.messages.value[toolMessageIndex].metadata.debug_info =
              data.debug_info;
          }

          if (data.used_summary !== undefined) {
            messageState.messages.value[
              toolMessageIndex
            ].metadata.used_summary = data.used_summary;
          }

          // 清除工具處理狀態
          messageState.messages.value[toolMessageIndex].isProcessingTools =
            false;
          messageState.messages.value[toolMessageIndex].toolProcessingMessage =
            null;
          messageState.messages.value[toolMessageIndex].toolProcessingError =
            null;

          // 清除二次調用優化狀態
          messageState.messages.value[toolMessageIndex].isOptimizing = false;
          messageState.messages.value[toolMessageIndex].optimizingMessage =
            null;

          // 添加思考內容
          if (data.thinking_content) {
            const convertedContent =
              textConversionState.isTextConverterEnabled.value &&
              textConversionState.convertContent
                ? textConversionState.convertContent(
                    data.thinking_content,
                    textConversionState.textConversionMode.value
                  )
                : data.thinking_content;

            messageState.messages.value[toolMessageIndex].thinking_content =
              convertedContent;
          } else if (existingThinkingContent) {
            messageState.messages.value[toolMessageIndex].thinking_content =
              existingThinkingContent;
          }
        }
        break;

      case "thinking_content_processed":
        // 思考內容處理完成
        const thinkingMessageIndex = messageState.messages.value.findIndex(
          (msg) => msg.id === data.assistant_message_id
        );

        if (thinkingMessageIndex !== -1) {
          const existingThinkingContent =
            messageState.messages.value[thinkingMessageIndex].thinking_content;

          if (data.thinking_content) {
            const convertedContent =
              textConversionState.isTextConverterEnabled.value &&
              textConversionState.convertContent
                ? textConversionState.convertContent(
                    data.thinking_content,
                    textConversionState.textConversionMode.value
                  )
                : data.thinking_content;

            messageState.messages.value[thinkingMessageIndex].thinking_content =
              convertedContent;
          } else if (existingThinkingContent) {
            messageState.messages.value[thinkingMessageIndex].thinking_content =
              existingThinkingContent;
          }
        }
        break;

      case "tool_processing_start":
        // 工具處理開始事件
        const startProcessingMessageIndex =
          messageState.messages.value.findIndex(
            (msg) => msg.id === data.assistant_message_id
          );

        if (startProcessingMessageIndex !== -1) {
          messageState.messages.value[
            startProcessingMessageIndex
          ].isProcessingTools = true;
          messageState.messages.value[
            startProcessingMessageIndex
          ].toolProcessingMessage = data.message;
          // 清除已有的原始AI內容，準備顯示工具結果
          messageState.messages.value[startProcessingMessageIndex].content = "";
        }
        break;

      case "tool_processing_heartbeat":
        // 工具處理心跳事件
        const heartbeatMessageIndex = messageState.messages.value.findIndex(
          (msg) => msg.id === data.assistant_message_id
        );

        if (heartbeatMessageIndex !== -1) {
          messageState.messages.value[
            heartbeatMessageIndex
          ].toolProcessingMessage = data.message;
          messageState.messages.value[heartbeatMessageIndex].lastHeartbeat =
            data.timestamp;

          if (data.progress !== undefined) {
            messageState.messages.value[heartbeatMessageIndex].progress =
              data.progress;
          }
        }
        break;

      case "tool_processing_error":
        // 工具處理錯誤事件
        const errorProcessingMessageIndex =
          messageState.messages.value.findIndex(
            (msg) => msg.id === data.assistant_message_id
          );

        if (errorProcessingMessageIndex !== -1) {
          messageState.messages.value[
            errorProcessingMessageIndex
          ].isProcessingTools = false;
          messageState.messages.value[
            errorProcessingMessageIndex
          ].toolProcessingError = data.error;
          messageState.messages.value[
            errorProcessingMessageIndex
          ].toolProcessingMessage = null;
        }
        break;

      case "tool_result_section":
        // 工具結果分段串流事件
        const sectionMessageIndex = messageState.messages.value.findIndex(
          (msg) => msg.id === data.assistant_message_id
        );

        if (sectionMessageIndex !== -1) {
          const messageObj = messageState.messages.value[sectionMessageIndex];

          // 初始化分段數據結構
          if (!messageObj.toolResultSections) {
            messageObj.toolResultSections = [];
            messageObj.totalSections = data.total_sections;
            messageObj.currentSection = 0;
          }

          // 添加新的分段
          messageObj.toolResultSections.push({
            type: data.section_type,
            content: data.section_content,
            index: data.section_index,
            timestamp: data.timestamp,
          });

          // 更新進度
          messageObj.currentSection = data.section_index + 1;
          messageObj.toolResultProgress = data.progress;

          // 逐步構建內容，創建類似打字機的效果
          const accumulatedContent = messageObj.toolResultSections
            .sort((a, b) => a.index - b.index)
            .map((section) => section.content)
            .join("");

          // 更新消息內容（如果還沒有最終內容）
          if (!messageObj.finalContent) {
            messageObj.content = accumulatedContent;
          }

          // 更新處理狀態消息
          messageObj.toolProcessingMessage = `📋 正在組織結果 ${messageObj.currentSection}/${messageObj.totalSections} (${data.progress}%)`;
        }
        break;

      // 處理其他事件類型（AI總結、二次調用等）
      case "ai_summary_start":
      case "ai_summary_delta":
      case "ai_summary_complete":
      case "ai_summary_error":
      case "secondary_ai_start":
      case "secondary_ai_stream_start":
      case "secondary_ai_stream_done":
      case "secondary_ai_stream_error":
      case "mcp_tool_error":
      case "mcp_tool_start":
      case "mcp_tool_chunk":
      case "mcp_tool_complete":
        // 這些事件的處理邏輯會在後續完善
        console.log(`處理事件: ${eventType}`, data);
        break;

      case "conversation_updated":
        // 對話狀態更新
        if (conversationState.handleConversationUpdate) {
          conversationState.handleConversationUpdate(data.conversation);
        }
        break;

      case "error":
        // 錯誤事件
        console.error("SSE 錯誤:", data.error);

        // 查找是否有正在串流的 assistant 訊息
        const streamingMessageIndex = messageState.messages.value.findIndex(
          (msg) =>
            msg.role === "assistant" &&
            msg.isStreaming &&
            msg.conversation_id === conversationId
        );

        if (streamingMessageIndex !== -1) {
          messageState.messages.value[streamingMessageIndex].content =
            data.error;
          messageState.messages.value[streamingMessageIndex].isStreaming =
            false;
          messageState.messages.value[streamingMessageIndex].isError = true;
        } else {
          // 創建新的錯誤訊息記錄
          const errorMessage = {
            id: Date.now(),
            conversation_id: conversationId,
            role: "assistant",
            content: data.error,
            content_type: "text",
            tokens_used: 0,
            created_at: new Date().toISOString(),
            isStreaming: false,
            isError: true,
          };

          if (
            conversationState.currentConversation.value &&
            conversationState.currentConversation.value.id === conversationId
          ) {
            messageState.messages.value.push(errorMessage);
          }
        }

        throw new Error(data.error);

      default:
        console.warn("未知的 SSE 事件類型:", eventType, data);
    }
  };

  return {
    // 狀態
    isStreaming,
    streamController,
    streamingMessageId,

    // 方法
    sendMessageStream,
    stopCurrentStream,
    animateTyping,
    handleSSEEvent,
  };
}
