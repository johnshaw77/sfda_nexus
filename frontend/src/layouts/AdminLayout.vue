<template>
  <a-layout class="admin-layout">
    <!-- 頂部導航欄 -->
    <a-layout-header class="admin-header">
      <div class="header-content">
        <!-- 左側 Logo 和標題 -->
        <div class="header-left">
          <div class="admin-logo">
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
            <span class="logo-text">SFDA Nexus</span>
            <a-tag
              color="gold"
              size="small"
              >管理員</a-tag
            >
          </div>
        </div>

        <!-- 右側操作區域 -->
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

          <!-- 快速操作 -->
          <div class="quick-actions">
            <a-tooltip title="系統監控">
              <a-button
                type="text"
                @click="handleSystemMonitor">
                <DashboardOutlined />
              </a-button>
            </a-tooltip>

            <a-tooltip title="用戶在線">
              <a-badge
                :count="onlineUsers"
                :offset="[10, 0]">
                <a-button
                  type="text"
                  @click="handleOnlineUsers">
                  <TeamOutlined />
                </a-button>
              </a-badge>
            </a-tooltip>

            <a-tooltip title="系統通知">
              <a-badge
                :count="systemNotifications"
                :offset="[10, 0]">
                <a-button
                  type="text"
                  @click="handleSystemNotifications">
                  <BellOutlined />
                </a-button>
              </a-badge>
            </a-tooltip>
          </div>

          <!-- 用戶菜單 -->
          <a-dropdown placement="bottomRight">
            <a-button
              type="text"
              class="user-menu-btn">
              <a-avatar
                :size="32"
                :src="authStore.user?.avatar"
                :style="{ backgroundColor: '#f56a00' }">
                <CrownOutlined v-if="!authStore.user?.avatar" />
              </a-avatar>
              <span class="username">{{ authStore.user?.username }}</span>
              <DownOutlined />
            </a-button>

            <template #overlay>
              <a-menu>
                <a-menu-item @click="handleBackToMain">
                  <ArrowLeftOutlined />
                  返回主應用
                </a-menu-item>
                <a-menu-item @click="handleProfile">
                  <UserOutlined />
                  個人資料
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
    </a-layout-header>

    <!-- 主要內容區域 -->
    <a-layout class="admin-main">
      <!-- 側邊欄 -->
      <a-layout-sider
        v-model:collapsed="collapsed"
        :trigger="null"
        collapsible
        :width="240"
        :collapsed-width="80"
        class="admin-sider"
        theme="light">
        <!-- 折疊按鈕 -->
        <div class="sider-trigger">
          <a-button
            type="text"
            @click="toggleCollapsed">
            <MenuUnfoldOutlined v-if="collapsed" />
            <MenuFoldOutlined v-else />
          </a-button>
        </div>

        <!-- 管理員導航菜單 -->
        <a-menu
          v-model:selectedKeys="selectedKeys"
          mode="inline"
          class="admin-menu"
          @click="handleMenuClick">
          <a-menu-item key="dashboard">
            <DashboardOutlined />
            <span>管理儀表板</span>
          </a-menu-item>

          <a-menu-item key="users">
            <UserOutlined />
            <span>用戶管理</span>
          </a-menu-item>

          <a-menu-item key="agents">
            <RobotOutlined />
            <span>智能體管理</span>
          </a-menu-item>

          <a-menu-item key="system">
            <SettingOutlined />
            <span>系統設置</span>
          </a-menu-item>

          <a-menu-item key="logs">
            <FileTextOutlined />
            <span>審計日誌</span>
          </a-menu-item>

          <a-sub-menu key="advanced">
            <template #icon>
              <ToolOutlined />
            </template>
            <template #title>高級功能</template>

            <a-menu-item key="database">
              <DatabaseOutlined />
              <span>數據庫管理</span>
            </a-menu-item>

            <a-menu-item key="backup">
              <CloudDownloadOutlined />
              <span>備份恢復</span>
            </a-menu-item>

            <a-menu-item key="performance">
              <LineChartOutlined />
              <span>性能監控</span>
            </a-menu-item>
          </a-sub-menu>
        </a-menu>

        <!-- 系統狀態 -->
        <div class="system-status">
          <div class="status-item">
            <span class="status-label">系統狀態</span>
            <a-badge
              status="success"
              text="正常" />
          </div>
          <div class="status-item">
            <span class="status-label">WebSocket</span>
            <a-badge
              :status="
                wsStore.connectionStatus === 'connected' ? 'success' : 'error'
              "
              :text="
                wsStore.connectionStatus === 'connected' ? '已連接' : '未連接'
              " />
          </div>
        </div>
      </a-layout-sider>

      <!-- 內容區域 -->
      <a-layout-content
        class="admin-content"
        :class="{ collapsed }">
        <!-- 內容頭部 -->
        <div class="content-header">
          <a-breadcrumb class="breadcrumb">
            <a-breadcrumb-item>
              <HomeOutlined />
              <span>管理員</span>
            </a-breadcrumb-item>
            <a-breadcrumb-item>{{ currentPageTitle }}</a-breadcrumb-item>
          </a-breadcrumb>

          <div class="page-actions">
            <a-tooltip title="刷新頁面">
              <a-button
                type="text"
                @click="handleRefresh">
                <ReloadOutlined />
              </a-button>
            </a-tooltip>

            <a-tooltip title="全屏">
              <a-button
                type="text"
                @click="handleFullscreen">
                <FullscreenOutlined />
              </a-button>
            </a-tooltip>
          </div>
        </div>

        <!-- 頁面內容 -->
        <div class="content-wrapper">
          <router-view />
        </div>
      </a-layout-content>
    </a-layout>

    <!-- 系統監控抽屜 -->
    <a-drawer
      v-model:open="monitorDrawerVisible"
      title="系統監控"
      placement="right"
      :width="600">
      <div class="monitor-content">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-statistic
              title="CPU 使用率"
              :value="systemStats.cpu"
              suffix="%" />
          </a-col>
          <a-col :span="12">
            <a-statistic
              title="內存使用率"
              :value="systemStats.memory"
              suffix="%" />
          </a-col>
        </a-row>

        <a-divider />

        <a-row :gutter="16">
          <a-col :span="12">
            <a-statistic
              title="在線用戶"
              :value="systemStats.onlineUsers" />
          </a-col>
          <a-col :span="12">
            <a-statistic
              title="活躍會話"
              :value="systemStats.activeSessions" />
          </a-col>
        </a-row>
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
  TeamOutlined,
  BellOutlined,
  CrownOutlined,
  DownOutlined,
  ArrowLeftOutlined,
  UserOutlined,
  LogoutOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  SettingOutlined,
  FileTextOutlined,
  ToolOutlined,
  DatabaseOutlined,
  CloudDownloadOutlined,
  LineChartOutlined,
  ReloadOutlined,
  PlusOutlined,
  HomeOutlined,
  FullscreenOutlined,
  RobotOutlined,
  BulbFilled,
} from "@ant-design/icons-vue";
import { useAuthStore } from "@/stores/auth";
import { useWebSocketStore } from "@/stores/websocket";
import { useConfigStore } from "@/stores/config";

// Store
const authStore = useAuthStore();
const wsStore = useWebSocketStore();
const configStore = useConfigStore();

// Router
const router = useRouter();
const route = useRoute();

// 響應式狀態
const collapsed = ref(false);
const selectedKeys = ref([]);
const monitorDrawerVisible = ref(false);
const onlineUsers = ref(12);
const systemNotifications = ref(3);

// 系統統計數據
const systemStats = ref({
  cpu: 45,
  memory: 68,
  onlineUsers: 12,
  activeSessions: 8,
});

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
    dashboard: "/admin/dashboard",
    users: "/admin/users",
    agents: "/admin/agents",
    system: "/admin/system",
    logs: "/admin/logs",
    database: "/admin/database",
    backup: "/admin/backup",
    performance: "/admin/performance",
  };

  const path = routeMap[key];
  if (path && path !== route.path) {
    router.push(path);
  }
};

const handleSystemMonitor = () => {
  monitorDrawerVisible.value = true;
};

const handleOnlineUsers = () => {
  message.info("在線用戶功能開發中");
};

const handleSystemNotifications = () => {
  message.info("系統通知功能開發中");
};

const handleBackToMain = () => {
  router.push("/dashboard");
};

const handleProfile = () => {
  message.info("個人資料功能開發中");
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

const handleRefresh = () => {
  window.location.reload();
};

const handleFullscreen = () => {
  message.info("全屏功能開發中");
};

// 監聽路由變化，更新選中的菜單項
watch(
  () => route.path,
  (newPath) => {
    const pathToKey = {
      "/admin/dashboard": "dashboard",
      "/admin/users": "users",
      "/admin/agents": "agents",
      "/admin/system": "system",
      "/admin/logs": "logs",
      "/admin/database": "database",
      "/admin/backup": "backup",
      "/admin/performance": "performance",
    };

    selectedKeys.value = [pathToKey[newPath] || "dashboard"];
  },
  { immediate: true }
);

// 生命週期
onMounted(() => {
  // 檢查管理員權限
  if (!authStore.isAdmin) {
    message.error("您沒有管理員權限");
    router.push("/dashboard");
    return;
  }

  // 載入系統統計數據
  loadSystemStats();
});

const loadSystemStats = () => {
  // 模擬載入系統統計數據
  // 實際應用中這裡會調用 API
  console.log("載入系統統計數據");
};
</script>

<style scoped>
.admin-layout {
  height: 100vh;
  overflow: hidden;
}

.admin-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 0;
  height: 64px;
  line-height: 64px;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 100%;
}

.header-left {
  display: flex;
  align-items: center;
}

.admin-logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-text {
  color: white;
  font-size: 20px;
  font-weight: 600;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.theme-switch {
  margin-right: 8px;
}

.theme-switch .ant-switch-handle::before {
  background-color: #fff;
}

.theme-switch.ant-switch-checked {
  background-color: var(--ant-color-primary);
}

.theme-switch.ant-switch-checked .ant-switch-handle::before {
  background-color: #fff;
}

.quick-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.quick-actions .ant-btn {
  color: rgba(255, 255, 255, 0.8);
}

.quick-actions .ant-btn:hover {
  color: white;
  background: rgba(255, 255, 255, 0.1);
}

.user-menu-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  height: auto;
  padding: 4px 8px;
  color: rgba(255, 255, 255, 0.8);
}

.user-menu-btn:hover {
  color: white;
  background: rgba(255, 255, 255, 0.1);
}

.username {
  color: white;
  font-weight: 500;
}

.admin-main {
  margin-top: 64px;
  height: calc(100vh - 64px);
  display: flex;
}

.admin-sider {
  background: #fff;
  border-right: 1px solid #f0f0f0;
  position: fixed;
  left: 0;
  top: 64px;
  bottom: 0;
  z-index: 100;
  overflow: hidden;
}

.sider-trigger {
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
  text-align: center;
}

.admin-menu {
  border-right: none;
  height: calc(100vh - 64px - 56px - 120px);
  overflow-y: auto;
}

.system-status {
  position: absolute;
  bottom: 16px;
  left: 16px;
  right: 16px;
  padding: 12px;
  background: #f6f8fa;
  border-radius: 6px;
  border: 1px solid #e1e4e8;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 12px;
}

.status-item:last-child {
  margin-bottom: 0;
}

.status-label {
  color: #666;
}

.admin-content {
  margin-left: 240px;
  padding: 0;
  background: #f0f2f5;
  height: calc(100vh - 64px);
  overflow: hidden;
  transition: margin-left 0.2s;
  display: flex;
  flex-direction: column;
}

.admin-content.collapsed {
  margin-left: 80px;
}

.content-header {
  background: white;
  padding: 16px 24px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  z-index: 10;
  flex-shrink: 0;
}

.breadcrumb {
  margin: 0;
}

.page-actions {
  display: flex;
  gap: 8px;
}

.content-wrapper {
  flex: 1;
  padding: 2px;
  overflow-y: auto;
  background: #f0f2f5;
}

.monitor-content {
  padding: 16px 0;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .header-content {
    padding: 0 16px;
  }

  .admin-logo .logo-text {
    display: none;
  }

  .username {
    display: none;
  }

  .quick-actions {
    gap: 4px;
  }

  .content-header {
    padding: 12px 16px;
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .content-wrapper {
    padding: 16px;
  }

  .system-status {
    display: none;
  }
}

/* 滾動條樣式 */
.admin-menu::-webkit-scrollbar {
  width: 4px;
}

.admin-menu::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.admin-menu::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 2px;
}

.admin-menu::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* 主題切換開關樣式 */
.theme-switch .ant-switch-handle::before {
  background-color: #fff;
}

.theme-switch.ant-switch-checked {
  background-color: var(--ant-color-primary);
}

.theme-switch.ant-switch-checked .ant-switch-handle::before {
  background-color: #fff;
}
</style>
