<template>
  <div class="chat-page">
    <!-- 使用 Ant Design Layout 創建響應式布局 -->
    <a-layout class="chat-layout">
      <!-- 左側對話列表側邊欄 -->
      <a-layout-sider
        :collapsed="sidebarCollapsed"
        :collapsed-width="60"
        :width="300"
        :trigger="null"
        :breakpoint="breakpoint"
        :class="{
          'conversation-sider': true,
          'mobile-hidden': isMobile && !sidebarVisible,
          'sider-collapsed': sidebarCollapsed,
        }"
        @breakpoint="handleBreakpointChange"
        @collapse="handleSidebarCollapse">
        <ConversationList
          @conversation-selected="handleConversationSelected"
          @toggle-collapse="handleToggleCollapse"
          :expanding="isExpanding"
          :is-mobile="isMobile"
          :parentCollapsed="sidebarCollapsed" />

        <!-- 側邊欄摺疊時的展開按鈕 (桌面端) -->
        <div
          v-if="!isMobile && sidebarCollapsed"
          class="collapsed-sidebar-content">
          <!-- <div class="collapsed-sidebar-logo">
            <MessageCircleMore :size="24" />
          </div>
          <div class="collapsed-sidebar-text">聊天</div>
          <div class="collapsed-sidebar-divider"></div> -->
          <a-tooltip
            title="展開對話面板"
            placement="right">
            <a-button
              type="text"
              @click="handleExpandSidebar"
              class="collapsed-expand-btn">
              <PanelLeftOpen :size="20" />
            </a-button>
          </a-tooltip>
        </div>
      </a-layout-sider>

      <!-- 主要聊天內容區域 -->
      <a-layout class="chat-main-layout">
        <!-- 聊天頭部工具欄 (手機端顯示) -->
        <a-layout-header
          v-if="isMobile"
          class="chat-mobile-header">
          <div class="mobile-header-left">
            <a-tooltip
              title="展開對話面板"
              placement="bottom"
              :arrow="false">
              <a-button
                type="text"
                @click="toggleSidebar"
                class="mobile-menu-btn">
                <PanelLeftOpen :size="18" />
              </a-button>
            </a-tooltip>
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
import { useLocalStorage } from "@vueuse/core";
import { useWebSocketStore } from "@/stores/websocket";
import { useChatStore } from "@/stores/chat";
import { useAuthStore } from "@/stores/auth";
import { useAgentsStore } from "@/stores/agents";
import { Grid } from "ant-design-vue";
import ChatArea from "./components/ChatArea.vue";
import WelcomeScreen from "./components/WelcomeScreen.vue";
import ConversationList from "./components/ConversationList.vue";
import { PanelLeftOpen, MessageCircleMore } from "lucide-vue-next";
import { useRouter, useRoute } from "vue-router";
import api from "@/api/index.js";

// Props
const props = defineProps({
  agentId: {
    type: String,
    required: false,
  },
  conversationId: {
    type: String,
    required: false,
  },
});

// 響應式斷點
const { useBreakpoint } = Grid;
const screens = useBreakpoint();

// 響應式狀態 - 使用 localStorage 記住折疊狀態，預設為折疊
const sidebarCollapsed = useLocalStorage("chat-sidebar-collapsed", true);
const sidebarVisible = ref(false);
const breakpoint = ref("lg");
const isExpanding = ref(false);

// 計算屬性
const isMobile = computed(() => !screens.value.md);
const isTablet = computed(() => screens.value.md && !screens.value.lg);

// Store
const wsStore = useWebSocketStore();
const chatStore = useChatStore();
const authStore = useAuthStore();
const agentsStore = useAgentsStore();

// Router
const router = useRouter();
const route = useRoute();

// 計算當前選中的智能體
const selectedAgent = computed(() => {
  if (!props.agentId) return null;
  return agentsStore.getAgentById(parseInt(props.agentId));
});

// 當前對話標題
const currentConversationTitle = computed(() => {
  return (
    chatStore.currentConversation?.title ||
    "新對話(未實做，這應該要顯示當前對話的標題)"
  );
});

// 響應式控制方法
const toggleSidebar = () => {
  console.log("toggleSidebar triggered");
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
    // 斷點變化時只重置手機端側邊欄狀態，不改變桌面端的折疊狀態
    sidebarVisible.value = false;
    // 不再強制設定 sidebarCollapsed，讓它保持 localStorage 的值
  }
};

const handleSidebarCollapse = (collapsed) => {
  console.log("handleSidebarCollapse called with:", collapsed);
  // 只在非手機端處理 Ant Design Layout Sider 的 collapse 事件
  if (!isMobile.value) {
    sidebarCollapsed.value = collapsed;
  }
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

// 處理來自 ConversationList 的摺疊事件
const handleToggleCollapse = (collapsed) => {
  sidebarCollapsed.value = collapsed;
};

// 展開側邊欄
const handleExpandSidebar = () => {
  isExpanding.value = true;
  sidebarCollapsed.value = false;

  // 重置展開動畫狀態
  setTimeout(() => {
    isExpanding.value = false;
  }, 300);
};

// 監聽響應式變化
watch(
  isMobile,
  (newValue) => {
    if (newValue) {
      // 切換到手機端時重置狀態
      sidebarVisible.value = false;
      // 手機端不改變 sidebarCollapsed 狀態，保持用戶設置
    } else {
      // 切換到桌面端時隱藏手機端側邊欄
      sidebarVisible.value = false;
      // 桌面端保持用戶設置的折疊狀態
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

// 監聽 sidebarCollapsed 狀態變化（用於調試）
watch(
  sidebarCollapsed,
  (newValue, oldValue) => {
    console.log("📊 sidebarCollapsed 狀態變化:", oldValue, "->", newValue);
    console.log(
      "📊 localStorage 被更新為:",
      localStorage.getItem("chat-sidebar-collapsed")
    );
  },
  { immediate: true }
);

onMounted(async () => {
  console.log("🚀 Chat 頁面載入開始");
  console.log("📊 初始 sidebarCollapsed 狀態:", sidebarCollapsed.value);
  console.log(
    "📊 localStorage 中的值:",
    localStorage.getItem("chat-sidebar-collapsed")
  );

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

    // 檢查路由參數或 query 參數中是否有對話 ID
    const conversationId =
      props.conversationId || route.params.conversationId || route.query.id;
    if (conversationId) {
      console.log("🔗 檢測到路由中的對話 ID:", conversationId);

      try {
        // 先查找對話是否在已載入的列表中
        let conversation = chatStore.conversations.find(
          (c) => c.id === parseInt(conversationId)
        );

        if (!conversation) {
          // 如果對話不在列表中，嘗試從 API 載入
          console.log("📡 從 API 載入對話詳情...");
          const response = await api.get(
            `/api/chat/conversations/${conversationId}`
          );
          conversation = response.data.data;
          console.log("✅ 對話詳情載入成功");
        }

        if (conversation) {
          // 選擇並載入該對話
          await chatStore.handleSelectConversation(conversation);
          console.log("✅ 對話載入完成:", conversation.title);

          // 清除 URL 中的 query 參數，避免重複處理
          const currentPath = props.agentId
            ? `/chat/${props.agentId}`
            : "/chat";
          router.replace({ path: currentPath });
        } else {
          console.log("❌ 無法找到對話 ID:", conversationId);
        }
      } catch (error) {
        console.error("❌ 載入指定對話失敗:", error);
        // 如果載入失敗，跳轉到基礎聊天頁面
        const currentPath = props.agentId ? `/chat/${props.agentId}` : "/chat";
        router.replace({ path: currentPath });
      }
    }
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
  height: 100%;
  overflow: hidden;
}

.chat-layout {
  height: 100%;
}

/* 對話列表側邊欄 */
.conversation-sider {
  background: var(--custom-bg-primary);
  border-right: 1px solid var(--custom-border-primary);
  z-index: 40;
  transition: all 0.3s ease;
}

.conversation-sider.mobile-hidden {
  transform: translateX(-100%);
}

.conversation-sider.sider-collapsed {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-right: 1px solid var(--custom-border-primary);
}

/* 摺疊狀態的側邊欄內容 */
.collapsed-sidebar-content {
  padding: 16px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--custom-bg-primary);
}

.collapsed-expand-btn {
  min-width: 40px !important;
  min-height: 40px !important;
  padding: 0 !important;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--custom-bg-secondary);
  border: 1px solid var(--custom-border-primary);
  border-radius: 8px;
  color: var(--custom-text-primary);
  transition: all 0.2s ease;
}

.collapsed-expand-btn:hover {
  background: var(--custom-bg-tertiary);
  border-color: var(--primary-color);
  transform: scale(1.05);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.collapsed-sidebar-logo {
  margin-top: 20px;
  margin-bottom: 20px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary-color);
}

.collapsed-sidebar-divider {
  width: 30px;
  height: 1px;
  background: var(--custom-border-primary);
  margin: 16px 0;
}

.collapsed-sidebar-text {
  writing-mode: vertical-lr;
  text-orientation: mixed;
  letter-spacing: 2px;
  font-size: 12px;
  color: var(--custom-text-secondary);
  margin: 10px 0;
  user-select: none;
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
  min-width: 36px;
  min-height: 36px;
  padding: 0;
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
    z-index: 101;
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
