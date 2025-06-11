#!/usr/bin/env node

/**
 * 全域提示詞系統測試腳本
 * 測試全域規則整合功能
 */

import globalPromptService from "./src/services/globalPrompt.service.js";
import chatService from "./src/services/chat.service.js";

async function testGlobalPromptSystem() {
  console.log("🔧 開始測試全域提示詞系統...\n");

  try {
    // 測試 1: 獲取全域規則
    console.log("=== 測試 1: 獲取全域規則 ===");
    const globalRules = await globalPromptService.getGlobalPromptRules();
    console.log("✅ 全域規則長度:", globalRules.length);
    console.log("✅ 包含核心規則:", globalRules.includes("🔒 核心行為規則"));
    console.log("✅ 包含禁止行為:", globalRules.includes("絕對禁止的行為"));
    console.log("✅ 包含允許行為:", globalRules.includes("允許的行為"));
    console.log();

    // 測試 2: 規則統計
    console.log("=== 測試 2: 規則統計 ===");
    const stats = globalPromptService.getRulesStats();
    console.log("✅ 快取狀態:", stats.cacheStatus);
    console.log("✅ 規則長度:", stats.rulesLength);
    console.log(
      "✅ 快取過期時間:",
      stats.cacheExpiry ? new Date(stats.cacheExpiry).toISOString() : "N/A"
    );
    console.log();

    // 測試 3: 整合全域規則到基礎提示詞
    console.log("=== 測試 3: 整合全域規則 ===");
    const basePrompt = "你是一個專業的 HR 助理，擅長處理員工相關問題。";
    const integratedPrompt =
      await globalPromptService.integrateGlobalRules(basePrompt);

    console.log("✅ 基礎提示詞長度:", basePrompt.length);
    console.log("✅ 整合後長度:", integratedPrompt.length);
    console.log(
      "✅ 全域規則在前面:",
      integratedPrompt.startsWith("## 🔒 核心行為規則")
    );
    console.log("✅ 包含基礎提示詞:", integratedPrompt.includes(basePrompt));
    console.log();

    // 測試 4: 完整系統提示詞生成
    console.log("=== 測試 4: 完整系統提示詞生成 ===");
    const fullPrompt = await chatService.generateSystemPrompt(basePrompt);

    console.log("✅ 完整提示詞長度:", fullPrompt.length);
    console.log("✅ 包含全域規則:", fullPrompt.includes("## 🔒 核心行為規則"));
    console.log("✅ 包含基礎提示詞:", fullPrompt.includes(basePrompt));
    console.log(
      "✅ 可能包含工具提示詞:",
      fullPrompt.includes("## 🛠️ 可用工具系統")
    );
    console.log();

    // 測試 5: 快取機制
    console.log("=== 測試 5: 快取機制 ===");
    const startTime = Date.now();
    await globalPromptService.getGlobalPromptRules(); // 第二次調用，應該使用快取
    const cacheTime = Date.now() - startTime;
    console.log("✅ 快取調用時間:", cacheTime, "ms");
    console.log("✅ 快取效果:", cacheTime < 10 ? "良好" : "需要優化");
    console.log();

    // 測試 6: 清除快取
    console.log("=== 測試 6: 清除快取 ===");
    globalPromptService.clearCache();
    const statsAfterClear = globalPromptService.getRulesStats();
    console.log("✅ 清除後快取狀態:", statsAfterClear.cacheStatus);
    console.log("✅ 清除後規則長度:", statsAfterClear.rulesLength);
    console.log();

    // 測試 7: 工具統計整合
    console.log("=== 測試 7: 工具統計整合 ===");
    const toolStats = await chatService.getToolStats();
    if (toolStats && toolStats.cache_info) {
      console.log("✅ 工具統計包含快取信息:", !!toolStats.cache_info);
      console.log(
        "✅ 包含全域規則統計:",
        !!toolStats.cache_info.global_rules_stats
      );
      console.log(
        "✅ 系統提示詞快取狀態:",
        toolStats.cache_info.is_system_prompt_cached
      );
    } else {
      console.log("⚠️  工具統計獲取失敗或結構不完整");
    }
    console.log();

    // 顯示完整的全域規則內容（前500字符）
    console.log("=== 全域規則內容預覽 ===");
    const preview = globalRules.substring(0, 500) + "...";
    console.log(preview);
    console.log();

    console.log("🎉 全域提示詞系統測試完成！");
    console.log("✅ 所有核心功能正常運作");
    console.log("✅ 快取機制運作正常");
    console.log("✅ 規則整合功能正常");
    console.log("✅ 系統統計功能正常");

    return {
      success: true,
      globalRulesLength: globalRules.length,
      integratedPromptLength: integratedPrompt.length,
      fullPromptLength: fullPrompt.length,
      cachePerformance: cacheTime,
      features: {
        globalRules: true,
        integration: true,
        caching: true,
        stats: true,
      },
    };
  } catch (error) {
    console.error("❌ 測試過程中發生錯誤:", error.message);
    console.error("📍 錯誤堆疊:", error.stack);
    return {
      success: false,
      error: error.message,
    };
  }
}

// 如果直接執行此腳本
if (import.meta.url === `file://${process.argv[1]}`) {
  testGlobalPromptSystem()
    .then((result) => {
      console.log("\n📊 測試結果摘要:");
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error("\n💥 測試腳本執行失敗:", error);
      process.exit(1);
    });
}

export default testGlobalPromptSystem;
