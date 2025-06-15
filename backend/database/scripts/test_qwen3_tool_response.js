import axios from "axios";

const BASE_URL = "http://localhost:3000";

// 測試用的 token（需要先獲取）
let authToken = "";

// 獲取認證 token
async function getAuthToken() {
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      identifier: "admin",
      password: "admin123",
    });

    if (response.data.success) {
      authToken = response.data.data.access_token;
      console.log("✅ 成功獲取認證 token:", authToken ? "已設置" : "為空");
      console.log("Token 長度:", authToken ? authToken.length : 0);
      return true;
    } else {
      console.error("❌ 登入失敗:", response.data.message);
      return false;
    }
  } catch (error) {
    console.error("❌ 登入請求失敗:", error.message);
    return false;
  }
}

// 測試工具調用後的回應生成
async function testToolResponseGeneration() {
  console.log("\n=== 測試工具調用後的回應生成 (qwen3:8b) ===");

  try {
    // 創建新對話
    const conversationResponse = await axios.post(
      `${BASE_URL}/api/chat/conversations`,
      {
        title: "qwen3:8b 工具回應測試",
        model_id: 42, // qwen3:8b 的正確 model_id
      },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    const conversationId = conversationResponse.data.data.id;
    console.log(`✅ 創建對話 ID: ${conversationId}`);

    // 發送需要工具調用的訊息
    const testMessage = "B112233 的 email 多少？";
    console.log(`\n📤 發送訊息: "${testMessage}"`);

    const chatResponse = await axios.post(
      `${BASE_URL}/api/chat/conversations/${conversationId}/messages`,
      {
        content: testMessage,
        content_type: "text",
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
        timeout: 60000, // 60秒超時
      }
    );

    console.log("\n📥 AI 回應:");
    console.log("狀態:", chatResponse.data.success ? "成功" : "失敗");

    const assistantMessage = chatResponse.data.data.assistant_message;
    const conversation = chatResponse.data.data.conversation;

    console.log("使用的模型:", conversation.model_name);
    console.log("回應內容:", assistantMessage.content);

    // 檢查是否有工具調用
    const metadata = assistantMessage.metadata;
    console.log("\n🔧 工具調用信息:");
    console.log("- 有工具調用:", metadata.has_tool_calls);
    console.log("- 工具調用數量:", metadata.tool_calls.length);
    console.log("- 工具結果數量:", metadata.tool_results.length);

    if (metadata.tool_calls.length > 0) {
      console.log("- 工具調用詳情:");
      metadata.tool_calls.forEach((call, index) => {
        console.log(
          `  ${index + 1}. ${call.name}(${JSON.stringify(call.arguments)})`
        );
      });
    }

    if (metadata.tool_results.length > 0) {
      console.log("- 工具結果:");
      metadata.tool_results.forEach((result, index) => {
        console.log(`  ${index + 1}. ${JSON.stringify(result, null, 2)}`);
      });
    }

    // 分析回應品質
    console.log("\n📊 回應品質分析:");
    const response = assistantMessage.content;

    if (
      response.includes("email") ||
      response.includes("電子郵件") ||
      response.includes("郵箱")
    ) {
      console.log("✅ 回應包含 email 相關內容");
    } else {
      console.log("❌ 回應未包含 email 相關內容");
    }

    if (response.includes("B112233")) {
      console.log("✅ 回應包含查詢的員工編號");
    } else {
      console.log("❌ 回應未包含查詢的員工編號");
    }

    // 檢查是否是自然語言回應還是純工具結果
    if (response.includes("{") && response.includes("}")) {
      console.log("⚠️  回應包含 JSON 格式，可能是直接顯示工具結果");
    } else {
      console.log("✅ 回應是自然語言格式");
    }

    // 問題診斷
    console.log("\n🔍 問題診斷:");
    if (!metadata.has_tool_calls) {
      console.log("❌ 主要問題：AI 沒有調用工具");
      console.log("   - AI 回應說無法訪問個人信息");
      console.log("   - 這表示 AI 不知道它有查詢員工信息的工具");
      console.log("   - 可能的原因：");
      console.log("     1. 系統提示詞中沒有包含工具信息");
      console.log("     2. 模型不支持工具調用");
      console.log("     3. 工具調用解析失敗");
    }

    if (conversation.model_name !== "qwen3:8b") {
      console.log(
        `⚠️  模型不匹配：期望 qwen3:8b，實際使用 ${conversation.model_name}`
      );
    }

    return true;
  } catch (error) {
    console.error("❌ 測試失敗:", error.message);
    if (error.response) {
      console.error("錯誤詳情:", error.response.data);
    }
    return false;
  }
}

// 主函數
async function main() {
  console.log("🚀 開始測試 qwen3:8b 工具調用後回應生成...");

  // 獲取認證
  const authSuccess = await getAuthToken();
  if (!authSuccess) {
    console.error("❌ 無法獲取認證，測試終止");
    return;
  }

  // 測試工具回應生成
  await testToolResponseGeneration();

  console.log("\n✅ 測試完成");
}

// 執行測試
main().catch(console.error);
 