# AI 指導架構設計

## 🏗️ 混合架構方案

### 📋 基礎指導 (Tool 層)

```javascript
// tools/mil-tools.js
const BASE_INSTRUCTIONS = {
  // 通用欄位要求
  requiredFields: [
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
  ],

  // 基本分析原則
  principles: [
    "只能基於統計摘要進行分析，不能編造具體專案",
    "如果數據缺失，明確標註「資料未提供」",
    "專注於數據驅動的洞察分析",
  ],
};
```

### 🧠 動態指導 (Service 層)

```javascript
// services/mil-service.js
const generateContextualInstructions = (stats, filters, data) => {
  const instructions = [...BASE_INSTRUCTIONS.principles];

  // 根據數據特徵動態生成指導
  if (stats.highRiskCount > 0) {
    instructions.push("🚨 重點分析高風險專案的共同特徵");
  }

  if (filters.delayDayMin >= 10) {
    instructions.push("⚠️ 評估嚴重延遲的根本原因");
  }

  return instructions;
};
```

## 🎯 實施建議

### 階段一：重構現有架構

1. **提取基礎指導到 Tool 層**
2. **保留動態指導在 Service 層**
3. **建立指導合併機制**

### 階段二：標準化擴展

1. **建立指導模板系統**
2. **支援多語言指導**
3. **添加指導版本控制**

## 💡 具體優勢

### 🔄 可維護性

- 基礎規則集中管理
- 動態邏輯分散在各 Service
- 職責分離清晰

### 🚀 可擴展性

- 新增 Service 可復用基礎指導
- 動態指導可根據業務需求客製化
- 支援 A/B 測試不同指導策略

### 📊 數據驅動

- 基於實際查詢結果調整指導
- 支援個性化指導生成
- 可追蹤指導效果
