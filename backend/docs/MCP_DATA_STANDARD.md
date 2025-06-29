# MCP 工具數據標準規範

## 概述
統一所有 MCP 工具的返回數據格式，確保數據提取和AI分析的一致性。

## 標準數據結構

所有 MCP 工具必須返回以下統一格式：

```json
{
  "success": true,
  "data": {
    "records": [
      // 實際數據數組
    ],
    "metadata": {
      "total_count": 100,
      "query_time": "2025-06-29T20:00:00Z",
      "source": "database_name",
      "fields": ["field1", "field2", "field3"]
    }
  },
  "summary": "數據查詢成功，返回 X 筆記錄",
  "error": null
}
```

## 字段說明

### 必需字段
- `success` (boolean): 操作是否成功
- `data` (object): 實際數據容器
  - `records` (array): 主要數據數組
  - `metadata` (object): 元數據信息
- `summary` (string): 操作結果摘要

### 可選字段
- `error` (string|null): 錯誤信息（成功時為null）
- `warning` (string): 警告信息
- `pagination` (object): 分頁信息（如適用）

## 數據提取路徑

系統將按以下順序提取數據：
1. `result.data.records` - 主要數據數組
2. `result.data` - 整個數據對象
3. `result` - 完整結果

## 實際範例

### MIL系統查詢結果
```json
{
  "success": true,
  "data": {
    "records": [
      {
        "Remark": "",
        "Status": "OnGoing", 
        "D_R_I_Dept": "製程品保二課",
        "Delay_Day": 16,
        "Location": "MB221",
        "Type_Name": "會議管理"
      }
    ],
    "metadata": {
      "total_count": 5,
      "query_time": "2025-06-29T20:00:00Z",
      "source": "mil_database",
      "fields": ["Remark", "Status", "D_R_I_Dept", "Delay_Day", "Location", "Type_Name"]
    }
  },
  "summary": "查詢成功，返回 5 筆延遲專案記錄"
}
```

## 實施指南

### 對於現有MCP工具
1. 檢查當前返回格式
2. 修改為標準格式
3. 更新格式化器

### 對於新MCP工具
1. 直接使用標準格式
2. 確保數據在 `data.records` 中
3. 提供有意義的 `summary`

## 格式化器更新

所有格式化器需要確保返回的數據結構符合此標準：

```javascript
// 標準返回格式
return {
  success: true,
  data: {
    records: processedData,
    metadata: {
      total_count: processedData.length,
      query_time: new Date().toISOString(),
      source: 'tool_name',
      fields: Object.keys(processedData[0] || {})
    }
  },
  summary: `查詢成功，返回 ${processedData.length} 筆記錄`
};
```