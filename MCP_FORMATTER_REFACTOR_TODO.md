# MCP 格式化器重構計劃

## 📋 概述

當前 `mcpToolParser.service.js` 文件已達到 1449 行代碼，承擔了過多職責。為了支援未來更多 MCP 工具的擴展，需要重構為雙層混合架構。

## 🎯 重構目標

- **可擴展性**: 支援無限數量的 MCP 工具
- **可維護性**: 每個格式化器獨立開發和測試
- **標準化**: 統一的顯示規範和中文欄位對照
- **性能**: 自動化格式化器選擇，提升處理效率

## 🏗️ 目標架構

### 雙層架構設計
```
第一層: MCP 服務端 (數據標準化)
└── 提供標準格式的數據 + 元數據

第二層: sfda_nexus 格式化器工廠
└── 自動選擇合適的格式化器處理顯示邏輯
```

### 目錄結構
```
/backend/src/services/formatters/
├── FormatterFactory.js          # 格式化器工廠
├── base/
│   ├── BaseFormatter.js         # 基礎格式化器類
│   └── FieldMapper.js           # 欄位對照管理
├── business/
│   ├── ProjectFormatter.js      # 專案管理格式化
│   ├── EmployeeFormatter.js     # 員工資訊格式化
│   └── FinanceFormatter.js      # 財務數據格式化
├── analysis/
│   ├── StatisticalFormatter.js  # 統計分析格式化
│   └── ReportFormatter.js       # 報表格式化
└── config/
    ├── fieldMappings.json       # 全域欄位對照表
    └── displayRules.json        # 顯示規則配置
```

---

## 📅 實施計劃

### 🚀 階段 1: 建立新架構基礎 (預估: 1-2天)

#### ✅ Task 1.1: 創建基礎框架
- [ ] 建立 `/backend/src/services/formatters/` 目錄結構
- [ ] 實現 `BaseFormatter.js` 基礎類
  - [ ] 定義標準接口 (`canHandle`, `format`)
  - [ ] 提供共用工具方法 (`safeGet`, `formatTimestamp`, `debug`)
- [ ] 實現 `FormatterFactory.js` 工廠類
  - [ ] 自動格式化器註冊機制
  - [ ] 智能格式化器選擇邏輯

#### ✅ Task 1.2: 欄位對照系統
- [ ] 建立 `FieldMapper.js` 欄位對照管理器
- [ ] 創建 `config/fieldMappings.json` 全域欄位對照表
  - [ ] 遷移現有的 fieldPriority 配置
  - [ ] 支援多語言欄位對照
- [ ] 創建 `config/displayRules.json` 顯示規則配置

#### ✅ Task 1.3: 第一個格式化器實現
- [ ] 實現 `ProjectFormatter.js` (MIL 專案管理)
  - [ ] 從 mcpToolParser.service.js 抽取 MIL 相關邏輯
  - [ ] 實現動態欄位偵測和排序
  - [ ] 支援 aiInstructions 處理
- [ ] 編寫單元測試

### 🔄 階段 2: 遷移現有功能 (預估: 2-3天)

#### ✅ Task 2.1: 統計分析格式化器
- [ ] 實現 `StatisticalFormatter.js`
  - [ ] 遷移 `formatStatisticalData` 相關邏輯
  - [ ] 遷移 `formatTTestResult`, `formatANOVAResult` 等方法
  - [ ] 支援多種統計測試格式化
- [ ] 更新 `isStatisticalTool` 邏輯到工廠模式

#### ✅ Task 2.2: 員工資訊格式化器
- [ ] 實現 `EmployeeFormatter.js`
  - [ ] 遷移員工基本資訊、聯絡資訊、部門資訊格式化
  - [ ] 處理員工資料的特殊顯示需求
- [ ] 處理現有的硬編碼員工資料格式

#### ✅ Task 2.3: 通用數據格式化器
- [ ] 實現 `GenericFormatter.js` 作為後備格式化器
  - [ ] 遷移 `formatGeneralData` 邏輯
  - [ ] 處理未知數據類型的自動格式化
- [ ] 確保向後兼容性

### 🧹 階段 3: 清理和優化 (預估: 1-2天)

#### ✅ Task 3.1: 重構 mcpToolParser.service.js
- [ ] 移除已遷移的格式化邏輯
- [ ] 更新 `formatToolResults` 方法使用新的工廠模式
- [ ] 簡化類結構，專注於核心解析功能
- [ ] 確保向後兼容性

#### ✅ Task 3.2: 整合測試
- [ ] 建立整合測試套件
- [ ] 測試所有現有 MCP 工具的格式化功能
- [ ] 性能測試和優化
- [ ] 錯誤處理和容錯測試

#### ✅ Task 3.3: 文檔和配置
- [ ] 更新開發文檔
- [ ] 建立新格式化器的開發指南
- [ ] 配置檔案文檔化
- [ ] API 文檔更新

### 🌐 階段 4: MCP 服務端標準化 (預估: 1天)

#### ✅ Task 4.1: 定義 MCP 回傳標準
- [ ] 設計統一的數據回傳格式
```json
{
  "data": [...],
  "meta": {
    "toolType": "project_management",
    "dataType": "list",
    "fields": {
      "SerialNumber": { "label": "專案編號", "type": "string", "priority": 1 }
    }
  },
  "aiInstructions": "..."
}
```

#### ✅ Task 4.2: 更新現有 MCP 服務
- [ ] 更新 MIL 服務以支援新的元數據格式
- [ ] 測試元數據驅動的格式化
- [ ] 建立 MCP 服務開發規範

---

## 📋 詳細任務清單

### 🔧 技術任務

#### BaseFormatter.js 實現細節
- [ ] `canHandle(toolName, toolType)` 方法
- [ ] `format(data, toolName, context)` 方法
- [ ] `safeGet(object, path, defaultValue)` 工具方法
- [ ] `formatTimestamp(timestamp)` 時間格式化
- [ ] `debug(message, data)` 調試輔助
- [ ] 錯誤處理和日誌記錄

#### FormatterFactory.js 實現細節
- [ ] 格式化器自動註冊機制
- [ ] `getFormatter(toolName, toolType)` 選擇邏輯
- [ ] 後備格式化器支援
- [ ] 性能優化（格式化器快取）
- [ ] 配置檔案熱重載

#### FieldMapper.js 實現細節
- [ ] 多層級欄位對照（優先級、類型、單位）
- [ ] 動態欄位發現和對照
- [ ] 多語言支援框架
- [ ] 欄位驗證和標準化
- [ ] 快取機制

### 📊 配置檔案設計

#### fieldMappings.json 結構
```json
{
  "common": {
    "SerialNumber": { "label": "專案編號", "priority": 1, "type": "string" },
    "DelayDay": { "label": "延遲天數", "priority": 1, "type": "number", "suffix": " 天" }
  },
  "project_management": {
    "DRI_EmpName": { "label": "負責人", "priority": 1, "type": "string" }
  },
  "statistical": {
    "p_value": { "label": "p 值", "priority": 1, "type": "number", "format": "scientific" }
  }
}
```

#### displayRules.json 結構
```json
{
  "general": {
    "maxItems": 20,
    "itemsPerPage": 10,
    "showEmptyFields": false
  },
  "project_management": {
    "highlightDelayed": true,
    "groupByStatus": false
  },
  "statistical": {
    "significanceLevel": 0.05,
    "decimalPlaces": 4
  }
}
```

---

## ✅ 完成標準

### 階段 1 完成標準
- [ ] 新架構能夠處理至少一種 MCP 工具（MIL）
- [ ] 格式化結果與現有邏輯完全一致
- [ ] 單元測試覆蓋率 > 80%
- [ ] 性能不低於現有實現

### 階段 2 完成標準
- [ ] 所有現有格式化功能成功遷移
- [ ] 整合測試通過率 100%
- [ ] 代碼重複率 < 10%
- [ ] 記憶體使用優化 > 20%

### 階段 3 完成標準
- [ ] mcpToolParser.service.js 代碼行數減少 > 50%
- [ ] 新架構支援熱插拔格式化器
- [ ] 向後兼容性 100%
- [ ] 文檔完整性 > 90%

### 階段 4 完成標準
- [ ] MCP 服務標準化文檔完成
- [ ] 至少一個 MCP 服務實現新標準
- [ ] 元數據驅動格式化功能驗證

---

## 🚨 風險和注意事項

### 技術風險
- **向後兼容性**: 確保現有功能不受影響
- **性能影響**: 新架構的性能開銷控制
- **數據完整性**: 格式化過程中數據不丟失

### 實施風險
- **開發時間**: 分階段實施，避免一次性大改動
- **測試覆蓋**: 充分的單元測試和整合測試
- **團隊協調**: 前後端和 MCP 服務的協調開發

### 緩解措施
- [ ] 建立詳細的回滾計劃
- [ ] 實施漸進式部署
- [ ] 建立完整的測試自動化
- [ ] 定期進度檢查和風險評估

---

## 📈 成功指標

### 量化指標
- **代碼行數**: mcpToolParser.service.js 減少 > 800 行
- **開發效率**: 新 MCP 工具格式化器開發時間 < 4 小時
- **維護成本**: 單個格式化器維護時間減少 > 60%
- **測試覆蓋**: 整體測試覆蓋率 > 85%

### 質量指標
- **可讀性**: 代碼複雜度降低，易於理解和維護
- **可擴展性**: 支援新 MCP 工具無需修改核心代碼
- **一致性**: 統一的格式化標準和用戶體驗
- **穩定性**: 錯誤處理和容錯能力增強

---

## 📝 附錄

### 參考資料
- [現有 mcpToolParser.service.js 分析](./analysis/current_architecture.md)
- [MCP 協議規範](https://spec.modelcontextprotocol.io/)
- [格式化器設計模式](./docs/formatter_patterns.md)

### 工具和資源
- **測試框架**: Jest, Mocha
- **代碼品質**: ESLint, Prettier
- **文檔生成**: JSDoc
- **性能監控**: Node.js Performance Hooks

---

**建立日期**: 2024-12-28  
**預計完成日期**: 2025-01-05  
**負責人**: 開發團隊  
**優先級**: 高  

> 💡 這是一個重要的架構重構項目，將為未來的 MCP 工具擴展奠定堅實基礎。建議按階段實施，確保每個階段的穩定性後再進行下一階段。