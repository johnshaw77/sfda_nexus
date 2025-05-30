<template>
  <a-layout-sider
    :collapsed="collapsed"
    :trigger="null"
    collapsible
    :width="240"
    :collapsed-width="80"
    class="app-sider">
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
      v-model:openKeys="openKeys"
      mode="inline"
      theme="dark"
      class="app-menu"
      @click="handleMenuClick">
      <!-- 動態生成菜單項 -->
      <template
        v-for="menuItem in menuItems"
        :key="menuItem.key">
        <!-- 子菜單 -->
        <a-sub-menu
          v-if="menuItem.children && menuItem.children.length > 0"
          :key="`submenu-${menuItem.key}`">
          <template #icon>
            <component :is="menuItem.icon" />
          </template>
          <template #title>{{ menuItem.title }}</template>

          <a-menu-item
            v-for="child in menuItem.children"
            :key="child.key"
            :disabled="child.disabled">
            <component :is="child.icon" />
            <span>{{ child.title }}</span>
          </a-menu-item>
        </a-sub-menu>

        <!-- 普通菜單項 -->
        <a-menu-item
          v-else
          :key="`menuitem-${menuItem.key}`"
          :disabled="menuItem.disabled">
          <component :is="menuItem.icon" />
          <span>{{ menuItem.title }}</span>
        </a-menu-item>
      </template>
    </a-menu>

    <!-- 側邊欄底部 -->
    <div class="sider-footer">
      <!-- WebSocket 連接狀態 -->
      <div class="connection-status">
        <a-badge
          :status="connectionStatus === 'connected' ? 'success' : 'error'"
          :text="collapsed ? '' : connectionStatusText" />
      </div>
    </div>
  </a-layout-sider>
</template>

<script setup>
import { ref, computed, watch, inject } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useWebSocketStore } from "@/stores/websocket";
import {
  DashboardOutlined,
  MessageOutlined,
  SettingOutlined,
  CrownOutlined,
  UserOutlined,
  FileTextOutlined,
  ApiOutlined,
  RobotOutlined,
  TeamOutlined,
  MonitorOutlined,
} from "@ant-design/icons-vue";

// Props
const props = defineProps({
  collapsed: {
    type: Boolean,
    default: false,
  },
});

// Emits
const emit = defineEmits(["update:collapsed", "menu-click"]);

// Stores
const authStore = useAuthStore();
const wsStore = useWebSocketStore();

// Router
const router = useRouter();
const route = useRoute();

// 響應式狀態
const selectedKeys = ref([]);
const openKeys = ref([]);

// 圖標映射
const iconMap = {
  DashboardOutlined,
  MessageOutlined,
  SettingOutlined,
  CrownOutlined,
  UserOutlined,
  FileTextOutlined,
  ApiOutlined,
  RobotOutlined,
  TeamOutlined,
  MonitorOutlined,
};

// 計算屬性 - 連接狀態
const connectionStatus = computed(() => wsStore.connectionStatus);
const connectionStatusText = computed(() =>
  connectionStatus.value === "connected" ? "已連接" : "未連接"
);

// 計算屬性 - 菜單項（基於路由自動生成）
const menuItems = computed(() => {
  const routes = router.getRoutes();
  const menuItems = [];

  // 主要應用路由
  const mainRoutes =
    routes.find((r) => r.path === "/" && r.children)?.children || [];

  mainRoutes.forEach((route) => {
    if (route.meta?.icon && route.meta?.title) {
      menuItems.push({
        key: route.name,
        title: route.meta.title.replace(" - SFDA Nexus", ""),
        icon: route.meta.icon,
        path: route.path,
        disabled: false,
      });
    }
  });

  // 管理員路由（如果用戶是管理員）
  if (authStore.isAdmin) {
    const adminRoutes =
      routes.find((r) => r.path === "/admin" && r.children)?.children || [];
    const adminChildren = [];

    adminRoutes.forEach((route) => {
      if (route.meta?.icon && route.meta?.title && route.path !== "") {
        adminChildren.push({
          key: `admin-${route.name}`,
          title: route.meta.title.replace(" - SFDA Nexus", ""),
          icon: route.meta.icon,
          path: `/admin/${route.path}`,
          disabled: false,
        });
      }
    });

    if (adminChildren.length > 0) {
      menuItems.push({
        key: "admin",
        title: "管理",
        icon: "CrownOutlined",
        children: adminChildren,
      });
    }
  }

  return menuItems;
});

// 路由到菜單鍵的映射
const routeToMenuKey = computed(() => {
  const map = {};

  // 處理主要路由
  menuItems.value.forEach((item) => {
    if (item.path) {
      map[item.path] = item.key;
    }

    // 處理子菜單
    if (item.children) {
      item.children.forEach((child) => {
        map[child.path] = child.key;
      });
    }
  });

  return map;
});

// 菜單鍵到路由的映射
const menuKeyToRoute = computed(() => {
  const map = {};

  menuItems.value.forEach((item) => {
    if (item.path) {
      map[item.key] = item.path;
    }

    if (item.children) {
      item.children.forEach((child) => {
        map[child.key] = child.path;
      });
    }
  });

  return map;
});

// 方法
const handleMenuClick = ({ key }) => {
  const path = menuKeyToRoute.value[key];
  if (path && path !== route.path) {
    router.push(path);
    emit("menu-click", { key, path });
  }
};

// 更新選中的菜單項
const updateSelectedKeys = () => {
  const currentPath = route.path;
  const menuKey = routeToMenuKey.value[currentPath];

  if (menuKey) {
    selectedKeys.value = [menuKey];

    // 如果是管理員子菜單，確保父菜單展開
    if (menuKey.startsWith("admin-")) {
      openKeys.value = ["admin"];
    }
  }
};

// 監聽路由變化
watch(
  () => route.path,
  () => {
    updateSelectedKeys();
  },
  { immediate: true }
);

// 監聽 collapsed 變化
watch(
  () => props.collapsed,
  (newVal) => {
    if (!newVal) {
      // 展開時恢復之前的 openKeys
      updateSelectedKeys();
    } else {
      // 收縮時清空 openKeys
      openKeys.value = [];
    }
  }
);
</script>

<style scoped>
.app-sider {
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

.app-menu {
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

/* 響應式設計 */
@media (max-width: 768px) {
  .app-sider {
    transform: translateX(-100%);
    transition: transform 0.3s;
  }

  .app-sider.mobile-visible {
    transform: translateX(0);
  }
}
</style>
