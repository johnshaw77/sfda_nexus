/**
 * 消息管理 Composable
 * 處理消息的 CRUD、分頁、狀態管理等功能
 */

import { ref, computed } from "vue";
import api from "@/api/index.js";
import { message } from "ant-design-vue";
import textConverter from "@/utils/textConverter.js";

export function useMessage() {
  // 狀態管理
  const messages = ref([]);
  const isLoadingMessages = ref(false);
  const isSendingMessage = ref(false);
  const isTyping = ref(false);
  const aiTyping = ref(false);

  // 分頁狀態
  const messagePagination = ref({
    current: 1,
    pageSize: 50,
    total: 0,
  });

  // 計算屬性
  const hasMessages = computed(() => messages.value.length > 0);

  // 文字轉換輔助方法
  const convertMessagesContent = (messageList, mode) => {
    if (!Array.isArray(messageList)) return messageList;

    return messageList.map((msg) => {
      const convertedMessage = { ...msg };

      // 轉換主要內容
      if (
        convertedMessage.content &&
        typeof convertedMessage.content === "string"
      ) {
        convertedMessage.content = textConverter.convertThinkingContent(
          convertedMessage.content,
          mode
        );
      }

      // 轉換思考內容
      if (convertedMessage.thinking_content) {
        convertedMessage.thinking_content =
          textConverter.convertThinkingContent(
            convertedMessage.thinking_content,
            mode
          );
      }

      // 轉換 metadata 中的思考內容
      if (convertedMessage.metadata?.thinking_content) {
        if (!convertedMessage.metadata) {
          convertedMessage.metadata = {};
        }
        convertedMessage.metadata.thinking_content =
          textConverter.convertThinkingContent(
            convertedMessage.metadata.thinking_content,
            mode
          );
      }

      return convertedMessage;
    });
  };

  // 獲取對話消息
  const handleGetMessages = async (
    conversationId,
    params = {},
    textConversionOptions = {}
  ) => {
    if (!conversationId) return [];

    isLoadingMessages.value = true;
    try {
      const response = await api.get(
        `/api/chat/conversations/${conversationId}/messages`,
        {
          params: {
            page: messagePagination.value.current,
            limit: messagePagination.value.pageSize,
            sortOrder: "ASC",
            ...params,
          },
        }
      );

      const { data: messageData, pagination } = response.data.data;

      console.log(`📋 載入對話 ${conversationId} 的消息:`, {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        loadedCount: messageData.length,
        isFirstPage: messagePagination.value.current === 1,
      });

      // 應用文字轉換（如果提供了轉換選項）
      const { isEnabled = false, mode = "auto" } = textConversionOptions;
      let processedMessages = messageData;

      if (isEnabled && textConverter.isAvailable()) {
        processedMessages = convertMessagesContent(messageData, mode);
      }

      // 如果是第一頁，替換消息；否則追加到前面（歷史消息）
      if (messagePagination.value.current === 1) {
        messages.value = processedMessages;
      } else {
        messages.value = [...processedMessages, ...messages.value];
      }

      messagePagination.value = {
        current: pagination.page,
        pageSize: pagination.limit,
        total: pagination.total,
      };

      return messageData;
    } catch (error) {
      console.error("獲取消息失敗:", error);
      message.error("獲取消息失敗");
      return [];
    } finally {
      isLoadingMessages.value = false;
    }
  };

  // 發送消息（HTTP方式）
  const handleSendMessage = async (conversationId, content, options = {}) => {
    if (!conversationId || !content.trim()) return null;

    isSendingMessage.value = true;
    try {
      const requestData = {
        content: content.trim(),
        content_type: options.contentType || "text",
        attachments: options.attachments,
        metadata: options.metadata,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 8192,
        model_id: options.model_id,
        endpoint_url: options.endpoint_url,
        system_prompt: options.systemPrompt,
      };

      const response = await api.post(
        `/api/chat/conversations/${conversationId}/messages`,
        requestData
      );

      const { user_message, assistant_message, conversation } =
        response.data.data;

      // 返回消息數據，由調用者決定是否添加到消息列表

      return { user_message, assistant_message, conversation };
    } catch (error) {
      console.error("發送消息失敗:", error);
      message.error("發送消息失敗");
      return null;
    } finally {
      isSendingMessage.value = false;
    }
  };

  // 添加消息到當前對話
  const handleAddMessage = (messageData, currentConversationId = null) => {
    if (
      !currentConversationId ||
      currentConversationId === messageData.conversation_id
    ) {
      messages.value.push(messageData);
    }
  };

  // 更新消息
  const handleUpdateMessage = (messageId, updates) => {
    const index = messages.value.findIndex((m) => m.id === messageId);
    if (index !== -1) {
      messages.value[index] = { ...messages.value[index], ...updates };
    }
  };

  // 載入更多歷史消息
  const handleLoadMoreMessages = async (
    conversationId,
    textConversionOptions = {}
  ) => {
    if (!conversationId || isLoadingMessages.value) return;

    // 檢查是否還有更多消息可載入
    if (messages.value.length >= messagePagination.value.total) {
      console.log("📄 已載入所有歷史消息");
      return;
    }

    try {
      console.log("🔄 載入更多歷史消息...", {
        currentPage: messagePagination.value.current,
        currentMessages: messages.value.length,
        total: messagePagination.value.total,
      });

      messagePagination.value.current++;
      const messageData = await handleGetMessages(
        conversationId,
        {},
        textConversionOptions
      );

      console.log("✅ 載入完成", {
        newPage: messagePagination.value.current,
        newMessages: messageData.length,
        totalMessages: messages.value.length,
      });

      return messageData;
    } catch (error) {
      console.error("載入更多消息失敗:", error);
      // 回滾頁數
      messagePagination.value.current = Math.max(
        1,
        messagePagination.value.current - 1
      );
      throw error;
    }
  };

  // 設置輸入狀態
  const handleSetTypingStatus = (conversationId, typing) => {
    isTyping.value = typing;
    // 這裡會通過依賴注入的 WebSocket store 發送狀態
  };

  // 設置AI輸入狀態
  const handleSetAITypingStatus = (typing) => {
    aiTyping.value = typing;
  };

  // 清空消息
  const handleClearMessages = () => {
    messages.value = [];
    messagePagination.value.current = 1;
  };

  // 刷新當前對話的消息（當文字轉換設置改變時）
  const refreshMessagesWithTextConversion = (textConversionOptions = {}) => {
    const { isEnabled = false, mode = "auto" } = textConversionOptions;

    if (messages.value.length > 0 && isEnabled && textConverter.isAvailable()) {
      messages.value = convertMessagesContent(messages.value, mode);
    }
  };

  return {
    // 狀態
    messages,
    isLoadingMessages,
    isSendingMessage,
    isTyping,
    aiTyping,
    messagePagination,

    // 計算屬性
    hasMessages,

    // 方法
    handleGetMessages,
    handleSendMessage,
    handleAddMessage,
    handleUpdateMessage,
    handleLoadMoreMessages,
    handleSetTypingStatus,
    handleSetAITypingStatus,
    handleClearMessages,
    refreshMessagesWithTextConversion,
    convertMessagesContent,
  };
}
