/**
 * 通用參數轉換器測試腳本
 * 用於驗證轉換器的各種功能
 */

import { 
  processToolParameters, 
  getSupportedTools, 
  isCorrectFormat,
  addTransformationRule 
} from '../utils/parameterTransformer.js';

// 測試數據
const testCases = {
  // perform_ttest 工具測試
  perform_ttest: {
    // 舊格式（應該被轉換）
    oldFormat: {
      sample1: [120, 125, 130, 135, 140],
      sample2: [115, 120, 125, 130, 135],
      paired: true,
      alpha: 0.05,
      alternative: "two-sided",
      scenario: "medical",
      description: "血壓治療效果分析",
      sample1_name: "治療前",
      sample2_name: "治療後"
    },
    // 新格式（應該保持不變）
    newFormat: {
      data: {
        sample1: [120, 125, 130, 135, 140],
        sample2: [115, 120, 125, 130, 135],
        paired: true,
        alpha: 0.05,
        alternative: "two-sided"
      },
      context: {
        scenario: "medical",
        description: "血壓治療效果分析",
        variable_names: {
          sample1_name: "治療前",
          sample2_name: "治療後"
        }
      }
    }
  },

  // correlation_analysis 工具測試
  correlation_analysis: {
    oldFormat: {
      x_values: [1, 2, 3, 4, 5],
      y_values: [2, 4, 6, 8, 10],
      method: "pearson",
      alpha: 0.05,
      scenario: "statistical_analysis",
      description: "相關性分析測試",
      x_name: "變數X",
      y_name: "變數Y"
    }
  },

  // 未知工具測試
  unknown_tool: {
    params: {
      param1: "value1",
      param2: 123,
      param3: true
    }
  }
};

// 執行測試
function runTests() {
  console.log('🧪 開始測試通用參數轉換器...\n');

  // 測試1：查看支持的工具
  console.log('📋 支持的統計工具:', getSupportedTools());
  console.log('');

  // 測試2：perform_ttest 舊格式轉換
  console.log('🔄 測試 perform_ttest 舊格式轉換:');
  const ttestOldResult = processToolParameters(
    testCases.perform_ttest.oldFormat, 
    'perform_ttest'
  );
  console.log('原始參數:', testCases.perform_ttest.oldFormat);
  console.log('轉換結果:', ttestOldResult);
  console.log('格式檢查:', isCorrectFormat(ttestOldResult, 'perform_ttest'));
  console.log('');

  // 測試3：perform_ttest 新格式保持
  console.log('✅ 測試 perform_ttest 新格式保持:');
  const ttestNewResult = processToolParameters(
    testCases.perform_ttest.newFormat, 
    'perform_ttest'
  );
  console.log('原始參數:', testCases.perform_ttest.newFormat);
  console.log('處理結果:', ttestNewResult);
  console.log('是否相同:', JSON.stringify(ttestNewResult) === JSON.stringify(testCases.perform_ttest.newFormat));
  console.log('');

  // 測試4：correlation_analysis 轉換
  console.log('🔄 測試 correlation_analysis 轉換:');
  const corrResult = processToolParameters(
    testCases.correlation_analysis.oldFormat, 
    'correlation_analysis'
  );
  console.log('原始參數:', testCases.correlation_analysis.oldFormat);
  console.log('轉換結果:', corrResult);
  console.log('');

  // 測試5：未知工具處理
  console.log('❓ 測試未知工具處理:');
  const unknownResult = processToolParameters(
    testCases.unknown_tool.params, 
    'unknown_tool'
  );
  console.log('原始參數:', testCases.unknown_tool.params);
  console.log('處理結果:', unknownResult);
  console.log('是否相同:', JSON.stringify(unknownResult) === JSON.stringify(testCases.unknown_tool.params));
  console.log('');

  // 測試6：動態添加規則
  console.log('➕ 測試動態添加規則:');
  addTransformationRule('new_test_tool', {
    targetFormat: 'nested',
    transformation: {
      'data': {
        fields: ['values', 'threshold'],
        defaults: {
          threshold: 0.5
        }
      },
      'context': {
        fields: ['description'],
        defaults: {
          description: "新測試工具"
        }
      }
    }
  });

  const newToolResult = processToolParameters(
    { values: [1, 2, 3], threshold: 0.8, description: "測試描述" },
    'new_test_tool'
  );
  console.log('新工具轉換結果:', newToolResult);
  console.log('更新後支持的工具:', getSupportedTools());
  console.log('');

  // 測試7：錯誤處理
  console.log('🚨 測試錯誤處理:');
  try {
    // 模擬一個會導致錯誤的參數
    const errorParams = { circular: null };
    errorParams.circular = errorParams; // 創建循環引用
    
    const errorResult = processToolParameters(errorParams, 'perform_ttest');
    console.log('錯誤處理結果:', errorResult);
  } catch (error) {
    console.log('捕獲錯誤:', error.message);
  }

  console.log('🎉 測試完成！');
}

// 如果在瀏覽器環境中，將測試函數掛載到 window 對象
if (typeof window !== 'undefined') {
  window.testParameterTransformer = runTests;
  console.log('💡 在瀏覽器控制台中運行 testParameterTransformer() 來執行測試');
}

// 如果在 Node.js 環境中，直接運行測試
if (typeof module !== 'undefined' && module.exports) {
  runTests();
}

export { runTests }; 