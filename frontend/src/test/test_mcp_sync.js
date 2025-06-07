/**
 * 測試 MCP 同步功能
 */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// 設置環境變數
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "backend", ".env") });

import mcpSyncService from "../../../backend/src/services/mcpSync.service.js";
import {
  initializeDatabase,
  closeDatabase,
} from "../../../backend/src/config/database.config.js";

async function testMcpSync() {
  console.log("開始測試 MCP 同步...");

  try {
    // 初始化資料庫連接
    await initializeDatabase();
    console.log("✅ 資料庫連接已初始化");

    const result = await mcpSyncService.syncAll();

    if (result.success) {
      console.log("✅ 同步成功!");
      console.log("同步結果:", JSON.stringify(result.data, null, 2));
    } else {
      console.log("❌ 同步失敗:", result.message);
    }
  } catch (error) {
    console.error("❌ 同步過程中發生錯誤:", error);
  } finally {
    // 關閉資料庫連接
    await closeDatabase();
    console.log("✅ 資料庫連接已關閉");
  }
}

testMcpSync();
