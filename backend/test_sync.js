import mcpSyncService from "./src/services/mcpSync.service.js";
import {
  initializeDatabase,
  closeDatabase,
} from "./src/config/database.config.js";

async function testSync() {
  try {
    await initializeDatabase();
    console.log("✅ 資料庫連接已初始化");

    const result = await mcpSyncService.syncAll();
    console.log("同步結果:", JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("錯誤:", error.message);
  } finally {
    await closeDatabase();
  }
}

testSync();
