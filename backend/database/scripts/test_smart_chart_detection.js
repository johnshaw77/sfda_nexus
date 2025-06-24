import smartChartDetectionService from "../../src/services/smartChartDetection.service.js";

async function testSmartChartDetection() {
  console.log("🎯 開始測試智能圖表檢測服務...\n");

  const userInput = "台部:50%、港澳:30%、台積電:20%，請幫我繪製圓餅圖";
  const aiResponse = `目前我無法直接繪製圓餅圖，但可以提供以下解決方案：

1. **使用 Excel/Google Sheets**:
   - 輸入數據：台部50%、港澳30%、台積電20%
   - 選擇「插入」→「圓餅圖」即可自動生成

2. **Python (Matplotlib)**:
   \`\`\`python
   import matplotlib.pyplot as plt

   labels = ['台部', '港澳', '台積電']
   sizes = [50, 30, 20]
   plt.pie(sizes, labels=labels, autopct='%1.1f%%')
   plt.axis('equal')
   plt.show()
   \`\`\`

3. **Power BI/Tableau**:
   - 將數據導入後，選擇「圓餅圖」視覺呈現即可

需要我協助進行其他視覺化方式嗎？`;

  try {
    console.log("📝 測試數據:");
    console.log("用戶輸入:", userInput);
    console.log("AI回應長度:", aiResponse.length, "字符");
    console.log("");

    // 執行檢測
    const result = await smartChartDetectionService.detectChartIntent(
      userInput,
      aiResponse
    );

    console.log("✅ 檢測結果:");
    console.log("hasChartData:", result.hasChartData);
    console.log("confidence:", result.confidence);
    console.log("chartType:", result.chartType);
    console.log("data:", JSON.stringify(result.data, null, 2));
    console.log("title:", result.title);
    console.log("reasoning:", result.reasoning);

    // 驗證結果
    if (result.hasChartData && result.data && result.data.length > 0) {
      console.log("\n🎉 測試成功！檢測到有效的圖表數據");
      console.log("數據項目數:", result.data.length);
      result.data.forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.label}: ${item.value}%`);
      });
    } else {
      console.log("\n❌ 測試失敗！未檢測到有效的圖表數據");
      console.log("失敗原因:", result.reasoning);
    }
  } catch (error) {
    console.error("❌ 測試過程中發生錯誤:", error.message);
    console.error("錯誤堆棧:", error.stack);
  }
}

// 執行測試
testSmartChartDetection()
  .then(() => {
    console.log("\n🏁 測試完成");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 測試失敗:", error);
    process.exit(1);
  });
