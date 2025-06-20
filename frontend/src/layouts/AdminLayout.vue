<template>
  <a-layout class="admin-layout">
    <!-- 頂部導航欄 -->
    <a-layout-header class="admin-header">
      <div class="header-content">
        <!-- 左側 Logo 和標題 -->
        <div class="header-left">
          <Logo
            :width="36"
            style="margin-top: 8px" />
          <!-- 手機端菜單按鈕 -->
          <a-button
            v-if="isMobile"
            type="text"
            class="mobile-menu-btn"
            @click="showMobileMenu = true">
            <MenuOutlined />
          </a-button>

          <div class="admin-logo">
            <img
              src="/flexium_logo.png"
              style="width: 96px; margin-top: -2px" />
            <span
              v-show="showLogoText"
              class="logo-text">
              <span>Nexus 管理後台</span>
            </span>
          </div>
        </div>

        <!-- 右側操作區域 -->
        <div class="header-right">
          <!-- 主題切換開關 -->

          <!-- 快速操作 -->
          <div class="quick-actions">
            <a-tooltip
              :title="configStore.isDarkMode ? '開燈' : '關燈'"
              :arrow="false">
              <a-button
                type="text"
                class="theme-toggle-btn"
                @click="configStore.toggleTheme">
                <Lightbulb
                  v-if="configStore.isDarkMode"
                  :size="16" />
                <MoonStar
                  v-else
                  :size="16" />
              </a-button>
            </a-tooltip>

            <a-tooltip
              title="系統監控"
              :arrow="false">
              <a-button
                type="text"
                @click="handleSystemMonitor">
                <DashboardOutlined />
              </a-button>
            </a-tooltip>

            <a-tooltip
              title="用戶在線"
              :arrow="false">
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

            <a-tooltip
              title="系統通知"
              :arrow="false">
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

            <a-tooltip
              :title="isFullscreen ? '退出全屏' : '全屏'"
              :arrow="false">
              <a-button
                type="text"
                @click="handleFullscreen">
                <ExpandOutlined v-if="!isFullscreen" />
                <CompressOutlined v-else />
              </a-button>
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
              <div
                v-show="showUsername"
                class="user-info">
                <!-- <a-tag
                  color="gold"
                  size="small"
                  style="margin-right: 8px">
                  管理員
                </a-tag> -->
                <span class="username">{{
                  authStore.user?.display_name || authStore.user?.username
                }}</span>
              </div>
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
        v-show="showSider"
        v-model:collapsed="collapsed"
        :trigger="null"
        collapsible
        :width="240"
        :collapsed-width="80"
        class="admin-sider"
        theme="light"
        breakpoint="lg"
        @breakpoint="handleSiderBreakpoint">
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
          <a-menu-item key="models">
            <ApiOutlined />
            <span>模型管理</span>
          </a-menu-item>
          <a-menu-item key="agents">
            <RobotOutlined />
            <span>智能體管理</span>
          </a-menu-item>

          <a-menu-item key="quick-commands">
            <ThunderboltOutlined />
            <span>快速命令</span>
          </a-menu-item>

          <a-menu-item key="mcp-services">
            <CloudServerOutlined />
            <span>MCP 服務管理</span>
          </a-menu-item>

          <a-menu-item key="mcp-tools-tester">
            <ExperimentOutlined />
            <span>MCP 工具測試器</span>
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

        <!-- 系統狀態 - 展開狀態 -->
        <div
          v-if="showSider && !collapsed && showSystemStatus"
          class="system-status">
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

        <!-- 系統狀態 - 折疊狀態（只顯示燈號） -->
        <div
          v-if="showSider && collapsed && showSystemStatus"
          class="system-status-collapsed">
          <a-tooltip
            title="系統正常"
            placement="right">
            <a-badge status="success" />
          </a-tooltip>
          <a-tooltip
            :title="`WebSocket ${wsStore.connectionStatus === 'connected' ? '已連接' : '未連接'}`"
            placement="right">
            <a-badge
              :status="
                wsStore.connectionStatus === 'connected' ? 'success' : 'error'
              " />
          </a-tooltip>
        </div>
      </a-layout-sider>

      <!-- 內容區域 -->
      <a-layout-content
        class="admin-content"
        :class="{
          collapsed: collapsed && showSider,
          'full-width': !showSider,
        }">
        <!-- 內容頭部 -->
        <div class="content-header">
          <a-breadcrumb class="breadcrumb">
            <a-breadcrumb-item>
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

            <a-tooltip :title="isFullscreen ? '退出全屏' : '進入全屏'">
              <a-button
                type="text"
                @click="handleFullscreen">
                <ExpandOutlined v-if="!isFullscreen" />
                <CompressOutlined v-else />
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
      :width="drawerWidth"
      :z-index="1060">
      <div class="monitor-content">
        <a-row :gutter="16">
          <a-col
            :xs="24"
            :sm="24"
            :md="12"
            :lg="12"
            :xl="12">
            <a-statistic
              title="CPU 使用率"
              :value="systemStats.cpu"
              suffix="%" />
          </a-col>
          <a-col
            :xs="24"
            :sm="24"
            :md="12"
            :lg="12"
            :xl="12">
            <a-statistic
              title="內存使用率"
              :value="systemStats.memory"
              suffix="%" />
          </a-col>
        </a-row>

        <a-divider />

        <a-row :gutter="16">
          <a-col
            :xs="24"
            :sm="24"
            :md="12"
            :lg="12"
            :xl="12">
            <a-statistic
              title="在線用戶"
              :value="systemStats.onlineUsers" />
          </a-col>
          <a-col
            :xs="24"
            :sm="24"
            :md="12"
            :lg="12"
            :xl="12">
            <a-statistic
              title="活躍會話"
              :value="systemStats.activeSessions" />
          </a-col>
        </a-row>
      </div>
    </a-drawer>

    <!-- 手機端導航抽屜 -->
    <a-drawer
      v-model:open="showMobileMenu"
      title="導航菜單"
      placement="left"
      :width="280"
      :body-style="{ padding: 0 }"
      :mask="true"
      :mask-closable="true"
      :closable="true"
      :z-index="1050"
      class="mobile-drawer">
      <a-menu
        v-model:selectedKeys="selectedKeys"
        mode="inline"
        class="mobile-menu"
        @click="handleMobileMenuClick">
        <a-menu-item key="dashboard">
          <DashboardOutlined />
          <span>管理儀表板</span>
        </a-menu-item>

        <a-menu-item key="users">
          <UserOutlined />
          <span>用戶管理</span>
        </a-menu-item>
        <a-menu-item key="models">
          <ApiOutlined />
          <span>模型管理</span>
        </a-menu-item>
        <a-menu-item key="agents">
          <RobotOutlined />
          <span>智能體管理</span>
        </a-menu-item>

        <a-menu-item key="quick-commands">
          <ThunderboltOutlined />
          <span>快速命令</span>
        </a-menu-item>

        <a-menu-item key="mcp-services">
          <CloudServerOutlined />
          <span>MCP 服務管理</span>
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
    </a-drawer>
  </a-layout>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { message } from "ant-design-vue";
import { useAuthStore } from "@/stores/auth";
import { useWebSocketStore } from "@/stores/websocket";
import { useConfigStore } from "@/stores/config";
import { useFullscreen } from "@vueuse/core";
import { Grid } from "ant-design-vue";
import Logo from "@/components/common/Logo.vue";
import {
  TeamOutlined,
  BellOutlined,
  ReloadOutlined,
  ExpandOutlined,
  CompressOutlined,
  ArrowLeftOutlined,
  DownOutlined,
  UserOutlined,
  SettingOutlined,
  MenuOutlined,
  DashboardOutlined,
  CrownOutlined,
  LogoutOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  ApiOutlined,
  RobotOutlined,
  ThunderboltOutlined,
  CloudServerOutlined,
  ExperimentOutlined,
  FileTextOutlined,
  ToolOutlined,
  DatabaseOutlined,
  CloudDownloadOutlined,
  LineChartOutlined,
} from "@ant-design/icons-vue";
import { Lightbulb, MoonStar } from "lucide-vue-next";

// 響應式斷點
const { useBreakpoint } = Grid;
const screens = useBreakpoint();

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
const showMobileMenu = ref(false);
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

// 響應式計算屬性
const isMobile = computed(() => !screens.value.md);
const isTablet = computed(() => screens.value.md && !screens.value.lg);
const isDesktop = computed(() => screens.value.lg);

// 響應式顯示控制
const showLogoText = computed(() => !isMobile.value);
const showUsername = computed(() => !isMobile.value);
const showSystemStatus = computed(() => !isMobile.value);
const showAdminTag = computed(() => !isMobile.value);
const showSider = computed(() => !isMobile.value);

// 系統監控抽屜寬度
const drawerWidth = computed(() => {
  if (isMobile.value) return "100%";
  if (isTablet.value) return 500;
  return 600;
});

// 方法
const toggleCollapsed = () => {
  collapsed.value = !collapsed.value;
};

const handleSiderBreakpoint = (broken) => {
  // 在大屏幕斷點以下自動折疊側邊欄
  if (broken) {
    collapsed.value = true;
  }
};

const handleMenuClick = ({ key }) => {
  const routeMap = {
    dashboard: "/admin/dashboard",
    users: "/admin/users",
    agents: "/admin/agents",
    models: "/admin/models",
    "quick-commands": "/admin/quick-commands",
    "mcp-services": "/admin/mcp-services",
    "mcp-tools-tester": "/admin/mcp-tools-tester",
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

const handleMobileMenuClick = ({ key }) => {
  // 手機端菜單點擊後關閉抽屜
  showMobileMenu.value = false;
  // 執行相同的路由邏輯
  handleMenuClick({ key });
};

// 系統監控抽屜開啟
const handleSystemMonitor = () => {
  monitorDrawerVisible.value = true;
};

// 在線用戶功能開發中
const handleOnlineUsers = () => {
  message.info("在線用戶功能開發中");
};

// 系統通知功能開發中
const handleSystemNotifications = () => {
  message.info("系統通知功能開發中");
};

// 返回主應用
const handleBackToMain = () => {
  router.push("/dashboard");
};

// 個人資料功能開發中
const handleProfile = () => {
  message.info("個人資料功能開發中");
};

// 登出
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

// 刷新頁面
const handleRefresh = () => {
  window.location.reload();
};

// 全螢幕功能
const { isFullscreen, toggle: toggleFullscreen } = useFullscreen();

// 全屏功能
const handleFullscreen = () => {
  toggleFullscreen();
};

// 監聽路由變化，更新選中的菜單項
watch(
  () => route.path,
  (newPath) => {
    const pathToKey = {
      "/admin/dashboard": "dashboard",
      "/admin/users": "users",
      "/admin/agents": "agents",
      "/admin/models": "models",
      "/admin/quick-commands": "quick-commands",
      "/admin/mcp-services": "mcp-services",
      "/admin/mcp-tools-tester": "mcp-tools-tester",
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

// 監聽手機端菜單狀態，處理背景滾動
watch(showMobileMenu, (isOpen) => {
  if (isMobile.value) {
    // 手機端打開抽屜時禁止背景滾動
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }
});

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

onUnmounted(() => {
  // 確保在組件卸載時恢復頁面滾動
  document.body.style.overflow = "";
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
  background: linear-gradient(135deg, #f9f9f9 0%, #ffffff 100%);
  /* background: var(--custom-bg-primary); */
  padding: 0;
  height: 64px;
  line-height: 64px;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}
[data-theme="dark"] .ant-layout-header {
  background: linear-gradient(135deg, #141117 0%, #242424 100%);
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
  gap: 8px;
}

.mobile-menu-btn {
  color: var(--custom-text-primary);
}

.admin-logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-text {
  color: var(--custom-text-primary);
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
  background-color: var(--custom-bg-primary);
}

.theme-switch.ant-switch-checked {
  background-color: var(--ant-color-primary);
}

.theme-switch.ant-switch-checked .ant-switch-handle::before {
  background-color: var(--custom-bg-primary);
}

.quick-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.quick-actions .ant-btn {
  color: var(--custom-text-primary);
}

/* .quick-actions .ant-btn:hover {
  color: var(--custom-text-primary);
   background: var(--custom-bg-primary); 
} */

.user-menu-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  height: auto;
  padding: 4px 8px;
  color: var(--custom-text-primary);
}

.user-menu-btn:hover {
  color: white;
  background: rgba(255, 255, 255, 0.1);
}

.user-info {
  display: flex;
  align-items: center;
}

.username {
  color: var(--custom-text-primary);
  font-weight: 500;
}

.admin-main {
  margin-top: 64px;
  height: calc(100vh - 64px);
  display: flex;
}

.admin-sider {
  background: var(--custom-bg-primary);
  border-right: 1px solid var(--custom-border-primary);
  position: fixed;
  left: 0;
  top: 64px;
  bottom: 0;
  z-index: 100;
  overflow: hidden;
}

.sider-trigger {
  padding: 6px;
  border-bottom: 1px solid var(--custom-border-primary);
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
  background: var(--custom-bg-primary);
  border-radius: 6px;
  border: 1px solid var(--custom-border-primary);
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
  color: var(--custom-text-secondary);
}

/* 折疊狀態下的系統狀態樣式 */
.system-status-collapsed {
  position: absolute;
  bottom: 16px;
  left: 16px;
  right: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  padding: 8px;
  background: var(--custom-bg-primary);
  border-radius: 6px;
  border: 1px solid var(--custom-border-primary);
}

.system-status-collapsed .ant-badge {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
}

.system-status-collapsed .ant-badge .ant-badge-status-dot {
  margin: 0;
}

.admin-content {
  margin-left: 240px;
  padding: 0;
  background: var(--custom-bg-primary);
  height: calc(100vh - 64px);
  overflow: hidden;
  transition: margin-left 0.2s;
  display: flex;
  flex-direction: column;
}

.admin-content.collapsed {
  margin-left: 80px;
}

.admin-content.full-width {
  margin-left: 0;
}

.content-header {
  background: var(--custom-bg-primary);
  padding: 6px 12px;
  border-bottom: 1px solid var(--custom-border-primary);
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
  gap: 12px;
}

.page-actions .ant-btn {
  padding: 6px 15px !important;
}

.content-wrapper {
  flex: 1;
  padding: 2px;
  overflow-y: auto;
  background: var(--custom-bg-primary);
}

.monitor-content {
  padding: 16px 0;
}

/* 響應式設計 - 使用 Ant Design 響應式系統 */
.admin-sider {
  transition: all 0.2s;
}

.admin-content {
  transition: margin-left 0.2s;
}

/* 手機端優化 */
:deep(.ant-layout-sider-children) {
  display: flex;
  flex-direction: column;
}

/* 快速操作在小屏幕下的間距調整 */
:deep(.quick-actions) {
  gap: 8px;
}

@media (max-width: 768px) {
  :deep(.quick-actions) {
    gap: 4px;
  }
}

/* 內容頭部響應式調整 */
.content-header {
  flex-wrap: wrap;
  gap: 12px;
}

@media (max-width: 768px) {
  .content-header {
    padding: 12px 16px;
    flex-direction: column;
    align-items: flex-start;
  }

  .content-wrapper {
    padding: 16px;
  }

  .header-content {
    padding: 0 16px;
  }
}

/* 主題切換按鈕樣式 */
.theme-toggle-btn {
  padding: 8px 12px !important;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.theme-toggle-btn:hover {
  background-color: var(--custom-bg-quaternary) !important;
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

/* 手機端菜單樣式 */
.mobile-menu {
  border-right: none;
}

.mobile-menu .ant-menu-item {
  margin-bottom: 4px;
}

/* 手機端抽屜樣式 */
.mobile-drawer {
  z-index: 1050 !important;
}

/* 確保抽屜遮罩層正確顯示 */
:deep(.ant-drawer-mask) {
  z-index: 1040 !important;
  background-color: rgba(0, 0, 0, 0.45) !important;
}

/* 確保抽屜主體在最上層 */
:deep(.ant-drawer-content-wrapper) {
  z-index: 1050 !important;
}

/* 手機端時確保主布局不會溢出 */
@media (max-width: 767px) {
  .admin-layout {
    position: relative;
    overflow-x: hidden;
  }

  /* 確保內容區域在手機端正確顯示 */
  .admin-content.full-width {
    margin-left: 0;
    width: 100%;
  }
}
</style>
