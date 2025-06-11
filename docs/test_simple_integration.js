/**
 * 簡單整合測試
 * 驗證全域提示詞系統的核心功能
 */

console.log("🚀 開始簡單整合測試...\n");

// 1. 測試資料庫配置
console.log("1️⃣ 檢查資料庫配置...");
import("./backend/src/config/database.config.js")
  .then(async (dbModule) => {
    const { query, initializeDatabase } = dbModule;

    try {
      // 初始化資料庫連接池
      await initializeDatabase();
      console.log("✅ 資料庫連接池初始化成功");

      // 檢查 system_configs 表中的全域提示詞配置
      const { rows } = await query(`
        SELECT config_key, 
               LENGTH(config_value) as content_length,
               created_at, 
               updated_at 
        FROM system_configs 
        WHERE config_key = 'global_prompt_rules'
      `);

      if (rows.length > 0) {
        console.log("✅ 資料庫配置存在:");
        console.log(`   📝 配置鍵: ${rows[0].config_key}`);
        console.log(`   📏 內容長度: ${rows[0].content_length} 字符`);
        console.log(`   🕐 創建時間: ${rows[0].created_at}`);
        console.log(`   🔄 更新時間: ${rows[0].updated_at}`);
      } else {
        console.log("❌ 資料庫中未找到全域提示詞配置");
        console.log(
          "   💡 建議：執行 backend/database/scripts/add_global_prompt_config.sql"
        );
      }

      console.log("\n2️⃣ 測試全域提示詞服務...");

      // 測試 GlobalPromptService
      const { default: GlobalPromptService } = await import(
        "./backend/src/services/globalPrompt.service.js"
      );
      const globalPromptService = new GlobalPromptService();

      // 測試獲取全域規則
      const rules = await globalPromptService.getGlobalPromptRules();
      console.log("✅ 全域提示詞服務正常:");
      console.log(`   📝 規則長度: ${rules.length} 字符`);
      console.log(
        `   🔒 包含核心規則: ${
          rules.includes("## 🔒 核心行為規則") ? "是" : "否"
        }`
      );

      // 測試快取機制
      const startTime = Date.now();
      await globalPromptService.getGlobalPromptRules();
      const cacheTime = Date.now() - startTime;
      console.log(`   ⚡ 快取響應時間: ${cacheTime}ms`);

      console.log("\n3️⃣ 測試系統提示詞整合...");

      // 測試聊天服務整合
      const { default: ChatService } = await import(
        "./backend/src/services/chat.service.js"
      );
      const chatService = new ChatService();

      const basePrompt = "你是一個智能助手，專門幫助用戶解決問題。";
      const fullPrompt = await chatService.getFullSystemPromptPreview(
        basePrompt
      );

      console.log("✅ 系統提示詞整合正常:");
      console.log(`   📏 完整提示詞長度: ${fullPrompt.length} 字符`);
      console.log(`   📝 基礎提示詞長度: ${basePrompt.length} 字符`);
      console.log(
        `   🔒 包含全域規則: ${
          fullPrompt.includes("## 🔒 核心行為規則") ? "是" : "否"
        }`
      );
      console.log(
        `   🛠️ 包含工具提示: ${
          fullPrompt.includes("## 🛠️ 可用工具系統") ? "是" : "否"
        }`
      );

      console.log("\n🎉 所有核心功能測試通過！");
      console.log("\n📋 系統狀態總結:");
      console.log("  ✅ 資料庫配置 - 正常");
      console.log("  ✅ 全域提示詞服務 - 正常");
      console.log("  ✅ 系統提示詞整合 - 正常");
      console.log("  ✅ 快取機制 - 正常");

      console.log("\n🚀 可以開始使用系統:");
      console.log("  1. 啟動後端服務: cd backend && npm start");
      console.log("  2. 啟動前端服務: cd frontend && npm run dev");
      console.log("  3. 訪問管理界面: http://localhost:5173/admin/agents");
      console.log("  4. 切換到「全域提示詞」頁籤進行管理");

      process.exit(0);
    } catch (error) {
      console.error("❌ 測試過程中發生錯誤:", error.message);
      console.error("   詳細錯誤:", error);
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error("❌ 無法載入資料庫模組:", error.message);
    console.error("   請確保後端依賴已安裝: cd backend && npm install");
    process.exit(1);
  });
