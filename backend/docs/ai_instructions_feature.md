# AI 指導提示詞功能說明

## 功能概述

AI 指導提示詞功能允許 MCP 工具在返回數據時，同時提供給 AI 的分析指導，確保 AI 能夠：
- 專注於特定的分析重點
- 避免添加無關內容
- 根據查詢條件動態調整分析角度
- 提供更準確、更相關的回應

## 實現架構

### 1. 後端 MCP 服務層 (`mil-service.js`)
- **生成 AI 指導提示詞**：`generateAIInstructions()` 函數
- **動態內容調整**：根據篩選條件（延遲天數、地點、專案類型等）生成不同的指導重點
- **數據結構增強**：在返回結果中新增 `aiInstructions` 欄位

### 2. 工具解析層 (`mcpToolParser.service.js`)
- **格式化處理**：`formatMILListResult()` 方法檢測並格式化 AI 指導提示詞
- **前端顯示格式**：將指導提示詞包裝為「🧠 AI 分析指導」段落
- **統一標準**：可擴展到其他 MCP 工具

### 3. 二次 AI 調用層 (`chat.service.js`)
- **系統提示詞強化**：在二次 AI 調用時加入對 AI 指導提示詞的遵循規則
- **最高優先級**：AI 指導提示詞擁有最高優先級，必須嚴格遵循
- **質量控制**：防止 AI 添加無關內容或超出分析範圍

### 4. 前端顯示層 (`ToolCallDisplay.vue`)
- **深度搜索**：增強的 `getAIInstructions()` 方法，支援多種數據結構
- **視覺化顯示**：藍色邊框的專用區塊顯示 AI 指導內容
- **調試支援**：詳細的 console 日誌協助問題診斷

## 使用場景

### 高風險專案分析
```javascript
// 查詢條件
{
  filters: {
    delayDayMin: 10,
    location: 'C#3FOQC'
  }
}

// 生成的 AI 指導
🚨 **高風險專案重點**：
- 這些專案延遲≥10天，屬於高風險狀態
- 分析延遲原因：資源不足、技術困難、溝通問題等
- 評估 DRI 負責人的工作負荷分配
- 提供立即可執行的風險控制措施
```

### 地點特定分析
```javascript
// 查詢條件
{
  filters: {
    location: 'C#3FOQC',
    typeName: 'OQC'
  }
}

// 生成的 AI 指導
🏭 **地點分析重點**：
- 專注於 C#3FOQC 地點的專案狀況
- 評估該地點的資源配置和執行能力
- 識別地點特有的挑戰和解決方案
```

## 技術實現細節

### 動態指導生成邏輯

```javascript
const generateAIInstructions = (stats, filters, data) => {
  const instructions = [];

  // 基礎指導（總是包含）
  instructions.push("**重要：請嚴格按照以下要求進行分析**");
  instructions.push("📋 **分析範圍限制**：");
  instructions.push("- 只分析查詢返回的專案數據，不要添加其他無關內容");

  // 條件性指導
  if (filters.delayDayMin >= 10) {
    instructions.push("🚨 **高風險專案重點**：");
    // ... 高風險專案特定指導
  }

  if (filters.location) {
    instructions.push("🏭 **地點分析重點**：");
    // ... 地點特定指導
  }

  // 結論性指導
  instructions.push("🎯 **回應要求**：");
  instructions.push("- 提供具體、可執行的改善建議");

  return instructions.join("\n");
};
```

### 前端深度搜索

```javascript
const getAIInstructions = () => {
  // 優先檢查常見路徑
  const commonPaths = [
    () => toolCall.result?.aiInstructions,
    () => toolCall.data?.aiInstructions,
    () => toolCall.result?.data?.aiInstructions,
    // ... 更多路徑
  ];

  for (const pathFunc of commonPaths) {
    const instructions = pathFunc();
    if (instructions) return instructions;
  }

  // 深度搜索備用方案
  return deepSearch(toolCall, "aiInstructions");
};
```

## 效果驗證

### AI 回應質量改善
- ✅ **專注度提升**：AI 只分析查詢範圍內的專案，不添加無關內容
- ✅ **分析深度**：根據查詢條件提供針對性的風險分析和建議
- ✅ **實用性增強**：提供具體、可執行的改善措施
- ✅ **一致性保證**：每次查詢都遵循相同的分析標準

### 測試結果
```bash
🏁 總體結果: ✅ AI 指導提示詞功能完全正常

📝 功能包括：
   - ✅ 動態生成 AI 指導提示詞
   - ✅ 根據查詢條件調整指導重點  
   - ✅ 格式化為前端顯示格式
   - ✅ 前端深度搜索正確解析
   - ✅ 與二次 AI 調用整合
```

## 擴展性

### 新增其他工具支援
1. 在對應的服務文件中實現 `generateAIInstructions()` 邏輯
2. 在 `mcpToolParser.service.js` 中添加格式化支援
3. 前端 `getAIInstructions()` 會自動支援新工具

### 自定義指導規則
- 根據業務需求調整指導內容
- 支援多語言指導提示詞
- 可配置的指導模板

## 故障排除

### 常見問題

**1. AI 指導提示詞未顯示**
- 檢查 console 日誌中的搜索結果
- 確認數據結構是否包含 `aiInstructions` 欄位
- 驗證前端 `getAIInstructions()` 方法的搜索路徑

**2. AI 未遵循指導內容**
- 檢查二次 AI 調用的系統提示詞
- 確認 `🧠 AI 分析指導` 段落是否正確傳遞
- 驗證 AI 模型的溫度參數設定

**3. 指導內容不準確**
- 檢查 `generateAIInstructions()` 中的條件邏輯
- 確認篩選條件是否正確傳遞
- 調整指導內容的具體性和準確性

### 調試工具
- **本地測試腳本**：`test_ai_instructions_local.js`
- **完整功能測試**：`test_ai_instructions_complete.js`
- **前端 Console 日誌**：詳細的搜索和解析過程

## 結論

AI 指導提示詞功能成功實現了「控制 AI 提供哪些關鍵資訊」的需求，通過：

1. **後端動態生成**：根據查詢條件智能生成指導內容
2. **中間層格式化**：統一的格式化和傳遞機制
3. **前端智能解析**：強大的深度搜索和顯示能力
4. **AI 嚴格遵循**：通過系統提示詞確保 AI 遵循指導

這個架構設計具有良好的擴展性和維護性，可以輕鬆應用到其他 MCP 工具，為整個系統提供更智能、更精準的 AI 回應控制能力。 