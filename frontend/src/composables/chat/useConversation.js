/**
 * 對話管理 Composable
 * 處理對話的 CRUD、分頁、搜尋、釘選等功能
 */

import { ref, computed } from "vue";
import api from "@/api/index.js";
import { message } from "ant-design-vue";
import { useWebSocketStore } from "@/stores/websocket";

export function useConversation() {
  // 狀態管理
  const conversations = ref([]);
  const currentConversation = ref(null);
  const isLoading = ref(false);

  // 分頁狀態
  const conversationPagination = ref({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  // 計算屬性
  const hasConversations = computed(() => conversations.value.length > 0);
  const currentConversationId = computed(() => currentConversation.value?.id);

  // 獲取對話列表
  const handleGetConversations = async (params = {}) => {
    isLoading.value = true;
    try {
      const { preservePagination = false, ...requestParams } = params;

      const response = await api.get("/api/chat/conversations", {
        params: {
          page: preservePagination ? 1 : conversationPagination.value.current,
          limit: preservePagination
            ? requestParams.limit || 20
            : conversationPagination.value.pageSize,
          ...requestParams,
        },
      });

      const { data: conversationData, pagination } = response.data.data;

      // 如果 preservePagination 為 true，不更新全局狀態，只返回數據
      if (preservePagination) {
        return conversationData;
      }

      // 否則正常更新全局狀態
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

      // 不立即添加到對話列表，等第一條消息發送後再添加
      // conversations.value.unshift(newConversation);

      // 設置為當前對話
      currentConversation.value = newConversation;

      // 加入WebSocket房間
      const wsStore = useWebSocketStore();
      wsStore.handleJoinRoom(`conversation_${newConversation.id}`);

      // 暫時不更新分頁信息，等第一條消息後再更新
      // conversationPagination.value.total += 1;

      return newConversation;
    } catch (error) {
      console.error("創建對話失敗:", error);
      message.error("創建對話失敗");
      return null;
    } finally {
      isLoading.value = false;
    }
  };

  // 將對話添加到歷史列表（第一條消息發送後調用）
  const handleAddConversationToHistory = (conversation) => {
    // 檢查是否已經在列表中
    const existingIndex = conversations.value.findIndex(
      (c) => c.id === conversation.id
    );

    if (existingIndex === -1) {
      // 添加到對話列表頂部
      conversations.value.unshift(conversation);
      // 更新分頁信息
      conversationPagination.value.total += 1;
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

    // 加入新對話房間
    wsStore.handleJoinRoom(`conversation_${conversation.id}`);

    return conversation;
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
        handleClearCurrentConversation();
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

  // 載入更多對話
  const handleLoadMoreConversations = async () => {
    if (isLoading.value) return;

    // 檢查是否還有更多對話可載入
    if (conversations.value.length >= conversationPagination.value.total) {
      console.log("📄 已載入所有對話");
      return;
    }

    try {
      console.log("🔄 載入更多對話...", {
        currentPage: conversationPagination.value.current,
        currentConversations: conversations.value.length,
        total: conversationPagination.value.total,
      });

      isLoading.value = true;
      conversationPagination.value.current++;

      const response = await api.get("/api/chat/conversations", {
        params: {
          page: conversationPagination.value.current,
          limit: conversationPagination.value.pageSize,
        },
      });

      const { data: newConversations, pagination } = response.data.data;

      // 追加新對話到現有列表
      conversations.value = [...conversations.value, ...newConversations];

      // 更新分頁信息
      conversationPagination.value = {
        current: pagination.page,
        pageSize: pagination.limit,
        total: pagination.total,
      };

      console.log("✅ 對話載入完成", {
        newPage: conversationPagination.value.current,
        newConversations: newConversations.length,
        totalConversations: conversations.value.length,
      });

      return newConversations;
    } catch (error) {
      console.error("載入更多對話失敗:", error);
      // 回滾頁數
      conversationPagination.value.current = Math.max(
        1,
        conversationPagination.value.current - 1
      );
      throw error;
    } finally {
      isLoading.value = false;
    }
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
  };

  // 處理對話更新事件（來自 SSE）
  const handleConversationUpdate = (conversationData) => {
    const convIndex = conversations.value.findIndex(
      (conv) => conv.id === conversationData.id
    );

    if (convIndex !== -1) {
      // 對話已存在，更新對話信息
      conversations.value[convIndex] = conversationData;

      // 重新排序整個對話列表（考慮置頂狀態）
      conversations.value.sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        return new Date(b.last_message_at) - new Date(a.last_message_at);
      });
    } else {
      // 對話不存在，且有標題時才添加到歷史列表
      if (
        conversationData.title &&
        conversationData.title.trim() !== "" &&
        conversationData.title !== "新對話"
      ) {
        handleAddConversationToHistory(conversationData);
      }
    }

    // 如果是當前對話，也更新當前對話數據
    if (
      currentConversation.value &&
      currentConversation.value.id === conversationData.id
    ) {
      Object.assign(currentConversation.value, conversationData);
    }
  };

  return {
    // 狀態
    conversations,
    currentConversation,
    isLoading,
    conversationPagination,

    // 計算屬性
    hasConversations,
    currentConversationId,

    // 方法
    handleGetConversations,
    handleCreateConversation,
    handleSelectConversation,
    handleDeleteConversation,
    handleUpdateConversation,
    handleTogglePinConversation,
    handleLoadMoreConversations,
    handleSearchConversations,
    handleClearCurrentConversation,
    handleAddConversationToHistory,
    handleConversationUpdate,
  };
}
