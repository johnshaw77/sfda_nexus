#!/usr/bin/env node

/**
 * SFDA Nexus 平台檢測和推薦腳本
 * 根據用戶的作業系統推薦最適合的啟動方式
 */

import { platform, release } from "os";

// 顏色定義
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

const log = (message, color = colors.reset) => {
  console.log(`${color}${message}${colors.reset}`);
};

// 檢測作業系統
const detectPlatform = () => {
  const os = platform();
  const version = release();

  switch (os) {
    case "win32":
      return {
        name: "Windows",
        version,
        icon: "🖥️",
        recommendations: [
          {
            method: "node start-dev.js",
            description: "Node.js 腳本 (推薦)",
            compatibility: "⭐⭐⭐",
          },
          {
            method: ".\\start-dev.ps1",
            description: "PowerShell 腳本",
            compatibility: "⭐⭐⭐",
          },
          {
            method: "start-dev.bat",
            description: "批次檔案",
            compatibility: "⭐⭐",
          },
        ],
      };

    case "darwin":
      return {
        name: "macOS",
        version,
        icon: "🍎",
        recommendations: [
          {
            method: "node start-dev.js",
            description: "Node.js 腳本 (推薦)",
            compatibility: "⭐⭐⭐",
          },
          {
            method: "./start-dev.sh",
            description: "Shell 腳本",
            compatibility: "⭐⭐⭐",
          },
          {
            method: "node platform-check.js",
            description: "平台檢測工具",
            compatibility: "⭐⭐",
          },
        ],
      };

    case "linux":
      return {
        name: "Linux",
        version,
        icon: "🐧",
        recommendations: [
          {
            method: "node start-dev.js",
            description: "Node.js 腳本 (推薦)",
            compatibility: "⭐⭐⭐",
          },
          {
            method: "./start-dev.sh",
            description: "Shell 腳本",
            compatibility: "⭐⭐⭐",
          },
          {
            method: "node platform-check.js",
            description: "平台檢測工具",
            compatibility: "⭐⭐",
          },
        ],
      };

    default:
      return {
        name: os,
        version,
        icon: "❓",
        recommendations: [
          {
            method: "node start-dev.js",
            description: "Node.js 腳本 (通用)",
            compatibility: "⭐⭐",
          },
        ],
      };
  }
};

// 主要函式
const main = () => {
  const platformInfo = detectPlatform();

  log(
    `${colors.bright}${colors.cyan}=== SFDA Nexus 平台檢測 ===${colors.reset}`
  );
  log("");

  log(`${colors.bright}檢測到的系統:${colors.reset}`);
  log(
    `${platformInfo.icon} ${platformInfo.name} ${platformInfo.version}`,
    colors.green
  );
  log("");

  log(`${colors.bright}推薦的啟動方式:${colors.reset}`);
  log("");

  platformInfo.recommendations.forEach((rec, index) => {
    const number = index + 1;
    log(`${colors.bright}${number}. ${rec.method}${colors.reset}`, colors.cyan);
    log(`   描述: ${rec.description}`, colors.yellow);
    log(`   相容性: ${rec.compatibility}`, colors.magenta);
    log("");
  });

  log(`${colors.bright}快速開始:${colors.reset}`);
  log(
    `${colors.green}${platformInfo.recommendations[0].method}${colors.reset}`
  );
  log("");

  // 額外建議
  if (platformInfo.name === "Windows") {
    log(`${colors.bright}Windows 特別提示:${colors.reset}`);
    log("• 如果 PowerShell 腳本無法執行，請以管理員身份運行:", colors.yellow);
    log("  Set-ExecutionPolicy RemoteSigned", colors.cyan);
    log("• 建議使用 Windows Terminal 以獲得更好的體驗", colors.yellow);
  } else {
    log(`${colors.bright}Unix 系統提示:${colors.reset}`);
    log("• 確保 shell 腳本有執行權限:", colors.yellow);
    log("  chmod +x start-dev.sh", colors.cyan);
  }

  log("");
  log(
    `${colors.bright}更多資訊請參考:${colors.reset} DEV_SCRIPTS_README.md`,
    colors.blue
  );
};

// 執行
main();
