/**
 * 測試優化提示詞功能
 *
 * 使用方法：
 * 1. 確保後端服務器在運行 (npm start)
 * 2. 在瀏覽器控制台中運行此腳本
 * 3. 或者在 Node.js 環境中運行
 */

// 測試數據
const testPrompts = [
  {
    name: "簡單提示詞",
    prompt: "寫一個函數",
    context: "JavaScript 開發",
  },
  {
    name: "複雜提示詞",
    prompt: "請幫我創建一個用戶管理系統，包括註冊、登入、權限管理等功能",
    context: "Vue.js 前端開發，使用 Ant Design Vue",
  },
  {
    name: "技術性提示詞",
    prompt: "優化這個 SQL 查詢的性能",
    context: "MySQL 數據庫優化",
  },
];

// API 基礎 URL
const API_BASE_URL = "http://localhost:3000";

// 模擬 API 調用函數
async function testOptimizePrompt(prompt, context = "") {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat/optimize-prompt`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer YOUR_TOKEN_HERE", // 需要替換為實際的 token
      },
      body: JSON.stringify({
        prompt: prompt,
        context: context,
      }),
    });

    const data = await response.json();

    if (data.success) {
      console.log("✅ 優化成功:");
      console.log("原始提示詞:", data.data.original_prompt);
      console.log("優化後提示詞:", data.data.optimized_prompt);
      console.log("改進要點:", data.data.improvements);
      console.log("信心度:", data.data.confidence + "%");
      console.log("使用模型:", data.data.model_info);
      console.log("---");
    } else {
      console.error("❌ 優化失敗:", data.message);
    }

    return data;
  } catch (error) {
    console.error("❌ 請求失敗:", error.message);
    return null;
  }
}

// 運行所有測試
async function runAllTests() {
  console.log("🚀 開始測試優化提示詞功能...\n");

  for (const test of testPrompts) {
    console.log(`📝 測試: ${test.name}`);
    console.log(`輸入: ${test.prompt}`);
    console.log(`上下文: ${test.context}`);

    await testOptimizePrompt(test.prompt, test.context);

    // 等待一秒再執行下一個測試
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log("✨ 所有測試完成！");
}

// 如果在 Node.js 環境中運行
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    testOptimizePrompt,
    runAllTests,
    testPrompts,
  };
}

// 如果在瀏覽器環境中運行
if (typeof window !== "undefined") {
  window.testOptimizePrompt = testOptimizePrompt;
  window.runAllTests = runAllTests;

  console.log("💡 測試函數已載入！");
  console.log("💡 使用 runAllTests() 運行所有測試");
  console.log(
    '💡 使用 testOptimizePrompt("你的提示詞", "上下文") 測試單個提示詞'
  );
}

// 自動運行測試（如果需要）
// runAllTests();
