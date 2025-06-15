import AIService from "../../src/services/ai.service.js";

async function testSecondaryAICall() {
  console.log("=== 測試二次 AI 調用 ===\n");

  try {
    // 模擬工具結果
    const toolResults = `✅ **get_employee_info** 執行成功
📋 **服務**: Hr 服務
⏱️ **執行時間**: 117ms

**基本資訊：**
- 姓名：陳志明
- 英文名：David Chen
- 性別：男
- 生日：1985-11-25
- 員工編號：B112233
- 入職日期：2018-08-20

**聯絡資訊：**
- 郵箱：david.chen@company.com
- 電話：0933-112-233
- 地址：台中市西屯區市政路386號

**部門資訊：**
- 部門：Research & Development
- 部門代碼：RD
- 主管：李協理
- 辦公地點：台中分部 2F

**職位資訊：**
- 職位：軟體工程師
- 職級：P4
- 職系：技術類
- 直屬主管：李協理`;

    const systemPrompt = `你是一個專業的 AI 助理。基於工具調用的結果，用自然、簡潔的語言回答用戶的問題。

重要規則：
1. 只基於工具返回的真實數據回答
2. 直接回答用戶的具體問題，不要重複顯示技術細節
3. 用友好、自然的語言表達
4. 如果用戶問特定信息（如 email），直接提供該信息

工具執行結果：
${toolResults}`;

    const userQuestion = "B112233 的 email 多少？";

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

    console.log("1. 系統提示詞長度:", systemPrompt.length);
    console.log("2. 用戶問題:", userQuestion);
    console.log("3. 開始調用 AI...\n");

    const response = await AIService.callModel({
      provider: "ollama",
      model: "qwen3:32b",
      endpoint_url: "http://localhost:11434",
      messages: messages,
      temperature: 0.7,
      max_tokens: 1024,
    });

    console.log("=== AI 回應結果 ===");
    console.log("回應內容:", response.content);
    console.log("回應長度:", response.content?.length || 0);
    console.log("處理時間:", response.processing_time || 0, "ms");
    console.log("Token 使用:", response.tokens_used || 0);

    // 分析回應質量
    const isNaturalResponse =
      !response.content.includes("**執行成功**") &&
      !response.content.includes("📋 **服務**") &&
      response.content.includes("david.chen@company.com");

    console.log("\n=== 回應質量分析 ===");
    console.log("是否為自然語言回應:", isNaturalResponse ? "✅ 是" : "❌ 否");
    console.log(
      "是否包含 email 信息:",
      response.content.includes("david.chen@company.com") ? "✅ 是" : "❌ 否"
    );
    console.log(
      "是否避免技術細節:",
      !response.content.includes("**執行成功**") ? "✅ 是" : "❌ 否"
    );
  } catch (error) {
    console.error("❌ 測試失敗:", error.message);
    console.error("錯誤詳情:", error);
  }
}

testSecondaryAICall();
