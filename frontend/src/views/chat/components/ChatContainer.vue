<template>
  <div class="chat-container">
    <!-- 聊天頭部 -->
    <div class="chat-header">
      <div class="header-left">
        <a-button
          type="text"
          @click="toggleSidebar"
          class="sidebar-toggle"
          :class="{ 'mobile-only': !isMobile }">
          <MenuOutlined />
        </a-button>
        <h2 class="chat-title">SFDA Nexus</h2>
      </div>

      <div class="header-right">
        <a-space>
          <!-- WebSocket連接狀態 -->
          <a-badge
            :status="
              wsStore.connectionStatus === 'connected' ? 'success' : 'error'
            "
            :text="
              wsStore.connectionStatus === 'connected' ? '已連接' : '未連接'
            " />

          <!-- 用戶信息 -->
          <a-dropdown>
            <a-button type="text">
              <UserOutlined />
              {{ authStore.user?.username }}
            </a-button>
            <template #overlay>
              <a-menu>
                <a-menu-item @click="handleLogout">
                  <LogoutOutlined />
                  登出
                </a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
        </a-space>
      </div>
    </div>

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
import {
  MenuOutlined,
  UserOutlined,
  LogoutOutlined,
} from "@ant-design/icons-vue";
import { useAuthStore } from "@/stores/auth";
import { useWebSocketStore } from "@/stores/websocket";
import { useChatStore } from "@/stores/chat";
import ConversationList from "./ConversationList.vue";
import ChatArea from "./ChatArea.vue";
import WelcomeScreen from "./WelcomeScreen.vue";

// Store
const authStore = useAuthStore();
const wsStore = useWebSocketStore();
const chatStore = useChatStore();

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

// 切換側邊欄
const toggleSidebar = () => {
  sidebarOpen.value = !sidebarOpen.value;
};

// 關閉側邊欄
const closeSidebar = () => {
  sidebarOpen.value = false;
};

// 處理登出
const handleLogout = async () => {
  await authStore.handleLogout();
  wsStore.disconnect();
  window.location.href = "/login";
};

// 監聽窗口大小變化
const handleResize = () => {
  checkMobile();
};

onMounted(async () => {
  // 檢查移動端
  checkMobile();
  window.addEventListener("resize", handleResize);

  // 初始化聊天數據
  await chatStore.handleInitializeChat();

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
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}

.chat-header {
  height: 64px;
  padding: 0 24px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.sidebar-toggle {
  display: none;
}

.chat-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #1890ff;
}

.header-right {
  display: flex;
  align-items: center;
}

.chat-content {
  flex: 1;
  display: flex;
  overflow: hidden;
  position: relative;
}

.chat-sidebar {
  width: 300px;
  background: #fff;
  border-right: 1px solid #f0f0f0;
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
}

.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #fff;
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

/* 移動端樣式 */
@media (max-width: 768px) {
  .sidebar-toggle {
    display: flex !important;
  }

  .mobile-only {
    display: none !important;
  }

  .chat-sidebar {
    position: fixed;
    top: 64px;
    left: -300px;
    height: calc(100vh - 64px);
    z-index: 1000;
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.15);
  }

  .chat-sidebar.open {
    left: 0;
  }

  .chat-main {
    width: 100%;
  }

  .chat-header {
    padding: 0 16px;
  }

  .chat-title {
    font-size: 18px;
  }
}

/* 深色模式支持 */
@media (prefers-color-scheme: dark) {
  .chat-container {
    background: #141414;
  }

  .chat-header {
    background: #1f1f1f;
    border-bottom-color: #303030;
  }

  .chat-sidebar {
    background: #1f1f1f;
    border-right-color: #303030;
  }

  .chat-main {
    background: #1f1f1f;
  }

  .chat-title {
    color: #1890ff;
  }
}
</style>
