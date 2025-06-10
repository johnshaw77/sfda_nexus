/**
 * 認證調試工具
 * 用於檢查 authStore 的狀態和數據
 */

export const debugAuthStore = (authStore) => {
  console.group("🔍 AuthStore 調試信息");

  console.log("=== 基本狀態 ===");
  console.log("isInitialized:", authStore.isInitialized);
  console.log("isLoading:", authStore.isLoading);
  console.log("token:", authStore.token ? "存在" : "不存在");
  console.log("refreshToken:", authStore.refreshToken ? "存在" : "不存在");

  console.log("=== 用戶數據 ===");
  console.log("user:", authStore.user);
  if (authStore.user) {
    console.log("user.id:", authStore.user.id);
    console.log("user.username:", authStore.user.username);
    console.log("user.role:", authStore.user.role);
    console.log("user.email:", authStore.user.email);
  }

  console.log("=== 計算屬性 ===");
  console.log("isAuthenticated:", authStore.isAuthenticated);
  console.log("userRole:", authStore.userRole);
  console.log("isAdmin:", authStore.isAdmin);

  console.log("=== 本地存儲 ===");
  console.log(
    "localStorage.token:",
    localStorage.getItem("token") ? "存在" : "不存在"
  );
  console.log(
    "localStorage.refreshToken:",
    localStorage.getItem("refreshToken") ? "存在" : "不存在"
  );

  console.groupEnd();
};

export const debugUserData = (user, label = "用戶數據") => {
  console.group(`🔍 ${label} 調試信息`);

  if (!user) {
    console.log("❌ 用戶數據為空");
    console.groupEnd();
    return;
  }

  console.log("✅ 用戶數據存在");
  console.log("完整數據:", user);
  console.log("ID:", user.id);
  console.log("用戶名:", user.username);
  console.log("角色:", user.role);
  console.log("郵箱:", user.email);
  console.log("顯示名稱:", user.display_name || user.displayName);
  console.log("是否激活:", user.is_active);

  console.groupEnd();
};
