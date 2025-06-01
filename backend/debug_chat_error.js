/**
 * 聊天錯誤調試工具
 * 用於調試和分析聊天相關的錯誤
 */

import { query, initializeDatabase } from "./src/config/database.config.js";
import MessageModel from "./src/models/Message.model.js";
import ConversationModel from "./src/models/Conversation.model.js";

async function debugChatError() {
  try {
    console.log("=== 聊天錯誤調試工具 ===\n");

    // 初始化資料庫連接
    console.log("0. 初始化資料庫連接...");
    await initializeDatabase();
    console.log("✅ 資料庫連接池初始化完成\n");

    // 檢查資料庫連接
    console.log("1. 檢查資料庫連接...");
    const { rows: connectionTest } = await query("SELECT 1 as test");
    console.log("✅ 資料庫連接正常\n");

    // 檢查對話表
    console.log("2. 檢查 conversations 表...");
    const { rows: conversations } = await query(
      "SELECT id, user_id, title, created_at FROM conversations ORDER BY id DESC LIMIT 5"
    );
    console.log("最近的對話:", conversations);
    console.log("");

    // 檢查訊息表
    console.log("3. 檢查 messages 表...");
    const { rows: messages } = await query(
      "SELECT id, conversation_id, role, content, created_at FROM messages ORDER BY id DESC LIMIT 5"
    );
    console.log("最近的訊息:", messages);
    console.log("");

    // 檢查 conversation_id = 24 的對話
    console.log("4. 檢查 conversation_id = 24...");
    const { rows: conversation24 } = await query(
      "SELECT * FROM conversations WHERE id = 24"
    );
    if (conversation24.length > 0) {
      console.log("對話 24 存在:", conversation24[0]);

      // 檢查該對話的訊息
      const { rows: messages24 } = await query(
        "SELECT * FROM messages WHERE conversation_id = 24 ORDER BY created_at DESC LIMIT 10"
      );
      console.log("對話 24 的訊息數量:", messages24.length);
      console.log("最近的訊息:", messages24);
    } else {
      console.log("❌ 對話 24 不存在");
    }
    console.log("");

    // 測試 MessageModel.create
    console.log("5. 測試 MessageModel.create (模擬)...");
    if (conversation24.length > 0) {
      console.log("準備創建測試訊息...");

      const testMessageData = {
        conversation_id: 24,
        role: "user",
        content: "測試訊息 - 調試工具",
        content_type: "text",
      };

      try {
        const testMessage = await MessageModel.create(testMessageData);
        console.log("✅ 測試訊息創建成功:", testMessage);

        // 清理測試訊息
        await query("DELETE FROM messages WHERE id = ?", [testMessage.id]);
        console.log("✅ 測試訊息已清理");
      } catch (createError) {
        console.error("❌ 測試訊息創建失敗:", createError.message);
        console.error("錯誤堆棧:", createError.stack);
      }
    }
    console.log("");

    // 檢查資料庫表結構
    console.log("6. 檢查 messages 表結構...");
    const { rows: tableStructure } = await query("DESCRIBE messages");
    console.log("messages 表結構:");
    tableStructure.forEach((column) => {
      console.log(
        `  ${column.Field}: ${column.Type} ${column.Null === "NO" ? "NOT NULL" : "NULL"} ${column.Key} ${column.Default || ""}`
      );
    });
    console.log("");

    // 檢查最近的錯誤日誌
    console.log("7. 檢查最近的系統錯誤...");
    try {
      const { rows: recentErrors } = await query(
        `SELECT * FROM audit_logs 
         WHERE action LIKE '%ERROR%' OR action LIKE '%FAIL%' 
         ORDER BY created_at DESC LIMIT 5`
      );
      if (recentErrors.length > 0) {
        console.log("最近的錯誤日誌:", recentErrors);
      } else {
        console.log("沒有找到錯誤日誌");
      }
    } catch (logError) {
      console.log("無法查詢錯誤日誌表:", logError.message);
    }

    console.log("\n=== 調試完成 ===");
  } catch (error) {
    console.error("調試過程中發生錯誤:", error.message);
    console.error("錯誤堆棧:", error.stack);
  } finally {
    process.exit(0);
  }
}

// 運行調試
debugChatError();
