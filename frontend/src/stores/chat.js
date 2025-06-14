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

      // 處理調試信息
      if (debug_info && debug_info.stages) {
        // 通過事件總線發送調試信息到調試面板
        debug_info.stages.forEach((stage) => {
          window.dispatchEvent(
            new CustomEvent("debug_info", {
              detail: {
                sessionId: debug_info.sessionId,
                conversationId: conversationId,
                stage: stage.stage,
                timestamp: stage.timestamp,
                message: stage.data.message || `${stage.stage} 階段`,
                ...stage.data,
              },
            })
          );
        });
      }

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
      console.log("availableModels", response.data.data);
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
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal, // 添加 abort signal
      });

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

      // 重新載入對話以獲取最新狀態
      await handleGetMessages(conversationId);

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
        // 串流內容數據
        //console.log("收到串流內容:", data.content);

        // 第一次收到內容時，隱藏思考狀態
        if (aiTyping.value) {
          aiTyping.value = false;
        }

        updateStreamingContent(data.full_content);

        // 更新當前對話中的 AI 訊息內容
        const contentMessageIndex = messages.value.findIndex(
          (msg) => msg.id === data.assistant_message_id
        );

        if (contentMessageIndex !== -1) {
          // 實現打字機效果：逐字符顯示
          const currentMessage = messages.value[contentMessageIndex];
          const newContent = data.full_content;
          const currentContent = currentMessage.content || "";

          // 如果新內容比當前內容長，則逐字符添加
          if (newContent.length > currentContent.length) {
            animateTyping(contentMessageIndex, currentContent, newContent);
          } else {
            // 直接更新（處理內容被替換的情況）
            messages.value[contentMessageIndex].content = newContent;
          }

          messages.value[contentMessageIndex].tokens_used = data.tokens_used;
        }
        break;

      case "stream_done":
        // 串流完成
        //console.log("串流完成:", data);

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

          // 確保最終內容完整顯示
          messages.value[finalMessageIndex].content = data.full_content;
          messages.value[finalMessageIndex].tokens_used = data.tokens_used;
          messages.value[finalMessageIndex].cost = data.cost;
          messages.value[finalMessageIndex].processing_time =
            data.processing_time;
          messages.value[finalMessageIndex].isStreaming = false; // 串流結束
        }
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
    sendMessageStream,
    stopCurrentStream,
    handleSSEEvent,
    handleAddConversationToHistory,
  };
});
