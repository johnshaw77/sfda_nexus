/**
 * 統計分析格式化器
 * 專門處理統計相關工具的數據格式化
 */

import { BaseFormatter } from "../base/BaseFormatter.js";
import fieldMapper from "../base/FieldMapper.js";

export default class StatisticalFormatter extends BaseFormatter {
  constructor() {
    super();
    this.category = "statistical_analysis";
    this.supportedTools = [
      "create_boxplot",
      "create-boxplot",
      "create_histogram",
      "create-histogram",
      "create_scatter",
      "create-scatter",
      "perform_ttest",
      "perform-ttest",
      "perform_anova",
      "perform-anova",
      "perform_chisquare",
      "perform-chisquare",
      "perform_kruskal_wallis",
      "perform-kruskal-wallis",
      "perform_mann_whitney",
      "perform-mann-whitney",
      "perform_wilcoxon",
      "perform-wilcoxon",
    ];
  }

  /**
   * 檢查是否支援該工具
   * @param {string} toolName - 工具名稱
   * @param {string} toolType - 工具類型
   * @returns {boolean}
   */
  canHandle(toolName, toolType = null) {
    const toolNameLower = toolName.toLowerCase();

    // 檢查是否在支援的工具列表中
    if (this.supportedTools.includes(toolName)) {
      return true;
    }

    // 檢查工具名稱是否包含統計關鍵字
    if (
      toolNameLower.includes("stat") ||
      toolNameLower.includes("chart") ||
      toolNameLower.includes("plot") ||
      toolNameLower.includes("boxplot") ||
      toolNameLower.includes("histogram") ||
      toolNameLower.includes("scatter") ||
      toolNameLower.includes("ttest") ||
      toolNameLower.includes("anova") ||
      toolNameLower.includes("chisquare") ||
      toolNameLower.includes("kruskal") ||
      toolNameLower.includes("wilcoxon") ||
      toolNameLower.includes("mann")
    ) {
      return true;
    }

    // 檢查工具類型
    if (toolType === this.category || toolType === "stat") {
      return true;
    }

    return false;
  }

  /**
   * 格式化工具結果
   * @param {Object} data - 工具結果數據
   * @param {string} toolName - 工具名稱
   * @param {Object} context - 格式化上下文
   * @returns {string} 格式化後的文本
   */
  format(data, toolName, context = {}) {
    if (!data) {
      return "無統計分析數據";
    }

    // 檢查是否為錯誤回應
    if (this.isErrorResponse(data)) {
      return this.formatErrorResponse(data, toolName);
    }

    this.debug(`開始格式化統計工具結果`, {
      toolName,
      dataType: typeof data,
    });

    // 🔧 AI 指導提示詞處理（過濾掉 base64 數據）
    const aiInstructions = this.processAIInstructions(data.aiInstructions);
    const cleanedData = this.createCleanDataForAI(data);

    try {
      // 根據工具名稱決定格式化方式
      if (toolName.includes("boxplot")) {
        return this.formatBoxplotResult(data, toolName);
      } else if (toolName.includes("histogram")) {
        return this.formatHistogramResult(data, toolName);
      } else if (toolName.includes("scatter")) {
        return this.formatScatterResult(data, toolName);
      } else if (toolName.includes("ttest")) {
        return this.formatTTestResult(data, toolName);
      } else if (toolName.includes("anova")) {
        return this.formatAnovaResult(data, toolName);
      } else if (toolName.includes("chisquare")) {
        return this.formatChiSquareResult(data, toolName);
      } else if (toolName.includes("kruskal")) {
        return this.formatKruskalWallisResult(data, toolName);
      } else if (toolName.includes("mann") || toolName.includes("whitney")) {
        return this.formatMannWhitneyResult(data, toolName);
      } else if (toolName.includes("wilcoxon")) {
        return this.formatWilcoxonResult(data, toolName);
      } else {
        return this.formatGeneralStatResult(data, toolName);
      }
    } catch (error) {
      this.error(`格式化統計結果時發生錯誤 (${toolName})`, error);
      return this.formatFallback(data, toolName);
    }
  }

  /**
   * 格式化盒鬚圖結果
   * @param {Object} data - 盒鬚圖數據
   * @param {string} toolName - 工具名稱
   * @returns {string} 格式化的盒鬚圖分析報告
   */
  formatBoxplotResult(data, toolName) {
    let formatted = "## 📊 盒鬚圖分析結果\n\n";

    // 成功狀態檢查
    if (data.success === false) {
      return this.formatErrorResponse(data, toolName);
    }

    // 🧠 AI 指導提示詞處理
    const aiInstructions = this.processAIInstructions(data.aiInstructions);
    if (aiInstructions) {
      formatted += "### 🧠 AI 分析指導\n";
      formatted += `${aiInstructions}\n\n`;
      formatted += "---\n\n";
    }

    // 基本資訊
    if (data.title || data._meta?.title) {
      const title = data.title || data._meta?.title;
      formatted += `### 📈 ${title}\n\n`;
    }

    // 🖼️ 嵌入圖片
    formatted += this.generateImageMarkdown(data, "盒鬚圖");

    // 統計分析摘要
    if (data._meta?.reasoning || data.reasoning) {
      formatted += "### 🔍 分析摘要\n";
      formatted += `${data._meta?.reasoning || data.reasoning}\n\n`;
    }

    // 數據摘要
    if (data._meta?.chart_data?.data || data.data) {
      const chartData = data._meta?.chart_data?.data || data.data;
      formatted += this.formatBoxplotDataSummary(chartData);
    }

    // 比較分析
    if (data._meta?.comparison_analysis || data.comparison_analysis) {
      formatted += this.formatComparisonAnalysis(
        data._meta?.comparison_analysis || data.comparison_analysis
      );
    }

    // 統計量資訊
    if (data._meta?.group_statistics || data.group_statistics) {
      formatted += this.formatGroupStatistics(
        data._meta?.group_statistics || data.group_statistics
      );
    }

    // 工具執行資訊
    //formatted += this.formatToolExecutionInfo(data);

    // 🧹 清理過的數據供 AI 分析（避免 base64 干擾）
    const cleanedData = this.createCleanDataForAI(data);
    // formatted += this.formatCleanDataSection(cleanedData);

    return formatted;
  }

  /**
   * 🖼️ 生成圖片嵌入的 markdown
   * @param {Object} data - 統計數據
   * @param {string} defaultChartType - 預設圖表類型
   * @returns {string} 包含圖片的 markdown 字符串
   */
  generateImageMarkdown(data, defaultChartType = "統計圖表") {
    const hasImage = this.checkImageGeneration(data);
    let markdown = "";

    if (hasImage.success) {
      markdown += "✅ **圖表生成成功**\n\n";

      // 🖼️ 直接嵌入圖片到 markdown
      if (hasImage.base64Data) {
        const imageDataUrl = hasImage.base64Data.startsWith("data:image")
          ? hasImage.base64Data
          : `data:image/${hasImage.imageFormat || "png"};base64,${hasImage.base64Data}`;

        markdown += `![${hasImage.chartType || defaultChartType}](${imageDataUrl})\n\n`;
      }

      // 圖表類型和格式資訊
      if (hasImage.chartType) {
        markdown += `📋 **圖表類型**: ${hasImage.chartType}\n`;
      }
      if (hasImage.imageFormat) {
        markdown += `🖼️ **圖片格式**: ${hasImage.imageFormat.toUpperCase()}\n`;
      }
      if (hasImage.imageSize) {
        markdown += `📏 **圖片大小**: ${hasImage.imageSize}\n`;
      }
      markdown += "\n";
    } else {
      markdown += "⚠️ **圖表生成失敗** - 僅提供數據分析\n\n";
    }

    return markdown;
  }

  /**
   * 🧹 創建清理過的數據供 AI 分析（移除 base64 等大數據）
   * @param {Object} data - 原始數據
   * @returns {Object} 清理後的數據
   */
  createCleanDataForAI(data) {
    if (!data || typeof data !== "object") return data;

    const cleaned = JSON.parse(JSON.stringify(data));

    // 遞歸清理函數
    const cleanObject = (obj) => {
      if (!obj || typeof obj !== "object") return obj;

      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === "string") {
          // 移除 base64 數據（通常很長）
          if (
            key.includes("base64") ||
            key.includes("image_data") ||
            (value.length > 1000 && value.match(/^[A-Za-z0-9+/=]+$/))
          ) {
            obj[key] = `[${value.length} 字符的 base64 數據已隱藏]`;
          }
        } else if (typeof value === "object") {
          cleanObject(value);
        }
      }
    };

    cleanObject(cleaned);
    return cleaned;
  }

  /**
   * 格式化清理過的數據區段
   * @param {Object} cleanedData - 清理過的數據
   * @returns {string} 格式化的數據區段
   */
  formatCleanDataSection(cleanedData) {
    if (!cleanedData) return "";

    let formatted = "### 📋 原始工具數據\n\n";
    formatted += "```json\n";
    formatted += JSON.stringify(cleanedData, null, 2);
    formatted += "\n```\n\n";

    return formatted;
  }

  /**
   * 格式化盒鬚圖數據摘要
   * @param {Array} chartData - 圖表數據
   * @returns {string} 格式化的數據摘要
   */
  formatBoxplotDataSummary(chartData) {
    if (!Array.isArray(chartData) || chartData.length === 0) {
      return "";
    }

    let formatted = "### 📋 數據摘要\n\n";

    chartData.forEach((group, index) => {
      if (group.group && group.count !== undefined) {
        formatted += `**${group.group}**:\n`;
        formatted += `- 樣本數: ${group.count} 個\n`;

        if (group.median !== undefined) {
          formatted += `- 中位數: ${this.formatNumber(group.median, 2)}\n`;
        }
        if (group.mean !== undefined) {
          formatted += `- 平均值: ${this.formatNumber(group.mean, 2)}\n`;
        }
        if (group.q1 !== undefined && group.q3 !== undefined) {
          formatted += `- 四分位距: ${this.formatNumber(group.q1, 2)} ~ ${this.formatNumber(group.q3, 2)}\n`;
        }
        if (
          group.lower_whisker !== undefined &&
          group.upper_whisker !== undefined
        ) {
          formatted += `- 數據範圍: ${this.formatNumber(group.lower_whisker, 2)} ~ ${this.formatNumber(group.upper_whisker, 2)}\n`;
        }
        if (Array.isArray(group.outliers) && group.outliers.length > 0) {
          formatted += `- 異常值: ${group.outliers.length} 個 (${group.outliers.map((v) => this.formatNumber(v, 2)).join(", ")})\n`;
        }
        formatted += "\n";
      }
    });

    return formatted;
  }

  /**
   * 格式化比較分析
   * @param {Object} comparison - 比較分析數據
   * @returns {string} 格式化的比較分析
   */
  formatComparisonAnalysis(comparison) {
    if (!comparison) return "";

    let formatted = "### 🔍 組間比較分析\n\n";

    if (comparison.highest_median_group) {
      formatted += `🏆 **最高中位數組別**: ${comparison.highest_median_group}\n`;
    }
    if (comparison.lowest_median_group) {
      formatted += `📉 **最低中位數組別**: ${comparison.lowest_median_group}\n`;
    }
    if (comparison.most_variable_group) {
      formatted += `📊 **變異最大組別**: ${comparison.most_variable_group}\n`;
    }
    if (comparison.most_stable_group) {
      formatted += `⚖️ **最穩定組別**: ${comparison.most_stable_group}\n`;
    }

    formatted += "\n";
    return formatted;
  }

  /**
   * 格式化組群統計
   * @param {Array} groupStats - 組群統計數據
   * @returns {string} 格式化的組群統計
   */
  formatGroupStatistics(groupStats) {
    if (!Array.isArray(groupStats) || groupStats.length === 0) {
      return "";
    }

    let formatted = "### 📊 詳細統計量\n\n";

    // 建立表格標題
    formatted += "| 組別 | 樣本數 | 中位數 | 平均值 | 標準差 | 四分位距 |\n";
    formatted += "|------|--------|---------|---------|---------|----------|\n";

    groupStats.forEach((stat) => {
      formatted += `| ${stat.group || "未知"} `;
      formatted += `| ${stat.count || "N/A"} `;
      formatted += `| ${this.formatNumber(stat.median, 2)} `;
      formatted += `| ${this.formatNumber(stat.mean, 2)} `;
      formatted += `| ${this.formatNumber(stat.std, 2)} `;
      formatted += `| ${this.formatNumber(stat.iqr, 2)} |\n`;
    });

    formatted += "\n";
    return formatted;
  }

  /**
   * 格式化直方圖結果
   * @param {Object} data - 直方圖數據
   * @param {string} toolName - 工具名稱
   * @returns {string} 格式化的直方圖分析報告
   */
  formatHistogramResult(data, toolName) {
    let formatted = "## 📊 直方圖分析結果\n\n";

    if (data.success === false) {
      return this.formatErrorResponse(data, toolName);
    }

    // 基本資訊
    if (data.title) {
      formatted += `### 📈 ${data.title}\n\n`;
    }

    // 🖼️ 嵌入圖片
    formatted += this.generateImageMarkdown(data, "直方圖");

    // 分佈分析
    if (data.distribution_analysis) {
      formatted += "### 📋 分佈特性分析\n\n";
      const dist = data.distribution_analysis;

      if (dist.mean !== undefined) {
        formatted += `- **平均值**: ${this.formatNumber(dist.mean, 2)}\n`;
      }
      if (dist.median !== undefined) {
        formatted += `- **中位數**: ${this.formatNumber(dist.median, 2)}\n`;
      }
      if (dist.std !== undefined) {
        formatted += `- **標準差**: ${this.formatNumber(dist.std, 2)}\n`;
      }
      if (dist.skewness !== undefined) {
        formatted += `- **偏態值**: ${this.formatNumber(dist.skewness, 3)}\n`;
      }
      if (dist.kurtosis !== undefined) {
        formatted += `- **峰態值**: ${this.formatNumber(dist.kurtosis, 3)}\n`;
      }
      formatted += "\n";
    }

    // 工具執行資訊
    formatted += this.formatToolExecutionInfo(data);

    return formatted;
  }

  /**
   * 格式化散點圖結果
   * @param {Object} data - 散點圖數據
   * @param {string} toolName - 工具名稱
   * @returns {string} 格式化的散點圖分析報告
   */
  formatScatterResult(data, toolName) {
    let formatted = "## 📊 散點圖分析結果\n\n";

    if (data.success === false) {
      return this.formatErrorResponse(data, toolName);
    }

    // 基本資訊
    if (data.title) {
      formatted += `### 📈 ${data.title}\n\n`;
    }

    // 🖼️ 嵌入圖片
    formatted += this.generateImageMarkdown(data, "散點圖");

    // 相關性分析
    if (data.correlation_analysis) {
      formatted += "### 🔍 相關性分析\n\n";
      const corr = data.correlation_analysis;

      if (corr.correlation !== undefined) {
        formatted += `- **皮爾森相關係數**: ${this.formatNumber(corr.correlation, 4)}\n`;
      }
      if (corr.correlation_strength) {
        formatted += `- **相關強度**: ${corr.correlation_strength}\n`;
      }
      if (corr.p_value !== undefined) {
        formatted += `- **顯著性 p 值**: ${this.formatNumber(corr.p_value, 4)}\n`;
      }
      formatted += "\n";
    }

    // 迴歸分析
    if (data.regression_analysis) {
      formatted += "### 📈 迴歸分析\n\n";
      const reg = data.regression_analysis;

      if (reg.slope !== undefined) {
        formatted += `- **斜率**: ${this.formatNumber(reg.slope, 4)}\n`;
      }
      if (reg.intercept !== undefined) {
        formatted += `- **截距**: ${this.formatNumber(reg.intercept, 4)}\n`;
      }
      if (reg.r_squared !== undefined) {
        formatted += `- **決定係數 (R²)**: ${this.formatNumber(reg.r_squared, 4)}\n`;
      }
      if (reg.equation) {
        formatted += `- **迴歸方程式**: ${reg.equation}\n`;
      }
      formatted += "\n";
    }

    // 工具執行資訊
    formatted += this.formatToolExecutionInfo(data);

    return formatted;
  }

  /**
   * 格式化 t 檢定結果
   * @param {Object} data - t 檢定數據
   * @param {string} toolName - 工具名稱
   * @returns {string} 格式化的 t 檢定報告
   */
  formatTTestResult(data, toolName) {
    let formatted = "## 📊 t 檢定分析結果\n\n";

    if (data.success === false) {
      return this.formatErrorResponse(data, toolName);
    }

    // 檢定基本資訊
    if (data.test_type) {
      formatted += `### 🔍 檢定類型: ${data.test_type}\n\n`;
    }

    // 統計結果
    if (data.statistical_results) {
      formatted += "### 📋 統計檢定結果\n\n";
      const stats = data.statistical_results;

      if (stats.t_statistic !== undefined) {
        formatted += `- **t 統計量**: ${this.formatNumber(stats.t_statistic, 4)}\n`;
      }
      if (stats.degrees_of_freedom !== undefined) {
        formatted += `- **自由度**: ${stats.degrees_of_freedom}\n`;
      }
      if (stats.p_value !== undefined) {
        formatted += `- **p 值**: ${this.formatNumber(stats.p_value, 6)}\n`;
      }
      if (stats.alpha !== undefined) {
        formatted += `- **顯著水準**: ${stats.alpha}\n`;
      }
      if (stats.significant !== undefined) {
        formatted += `- **是否顯著**: ${stats.significant ? "是" : "否"}\n`;
      }
      formatted += "\n";
    }

    // 描述性統計
    if (data.descriptive_stats) {
      formatted += this.formatDescriptiveStats(data.descriptive_stats);
    }

    // 結論
    if (data.conclusion) {
      formatted += "### 💡 統計結論\n\n";
      formatted += `${data.conclusion}\n\n`;
    }

    // 工具執行資訊
    formatted += this.formatToolExecutionInfo(data);

    return formatted;
  }

  /**
   * 格式化 ANOVA 結果
   * @param {Object} data - ANOVA 數據
   * @param {string} toolName - 工具名稱
   * @returns {string} 格式化的 ANOVA 報告
   */
  formatAnovaResult(data, toolName) {
    let formatted = "## 📊 變異數分析 (ANOVA) 結果\n\n";

    if (data.success === false) {
      return this.formatErrorResponse(data, toolName);
    }

    // 統計結果
    if (data.statistical_results) {
      formatted += "### 📋 ANOVA 統計結果\n\n";
      const stats = data.statistical_results;

      if (stats.f_statistic !== undefined) {
        formatted += `- **F 統計量**: ${this.formatNumber(stats.f_statistic, 4)}\n`;
      }
      if (stats.p_value !== undefined) {
        formatted += `- **p 值**: ${this.formatNumber(stats.p_value, 6)}\n`;
      }
      if (stats.degrees_of_freedom) {
        formatted += `- **自由度**: ${stats.degrees_of_freedom.between} (組間), ${stats.degrees_of_freedom.within} (組內)\n`;
      }
      if (stats.significant !== undefined) {
        formatted += `- **是否顯著**: ${stats.significant ? "是" : "否"}\n`;
      }
      formatted += "\n";
    }

    // 組間比較
    if (data.group_comparisons) {
      formatted += "### 🔍 組間比較\n\n";
      data.group_comparisons.forEach((comp) => {
        formatted += `**${comp.group1} vs ${comp.group2}**: `;
        formatted += `差異 = ${this.formatNumber(comp.mean_difference, 3)}, `;
        formatted += `p = ${this.formatNumber(comp.p_value, 4)}\n`;
      });
      formatted += "\n";
    }

    // 描述性統計
    if (data.descriptive_stats) {
      formatted += this.formatDescriptiveStats(data.descriptive_stats);
    }

    // 結論
    if (data.conclusion) {
      formatted += "### 💡 統計結論\n\n";
      formatted += `${data.conclusion}\n\n`;
    }

    // 工具執行資訊
    formatted += this.formatToolExecutionInfo(data);

    return formatted;
  }

  /**
   * 格式化描述性統計
   * @param {Object} descriptiveStats - 描述性統計數據
   * @returns {string} 格式化的描述性統計
   */
  formatDescriptiveStats(descriptiveStats) {
    let formatted = "### 📊 描述性統計\n\n";

    if (Array.isArray(descriptiveStats)) {
      // 多組統計
      formatted += "| 組別 | 樣本數 | 平均值 | 標準差 | 最小值 | 最大值 |\n";
      formatted +=
        "|------|--------|---------|---------|---------|----------|\n";

      descriptiveStats.forEach((stat) => {
        formatted += `| ${stat.group || "未知"} `;
        formatted += `| ${stat.count || "N/A"} `;
        formatted += `| ${this.formatNumber(stat.mean, 3)} `;
        formatted += `| ${this.formatNumber(stat.std, 3)} `;
        formatted += `| ${this.formatNumber(stat.min, 3)} `;
        formatted += `| ${this.formatNumber(stat.max, 3)} |\n`;
      });
    } else {
      // 單組統計
      if (descriptiveStats.mean !== undefined) {
        formatted += `- **平均值**: ${this.formatNumber(descriptiveStats.mean, 3)}\n`;
      }
      if (descriptiveStats.std !== undefined) {
        formatted += `- **標準差**: ${this.formatNumber(descriptiveStats.std, 3)}\n`;
      }
      if (descriptiveStats.count !== undefined) {
        formatted += `- **樣本數**: ${descriptiveStats.count}\n`;
      }
    }

    formatted += "\n";
    return formatted;
  }

  /**
   * 格式化卡方檢定結果
   * @param {Object} data - 卡方檢定數據
   * @param {string} toolName - 工具名稱
   * @returns {string} 格式化的卡方檢定報告
   */
  formatChiSquareResult(data, toolName) {
    let formatted = "## 📊 卡方檢定分析結果\n\n";

    if (data.success === false) {
      return this.formatErrorResponse(data, toolName);
    }

    // 統計結果
    if (data.statistical_results) {
      formatted += "### 📋 卡方檢定結果\n\n";
      const stats = data.statistical_results;

      if (stats.chi2_statistic !== undefined) {
        formatted += `- **卡方統計量**: ${this.formatNumber(stats.chi2_statistic, 4)}\n`;
      }
      if (stats.p_value !== undefined) {
        formatted += `- **p 值**: ${this.formatNumber(stats.p_value, 6)}\n`;
      }
      if (stats.degrees_of_freedom !== undefined) {
        formatted += `- **自由度**: ${stats.degrees_of_freedom}\n`;
      }
      if (stats.significant !== undefined) {
        formatted += `- **是否顯著**: ${stats.significant ? "是" : "否"}\n`;
      }
      formatted += "\n";
    }

    // 列聯表
    if (data.contingency_table) {
      formatted += "### 📋 觀察值列聯表\n\n";
      formatted += this.formatContingencyTable(
        data.contingency_table,
        data.row_labels,
        data.col_labels
      );
    }

    // 期望值表
    if (data.expected_frequencies) {
      formatted += "### 📋 期望值列聯表\n\n";
      formatted += this.formatContingencyTable(
        data.expected_frequencies,
        data.row_labels,
        data.col_labels
      );
    }

    // 結論
    if (data.conclusion) {
      formatted += "### 💡 統計結論\n\n";
      formatted += `${data.conclusion}\n\n`;
    }

    // 工具執行資訊
    formatted += this.formatToolExecutionInfo(data);

    return formatted;
  }

  /**
   * 格式化列聯表
   * @param {Array} table - 列聯表數據
   * @param {Array} rowLabels - 行標籤
   * @param {Array} colLabels - 列標籤
   * @returns {string} 格式化的列聯表
   */
  formatContingencyTable(table, rowLabels = [], colLabels = []) {
    if (!Array.isArray(table) || table.length === 0) {
      return "無列聯表數據\n\n";
    }

    let formatted = "";

    // 標題行
    formatted += "|";
    if (colLabels.length > 0) {
      formatted += " | " + colLabels.join(" | ") + " |\n";
    } else {
      formatted +=
        Array.from({ length: table[0].length }, (_, i) => ` 列${i + 1}`).join(
          " |"
        ) + " |\n";
    }

    // 分隔行
    formatted +=
      "|" +
      Array.from(
        { length: (colLabels.length || table[0].length) + 1 },
        () => "------"
      ).join("|") +
      "|\n";

    // 數據行
    table.forEach((row, i) => {
      const rowLabel = rowLabels[i] || `行${i + 1}`;
      formatted += `| ${rowLabel} |`;
      row.forEach((cell) => {
        formatted += ` ${this.formatNumber(cell, 2)} |`;
      });
      formatted += "\n";
    });

    formatted += "\n";
    return formatted;
  }

  /**
   * 格式化 Kruskal-Wallis 檢定結果
   * @param {Object} data - Kruskal-Wallis 數據
   * @param {string} toolName - 工具名稱
   * @returns {string} 格式化報告
   */
  formatKruskalWallisResult(data, toolName) {
    let formatted = "## 📊 Kruskal-Wallis 檢定結果\n\n";

    if (data.success === false) {
      return this.formatErrorResponse(data, toolName);
    }

    // 統計結果
    if (data.statistical_results) {
      formatted += "### 📋 Kruskal-Wallis 統計結果\n\n";
      const stats = data.statistical_results;

      if (stats.h_statistic !== undefined) {
        formatted += `- **H 統計量**: ${this.formatNumber(stats.h_statistic, 4)}\n`;
      }
      if (stats.p_value !== undefined) {
        formatted += `- **p 值**: ${this.formatNumber(stats.p_value, 6)}\n`;
      }
      if (stats.degrees_of_freedom !== undefined) {
        formatted += `- **自由度**: ${stats.degrees_of_freedom}\n`;
      }
      if (stats.significant !== undefined) {
        formatted += `- **是否顯著**: ${stats.significant ? "是" : "否"}\n`;
      }
      formatted += "\n";
    }

    // 描述性統計
    if (data.descriptive_stats) {
      formatted += this.formatDescriptiveStats(data.descriptive_stats);
    }

    // 結論
    if (data.conclusion) {
      formatted += "### 💡 統計結論\n\n";
      formatted += `${data.conclusion}\n\n`;
    }

    // 工具執行資訊
    formatted += this.formatToolExecutionInfo(data);

    return formatted;
  }

  /**
   * 格式化 Mann-Whitney 檢定結果
   * @param {Object} data - Mann-Whitney 數據
   * @param {string} toolName - 工具名稱
   * @returns {string} 格式化報告
   */
  formatMannWhitneyResult(data, toolName) {
    let formatted = "## 📊 Mann-Whitney U 檢定結果\n\n";

    if (data.success === false) {
      return this.formatErrorResponse(data, toolName);
    }

    // 統計結果
    if (data.statistical_results) {
      formatted += "### 📋 Mann-Whitney U 統計結果\n\n";
      const stats = data.statistical_results;

      if (stats.u_statistic !== undefined) {
        formatted += `- **U 統計量**: ${this.formatNumber(stats.u_statistic, 4)}\n`;
      }
      if (stats.p_value !== undefined) {
        formatted += `- **p 值**: ${this.formatNumber(stats.p_value, 6)}\n`;
      }
      if (stats.significant !== undefined) {
        formatted += `- **是否顯著**: ${stats.significant ? "是" : "否"}\n`;
      }
      formatted += "\n";
    }

    // 描述性統計
    if (data.descriptive_stats) {
      formatted += this.formatDescriptiveStats(data.descriptive_stats);
    }

    // 結論
    if (data.conclusion) {
      formatted += "### 💡 統計結論\n\n";
      formatted += `${data.conclusion}\n\n`;
    }

    // 工具執行資訊
    formatted += this.formatToolExecutionInfo(data);

    return formatted;
  }

  /**
   * 格式化 Wilcoxon 檢定結果
   * @param {Object} data - Wilcoxon 數據
   * @param {string} toolName - 工具名稱
   * @returns {string} 格式化報告
   */
  formatWilcoxonResult(data, toolName) {
    let formatted = "## 📊 Wilcoxon 符號秩檢定結果\n\n";

    if (data.success === false) {
      return this.formatErrorResponse(data, toolName);
    }

    // 統計結果
    if (data.statistical_results) {
      formatted += "### 📋 Wilcoxon 統計結果\n\n";
      const stats = data.statistical_results;

      if (stats.w_statistic !== undefined) {
        formatted += `- **W 統計量**: ${this.formatNumber(stats.w_statistic, 4)}\n`;
      }
      if (stats.p_value !== undefined) {
        formatted += `- **p 值**: ${this.formatNumber(stats.p_value, 6)}\n`;
      }
      if (stats.significant !== undefined) {
        formatted += `- **是否顯著**: ${stats.significant ? "是" : "否"}\n`;
      }
      formatted += "\n";
    }

    // 描述性統計
    if (data.descriptive_stats) {
      formatted += this.formatDescriptiveStats(data.descriptive_stats);
    }

    // 結論
    if (data.conclusion) {
      formatted += "### 💡 統計結論\n\n";
      formatted += `${data.conclusion}\n\n`;
    }

    // 工具執行資訊
    formatted += this.formatToolExecutionInfo(data);

    return formatted;
  }

  /**
   * 格式化工具執行資訊
   * @param {Object} data - 工具數據
   * @returns {string} 格式化的執行資訊
   */
  formatToolExecutionInfo(data) {
    let formatted = "### ⚙️ 執行資訊\n\n";

    if (data.service_name) {
      formatted += `- **服務**: ${data.service_name}\n`;
    }
    if (data.tool_name) {
      formatted += `- **工具**: ${data.tool_name}\n`;
    }
    if (data.module) {
      formatted += `- **模組**: ${data.module}\n`;
    }
    if (data.timestamp) {
      formatted += `- **執行時間**: ${this.formatTimestamp(data.timestamp)}\n`;
    }
    if (data.success !== undefined) {
      formatted += `- **執行狀態**: ${data.success ? "成功" : "失敗"}\n`;
    }

    formatted += "\n";
    return formatted;
  }

  /**
   * 格式化通用統計結果
   * @param {Object} data - 通用數據
   * @param {string} toolName - 工具名稱
   * @returns {string} 格式化的通用結果
   */
  formatGeneralStatResult(data, toolName) {
    let formatted = "## 📊 統計分析結果\n\n";

    if (data.success === false) {
      return this.formatErrorResponse(data, toolName);
    }

    formatted += `### 🔧 工具: ${toolName}\n\n`;

    // 基本結果展示
    if (typeof data === "object" && data !== null) {
      Object.entries(data).forEach(([key, value]) => {
        if (
          key !== "success" &&
          key !== "timestamp" &&
          value !== null &&
          value !== undefined
        ) {
          const label = this.formatKey(key);
          formatted += `- **${label}**: ${this.formatValue(value)}\n`;
        }
      });
    }

    // 工具執行資訊
    formatted += this.formatToolExecutionInfo(data);

    return formatted;
  }

  /**
   * 格式化鍵名
   * @param {string} key - 鍵名
   * @returns {string} 格式化的鍵名
   */
  formatKey(key) {
    const keyMap = {
      chart_type: "圖表類型",
      has_image: "包含圖片",
      image_format: "圖片格式",
      title: "標題",
      reasoning: "分析說明",
      conclusion: "結論",
      statistical_results: "統計結果",
      descriptive_stats: "描述性統計",
      p_value: "p 值",
      significant: "顯著性",
    };

    return keyMap[key] || key;
  }

  /**
   * 格式化值
   * @param {*} value - 值
   * @returns {string} 格式化的值
   */
  formatValue(value) {
    if (typeof value === "boolean") {
      return value ? "是" : "否";
    }
    if (typeof value === "number") {
      return this.formatNumber(value, 4);
    }
    if (Array.isArray(value)) {
      return `陣列 (${value.length} 項)`;
    }
    if (typeof value === "object" && value !== null) {
      return "物件";
    }
    return value.toString();
  }

  /**
   * 檢查圖片生成狀態 - 多層級檢查
   * @param {Object} data - 工具返回的數據
   * @returns {Object} 圖片生成狀態和相關信息
   */
  checkImageGeneration(data) {
    this.debug("檢查圖片生成狀態", {
      hasHasImage: !!data.has_image,
      hasImageData: !!data.image_data,
      hasMetaHasImage: !!data._meta?.has_image,
      hasDataHasImage: !!data.data?.has_image,
      dataKeys: Object.keys(data),
      metaKeys: data._meta ? Object.keys(data._meta) : null,
    });

    // 檢查多個可能的位置
    const imageChecks = [
      // 直接在根層級
      {
        success: data.has_image || data.hasImage || false,
        base64:
          data.image_data?.base64 ||
          data.imageData?.base64 ||
          data.image_data ||
          data.imageData ||
          data.image_base64,
        format: data.image_format || data.imageFormat,
        type: data.chart_type || data.chartType,
      },
      // 在 _meta 層級
      {
        success: data._meta?.has_image || data._meta?.hasImage || false,
        base64:
          data._meta?.image_data?.base64 ||
          data._meta?.imageData?.base64 ||
          data._meta?.image_data ||
          data._meta?.imageData,
        format: data._meta?.image_format || data._meta?.imageFormat,
        type: data._meta?.chart_type || data._meta?.chartType,
      },
      // 在 data 層級
      {
        success: data.data?.has_image || data.data?.hasImage || false,
        base64:
          data.data?.image_data?.base64 ||
          data.data?.imageData?.base64 ||
          data.data?.image_data ||
          data.data?.imageData,
        format: data.data?.image_format || data.data?.imageFormat,
        type: data.data?.chart_type || data.data?.chartType,
      },
    ];

    // 找到第一個成功的圖片檢查結果
    for (const check of imageChecks) {
      if (check.success || check.base64) {
        return {
          success: true,
          chartType: check.type || "盒鬚圖",
          imageFormat: check.format || "png",
          imageSize: check.base64 ? this.estimateImageSize(check.base64) : null,
          hasBase64: !!check.base64,
          base64Data: check.base64 || null, // 🔧 新增：返回實際的 base64 數據
        };
      }
    }

    // 如果都沒有找到圖片，檢查是否有其他成功指標
    if (data.success === true || data.success === undefined) {
      // 數據存在且沒有明確的失敗標記，可能圖片生成了但字段名不同
      this.debug("未找到明確的圖片狀態，但工具執行成功", { data });
      return {
        success: false,
        chartType: "盒鬚圖",
        imageFormat: "未知",
        imageSize: null,
        hasBase64: false,
      };
    }

    return {
      success: false,
      chartType: null,
      imageFormat: null,
      imageSize: null,
      hasBase64: false,
    };
  }

  /**
   * 估算圖片大小
   * @param {string} base64String - base64 編碼的圖片字符串
   * @returns {string} 估算的圖片大小
   */
  estimateImageSize(base64String) {
    if (!base64String) return null;

    try {
      // 移除 data:image/png;base64, 前綴
      const base64Data = base64String.replace(
        /^data:image\/[a-z]+;base64,/,
        ""
      );
      const sizeInBytes = (base64Data.length * 3) / 4;

      if (sizeInBytes < 1024) {
        return `${Math.round(sizeInBytes)} B`;
      } else if (sizeInBytes < 1024 * 1024) {
        return `${Math.round(sizeInBytes / 1024)} KB`;
      } else {
        return `${Math.round((sizeInBytes / (1024 * 1024)) * 100) / 100} MB`;
      }
    } catch (error) {
      return null;
    }
  }

  /**
   * 檢查是否為錯誤回應
   * @param {Object} data - 數據
   * @returns {boolean} 是否為錯誤回應
   */
  isErrorResponse(data) {
    if (data.success === false) return true;
    if (data.error) return true;
    return false;
  }

  /**
   * 格式化錯誤回應
   * @param {Object} data - 錯誤數據
   * @param {string} toolName - 工具名稱
   * @returns {string} 錯誤訊息
   */
  formatErrorResponse(data, toolName) {
    let formatted = `## ❌ 統計分析執行錯誤\n\n`;

    if (data.error) {
      formatted += `**錯誤訊息**: ${data.error}\n\n`;
    }

    formatted += `**工具**: ${toolName}\n`;
    formatted += `**建議**: 請檢查輸入數據格式是否正確，或聯繫系統管理員。\n\n`;

    return formatted;
  }

  /**
   * 後備格式化方法
   * @param {Object} data - 數據
   * @param {string} toolName - 工具名稱
   * @returns {string} 格式化的後備結果
   */
  formatFallback(data, toolName) {
    let formatted = `## ⚠️ 統計工具執行結果 (${toolName})\n\n`;
    formatted += "工具執行完成，但格式化時發生錯誤。以下是原始數據：\n\n";

    try {
      if (typeof data === "string") {
        formatted += data;
      } else {
        formatted += "```json\n" + JSON.stringify(data, null, 2) + "\n```";
      }
    } catch (error) {
      formatted += "無法顯示數據內容。";
    }

    return formatted;
  }
}
