// Test script to check Qwen thinking mode output
// Using built-in fetch (Node.js 18+)

async function testQwenThinking() {
  try {
    console.log("=== 測試 Qwen 思考模式 ===");

    // Test with Ollama API directly
    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "qwen3:32b",
        prompt:
          "請用思考模式回答：什麼是人工智能？請在回答前先思考這個問題的各個方面。",
        stream: false,
        options: {
          temperature: 0.7,
          // 嘗試啟用思考模式的參數
          system:
            "你是一個會思考的AI助手。在回答問題前，請用<think>標籤包圍你的思考過程，然後給出最終答案。",
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("=== Ollama 回應 ===");
    console.log("完整回應:", data.response);

    // 檢查是否包含 <think> 標籤
    const hasThinkTags = data.response.includes("<think>");
    console.log("包含 <think> 標籤:", hasThinkTags);

    if (hasThinkTags) {
      const thinkMatch = data.response.match(/<think>([\s\S]*?)<\/think>/);
      if (thinkMatch) {
        console.log("=== 思考內容 ===");
        console.log(thinkMatch[1].trim());

        const cleanedResponse = data.response
          .replace(/<think>[\s\S]*?<\/think>\s*/g, "")
          .trim();
        console.log("=== 清理後回應 ===");
        console.log(cleanedResponse);
      }
    } else {
      console.log("❌ 沒有發現思考標籤，可能需要不同的提示詞或模型配置");
    }
  } catch (error) {
    console.error("測試失敗:", error.message);
  }
}

// 運行測試
testQwenThinking();
