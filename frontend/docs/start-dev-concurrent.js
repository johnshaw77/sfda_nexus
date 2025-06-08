#!/usr/bin/env node

/**
 * SFDA Nexus 開發環境啟動腳本 (使用 concurrently)
 * 同時啟動 frontend 和 backend 的開發模式
 */

import concurrently from "concurrently";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// 顏色配置
const colors = {
  backend: "blue",
  frontend: "magenta",
};

// 服務配置
const services = [
  {
    name: "backend",
    command: "npm run dev",
    cwd: join(__dirname, "backend"),
    prefixColor: colors.backend,
  },
  {
    name: "frontend",
    command: "npm run dev",
    cwd: join(__dirname, "frontend"),
    prefixColor: colors.frontend,
  },
];

// 啟動配置
const options = {
  prefix: "name",
  killOthers: ["failure", "success"],
  restartTries: 3,
  cwd: __dirname,
};

// 主要執行函式
const main = async () => {
  try {
    console.log("\x1b[36m=== SFDA Nexus 開發環境啟動 ===\x1b[0m");
    console.log(`\x1b[36m時間: ${new Date().toLocaleString("zh-TW")}\x1b[0m`);
    console.log("");
    console.log("\x1b[33m正在啟動開發服務...\x1b[0m");
    console.log("");

    // 啟動服務
    const { result } = concurrently(services, options);

    // 等待所有服務啟動
    await result;
  } catch (error) {
    console.error("\x1b[31m啟動失敗:\x1b[0m", error.message);
    process.exit(1);
  }
};

// 執行
main().catch((error) => {
  console.error("\x1b[31m未處理的錯誤:\x1b[0m", error.message);
  process.exit(1);
});
