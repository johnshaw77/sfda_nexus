/**
 * 測試二次 AI 調用調試信息功能
 * 這個腳本會發送一個 MIL 查詢請求，並檢查是否能正確獲取和顯示調試信息
 */

import axios from "axios";

async function testDebugInfo() {
  console.log("🔍 開始測試二次 AI 調用調試信息功能...\n");

  try {
    // 模擬用戶請求
    const userMessage = "請幫我查看延遲超過 10 天的專案";

    console.log("📤 發送用戶消息:", userMessage);

    // 首先創建一個新對話
    console.log("📝 創建新對話...");
    const conversationResponse = await axios.post(
      "http://localhost:3000/api/chat/conversations",
      {
        model_id: 1, // 假設使用模型 ID 1
        title: "調試測試對話",
      },
      {
        headers: {
          Authorization: "Bearer test-token", // 需要認證 token
        },
      }
    );

    if (!conversationResponse.data.success) {
      throw new Error("創建對話失敗: " + conversationResponse.data.message);
    }

    const conversationId = conversationResponse.data.data.id;
    console.log("✅ 對話創建成功，ID:", conversationId);

    // 發送消息到聊天 API
    console.log("📤 發送消息到對話...");
    const response = await axios.post(
      `http://localhost:3000/api/chat/conversations/${conversationId}/messages`,
      {
        content: userMessage,
        temperature: 0.7,
        max_tokens: 4096,
      },
      {
        headers: {
          Authorization: "Bearer test-token", // 需要認證 token
        },
      }
    );

    console.log("📥 收到回應狀態:", response.status);

    if (response.data && response.data.success) {
      const data = response.data.data;

      console.log("\n=== 回應結構分析 ===");
      console.log("對話 ID:", data.conversation_id);
      console.log("消息 ID:", data.message_id);
      console.log("有工具調用:", data.has_tool_calls);
      console.log("使用二次 AI:", data.used_secondary_ai);

      // 檢查是否有調試信息
      if (data.debug_info) {
        console.log("\n✅ 找到調試信息!");
        console.log("調試信息結構:", Object.keys(data.debug_info));

        if (data.debug_info.secondaryAI) {
          const secondaryAI = data.debug_info.secondaryAI;

          console.log("\n=== 二次 AI 調用調試信息 ===");
          console.log("調用時間:", secondaryAI.timestamp);
          console.log("用戶問題:", secondaryAI.userQuestion);
          console.log(
            "System Prompt 長度:",
            secondaryAI.systemPrompt?.length || 0
          );
          console.log("User Prompt 長度:", secondaryAI.userPrompt?.length || 0);
          console.log(
            "格式化結果長度:",
            secondaryAI.formattedResults?.length || 0
          );

          console.log("\n--- System Prompt 預覽 ---");
          console.log(secondaryAI.systemPrompt?.substring(0, 200) + "...");

          console.log("\n--- User Prompt 預覽 ---");
          console.log(secondaryAI.userPrompt?.substring(0, 200) + "...");

          console.log("\n--- 格式化結果預覽 ---");
          console.log(secondaryAI.formattedResults?.substring(0, 300) + "...");

          if (secondaryAI.actualResponse) {
            console.log("\n--- AI 實際回應預覽 ---");
            console.log(
              "原始回應長度:",
              secondaryAI.actualResponse.original?.length || 0
            );
            console.log(
              "清理後回應長度:",
              secondaryAI.actualResponse.cleaned?.length || 0
            );
            console.log(
              "最終回應長度:",
              secondaryAI.actualResponse.final?.length || 0
            );
            console.log(
              "最終回應預覽:",
              secondaryAI.actualResponse.final?.substring(0, 200) + "..."
            );
          }

          console.log("\n--- 模型配置 ---");
          console.log(JSON.stringify(secondaryAI.modelConfig, null, 2));
        }

        console.log("\n✅ 調試信息測試成功！");
      } else {
        console.log("\n❌ 未找到調試信息");
        console.log("回應數據結構:", Object.keys(data));
      }

      // 檢查工具調用結果
      if (data.tool_results && data.tool_results.length > 0) {
        console.log("\n=== 工具調用結果 ===");
        data.tool_results.forEach((result, index) => {
          console.log(`工具 ${index + 1}:`, result.tool_name);
          console.log("成功:", result.success);
          if (result.success && result.result) {
            // 檢查工具結果中是否有調試信息
            if (result.result.debug_info) {
              console.log("✅ 工具結果中包含調試信息");
            }
            if (result.result.aiInstructions) {
              console.log("✅ 工具結果中包含 AI 指導提示詞");
              console.log(
                "AI 指導內容預覽:",
                result.result.aiInstructions.substring(0, 100) + "..."
              );
            }
          }
        });
      }
    } else {
      console.log("❌ API 調用失敗");
      console.log("錯誤:", response.data);
    }
  } catch (error) {
    console.error("❌ 測試失敗:", error.message);
    if (error.response) {
      console.error("錯誤狀態:", error.response.status);
      console.error("錯誤數據:", error.response.data);
    }
  }
}

// 執行測試
testDebugInfo();
