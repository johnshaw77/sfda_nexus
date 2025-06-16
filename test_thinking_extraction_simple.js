// 測試思考內容提取邏輯
const testData = [
  {
    message: {
      role: "assistant",
      content: "",
      thinking: "這是思考內容",
    },
  },
  {
    message: {
      role: "assistant",
      content: "這是回應內容",
      thinking: "更多思考",
    },
  },
];

console.log("=== 測試思考內容提取 ===");

let thinkingContent = "";
let fullContent = "";

testData.forEach((data, index) => {
  console.log(`\n處理數據塊 ${index + 1}:`);
  console.log("原始數據:", JSON.stringify(data, null, 2));

  // 模擬我們的邏輯
  const isThinkingModel = true;

  if (isThinkingModel && data.message && data.message.thinking) {
    thinkingContent += data.message.thinking;
    console.log("🧠 提取思考內容:", data.message.thinking);
  }

  if (data.message && data.message.content) {
    fullContent += data.message.content;
    console.log("📝 提取回應內容:", data.message.content);
  }

  console.log("累積思考內容:", thinkingContent);
  console.log("累積回應內容:", fullContent);
});

console.log("\n=== 最終結果 ===");
console.log("總思考內容:", thinkingContent);
console.log("總回應內容:", fullContent);
