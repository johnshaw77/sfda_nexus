# 📊 CSV 處理功能使用指南

## 概述

SFDA Nexus 系統現已整合強大的 CSV 處理功能，使用 qwen3:8b 模型提供專業的數據分析和洞察。本功能類似於現有的圖像處理流程，但專門針對 CSV 數據進行優化。

## 🚀 功能特色

### 1. 智能 CSV 解析

- 自動處理引號和逗號轉義
- 智能檢測數據類型（數字、日期、布林、字串）
- 支援繁體中文內容

### 2. 專業數據分析

- **數據結構分析**：行數、欄位數、數據類型檢測
- **統計摘要**：平均值、中位數、標準差、四分位數
- **數據品質評估**：缺失值、重複值、異常值檢測
- **品質評分**：0-100 分的數據品質評分

### 3. AI 增強洞察

- 使用 qwen3:8b 模型進行深度分析
- 支援思考模式，提供分析推理過程
- 生成業務洞察和處理建議
- 繁體中文專業報告

### 4. 智能問答

- 基於 CSV 內容的自然語言問答
- 支援複雜的數據查詢
- 提供具體的數據支持

## 📋 API 接口

### 1. 檔案上傳

```http
POST /api/files/upload
Content-Type: multipart/form-data
Authorization: Bearer <token>

Body:
- file: CSV 檔案
- is_public: false (可選)
```

### 2. CSV 專業分析

```http
POST /api/files/:id/analyze
Content-Type: application/json
Authorization: Bearer <token>

Body:
{
  "type": "csv_analysis",
  "model": "qwen3:8b"
}
```

### 3. 檔案問答

```http
POST /api/files/:id/ask
Content-Type: application/json
Authorization: Bearer <token>

Body:
{
  "question": "您的問題",
  "model": "qwen3:8b"
}
```

## 📊 分析結果結構

### CSV 分析回應格式

```json
{
  "success": true,
  "data": {
    "analysis_type": "csv_professional",
    "csv_data": {
      "filename": "employees.csv",
      "total_rows": 15,
      "total_columns": 6,
      "headers": ["姓名", "年齡", "部門", "薪資", "入職日期", "績效評分"],
      "sample_rows": [...]
    },
    "data_types": {
      "姓名": {
        "type": "string",
        "confidence": 1.0,
        "unique_count": 15,
        "null_count": 0
      },
      "年齡": {
        "type": "number",
        "confidence": 1.0,
        "unique_count": 12,
        "null_count": 0
      }
    },
    "statistics": {
      "年齡": {
        "count": 15,
        "mean": 29.67,
        "median": 29.0,
        "min": 25,
        "max": 36,
        "std": 3.44
      },
      "姓名": {
        "count": 15,
        "unique_count": 15,
        "avg_length": 2.0
      }
    },
    "quality_report": {
      "missing_values": {},
      "duplicates": {
        "count": 0,
        "percentage": 0
      },
      "outliers": {},
      "summary": {
        "total_issues": 0,
        "quality_score": 100.0
      }
    },
    "ai_insights": {
      "insights": "詳細的 AI 分析報告...",
      "thinking_process": "AI 的思考過程...",
      "model_used": "qwen3:8b",
      "processing_time": 2500,
      "generated_at": "2024-01-15T10:30:00.000Z"
    },
    "metadata": {
      "analyzed_at": "2024-01-15T10:30:00.000Z",
      "analysis_version": "1.0.0",
      "sample_size": 15
    },
    "model_used": "qwen3:8b"
  },
  "message": "檔案CSV分析完成"
}
```

## 🔧 使用範例

### 1. 基本使用流程

```javascript
// 1. 上傳 CSV 檔案
const formData = new FormData();
formData.append("file", csvFile);

const uploadResponse = await fetch("/api/files/upload", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
  },
  body: formData,
});

const fileData = await uploadResponse.json();
const fileId = fileData.data.id;

// 2. 進行 CSV 分析
const analysisResponse = await fetch(`/api/files/${fileId}/analyze`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    type: "csv_analysis",
    model: "qwen3:8b",
  }),
});

const analysis = await analysisResponse.json();

// 3. 檔案問答
const qaResponse = await fetch(`/api/files/${fileId}/ask`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    question: "哪個部門的平均薪資最高？",
    model: "qwen3:8b",
  }),
});

const answer = await qaResponse.json();
```

### 2. 測試腳本使用

```bash
# 進入後端目錄
cd backend

# 執行測試腳本
node database/scripts/test_csv_processing.js
```

## 📈 分析能力

### 支援的數據類型

- **數字 (number)**：整數、小數、科學記號
- **日期 (date)**：各種日期格式
- **布林 (boolean)**：true/false, 1/0, yes/no
- **字串 (string)**：文本內容
- **空值 (empty)**：完全空白的欄位

### 統計分析功能

- **數值欄位**：平均值、中位數、最小值、最大值、標準差、四分位數
- **文字欄位**：唯一值數量、最常見值、平均長度
- **品質檢測**：缺失值比例、重複行檢測、異常值識別

### AI 洞察內容

1. **數據概況總結**：數據集特徵和用途描述
2. **關鍵發現**：數據分佈特徵和統計指標
3. **數據品質評估**：問題識別和改善建議
4. **業務洞察**：趨勢分析和商業價值
5. **數據處理建議**：清理步驟和分析方法

## ⚙️ 配置選項

### 模型配置

- **預設模型**：qwen3:8b
- **思考模式**：自動啟用（支援的模型）
- **溫度設定**：0.3（確保分析一致性）
- **最大 tokens**：4096

### 處理限制

- **最大行數**：5000 行（可配置）
- **檔案大小**：10MB（繼承檔案上傳限制）
- **超時設定**：5 分鐘

## 🛠️ 故障排除

### 常見問題

1. **CSV 解析失敗**

   - 檢查檔案編碼（建議 UTF-8）
   - 確認 CSV 格式正確
   - 檢查是否有特殊字符

2. **AI 分析失敗**

   - 確認 Ollama 服務運行
   - 檢查 qwen3:8b 模型是否安裝
   - 查看後端日誌錯誤信息

3. **分析結果不準確**
   - 檢查數據品質分數
   - 確認數據類型檢測正確
   - 考慮數據預處理

### 降級機制

- AI 服務不可用時自動降級到基本統計分析
- 提供基本的結構信息和錯誤提示
- 保證系統穩定性

## 🔮 未來擴展

### 計劃功能

- 支援更多檔案格式（Excel、JSON）
- 數據視覺化生成
- 自動化報告生成
- 批量檔案處理
- 數據清理建議執行

### 模型支援

- 支援更多 AI 模型
- 專門的數據分析模型
- 多語言支援

## 📞 技術支援

如有問題或建議，請聯繫開發團隊或查看系統日誌獲取詳細錯誤信息。

---

_本文檔隨系統更新而更新，請關注最新版本。_
