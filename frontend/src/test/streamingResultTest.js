/**
 * 流式結果展示測試腳本
 * 用於測試統計分析結果的流式展示功能
 */

import { parsePerformTTestResult } from '@/utils/statisticalResultParser.js'

// 模擬 perform_ttest 工具的結果數據
const mockTTestResult = {
  success: true,
  result: {
    data: {
      result: {
        t_statistic: 4.32,
        p_value: 0.0001,
        degrees_of_freedom: 19,
        alpha: 0.05,
        paired: true,
        sample_size: 20,
        confidence_interval: [-8.72, -3.78],
        mean_difference: -6.25,
        std_error: 1.447,
        alternative: "two-sided"
      }
    }
  }
}

// 測試解析功能
function testParsePerformTTestResult() {
  console.log('🧪 測試 perform_ttest 結果解析...')
  
  try {
    const parsed = parsePerformTTestResult(mockTTestResult.result)
    
    console.log('✅ 解析成功!')
    console.log('📊 解析結果:', parsed)
    
    // 驗證結構
    if (parsed.sections && parsed.sections.length > 0) {
      console.log(`📋 包含 ${parsed.sections.length} 個展示階段:`)
      parsed.sections.forEach((section, index) => {
        console.log(`  ${index + 1}. ${section.title} (${section.type})`)
      })
    }
    
    return parsed
  } catch (error) {
    console.error('❌ 解析失敗:', error)
    return null
  }
}

// 測試不同的結果格式
function testDifferentResultFormats() {
  console.log('\n🔄 測試不同的結果格式...')
  
  // 格式1: 直接結果
  const format1 = {
    t_statistic: 2.56,
    p_value: 0.018,
    degrees_of_freedom: 18,
    alpha: 0.05,
    paired: false
  }
  
  // 格式2: 嵌套在 result 中
  const format2 = {
    result: {
      t_statistic: -3.21,
      p_value: 0.004,
      degrees_of_freedom: 25,
      alpha: 0.05,
      paired: true
    }
  }
  
  // 格式3: 深度嵌套
  const format3 = {
    data: {
      data: {
        result: {
          t_statistic: 1.89,
          p_value: 0.072,
          degrees_of_freedom: 22,
          alpha: 0.05,
          paired: false
        }
      }
    }
  }
  
  const formats = [
    { name: '直接結果', data: format1 },
    { name: '嵌套結果', data: format2 },
    { name: '深度嵌套', data: format3 }
  ]
  
  formats.forEach(format => {
    console.log(`\n📝 測試 ${format.name}:`)
    const parsed = parsePerformTTestResult(format.data)
    if (parsed) {
      console.log(`✅ ${format.name} 解析成功`)
    } else {
      console.log(`❌ ${format.name} 解析失敗`)
    }
  })
}

// 測試錯誤處理
function testErrorHandling() {
  console.log('\n⚠️ 測試錯誤處理...')
  
  const invalidInputs = [
    null,
    undefined,
    {},
    { invalid: 'data' },
    { result: null },
    { result: { no_statistical_data: true } }
  ]
  
  invalidInputs.forEach((input, index) => {
    console.log(`\n🔍 測試無效輸入 ${index + 1}:`, input)
    const parsed = parsePerformTTestResult(input)
    
    if (parsed && parsed.sections && parsed.sections[0].type === 'error') {
      console.log('✅ 錯誤處理正常，返回錯誤結果')
    } else {
      console.log('❌ 錯誤處理異常')
    }
  })
}

// 生成演示數據
function generateDemoData() {
  console.log('\n🎭 生成演示數據...')
  
  // 顯著結果
  const significantResult = {
    data: {
      result: {
        t_statistic: 12.9071,
        p_value: 7.495e-11,
        degrees_of_freedom: 19,
        alpha: 0.05,
        paired: true,
        sample_size: 20,
        confidence_interval: [-6.50, -4.50],
        mean_difference: -5.50,
        alternative: "two-sided",
        scenario: "medical",
        description: "血壓治療效果分析"
      }
    }
  }
  
  // 不顯著結果
  const nonSignificantResult = {
    data: {
      result: {
        t_statistic: 1.23,
        p_value: 0.234,
        degrees_of_freedom: 28,
        alpha: 0.05,
        paired: false,
        sample_size: 30,
        confidence_interval: [-0.85, 3.42],
        mean_difference: 1.285,
        alternative: "two-sided",
        scenario: "education",
        description: "教學方法效果比較"
      }
    }
  }
  
  return {
    significant: parsePerformTTestResult(significantResult.data),
    nonSignificant: parsePerformTTestResult(nonSignificantResult.data)
  }
}

// 主測試函數
function runAllTests() {
  console.log('🚀 開始流式結果展示測試\n')
  
  // 基本解析測試
  const basicResult = testParsePerformTTestResult()
  
  // 不同格式測試
  testDifferentResultFormats()
  
  // 錯誤處理測試
  testErrorHandling()
  
  // 生成演示數據
  const demoData = generateDemoData()
  
  console.log('\n📈 演示數據生成完成:')
  console.log('- 顯著結果演示數據')
  console.log('- 不顯著結果演示數據')
  
  return {
    basicResult,
    demoData
  }
}

// 如果在瀏覽器環境中直接執行
if (typeof window !== 'undefined') {
  // 將測試函數掛載到 window 對象，方便在控制台調用
  window.streamingResultTest = {
    runAllTests,
    testParsePerformTTestResult,
    testDifferentResultFormats,
    testErrorHandling,
    generateDemoData,
    mockTTestResult
  }
  
  console.log('🎯 流式結果測試工具已加載到 window.streamingResultTest')
  console.log('💡 在控制台執行 window.streamingResultTest.runAllTests() 開始測試')
}

export {
  runAllTests,
  testParsePerformTTestResult,
  testDifferentResultFormats,
  testErrorHandling,
  generateDemoData,
  mockTTestResult
} 