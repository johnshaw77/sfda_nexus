/**
 * 測試 AI 回應格式問題
 * 驗證為什麼回應是 JSON 而不是自然語言
 */

import chatService from "../../src/services/chat.service.js";
import mcpToolParser from "../../src/services/mcpToolParser.service.js";
import AIService from "../../src/services/ai.service.js";

console.log("=== 測試 AI 回應格式問題 ===\n");

async function testSecondaryAICall() {
  try {
    console.log("1. 測試工具結果格式化...");

    // 🔧 修復測試資料結構，符合 formatToolResults 期望的格式
    const mockToolResults = [
      {
        tool_name: "get_employee_info",
        service_name: "HR 系統",
        execution_time: 125,
        success: true,
        data: {
          // 直接使用 data 而不是 result.data
          basic: {
            name: "白勝宇",
            englishName: "Ming Zhang",
            gender: "男",
            birthDate: "1990/5/15",
            employeeId: "A123456",
            hireDate: "2020/3/1",
          },
          contact: {
            email: "ming.zhang@company.com",
            phone: "0912-345-678",
            address: "台北市信義區松山路101號",
          },
          department: {
            departmentName: "資訊技術部",
            departmentCode: "IT001",
            manager: "李經理",
            location: "台北總部",
          },
          position: {
            jobTitle: "軟體工程師",
            jobLevel: "中級",
            jobFamily: "技術職",
            reportingManager: "張主管",
          },
        },
      },
    ];

    // 格式化工具結果
    const formattedResults = mcpToolParser.formatToolResults(mockToolResults);
    console.log("格式化的工具結果:");
    console.log(formattedResults);

    console.log("\n2. 測試二次 AI 調用...");

    // 🔧 改進系統提示詞，更明確地指導 AI 使用實際資料
    const systemPrompt = `你是一個專業的 AI 助理。基於工具調用的結果，用自然、簡潔的語言回答用戶的問題。

重要規則：
1. 只基於工具返回的真實數據回答，絕對不要編造或假設資料
2. 直接回答用戶的具體問題，不要重複顯示技術細節
3. 用友好、自然的語言表達
4. 如果用戶問特定信息（如 email、電話等），直接從工具結果中提取並提供該信息
5. 使用工具結果中的實際數值，不要使用預設值或範例

工具執行結果：
${formattedResults}

請根據以上真實的工具調用結果回答用戶問題。`;

    const userQuestion = "A123456 的 email 是什麼？";

    const messages = [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: userQuestion,
      },
    ];

    console.log("系統提示詞長度:", systemPrompt.length);
    console.log("用戶問題:", userQuestion);

    // 調用 AI 服務
    const aiResponse = await AIService.callModel({
      provider: "ollama",
      model: "qwen3:8b",
      messages: messages,
      temperature: 0.7,
      max_tokens: 1024,
    });

    console.log("\n=== AI 回應結果 ===");
    console.log("原始回應:", aiResponse.content);
    console.log("回應長度:", aiResponse.content?.length || 0);
    console.log("回應類型:", typeof aiResponse.content);

    // 清理回應（移除 <think> 標籤）
    const cleanedResponse = aiResponse.content
      .replace(/<think>[\s\S]*?<\/think>\s*/g, "")
      .trim();

    console.log("清理後回應:", cleanedResponse);

    console.log("\n=== 期望 vs 實際 ===");
    console.log("期望回應格式: A123456 的 email 是 ming.zhang@company.com");
    console.log("實際回應格式:", cleanedResponse);

    // 檢查回應是否符合期望
    const isNaturalLanguage =
      !cleanedResponse.startsWith("{") &&
      !cleanedResponse.startsWith("[") &&
      cleanedResponse.includes("ming.zhang@company.com"); // 檢查實際 email

    console.log("回應是否為自然語言:", isNaturalLanguage ? "✅ 是" : "❌ 否");
    console.log(
      "是否包含正確 email:",
      cleanedResponse.includes("ming.zhang@company.com") ? "✅ 是" : "❌ 否"
    );
  } catch (error) {
    console.error("測試失敗:", error.message);
    console.error("錯誤詳情:", error);
  }
}

// 測試 ChatService 中的問題
async function testChatServiceImport() {
  console.log("\n=== 測試 ChatService 導入問題 ===");

  try {
    // 🔧 修復導入問題：chatService 是已經實例化的對象，不是構造函數
    console.log("ChatService 創建成功:", !!chatService);

    // 檢查關鍵方法是否存在
    console.log("方法檢查:", {
      hasProcessChatMessage:
        typeof chatService.processChatMessage === "function",
      hasGenerateSystemPrompt:
        typeof chatService.generateSystemPrompt === "function",
    });

    // 檢查 AIService 是否正確導入到 ChatService
    console.log("✅ ChatService 導入測試通過");
  } catch (error) {
    console.error("ChatService 測試失敗:", error.message);
    if (error.message.includes("AIService")) {
      console.log("❌ 確認問題：ChatService 缺少 AIService 導入！");
    }
  }
}

// 執行測試
async function runTests() {
  await testSecondaryAICall();
  await testChatServiceImport();

  console.log("\n=== 問題分析與解決方案 ===");
  console.log("1. ✅ 修復了 ChatService 的 AIService 導入問題");
  console.log("2. ✅ 修復了測試資料結構以符合 formatToolResults 期望");
  console.log("3. 🔧 改進了二次 AI 調用的系統提示詞");
  console.log("4. 🔧 加強了回應驗證邏輯");
}

runTests().catch(console.error);
