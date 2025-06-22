/**
 * MCP 統計分析適配器
 * 專門處理來自 MCP 統計服務的結果，生成專業的統計圖表
 */
export class McpStatisticalAdapter {
  constructor() {
    this.supportedTools = [
      "perform_ttest",
      "perform_anova",
      "analyze_data",
      "parse_csv_ttest",
      "descriptive_stats",
      "correlation_analysis",
    ];

    this.statisticalTerms = this.initializeStatisticalTerms();
  }

  /**
   * 初始化統計術語中文化對照表
   */
  initializeStatisticalTerms() {
    return {
      // T 檢定相關
      t_statistic: "T 統計量",
      p_value: "P 值",
      degrees_of_freedom: "自由度",
      confidence_interval: "信賴區間",
      mean_difference: "平均值差異",
      std_error: "標準誤",
      effect_size: "效應量",

      // ANOVA 相關
      f_statistic: "F 統計量",
      between_groups_variance: "組間變異",
      within_groups_variance: "組內變異",
      sum_of_squares: "平方和",
      mean_squares: "均方",

      // 描述性統計
      mean: "平均值",
      median: "中位數",
      mode: "眾數",
      std: "標準差",
      std_dev: "標準差",
      variance: "變異數",
      min: "最小值",
      max: "最大值",
      range: "全距",
      quartile: "四分位數",
      skewness: "偏度",
      kurtosis: "峰度",

      // 相關性分析
      correlation: "相關係數",
      pearson_correlation: "Pearson 相關係數",
      spearman_correlation: "Spearman 相關係數",
      correlation_matrix: "相關矩陣",

      // 組別標籤
      group1: "組別一",
      group2: "組別二",
      control_group: "控制組",
      treatment_group: "實驗組",

      // 統計結論
      significant: "顯著",
      not_significant: "不顯著",
      reject_null: "拒絕虛無假設",
      fail_to_reject: "無法拒絕虛無假設",
    };
  }

  /**
   * 檢測是否為 MCP 統計結果
   * @param {Object} data - 數據對象
   * @returns {boolean} 是否為統計結果
   */
  isStatisticalData(data) {
    if (!data || typeof data !== "object") {
      return false;
    }

    // 檢查是否包含工具調用信息
    if (data.tool && this.supportedTools.includes(data.tool)) {
      return true;
    }

    // 檢查是否包含統計關鍵詞
    const keys = Object.keys(data);
    const statisticalKeys = Object.keys(this.statisticalTerms);

    const hasStatisticalKeys = keys.some(
      (key) =>
        statisticalKeys.includes(key) ||
        key.includes("statistic") ||
        key.includes("p_value") ||
        key.includes("confidence")
    );

    return hasStatisticalKeys;
  }

  /**
   * 適配統計結果為圖表數據
   * @param {Object} statisticalResult - 統計分析結果
   * @returns {Object} 適配後的圖表數據結構
   */
  adaptStatisticalResult(statisticalResult) {
    if (!this.isStatisticalData(statisticalResult)) {
      throw new Error("非統計分析數據");
    }

    const result = {
      success: false,
      charts: [],
      summary: null,
      metadata: {
        source: "mcp_statistical",
        tool: statisticalResult.tool || "unknown",
        adaptedAt: Date.now(),
      },
    };

    try {
      // 根據工具類型適配不同的圖表
      const tool =
        statisticalResult.tool || this.detectToolType(statisticalResult);

      switch (tool) {
        case "perform_ttest":
          result.charts = this.adaptTTestResult(statisticalResult);
          break;

        case "perform_anova":
          result.charts = this.adaptAnovaResult(statisticalResult);
          break;

        case "analyze_data":
        case "descriptive_stats":
          result.charts = this.adaptDescriptiveStats(statisticalResult);
          break;

        case "correlation_analysis":
          result.charts = this.adaptCorrelationAnalysis(statisticalResult);
          break;

        case "parse_csv_ttest":
          result.charts = this.adaptCsvTTestResult(statisticalResult);
          break;

        default:
          result.charts = this.adaptGenericStatisticalResult(statisticalResult);
      }

      // 生成統計摘要
      result.summary = this.generateStatisticalSummary(statisticalResult, tool);
      result.success = result.charts.length > 0;
    } catch (error) {
      result.error = `統計數據適配失敗：${error.message}`;
    }

    return result;
  }

  /**
   * 適配 T 檢定結果
   * @param {Object} data - T 檢定結果
   * @returns {Array} 圖表配置陣列
   */
  adaptTTestResult(data) {
    const charts = [];

    // 1. T 統計量和 P 值儀表盤
    if (data.t_statistic !== undefined && data.p_value !== undefined) {
      charts.push({
        type: "gauge",
        title: "T 檢定統計量",
        data: {
          value: Math.abs(data.t_statistic),
          name: "T 統計量",
          max: Math.max(4, Math.abs(data.t_statistic) * 1.2),
        },
        options: {
          detail: {
            formatter: `T = ${data.t_statistic.toFixed(3)}\nP = ${data.p_value.toFixed(4)}`,
          },
        },
      });

      // P 值顯著性儀表盤
      charts.push({
        type: "gauge",
        title: "P 值顯著性",
        data: {
          value: data.p_value,
          name: "P 值",
          max: 1,
        },
        options: {
          axisLine: {
            lineStyle: {
              width: 30,
              color: [
                [0.05, "#67C23A"], // 顯著
                [0.1, "#E6A23C"], // 邊緣顯著
                [1, "#F56C6C"], // 不顯著
              ],
            },
          },
          detail: {
            formatter: data.p_value < 0.05 ? "顯著" : "不顯著",
          },
        },
      });
    }

    // 2. 組別比較柱狀圖
    if (data.group1_mean !== undefined && data.group2_mean !== undefined) {
      const groupData = [
        { name: data.group1_name || "組別一", value: data.group1_mean },
        { name: data.group2_name || "組別二", value: data.group2_mean },
      ];

      charts.push({
        type: "bar",
        title: "組別平均值比較",
        data: groupData,
        options: {
          yAxis: {
            name: "平均值",
          },
        },
      });
    }

    // 3. 信賴區間圖
    if (data.confidence_interval && Array.isArray(data.confidence_interval)) {
      const [lower, upper] = data.confidence_interval;
      const mean = data.mean_difference || (upper + lower) / 2;

      charts.push({
        type: "bar",
        title: `${data.confidence_level || 95}% 信賴區間`,
        data: [{ name: "平均值差異", value: mean }],
        options: {
          series: [
            {
              type: "bar",
              data: [
                {
                  value: mean,
                  itemStyle: {
                    color: data.p_value < 0.05 ? "#67C23A" : "#E6A23C",
                  },
                },
              ],
              errorBar: {
                data: [[lower - mean, upper - mean]],
              },
            },
          ],
        },
      });
    }

    return charts;
  }

  /**
   * 適配 ANOVA 結果
   * @param {Object} data - ANOVA 結果
   * @returns {Array} 圖表配置陣列
   */
  adaptAnovaResult(data) {
    const charts = [];

    // F 統計量儀表盤
    if (data.f_statistic !== undefined && data.p_value !== undefined) {
      charts.push({
        type: "gauge",
        title: "ANOVA F 檢定",
        data: {
          value: data.f_statistic,
          name: "F 統計量",
          max: Math.max(10, data.f_statistic * 1.2),
        },
        options: {
          detail: {
            formatter: `F = ${data.f_statistic.toFixed(3)}\nP = ${data.p_value.toFixed(4)}`,
          },
        },
      });
    }

    // 組別平均值比較
    if (data.group_means && typeof data.group_means === "object") {
      const groupData = Object.entries(data.group_means).map(
        ([name, value]) => ({
          name: name,
          value: value,
        })
      );

      charts.push({
        type: "bar",
        title: "組別平均值比較",
        data: groupData,
        options: {
          yAxis: {
            name: "平均值",
          },
        },
      });
    }

    // 變異分解圖
    if (data.sum_of_squares) {
      const varianceData = [
        { name: "組間變異", value: data.sum_of_squares.between || 0 },
        { name: "組內變異", value: data.sum_of_squares.within || 0 },
      ];

      charts.push({
        type: "pie",
        title: "變異分解",
        data: varianceData,
      });
    }

    return charts;
  }

  /**
   * 適配描述性統計結果
   * @param {Object} data - 描述性統計結果
   * @returns {Array} 圖表配置陣列
   */
  adaptDescriptiveStats(data) {
    const charts = [];

    // 基本統計量雷達圖
    const basicStats = [];
    const statsMapping = {
      mean: "平均值",
      median: "中位數",
      std: "標準差",
      min: "最小值",
      max: "最大值",
    };

    Object.entries(statsMapping).forEach(([key, label]) => {
      if (data[key] !== undefined) {
        basicStats.push({
          name: label,
          value: data[key],
        });
      }
    });

    if (basicStats.length > 0) {
      charts.push({
        type: "radar",
        title: "描述性統計概覽",
        data: [basicStats],
        options: {
          radar: {
            indicator: basicStats.map((item) => ({
              name: item.name,
              max: Math.max(...basicStats.map((s) => s.value)) * 1.2,
            })),
          },
        },
      });
    }

    // 分布特徵柱狀圖
    if (data.distribution && Array.isArray(data.distribution)) {
      charts.push({
        type: "bar",
        title: "數據分布",
        data: data.distribution.map((value, index) => ({
          name: `區間 ${index + 1}`,
          value: value,
        })),
      });
    }

    // 四分位數箱型圖（使用柱狀圖模擬）
    if (data.quartiles) {
      const quartileData = [
        { name: "Q1", value: data.quartiles.q1 || 0 },
        { name: "Q2 (中位數)", value: data.quartiles.q2 || data.median || 0 },
        { name: "Q3", value: data.quartiles.q3 || 0 },
      ];

      charts.push({
        type: "bar",
        title: "四分位數分析",
        data: quartileData,
      });
    }

    return charts;
  }

  /**
   * 適配相關性分析結果
   * @param {Object} data - 相關性分析結果
   * @returns {Array} 圖表配置陣列
   */
  adaptCorrelationAnalysis(data) {
    const charts = [];

    // 相關係數矩陣熱力圖
    if (data.correlation_matrix) {
      const matrix = data.correlation_matrix;
      const variables = Object.keys(matrix);

      const heatmapData = [];
      variables.forEach((var1, i) => {
        variables.forEach((var2, j) => {
          heatmapData.push([i, j, matrix[var1][var2] || 0]);
        });
      });

      charts.push({
        type: "heatmap",
        title: "相關係數矩陣",
        data: heatmapData,
        options: {
          xAxis: {
            type: "category",
            data: variables,
          },
          yAxis: {
            type: "category",
            data: variables,
          },
          visualMap: {
            min: -1,
            max: 1,
            calculable: true,
            orient: "horizontal",
            left: "center",
            bottom: "15%",
            inRange: {
              color: [
                "#313695",
                "#4575b4",
                "#74add1",
                "#abd9e9",
                "#e0f3f8",
                "#ffffcc",
                "#fee090",
                "#fdae61",
                "#f46d43",
                "#d73027",
                "#a50026",
              ],
            },
          },
        },
      });
    }

    // 單一相關係數顯示
    if (data.correlation !== undefined && data.variables) {
      charts.push({
        type: "gauge",
        title: `${data.variables[0]} vs ${data.variables[1]} 相關性`,
        data: {
          value: Math.abs(data.correlation),
          name: "相關強度",
          max: 1,
        },
        options: {
          detail: {
            formatter: `r = ${data.correlation.toFixed(3)}`,
          },
        },
      });
    }

    return charts;
  }

  /**
   * 適配 CSV T 檢定結果
   * @param {Object} data - CSV T 檢定結果
   * @returns {Array} 圖表配置陣列
   */
  adaptCsvTTestResult(data) {
    // CSV T 檢定基本上和普通 T 檢定一樣
    return this.adaptTTestResult(data);
  }

  /**
   * 適配通用統計結果
   * @param {Object} data - 統計結果
   * @returns {Array} 圖表配置陣列
   */
  adaptGenericStatisticalResult(data) {
    const charts = [];

    // 提取所有數值型數據
    const numericData = [];
    Object.entries(data).forEach(([key, value]) => {
      if (typeof value === "number" && !isNaN(value)) {
        const label = this.statisticalTerms[key] || key;
        numericData.push({
          name: label,
          value: value,
        });
      }
    });

    if (numericData.length > 0) {
      charts.push({
        type: "bar",
        title: "統計結果",
        data: numericData,
      });
    }

    return charts;
  }

  /**
   * 檢測工具類型
   * @param {Object} data - 統計數據
   * @returns {string} 工具類型
   */
  detectToolType(data) {
    const keys = Object.keys(data);

    if (keys.includes("t_statistic") && keys.includes("p_value")) {
      return "perform_ttest";
    }

    if (keys.includes("f_statistic")) {
      return "perform_anova";
    }

    if (keys.includes("correlation_matrix") || keys.includes("correlation")) {
      return "correlation_analysis";
    }

    if (keys.includes("mean") && keys.includes("std")) {
      return "descriptive_stats";
    }

    return "unknown";
  }

  /**
   * 生成統計摘要
   * @param {Object} data - 統計數據
   * @param {string} tool - 工具類型
   * @returns {Object} 統計摘要
   */
  generateStatisticalSummary(data, tool) {
    const summary = {
      tool: tool,
      title: this.getToolTitle(tool),
      conclusion: "",
      keyResults: [],
      interpretation: "",
    };

    switch (tool) {
      case "perform_ttest":
        summary.conclusion =
          data.p_value < 0.05 ? "結果具有統計顯著性" : "結果無統計顯著性";
        summary.keyResults = [
          `T 統計量: ${data.t_statistic?.toFixed(3) || "N/A"}`,
          `P 值: ${data.p_value?.toFixed(4) || "N/A"}`,
          `效應量: ${data.effect_size?.toFixed(3) || "N/A"}`,
        ];
        summary.interpretation =
          data.p_value < 0.05
            ? "兩組之間存在顯著差異，拒絕虛無假設"
            : "無足夠證據證明兩組之間存在差異";
        break;

      case "perform_anova":
        summary.conclusion =
          data.p_value < 0.05 ? "組別間存在顯著差異" : "組別間無顯著差異";
        summary.keyResults = [
          `F 統計量: ${data.f_statistic?.toFixed(3) || "N/A"}`,
          `P 值: ${data.p_value?.toFixed(4) || "N/A"}`,
          `自由度: ${data.degrees_of_freedom || "N/A"}`,
        ];
        break;

      case "descriptive_stats":
        summary.conclusion = "數據描述性統計分析完成";
        summary.keyResults = [
          `平均值: ${data.mean?.toFixed(3) || "N/A"}`,
          `標準差: ${data.std?.toFixed(3) || "N/A"}`,
          `樣本數: ${data.count || "N/A"}`,
        ];
        break;

      case "correlation_analysis":
        const corrValue = data.correlation;
        let corrStrength = "無相關";
        if (Math.abs(corrValue) > 0.7) corrStrength = "強相關";
        else if (Math.abs(corrValue) > 0.3) corrStrength = "中等相關";
        else if (Math.abs(corrValue) > 0.1) corrStrength = "弱相關";

        summary.conclusion = `變數間呈現${corrStrength}關係`;
        summary.keyResults = [
          `相關係數: ${corrValue?.toFixed(3) || "N/A"}`,
          `相關強度: ${corrStrength}`,
          `P 值: ${data.p_value?.toFixed(4) || "N/A"}`,
        ];
        break;
    }

    return summary;
  }

  /**
   * 獲取工具標題
   * @param {string} tool - 工具名稱
   * @returns {string} 中文標題
   */
  getToolTitle(tool) {
    const titles = {
      perform_ttest: "T 檢定分析",
      perform_anova: "變異數分析 (ANOVA)",
      analyze_data: "數據分析",
      descriptive_stats: "描述性統計",
      correlation_analysis: "相關性分析",
      parse_csv_ttest: "CSV T 檢定分析",
    };

    return titles[tool] || "統計分析";
  }

  /**
   * 統一適配入口
   * @param {Object} mcpResult - MCP 工具調用結果
   * @returns {Object} 適配後的結果
   */
  adaptMcpResult(mcpResult) {
    try {
      if (!this.isStatisticalData(mcpResult)) {
        throw new Error("非 MCP 統計分析結果");
      }

      return this.adaptStatisticalResult(mcpResult);
    } catch (error) {
      return {
        success: false,
        error: error.message,
        charts: [],
        metadata: {
          source: "mcp_statistical",
          adaptedAt: Date.now(),
        },
      };
    }
  }
}

// 創建單例實例
export const mcpStatisticalAdapter = new McpStatisticalAdapter();

// 便捷方法
export const adaptMcpStatisticalResult = (result) =>
  mcpStatisticalAdapter.adaptMcpResult(result);

export const isStatisticalResult = (data) =>
  mcpStatisticalAdapter.isStatisticalData(data);
