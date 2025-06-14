/**
 * 前端 WebSocket 連接測試
 * 在瀏覽器控制台中運行此腳本來測試 WebSocket 連接
 */

// 測試 WebSocket 連接
function testWebSocketConnection() {
  console.log("🧪 開始測試前端 WebSocket 連接...");

  // 檢查 WebSocket Store
  const wsStore =
    window.__VUE_DEVTOOLS_GLOBAL_HOOK__?.apps?.[0]?.config?.globalProperties
      ?.$pinia?.state?.value?.websocket;

  if (!wsStore) {
    console.error("❌ 無法找到 WebSocket Store");
    return;
  }

  console.log("📊 WebSocket 狀態:");
  console.log("  連接狀態:", wsStore.connectionStatus);
  console.log("  是否已連接:", wsStore.isConnected);
  console.log("  是否正在連接:", wsStore.isConnecting);
  console.log("  客戶端 ID:", wsStore.clientId);
  console.log("  重連次數:", wsStore.reconnectAttempts);

  // 檢查認證狀態
  const authStore =
    window.__VUE_DEVTOOLS_GLOBAL_HOOK__?.apps?.[0]?.config?.globalProperties
      ?.$pinia?.state?.value?.auth;

  if (authStore) {
    console.log("🔐 認證狀態:");
    console.log("  是否已認證:", authStore.isAuthenticated);
    console.log("  用戶:", authStore.user?.username);
    console.log("  Token 存在:", !!authStore.token);
  }

  // 測試手動連接
  if (!wsStore.isConnected && !wsStore.isConnecting) {
    console.log("🔌 嘗試手動連接 WebSocket...");

    // 這裡需要通過 Vue 應用實例來調用 store 方法
    // 在實際使用中，應該通過組件或 composable 來調用
    console.log("💡 請在 Vue 組件中使用 useWebSocket() 來連接");
  }

  return {
    wsStore,
    authStore,
  };
}

// 監聽 WebSocket 事件的測試函數
function setupWebSocketEventListeners() {
  console.log("🎧 設置 WebSocket 事件監聽器...");

  // 這個函數需要在 Vue 組件中調用
  console.log("💡 請在 Vue 組件中使用以下代碼:");
  console.log(`
const { addEventListener } = useWebSocket();

// 監聽調試信息
addEventListener("debug_info", (data) => {
  console.log("🐛 收到調試信息:", data);
});

// 監聽連接狀態
addEventListener("auth_success", (data) => {
  console.log("✅ WebSocket 認證成功:", data);
});
  `);
}

// 導出測試函數
window.testWebSocket = testWebSocketConnection;
window.setupWSListeners = setupWebSocketEventListeners;

console.log("🔧 WebSocket 測試工具已載入");
console.log("使用 testWebSocket() 來測試連接");
console.log("使用 setupWSListeners() 來查看事件監聽器設置方法");
