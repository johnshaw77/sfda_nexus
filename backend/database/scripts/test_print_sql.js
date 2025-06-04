/**
 * 測試 PRINT_SQL 環境變數控制功能
 *
 * 此腳本測試資料庫操作的日誌輸出是否根據 PRINT_SQL 變數正確控制
 * 使用方法：
 * 1. 設定 PRINT_SQL=true  - 會顯示詳細的 SQL 調試信息
 * 2. 設定 PRINT_SQL=false - 不會顯示 SQL 調試信息（即使在開發模式）
 * 3. 不設定 PRINT_SQL      - 在開發模式下會顯示（預設行為）
 */

import dotenv from "dotenv";
import {
  query,
  initializeDatabase,
  closeDatabase,
} from "../../src/config/database.config.js";

// 載入環境變數
dotenv.config();

/**
 * 測試 SQL 查詢並觀察打印輸出
 */
async function testPrintSQL() {
  try {
    console.log("🧪 開始測試 PRINT_SQL 功能");
    console.log("=====================================");
    console.log(`當前環境變數設定:`);
    console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`PRINT_SQL: ${process.env.PRINT_SQL}`);
    console.log("=====================================\n");

    // 初始化資料庫連接
    await initializeDatabase();
    console.log("✅ 資料庫連接初始化成功\n");

    console.log("🔍 執行測試查詢 1: 查詢用戶數量");
    console.log("預期: 根據 PRINT_SQL 設定決定是否顯示 SQL 詳細信息");
    console.log("---");

    const result1 = await query("SELECT COUNT(*) as user_count FROM users");
    console.log(`查詢結果: ${result1.rows[0].user_count} 個用戶\n`);

    console.log("🔍 執行測試查詢 2: 查詢 AI 模型列表");
    console.log("預期: 根據 PRINT_SQL 設定決定是否顯示 SQL 詳細信息");
    console.log("---");

    const result2 = await query(
      "SELECT name, display_name, model_type FROM ai_models WHERE is_active = ? LIMIT 3",
      [true]
    );
    console.log(`查詢結果: 找到 ${result2.rows.length} 個活躍模型`);
    result2.rows.forEach((model, index) => {
      console.log(
        `  ${index + 1}. ${model.display_name} (${model.model_type})`
      );
    });
    console.log("");

    console.log("🔍 執行測試查詢 3: 檢查新增的 Gemini 模型");
    console.log("預期: 根據 PRINT_SQL 設定決定是否顯示 SQL 詳細信息");
    console.log("---");

    const result3 = await query(
      `SELECT name, display_name, model_id 
       FROM ai_models 
       WHERE model_type = ? AND model_id LIKE ? 
       ORDER BY created_at DESC`,
      ["gemini", "%gemini%"]
    );

    console.log(`查詢結果: 找到 ${result3.rows.length} 個 Gemini 模型`);
    result3.rows.forEach((model, index) => {
      console.log(`  ${index + 1}. ${model.display_name} (${model.model_id})`);
    });

    console.log("\n=====================================");
    console.log("🎉 PRINT_SQL 功能測試完成");
    console.log("說明:");
    console.log(
      '- 如果看到 "🔍 執行 SQL 查詢:" 等調試信息，表示 SQL 打印功能已啟用'
    );
    console.log("- 如果沒有看到詳細的 SQL 信息，表示 SQL 打印功能已關閉");
    console.log("- 可以通過修改 .env 中的 PRINT_SQL 值來控制此行為");
    console.log("=====================================");
  } catch (error) {
    console.error("❌ 測試過程中發生錯誤:", error.message);
    if (error.sql) {
      console.error("SQL:", error.sql);
    }
  } finally {
    // 關閉資料庫連接
    await closeDatabase();
    console.log("\n🔒 資料庫連接已關閉");
  }
}

/**
 * 主函數
 */
async function main() {
  console.log("📋 PRINT_SQL 功能測試腳本");
  console.log("此腳本用於測試 PRINT_SQL 環境變數的控制功能\n");

  await testPrintSQL();

  console.log("\n💡 提示:");
  console.log("可以嘗試以下方式測試不同的 PRINT_SQL 設定:");
  console.log("1. PRINT_SQL=true node database/scripts/test_print_sql.js");
  console.log("2. PRINT_SQL=false node database/scripts/test_print_sql.js");
  console.log("3. 直接運行: node database/scripts/test_print_sql.js");
}

// 如果直接執行此腳本
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { testPrintSQL };
