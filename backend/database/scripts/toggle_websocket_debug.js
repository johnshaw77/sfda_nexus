/**
 * WebSocket 調試模式切換工具
 * 快速切換 WS_DEBUG 環境變數
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, "../../.env");

/**
 * 讀取 .env 文件內容
 */
const readEnvFile = () => {
  try {
    return fs.readFileSync(envPath, "utf8");
  } catch (error) {
    console.error("❌ 無法讀取 .env 文件:", error.message);
    process.exit(1);
  }
};

/**
 * 寫入 .env 文件內容
 */
const writeEnvFile = (content) => {
  try {
    fs.writeFileSync(envPath, content, "utf8");
  } catch (error) {
    console.error("❌ 無法寫入 .env 文件:", error.message);
    process.exit(1);
  }
};

/**
 * 獲取當前 WS_DEBUG 設置
 */
const getCurrentDebugSetting = (envContent) => {
  const match = envContent.match(/^WS_DEBUG=(.*)$/m);
  return match ? match[1].trim() : null;
};

/**
 * 切換 WS_DEBUG 設置
 */
const toggleDebugSetting = () => {
  console.log("🔧 WebSocket 調試模式切換工具");
  console.log("=".repeat(40));

  const envContent = readEnvFile();
  const currentSetting = getCurrentDebugSetting(envContent);

  console.log(`當前設置: WS_DEBUG=${currentSetting}`);

  if (currentSetting === null) {
    console.log("❌ 未找到 WS_DEBUG 設置");
    process.exit(1);
  }

  // 切換設置
  const newSetting = currentSetting === "true" ? "false" : "true";
  const newEnvContent = envContent.replace(
    /^WS_DEBUG=.*$/m,
    `WS_DEBUG=${newSetting}`
  );

  writeEnvFile(newEnvContent);

  console.log(`✅ 已切換為: WS_DEBUG=${newSetting}`);
  console.log("");

  if (newSetting === "true") {
    console.log("📝 詳細調試模式已啟用:");
    console.log("  - 會記錄所有 WebSocket 消息");
    console.log("  - 包括心跳、輸入狀態等頻繁消息");
    console.log("  - 適合開發和調試時使用");
  } else {
    console.log("🔇 簡潔模式已啟用:");
    console.log("  - 只記錄重要的 WebSocket 消息");
    console.log("  - 過濾心跳、狀態等頻繁消息");
    console.log("  - 適合生產環境使用");
  }

  console.log("");
  console.log("⚠️  請重啟後端服務以使設置生效");
};

/**
 * 顯示當前設置
 */
const showCurrentSetting = () => {
  const envContent = readEnvFile();
  const currentSetting = getCurrentDebugSetting(envContent);

  console.log("📋 當前 WebSocket 調試設置");
  console.log("=".repeat(30));
  console.log(`WS_DEBUG=${currentSetting}`);

  if (currentSetting === "true") {
    console.log("狀態: 詳細調試模式 (會記錄所有消息)");
  } else {
    console.log("狀態: 簡潔模式 (只記錄重要消息)");
  }
};

// 處理命令行參數
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case "toggle":
  case "t":
    toggleDebugSetting();
    break;

  case "status":
  case "s":
    showCurrentSetting();
    break;

  case "on":
    {
      const envContent = readEnvFile();
      const newEnvContent = envContent.replace(
        /^WS_DEBUG=.*$/m,
        "WS_DEBUG=true"
      );
      writeEnvFile(newEnvContent);
      console.log("✅ WebSocket 詳細調試已啟用");
    }
    break;

  case "off":
    {
      const envContent = readEnvFile();
      const newEnvContent = envContent.replace(
        /^WS_DEBUG=.*$/m,
        "WS_DEBUG=false"
      );
      writeEnvFile(newEnvContent);
      console.log("✅ WebSocket 簡潔模式已啟用");
    }
    break;

  default:
    console.log("🔧 WebSocket 調試模式切換工具");
    console.log("");
    console.log("使用方法:");
    console.log("  node toggle_websocket_debug.js [command]");
    console.log("");
    console.log("命令:");
    console.log("  toggle, t    切換調試模式");
    console.log("  status, s    顯示當前設置");
    console.log("  on           啟用詳細調試");
    console.log("  off          啟用簡潔模式");
    console.log("");
    console.log("範例:");
    console.log("  node toggle_websocket_debug.js toggle");
    console.log("  node toggle_websocket_debug.js status");
}
