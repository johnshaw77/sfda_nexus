# perform_ttest 工具修復指南

## 問題描述

之前的 `perform_ttest` 工具調用失敗，出現錯誤：
```
Missing required parameter: data
```

## 根本原因

工具的參數結構已經更新，但前端調用時仍使用舊的參數格式：

### ❌ 舊格式（失敗）
```json
{
  "sample1": [...],
  "sample2": [...],
  "paired": true,
  "alpha": 0.05,
  "alternative": "two-sided"
}
```

### ✅ 新格式（正確）
```json
{
  "data": {
    "sample1": [...],
    "sample2": [...],
    "paired": true,
    "alpha": 0.05,
    "alternative": "two-sided"
  },
  "context": {
    "scenario": "medical",
    "description": "研究描述",
    "variable_names": {
      "sample1_name": "第一組名稱",
      "sample2_name": "第二組名稱"
    }
  }
}
```

## 修復方案

### 1. 參數結構修復

需要將統計參數包裝在 `data` 物件中，並添加 `context` 物件：

```javascript
const parameters = {
  data: {
    sample1: [140, 155, 138, 162, 145, 158, 142, 148, 152, 136, 144, 160, 139, 147, 156, 141, 149, 153, 137, 146],
    sample2: [132, 148, 135, 154, 140, 149, 138, 143, 145, 133, 139, 152, 136, 142, 150, 137, 144, 146, 134, 141],
    paired: true,
    alpha: 0.05,
    alternative: "two-sided"
  },
  context: {
    scenario: "medical",
    description: "評估降血壓藥物的治療效果",
    variable_names: {
      sample1_name: "治療前血壓",
      sample2_name: "治療後血壓"
    }
  }
};
```

### 2. 回應數據路徑修復

統計結果的正確路徑為：
```javascript
const statResult = response.data.data.result.data.result;
```

完整的回應結構：
```
response.data.data.result.data.result
├── statistic: t統計量
├── p_value: p值
├── degrees_of_freedom: 自由度
├── critical_value: 臨界值
├── reject_null: 是否拒絕虛無假設
├── confidence_interval: 信賴區間
└── interpretation: 結果解釋
    ├── summary: 摘要
    ├── conclusion: 結論
    ├── practical_significance: 實際意義
    └── recommendations: 建議
```

## 使用範例

### 配對樣本 t 檢定（血壓治療效果）

```javascript
const bloodPressureTest = {
  serviceId: 49,
  toolId: 209,
  toolName: 'perform_ttest',
  parameters: {
    data: {
      sample1: [140, 155, 138, 162, 145, 158, 142, 148, 152, 136, 144, 160, 139, 147, 156, 141, 149, 153, 137, 146],
      sample2: [132, 148, 135, 154, 140, 149, 138, 143, 145, 133, 139, 152, 136, 142, 150, 137, 144, 146, 134, 141],
      paired: true,
      alpha: 0.05,
      alternative: "two-sided"
    },
    context: {
      scenario: "medical",
      description: "評估降血壓藥物的治療效果",
      variable_names: {
        sample1_name: "治療前血壓",
        sample2_name: "治療後血壓"
      }
    }
  }
};
```

### 獨立樣本 t 檢定（教學方法比較）

```javascript
const educationTest = {
  serviceId: 49,
  toolId: 209,
  toolName: 'perform_ttest',
  parameters: {
    data: {
      sample1: [78, 82, 75, 88, 79, 85, 81, 77, 84, 80],
      sample2: [85, 89, 91, 87, 93, 88, 90, 86, 92, 89],
      paired: false,
      alpha: 0.05,
      alternative: "two-sided"
    },
    context: {
      scenario: "education",
      description: "比較傳統教學與互動教學的效果",
      variable_names: {
        sample1_name: "傳統教學組",
        sample2_name: "互動教學組"
      }
    }
  }
};
```

### 單樣本 t 檢定（品質控制）

```javascript
const qualityTest = {
  serviceId: 49,
  toolId: 209,
  toolName: 'perform_ttest',
  parameters: {
    data: {
      sample1: [498.2, 501.3, 499.8, 502.1, 500.5, 497.9, 503.2, 499.1, 501.8, 500.3],
      sample2: null,
      paired: false,
      alpha: 0.05,
      alternative: "two-sided"
    },
    context: {
      scenario: "quality",
      description: "檢測產品重量是否符合標準規格 500g",
      variable_names: {
        sample1_name: "產品重量"
      }
    }
  }
};
```

## 結果解析

```javascript
// 正確的結果解析方式
const result = toolCallResponse.data.data;
const statResult = result.data.result.data.result;

if (statResult) {
  console.log('檢定類型:', statResult.test_type || '配對樣本 t 檢定');
  console.log('t統計量:', statResult.statistic.toFixed(4));
  console.log('p值:', statResult.p_value.toExponential(3));
  console.log('自由度:', statResult.degrees_of_freedom);
  console.log('拒絕虛無假設:', statResult.reject_null ? '是' : '否');
  
  if (statResult.interpretation) {
    console.log('結論:', statResult.interpretation.conclusion);
    console.log('實際意義:', statResult.interpretation.practical_significance);
  }
}
```

## 測試結果

使用修復後的格式，血壓治療效果分析結果：

- **t統計量**: 12.9071
- **p值**: 7.495e-11 (p < 0.001)
- **自由度**: 19
- **結論**: 拒絕虛無假設，治療效果顯著
- **平均血壓下降**: 5.50 mmHg
- **臨床意義**: 治療效果顯著，具有臨床意義

## 注意事項

1. **必須包含 `data` 包裝物件**：所有統計參數必須在 `data` 物件內
2. **建議添加 `context` 物件**：提供分析背景，獲得更好的結果解釋
3. **正確的數據路徑**：統計結果在 `response.data.data.result.data.result`
4. **場景類型**：支援 "medical"、"education"、"quality" 等場景
5. **變數命名**：在 `variable_names` 中提供有意義的變數名稱

## 前端修復

### ✅ 已完成修復

前端 `McpToolsTester.vue` 已經修復，添加了自動參數格式轉換功能：

```javascript
// 🔧 特殊處理：perform_ttest 工具需要特殊的參數格式
let finalParams = processedParams;
if (selectedTool.value.name === 'perform_ttest') {
  // 檢查是否已經是新格式（包含 data 和 context）
  if (!processedParams.data && !processedParams.context) {
    // 轉換為新格式
    finalParams = {
      data: {
        sample1: processedParams.sample1 || [],
        sample2: processedParams.sample2 || null,
        paired: processedParams.paired || false,
        alpha: processedParams.alpha || 0.05,
        alternative: processedParams.alternative || "two-sided"
      },
      context: {
        scenario: processedParams.scenario || "medical",
        description: processedParams.description || "統計檢定分析",
        variable_names: {
          sample1_name: processedParams.sample1_name || "樣本1",
          sample2_name: processedParams.sample2_name || "樣本2"
        }
      }
    };
  }
}
```

### 修復效果

✅ **無需重啟服務器**：前端代碼修復即時生效  
✅ **向後兼容**：用戶可以繼續使用熟悉的舊格式參數  
✅ **自動轉換**：前端自動將舊格式轉換為新格式  
✅ **完全透明**：用戶體驗無變化，後端收到正確格式  

### 測試驗證

已通過完整測試驗證：
- 前端參數格式轉換正確
- 後端接收新格式參數成功
- 統計分析結果正確
- 血壓治療效果顯著（p < 0.001）

現在 `perform_ttest` 工具已經完全修復，可以正常進行各種類型的 t 檢定分析！

## 🔄 升級版解決方案：通用參數轉換器

### 問題背景

原本的解決方案為 `perform_ttest` 工具寫了特殊處理邏輯，但這種做法不可擴展。隨著更多統計工具的加入，為每個工具都寫特殊處理會讓代碼變得臃腫且難以維護。

### 通用解決方案

我們實現了一個**通用參數轉換器**系統，提供配置化的參數格式轉換：

#### 1. 核心轉換器 (`frontend/src/utils/parameterTransformer.js`)

```javascript
import { processToolParameters } from '@/utils/parameterTransformer.js';

// 自動處理任何統計工具的參數格式
const finalParams = processToolParameters(originalParams, toolName);
```

#### 2. 配置化規則

```javascript
const TOOL_PARAMETER_RULES = {
  'perform_ttest': {
    targetFormat: 'nested',
    transformation: {
      'data': {
        fields: ['sample1', 'sample2', 'paired', 'alpha', 'alternative'],
        defaults: { paired: false, alpha: 0.05, alternative: "two-sided" }
      },
      'context': {
        fields: ['scenario', 'description', 'variable_names'],
        defaults: { scenario: "statistical_analysis", description: "統計檢定分析" }
      }
    }
  },
  'correlation_analysis': { /* 其他工具配置 */ },
  'perform_anova': { /* 其他工具配置 */ }
};
```

#### 3. 前端集成

在 `McpToolsTester.vue` 中替換特殊處理邏輯：

```javascript
// 舊方法（已棄用）
// if (selectedTool.value.name === 'perform_ttest') { ... }

// 新方法（通用）
const finalParams = processToolParameters(processedParams, selectedTool.value.name);
```

### 系統優勢

✅ **統一處理**：所有統計工具使用相同的轉換邏輯  
✅ **配置驅動**：通過配置文件添加新工具，無需修改業務邏輯  
✅ **向後兼容**：自動檢測參數格式，支持新舊格式  
✅ **錯誤處理**：包含完善的錯誤處理和回退機制  
✅ **可擴展性**：輕鬆添加新的統計分析工具  

### 添加新工具示例

```javascript
// 只需在配置中添加新規則
'chi_square_test': {
  targetFormat: 'nested',
  transformation: {
    'data': {
      fields: ['observed', 'expected', 'alpha'],
      defaults: { alpha: 0.05 }
    },
    'context': {
      fields: ['scenario', 'description'],
      defaults: { scenario: "statistical_analysis", description: "卡方檢定" }
    }
  }
}
```

### 相關文檔

詳細使用指南請參考：[統計工具參數格式標準](./統計工具參數格式標準.md)

這個通用系統為未來添加更多統計分析工具提供了堅實的基礎，大幅提升開發效率！ 