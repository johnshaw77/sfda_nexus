# 基於 Tool 的混合架構實施總結

2025-06-27 10:00

## 🎯 實施背景

用戶提出 AI 指導應該寫在具體的 tool 文件（如 `get-mil-list.js`）中，而不是集中在一個配置文件裡，避免單一文件承擔過多責任。經過重新設計，我們實施了**基於 Tool 的混合架構**。

## 🏗️ 正確的架構設計

### 📍 **Tool 層**（例如 `get-mil-list.js`）

**位置**: `sfda_mcpserver/mcp-server/src/tools/mil/get-mil-list.js`

**職責**:

- 🎯 管理該工具的基礎指導（核心原則、必要欄位、格式化要求）
- 📋 就近管理：工具的指導就在工具文件中
- 🔧 獨立性：每個工具管理自己的規則

**實施方式**:

```javascript
export class GetMILListTool extends BaseTool {
  getBaseInstructions() {
    const instructions = [];

    // 🎯 核心原則
    instructions.push("🎯 **基礎指導原則**：");
    instructions.push("- **重要：只能基於統計摘要進行分析，不能編造具體專案**");
    // ... 其他基礎指導

    return instructions.join("\n");
  }
}
```

### 📍 **Service 層**（例如 `mil-service.js`）

**位置**: `sfda_mcpserver/mcp-server/src/services/mil/mil-service.js`

**職責**:

- 🧠 專注於動態指導生成
- 📊 基於數據生成條件化分析重點
- ⚡ 輕量化：不再承擔基礎指導責任

**實施方式**:

```javascript
// 從 Tool 獲取基礎指導
const milTool = new GetMILListTool();
const baseInstructions = milTool.getBaseInstructions();

// 生成動態指導
const dynamicInstructions = generateDynamicInstructions(stats, filters, data);

// 合併指導
const aiInstructions = dynamicInstructions
  ? `${baseInstructions}🧠 **動態分析指導**：\n${dynamicInstructions}`
  : baseInstructions;
```

## 📊 架構優勢實現

### ✅ **就近管理**

- 每個 Tool 文件管理自己的基礎指導
- 相關邏輯集中在一個地方，易於理解和維護
- 開發者可以在工具文件中直接看到和修改指導規則

### ✅ **職責清晰**

- **Tool 層**: 工具特定的基礎規則
- **Service 層**: 業務邏輯和動態指導
- **避免單點過載**: 不會讓單一文件承擔過多責任

### ✅ **獨立性強**

- 每個工具的指導完全獨立
- 修改一個工具的指導不影響其他工具
- 易於新增工具和擴展功能

### ✅ **數據驅動**

- Service 層仍可基於實際數據生成動態指導
- 保留智能分析的核心優勢

## 🧪 測試結果 (100% 通過)

```
🎉 基於 Tool 的混合架構測試總結
============================================================
✅ 基於 Tool 的混合架構設計完美！
✅ Tool 層基礎指導功能正常
✅ Service 層動態指導合併正確
✅ 所有必要欄位完整包含 (15/15)
✅ 職責分離清晰，避免單點過載
✅ 就近管理原則得到完美體現
```

## ⚖️ 架構比較

### 🆚 **vs 全部放在 Service**

- ✅ 更好：避免基礎規則重複定義
- ✅ 更好：Tool 的指導就在 Tool 附近

### 🆚 **vs 全部放在 ai-instructions.js**

- ✅ 更好：避免單一文件過度肥大
- ✅ 更好：每個工具管理自己的規則
- ✅ 更好：降低耦合度，提高獨立性

## 🛠️ 新增工具指南

### 1. 在 Tool 文件中添加基礎指導方法

```javascript
export class NewToolName extends BaseTool {
  getBaseInstructions() {
    const instructions = [];

    // 根據工具特性定義核心原則
    instructions.push("🎯 **基礎指導原則**：");
    instructions.push("- 工具特定的核心原則1");
    instructions.push("- 工具特定的核心原則2");
    instructions.push("");

    // 定義必要欄位
    const requiredFields = ["field1", "field2", "field3"];
    instructions.push("📋 **必要欄位要求**：");
    instructions.push(
      `- 如果用戶未表明欄位，則至少列出 ${requiredFields.join(", ")} 欄位`
    );
    instructions.push("");

    // 格式化要求
    instructions.push("🎨 **格式化要求**：");
    instructions.push("- 工具特定的格式化要求");
    instructions.push("");

    return instructions.join("\n");
  }
}
```

### 2. 在 Service 中使用混合架構

```javascript
// 導入對應的 Tool
import { NewToolName } from "../../tools/path/new-tool.js";

// 在服務方法中
const tool = new NewToolName();
const baseInstructions = tool.getBaseInstructions();

const dynamicInstructions = generateDynamicInstructions(/* 業務邏輯 */);

const aiInstructions = dynamicInstructions
  ? `${baseInstructions}🧠 **動態分析指導**：\n${dynamicInstructions}`
  : baseInstructions;
```

## 🔮 擴展方向

### 短期優化

1. **標準化 getBaseInstructions 方法**: 在 BaseTool 中定義接口
2. **工具指導驗證**: 自動檢查指導格式的完整性
3. **指導版本管理**: 為每個工具的指導添加版本標識

### 長期發展

1. **智能指導推薦**: 基於工具使用情況推薦最佳指導
2. **A/B 測試支援**: 在工具層支援不同指導版本的測試
3. **指導效果追蹤**: 統計不同指導對 AI 回應質量的影響

## 📋 相關文件

- **Tool 實施範例**: `sfda_mcpserver/mcp-server/src/tools/mil/get-mil-list.js`
- **Service 整合範例**: `sfda_mcpserver/mcp-server/src/services/mil/mil-service.js`
- **測試腳本**: `backend/database/scripts/test_tool_based_architecture.js`

## 🎉 總結

基於 Tool 的混合架構成功實現了：

✅ **就近管理**: Tool 的指導就在 Tool 文件中  
✅ **職責清晰**: 避免單一文件承擔過多責任  
✅ **獨立性強**: 每個工具管理自己的規則  
✅ **易於維護**: 相關邏輯集中，降低耦合度  
✅ **數據驅動**: 保留 Service 層的智能分析能力

這個架構完美符合用戶的期望，實現了基礎指導的分散管理，同時保持了動態指導的靈活性。每個工具都是自己指導的主人，避免了任何單點過載的問題。
