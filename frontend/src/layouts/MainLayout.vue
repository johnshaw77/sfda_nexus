<template>
  <div class="main-layout">
    <!-- 主側邊欄 -->
    <div
      class="main-sidebar"
      :class="{ collapsed: sidebarCollapsed }">
      <!-- 頂部 Logo -->
      <div class="sidebar-header">
        <div class="logo-section">
          <div class="logo-icon">
            <svg
              viewBox="0 0 24 24"
              width="24"
              height="24">
              <path
                fill="currentColor"
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
          </div>
          <h1
            v-if="!sidebarCollapsed"
            class="logo-text">
            SFDA Nexus
          </h1>
        </div>

        <button
          class="collapse-btn"
          @click="toggleSidebar"
          :title="sidebarCollapsed ? '展開側邊欄' : '收起側邊欄'">
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16">
            <path
              fill="currentColor"
              :d="sidebarCollapsed ? 'M9 18l6-6-6-6' : 'M15 18l-6-6 6-6'" />
          </svg>
        </button>
      </div>

      <!-- 主選單 -->
      <div class="main-menu">
        <div
          v-for="item in mainMenuItems"
          :key="item.key"
          class="menu-item"
          :class="{
            active:
              item.key === 'agents'
                ? agentsSidebarVisible
                : $route.name === item.route,
            'collapsed-item': sidebarCollapsed,
          }"
          @click="handleMenuClick(item)"
          :title="sidebarCollapsed ? item.title : ''">
          <div class="menu-icon">
            <component :is="item.icon" />
          </div>
          <span
            v-if="!sidebarCollapsed"
            class="menu-title"
            >{{ item.title }}</span
          >
          <div
            v-if="!sidebarCollapsed && item.key === 'agents'"
            class="menu-arrow"
            :class="{ expanded: agentsSidebarVisible }">
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16">
              <path
                fill="currentColor"
                d="M9 18l6-6-6-6" />
            </svg>
          </div>
        </div>
      </div>

      <!-- 底部用戶區域 -->
      <div class="sidebar-footer">
        <div
          class="user-section"
          :class="{ collapsed: sidebarCollapsed }">
          <div class="user-avatar">
            <img
              v-if="authStore.user?.avatar"
              :src="authStore.user.avatar"
              :alt="authStore.user.username"
              class="user-image" />
            <div
              v-else
              class="user-placeholder">
              {{ authStore.user?.username?.charAt(0)?.toUpperCase() }}
            </div>
          </div>

          <div
            v-if="!sidebarCollapsed"
            class="user-info">
            <span class="user-name">{{ authStore.user?.username }}</span>
            <span class="user-role">{{ authStore.user?.role || "User" }}</span>
          </div>

          <a-dropdown
            v-if="!sidebarCollapsed"
            placement="topRight">
            <button class="user-menu-btn">
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16">
                <path
                  fill="currentColor"
                  d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
              </svg>
            </button>

            <template #overlay>
              <a-menu>
                <a-menu-item @click="handleProfile">
                  <UserOutlined />
                  個人資料
                </a-menu-item>
                <a-menu-item @click="handleSettings">
                  <SettingOutlined />
                  設置
                </a-menu-item>
                <a-menu-divider />
                <a-menu-item @click="handleLogout">
                  <LogoutOutlined />
                  登出
                </a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
        </div>
      </div>
    </div>

    <!-- 智能體側邊欄 -->
    <div
      class="agents-sidebar"
      :class="{
        visible: agentsSidebarVisible,
        'main-collapsed': sidebarCollapsed,
      }">
      <!-- 智能體側邊欄頭部 -->
      <div class="agents-header">
        <div class="agents-title">
          <div class="title-icon">
            <RobotOutlined />
          </div>
          <h2>智能體</h2>
        </div>
        <button
          class="close-agents-btn"
          @click="closeAgentsSidebar"
          title="關閉智能體選單">
          <CloseOutlined />
        </button>
      </div>

      <!-- 智能體列表 -->
      <div class="agents-list">
        <div
          v-for="agent in agents"
          :key="agent.id"
          class="agent-card"
          :class="{ active: currentAgent?.id === agent.id }"
          @click="handleSelectAgent(agent)">
          <!-- 智能體頭像 -->
          <div class="agent-avatar">
            <!-- 如果有 base64 avatar，直接顯示圖片 -->
            <img
              v-if="
                agent.avatar &&
                typeof agent.avatar === 'string' &&
                agent.avatar.startsWith('data:')
              "
              :src="agent.avatar"
              :alt="agent.display_name || agent.name"
              class="avatar-image" />
            <!-- 沒有 avatar 時使用漸變背景 -->
            <div
              v-else
              class="avatar-bg"
              :style="{
                background:
                  agent.avatar?.gradient ||
                  agent.avatar?.background ||
                  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              }">
              <svg
                v-if="agent.avatar?.icon"
                class="agent-icon"
                viewBox="0 0 24 24"
                width="24"
                height="24">
                <path
                  fill="white"
                  :d="agent.avatar.icon" />
              </svg>
              <span
                v-else
                class="agent-initial"
                >{{
                  (agent.display_name || agent.name)
                    ?.charAt(0)
                    ?.toUpperCase() || "A"
                }}</span
              >
            </div>
          </div>

          <!-- 智能體信息 -->
          <div class="agent-info">
            <h3 class="agent-name">{{ agent.display_name || agent.name }}</h3>
            <p class="agent-description">{{ agent.description }}</p>
          </div>

          <!-- 智能體狀態 -->
          <div class="agent-status">
            <div
              class="status-indicator"
              :class="agent.avatar?.status || 'online'"
              :title="getStatusText(agent.avatar?.status || 'online')"></div>
          </div>

          <!-- 智能體標籤 -->
          <div class="agent-tags">
            <span
              v-for="tag in (agent.tags || []).slice(0, 2)"
              :key="tag"
              class="agent-tag">
              {{ tag }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 主內容區域 -->
    <div
      class="main-content"
      :class="{
        'sidebar-collapsed': sidebarCollapsed,
        'agents-visible': agentsSidebarVisible,
      }">
      <!-- 頂部工具欄 -->
      <div class="content-header">
        <div class="header-left">
          <!-- 搜尋框 -->
          <div class="search-section">
            <div class="search-box">
              <svg
                class="search-icon"
                viewBox="0 0 24 24"
                width="16"
                height="16">
                <path
                  fill="currentColor"
                  d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
              </svg>
              <input
                type="text"
                placeholder="搜尋或聊天..."
                v-model="searchQuery"
                class="search-input" />
              <kbd class="search-shortcut">⌘ K</kbd>
            </div>
          </div>

          <!-- 當前頁面信息 -->
          <div
            v-if="currentAgent"
            class="current-agent-info">
            <div class="current-agent-avatar">
              <div
                class="avatar-bg"
                :style="{ background: currentAgent.gradient }">
                <svg
                  v-if="currentAgent.icon"
                  class="agent-icon"
                  viewBox="0 0 24 24"
                  width="20"
                  height="20">
                  <path
                    fill="white"
                    :d="currentAgent.icon" />
                </svg>
                <span
                  v-else
                  class="agent-initial"
                  >{{ currentAgent.name.charAt(0) }}</span
                >
              </div>
            </div>
            <div class="current-agent-details">
              <h2 class="current-agent-name">{{ currentAgent.name }}</h2>
              <p class="current-agent-desc">{{ currentAgent.description }}</p>
            </div>
          </div>
        </div>

        <div class="header-right">
          <!-- 主題切換開關 -->
          <a-tooltip
            :title="
              configStore.isDarkMode ? '切換至亮色模式' : '切換至暗黑模式'
            ">
            <a-switch
              :checked="configStore.isDarkMode"
              size="small"
              @change="configStore.toggleTheme"
              class="theme-switch">
              <template #checkedChildren>
                <bulb-filled style="color: yellow" />
              </template>
              <template #unCheckedChildren>
                <bulb-filled style="color: gray" />
              </template>
            </a-switch>
          </a-tooltip>

          <!-- 通知按鈕 -->
          <button
            class="icon-btn"
            @click="handleNotifications"
            :title="'通知 (' + notificationCount + ')'">
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20">
              <path
                fill="currentColor"
                d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
            </svg>
            <span
              v-if="notificationCount > 0"
              class="notification-badge"
              >{{ notificationCount }}</span
            >
          </button>

          <!-- 更多選項 -->
          <button
            class="icon-btn"
            :title="'更多選項'">
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20">
              <path
                fill="currentColor"
                d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
            </svg>
          </button>
        </div>
      </div>

      <!-- 內容區域 -->
      <div class="content-area">
        <router-view />
      </div>
    </div>

    <!-- 智能體側邊欄遮罩 -->
    <div
      v-if="agentsSidebarVisible"
      class="agents-overlay"
      @click="closeAgentsSidebar"></div>

    <!-- 通知抽屜 -->
    <a-drawer
      v-model:open="notificationDrawerVisible"
      title="通知"
      placement="right"
      :width="400">
      <div class="notification-list">
        <a-empty
          v-if="notifications.length === 0"
          description="暫無通知" />

        <div
          v-for="notification in notifications"
          :key="notification.id"
          class="notification-item"
          :class="{ unread: !notification.read }">
          <div class="notification-icon">
            <InfoCircleOutlined v-if="notification.type === 'info'" />
            <CheckCircleOutlined v-else-if="notification.type === 'success'" />
            <ExclamationCircleOutlined
              v-else-if="notification.type === 'warning'" />
            <CloseCircleOutlined v-else />
          </div>

          <div class="notification-content">
            <div class="notification-title">{{ notification.title }}</div>
            <div class="notification-message">{{ notification.message }}</div>
            <div class="notification-time">
              {{ formatTime(notification.created_at) }}
            </div>
          </div>

          <div class="notification-actions">
            <a-button
              v-if="!notification.read"
              type="text"
              size="small"
              @click="markAsRead(notification.id)">
              標記已讀
            </a-button>
          </div>
        </div>
      </div>
    </a-drawer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { message } from "ant-design-vue";
import {
  DashboardOutlined,
  MessageOutlined,
  RobotOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  CloseOutlined,
  BulbFilled,
} from "@ant-design/icons-vue";
import { useAuthStore } from "@/stores/auth";
import { useWebSocketStore } from "@/stores/websocket";
import { useAgentsStore } from "@/stores/agents";
import { useConfigStore } from "@/stores/config";

// Store
const authStore = useAuthStore();
const wsStore = useWebSocketStore();
const agentsStore = useAgentsStore();
const configStore = useConfigStore();

// Router
const router = useRouter();
const route = useRoute();

// 響應式狀態
const sidebarCollapsed = ref(false);
const agentsSidebarVisible = ref(false);
const notificationDrawerVisible = ref(false);
const notificationCount = ref(2);
const searchQuery = ref("");

// 計算屬性
const agents = computed(() => agentsStore.availableAgents);
const currentAgent = computed(() => agentsStore.currentAgent);

// 主選單項目
const mainMenuItems = ref([
  {
    key: "dashboard",
    title: "儀表板",
    icon: DashboardOutlined,
    route: "Dashboard",
  },
  {
    key: "chat",
    title: "聊天",
    icon: MessageOutlined,
    route: "Chat",
  },
  {
    key: "agents",
    title: "智能體",
    icon: RobotOutlined,
    route: null, // 特殊處理
  },
  {
    key: "user",
    title: "個人資料",
    icon: UserOutlined,
    route: "UserProfile",
  },
  {
    key: "settings",
    title: "設置",
    icon: SettingOutlined,
    route: "Settings",
  },
]);

// 通知數據
const notifications = ref([
  {
    id: 1,
    type: "info",
    title: "系統更新",
    message: "SFDA Nexus 已更新到 v1.7.0，新增現代化聊天界面",
    read: false,
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    type: "success",
    title: "智能體上線",
    message: "Arthur 教育專家已上線，可以開始對話了",
    read: false,
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
]);

// 方法
const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value;
};

const openAgentsSidebar = () => {
  agentsSidebarVisible.value = true;
};

const closeAgentsSidebar = () => {
  agentsSidebarVisible.value = false;
};

const handleMenuClick = (item) => {
  if (item.key === "agents") {
    openAgentsSidebar();
  } else {
    // 點擊其他選單項目時，關閉智能體側邊欄
    if (agentsSidebarVisible.value) {
      closeAgentsSidebar();
    }

    if (item.route) {
      router.push({ name: item.route });
    }
  }
};

const handleSelectAgent = (agent) => {
  agentsStore.setCurrentAgent(agent);
  closeAgentsSidebar();

  // 導航到聊天頁面，並傳遞智能體 ID
  router.push({
    name: "ChatWithAgent",
    params: { agentId: agent.id },
  });

  message.success(`已選擇智能體：${agent.display_name || agent.name}`);
};

const handleSearch = () => {
  if (searchQuery.value.trim()) {
    // 實現搜索功能
    console.log("搜索:", searchQuery.value);
  }
};

const handleNotifications = () => {
  notificationDrawerVisible.value = true;
};

const handleProfile = () => {
  router.push({ name: "UserProfile" });
};

const handleSettings = () => {
  router.push({ name: "Settings" });
};

const handleLogout = async () => {
  try {
    await authStore.handleLogout();
    router.push({ name: "Login" });
    message.success("已成功登出");
  } catch (error) {
    message.error("登出失敗");
  }
};

const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;

  if (diff < 60 * 1000) return "剛剛";
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))} 分鐘前`;
  if (diff < 24 * 60 * 60 * 1000)
    return `${Math.floor(diff / (60 * 60 * 1000))} 小時前`;

  return date.toLocaleDateString("zh-TW");
};

const markAsRead = (notificationId) => {
  const notification = notifications.value.find((n) => n.id === notificationId);
  if (notification) {
    notification.read = true;
    notificationCount.value = notifications.value.filter((n) => !n.read).length;
  }
};

const getStatusText = (status) => {
  const statusMap = {
    online: "在線",
    away: "離開",
    offline: "離線",
  };
  return statusMap[status] || "未知";
};

// 生命週期
onMounted(async () => {
  try {
    // 初始化智能體數據
    await agentsStore.initialize();
  } catch (error) {
    console.error("初始化智能體數據失敗:", error);
    message.error("載入智能體數據失敗");
  }
});
</script>

<style scoped>
.main-layout {
  display: flex;
  height: 100vh;
  background: var(--custom-bg-secondary);
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  position: relative;
}

/* 主側邊欄 */
.main-sidebar {
  width: var(--sidebar-width);
  background: var(--custom-bg-primary);
  border-right: 1px solid var(--custom-border-primary);
  display: flex;
  flex-direction: column;
  transition: var(--transition-sidebar);
  position: relative;
  z-index: var(--z-sidebar);
}

.main-sidebar.collapsed {
  width: var(--sidebar-collapsed-width);
}

/* 側邊欄頭部 */
.sidebar-header {
  padding: var(--spacing-sidebar);
  border-bottom: 1px solid var(--custom-border-primary);
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: var(--header-height);
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: var(--radius-button);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.logo-text {
  font-size: 20px;
  font-weight: 600;
  color: var(--custom-text-primary);
  margin: 0;
}

.collapse-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: var(--custom-bg-tertiary);
  border-radius: var(--radius-input);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--custom-text-secondary);
  transition: var(--transition-all);
}

.collapse-btn:hover {
  background: var(--custom-border-secondary);
  color: var(--custom-text-primary);
}

/* 主選單 */
.main-menu {
  flex: 1;
  padding: var(--spacing-sidebar) 0;
  overflow-y: auto;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px var(--spacing-sidebar);
  margin: 0 16px 4px;
  border-radius: var(--radius-button);
  cursor: pointer;
  transition: var(--transition-all);
  color: var(--custom-text-secondary);
  position: relative;
}

.menu-item:hover {
  background: var(--custom-bg-tertiary);
  color: var(--custom-text-primary);
}

.menu-item.active {
  background: var(--ant-primary-color);
  color: white;
  font-weight: 500;
}

.menu-item.collapsed-item {
  justify-content: center;
  margin: 0 16px 8px;
  padding: 12px;
}

.menu-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.menu-title {
  flex: 1;
  font-size: 14px;
}

.menu-arrow {
  font-size: 14px;
  transition: transform 0.2s;
}

.menu-arrow.expanded {
  transform: rotate(90deg);
}

/* 智能體側邊欄 */
.agents-sidebar {
  width: var(--agents-sidebar-width);
  background: var(--custom-bg-primary);
  border-right: 1px solid var(--custom-border-primary);
  position: absolute;
  left: var(--sidebar-width);
  top: 0;
  height: 100%;
  transform: translateX(-100%);
  transition: var(--transition-transform);
  z-index: var(--z-agents-sidebar);
  display: flex;
  flex-direction: column;
}

.agents-sidebar.visible {
  transform: translateX(0);
}

.agents-sidebar.main-collapsed {
  left: var(--sidebar-collapsed-width);
}

.agents-header {
  padding: var(--spacing-sidebar);
  border-bottom: 1px solid var(--custom-border-primary);
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: var(--header-height);
}

.agents-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.title-icon {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: var(--radius-button);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 16px;
}

.agents-title h2 {
  font-size: 18px;
  font-weight: 600;
  color: var(--custom-text-primary);
  margin: 0;
}

.close-agents-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: var(--custom-bg-tertiary);
  border-radius: var(--radius-input);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--custom-text-secondary);
  transition: var(--transition-all);
}

.close-agents-btn:hover {
  background: var(--custom-border-secondary);
  color: var(--custom-text-primary);
}

.agents-list {
  flex: 1;
  padding: var(--spacing-sidebar);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 智能體卡片 */
.agent-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: var(--spacing-card);
  border-radius: var(--radius-card);
  cursor: pointer;
  transition: var(--transition-all);
  border: 1px solid transparent;
  background: var(--custom-bg-primary);
  box-shadow: var(--shadow-sidebar);
}

.agent-card:hover {
  background: var(--custom-bg-tertiary);
  border-color: var(--custom-border-primary);
  transform: translateY(-1px);
  box-shadow: var(--shadow-card-hover);
}

.agent-card.active {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: white;
  box-shadow: var(--shadow-floating);
}

/* 智能體頭像 */
.agent-avatar {
  flex-shrink: 0;
}

.avatar-bg {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-card);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 18px;
}

.avatar-image {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-card);
  object-fit: cover;
  border: 2px solid rgba(255, 255, 255, 0.1);
}

.agent-icon {
  width: 24px;
  height: 24px;
}

.agent-initial {
  font-size: 18px;
  font-weight: 600;
}

/* 智能體信息 */
.agent-info {
  flex: 1;
  min-width: 0;
}

.agent-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--custom-text-primary);
  margin: 0 0 4px 0;
}

.agent-card.active .agent-name {
  color: white;
}

.agent-description {
  font-size: 13px;
  color: var(--custom-text-secondary);
  margin: 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.agent-card.active .agent-description {
  color: rgba(255, 255, 255, 0.8);
}

/* 狀態指示器 */
.agent-status {
  flex-shrink: 0;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: 2px solid white;
}

.status-indicator.online {
  background: var(--success-color);
}

.status-indicator.away {
  background: var(--warning-color);
}

.status-indicator.offline {
  background: var(--text-color-disabled);
}

.agent-tags {
  display: flex;
  gap: 4px;
  margin-top: 8px;
  flex-wrap: wrap;
}

.agent-tag {
  background: var(--custom-bg-tertiary);
  color: var(--custom-text-secondary);
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 10px;
  border: 1px solid var(--custom-border-primary);
}

.agent-card.active .agent-tag {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border-color: rgba(255, 255, 255, 0.3);
}

/* 側邊欄底部 */
.sidebar-footer {
  padding: var(--spacing-sidebar);
  border-top: 1px solid var(--custom-border-primary);
  margin-top: auto;
}

.user-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-section.collapsed {
  justify-content: center;
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  overflow: hidden;
  flex-shrink: 0;
}

.user-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 16px;
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-name {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--custom-text-primary);
}

.user-role {
  display: block;
  font-size: 12px;
  color: var(--custom-text-secondary);
}

.user-menu-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: none;
  cursor: pointer;
  color: var(--custom-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: var(--transition-all);
}

.user-menu-btn:hover {
  background: var(--custom-bg-tertiary);
  color: var(--custom-text-primary);
}

/* 主內容區域 */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  transition: margin-left 0.3s ease;
}

.main-content.agents-visible {
  margin-left: var(--agents-sidebar-width);
}

.main-content.sidebar-collapsed.agents-visible {
  margin-left: var(--agents-sidebar-width);
}

/* 內容頭部 */
.content-header {
  height: var(--header-height);
  background: var(--custom-bg-primary);
  border-bottom: 1px solid var(--custom-border-primary);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 24px;
  flex: 1;
}

/* 搜尋區域 */
.search-section {
  min-width: 300px;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 12px;
  color: var(--custom-text-tertiary);
  z-index: 1;
}

.search-input {
  width: 100%;
  height: 40px;
  border: 1px solid var(--custom-border-primary);
  border-radius: var(--radius-button);
  padding: 0 80px 0 40px;
  font-size: 14px;
  background: var(--custom-bg-tertiary);
  transition: var(--transition-all);
  color: var(--custom-text-primary);
}

.search-input:focus {
  outline: none;
  border-color: var(--primary-color);
  background: var(--custom-bg-primary);
  box-shadow: 0 0 0 3px rgba(24, 144, 255, 0.1);
}

.search-input::placeholder {
  color: var(--custom-text-tertiary);
}

.search-shortcut {
  position: absolute;
  right: 12px;
  background: var(--custom-border-primary);
  color: var(--custom-text-secondary);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-family: monospace;
}

.current-agent-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.current-agent-avatar .avatar-bg {
  width: 40px;
  height: 40px;
  border-radius: 10px;
}

.current-agent-avatar .agent-icon {
  width: 20px;
  height: 20px;
}

.current-agent-details {
  min-width: 0;
}

.current-agent-name {
  font-size: 18px;
  font-weight: 600;
  color: var(--custom-text-primary);
  margin: 0 0 2px 0;
}

.current-agent-desc {
  font-size: 13px;
  color: var(--custom-text-secondary);
  margin: 0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: var(--spacing-small);
}

.icon-btn {
  width: 40px;
  height: 40px;
  border: none;
  background: var(--custom-bg-tertiary);
  border-radius: var(--radius-button);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--custom-text-secondary);
  transition: var(--transition-all);
  position: relative;
}

.icon-btn:hover {
  background: var(--custom-border-secondary);
  color: var(--custom-text-primary);
}

.notification-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  background: var(--error-color);
  color: white;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 16px;
  text-align: center;
}

/* 內容區域 */
.content-area {
  flex: 1;
  overflow-y: auto;
  background: var(--custom-bg-secondary);
  height: calc(100vh - var(--header-height));
}

/* 智能體側邊欄遮罩 */
.agents-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: var(--z-overlay);
  opacity: 0;
  animation: fadeIn 0.3s ease forwards;
}

@keyframes fadeIn {
  to {
    opacity: 1;
  }
}

/* 通知列表樣式 */
.notification-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.notification-item {
  display: flex;
  gap: 12px;
  padding: var(--spacing-card);
  border: 1px solid var(--custom-border-primary);
  border-radius: var(--radius-button);
  transition: var(--transition-all);
  background: var(--custom-bg-primary);
}

.notification-item.unread {
  background: rgba(82, 196, 26, 0.1);
  border-color: var(--success-color);
}

.notification-item:hover {
  box-shadow: var(--shadow-sidebar);
}

.notification-icon {
  font-size: 16px;
  margin-top: 2px;
  color: var(--custom-text-secondary);
}

.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-title {
  font-weight: 600;
  margin-bottom: 4px;
  color: var(--custom-text-primary);
}

.notification-message {
  color: var(--custom-text-secondary);
  font-size: 14px;
  margin-bottom: 4px;
  line-height: 1.4;
}

.notification-time {
  color: var(--custom-text-tertiary);
  font-size: 12px;
}

.notification-actions {
  display: flex;
  align-items: flex-start;
}

/* 主題切換開關樣式 */
.theme-switch {
  margin-right: var(--spacing-small);
}

.theme-switch .ant-switch-handle::before {
  background-color: #fff;
}

.theme-switch.ant-switch-checked {
  background-color: var(--success-color);
}

.theme-switch.ant-switch-checked .ant-switch-handle::before {
  background-color: #fff;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .main-sidebar {
    position: fixed;
    left: 0;
    top: 0;
    height: 100vh;
    z-index: 1000;
    transform: translateX(-100%);
    transition: var(--transition-transform);
  }

  .main-sidebar.mobile-open {
    transform: translateX(0);
  }

  .agents-sidebar {
    left: 0;
    width: 100vw;
  }

  .main-content {
    margin-left: 0;
  }

  .main-content.agents-visible {
    margin-left: 0;
  }

  .content-header {
    padding: 0 16px;
  }

  .header-left {
    gap: 16px;
  }

  .search-section {
    min-width: 200px;
  }

  .current-agent-desc {
    display: none;
  }
}
</style>
