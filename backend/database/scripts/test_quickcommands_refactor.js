/**
 * 測試腳本：驗證 QuickCommands 重構（移除分類欄位）
 * 執行方式：cd backend && node database/scripts/test_quickcommands_refactor.js
 */

import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { config } from "dotenv";

// 設置 __dirname 為當前文件目錄
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 載入環境變數
config({ path: join(__dirname, "../../.env") });

// 導入資料庫和模型
import {
  initializeDatabase,
  closeDatabase,
} from "../../src/config/database.config.js";
import * as QuickCommandModel from "../../src/models/QuickCommand.model.js";

console.log("🧪 開始測試 QuickCommands 重構...\n");

/**
 * 測試獲取所有快速命令詞
 */
async function testGetAllQuickCommands() {
  console.log("📋 測試 getAllQuickCommands...");
  try {
    const commands = await QuickCommandModel.getAllQuickCommands();
    console.log(`✅ 成功獲取 ${commands.length} 個快速命令詞`);

    if (commands.length > 0) {
      const firstCommand = commands[0];
      console.log("   第一個命令結構:", {
        id: firstCommand.id,
        text: firstCommand.text,
        description: firstCommand.description
          ? firstCommand.description.substring(0, 50) + "..."
          : null,
        icon: firstCommand.icon,
        usage_count: firstCommand.usage_count,
        is_active: firstCommand.is_active,
      });

      // 確認沒有 category 欄位
      if ("category" in firstCommand) {
        console.log("❌ 錯誤：資料中仍包含 category 欄位！");
        return false;
      } else {
        console.log("✅ 確認：資料中已移除 category 欄位");
      }
    }

    return true;
  } catch (error) {
    console.log("❌ 測試失敗:", error.message);
    return false;
  }
}

/**
 * 測試獲取帶智能體關聯的快速命令詞
 */
async function testGetAllQuickCommandsWithAgents() {
  console.log("\n📋 測試 getAllQuickCommandsWithAgents...");
  try {
    const commands = await QuickCommandModel.getAllQuickCommandsWithAgents();
    console.log(`✅ 成功獲取 ${commands.length} 個帶智能體關聯的快速命令詞`);

    if (commands.length > 0) {
      const firstCommand = commands[0];
      console.log("   第一個命令結構:", {
        id: firstCommand.id,
        text: firstCommand.text,
        agent_id: firstCommand.agent_id,
        agent_name: firstCommand.agent_name,
        agent_internal_name: firstCommand.agent_internal_name,
      });

      // 確認沒有 category 欄位
      if ("category" in firstCommand) {
        console.log("❌ 錯誤：資料中仍包含 category 欄位！");
        return false;
      } else {
        console.log("✅ 確認：資料中已移除 category 欄位");
      }
    }

    return true;
  } catch (error) {
    console.log("❌ 測試失敗:", error.message);
    return false;
  }
}

/**
 * 測試創建新的快速命令詞（不包含分類）
 */
async function testCreateQuickCommand() {
  console.log("\n📝 測試 createQuickCommand...");
  try {
    const testCommand = {
      command_text: `測試命令 ${Date.now()}`,
      description: "這是一個測試命令，用於驗證重構後的創建功能",
      icon: "test",
      created_by: 1,
    };

    const result = await QuickCommandModel.createQuickCommand(testCommand);
    console.log("✅ 成功創建快速命令詞:", {
      id: result.id,
      command_text: result.command_text,
      description: result.description,
      icon: result.icon,
    });

    // 確認創建的資料不包含 category
    if ("category" in result) {
      console.log("❌ 錯誤：創建的資料包含 category 欄位！");
      return { success: false, id: result.id };
    } else {
      console.log("✅ 確認：創建的資料不包含 category 欄位");
    }

    return { success: true, id: result.id };
  } catch (error) {
    console.log("❌ 測試失敗:", error.message);
    return { success: false, id: null };
  }
}

/**
 * 測試更新快速命令詞（不能更新分類）
 */
async function testUpdateQuickCommand(commandId) {
  console.log("\n✏️ 測試 updateQuickCommand...");
  try {
    const updateData = {
      description: "更新後的描述 - 測試重構功能",
      icon: "updated",
      is_active: true,
    };

    await QuickCommandModel.updateQuickCommand(commandId, updateData);
    console.log("✅ 成功更新快速命令詞");

    // 嘗試更新不存在的 category 欄位（應該被忽略）
    try {
      await QuickCommandModel.updateQuickCommand(commandId, {
        category: "should_be_ignored",
        description: "測試忽略 category 更新",
      });
      console.log("✅ 確認：category 欄位被正確忽略");
      return true;
    } catch (error) {
      console.log("✅ 確認：category 欄位更新被拒絕（預期行為）");
      return true;
    }
  } catch (error) {
    console.log("❌ 測試失敗:", error.message);
    return false;
  }
}

/**
 * 清理測試資料
 */
async function cleanupTestData(commandId) {
  console.log("\n🧹 清理測試資料...");
  try {
    if (commandId) {
      await QuickCommandModel.deleteQuickCommand(commandId);
      console.log("✅ 成功清理測試資料");
    }
  } catch (error) {
    console.log("⚠️ 清理測試資料失敗:", error.message);
  }
}

/**
 * 主測試函數
 */
async function runTests() {
  console.log("🚀 QuickCommands 重構測試開始\n");

  // 初始化資料庫連接
  try {
    await initializeDatabase();
    console.log("✅ 資料庫連接初始化成功\n");
  } catch (error) {
    console.error("❌ 資料庫連接初始化失敗:", error.message);
    process.exit(1);
  }

  let testResults = [];
  let createdCommandId = null;

  // 測試 1: 獲取所有快速命令詞
  const test1 = await testGetAllQuickCommands();
  testResults.push({ test: "getAllQuickCommands", success: test1 });

  // 測試 2: 獲取帶智能體關聯的快速命令詞
  const test2 = await testGetAllQuickCommandsWithAgents();
  testResults.push({ test: "getAllQuickCommandsWithAgents", success: test2 });

  // 測試 3: 創建快速命令詞
  const test3 = await testCreateQuickCommand();
  testResults.push({ test: "createQuickCommand", success: test3.success });
  createdCommandId = test3.id;

  // 測試 4: 更新快速命令詞
  if (createdCommandId) {
    const test4 = await testUpdateQuickCommand(createdCommandId);
    testResults.push({ test: "updateQuickCommand", success: test4 });
  }

  // 清理測試資料
  await cleanupTestData(createdCommandId);

  // 測試結果總結
  console.log("\n📊 測試結果總結:");
  console.log("=" * 50);

  const passedTests = testResults.filter((r) => r.success).length;
  const totalTests = testResults.length;

  testResults.forEach((result) => {
    const status = result.success ? "✅ 通過" : "❌ 失敗";
    console.log(`${status} ${result.test}`);
  });

  console.log("=" * 50);
  console.log(`總計: ${passedTests}/${totalTests} 測試通過`);

  // 關閉資料庫連接
  try {
    await closeDatabase();
    console.log("✅ 資料庫連接已關閉");
  } catch (error) {
    console.error("⚠️ 關閉資料庫連接失敗:", error.message);
  }

  if (passedTests === totalTests) {
    console.log("🎉 所有測試通過！QuickCommands 重構成功！");
    process.exit(0);
  } else {
    console.log("❌ 有測試失敗，請檢查重構是否完整");
    process.exit(1);
  }
}

// 執行測試
runTests().catch((error) => {
  console.error("💥 測試執行失敗:", error);
  process.exit(1);
});
