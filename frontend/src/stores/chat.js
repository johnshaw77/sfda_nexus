/**
 * 聊天狀態管理 (重構版)
 * 整合所有 composable 模組，保持向後兼容性
 */

import { defineStore } from "pinia";
import { computed } from "vue";
import { useWebSocketStore } from "./websocket";
import {
  useConversation,
  useMessage,
  useStreaming,
  useTextConversion,
  useModels,
} from "@/composables/chat";

export const useChatStore = defineStore("chat", () => {
  // 初始化文字轉換 composable（需要最先初始化，因為其他模組會依賴它）
  const textConversionState = useTextConversion();

  // 初始化對話管理 composable
  const conversationState = useConversation();

  // 初始化消息管理 composable
  const messageState = useMessage();

  // 初始化串流處理 composable（需要傳入對話、消息和文字轉換狀態）
  const streamingState = useStreaming(
    conversationState,
    messageState,
    textConversionState
  );

  // 初始化模型管理 composable
  const modelsState = useModels();

  // 整合計算屬性
  const hasConversations = computed(
    () => conversationState.hasConversations.value
  );
  const hasMessages = computed(() => messageState.hasMessages.value);
  const currentConversationId = computed(
    () => conversationState.currentConversationId.value
  );

  // 🔧 工具處理進度更新（保持向後兼容）
  const handleUpdateToolProgress = (progressData) => {
    console.log("🔧 [Chat Store] 處理工具進度:", progressData);

    const { conversationId, message, progress, stage, timestamp } =
      progressData;

    // 如果不是當前對話，忽略
    if (conversationState.currentConversation.value?.id !== conversationId) {
      return;
    }

    // 找到最後一個 assistant 消息
    const lastAssistantMessageIndex = messageState.messages.value
      .slice()
      .reverse()
      .findIndex((msg) => msg.role === "assistant");

    if (lastAssistantMessageIndex === -1) {
      console.warn("⚠️ 未找到 assistant 消息來更新工具進度");
      return;
    }

    // 轉換為正向索引
    const messageIndex =
      messageState.messages.value.length - 1 - lastAssistantMessageIndex;
    const targetMessage = messageState.messages.value[messageIndex];

    // 更新進度信息
    targetMessage.isProcessingTools = true;
    targetMessage.toolProcessingMessage = message;
    targetMessage.progress = progress;
    targetMessage.toolProcessingStage = stage;
    targetMessage.lastProgressUpdate = timestamp;

    console.log("🔧 [Chat Store] 工具進度已更新:", {
      messageId: targetMessage.id,
      message,
      progress,
      stage,
    });
  };

  // 🚀 發送消息（公共函數，自動處理對話創建和選擇）
  const sendMessage = async (content, options = {}) => {
    try {
      let conversationId = conversationState.currentConversation.value?.id;

      // 如果沒有當前對話，創建一個新對話
      if (!conversationId) {
        const title = options.title || "新對話";
        const newConversation =
          await conversationState.handleCreateConversation({ title });
        conversationId = newConversation.id;

        // 選擇新創建的對話
        await handleSelectConversation(newConversation);
      }

      // 使用串流模式發送消息
      return await streamingState.sendMessageStream(
        conversationId,
        content,
        options
      );
    } catch (error) {
      console.error("發送消息失敗:", error);
      throw error;
    }
  };

  // 🔧 選擇對話（整合消息載入）
  const handleSelectConversation = async (conversation) => {
    // 先切換對話
    await conversationState.handleSelectConversation(conversation);

    // 清空消息並重設分頁
    messageState.handleClearMessages();

    // 載入該對話的消息（傳入文字轉換選項）
    const textConversionOptions = {
      isEnabled: textConversionState.isTextConverterEnabled.value,
      mode: textConversionState.textConversionMode.value,
    };
    await messageState.handleGetMessages(
      conversation.id,
      {},
      textConversionOptions
    );
  };

  // 🔧 文字轉換設置變更處理
  const setTextConversionMode = (mode) => {
    const result = textConversionState.setTextConversionMode(mode);
    // 刷新當前消息的文字轉換
    messageState.refreshMessagesWithTextConversion();
    return result;
  };

  const toggleTextConverter = (enabled) => {
    const result = textConversionState.toggleTextConverter(enabled);
    // 如果禁用轉換，需要重新載入消息以獲取原始內容
    if (!enabled && conversationState.currentConversation.value) {
      messageState.handleGetMessages(
        conversationState.currentConversation.value.id
      );
    } else if (enabled) {
      // 如果啟用轉換，刷新當前消息
      messageState.refreshMessagesWithTextConversion();
    }
    return result;
  };

  // 🔧 清空當前對話（整合版）
  const handleClearCurrentConversation = () => {
    conversationState.handleClearCurrentConversation();
    messageState.handleClearMessages();
  };

  // 🔧 初始化聊天數據
  const handleInitializeChat = async () => {
    await Promise.all([
      conversationState.handleGetConversations(),
      modelsState.initializeModelsAndAgents(),
    ]);
  };

  // 🔧 處理實時消息發送（WebSocket版本）
  const handleSendRealtimeMessage = (conversationId, content, options = {}) => {
    if (!conversationId || !content.trim()) return false;

    const wsStore = useWebSocketStore();
    return wsStore.handleSendRealtimeChat(
      conversationId,
      content.trim(),
      options
    );
  };

  // 🔧 設置輸入狀態（整合 WebSocket）
  const handleSetTypingStatus = (conversationId, typing) => {
    messageState.handleSetTypingStatus(conversationId, typing);
    const wsStore = useWebSocketStore();
    wsStore.handleSendTypingStatus(conversationId, typing);
  };

  return {
    // ============ 狀態 ============
    // 對話相關狀態
    conversations: conversationState.conversations,
    currentConversation: conversationState.currentConversation,
    conversationPagination: conversationState.conversationPagination,

    // 消息相關狀態
    messages: messageState.messages,
    messagePagination: messageState.messagePagination,
    isLoadingMessages: messageState.isLoadingMessages,
    isSendingMessage: messageState.isSendingMessage,
    isTyping: messageState.isTyping,
    aiTyping: messageState.aiTyping,

    // 串流相關狀態
    isStreaming: streamingState.isStreaming,
    streamController: streamingState.streamController,
    streamingMessageId: streamingState.streamingMessageId,

    // 文字轉換狀態
    textConversionMode: textConversionState.textConversionMode,
    isTextConverterEnabled: textConversionState.isTextConverterEnabled,

    // 模型相關狀態
    availableModels: modelsState.availableModels,
    availableAgents: modelsState.availableAgents,

    // 載入狀態
    isLoading: conversationState.isLoading,

    // ============ 計算屬性 ============
    hasConversations,
    hasMessages,
    currentConversationId,

    // ============ 對話管理方法 ============
    handleGetConversations: conversationState.handleGetConversations,
    handleCreateConversation: conversationState.handleCreateConversation,
    handleSelectConversation,
    handleDeleteConversation: conversationState.handleDeleteConversation,
    handleUpdateConversation: conversationState.handleUpdateConversation,
    handleTogglePinConversation: conversationState.handleTogglePinConversation,
    handleLoadMoreConversations: conversationState.handleLoadMoreConversations,
    handleSearchConversations: conversationState.handleSearchConversations,
    handleClearCurrentConversation,
    handleAddConversationToHistory:
      conversationState.handleAddConversationToHistory,

    // ============ 消息管理方法 ============
    handleGetMessages: messageState.handleGetMessages,
    handleSendMessage: messageState.handleSendMessage,
    handleSendRealtimeMessage,
    handleAddMessage: messageState.handleAddMessage,
    handleUpdateMessage: messageState.handleUpdateMessage,
    handleLoadMoreMessages: messageState.handleLoadMoreMessages,
    handleSetTypingStatus,
    handleSetAITypingStatus: messageState.handleSetAITypingStatus,

    // ============ 串流相關方法 ============
    sendMessageStream: streamingState.sendMessageStream,
    stopCurrentStream: streamingState.stopCurrentStream,
    handleSSEEvent: streamingState.handleSSEEvent,

    // ============ 文字轉換方法 ============
    setTextConversionMode,
    toggleTextConverter,
    getTextConverterInfo: textConversionState.getTextConverterInfo,

    // ============ 模型管理方法 ============
    handleGetAvailableModels: modelsState.handleGetAvailableModels,
    handleGetAvailableAgents: modelsState.handleGetAvailableAgents,

    // ============ 整合方法 ============
    sendMessage,
    handleInitializeChat,
    handleUpdateToolProgress,
  };
});
