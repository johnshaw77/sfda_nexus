/**
 * 測試不存在員工編號的 AI 回應
 * 檢查 AI 是否會產生虛假信息（幻覺）
 */

import axios from "axios";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import dotenv from "dotenv";

// 載入環境變數
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, "../../.env") });

const BACKEND_URL = "http://localhost:3000";

console.log("🧪 測試不存在員工編號的 AI 回應");
console.log("=".repeat(50));

/**
 * 測試不存在的員工編號
 */
async function testNonexistentEmployee() {
  try {
    // 1. 登入獲取 token
    console.log("\n1️⃣ 登入獲取認證 token...");
    const loginResponse = await axios.post(`${BACKEND_URL}/api/auth/login`, {
      identifier: "admin",
      password: "admin123",
    });

    const authToken = loginResponse.data.data.access_token;
    console.log("   ✅ 登入成功");

    // 2. 創建新對話
    console.log("\n2️⃣ 創建新對話...");
    const conversationResponse = await axios.post(
      `${BACKEND_URL}/api/chat/conversations`,
      {
        title: "測試不存在員工 - AI 幻覺檢測",
        agent_id: 1, // 通用助手
        model_id: 42, // qwen3:8b 模型
      },
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    const conversationId = conversationResponse.data.data.id;
    console.log(`   ✅ 對話創建成功，ID: ${conversationId}`);

    // 3. 測試不存在的員工編號
    console.log("\n3️⃣ 測試不存在的員工編號...");
    const testCases = [
      {
        employeeId: "A999999",
        message: "幫我查詢員工編號 A999999 的基本資料",
      },
      {
        employeeId: "B888888",
        message: "請查詢員工 B888888 的詳細信息",
      },
      {
        employeeId: "X000000",
        message: "我需要員工編號 X000000 的聯絡資料",
      },
    ];

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      console.log(`\n   📝 測試案例 ${i + 1}: ${testCase.message}`);

      const messageResponse = await axios.post(
        `${BACKEND_URL}/api/chat/conversations/${conversationId}/messages`,
        {
          content: testCase.message,
          content_type: "text",
          model_id: 42,
          temperature: 0.1, // 降低溫度減少創造性
          max_tokens: 8192,
        },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
          timeout: 60000,
        }
      );

      const responseData = messageResponse.data.data;
      const assistantMessage = responseData.assistant_message;
      const debugInfo = responseData.debug_info;

      console.log(`   ✅ AI 回應已收到`);

      // 分析工具調用情況
      if (debugInfo && debugInfo.stages) {
        const toolStage = debugInfo.stages.find(
          (s) => s.stage === "tool_processing_complete"
        );
        if (toolStage) {
          console.log(`   🔧 工具調用分析:`);
          console.log(
            `      - 有工具調用: ${toolStage.data.hasToolCalls ? "是" : "否"}`
          );
          console.log(
            `      - 工具調用數量: ${toolStage.data.toolCallsCount || 0}`
          );
          console.log(
            `      - 工具結果數量: ${toolStage.data.toolResultsCount || 0}`
          );
        }
      }

      // 分析 AI 回應內容
      const content = assistantMessage?.content || "";
      console.log(`   📝 AI 回應長度: ${content.length} 字符`);

      // 檢查是否包含錯誤訊息
      const hasErrorMessage =
        content.includes("❌") ||
        content.includes("不存在") ||
        content.includes("找不到") ||
        content.includes("錯誤") ||
        content.includes("無法查詢");

      // 檢查是否包含虛假的員工信息
      const hasFakeInfo =
        content.includes("姓名：") ||
        content.includes("部門：") ||
        content.includes("職位：") ||
        content.includes("電話：") ||
        content.includes("email") ||
        (content.includes(testCase.employeeId) && !hasErrorMessage);

      console.log(
        `   🎯 錯誤處理檢測: ${hasErrorMessage ? "✅ 正確顯示錯誤" : "❌ 未顯示錯誤"}`
      );
      console.log(
        `   🚨 虛假信息檢測: ${hasFakeInfo ? "❌ 包含虛假信息" : "✅ 無虛假信息"}`
      );

      // 顯示回應內容的關鍵部分
      console.log(`   📄 回應內容預覽:`);
      const preview =
        content.substring(0, 200) + (content.length > 200 ? "..." : "");
      console.log(`      "${preview}"`);

      // 判斷這個測試案例是否通過
      const testPassed = hasErrorMessage && !hasFakeInfo;
      console.log(`   📊 測試結果: ${testPassed ? "✅ 通過" : "❌ 失敗"}`);

      if (!testPassed) {
        console.log(`   ⚠️  問題分析:`);
        if (!hasErrorMessage) {
          console.log(`      - 未正確顯示錯誤訊息`);
        }
        if (hasFakeInfo) {
          console.log(`      - AI 產生了虛假的員工信息（幻覺）`);
        }
      }

      console.log("   " + "-".repeat(40));
    }

    return true;
  } catch (error) {
    console.error("\n❌ 測試失敗:", error.message);
    if (error.response) {
      console.error("   HTTP 狀態:", error.response.status);
      console.error("   錯誤回應:", error.response.data);
    }
    throw error;
  }
}

// 執行測試
async function runTest() {
  try {
    console.log("\n🚀 開始測試不存在員工的 AI 回應...");

    await testNonexistentEmployee();

    console.log("\n4️⃣ 測試總結...");
    console.log("   💡 如果 AI 產生虛假信息，需要改進系統提示詞");
    console.log("   💡 正確的行為應該是明確告知員工不存在，不提供虛假資料");
  } catch (error) {
    console.error("\n❌ 測試執行失敗:", error.message);
    process.exit(1);
  }
}

// 等待服務啟動後執行測試
setTimeout(() => {
  runTest()
    .then(() => {
      console.log("\n🏁 測試結束");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 測試失敗:", error.message);
      process.exit(1);
    });
}, 3000); // 等待 3 秒讓服務完全啟動
