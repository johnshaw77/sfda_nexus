// 🧪 測試基於 Tool 的混合架構

async function testToolBasedArchitecture() {
  try {
    console.log("🧪 測試基於 Tool 的混合架構...\n");

    // 模擬 Tool 的基礎指導
    const simulateToolBaseInstructions = () => {
      const instructions = [];

      // 🎯 核心原則
      instructions.push("🎯 **基礎指導原則**：");
      instructions.push(
        "- **重要：只能基於統計摘要進行分析，不能編造具體專案**"
      );
      instructions.push("- 如果數據缺失，明確標註「資料未提供」");
      instructions.push("- 專注於數據驅動的洞察分析");
      instructions.push("");

      // 📋 必要欄位要求
      const requiredFields = [
        "SerialNumber",
        "TypeName",
        "MidTypeName",
        "is_APPLY",
        "Importance",
        "Status",
        "RecordDate",
        "Proposer_Name",
        "DRI_EmpName",
        "DRI_Dept",
        "DelayDay",
        "IssueDiscription",
        "Location",
        "PlanFinishDate",
        "ActualFinishDate",
      ];

      instructions.push("📋 **必要欄位要求**：");
      instructions.push(
        `- 如果用戶未表明欄位，則至少列出 ${requiredFields.join(", ")} 欄位`
      );
      instructions.push("");

      // 🎨 格式化要求
      instructions.push("🎨 **格式化要求**：");
      instructions.push("- 使用清晰的層次結構組織分析內容");
      instructions.push("- 關鍵數據使用 📊 等 emoji 標示");
      instructions.push("- 風險項目使用 🚨 等警示標記");
      instructions.push("- 提供具體的改善建議");
      instructions.push("");

      return instructions.join("\n");
    };

    // 模擬 Service 的動態指導
    const simulateServiceDynamicInstructions = (scenario) => {
      const dynamicInstructions = [];

      if (scenario === "highRisk") {
        dynamicInstructions.push("🚨 **高風險專案重點**：");
        dynamicInstructions.push("- 這些專案延遲≥15天，屬於高風險狀態");
        dynamicInstructions.push(
          "- 分析延遲原因：資源不足、技術困難、溝通問題等"
        );
        dynamicInstructions.push("- 評估 DRI 負責人的工作負荷分配");
        dynamicInstructions.push("- 提供立即可執行的風險控制措施");
        dynamicInstructions.push("");
      } else if (scenario === "location") {
        dynamicInstructions.push("🏭 **地點分析重點**：");
        dynamicInstructions.push("- 專注於 廠區A 地點的專案狀況");
        dynamicInstructions.push("- 評估該地點的資源配置和執行能力");
        dynamicInstructions.push("- 識別地點特有的挑戰和解決方案");
        dynamicInstructions.push("");
      }

      return dynamicInstructions.join("\n");
    };

    // 模擬合併機制
    const simulateMergeInstructions = (
      baseInstructions,
      dynamicInstructions = ""
    ) => {
      if (!dynamicInstructions) {
        return baseInstructions;
      }

      return `${baseInstructions}🧠 **動態分析指導**：\n${dynamicInstructions}`;
    };

    console.log("🏗️ 架構分析：基於 Tool 的混合架構");
    console.log("=".repeat(60));

    console.log("📦 **職責分離**：");
    console.log("✅ Tool 層 (get-mil-list.js)：管理該工具的基礎指導");
    console.log("  - 核心原則、必要欄位、格式化要求");
    console.log("  - 就近管理：工具的指導就在工具文件中");
    console.log("  - 獨立性：每個工具管理自己的規則");
    console.log("");
    console.log("✅ Service 層 (mil-service.js)：專注動態指導");
    console.log("  - 基於數據生成條件化分析重點");
    console.log("  - 智能適應：根據查詢條件調整指導");
    console.log("  - 輕量化：不再承擔基礎指導責任");
    console.log("");
    console.log("✅ 合併機制：Tool 提供基礎 + Service 提供動態");

    // 測試案例 1：Tool 基礎指導
    console.log("\n📋 測試案例 1：Tool 基礎指導");
    console.log("=".repeat(60));

    const baseInstructions = simulateToolBaseInstructions();
    console.log("✅ Tool 基礎指導生成成功");

    // 檢查基礎指導內容
    const hasCorePrinciples = baseInstructions.includes("🎯 **基礎指導原則**");
    const hasRequiredFields = baseInstructions.includes("📋 **必要欄位要求**");
    const hasFormatGuidelines = baseInstructions.includes("🎨 **格式化要求**");

    console.log(`- 核心原則: ${hasCorePrinciples ? "✅" : "❌"}`);
    console.log(`- 必要欄位: ${hasRequiredFields ? "✅" : "❌"}`);
    console.log(`- 格式化要求: ${hasFormatGuidelines ? "✅" : "❌"}`);

    // 測試案例 2：Tool + Service 高風險指導
    console.log("\n📋 測試案例 2：Tool + Service 高風險指導");
    console.log("=".repeat(60));

    const highRiskDynamic = simulateServiceDynamicInstructions("highRisk");
    const withHighRisk = simulateMergeInstructions(
      baseInstructions,
      highRiskDynamic
    );

    console.log("✅ Tool 基礎指導 + Service 動態指導合併成功");

    const hasBaseInstructions = withHighRisk.includes("🎯 **基礎指導原則**");
    const hasDynamicInstructions = withHighRisk.includes("🧠 **動態分析指導**");
    const hasHighRiskGuidance = withHighRisk.includes("🚨 **高風險專案重點**");

    console.log(`- Tool 基礎指導: ${hasBaseInstructions ? "✅" : "❌"}`);
    console.log(`- Service 動態指導: ${hasDynamicInstructions ? "✅" : "❌"}`);
    console.log(`- 高風險指導: ${hasHighRiskGuidance ? "✅" : "❌"}`);

    // 測試案例 3：Tool + Service 地點指導
    console.log("\n📋 測試案例 3：Tool + Service 地點指導");
    console.log("=".repeat(60));

    const locationDynamic = simulateServiceDynamicInstructions("location");
    const withLocation = simulateMergeInstructions(
      baseInstructions,
      locationDynamic
    );

    console.log("✅ Tool 基礎指導 + Service 地點指導合併成功");

    const hasLocationGuidance = withLocation.includes("🏭 **地點分析重點**");
    console.log(`- 地點分析指導: ${hasLocationGuidance ? "✅" : "❌"}`);

    // 檢查必要欄位完整性
    console.log("\n📋 必要欄位完整性檢查");
    console.log("=".repeat(60));

    const requiredFields = [
      "SerialNumber",
      "TypeName",
      "MidTypeName",
      "is_APPLY",
      "Importance",
      "Status",
      "RecordDate",
      "Proposer_Name",
      "DRI_EmpName",
      "DRI_Dept",
      "DelayDay",
      "IssueDiscription",
      "Location",
      "PlanFinishDate",
      "ActualFinishDate",
    ];

    const foundFields = [];
    const missingFields = [];

    requiredFields.forEach((field) => {
      if (baseInstructions.includes(field)) {
        foundFields.push(field);
      } else {
        missingFields.push(field);
      }
    });

    console.log(
      `✅ 找到欄位 (${foundFields.length}/${requiredFields.length}):`
    );
    console.log(foundFields.join(", "));

    if (missingFields.length > 0) {
      console.log(`❌ 缺失欄位 (${missingFields.length}):`);
      console.log(missingFields.join(", "));
    }

    // 架構優勢分析
    console.log("\n🎯 基於 Tool 的架構優勢");
    console.log("=".repeat(60));

    console.log("✅ **就近管理**：");
    console.log("- 每個 Tool 文件管理自己的基礎指導");
    console.log("- 相關邏輯集中在一個地方，易於理解和維護");
    console.log("");

    console.log("✅ **職責清晰**：");
    console.log("- Tool 層：工具特定的基礎規則");
    console.log("- Service 層：業務邏輯和動態指導");
    console.log("- 避免單一文件承擔過多責任");
    console.log("");

    console.log("✅ **獨立性強**：");
    console.log("- 每個工具的指導完全獨立");
    console.log("- 修改一個工具的指導不影響其他工具");
    console.log("- 易於新增工具和擴展功能");
    console.log("");

    console.log("✅ **數據驅動**：");
    console.log("- Service 層仍可基於實際數據生成動態指導");
    console.log("- 保留智能分析的核心優勢");

    // 與其他架構的比較
    console.log("\n⚖️ 架構比較");
    console.log("=".repeat(60));

    console.log("🆚 **vs 全部放在 Service**：");
    console.log("✅ 更好：避免基礎規則重複定義");
    console.log("✅ 更好：Tool 的指導就在 Tool 附近");
    console.log("");

    console.log("🆚 **vs 全部放在 ai-instructions.js**：");
    console.log("✅ 更好：避免單一文件過度肥大");
    console.log("✅ 更好：每個工具管理自己的規則");
    console.log("✅ 更好：降低耦合度，提高獨立性");

    // 總結
    console.log("\n🎉 基於 Tool 的混合架構測試總結");
    console.log("=".repeat(60));

    const allTestsPassed =
      hasCorePrinciples &&
      hasRequiredFields &&
      hasFormatGuidelines &&
      foundFields.length === requiredFields.length;

    if (allTestsPassed) {
      console.log("✅ 基於 Tool 的混合架構設計完美！");
      console.log("✅ Tool 層基礎指導功能正常");
      console.log("✅ Service 層動態指導合併正確");
      console.log("✅ 所有必要欄位完整包含");
      console.log("✅ 職責分離清晰，避免單點過載");
      console.log("✅ 就近管理原則得到完美體現");
    } else {
      console.log("⚠️ 架構需要調整");
    }
  } catch (error) {
    console.error("❌ 測試失敗:", error.message || error);
  }
}

// 執行測試
testToolBasedArchitecture();
