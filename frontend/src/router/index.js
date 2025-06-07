import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth";

// 路由配置
const routes = [
  {
    path: "/",
    redirect: "/dashboard",
  },

  // 認證相關路由 - 直接使用登入頁面
  {
    path: "/auth/login",
    name: "Login",
    component: () => import("@/views/auth/components/Login.vue"),
    meta: {
      requiresGuest: true,
      title: "登入",
    },
  },

  // 主要應用路由
  {
    path: "/",
    component: () => import("@/layouts/MainLayout.vue"),
    meta: { requiresAuth: true },
    children: [
      {
        path: "dashboard",
        name: "Dashboard",
        component: () => import("@/views/dashboard/index.vue"),
        meta: {
          title: "儀表板",
          icon: "DashboardOutlined",
        },
      },
      {
        path: "chat",
        name: "Chat",
        component: () => import("@/views/chat/index.vue"),
        meta: {
          title: "聊天",
          icon: "MessageOutlined",
        },
      },
      {
        path: "chat/:agentId",
        name: "ChatWithAgent",
        component: () => import("@/views/chat/index.vue"),
        meta: {
          title: "聊天",
          icon: "MessageOutlined",
        },
        props: true,
      },
      {
        path: "user",
        name: "UserProfile",
        component: () => import("@/views/user/index.vue"),
        meta: {
          title: "個人資料",
          icon: "UserOutlined",
        },
      },
      {
        path: "settings",
        name: "Settings",
        component: () => import("@/views/settings/index.vue"),
        meta: {
          title: "設置",
          icon: "SettingOutlined",
        },
      },
      {
        path: "playground",
        name: "Playground",
        component: () => import("@/views/playground/index.vue"),
        meta: {
          title: "測試實驗室",
          icon: "ExperimentOutlined",
        },
      },
    ],
  },

  // 管理員路由
  {
    path: "/admin",
    component: () => import("@/layouts/AdminLayout.vue"),
    meta: {
      requiresAuth: true,
      requiresAdmin: true,
    },
    children: [
      {
        path: "",
        redirect: "/admin/dashboard",
      },
      {
        path: "dashboard",
        name: "AdminDashboard",
        component: () => import("@/views/admin/index.vue"),
        meta: {
          title: "管理儀表板",
          icon: "DashboardOutlined",
        },
      },
      {
        path: "models",
        name: "ModelManagement",
        component: () => import("@/views/admin/models.vue"),
        meta: {
          title: "模型管理",
          icon: "ApiOutlined",
        },
      },
      {
        path: "quick-commands",
        name: "QuickCommandManagement",
        component: () => import("@/views/admin/quickCommands.vue"),
        meta: {
          title: "快速命令管理",
          icon: "ThunderboltOutlined",
        },
      },
      {
        path: "agents",
        name: "AgentManagement",
        component: () => import("@/views/admin/agents.vue"),
        meta: {
          title: "智能體管理",
          icon: "RobotOutlined",
        },
      },
      {
        path: "users",
        name: "UserManagement",
        component: () => import("@/views/admin/users.vue"),
        meta: {
          title: "用戶管理",
          icon: "UserOutlined",
        },
      },
      {
        path: "system",
        name: "SystemSettings",
        component: () => import("@/views/admin/system.vue"),
        meta: {
          title: "系統設置",
          icon: "SettingOutlined",
        },
      },
      {
        path: "mcp-services",
        name: "McpServices",
        component: () => import("@/views/admin/McpServices.vue"),
        meta: {
          title: "MCP 服務管理",
          icon: "CloudServerOutlined",
        },
      },
    ],
  },

  // 404 頁面
  {
    path: "/:pathMatch(.*)*",
    name: "NotFound",
    component: () => import("@/views/error/NotFound.vue"),
    meta: {
      title: "頁面未找到",
    },
  },
];

// 創建路由實例
const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    } else {
      return { top: 0 };
    }
  },
});

// 路由守衛
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();
  // console.log(authStore.isAdmin, "authStore.isAdmin");
  // 設置頁面標題
  if (to.meta.title) {
    document.title = to.meta.title;
  }

  // 檢查認證狀態
  if (!authStore.isInitialized) {
    await authStore.handleInitialize();
  }

  // 需要認證的路由
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ name: "Login", query: { redirect: to.fullPath } });
    return;
  }

  // 需要管理員權限的路由
  if (to.meta.requiresAdmin && !authStore.isAdmin) {
    next({ name: "Dashboard" });
    return;
  }

  // 只允許訪客訪問的路由（如登入頁面）
  if (to.meta.requiresGuest && authStore.isAuthenticated) {
    next({ name: "Dashboard" });
    return;
  }

  next();
});

// 路由錯誤處理
router.onError((error) => {
  console.error("路由錯誤:", error);
});

export default router;
