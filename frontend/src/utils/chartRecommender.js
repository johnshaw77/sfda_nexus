/**
 * 圖表推薦器 - 智能圖表類型推薦
 * 基於數據特徵和最佳實踐推薦最適合的圖表類型
 */

class ChartRecommender {
  constructor() {
    // 圖表適用性規則
    this.rules = [
      {
        type: "pie",
        label: "餅圖",
        conditions: [
          { field: "recordCount", operator: "<=", value: 10 },
          { field: "hasCategories", operator: "===", value: true },
          { field: "hasNumbers", operator: "===", value: true },
          { field: "dataType", operator: "===", value: "keyValue" },
        ],
        baseScore: 90,
        description: "適合展示部分與整體的關係",
      },
      {
        type: "bar",
        label: "柱狀圖",
        conditions: [
          { field: "hasCategories", operator: "===", value: true },
          { field: "hasNumbers", operator: "===", value: true },
        ],
        baseScore: 85,
        description: "適合比較不同類別的數值",
      },
      {
        type: "line",
        label: "折線圖",
        conditions: [
          { field: "hasTime", operator: "===", value: true },
          { field: "hasNumbers", operator: "===", value: true },
        ],
        baseScore: 95,
        description: "適合展示趨勢和時間序列數據",
      },
      {
        type: "line",
        label: "折線圖",
        conditions: [
          { field: "recordCount", operator: ">=", value: 5 },
          { field: "hasNumbers", operator: "===", value: true },
          { field: "dataType", operator: "===", value: "objectArray" },
        ],
        baseScore: 80,
        description: "適合展示數據趨勢",
      },
      {
        type: "scatter",
        label: "散點圖",
        conditions: [
          { field: "measures", operator: "length>=", value: 2 },
          { field: "recordCount", operator: ">=", value: 10 },
        ],
        baseScore: 75,
        description: "適合分析兩個變量之間的關係",
      },
      {
        type: "radar",
        label: "雷達圖",
        conditions: [
          { field: "measures", operator: "length>=", value: 3 },
          { field: "measures", operator: "length<=", value: 8 },
        ],
        baseScore: 70,
        description: "適合多維度數據比較",
      },
      {
        type: "gauge",
        label: "儀表盤",
        conditions: [
          { field: "measures", operator: "length===", value: 1 },
          { field: "recordCount", operator: "<=", value: 5 },
        ],
        baseScore: 65,
        description: "適合單一指標的展示",
      },
      {
        type: "funnel",
        label: "漏斗圖",
        conditions: [
          { field: "recordCount", operator: ">=", value: 3 },
          { field: "recordCount", operator: "<=", value: 7 },
          { field: "hasNumbers", operator: "===", value: true },
        ],
        baseScore: 60,
        description: "適合展示流程各階段的轉化情況",
      },
    ];

    // 數據特徵加分規則
    this.bonusRules = [
      // 餅圖加分規則
      {
        chartType: "pie",
        conditions: [{ field: "recordCount", operator: "<=", value: 6 }],
        bonus: 10,
        reason: "數據項目較少，餅圖視覺效果更佳",
      },

      // 柱狀圖加分規則
      {
        chartType: "bar",
        conditions: [
          { field: "recordCount", operator: ">=", value: 3 },
          { field: "recordCount", operator: "<=", value: 15 },
        ],
        bonus: 10,
        reason: "數據量適中，柱狀圖比較效果最佳",
      },

      // 折線圖加分規則
      {
        chartType: "line",
        conditions: [{ field: "hasTime", operator: "===", value: true }],
        bonus: 15,
        reason: "時間序列數據，折線圖最能體現趨勢",
      },

      // 散點圖加分規則
      {
        chartType: "scatter",
        conditions: [{ field: "recordCount", operator: ">=", value: 20 }],
        bonus: 10,
        reason: "大量數據點，散點圖能更好展示分布",
      },
    ];

    // 數據特徵減分規則
    this.penaltyRules = [
      // 餅圖減分規則
      {
        chartType: "pie",
        conditions: [{ field: "recordCount", operator: ">", value: 8 }],
        penalty: 20,
        reason: "數據項目過多，餅圖會變得難以閱讀",
      },

      // 雷達圖減分規則
      {
        chartType: "radar",
        conditions: [{ field: "measures", operator: "length>", value: 6 }],
        penalty: 15,
        reason: "維度過多，雷達圖會變得複雜",
      },

      // 儀表盤減分規則
      {
        chartType: "gauge",
        conditions: [{ field: "recordCount", operator: ">", value: 1 }],
        penalty: 25,
        reason: "多個數據項目，儀表盤不適合",
      },
    ];
  }

  /**
   * 主要推薦方法
   * @param {Object} dataAnalysis 數據分析結果
   * @returns {Array} 推薦的圖表類型數組，按評分排序
   */
  recommend(dataAnalysis) {
    try {
      const recommendations = [];

      // 遍歷所有規則，計算每種圖表類型的得分
      for (const rule of this.rules) {
        if (this.matchesConditions(dataAnalysis, rule.conditions)) {
          let score = rule.baseScore;

          // 計算加分
          const bonus = this.calculateBonus(rule.type, dataAnalysis);
          score += bonus;

          // 計算減分
          const penalty = this.calculatePenalty(rule.type, dataAnalysis);
          score -= penalty;

          // 確保分數在合理範圍內
          score = Math.max(0, Math.min(100, score));

          recommendations.push({
            type: rule.type,
            label: rule.label,
            score: score,
            description: rule.description,
            reasoning: this.generateReasoning(
              rule,
              dataAnalysis,
              bonus,
              penalty
            ),
          });
        }
      }

      // 按分數排序並去重
      const uniqueRecommendations =
        this.deduplicateRecommendations(recommendations);
      return uniqueRecommendations.sort((a, b) => b.score - a.score);
    } catch (error) {
      console.error("圖表推薦錯誤:", error);
      // 返回默認推薦
      return this.getDefaultRecommendations();
    }
  }

  /**
   * 檢查數據是否符合條件
   */
  matchesConditions(dataAnalysis, conditions) {
    return conditions.every((condition) => {
      const value = this.getFieldValue(dataAnalysis, condition.field);
      return this.evaluateCondition(value, condition.operator, condition.value);
    });
  }

  /**
   * 獲取數據分析中的字段值
   */
  getFieldValue(dataAnalysis, field) {
    if (field.includes(".")) {
      // 支援嵌套字段，如 'measures.length'
      const parts = field.split(".");
      let value = dataAnalysis;
      for (const part of parts) {
        value = value?.[part];
      }
      return value;
    }
    return dataAnalysis[field];
  }

  /**
   * 評估條件
   */
  evaluateCondition(value, operator, expected) {
    switch (operator) {
      case "===":
        return value === expected;
      case "!==":
        return value !== expected;
      case ">":
        return value > expected;
      case ">=":
        return value >= expected;
      case "<":
        return value < expected;
      case "<=":
        return value <= expected;
      case "length>=":
        return Array.isArray(value) && value.length >= expected;
      case "length<=":
        return Array.isArray(value) && value.length <= expected;
      case "length===":
        return Array.isArray(value) && value.length === expected;
      case "length>":
        return Array.isArray(value) && value.length > expected;
      case "includes":
        return Array.isArray(value) && value.includes(expected);
      default:
        console.warn(`未知的操作符: ${operator}`);
        return false;
    }
  }

  /**
   * 計算加分
   */
  calculateBonus(chartType, dataAnalysis) {
    let totalBonus = 0;

    for (const rule of this.bonusRules) {
      if (
        rule.chartType === chartType &&
        this.matchesConditions(dataAnalysis, rule.conditions)
      ) {
        totalBonus += rule.bonus;
      }
    }

    return totalBonus;
  }

  /**
   * 計算減分
   */
  calculatePenalty(chartType, dataAnalysis) {
    let totalPenalty = 0;

    for (const rule of this.penaltyRules) {
      if (
        rule.chartType === chartType &&
        this.matchesConditions(dataAnalysis, rule.conditions)
      ) {
        totalPenalty += rule.penalty;
      }
    }

    return totalPenalty;
  }

  /**
   * 生成推薦理由
   */
  generateReasoning(rule, dataAnalysis, bonus, penalty) {
    const reasons = [rule.description];

    // 添加加分理由
    for (const bonusRule of this.bonusRules) {
      if (
        bonusRule.chartType === rule.type &&
        this.matchesConditions(dataAnalysis, bonusRule.conditions)
      ) {
        reasons.push(`✓ ${bonusRule.reason}`);
      }
    }

    // 添加減分理由
    for (const penaltyRule of this.penaltyRules) {
      if (
        penaltyRule.chartType === rule.type &&
        this.matchesConditions(dataAnalysis, penaltyRule.conditions)
      ) {
        reasons.push(`⚠ ${penaltyRule.reason}`);
      }
    }

    return reasons.join(" | ");
  }

  /**
   * 去除重複推薦
   */
  deduplicateRecommendations(recommendations) {
    const seen = new Set();
    return recommendations.filter((rec) => {
      if (seen.has(rec.type)) {
        return false;
      }
      seen.add(rec.type);
      return true;
    });
  }

  /**
   * 獲取默認推薦
   */
  getDefaultRecommendations() {
    return [
      {
        type: "bar",
        label: "柱狀圖",
        score: 80,
        description: "通用的數據比較圖表",
        reasoning: "默認推薦，適合大多數數據類型",
      },
      {
        type: "line",
        label: "折線圖",
        score: 75,
        description: "適合展示趨勢變化",
        reasoning: "備選方案，適合序列數據",
      },
      {
        type: "pie",
        label: "餅圖",
        score: 70,
        description: "適合展示比例關係",
        reasoning: "備選方案，適合分類數據",
      },
    ];
  }

  /**
   * 獲取特定場景的推薦
   * @param {string} scenario 場景類型
   * @param {Object} dataAnalysis 數據分析結果
   * @returns {Array} 推薦列表
   */
  getScenarioRecommendations(scenario, dataAnalysis) {
    const scenarioRules = {
      comparison: ["bar", "line"], // 比較場景
      distribution: ["pie", "funnel"], // 分布場景
      trend: ["line", "bar"], // 趨勢場景
      correlation: ["scatter", "line"], // 相關性場景
      composition: ["pie", "bar"], // 組成場景
      performance: ["gauge", "bar"], // 績效場景
    };

    const allowedTypes = scenarioRules[scenario] || Object.keys(this.rules);
    const allRecommendations = this.recommend(dataAnalysis);

    return allRecommendations.filter((rec) => allowedTypes.includes(rec.type));
  }

  /**
   * 獲取圖表類型的詳細信息
   * @param {string} chartType 圖表類型
   * @returns {Object} 圖表詳細信息
   */
  getChartTypeInfo(chartType) {
    const infoMap = {
      bar: {
        name: "柱狀圖",
        bestFor: "比較不同類別的數值大小",
        advantages: ["直觀易懂", "適合比較", "支援多系列"],
        disadvantages: ["不適合連續數據", "類別過多時擁擠"],
        dataRequirements: "分類數據 + 數值數據",
      },
      line: {
        name: "折線圖",
        bestFor: "展示數據隨時間的變化趨勢",
        advantages: ["趨勢明顯", "適合時間序列", "可顯示多條線"],
        disadvantages: ["不適合離散數據", "交叉過多時混亂"],
        dataRequirements: "連續數據（特別是時間序列）+ 數值數據",
      },
      pie: {
        name: "餅圖",
        bestFor: "展示各部分在整體中的占比",
        advantages: ["比例直觀", "整體感強", "視覺衝擊力強"],
        disadvantages: ["不適合多類別", "難以精確比較", "不適合時間序列"],
        dataRequirements: "分類數據 + 比例數據（建議 ≤ 7 個類別）",
      },
      scatter: {
        name: "散點圖",
        bestFor: "分析兩個變量之間的相關關係",
        advantages: ["相關性明顯", "適合大數據量", "可識別異常值"],
        disadvantages: ["需要兩個數值變量", "不適合分類數據"],
        dataRequirements: "兩個數值變量 + 足夠的數據點（建議 ≥ 10 個）",
      },
      radar: {
        name: "雷達圖",
        bestFor: "多維度數據的綜合比較",
        advantages: ["多維度對比", "整體性能一目了然", "適合評估比較"],
        disadvantages: ["維度過多時複雜", "不適合差異過大的數據"],
        dataRequirements: "3-8 個數值維度",
      },
      gauge: {
        name: "儀表盤",
        bestFor: "單一指標的達成情況展示",
        advantages: ["目標導向明確", "視覺效果突出", "易於理解"],
        disadvantages: ["只適合單一指標", "信息量有限"],
        dataRequirements: "單一數值指標 + 目標值或範圍",
      },
      funnel: {
        name: "漏斗圖",
        bestFor: "展示業務流程各階段的轉化情況",
        advantages: ["流程清晰", "轉化率明顯", "問題定位容易"],
        disadvantages: ["只適合流程數據", "階段不宜過多"],
        dataRequirements: "3-7 個有序階段的數值數據",
      },
    };

    return infoMap[chartType] || null;
  }
}

// 創建並導出實例
export const chartRecommender = new ChartRecommender();
export default chartRecommender;
