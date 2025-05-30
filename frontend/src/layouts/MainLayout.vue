<template>
  <a-layout class="main-layout">
    <!-- 側邊欄 -->
    <a-layout-sider
      v-model:collapsed="collapsed"
      :trigger="null"
      collapsible
      :width="240"
      :collapsed-width="80"
      class="main-sider">
      <!-- Logo 區域 -->
      <div class="logo-container">
        <div class="logo">
          <svg
            width="32"
            height="32"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg">
            <circle
              cx="16"
              cy="16"
              r="14"
              fill="#1890ff"
              opacity="0.1" />
            <circle
              cx="16"
              cy="16"
              r="10"
              fill="#1890ff"
              opacity="0.2" />
            <circle
              cx="16"
              cy="16"
              r="6"
              fill="#1890ff" />
            <path
              d="M12 14h8v1h-8v-1zm0 2h6v1h-6v-1zm0 2h4v1h-4v-1z"
              fill="white" />
          </svg>
          <span
            v-if="!collapsed"
            class="logo-text"
            >SFDA Nexus</span
          >
        </div>
      </div>

      <!-- 導航菜單 -->
      <a-menu
        v-model:selectedKeys="selectedKeys"
        mode="inline"
        theme="dark"
        class="main-menu"
        @click="handleMenuClick">
        <a-menu-item key="dashboard">
          <DashboardOutlined />
          <span>儀表板</span>
        </a-menu-item>

        <a-menu-item key="chat">
          <MessageOutlined />
          <span>聊天</span>
        </a-menu-item>

        <a-menu-item key="settings">
          <SettingOutlined />
          <span>設置</span>
        </a-menu-item>

        <!-- 管理員菜單 -->
        <a-sub-menu
          v-if="authStore.isAdmin"
          key="admin">
          <template #icon>
            <CrownOutlined />
          </template>
          <template #title>管理</template>

          <a-menu-item key="admin-dashboard">
            <DashboardOutlined />
            <span>管理儀表板</span>
          </a-menu-item>

          <a-menu-item key="admin-users">
            <UserOutlined />
            <span>用戶管理</span>
          </a-menu-item>

          <a-menu-item key="admin-system">
            <SettingOutlined />
            <span>系統設置</span>
          </a-menu-item>

          <a-menu-item key="admin-logs">
            <FileTextOutlined />
            <span>審計日誌</span>
          </a-menu-item>
        </a-sub-menu>
      </a-menu>

      <!-- 側邊欄底部 -->
      <div class="sider-footer">
        <!-- WebSocket 連接狀態 -->
        <div class="connection-status">
          <a-badge
            :status="
              wsStore.connectionStatus === 'connected' ? 'success' : 'error'
            "
            :text="
              collapsed
                ? ''
                : wsStore.connectionStatus === 'connected'
                  ? '已連接'
                  : '未連接'
            " />
        </div>
      </div>
    </a-layout-sider>

    <!-- 主內容區域 -->
    <a-layout class="main-content">
      <!-- 頭部 -->
      <a-layout-header class="main-header">
        <div class="header-left">
          <!-- 折疊按鈕 -->
          <a-button
            type="text"
            @click="toggleCollapsed"
            class="collapse-btn">
            <MenuUnfoldOutlined v-if="collapsed" />
            <MenuFoldOutlined v-else />
          </a-button>

          <!-- 麵包屑導航 -->
          <a-breadcrumb class="breadcrumb">
            <a-breadcrumb-item>
              <router-link to="/dashboard">首頁</router-link>
            </a-breadcrumb-item>
            <a-breadcrumb-item v-if="currentPageTitle">
              {{ currentPageTitle }}
            </a-breadcrumb-item>
          </a-breadcrumb>
        </div>

        <div class="header-right">
          <!-- 通知 -->
          <a-badge
            :count="notificationCount"
            class="notification-badge">
            <a-button
              type="text"
              @click="handleShowNotifications">
              <BellOutlined />
            </a-button>
          </a-badge>

          <!-- 用戶菜單 -->
          <a-dropdown placement="bottomRight">
            <a-button
              type="text"
              class="user-menu-btn">
              <a-avatar
                :size="32"
                :style="{ backgroundColor: '#1890ff' }">
                <UserOutlined />
              </a-avatar>
              <span class="username">{{ authStore.user?.username }}</span>
              <DownOutlined />
            </a-button>

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
      </a-layout-header>

      <!-- 內容區域 -->
      <a-layout-content class="main-content-area">
        <div class="content-wrapper">
          <router-view />
        </div>
      </a-layout-content>

      <!-- 頁腳 -->
      <a-layout-footer class="main-footer">
        <div class="footer-content">
          <span>© 2025 SFDA Nexus. All rights reserved.</span>
          <div class="footer-links">
            <a
              href="#"
              @click.prevent
              >幫助</a
            >
            <a
              href="#"
              @click.prevent
              >隱私政策</a
            >
            <a
              href="#"
              @click.prevent
              >服務條款</a
            >
          </div>
        </div>
      </a-layout-footer>
    </a-layout>

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
  </a-layout>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { message } from "ant-design-vue";
import {
  DashboardOutlined,
  MessageOutlined,
  SettingOutlined,
  CrownOutlined,
  UserOutlined,
  FileTextOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  BellOutlined,
  DownOutlined,
  LogoutOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons-vue";
import { useAuthStore } from "@/store/auth";
import { useWebSocketStore } from "@/store/websocket";

// Store
const authStore = useAuthStore();
const wsStore = useWebSocketStore();

// Router
const router = useRouter();
const route = useRoute();

// 響應式狀態
const collapsed = ref(false);
const selectedKeys = ref([]);
const notificationDrawerVisible = ref(false);
const notificationCount = ref(0);

// 模擬通知數據
const notifications = ref([
  {
    id: 1,
    type: "info",
    title: "系統更新",
    message: "SFDA Nexus 已更新到版本 1.3.0",
    created_at: new Date(),
    read: false,
  },
  {
    id: 2,
    type: "success",
    title: "聊天功能上線",
    message: "新的聊天界面已經可以使用了",
    created_at: new Date(Date.now() - 3600000),
    read: true,
  },
]);

// 計算屬性
const currentPageTitle = computed(() => {
  return route.meta?.title?.replace(" - SFDA Nexus", "") || "";
});

// 方法
const toggleCollapsed = () => {
  collapsed.value = !collapsed.value;
};

const handleMenuClick = ({ key }) => {
  const routeMap = {
    dashboard: "/dashboard",
    chat: "/chat",
    settings: "/settings",
    "admin-dashboard": "/admin/dashboard",
    "admin-users": "/admin/users",
    "admin-system": "/admin/system",
    "admin-logs": "/admin/logs",
  };

  const path = routeMap[key];
  if (path && path !== route.path) {
    router.push(path);
  }
};

const handleShowNotifications = () => {
  notificationDrawerVisible.value = true;
};

const handleProfile = () => {
  message.info("個人資料功能開發中");
};

const handleSettings = () => {
  router.push("/settings");
};

const handleLogout = async () => {
  try {
    await authStore.handleLogout();
    wsStore.disconnect();
    router.push("/auth/login");
    message.success("已成功登出");
  } catch (error) {
    message.error("登出失敗");
    console.error("登出失敗:", error);
  }
};

const markAsRead = (notificationId) => {
  const notification = notifications.value.find((n) => n.id === notificationId);
  if (notification) {
    notification.read = true;
    updateNotificationCount();
  }
};

const updateNotificationCount = () => {
  notificationCount.value = notifications.value.filter((n) => !n.read).length;
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

// 監聽路由變化，更新選中的菜單項
watch(
  () => route.path,
  (newPath) => {
    const pathToKey = {
      "/dashboard": "dashboard",
      "/chat": "chat",
      "/settings": "settings",
      "/admin/dashboard": "admin-dashboard",
      "/admin/users": "admin-users",
      "/admin/system": "admin-system",
      "/admin/logs": "admin-logs",
    };

    selectedKeys.value = [pathToKey[newPath] || "dashboard"];
  },
  { immediate: true }
);

// 生命週期
onMounted(() => {
  updateNotificationCount();

  // 初始化 WebSocket 連接
  if (authStore.isAuthenticated && !wsStore.isConnected) {
    wsStore.connect();
  }
});
</script>

<style scoped>
.main-layout {
  min-height: 100vh;
}

.main-sider {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  z-index: 100;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.15);
}

.logo-container {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  margin: 16px;
  border-radius: 8px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logo-text {
  color: white;
  font-size: 18px;
  font-weight: 600;
}

.main-menu {
  border-right: none;
  height: calc(100vh - 160px);
  overflow-y: auto;
}

.sider-footer {
  position: absolute;
  bottom: 16px;
  left: 16px;
  right: 16px;
}

.connection-status {
  padding: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  text-align: center;
}

.main-content {
  margin-left: 240px;
  transition: margin-left 0.2s;
}

.main-layout :deep(.ant-layout-sider-collapsed) + .main-content {
  margin-left: 80px;
}

.main-header {
  background: #fff;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  position: sticky;
  top: 0;
  z-index: 10;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.collapse-btn {
  font-size: 18px;
}

.breadcrumb {
  margin: 0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.notification-badge {
  margin-right: 8px;
}

.user-menu-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  height: auto;
  padding: 4px 8px;
}

.username {
  font-weight: 500;
}

.main-content-area {
  padding: 24px;
  background: #f0f2f5;
  min-height: calc(100vh - 64px - 70px);
}

.content-wrapper {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  min-height: 100%;
}

.main-footer {
  background: #fff;
  border-top: 1px solid #f0f0f0;
  padding: 16px 24px;
}

.footer-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #666;
  font-size: 14px;
}

.footer-links {
  display: flex;
  gap: 16px;
}

.footer-links a {
  color: #666;
  text-decoration: none;
  transition: color 0.2s;
}

.footer-links a:hover {
  color: #1890ff;
}

.notification-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.notification-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  transition: all 0.2s;
}

.notification-item.unread {
  background: #f6ffed;
  border-color: #b7eb8f;
}

.notification-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.notification-icon {
  font-size: 16px;
  margin-top: 2px;
}

.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-title {
  font-weight: 600;
  margin-bottom: 4px;
}

.notification-message {
  color: #666;
  font-size: 14px;
  margin-bottom: 4px;
}

.notification-time {
  color: #999;
  font-size: 12px;
}

.notification-actions {
  display: flex;
  align-items: flex-start;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .main-sider {
    transform: translateX(-100%);
    transition: transform 0.3s;
  }

  .main-sider.mobile-open {
    transform: translateX(0);
  }

  .main-content {
    margin-left: 0;
  }

  .header-left {
    gap: 8px;
  }

  .breadcrumb {
    display: none;
  }

  .username {
    display: none;
  }

  .main-content-area {
    padding: 16px;
  }

  .footer-content {
    flex-direction: column;
    gap: 8px;
    text-align: center;
  }
}

/* 滾動條樣式 */
.main-menu::-webkit-scrollbar {
  width: 4px;
}

.main-menu::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
}

.main-menu::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
}

.main-menu::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}
</style>
