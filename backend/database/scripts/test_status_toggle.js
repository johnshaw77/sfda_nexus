/**
 * 測試腳本：驗證快速命令狀態切換功能
 * 執行方式：cd backend && node database/scripts/test_status_toggle.js
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

console.log("🧪 開始測試快速命令狀態切換功能...\n");

/**
 * 測試狀態切換功能
 */
async function testStatusToggle() {
  console.log("🔄 測試狀態切換功能...");

  try {
    // 1. 獲取第一個快速命令
    const commands = await QuickCommandModel.getAllQuickCommands();
    if (commands.length === 0) {
      console.log("❌ 沒有找到快速命令，無法測試");
      return false;
    }

    const testCommand = commands[0];
    console.log(
      `📝 測試命令: ID=${testCommand.id}, 文字="${testCommand.text}"`
    );
    console.log(`   當前狀態: ${testCommand.is_active ? "啟用" : "停用"}`);

    // 2. 獲取命令詳情
    const commandDetail = await QuickCommandModel.getQuickCommandById(
      testCommand.id
    );
    if (!commandDetail) {
      console.log("❌ 無法獲取命令詳情");
      return false;
    }
    console.log("✅ 成功獲取命令詳情");

    // 3. 切換狀態（從當前狀態切換到相反狀態）
    const originalStatus = Boolean(commandDetail.is_active);
    const newStatus = !originalStatus;
    console.log(
      `🔄 嘗試將狀態從 ${originalStatus ? "啟用" : "停用"} 切換到 ${newStatus ? "啟用" : "停用"}`
    );

    await QuickCommandModel.updateQuickCommand(testCommand.id, {
      is_active: newStatus,
    });
    console.log("✅ 狀態更新成功");

    // 4. 驗證狀態是否正確更新
    const updatedCommand = await QuickCommandModel.getQuickCommandById(
      testCommand.id
    );
    // 將資料庫的 0/1 轉換為布爾值進行比較
    const actualStatus = Boolean(updatedCommand.is_active);
    if (actualStatus === newStatus) {
      console.log(`✅ 狀態驗證成功: ${actualStatus ? "啟用" : "停用"}`);
    } else {
      console.log(
        `❌ 狀態驗證失敗: 期望 ${newStatus ? "啟用" : "停用"}，實際 ${actualStatus ? "啟用" : "停用"}`
      );
      console.log(
        `   資料庫原始值: ${updatedCommand.is_active} (類型: ${typeof updatedCommand.is_active})`
      );
      return false;
    }

    // 5. 恢復原始狀態
    await QuickCommandModel.updateQuickCommand(testCommand.id, {
      is_active: originalStatus,
    });
    console.log("✅ 已恢復原始狀態");

    return true;
  } catch (error) {
    console.log("❌ 狀態切換測試失敗:", error.message);
    console.error("詳細錯誤:", error);
    return false;
  }
}

/**
 * 測試批量狀態切換
 */
async function testBatchStatusToggle() {
  console.log("\n🔄 測試批量狀態切換...");

  try {
    // 獲取前3個命令進行測試
    const commands = await QuickCommandModel.getAllQuickCommands();
    const testCommands = commands.slice(0, 3);

    console.log(`📝 測試 ${testCommands.length} 個命令的狀態切換`);

    const originalStates = [];

    // 記錄原始狀態並切換
    for (const command of testCommands) {
      const detail = await QuickCommandModel.getQuickCommandById(command.id);
      const originalStatus = Boolean(detail.is_active);
      originalStates.push({ id: command.id, original: originalStatus });

      const newStatus = !originalStatus;
      await QuickCommandModel.updateQuickCommand(command.id, {
        is_active: newStatus,
      });

      console.log(
        `   ID ${command.id}: ${originalStatus ? "啟用" : "停用"} → ${newStatus ? "啟用" : "停用"}`
      );
    }

    console.log("✅ 批量狀態切換成功");

    // 驗證狀態
    let allCorrect = true;
    for (const { id, original } of originalStates) {
      const updated = await QuickCommandModel.getQuickCommandById(id);
      const actualStatus = Boolean(updated.is_active);
      const expected = !Boolean(original);
      if (actualStatus !== expected) {
        console.log(
          `❌ ID ${id} 狀態驗證失敗: 期望 ${expected ? "啟用" : "停用"}，實際 ${actualStatus ? "啟用" : "停用"}`
        );
        allCorrect = false;
      }
    }

    if (allCorrect) {
      console.log("✅ 批量狀態驗證成功");
    }

    // 恢復原始狀態
    for (const { id, original } of originalStates) {
      await QuickCommandModel.updateQuickCommand(id, {
        is_active: original,
      });
    }
    console.log("✅ 已恢復所有原始狀態");

    return allCorrect;
  } catch (error) {
    console.log("❌ 批量狀態切換測試失敗:", error.message);
    console.error("詳細錯誤:", error);
    return false;
  }
}

/**
 * 測試邊界情況
 */
async function testEdgeCases() {
  console.log("\n🔍 測試邊界情況...");

  try {
    // 測試不存在的命令ID
    try {
      await QuickCommandModel.updateQuickCommand(99999, { is_active: true });
      console.log("❌ 應該拋出錯誤但沒有");
      return false;
    } catch (error) {
      console.log("✅ 不存在的命令ID正確拋出錯誤");
    }

    // 測試無效的更新數據
    const commands = await QuickCommandModel.getAllQuickCommands();
    if (commands.length > 0) {
      try {
        await QuickCommandModel.updateQuickCommand(commands[0].id, {});
        console.log("❌ 空更新數據應該拋出錯誤但沒有");
        return false;
      } catch (error) {
        console.log("✅ 空更新數據正確拋出錯誤");
      }
    }

    return true;
  } catch (error) {
    console.log("❌ 邊界情況測試失敗:", error.message);
    return false;
  }
}

/**
 * 主測試函數
 */
async function runTests() {
  console.log("🚀 快速命令狀態切換測試開始\n");

  // 初始化資料庫連接
  try {
    await initializeDatabase();
    console.log("✅ 資料庫連接初始化成功\n");
  } catch (error) {
    console.error("❌ 資料庫連接初始化失敗:", error.message);
    process.exit(1);
  }

  const testResults = [];

  // 測試 1: 基本狀態切換
  const test1 = await testStatusToggle();
  testResults.push({ test: "基本狀態切換", success: test1 });

  // 測試 2: 批量狀態切換
  const test2 = await testBatchStatusToggle();
  testResults.push({ test: "批量狀態切換", success: test2 });

  // 測試 3: 邊界情況
  const test3 = await testEdgeCases();
  testResults.push({ test: "邊界情況", success: test3 });

  // 關閉資料庫連接
  try {
    await closeDatabase();
    console.log("\n✅ 資料庫連接已關閉");
  } catch (error) {
    console.error("⚠️ 關閉資料庫連接失敗:", error.message);
  }

  // 測試結果總結
  console.log("\n📊 測試結果總結:");
  console.log("=".repeat(50));

  const passedTests = testResults.filter((r) => r.success).length;
  const totalTests = testResults.length;

  testResults.forEach((result) => {
    const status = result.success ? "✅ 通過" : "❌ 失敗";
    console.log(`${status} ${result.test}`);
  });

  console.log("=".repeat(50));
  console.log(`總計: ${passedTests}/${totalTests} 測試通過`);

  if (passedTests === totalTests) {
    console.log("🎉 所有狀態切換測試通過！");
    process.exit(0);
  } else {
    console.log("❌ 有測試失敗，請檢查狀態切換功能");
    process.exit(1);
  }
}

// 執行測試
runTests().catch((error) => {
  console.error("💥 測試執行失敗:", error);
  process.exit(1);
});
