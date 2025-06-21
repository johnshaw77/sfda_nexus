/**
 * 統計結果解析器
 * 將統計分析工具的結果轉換為流式展示格式
 */

// 圖標映射
const ICONS = {
  'data-overview': 'DatabaseOutlined',
  'calculation': 'CalculatorOutlined', 
  'results': 'BarChartOutlined',
  'interpretation': 'BulbOutlined',
  'recommendations': 'StarOutlined',
  'warning': 'ExclamationCircleOutlined',
  'info': 'InfoCircleOutlined',
  'success': 'CheckCircleOutlined'
}

/**
 * 解析 perform_ttest 工具結果
 * @param {Object} toolResult - 工具調用結果
 * @returns {Object} 流式展示格式的數據
 */
export function parsePerformTTestResult(toolResult) {
  try {
    // 解析結果數據
    const result = extractResultData(toolResult)
    if (!result) {
      throw new Error('無法解析統計結果數據')
    }

    const sections = []

    // 1. 數據概覽階段
    sections.push({
      type: 'data-overview',
      icon: ICONS['data-overview'],
      title: '🔍 數據驗證',
      content: {
        sampleSize: result.sample_size || result.sampleSize || '未知',
        testType: getTestTypeDescription(result),
        alpha: result.alpha || 0.05
      }
    })

    // 2. 統計計算階段
    sections.push({
      type: 'calculation', 
      icon: ICONS['calculation'],
      title: '📊 統計計算',
      content: {
        steps: [
          { name: 't 統計量', value: formatNumber(result.t_statistic || result.tStatistic) },
          { name: '自由度', value: result.degrees_of_freedom || result.df || 'N/A' },
          { name: 'p 值', value: formatPValue(result.p_value || result.pValue) }
        ]
      }
    })

    // 3. 檢定結果階段
    const isSignificant = (result.p_value || result.pValue) < (result.alpha || 0.05)
    sections.push({
      type: 'results',
      icon: ICONS['results'], 
      title: '📈 檢定結果',
      content: {
        tStatistic: formatNumber(result.t_statistic || result.tStatistic),
        pValue: formatPValue(result.p_value || result.pValue),
        confidenceInterval: formatConfidenceInterval(result.confidence_interval || result.confidenceInterval),
        significance: isSignificant ? 'significant' : 'not-significant'
      }
    })

    // 4. 結果解釋階段
    sections.push({
      type: 'interpretation',
      icon: ICONS['interpretation'],
      title: '💡 結果解釋', 
      content: {
        conclusion: generateConclusion(result),
        explanation: generateExplanation(result),
        significance: isSignificant ? 'significant' : 'not-significant'
      }
    })

    // 5. 建議和結論階段
    sections.push({
      type: 'recommendations',
      icon: ICONS['recommendations'],
      title: '🎯 建議和結論',
      content: {
        recommendations: generateRecommendations(result)
      }
    })

    return {
      toolName: 'perform_ttest',
      sections: sections,
      metadata: {
        timestamp: new Date().toISOString(),
        resultType: 'statistical_analysis'
      }
    }

  } catch (error) {
    console.error('解析統計結果時發生錯誤:', error)
    return createErrorResult(error.message)
  }
}

/**
 * 從工具結果中提取數據
 * @param {Object} toolResult - 原始工具結果
 * @returns {Object|null} 提取的結果數據
 */
function extractResultData(toolResult) {
  // 處理多層嵌套的結果結構
  let result = toolResult

  // 嘗試不同的路徑來找到實際的統計結果
  const possiblePaths = [
    'result.data.result',
    'data.result', 
    'result.result',
    'data.data.result',
    'result',
    'data'
  ]

  for (const path of possiblePaths) {
    const pathParts = path.split('.')
    let current = toolResult
    
    try {
      for (const part of pathParts) {
        if (current && typeof current === 'object' && part in current) {
          current = current[part]
        } else {
          current = null
          break
        }
      }
      
      if (current && typeof current === 'object' && 
          (current.t_statistic || current.tStatistic || current.p_value || current.pValue)) {
        result = current
        break
      }
    } catch (e) {
      continue
    }
  }

  return result
}

/**
 * 獲取檢定類型描述
 * @param {Object} result - 統計結果
 * @returns {string} 檢定類型描述
 */
function getTestTypeDescription(result) {
  if (result.paired === true) {
    return '配對樣本 t 檢定'
  } else if (result.sample2 || result.group2) {
    return '獨立樣本 t 檢定'  
  } else {
    return '單樣本 t 檢定'
  }
}

/**
 * 格式化數字
 * @param {number} num - 數字
 * @returns {string} 格式化後的數字
 */
function formatNumber(num) {
  if (num === null || num === undefined) return 'N/A'
  if (typeof num !== 'number') return String(num)
  
  if (Math.abs(num) < 0.001) {
    return num.toExponential(3)
  } else {
    return num.toFixed(4)
  }
}

/**
 * 格式化 p 值
 * @param {number} pValue - p 值
 * @returns {string} 格式化後的 p 值
 */
function formatPValue(pValue) {
  if (pValue === null || pValue === undefined) return 'N/A'
  if (typeof pValue !== 'number') return String(pValue)
  
  if (pValue < 0.001) {
    return 'p < 0.001'
  } else if (pValue < 0.01) {
    return `p = ${pValue.toFixed(3)}`
  } else {
    return `p = ${pValue.toFixed(3)}`
  }
}

/**
 * 格式化信賴區間
 * @param {Array|Object} ci - 信賴區間
 * @returns {string} 格式化後的信賴區間
 */
function formatConfidenceInterval(ci) {
  if (!ci) return null
  
  if (Array.isArray(ci) && ci.length === 2) {
    return `[${formatNumber(ci[0])}, ${formatNumber(ci[1])}]`
  }
  
  if (ci.lower !== undefined && ci.upper !== undefined) {
    return `[${formatNumber(ci.lower)}, ${formatNumber(ci.upper)}]`
  }
  
  return String(ci)
}

/**
 * 生成結論
 * @param {Object} result - 統計結果
 * @returns {string} 結論文本
 */
function generateConclusion(result) {
  const pValue = result.p_value || result.pValue
  const alpha = result.alpha || 0.05
  const isSignificant = pValue < alpha
  
  if (isSignificant) {
    return `在 ${(alpha * 100).toFixed(0)}% 顯著性水準下，結果具有統計顯著性 (p < ${alpha})`
  } else {
    return `在 ${(alpha * 100).toFixed(0)}% 顯著性水準下，結果不具統計顯著性 (p ≥ ${alpha})`
  }
}

/**
 * 生成詳細解釋
 * @param {Object} result - 統計結果
 * @returns {string} 解釋文本
 */
function generateExplanation(result) {
  const testType = getTestTypeDescription(result)
  const pValue = result.p_value || result.pValue
  const tStat = result.t_statistic || result.tStatistic
  const isSignificant = pValue < (result.alpha || 0.05)
  
  let explanation = `透過${testType}分析，`
  
  if (isSignificant) {
    explanation += `發現統計上的顯著差異。t 統計量為 ${formatNumber(tStat)}，`
    explanation += `p 值為 ${formatPValue(pValue)}，表示觀察到的差異不太可能是由隨機因素造成的。`
  } else {
    explanation += `未發現統計上的顯著差異。t 統計量為 ${formatNumber(tStat)}，`
    explanation += `p 值為 ${formatPValue(pValue)}，表示觀察到的差異可能是由隨機因素造成的。`
  }
  
  return explanation
}

/**
 * 生成建議
 * @param {Object} result - 統計結果
 * @returns {Array} 建議列表
 */
function generateRecommendations(result) {
  const recommendations = []
  const isSignificant = (result.p_value || result.pValue) < (result.alpha || 0.05)
  
  if (isSignificant) {
    recommendations.push({
      type: 'action',
      icon: ICONS['success'],
      title: '結果顯著',
      description: '可以拒絕虛無假設，結果具有實際意義。建議進一步分析效應大小和實際應用價值。'
    })
    
    recommendations.push({
      type: 'validation', 
      icon: ICONS['info'],
      title: '驗證建議',
      description: '考慮增加樣本數量或重複實驗來驗證結果的穩定性。'
    })
  } else {
    recommendations.push({
      type: 'interpretation',
      icon: ICONS['warning'], 
      title: '結果不顯著',
      description: '無法拒絕虛無假設，但這不代表沒有差異存在。可能需要更大的樣本數量或不同的研究設計。'
    })
    
    recommendations.push({
      type: 'improvement',
      icon: ICONS['info'],
      title: '改進建議', 
      description: '檢查數據品質、增加樣本數量，或考慮使用非參數檢定方法。'
    })
  }
  
  // 添加效應大小建議
  recommendations.push({
    type: 'effect-size',
    icon: ICONS['info'],
    title: '效應大小分析',
    description: '建議計算 Cohen\'s d 或其他效應大小指標，以評估差異的實際重要性。'
  })
  
  return recommendations
}

/**
 * 創建錯誤結果
 * @param {string} errorMessage - 錯誤訊息
 * @returns {Object} 錯誤結果格式
 */
function createErrorResult(errorMessage) {
  return {
    toolName: 'perform_ttest',
    sections: [{
      type: 'error',
      icon: ICONS['warning'],
      title: '❌ 解析錯誤',
      content: {
        error: errorMessage,
        suggestions: [
          '檢查工具調用結果的數據格式',
          '確認統計分析已正確執行',
          '聯繫技術支援以獲得協助'
        ]
      }
    }],
    metadata: {
      timestamp: new Date().toISOString(),
      resultType: 'error'
    }
  }
}

/**
 * 通用統計結果解析器
 * @param {Object} toolCall - 工具調用對象
 * @returns {Object|null} 解析後的流式數據，如果不支援則返回 null
 */
export function parseStatisticalResult(toolCall) {
  const toolName = toolCall.toolName || toolCall.name
  
  switch (toolName) {
    case 'perform_ttest':
      return parsePerformTTestResult(toolCall.result)
    
    // 未來可以添加其他統計工具的解析器
    case 'perform_anova':
      // return parsePerformAnovaResult(toolCall.result)
      break
      
    case 'correlation_analysis':
      // return parseCorrelationResult(toolCall.result) 
      break
      
    default:
      return null
  }
}

/**
 * 檢查工具是否支援流式展示
 * @param {string} toolName - 工具名稱
 * @returns {boolean} 是否支援
 */
export function isStreamingSupported(toolName) {
  const supportedTools = ['perform_ttest', 'perform_anova', 'correlation_analysis']
  return supportedTools.includes(toolName)
}

export default {
  parsePerformTTestResult,
  parseStatisticalResult,
  isStreamingSupported
} 