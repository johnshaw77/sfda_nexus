/**
 * 聊天狀態管理
 * 處理對話、消息、AI模型等聊天相關狀態
 */

import { defineStore } from "pinia";
import { ref, computed } from "vue";
import api from "@/api/index.js";
import { message } from "ant-design-vue";
import { useWebSocketStore } from "./websocket";

export const useChatStore = defineStore("chat", () => {
  // 狀態
  const conversations = ref([]);
  const currentConversation = ref(null);
  const messages = ref([]);
  const availableModels = ref({ ollama: [], gemini: [] });
  const availableAgents = ref([]);
  const isLoading = ref(false);
  const isLoadingMessages = ref(false);
  const isSendingMessage = ref(false);
  const isTyping = ref(false);
  const aiTyping = ref(false);

  // 分頁狀態
  const conversationPagination = ref({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  const messagePagination = ref({
    current: 1,
    pageSize: 50,
    total: 0,
  });

  // 計算屬性
  const hasConversations = computed(() => conversations.value.length > 0);
  const hasMessages = computed(() => messages.value.length > 0);
  const currentConversationId = computed(() => currentConversation.value?.id);

  // 獲取對話列表
  const handleGetConversations = async (params = {}) => {
    isLoading.value = true;
    try {
      const response = await api.get("/api/chat/conversations", {
        params: {
          page: conversationPagination.value.current,
          limit: conversationPagination.value.pageSize,
          ...params,
        },
      });

      const { data: conversationData, pagination } = response.data.data;
      conversations.value = conversationData;
      conversationPagination.value = {
        current: pagination.page,
        pageSize: pagination.limit,
        total: pagination.total,
      };

      return conversationData;
    } catch (error) {
      console.error("獲取對話列表失敗:", error);
      message.error("獲取對話列表失敗");
      return [];
    } finally {
      isLoading.value = false;
    }
  };

  // 創建新對話
  const handleCreateConversation = async (conversationData) => {
    isLoading.value = true;
    try {
      const response = await api.post(
        "/api/chat/conversations",
        conversationData
      );
      const newConversation = response.data.data;

      // 添加到對話列表頂部
      conversations.value.unshift(newConversation);

      // 設置為當前對話
      currentConversation.value = newConversation;
      messages.value = [];

      // 加入WebSocket房間
      const wsStore = useWebSocketStore();
      wsStore.handleJoinRoom(`conversation_${newConversation.id}`);

      message.success("對話創建成功");
      return newConversation;
    } catch (error) {
      console.error("創建對話失敗:", error);
      message.error("創建對話失敗");
      return null;
    } finally {
      isLoading.value = false;
    }
  };

  // 選擇對話
  const handleSelectConversation = async (conversation) => {
    if (currentConversation.value?.id === conversation.id) return;

    // 離開當前對話房間
    const wsStore = useWebSocketStore();
    if (currentConversation.value) {
      wsStore.handleLeaveRoom(`conversation_${currentConversation.value.id}`);
    }

    // 設置新的當前對話
    currentConversation.value = conversation;
    messages.value = [];
    messagePagination.value.current = 1;

    // 加入新對話房間
    wsStore.handleJoinRoom(`conversation_${conversation.id}`);

    // 載入消息
    await handleGetMessages(conversation.id);
  };

  // 獲取對話消息
  const handleGetMessages = async (conversationId, params = {}) => {
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

      // 如果是第一頁，替換消息；否則追加到前面（歷史消息）
      if (messagePagination.value.current === 1) {
        messages.value = messageData;
      } else {
        messages.value = [...messageData, ...messages.value];
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
      const response = await api.post(
        `/api/chat/conversations/${conversationId}/messages`,
        {
          content: content.trim(),
          content_type: options.contentType || "text",
          attachments: options.attachments,
          metadata: options.metadata,
          temperature: options.temperature || 0.7,
          max_tokens: options.maxTokens || 4096,
        }
      );

      const { user_message, assistant_message, conversation } =
        response.data.data;

      // 添加消息到當前對話
      if (currentConversation.value?.id === conversationId) {
        messages.value.push(user_message);
        if (assistant_message) {
          messages.value.push(assistant_message);
        }
      }

      // 更新對話信息
      if (conversation) {
        const index = conversations.value.findIndex(
          (c) => c.id === conversation.id
        );
        if (index !== -1) {
          conversations.value[index] = conversation;
          // 移動到頂部
          conversations.value.unshift(conversations.value.splice(index, 1)[0]);
        }
      }

      return { user_message, assistant_message };
    } catch (error) {
      console.error("發送消息失敗:", error);
      message.error("發送消息失敗");
      return null;
    } finally {
      isSendingMessage.value = false;
    }
  };

  // 發送實時消息（WebSocket方式）
  const handleSendRealtimeMessage = (conversationId, content, options = {}) => {
    if (!conversationId || !content.trim()) return false;

    const wsStore = useWebSocketStore();
    return wsStore.handleSendRealtimeChat(
      conversationId,
      content.trim(),
      options
    );
  };

  // 添加消息到當前對話
  const handleAddMessage = (message) => {
    if (currentConversation.value?.id === message.conversation_id) {
      messages.value.push(message);
    }
  };

  // 更新消息
  const handleUpdateMessage = (messageId, updates) => {
    const index = messages.value.findIndex((m) => m.id === messageId);
    if (index !== -1) {
      messages.value[index] = { ...messages.value[index], ...updates };
    }
  };

  // 刪除對話
  const handleDeleteConversation = async (conversationId) => {
    try {
      await api.delete(`/api/chat/conversations/${conversationId}`);

      // 從列表中移除
      conversations.value = conversations.value.filter(
        (c) => c.id !== conversationId
      );

      // 如果是當前對話，清空
      if (currentConversation.value?.id === conversationId) {
        currentConversation.value = null;
        messages.value = [];
      }

      message.success("對話已刪除");
    } catch (error) {
      console.error("刪除對話失敗:", error);
      message.error("刪除對話失敗");
    }
  };

  // 更新對話
  const handleUpdateConversation = async (conversationId, updates) => {
    try {
      const response = await api.put(
        `/api/chat/conversations/${conversationId}`,
        updates
      );
      const updatedConversation = response.data.data;

      // 更新列表中的對話
      const index = conversations.value.findIndex(
        (c) => c.id === conversationId
      );
      if (index !== -1) {
        conversations.value[index] = updatedConversation;
      }

      // 更新當前對話
      if (currentConversation.value?.id === conversationId) {
        currentConversation.value = updatedConversation;
      }

      return updatedConversation;
    } catch (error) {
      console.error("更新對話失敗:", error);
      message.error("更新對話失敗");
      return null;
    }
  };

  // 置頂/取消置頂對話
  const handleTogglePinConversation = async (conversationId, pinned = true) => {
    try {
      await api.post(`/api/chat/conversations/${conversationId}/pin`, {
        pinned,
      });

      // 更新對話狀態
      const conversation = conversations.value.find(
        (c) => c.id === conversationId
      );
      if (conversation) {
        conversation.is_pinned = pinned;

        // 重新排序（置頂的在前面）
        conversations.value.sort((a, b) => {
          if (a.is_pinned && !b.is_pinned) return -1;
          if (!a.is_pinned && b.is_pinned) return 1;
          return new Date(b.last_message_at) - new Date(a.last_message_at);
        });
      }

      message.success(pinned ? "對話已置頂" : "對話已取消置頂");
    } catch (error) {
      console.error("置頂操作失敗:", error);
      message.error("置頂操作失敗");
    }
  };

  // 獲取可用模型
  const handleGetAvailableModels = async () => {
    try {
      const response = await api.get("/api/chat/models");
      availableModels.value = response.data.data;
      return availableModels.value;
    } catch (error) {
      console.error("獲取可用模型失敗:", error);
      message.error("獲取可用模型失敗");
      return { ollama: [], gemini: [] };
    }
  };

  // 獲取可用智能體
  const handleGetAvailableAgents = async (params = {}) => {
    try {
      const response = await api.get("/api/chat/agents", { params });
      availableAgents.value = response.data.data;
      return availableAgents.value;
    } catch (error) {
      console.error("獲取可用智能體失敗:", error);
      message.error("獲取可用智能體失敗");
      return [];
    }
  };

  // 設置輸入狀態
  const handleSetTypingStatus = (conversationId, typing) => {
    isTyping.value = typing;
    const wsStore = useWebSocketStore();
    wsStore.handleSendTypingStatus(conversationId, typing);
  };

  // 設置AI輸入狀態
  const handleSetAITypingStatus = (typing) => {
    aiTyping.value = typing;
  };

  // 載入更多歷史消息
  const handleLoadMoreMessages = async () => {
    if (!currentConversation.value || isLoadingMessages.value) return;

    messagePagination.value.current++;
    await handleGetMessages(currentConversation.value.id);
  };

  // 搜索對話
  const handleSearchConversations = async (keyword) => {
    return await handleGetConversations({ search: keyword });
  };

  // 清空當前對話
  const handleClearCurrentConversation = () => {
    const wsStore = useWebSocketStore();
    if (currentConversation.value) {
      wsStore.handleLeaveRoom(`conversation_${currentConversation.value.id}`);
    }

    currentConversation.value = null;
    messages.value = [];
    messagePagination.value.current = 1;
  };

  // 初始化聊天數據
  const handleInitializeChat = async () => {
    await Promise.all([
      handleGetConversations(),
      handleGetAvailableModels(),
      handleGetAvailableAgents(),
    ]);
  };

  return {
    // 狀態
    conversations,
    currentConversation,
    messages,
    availableModels,
    availableAgents,
    isLoading,
    isLoadingMessages,
    isSendingMessage,
    isTyping,
    aiTyping,
    conversationPagination,
    messagePagination,

    // 計算屬性
    hasConversations,
    hasMessages,
    currentConversationId,

    // 方法
    handleGetConversations,
    handleCreateConversation,
    handleSelectConversation,
    handleGetMessages,
    handleSendMessage,
    handleSendRealtimeMessage,
    handleAddMessage,
    handleUpdateMessage,
    handleDeleteConversation,
    handleUpdateConversation,
    handleTogglePinConversation,
    handleGetAvailableModels,
    handleGetAvailableAgents,
    handleSetTypingStatus,
    handleSetAITypingStatus,
    handleLoadMoreMessages,
    handleSearchConversations,
    handleClearCurrentConversation,
    handleInitializeChat,
  };
});
