import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/store/auth";

// 佈局組件
import MainLayout from "@/layouts/MainLayout.vue";
import AuthLayout from "@/layouts/AuthLayout.vue";
import AdminLayout from "@/layouts/AdminLayout.vue";

// 頁面組件
import Login from "@/views/auth/Login.vue";
import Register from "@/views/auth/Register.vue";
import ForgotPassword from "@/views/auth/ForgotPassword.vue";

import Dashboard from "@/views/dashboard/Dashboard.vue";
import Chat from "@/views/chat/Chat.vue";
import Settings from "@/views/settings/Settings.vue";

import AdminDashboard from "@/views/admin/Dashboard.vue";
import UserManagement from "@/views/admin/UserManagement.vue";
import SystemSettings from "@/views/admin/SystemSettings.vue";
import AuditLogs from "@/views/admin/AuditLogs.vue";

// 路由配置
const routes = [
  {
    path: "/",
    redirect: "/dashboard",
  },

  // 認證相關路由
  {
    path: "/auth",
    component: AuthLayout,
    children: [
      {
        path: "login",
        name: "Login",
        component: Login,
        meta: {
          requiresGuest: true,
          title: "登入 - SFDA Nexus",
        },
      },
      {
        path: "register",
        name: "Register",
        component: Register,
        meta: {
          requiresGuest: true,
          title: "註冊 - SFDA Nexus",
        },
      },
      {
        path: "forgot-password",
        name: "ForgotPassword",
        component: ForgotPassword,
        meta: {
          requiresGuest: true,
          title: "忘記密碼 - SFDA Nexus",
        },
      },
    ],
  },

  // 主要應用路由
  {
    path: "/",
    component: MainLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: "dashboard",
        name: "Dashboard",
        component: Dashboard,
        meta: {
          title: "儀表板 - SFDA Nexus",
          icon: "DashboardOutlined",
        },
      },
      {
        path: "chat",
        name: "Chat",
        component: Chat,
        meta: {
          title: "聊天 - SFDA Nexus",
          icon: "MessageOutlined",
        },
      },
      {
        path: "settings",
        name: "Settings",
        component: Settings,
        meta: {
          title: "設置 - SFDA Nexus",
          icon: "SettingOutlined",
        },
      },
    ],
  },

  // 管理員路由
  {
    path: "/admin",
    component: AdminLayout,
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
        component: AdminDashboard,
        meta: {
          title: "管理儀表板 - SFDA Nexus",
          icon: "DashboardOutlined",
        },
      },
      {
        path: "users",
        name: "UserManagement",
        component: UserManagement,
        meta: {
          title: "用戶管理 - SFDA Nexus",
          icon: "UserOutlined",
        },
      },
      {
        path: "system",
        name: "SystemSettings",
        component: SystemSettings,
        meta: {
          title: "系統設置 - SFDA Nexus",
          icon: "SettingOutlined",
        },
      },
      {
        path: "logs",
        name: "AuditLogs",
        component: AuditLogs,
        meta: {
          title: "審計日誌 - SFDA Nexus",
          icon: "FileTextOutlined",
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
      title: "頁面未找到 - SFDA Nexus",
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
