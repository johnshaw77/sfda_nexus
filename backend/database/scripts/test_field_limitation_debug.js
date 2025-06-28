// 🔍 診斷欄位限制和筆數問題

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 設置 Node.js 路徑以便導入 MCP server 模組
const mcpServerPath = path.join(
  __dirname,
  "../../../sfda_mcpserver/mcp-server/src"
);
process.env.NODE_PATH = mcpServerPath;

async function testFieldLimitationDebug() {
  try {
    console.log("🔍 診斷欄位限制和筆數問題...\n");

    // 1. 測試當前的 Tool 指導詞
    console.log("📋 測試 1：當前 Tool 指導詞");
    console.log("=".repeat(60));

    try {
      // 動態導入 GetMILListTool
      const toolPath = path.join(mcpServerPath, "tools/mil/get-mil-list.js");
      const { GetMILListTool } = await import(`file://${toolPath}`);

      const milTool = new GetMILListTool();
      const baseInstructions = milTool.getBaseInstructions();

      console.log("✅ 成功獲取 Tool 基礎指導詞");
      console.log("📄 當前指導詞內容：");
      console.log(baseInstructions);

      // 檢查是否包含正確的欄位限制
      const hasSerialNumber = baseInstructions.includes("SerialNumber");
      const hasProposalFactory = baseInstructions.includes("ProposalFactory");
      const hasSolution = baseInstructions.includes("Solution");
      const hasOldFields =
        baseInstructions.includes("TypeName") ||
        baseInstructions.includes("MidTypeName") ||
        baseInstructions.includes("is_APPLY");

      console.log("\n🔍 欄位限制檢查：");
      console.log(`- SerialNumber: ${hasSerialNumber ? "✅" : "❌"}`);
      console.log(`- ProposalFactory: ${hasProposalFactory ? "✅" : "❌"}`);
      console.log(`- Solution: ${hasSolution ? "✅" : "❌"}`);
      console.log(
        `- 舊欄位 (應該沒有): ${hasOldFields ? "❌ 仍存在" : "✅ 已移除"}`
      );
    } catch (error) {
      console.error("❌ Tool 測試失敗:", error.message);
    }

    // 2. 測試資料庫中的 MIL 資料筆數
    console.log("\n📊 測試 2：資料庫 MIL 資料筆數");
    console.log("=".repeat(60));

    try {
      // 模擬資料庫查詢
      console.log("⚠️ 注意：此測試需要資料庫連接，這裡顯示模擬結果");
      console.log("建議執行方式：");
      console.log(
        "1. 登入 MySQL: docker exec -i mysql-server mysql -u root -pMyPwd@1234 sfda_nexus"
      );
      console.log("2. 查詢總筆數: SELECT COUNT(*) FROM v_mil_kd;");
      console.log(
        "3. 查詢延遲>10天筆數: SELECT COUNT(*) FROM v_mil_kd WHERE DelayDay > 10;"
      );
      console.log(
        "4. 查看前5筆: SELECT SerialNumber, ProposalFactory, Solution FROM v_mil_kd LIMIT 5;"
      );
    } catch (error) {
      console.error("❌ 資料庫測試失敗:", error.message);
    }

    // 3. 測試 Service 層指導詞合併
    console.log("\n🔧 測試 3：Service 層指導詞合併");
    console.log("=".repeat(60));

    try {
      // 模擬 Service 層的指導詞合併過程
      const toolPath = path.join(mcpServerPath, "tools/mil/get-mil-list.js");
      const { GetMILListTool } = await import(`file://${toolPath}`);

      const milTool = new GetMILListTool();
      const baseInstructions = milTool.getBaseInstructions();

      // 模擬動態指導詞
      const mockDynamicInstructions = `🚨 **高風險專案重點**：
- 發現 5 個延遲超過 10 天的專案
- 需要重點關注 OQC/IPQC/LAB Issue 類型`;

      // 合併指導詞
      const finalInstructions = mockDynamicInstructions
        ? `${baseInstructions}🧠 **動態分析指導**：\n${mockDynamicInstructions}`
        : baseInstructions;

      console.log("✅ Service 層指導詞合併成功");
      console.log("📄 最終指導詞：");
      console.log(finalInstructions);
    } catch (error) {
      console.error("❌ Service 層測試失敗:", error.message);
    }

    // 4. 診斷可能的問題
    console.log("\n🩺 診斷 4：可能的問題分析");
    console.log("=".repeat(60));

    console.log("🔍 **筆數問題分析**：");
    console.log("1. 資料庫資料不足 - 檢查 v_mil_kd 視圖是否有足夠資料");
    console.log("2. 查詢條件限制 - 檢查是否有 WHERE 條件限制了結果");
    console.log("3. AI 自主決定 - AI 可能基於相關性只選擇顯示部分資料");
    console.log("4. 分頁設定 - 檢查 limit 參數是否正確傳遞");
    console.log("");

    console.log("🔍 **欄位問題分析**：");
    console.log("1. 緩存問題 - MCP server 可能需要重啟");
    console.log("2. 指導詞不夠明確 - AI 可能忽略了欄位限制");
    console.log("3. 舊指導詞殘留 - 檢查是否有其他地方定義了欄位");
    console.log("4. AI 隨機性 - AI 可能自主決定提供更多資訊");
    console.log("");

    // 5. 建議的解決方案
    console.log("💡 **建議解決方案**：");
    console.log("=".repeat(60));

    console.log("📌 **立即行動**：");
    console.log("1. 重啟 MCP server 清除可能的緩存");
    console.log("2. 加強指導詞措辭，更明確地限制欄位");
    console.log("3. 在指導詞中明確要求「僅顯示指定欄位」");
    console.log("4. 添加「不要額外添加其他欄位」的禁止性指導");
    console.log("");

    console.log("📌 **測試驗證**：");
    console.log("1. 先用 SQL 直接查詢確認資料筆數");
    console.log("2. 在指導詞中添加更強制性的欄位限制");
    console.log("3. 測試不同的查詢條件");
    console.log("4. 檢查 AI 回應是否遵循指導詞");

    // 6. 提供更強的指導詞建議
    console.log("\n📝 建議的強化指導詞：");
    console.log("=".repeat(60));

    const strongerInstructions = `🎯 **基礎指導原則**：
- **重要：只能基於統計摘要進行分析，不能編造具體專案**
- 如果數據缺失，明確標註「資料未提供」
- 專注於數據驅動的洞察分析

📋 **必要欄位要求**：
- **嚴格限制：僅列出 SerialNumber, ProposalFactory, Solution 欄位**
- **禁止：不要顯示其他任何欄位**
- **格式：使用表格形式，只包含指定的3個欄位**
- 欄位標籤使用中文說明

🎨 **格式化要求**：
- 使用清晰的層次結構組織分析內容
- 關鍵數據使用 📊 等 emoji 標示
- 風險項目使用 🚨 等警示標記
- 提供具體的改善建議
- **重要：嚴格遵守欄位限制，不要添加額外欄位**`;

    console.log(strongerInstructions);

    console.log("\n🎉 診斷完成");
    console.log("建議先執行 SQL 查詢確認資料，然後重啟 MCP server 測試");
  } catch (error) {
    console.error("❌ 診斷失敗:", error.message || error);
  }
}

// 執行診斷
testFieldLimitationDebug();
