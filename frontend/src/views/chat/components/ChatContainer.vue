<template>
  <div class="chat-container">
    <!-- 聊天內容區域 -->
    <div class="chat-content">
      <!-- 側邊欄 -->
      <div
        class="chat-sidebar"
        :class="{ open: sidebarOpen }">
        <ConversationList />
      </div>

      <!-- 主聊天區域 -->
      <div class="chat-main">
        <ChatArea v-if="chatStore.currentConversation" />
        <WelcomeScreen v-else />
      </div>
    </div>

    <!-- 遮罩層（移動端） -->
    <div
      v-if="isMobile && sidebarOpen"
      class="sidebar-overlay"
      @click="closeSidebar"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { useWebSocketStore } from "@/stores/websocket";
import { useChatStore } from "@/stores/chat";
import { useAuthStore } from "@/stores/auth";
import ConversationList from "./ConversationList.vue";
import ChatArea from "./ChatArea.vue";
import WelcomeScreen from "./WelcomeScreen.vue";

// Store
const wsStore = useWebSocketStore();
const chatStore = useChatStore();
const authStore = useAuthStore();

// 響應式狀態
const sidebarOpen = ref(false);
const isMobile = ref(false);

// 檢查是否為移動端
const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768;
  if (!isMobile.value) {
    sidebarOpen.value = false;
  }
};

// 關閉側邊欄
const closeSidebar = () => {
  sidebarOpen.value = false;
};

// 監聽窗口大小變化
const handleResize = () => {
  checkMobile();
};

onMounted(async () => {
  console.log("🚀 ChatContainer 載入開始");

  // 檢查移動端
  checkMobile();
  window.addEventListener("resize", handleResize);

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
    // 初始化聊天數據
    await chatStore.handleInitializeChat();
    console.log("✅ 聊天數據初始化完成");
  } catch (error) {
    console.error("❌ 聊天數據初始化失敗:", error);
  }

  // 設置WebSocket事件監聽
  setupWebSocketListeners();
});

onUnmounted(() => {
  window.removeEventListener("resize", handleResize);
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
  background: #f5f5f5;
}

.chat-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.chat-sidebar {
  width: 300px;
  background: #fff;
  border-right: 1px solid #f0f0f0;
  transition: transform 0.3s ease;
}

.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 移動端樣式 */
@media (max-width: 768px) {
  .chat-sidebar {
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
    z-index: 1000;
    transform: translateX(-100%);
  }

  .chat-sidebar.open {
    transform: translateX(0);
  }

  .sidebar-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 999;
  }
}

/* 桌面端樣式 */
@media (min-width: 769px) {
  .chat-sidebar {
    position: relative;
  }
}
</style>
