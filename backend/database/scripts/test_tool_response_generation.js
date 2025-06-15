import axios from "axios";

const API_BASE = "http://localhost:3000/api";
const TEST_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5Ac2ZkYS1uZXh1cy5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJ0eXBlIjoiYWNjZXNzIiwiaWF0IjoxNzQ5OTEwMTUzLCJleHAiOjE3NTA1MTQ5NTMsImF1ZCI6InNmZGEtbmV4dXMtdXNlcnMiLCJpc3MiOiJzZmRhLW5leHVzIn0.5rTTtxKaFpQt5b6x4fkYF6qS4iFkmdPu2mnFTdWvXdM";

async function testToolResponseGeneration() {
  console.log("=== 測試工具調用後的回應生成 ===\n");

  try {
    // 1. 創建測試對話
    console.log("1. 創建測試對話...");
    const conversationResponse = await axios.post(
      `${API_BASE}/chat/conversations`,
      {
        title: "工具回應測試",
        model_id: 2, // qwen3:32b
      },
      {
        headers: {
          Authorization: `Bearer ${TEST_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    const conversationId = conversationResponse.data.data.id;
    console.log(`✅ 對話創建成功，ID: ${conversationId}\n`);

    // 2. 發送需要工具調用的消息
    console.log("2. 發送工具調用測試消息...");
    const testMessage = "B112233 的 email 多少？";

    console.log(`📤 發送消息: "${testMessage}"`);

    const messageResponse = await axios.post(
      `${API_BASE}/chat/conversations/${conversationId}/messages`,
      {
        content: testMessage,
        content_type: "text",
      },
      {
        headers: {
          Authorization: `Bearer ${TEST_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ 消息發送成功\n");

    // 3. 分析回應
    const responseData = messageResponse.data.data;
    const assistantMessage = responseData.assistant_message;

    console.log("=== 回應分析 ===");
    console.log("📨 AI 回應內容:");
    console.log(assistantMessage.content);
    console.log("\n📊 元數據分析:");
    console.log(
      "- 有工具調用:",
      assistantMessage.metadata?.has_tool_calls || false
    );
    console.log(
      "- 工具調用數量:",
      assistantMessage.metadata?.tool_calls?.length || 0
    );
    console.log(
      "- 工具結果數量:",
      assistantMessage.metadata?.tool_results?.length || 0
    );

    if (assistantMessage.metadata?.tool_calls?.length > 0) {
      console.log("\n🔧 工具調用詳情:");
      assistantMessage.metadata.tool_calls.forEach((call, index) => {
        console.log(`  ${index + 1}. ${call.name}`);
        console.log(`     參數: ${JSON.stringify(call.parameters)}`);
      });
    }

    if (assistantMessage.metadata?.tool_results?.length > 0) {
      console.log("\n📋 工具結果詳情:");
      assistantMessage.metadata.tool_results.forEach((result, index) => {
        console.log(`  ${index + 1}. ${result.tool_name}`);
        console.log(`     成功: ${result.success}`);
        console.log(`     執行時間: ${result.execution_time}ms`);
        if (result.success && result.data) {
          console.log(`     數據: ${JSON.stringify(result.data, null, 2)}`);
        }
        if (!result.success && result.error) {
          console.log(`     錯誤: ${result.error}`);
        }
      });
    }

    // 4. 檢查問題
    console.log("\n=== 問題診斷 ===");

    const hasToolCalls = assistantMessage.metadata?.has_tool_calls;
    const hasSuccessfulResults = assistantMessage.metadata?.tool_results?.some(
      (r) => r.success
    );
    const responseContent = assistantMessage.content;

    if (!hasToolCalls) {
      console.log("❌ 問題: 沒有檢測到工具調用");
      console.log("   可能原因: AI 沒有生成工具調用指令");
    } else if (!hasSuccessfulResults) {
      console.log("❌ 問題: 工具調用失敗");
      console.log("   可能原因: MCP 服務連接問題或參數錯誤");
    } else if (
      responseContent.includes("Contact") ||
      responseContent.includes("david.chen")
    ) {
      console.log("✅ 工具調用成功，但回應格式需要改進");
      console.log("   建議: 二次 AI 調用應該生成更自然的回應");
    } else if (responseContent.length < 50) {
      console.log("❌ 問題: 回應內容太短，可能是二次 AI 調用失敗");
      console.log("   可能原因: AI 模型調用參數錯誤或模型無法訪問");
    } else {
      console.log("✅ 回應看起來正常");
    }

    // 5. 測試建議
    console.log("\n=== 優化建議 ===");
    if (hasToolCalls && hasSuccessfulResults) {
      console.log("🔧 建議改進二次 AI 調用的提示詞:");
      console.log("   - 更明確地要求 AI 用自然語言回答用戶問題");
      console.log("   - 提供更好的上下文信息");
      console.log("   - 確保 AI 模型參數正確");
    }

    // 清理測試對話
    console.log("\n6. 清理測試數據...");
    await axios.delete(`${API_BASE}/chat/conversations/${conversationId}`, {
      headers: {
        Authorization: `Bearer ${TEST_TOKEN}`,
      },
    });
    console.log("✅ 測試對話已刪除");
  } catch (error) {
    console.error("❌ 測試失敗:", error.message);
    if (error.response) {
      console.error("錯誤詳情:", error.response.data);
    }
  }
}

// 運行測試
testToolResponseGeneration();
