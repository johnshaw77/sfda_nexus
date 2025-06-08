<template>
  <div class="chat-page">
    <!-- 使用 Ant Design Layout 創建響應式布局 -->
    <a-layout class="chat-layout">
      <!-- 左側對話列表側邊欄 -->
      <a-layout-sider
        v-model:collapsed="sidebarCollapsed"
        :collapsed-width="0"
        :width="300"
        :trigger="null"
        :breakpoint="breakpoint"
        @breakpoint="handleBreakpointChange"
        @collapse="handleSidebarCollapse"
        class="conversation-sider"
        :class="{ 'mobile-hidden': isMobile && !sidebarVisible }">
        <ConversationList @conversation-selected="handleConversationSelected" />
      </a-layout-sider>

      <!-- 主要聊天內容區域 -->
      <a-layout class="chat-main-layout">
        <!-- 聊天頭部工具欄 (手機端顯示) -->
        <a-layout-header
          v-if="isMobile"
          class="chat-mobile-header">
          <div class="mobile-header-left">
            <a-button
              type="text"
              @click="toggleSidebar"
              class="mobile-menu-btn">
              <MenuOutlined />
            </a-button>
            <span class="current-conversation-title">
              {{ currentConversationTitle }}
            </span>
          </div>
          <div class="mobile-header-right">
            <a-button
              type="text"
              @click="handleNewConversation"
              class="mobile-new-btn">
              <PlusOutlined />
            </a-button>
          </div>
        </a-layout-header>

        <!-- 聊天內容區域 -->
        <a-layout-content class="chat-content">
          <div class="chat-main">
            <ChatArea
              v-if="selectedAgent"
              :agent="selectedAgent" />
            <WelcomeScreen v-else />
          </div>
        </a-layout-content>
      </a-layout>
    </a-layout>

    <!-- 手機端側邊欄遮罩 -->
    <div
      v-if="isMobile && sidebarVisible"
      class="sidebar-overlay"
      @click="closeSidebar" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useWebSocketStore } from "@/stores/websocket";
import { useChatStore } from "@/stores/chat";
import { useAuthStore } from "@/stores/auth";
import { useAgentsStore } from "@/stores/agents";
import { Grid } from "ant-design-vue";
import ChatArea from "./components/ChatArea.vue";
import WelcomeScreen from "./components/WelcomeScreen.vue";
import ConversationList from "./components/ConversationList.vue";
import { MenuOutlined, PlusOutlined } from "@ant-design/icons-vue";

// Props
const props = defineProps({
  agentId: {
    type: String,
    default: null,
  },
});

// 響應式斷點
const { useBreakpoint } = Grid;
const screens = useBreakpoint();

// 響應式狀態
const sidebarCollapsed = ref(false);
const sidebarVisible = ref(false);
const breakpoint = ref("lg");

// 計算屬性
const isMobile = computed(() => !screens.value.md);
const isTablet = computed(() => screens.value.md && !screens.value.lg);

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

// 當前對話標題
const currentConversationTitle = computed(() => {
  return chatStore.currentConversation?.title || "新對話";
});

// 響應式控制方法
const toggleSidebar = () => {
  if (isMobile.value) {
    sidebarVisible.value = !sidebarVisible.value;
  } else {
    sidebarCollapsed.value = !sidebarCollapsed.value;
  }
};

const closeSidebar = () => {
  sidebarVisible.value = false;
};

const handleBreakpointChange = (broken) => {
  if (broken) {
    sidebarCollapsed.value = true;
    sidebarVisible.value = false;
  }
};

const handleSidebarCollapse = (collapsed) => {
  sidebarCollapsed.value = collapsed;
};

// 對話相關方法
const handleConversationSelected = (conversation) => {
  // 手機端選擇對話後自動關閉側邊欄
  if (isMobile.value) {
    closeSidebar();
  }
};

const handleNewConversation = () => {
  chatStore.createNewConversation();
};

// 監聽響應式變化
watch(
  isMobile,
  (newValue) => {
    if (newValue) {
      // 切換到手機端時重置狀態
      sidebarCollapsed.value = false;
      sidebarVisible.value = false;
    } else {
      // 切換到桌面端時顯示側邊欄
      sidebarVisible.value = false;
      sidebarCollapsed.value = false;
    }
  },
  { immediate: true }
);

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
    }
  }
);

onMounted(async () => {
  console.log("🚀 Chat 頁面載入開始");

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
    console.log("用戶正在輸入:", data);
  });
};

// 清理
onUnmounted(() => {
  // 清理背景滾動鎖定（如果有的話）
  document.body.style.overflow = "";
});
</script>

<style scoped>
.chat-page {
  height: 100vh;
  overflow: hidden;
}

.chat-layout {
  height: 100%;
}

/* 對話列表側邊欄 */
.conversation-sider {
  background: var(--custom-bg-primary);
  border-right: 1px solid var(--custom-border-primary);
  z-index: 100;
  transition: all 0.3s ease;
}

.conversation-sider.mobile-hidden {
  transform: translateX(-100%);
}

/* 主聊天布局 */
.chat-main-layout {
  position: relative;
}

/* 手機端頭部 */
.chat-mobile-header {
  height: 56px;
  background: var(--custom-bg-primary);
  border-bottom: 1px solid var(--custom-border-primary);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  z-index: 50;
}

.mobile-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.mobile-menu-btn,
.mobile-new-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.current-conversation-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--custom-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mobile-header-right {
  flex-shrink: 0;
}

/* 聊天內容區域 */
.chat-content {
  position: relative;
  overflow: hidden;
}

.chat-main {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 手機端側邊欄遮罩 */
.sidebar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 99;
  transition: opacity 0.3s ease;
}

/* 響應式設計 */
@media (min-width: 768px) {
  .chat-mobile-header {
    display: none;
  }
}

@media (max-width: 767px) {
  .conversation-sider {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    z-index: 100;
    width: 280px !important;
    max-width: 280px !important;
    min-width: 280px !important;
  }

  .conversation-sider:not(.mobile-hidden) {
    transform: translateX(0);
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.15);
  }

  .chat-main-layout {
    width: 100%;
  }
}

/* 平板優化 */
@media (min-width: 768px) and (max-width: 991px) {
  .conversation-sider {
    width: 260px;
  }
}

/* 桌面端優化 */
@media (min-width: 992px) {
  .conversation-sider {
    width: 300px;
  }
}
</style>
