/**
 * 通用參數轉換器
 * 用於處理不同統計工具的參數格式轉換
 */

// 統計工具參數轉換規則配置
const TOOL_PARAMETER_RULES = {
  'perform_ttest': {
    targetFormat: 'nested',
    transformation: {
      'data': {
        fields: ['sample1', 'sample2', 'paired', 'alpha', 'alternative'],
        defaults: {
          paired: false,
          alpha: 0.05,
          alternative: "two-sided"
        }
      },
      'context': {
        fields: ['scenario', 'description', 'variable_names'],
        defaults: {
          scenario: "statistical_analysis",
          description: "統計檢定分析"
        },
        transform: {
          'variable_names': (params) => ({
            sample1_name: params.sample1_name || "樣本1",
            sample2_name: params.sample2_name || "樣本2"
          })
        }
      }
    }
  },
  // 未來可以添加更多統計工具
  'perform_anova': {
    targetFormat: 'nested',
    transformation: {
      'data': {
        fields: ['groups', 'alpha', 'post_hoc'],
        defaults: {
          alpha: 0.05,
          post_hoc: "tukey"
        }
      },
      'context': {
        fields: ['scenario', 'description', 'group_names'],
        defaults: {
          scenario: "statistical_analysis",
          description: "變異數分析"
        }
      }
    }
  },
  'correlation_analysis': {
    targetFormat: 'nested',
    transformation: {
      'data': {
        fields: ['x_values', 'y_values', 'method', 'alpha'],
        defaults: {
          method: "pearson",
          alpha: 0.05
        }
      },
      'context': {
        fields: ['scenario', 'description', 'variable_names'],
        defaults: {
          scenario: "statistical_analysis",
          description: "相關性分析"
        }
      }
    }
  }
};

/**
 * 檢測參數是否已經是正確的格式
 * @param {Object} params - 參數對象
 * @param {string} toolName - 工具名稱
 * @returns {boolean} 是否已經是正確格式
 */
function isCorrectFormat(params, toolName) {
  const rule = TOOL_PARAMETER_RULES[toolName];
  if (!rule) return true; // 沒有規則的工具直接通過
  
  if (rule.targetFormat === 'nested') {
    // 檢查是否包含必要的頂層結構
    const requiredKeys = Object.keys(rule.transformation);
    return requiredKeys.every(key => params.hasOwnProperty(key));
  }
  
  return true;
}

/**
 * 轉換參數格式
 * @param {Object} params - 原始參數
 * @param {string} toolName - 工具名稱
 * @returns {Object} 轉換後的參數
 */
function transformParameters(params, toolName) {
  const rule = TOOL_PARAMETER_RULES[toolName];
  
  // 如果沒有轉換規則，直接返回原參數
  if (!rule) {
    console.log(`[ParameterTransformer] 沒有找到工具 ${toolName} 的轉換規則，使用原始參數`);
    return params;
  }
  
  // 如果已經是正確格式，直接返回
  if (isCorrectFormat(params, toolName)) {
    console.log(`[ParameterTransformer] 工具 ${toolName} 的參數已經是正確格式`);
    return params;
  }
  
  console.log(`[ParameterTransformer] 正在轉換工具 ${toolName} 的參數格式...`);
  
  if (rule.targetFormat === 'nested') {
    return transformToNestedFormat(params, rule);
  }
  
  return params;
}

/**
 * 轉換為嵌套格式
 * @param {Object} params - 原始參數
 * @param {Object} rule - 轉換規則
 * @returns {Object} 轉換後的參數
 */
function transformToNestedFormat(params, rule) {
  const result = {};
  
  Object.keys(rule.transformation).forEach(groupKey => {
    const groupConfig = rule.transformation[groupKey];
    const groupData = {};
    
    // 處理字段映射
    groupConfig.fields.forEach(field => {
      if (params.hasOwnProperty(field)) {
        groupData[field] = params[field];
      } else if (groupConfig.defaults && groupConfig.defaults.hasOwnProperty(field)) {
        groupData[field] = groupConfig.defaults[field];
      }
    });
    
    // 處理特殊轉換
    if (groupConfig.transform) {
      Object.keys(groupConfig.transform).forEach(transformKey => {
        const transformFunc = groupConfig.transform[transformKey];
        groupData[transformKey] = transformFunc(params);
      });
    }
    
    // 應用默認值
    if (groupConfig.defaults) {
      Object.keys(groupConfig.defaults).forEach(defaultKey => {
        if (!groupData.hasOwnProperty(defaultKey)) {
          groupData[defaultKey] = groupConfig.defaults[defaultKey];
        }
      });
    }
    
    result[groupKey] = groupData;
  });
  
  console.log(`[ParameterTransformer] 轉換結果:`, result);
  return result;
}

/**
 * 添加新的工具轉換規則
 * @param {string} toolName - 工具名稱
 * @param {Object} rule - 轉換規則
 */
function addTransformationRule(toolName, rule) {
  TOOL_PARAMETER_RULES[toolName] = rule;
  console.log(`[ParameterTransformer] 已添加工具 ${toolName} 的轉換規則`);
}

/**
 * 獲取所有支持的工具列表
 * @returns {string[]} 工具名稱列表
 */
function getSupportedTools() {
  return Object.keys(TOOL_PARAMETER_RULES);
}

/**
 * 主要的參數處理函數
 * @param {Object} params - 原始參數
 * @param {string} toolName - 工具名稱
 * @returns {Object} 處理後的參數
 */
export function processToolParameters(params, toolName) {
  try {
    return transformParameters(params, toolName);
  } catch (error) {
    console.error(`[ParameterTransformer] 轉換工具 ${toolName} 參數時發生錯誤:`, error);
    console.warn(`[ParameterTransformer] 回退到原始參數格式`);
    return params;
  }
}

export {
  addTransformationRule,
  getSupportedTools,
  isCorrectFormat,
  TOOL_PARAMETER_RULES
}; 