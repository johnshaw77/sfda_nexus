/**
 * 測試 Summary 模式功能
 * 這個腳本會測試當工具返回 Summary 時，是否能跳過二次 AI 調用並直接使用 Summary
 */

import axios from "axios";

async function testSummaryMode() {
  console.log("🔍 開始測試 Summary 模式功能...\n");

  try {
    // 模擬用戶請求 - 這個查詢應該會觸發 MIL 工具並返回 Summary
    const userMessage = "請幫我查看延遲超過 10 天的專案統計";

    console.log("📤 發送用戶消息:", userMessage);

    // 首先創建一個新對話
    console.log("📝 創建新對話...");
    const conversationResponse = await axios.post(
      "http://localhost:3000/api/chat/conversations",
      {
        model_id: 1, // 假設使用模型 ID 1
        title: "Summary 模式測試對話",
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
          Authorization: "Bearer test-token",
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
      console.log("使用 Summary:", data.used_summary);

      // 重點檢查 Summary 模式
      if (data.used_summary === true) {
        console.log("\n✅ Summary 模式測試成功！");
        console.log("🔧 功能特點:");
        console.log("  - 跳過了二次 AI 調用");
        console.log("  - 直接使用工具生成的 Summary");
        console.log("  - 確保數據準確性");

        console.log("\n--- 最終回應內容 ---");
        console.log(data.final_response);

        // 檢查回應內容是否包含 Summary 標識
        if (
          data.final_response.includes("💡 *此結果為系統工具直接生成的摘要")
        ) {
          console.log("✅ 回應包含正確的 Summary 標識");
        } else {
          console.log("⚠️ 回應缺少 Summary 標識");
        }
      } else if (data.used_secondary_ai === true) {
        console.log("\n⚠️ 使用了二次 AI 調用，而非 Summary 模式");
        console.log("可能原因:");
        console.log("  - 工具結果中沒有 Summary 欄位");
        console.log("  - Summary 內容為空");
        console.log("  - Summary 檢測邏輯有問題");
      } else {
        console.log("\n❌ 既沒有使用 Summary 也沒有使用二次 AI");
        console.log("可能原因:");
        console.log("  - 沒有成功的工具調用");
        console.log("  - 工具調用失敗");
      }

      // 檢查調試信息
      if (data.debug_info) {
        console.log("\n=== 調試信息 ===");

        if (data.debug_info.skippedSecondaryAI) {
          const skipped = data.debug_info.skippedSecondaryAI;
          console.log("跳過二次 AI 原因:", skipped.reason);
          console.log("Summary 數量:", skipped.summaryCount);
          console.log("Summary 詳情:", skipped.summaries);
        }

        if (data.debug_info.secondaryAI) {
          console.log("⚠️ 意外使用了二次 AI 調用");
          console.log("用戶問題:", data.debug_info.secondaryAI.userQuestion);
        }
      }

      // 檢查工具調用結果
      if (data.tool_results && data.tool_results.length > 0) {
        console.log("\n=== 工具調用結果檢查 ===");
        data.tool_results.forEach((result, index) => {
          console.log(`工具 ${index + 1}:`, result.tool_name);
          console.log("成功:", result.success);

          if (result.success && result.result) {
            // 檢查是否有 Summary
            const hasSummary = checkForSummary(result.result);
            console.log("包含 Summary:", hasSummary);

            if (hasSummary) {
              const summary = extractSummary(result.result);
              console.log(
                "Summary 內容預覽:",
                summary?.substring(0, 100) + "..."
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

// 輔助函數：檢查對象中是否有 Summary
function checkForSummary(obj) {
  if (!obj || typeof obj !== "object") return false;

  // 檢查常見的 Summary 欄位名稱
  const summaryFields = ["Summary", "summary", "SUMMARY"];
  for (const field of summaryFields) {
    if (obj[field] && typeof obj[field] === "string" && obj[field].trim()) {
      return true;
    }
  }

  // 遞歸檢查
  for (const key in obj) {
    if (typeof obj[key] === "object") {
      if (checkForSummary(obj[key])) return true;
    }
  }

  return false;
}

// 輔助函數：提取 Summary 內容
function extractSummary(obj) {
  if (!obj || typeof obj !== "object") return null;

  const summaryFields = ["Summary", "summary", "SUMMARY"];
  for (const field of summaryFields) {
    if (obj[field] && typeof obj[field] === "string" && obj[field].trim()) {
      return obj[field];
    }
  }

  for (const key in obj) {
    if (typeof obj[key] === "object") {
      const found = extractSummary(obj[key]);
      if (found) return found;
    }
  }

  return null;
}

// 執行測試
testSummaryMode();
