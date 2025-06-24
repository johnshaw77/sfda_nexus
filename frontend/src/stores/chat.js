/**
 * 聊天狀態管理
 * 處理對話、消息、AI模型等聊天相關狀態
 */

import { defineStore } from "pinia";
import { ref, computed } from "vue";
import api from "@/api/index.js";
import { message } from "ant-design-vue";
import { useWebSocketStore } from "./websocket";
import { useConfigStore } from "./config";
import textConverter from "@/utils/textConverter.js";

export const useChatStore = defineStore("chat", () => {
  // 狀態
  const conversations = ref([]);
  const currentConversation = ref(null);
  const messages = ref([]);
  const availableModels = ref({
    ollama: [],
    gemini: [],
    openai: [],
    claude: [],
  });
  const availableAgents = ref([]);
  const isLoading = ref(false);
  const isLoadingMessages = ref(false);
  const isSendingMessage = ref(false);
  const isTyping = ref(false);
  const aiTyping = ref(false);
  const isStreaming = ref(false);
  const streamController = ref(null); // 用於控制串流停止
  const streamingMessageId = ref(null); // 當前正在串流的消息 ID

  // 文字轉換設定
  const textConversionMode = ref("auto"); // 'none', 'auto', 's2t', 't2s'
  const isTextConverterEnabled = ref(true);

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
      messages.value = [];

      // console.log("=== 新對話創建完成 ===");
      // console.log("新對話 ID:", newConversation.id);
      // console.log("設置為當前對話:", currentConversation.value?.id);
      // console.log("=== 新對話創建完成結束 ===\n");

      // 加入WebSocket房間
      const wsStore = useWebSocketStore();
      wsStore.handleJoinRoom(`conversation_${newConversation.id}`);

      // 暫時不更新分頁信息，等第一條消息後再更新
      // conversationPagination.value.total += 1;

      // message.success("對話創建成功");
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

      console.log(`📋 載入對話 ${conversationId} 的消息:`, {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        loadedCount: messageData.length,
        isFirstPage: messagePagination.value.current === 1,
      });

      // 如果是第一頁，替換消息；否則追加到前面（歷史消息）
      if (messagePagination.value.current === 1) {
        // 對載入的消息應用文字轉換（包括思考內容和主要內容）
        const convertedMessages =
          isTextConverterEnabled.value && textConverter.isAvailable()
            ? convertMessagesContent(messageData, textConversionMode.value)
            : messageData;
        messages.value = convertedMessages;
      } else {
        // 對歷史消息也應用文字轉換
        const convertedHistoryMessages =
          isTextConverterEnabled.value && textConverter.isAvailable()
            ? convertMessagesContent(messageData, textConversionMode.value)
            : messageData;
        messages.value = [...convertedHistoryMessages, ...messages.value];
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

    // 調試：打印發送參數
    // console.log("=== 前端發送訊息調試 ===");
    // console.log("對話 ID:", conversationId);
    // console.log("訊息內容:", content.trim());
    // console.log("選項:", options);
    // console.log(
    //   "API URL:",
    //   `/api/chat/conversations/${conversationId}/messages`
    // );

    isSendingMessage.value = true;
    try {
      const requestData = {
        content: content.trim(),
        content_type: options.contentType || "text",
        attachments: options.attachments,
        metadata: options.metadata,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 8192,
        model_id: options.model_id, // 傳遞模型 ID
        endpoint_url: options.endpoint_url, // 直接傳遞端點 URL
        system_prompt: options.systemPrompt, // 傳遞系統提示詞
      };

      //console.log("請求數據:", requestData);

      const response = await api.post(
        `/api/chat/conversations/${conversationId}/messages`,
        requestData
      );

      // console.log("=== 前端收到回應 ===");
      // console.log("完整回應:", response);
      // console.log("回應狀態:", response.status);
      // console.log("回應數據:", response.data);
      // console.log("回應數據結構:", JSON.stringify(response.data, null, 2));

      const { user_message, assistant_message, conversation, debug_info } =
        response.data.data;

      // console.log("解析後的數據:");
      // console.log("用戶訊息:", user_message);
      // console.log("AI 訊息:", assistant_message);
      // console.log("對話信息:", conversation);

      // 調試信息處理已移除

      // 添加消息到當前對話
      if (currentConversation.value?.id === conversationId) {
        // console.log("添加訊息到當前對話:", conversationId);
        // console.log("當前 messages 數量:", messages.value.length);

        messages.value.push(user_message);
        if (assistant_message) {
          messages.value.push(assistant_message);
        }

        // console.log("更新後 messages 數量:", messages.value.length);
      } else {
        // console.log("對話 ID 不匹配，不更新 UI");
        // console.log("當前對話 ID:", currentConversation.value?.id);
        //console.log("訊息對話 ID:", conversationId);
      }

      // 更新對話信息
      if (conversation) {
        const index = conversations.value.findIndex(
          (c) => c.id === conversation.id
        );
        if (index !== -1) {
          // 對話已存在，更新對話信息
          conversations.value[index] = conversation;

          // 重新排序整個對話列表（考慮置頂狀態）
          conversations.value.sort((a, b) => {
            if (a.is_pinned && !b.is_pinned) return -1;
            if (!a.is_pinned && b.is_pinned) return 1;
            return new Date(b.last_message_at) - new Date(a.last_message_at);
          });
        } else {
          // 對話不存在，且有標題時才添加到歷史列表
          if (
            conversation.title &&
            conversation.title.trim() !== "" &&
            conversation.title !== "新對話"
          ) {
            handleAddConversationToHistory(conversation);
          }
        }
      }

      //console.log("=== 前端處理完成 ===\n");

      return { user_message, assistant_message };
    } catch (error) {
      console.error("=== 前端發送訊息錯誤 ===");
      console.error("錯誤詳情:", error);
      console.error("錯誤回應:", error.response);
      console.error("錯誤訊息:", error.message);

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

  // 發送消息（公共函數，自動處理對話創建和選擇）
  const sendMessage = async (content, options = {}) => {
    try {
      let conversationId = currentConversation.value?.id;

      // 如果沒有當前對話，創建一個新對話
      if (!conversationId) {
        const title = options.title || "新對話";
        const newConversation = await handleCreateConversation({ title });
        conversationId = newConversation.id;

        // 選擇新創建的對話
        await handleSelectConversation(newConversation);
      }

      // 使用串流模式發送消息
      return await sendMessageStream(conversationId, content, options);
    } catch (error) {
      console.error("發送消息失敗:", error);
      message.error("發送消息失敗");
      throw error;
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
      return { ollama: [], gemini: [], openai: [], claude: [] };
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
      const messageData = await handleGetMessages(currentConversation.value.id);

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

  /**
   * 發送訊息（串流模式）
   * 支援 ChatGPT 風格的逐字顯示效果
   */
  async function sendMessageStream(conversationId, content, options = {}) {
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
      isSendingMessage.value = true;
      isStreaming.value = true;
      aiTyping.value = true; // 顯示AI思考狀態

      // console.log("=== 開始串流聊天 ===");
      // console.log("對話ID:", conversationId);
      // console.log("內容:", content);
      // console.log("選項:", options);

      const requestBody = {
        conversation_id: conversationId,
        content,
        content_type,
        attachments,
        metadata,
        model_id,
        endpoint_url: options.endpoint_url, // 直接傳遞端點 URL
        temperature,
        max_tokens,
        system_prompt,
      };

      //console.log("請求體:", requestBody);

      // 獲取認證token（從 api 配置中）
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

      // 🔧 增加超時時間以應對工具調用延遲
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.log("=== 串流請求超時，已中止連接 ===");
        antMessage.warning("請求超時，可能是網絡問題或工具調用時間過長");
      }, 600000); // 10分鐘超時，為工具調用預留更多時間

      // 注意：瀏覽器的 EventSource 只支援 GET 請求
      // 我們需要使用 fetch + ReadableStream 來實現 POST + SSE
      const streamUrl = `${configStore.apiBaseUrl}/api/chat/conversations/${conversationId}/messages/stream`;

      const response = await fetch(streamUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          "Cache-Control": "no-cache",
          // 🔧 添加保持連接的頭部
          Connection: "keep-alive",
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal, // 添加 abort signal
      });

      // 🔧 清除超時計時器
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

      //console.log("=== SSE 連接建立成功 ===");

      // 處理 SSE 串流
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      let currentAssistantMessage = null;
      let streamingContent = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          //console.log("=== SSE 串流結束 ===");
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

      // 🔧 修復：移除重新載入對話的邏輯，避免覆蓋串流內容
      // 串流過程中已經實時更新了消息內容，不需要重新載入
      // await handleGetMessages(conversationId);

      //console.log("=== 串流聊天完成 ===");
    } catch (err) {
      if (err.name === "AbortError") {
        //console.log("=== 串流聊天被用戶停止 ===");
        message.info("對話已停止");
      } else {
        //console.error("=== 串流聊天失敗 ===");
        console.error("錯誤:", err.message);
        console.error("堆疊:", err.stack);
        message.error(err.message || "串流聊天失敗");
        throw err;
      }
    } finally {
      isSendingMessage.value = false;
      isStreaming.value = false;
      aiTyping.value = false;
      streamController.value = null;
    }
  }

  /**
   * 停止當前串流
   */
  function stopCurrentStream() {
    if (streamController.value && isStreaming.value) {
      streamController.value.abort();
      //console.log("=== 用戶手動停止串流 ===");
    }
  }

  /**
   * 打字機動畫效果
   */
  function animateTyping(messageIndex, currentContent, targetContent) {
    // 如果已經有動畫在進行，先清除
    if (messages.value[messageIndex].typingTimer) {
      clearTimeout(messages.value[messageIndex].typingTimer);
    }

    const startIndex = currentContent.length;
    const endIndex = targetContent.length;

    // 如果沒有新內容要添加，直接返回
    if (startIndex >= endIndex) {
      messages.value[messageIndex].content = targetContent;
      return;
    }

    let currentIndex = startIndex;

    const typeNextChar = () => {
      if (currentIndex < endIndex) {
        // 逐字符添加
        messages.value[messageIndex].content = targetContent.substring(
          0,
          currentIndex + 1
        );
        currentIndex++;

        // 設置下一個字符的延遲（調整這個值來控制打字速度）
        const delay = Math.random() * 30 + 10; // 10-40ms 隨機延遲，模擬真實打字
        messages.value[messageIndex].typingTimer = setTimeout(
          typeNextChar,
          delay
        );
      } else {
        // 動畫完成，清除計時器
        delete messages.value[messageIndex].typingTimer;
      }
    };

    // 開始打字動畫
    typeNextChar();
  }

  /**
   * 處理 SSE 事件
   */
  async function handleSSEEvent(data, eventType, context) {
    const { conversationId, currentAssistantMessage, updateStreamingContent } =
      context;

    //console.log("=== SSE 事件 ===");
    //console.log("事件類型:", eventType);
    //console.log("數據:", data);

    switch (eventType) {
      case "user_message":
        // 用戶訊息創建成功
        //console.log("用戶訊息已創建:", data.user_message);

        // 更新當前對話的訊息列表
        if (
          currentConversation.value &&
          currentConversation.value.id === conversationId
        ) {
          messages.value.push(data.user_message);
        }
        break;

      case "assistant_message_created":
        // AI 助手訊息記錄已創建
        //console.log("AI 訊息記錄已創建:", data.assistant_message_id);

        // 設置當前串流的消息 ID
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
          isStreaming: true, // 標記為串流中
        };

        // 添加到當前對話的訊息列表
        if (
          currentConversation.value &&
          currentConversation.value.id === conversationId
        ) {
          messages.value.push(newAssistantMessage);
        }

        // 更新當前助手訊息引用
        currentAssistantMessage(newAssistantMessage);
        break;

      case "stream_content":
        // 串流內容更新
        /*
        console.log("🔄 前端收到 stream_content 事件:", {
          hasContent: !!data.content,
          contentLength: data.content?.length || 0,
          hasFullContent: !!data.full_content,
          fullContentLength: data.full_content?.length || 0,
          hasThinkingContent: !!data.thinking_content,
          thinkingContentLength: data.thinking_content?.length || 0,
          assistantMessageId: data.assistant_message_id,
          tokensUsed: data.tokens_used,
        });
        */

        // 如果有思考內容，詳細打印
        if (data.thinking_content) {
          console.log("🧠 前端收到思考內容詳情:", {
            length: data.thinking_content.length,
            preview: data.thinking_content.substring(0, 200) + "...",
            messageId: data.assistant_message_id,
          });
        }

        // 查找對應的消息
        const streamMessage = messages.value.find(
          (msg) => msg.id === data.assistant_message_id
        );

        if (streamMessage) {
          console.log("✅ 找到對應的流式消息:", {
            messageId: streamMessage.id,
            currentContentLength: streamMessage.content?.length || 0,
            newContentLength: data.content?.length || 0,
            currentThinkingLength: streamMessage.thinking_content?.length || 0,
            newThinkingLength: data.thinking_content?.length || 0,
            isStreaming: streamMessage.isStreaming,
          });

          // 找到消息在數組中的索引（用於打字機動畫）
          const messageIndex = messages.value.findIndex(
            (msg) => msg.id === data.assistant_message_id
          );

          // 處理思考內容的即時顯示
          if (data.thinking_content !== undefined) {
            console.log("🧠 即時更新思考內容:", {
              messageId: streamMessage.id,
              oldLength: streamMessage.thinking_content?.length || 0,
              newLength: data.thinking_content.length,
              hasDelta: !!data.thinking_delta,
              deltaLength: data.thinking_delta?.length || 0,
            });

            // 如果有思考內容增量，記錄詳情
            if (data.thinking_delta) {
              console.log("🧠 收到思考內容增量:", {
                deltaLength: data.thinking_delta.length,
                deltaPreview: data.thinking_delta.substring(0, 50) + "...",
                totalLength: data.thinking_content.length,
              });
            }

            // 應用文字轉換後更新思考內容（現在支持即時串流）
            const convertedThinkingContent =
              isTextConverterEnabled.value && textConverter.isAvailable()
                ? textConverter.convertStreamThinkingContent(
                    data.thinking_content,
                    textConversionMode.value
                  )
                : data.thinking_content;

            streamMessage.thinking_content = convertedThinkingContent;
          }

          // 處理主要內容的即時顯示（使用打字機效果）
          if (data.content !== undefined && messageIndex !== -1) {
            const currentContent = streamMessage.content || "";

            // 🔧 新增：對 AI 回應內容也應用文字轉換
            const convertedContent =
              isTextConverterEnabled.value && textConverter.isAvailable()
                ? textConverter.convertStreamThinkingContent(
                    data.content,
                    textConversionMode.value
                  )
                : data.content;

            const newContent = convertedContent;

            console.log("📝 準備打字機動畫:", {
              messageId: streamMessage.id,
              currentLength: currentContent.length,
              newLength: newContent.length,
              shouldAnimate: newContent.length > currentContent.length,
              hasDelta: !!data.content_delta,
              deltaLength: data.content_delta?.length || 0,
              deltaPreview:
                data.content_delta?.substring(0, 20) + "..." || "無",
            });

            // 如果有新內容，使用打字機動畫
            if (newContent.length > currentContent.length) {
              animateTyping(messageIndex, currentContent, newContent);
            } else {
              // 如果內容沒有增加，直接更新
              streamMessage.content = newContent;
            }
          }

          // 更新完整內容（用於最終狀態）
          if (data.full_content !== undefined) {
            // 🔧 新增：對完整內容也應用文字轉換
            const convertedFullContent =
              isTextConverterEnabled.value && textConverter.isAvailable()
                ? textConverter.convertStreamThinkingContent(
                    data.full_content,
                    textConversionMode.value
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

          console.log("📝 消息更新完成:", {
            messageId: streamMessage.id,
            contentLength: streamMessage.content?.length || 0,
            thinkingLength: streamMessage.thinking_content?.length || 0,
            isStreaming: streamMessage.isStreaming,
          });
        } else {
          console.warn("⚠️ 未找到對應的流式消息:", data.assistant_message_id);
        }
        break;

      case "stream_done":
        // 串流完成
        //console.log("串流完成:", data);

        // 清除當前串流的消息 ID
        if (streamingMessageId.value === data.assistant_message_id) {
          streamingMessageId.value = null;
        }

        // 更新最終訊息狀態
        const finalMessageIndex = messages.value.findIndex(
          (msg) => msg.id === data.assistant_message_id
        );

        if (finalMessageIndex !== -1) {
          // 清除打字機動畫計時器
          if (messages.value[finalMessageIndex].typingTimer) {
            clearTimeout(messages.value[finalMessageIndex].typingTimer);
            delete messages.value[finalMessageIndex].typingTimer;
          }

          // 🔧 確保清除工具處理狀態（防止卡在處理中）
          messages.value[finalMessageIndex].isProcessingTools = false;
          messages.value[finalMessageIndex].toolProcessingMessage = null;
          messages.value[finalMessageIndex].toolProcessingError = null;
          messages.value[finalMessageIndex].isOptimizing = false;
          messages.value[finalMessageIndex].optimizingMessage = null;

          // 保存現有的思考內容（如果有的話）
          const existingThinkingContent =
            messages.value[finalMessageIndex].thinking_content;

          // 確保最終內容完整顯示（應用文字轉換）
          const finalConvertedContent =
            isTextConverterEnabled.value && textConverter.isAvailable()
              ? textConverter.convertStreamThinkingContent(
                  data.full_content,
                  textConversionMode.value
                )
              : data.full_content;

          messages.value[finalMessageIndex].content = finalConvertedContent;
          messages.value[finalMessageIndex].tokens_used = data.tokens_used;
          messages.value[finalMessageIndex].cost = data.cost;
          messages.value[finalMessageIndex].processing_time =
            data.processing_time;
          messages.value[finalMessageIndex].isStreaming = false; // 串流結束

          // 🎯 更新 metadata（包含圖表檢測結果）
          if (data.metadata || data.updated_message?.metadata) {
            messages.value[finalMessageIndex].metadata = {
              ...messages.value[finalMessageIndex].metadata,
              ...(data.metadata || data.updated_message?.metadata),
            };

            // 🎯 調試：記錄圖表檢測結果
            if (
              data.metadata?.chart_detection ||
              data.updated_message?.metadata?.chart_detection
            ) {
              console.log("🎯 [Chat Store] stream_done 收到圖表檢測結果:", {
                messageId: data.assistant_message_id,
                chart_detection:
                  data.metadata?.chart_detection ||
                  data.updated_message?.metadata?.chart_detection,
              });
            }
          }

          // 保留思考內容（優先使用現有的，如果沒有則使用新的）
          if (existingThinkingContent) {
            messages.value[finalMessageIndex].thinking_content =
              existingThinkingContent;
            console.log("stream_done: 保留現有思考內容");
          }
        }
        break;

      case "tool_calls_processed":
        // 工具調用處理完成
        console.log("工具調用處理完成:", data);

        // 更新對應的 AI 訊息，添加工具調用信息和思考內容
        const toolMessageIndex = messages.value.findIndex(
          (msg) => msg.id === data.assistant_message_id
        );

        if (toolMessageIndex !== -1) {
          // 保存現有的思考內容
          const existingThinkingContent =
            messages.value[toolMessageIndex].thinking_content;

          // 添加工具調用相關信息
          messages.value[toolMessageIndex].tool_calls = data.tool_calls || [];
          messages.value[toolMessageIndex].tool_results =
            data.tool_results || [];
          messages.value[toolMessageIndex].has_tool_calls =
            data.has_tool_calls || false;

          // 🔧 重要：同時更新 metadata 中的工具調用信息，確保 MessageBubble 能正確讀取
          if (!messages.value[toolMessageIndex].metadata) {
            messages.value[toolMessageIndex].metadata = {};
          }
          messages.value[toolMessageIndex].metadata.tool_calls =
            data.tool_calls || [];
          messages.value[toolMessageIndex].metadata.tool_results =
            data.tool_results || [];
          messages.value[toolMessageIndex].metadata.has_tool_calls =
            data.has_tool_calls || false;

          // 🔧 清除工具處理狀態
          messages.value[toolMessageIndex].isProcessingTools = false;
          messages.value[toolMessageIndex].toolProcessingMessage = null;
          messages.value[toolMessageIndex].toolProcessingError = null;

          // 🚀 清除二次調用優化狀態
          messages.value[toolMessageIndex].isOptimizing = false;
          messages.value[toolMessageIndex].optimizingMessage = null;

          console.log("🔧 [Chat Store] 工具調用處理完成，已清除工具處理狀態:", {
            messageId: data.assistant_message_id,
            isProcessingTools:
              messages.value[toolMessageIndex].isProcessingTools,
            isOptimizing: messages.value[toolMessageIndex].isOptimizing,
          });

          // 添加思考內容（優先使用新的，如果沒有則保留現有的）
          if (data.thinking_content) {
            // 應用文字轉換
            const convertedContent =
              isTextConverterEnabled.value && textConverter.isAvailable()
                ? textConverter.convertThinkingContent(
                    data.thinking_content,
                    textConversionMode.value
                  )
                : data.thinking_content;

            messages.value[toolMessageIndex].thinking_content =
              convertedContent;
            console.log("tool_calls_processed: 使用新的思考內容 (已轉換)");
          } else if (existingThinkingContent) {
            messages.value[toolMessageIndex].thinking_content =
              existingThinkingContent;
            console.log("tool_calls_processed: 保留現有思考內容");
          }
        }
        break;

      case "thinking_content_processed":
        // 思考內容處理完成（無工具調用時）
        console.log("思考內容處理完成:", data);

        // 更新對應的 AI 訊息，添加思考內容
        const thinkingMessageIndex = messages.value.findIndex(
          (msg) => msg.id === data.assistant_message_id
        );

        if (thinkingMessageIndex !== -1) {
          // 保存現有的思考內容
          const existingThinkingContent =
            messages.value[thinkingMessageIndex].thinking_content;

          // 添加思考內容（優先使用新的，如果沒有則保留現有的）
          if (data.thinking_content) {
            // 應用文字轉換
            const convertedContent =
              isTextConverterEnabled.value && textConverter.isAvailable()
                ? textConverter.convertThinkingContent(
                    data.thinking_content,
                    textConversionMode.value
                  )
                : data.thinking_content;

            messages.value[thinkingMessageIndex].thinking_content =
              convertedContent;
            console.log(
              "thinking_content_processed: 使用新的思考內容 (已轉換)"
            );
          } else if (existingThinkingContent) {
            messages.value[thinkingMessageIndex].thinking_content =
              existingThinkingContent;
            console.log("thinking_content_processed: 保留現有思考內容");
          }
        }
        break;

      case "tool_processing_start":
        // 🔧 新增：工具處理開始事件
        console.log("工具處理開始:", data);

        // 更新對應消息的狀態，顯示工具處理中
        const startProcessingMessageIndex = messages.value.findIndex(
          (msg) => msg.id === data.assistant_message_id
        );

        if (startProcessingMessageIndex !== -1) {
          messages.value[startProcessingMessageIndex].isProcessingTools = true;
          messages.value[startProcessingMessageIndex].toolProcessingMessage =
            data.message;
        }
        break;

      case "tool_processing_heartbeat":
        // 🔧 新增：工具處理心跳事件
        console.log("工具處理心跳:", data);

        // 更新工具處理狀態
        const heartbeatMessageIndex = messages.value.findIndex(
          (msg) => msg.id === data.assistant_message_id
        );

        if (heartbeatMessageIndex !== -1) {
          messages.value[heartbeatMessageIndex].toolProcessingMessage =
            data.message;
          messages.value[heartbeatMessageIndex].lastHeartbeat = data.timestamp;
        }
        break;

      case "tool_processing_error":
        // 🔧 新增：工具處理錯誤事件
        console.error("工具處理錯誤:", data);

        // 更新對應消息的錯誤狀態
        const errorProcessingMessageIndex = messages.value.findIndex(
          (msg) => msg.id === data.assistant_message_id
        );

        if (errorProcessingMessageIndex !== -1) {
          messages.value[errorProcessingMessageIndex].isProcessingTools = false;
          messages.value[errorProcessingMessageIndex].toolProcessingError =
            data.error;
          messages.value[errorProcessingMessageIndex].toolProcessingMessage =
            null;
        }
        break;

      case "secondary_ai_start":
        // 二次 AI 調用開始
        console.log("二次 AI 調用開始:", data);

        // 查找對應的消息並設置優化狀態
        const optimizingMessageIndex = messages.value.findIndex(
          (msg) => msg.id === data.assistant_message_id
        );

        if (optimizingMessageIndex !== -1) {
          messages.value[optimizingMessageIndex].isOptimizing = true;
          messages.value[optimizingMessageIndex].optimizingMessage =
            data.message || "正在優化回應內容...";
        }
        break;

      case "secondary_ai_stream_start":
        // 🔧 新增：二次 AI 流式調用開始
        console.log("二次 AI 流式調用開始:", data);

        const streamStartMessageIndex = messages.value.findIndex(
          (msg) => msg.id === data.assistant_message_id
        );

        if (streamStartMessageIndex !== -1) {
          messages.value[streamStartMessageIndex].isOptimizing = true;
          messages.value[streamStartMessageIndex].optimizingMessage =
            data.message || "開始流式生成回應...";
          messages.value[streamStartMessageIndex].isStreamingSecondary = true; // 🔧 標記為流式二次調用
        }
        break;

      case "secondary_ai_stream_done":
        // 🔧 新增：二次 AI 流式調用完成
        console.log("二次 AI 流式調用完成:", data);

        const streamDoneMessageIndex = messages.value.findIndex(
          (msg) => msg.id === data.assistant_message_id
        );

        if (streamDoneMessageIndex !== -1) {
          // 清除優化和流式狀態
          messages.value[streamDoneMessageIndex].isOptimizing = false;
          messages.value[streamDoneMessageIndex].optimizingMessage = null;
          messages.value[streamDoneMessageIndex].isStreamingSecondary = false;

          // 確保最終內容完整顯示
          if (data.full_content) {
            const finalConvertedContent =
              isTextConverterEnabled.value && textConverter.isAvailable()
                ? textConverter.convertStreamThinkingContent(
                    data.full_content,
                    textConversionMode.value
                  )
                : data.full_content;

            messages.value[streamDoneMessageIndex].content =
              finalConvertedContent;
          }

          // 更新 tokens
          if (data.tokens_used) {
            messages.value[streamDoneMessageIndex].tokens_used =
              data.tokens_used;
          }
        }
        break;

      case "secondary_ai_stream_error":
        // 🔧 新增：二次 AI 流式調用錯誤
        console.error("二次 AI 流式調用錯誤:", data);

        const streamErrorMessageIndex = messages.value.findIndex(
          (msg) => msg.id === data.assistant_message_id
        );

        if (streamErrorMessageIndex !== -1) {
          // 清除優化和流式狀態
          messages.value[streamErrorMessageIndex].isOptimizing = false;
          messages.value[streamErrorMessageIndex].optimizingMessage = null;
          messages.value[streamErrorMessageIndex].isStreamingSecondary = false;

          // 顯示錯誤信息
          messages.value[streamErrorMessageIndex].streamError = data.error;
        }

        // 顯示錯誤提示
        message.error(`二次 AI 調用失敗: ${data.error}`);
        break;

      case "conversation_updated":
        // 對話狀態更新
        //console.log("對話已更新:", data.conversation);

        // 更新對話列表中的對話信息
        const convIndex = conversations.value.findIndex(
          (conv) => conv.id === conversationId
        );
        if (convIndex !== -1) {
          // 對話已存在，更新對話信息
          conversations.value[convIndex] = data.conversation;

          // 重新排序整個對話列表（考慮置頂狀態）
          conversations.value.sort((a, b) => {
            if (a.is_pinned && !b.is_pinned) return -1;
            if (!a.is_pinned && b.is_pinned) return 1;
            return new Date(b.last_message_at) - new Date(a.last_message_at);
          });
        } else {
          // 對話不存在，且有標題時才添加到歷史列表
          if (
            data.conversation.title &&
            data.conversation.title.trim() !== "" &&
            data.conversation.title !== "新對話"
          ) {
            handleAddConversationToHistory(data.conversation);
          }
        }

        // 如果是當前對話，也更新當前對話數據
        if (
          currentConversation.value &&
          currentConversation.value.id === conversationId
        ) {
          Object.assign(currentConversation.value, data.conversation);
        }
        break;

      case "error":
        // 錯誤事件
        console.error("SSE 錯誤:", data.error);

        // 直接使用原始錯誤訊息，不進行處理
        // message.error(data.error);

        // 查找是否有正在串流的 assistant 訊息
        const streamingMessageIndex = messages.value.findIndex(
          (msg) =>
            msg.role === "assistant" &&
            msg.isStreaming &&
            msg.conversation_id === conversationId
        );

        if (streamingMessageIndex !== -1) {
          // 更新現有的串流訊息為錯誤訊息
          messages.value[streamingMessageIndex].content = data.error;
          messages.value[streamingMessageIndex].isStreaming = false;
          messages.value[streamingMessageIndex].isError = true;
          console.log(
            "更新串流訊息為錯誤訊息:",
            messages.value[streamingMessageIndex]
          );
        } else {
          // 創建新的錯誤訊息記錄
          const errorMessage = {
            id: Date.now(), // 臨時 ID
            conversation_id: conversationId,
            role: "assistant",
            content: data.error,
            content_type: "text",
            tokens_used: 0,
            created_at: new Date().toISOString(),
            isStreaming: false,
            isError: true, // 標記為錯誤訊息
          };

          // 添加到當前對話的訊息列表
          if (
            currentConversation.value &&
            currentConversation.value.id === conversationId
          ) {
            messages.value.push(errorMessage);
            console.log("創建新的錯誤訊息:", errorMessage);
          }
        }

        throw new Error(data.error);

      default:
        console.warn("未知的 SSE 事件類型:", eventType, data);
    }
  }

  // 🔧 新增：轉換消息的所有內容（包括主要內容和思考內容）
  const convertMessagesContent = (messages, mode) => {
    if (!Array.isArray(messages)) return messages;

    return messages.map((message) => {
      const convertedMessage = { ...message };

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

  // 文字轉換相關方法
  const setTextConversionMode = (mode) => {
    textConversionMode.value = mode;
    // 重新轉換當前載入的消息
    if (messages.value.length > 0 && isTextConverterEnabled.value) {
      messages.value = convertMessagesContent(messages.value, mode);
    }
  };

  const toggleTextConverter = (enabled) => {
    isTextConverterEnabled.value = enabled;
    // 如果禁用轉換，需要重新載入消息以獲取原始內容
    if (!enabled && currentConversation.value) {
      handleGetMessages(currentConversation.value.id);
    }
  };

  const getTextConverterInfo = () => ({
    isEnabled: isTextConverterEnabled.value,
    mode: textConversionMode.value,
    isAvailable: textConverter.isAvailable(),
    supportedModes: textConverter.getSupportedModes(),
  });

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
    isStreaming,
    streamingMessageId,
    conversationPagination,
    messagePagination,
    // 文字轉換狀態
    textConversionMode,
    isTextConverterEnabled,

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
    handleLoadMoreConversations,
    handleSearchConversations,
    handleClearCurrentConversation,
    handleInitializeChat,
    sendMessageStream,
    stopCurrentStream,
    handleSSEEvent,
    handleAddConversationToHistory,
    sendMessage,
    // 文字轉換方法
    setTextConversionMode,
    toggleTextConverter,
    getTextConverterInfo,
  };
});
