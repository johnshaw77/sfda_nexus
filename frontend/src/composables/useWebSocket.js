import { computed } from "vue";
import { useWebSocketStore } from "@/stores/websocket";

export function useWebSocket() {
  const websocketStore = useWebSocketStore();

  // 獲取 WebSocket 實例
  const socket = computed(() => websocketStore.ws);

  // 連接狀態
  const isConnected = computed(() => websocketStore.isConnected);
  const isConnecting = computed(() => websocketStore.isConnecting);
  const connectionStatus = computed(() => websocketStore.connectionStatus);

  // 方法
  const connect = websocketStore.connect;
  const disconnect = websocketStore.disconnect;
  const sendMessage = websocketStore.handleSendMessage;
  const addEventListener = websocketStore.addEventListener;
  const removeEventListener = websocketStore.removeEventListener;

  return {
    socket,
    isConnected,
    isConnecting,
    connectionStatus,
    connect,
    disconnect,
    sendMessage,
    addEventListener,
    removeEventListener,
  };
}
