<template>
  <div class="chat-container">
    <!-- 聊天內容區域 -->
    <div class="chat-content">
      <!-- 主聊天區域 -->
      <div class="chat-main">
        <ChatArea
          v-if="selectedAgent"
          :agent="selectedAgent" />
        <WelcomeScreen v-else />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useWebSocketStore } from "@/stores/websocket";
import { useChatStore } from "@/stores/chat";
import { useAuthStore } from "@/stores/auth";
import { useAgentsStore } from "@/stores/agents";
import ChatArea from "./ChatArea.vue";
import WelcomeScreen from "./WelcomeScreen.vue";

// Props
const props = defineProps({
  agentId: {
    type: String,
    default: null,
  },
});

// Store
const wsStore = useWebSocketStore();
const chatStore = useChatStore();
const authStore = useAuthStore();
const agentsStore = useAgentsStore();

// 計算當前選中的智能體
const selectedAgent = computed(() => {
  if (!props.agentId) return null;
  return agentsStore.getAgentById(parseInt(props.agentId));
});

// 監聽智能體變化
watch(
  () => props.agentId,
  (newAgentId) => {
    if (newAgentId && selectedAgent.value) {
      console.log(
        "切換到智能體:",
        selectedAgent.value.display_name || selectedAgent.value.name
      );
      // 設置當前智能體到 store
      agentsStore.setCurrentAgent(selectedAgent.value);
      // 這裡可以添加切換智能體的邏輯，比如創建新對話或切換到該智能體的對話
    }
  }
);

onMounted(async () => {
  console.log("🚀 ChatContainer 載入開始");

  // 確保認證狀態已初始化
  if (!authStore.isInitialized) {
    console.log("📡 等待 authStore 初始化...");
    await authStore.handleInitialize();
  }

  // 確保用戶已認證
  if (!authStore.isAuthenticated) {
    console.log("❌ 用戶未認證，跳過聊天初始化");
    return;
  }

  console.log("✅ 認證狀態確認，開始初始化聊天數據");

  try {
    // 初始化智能體數據
    await agentsStore.initialize();
    console.log("✅ 智能體數據初始化完成");

    // 初始化聊天數據
    await chatStore.handleInitializeChat();
    console.log("✅ 聊天數據初始化完成");
  } catch (error) {
    console.error("❌ 聊天數據初始化失敗:", error);
  }

  // 設置WebSocket事件監聽
  setupWebSocketListeners();
});

// 設置WebSocket事件監聽
const setupWebSocketListeners = () => {
  // 監聽新消息
  wsStore.addEventListener("new_message", (data) => {
    chatStore.handleAddMessage(data.message);
  });

  // 監聽消息發送確認
  wsStore.addEventListener("message_sent", (data) => {
    chatStore.handleAddMessage(data.message);
  });

  // 監聽AI回應
  wsStore.addEventListener("ai_response", (data) => {
    chatStore.handleAddMessage(data.message);
  });

  // 監聽AI輸入狀態
  wsStore.addEventListener("ai_typing", (data) => {
    chatStore.handleSetAITypingStatus(data.isTyping);
  });

  // 監聽用戶輸入狀態
  wsStore.addEventListener("user_typing", (data) => {
    // 可以在這裡顯示其他用戶正在輸入的狀態
    console.log("用戶正在輸入:", data);
  });
};
</script>

<style scoped>
.chat-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f8fafc;
}

.chat-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>
