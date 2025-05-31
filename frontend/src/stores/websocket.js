/**
 * WebSocket 狀態管理
 * 處理實時通信連接和消息
 */

import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { message } from "ant-design-vue";
import { useAuthStore } from "./auth";

export const useWebSocketStore = defineStore("websocket", () => {
  // 狀態
  const ws = ref(null);
  const isConnected = ref(false);
  const isConnecting = ref(false);
  const clientId = ref(null);
  const reconnectAttempts = ref(0);
  const maxReconnectAttempts = 5;
  const reconnectInterval = ref(null);
  const messageQueue = ref([]); // 離線時的消息隊列

  // 事件監聽器
  const eventListeners = ref(new Map());

  // 計算屬性
  const connectionStatus = computed(() => {
    if (isConnecting.value) return "connecting";
    if (isConnected.value) return "connected";
    return "disconnected";
  });

  // WebSocket URL
  const getWebSocketUrl = () => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    return `${protocol}//${host}/ws`;
  };

  // 連接WebSocket
  const connect = () => {
    if (isConnected.value || isConnecting.value) return;

    const authStore = useAuthStore();
    if (!authStore.token) {
      console.warn("無法連接WebSocket: 未認證");
      return;
    }

    isConnecting.value = true;

    try {
      const wsUrl = getWebSocketUrl();
      ws.value = new WebSocket(wsUrl);

      // 連接成功
      ws.value.onopen = () => {
        console.log("WebSocket連接成功");
        isConnected.value = true;
        isConnecting.value = false;
        reconnectAttempts.value = 0;

        // 發送認證消息
        handleSendMessage({
          type: "auth",
          data: {
            token: authStore.token,
          },
        });

        // 處理離線消息隊列
        handleProcessMessageQueue();
      };

      // 接收消息
      ws.value.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleReceiveMessage(message);
        } catch (error) {
          console.error("WebSocket消息解析失敗:", error);
        }
      };

      // 連接關閉
      ws.value.onclose = (event) => {
        console.log("WebSocket連接關閉:", event.code, event.reason);
        isConnected.value = false;
        isConnecting.value = false;
        clientId.value = null;

        // 自動重連
        if (reconnectAttempts.value < maxReconnectAttempts) {
          handleReconnect();
        } else {
          message.error("WebSocket連接失敗，請檢查網絡連接");
        }
      };

      // 連接錯誤
      ws.value.onerror = (error) => {
        console.error("WebSocket連接錯誤:", error);
        isConnecting.value = false;
      };
    } catch (error) {
      console.error("創建WebSocket連接失敗:", error);
      isConnecting.value = false;
    }
  };

  // 斷開連接
  const disconnect = () => {
    if (reconnectInterval.value) {
      clearTimeout(reconnectInterval.value);
      reconnectInterval.value = null;
    }

    if (ws.value) {
      ws.value.close();
      ws.value = null;
    }

    isConnected.value = false;
    isConnecting.value = false;
    clientId.value = null;
    reconnectAttempts.value = 0;
  };

  // 重連
  const handleReconnect = () => {
    if (reconnectInterval.value) return;

    reconnectAttempts.value++;
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.value), 30000);

    console.log(
      `WebSocket重連中... (${reconnectAttempts.value}/${maxReconnectAttempts})`
    );

    reconnectInterval.value = setTimeout(() => {
      reconnectInterval.value = null;
      connect();
    }, delay);
  };

  // 發送消息
  const handleSendMessage = (message) => {
    if (!isConnected.value || !ws.value) {
      // 添加到離線隊列
      messageQueue.value.push(message);
      console.warn("WebSocket未連接，消息已加入隊列");
      return false;
    }

    try {
      ws.value.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error("發送WebSocket消息失敗:", error);
      return false;
    }
  };

  // 處理接收到的消息
  const handleReceiveMessage = (message) => {
    const { type, data } = message;

    switch (type) {
      case "connection":
        clientId.value = data.clientId;
        console.log("WebSocket連接確認:", data.clientId);
        break;

      case "auth_success":
        console.log("WebSocket認證成功:", data.user);
        break;

      case "auth_error":
        console.error("WebSocket認證失敗:", data.message);
        message.error(`WebSocket認證失敗: ${data.message}`);
        break;

      case "error":
        console.error("WebSocket錯誤:", data.message);
        message.error(data.message);
        break;

      case "pong":
        // 心跳回應
        break;

      default:
        // 觸發事件監聽器
        handleTriggerEvent(type, data);
    }
  };

  // 處理離線消息隊列
  const handleProcessMessageQueue = () => {
    while (messageQueue.value.length > 0) {
      const message = messageQueue.value.shift();
      handleSendMessage(message);
    }
  };

  // 添加事件監聽器
  const addEventListener = (eventType, callback) => {
    if (!eventListeners.value.has(eventType)) {
      eventListeners.value.set(eventType, new Set());
    }
    eventListeners.value.get(eventType).add(callback);

    // 返回移除監聽器的函數
    return () => {
      const listeners = eventListeners.value.get(eventType);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          eventListeners.value.delete(eventType);
        }
      }
    };
  };

  // 移除事件監聽器
  const removeEventListener = (eventType, callback) => {
    const listeners = eventListeners.value.get(eventType);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        eventListeners.value.delete(eventType);
      }
    }
  };

  // 觸發事件
  const handleTriggerEvent = (eventType, data) => {
    const listeners = eventListeners.value.get(eventType);
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`事件監聽器執行失敗 (${eventType}):`, error);
        }
      });
    }
  };

  // 加入房間
  const handleJoinRoom = (roomId) => {
    return handleSendMessage({
      type: "join_room",
      data: { roomId },
    });
  };

  // 離開房間
  const handleLeaveRoom = (roomId) => {
    return handleSendMessage({
      type: "leave_room",
      data: { roomId },
    });
  };

  // 發送實時聊天消息
  const handleSendRealtimeChat = (conversationId, content, options = {}) => {
    return handleSendMessage({
      type: "realtime_chat",
      data: {
        conversationId,
        content,
        contentType: options.contentType || "text",
        attachments: options.attachments,
        metadata: options.metadata,
      },
    });
  };

  // 發送輸入狀態
  const handleSendTypingStatus = (conversationId, isTyping) => {
    return handleSendMessage({
      type: "typing_status",
      data: {
        conversationId,
        isTyping,
      },
    });
  };

  // 發送對話狀態
  const handleSendConversationStatus = (
    conversationId,
    status,
    metadata = {}
  ) => {
    return handleSendMessage({
      type: "conversation_status",
      data: {
        conversationId,
        status,
        metadata,
      },
    });
  };

  // 發送心跳
  const handleSendPing = () => {
    return handleSendMessage({
      type: "ping",
      data: {},
    });
  };

  // 設置心跳定時器
  const setupHeartbeat = () => {
    setInterval(() => {
      if (isConnected.value) {
        handleSendPing();
      }
    }, 30000); // 每30秒發送一次心跳
  };

  // 初始化
  const initialize = () => {
    setupHeartbeat();
  };

  return {
    // 狀態
    ws,
    isConnected,
    isConnecting,
    clientId,
    reconnectAttempts,
    messageQueue,

    // 計算屬性
    connectionStatus,

    // 方法
    connect,
    disconnect,
    handleSendMessage,
    sendMessage: handleSendMessage,
    addEventListener,
    removeEventListener,
    handleJoinRoom,
    handleLeaveRoom,
    handleSendRealtimeChat,
    handleSendTypingStatus,
    handleSendConversationStatus,
    handleSendPing,
    initialize,
  };
});
