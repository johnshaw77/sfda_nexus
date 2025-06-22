/**
 * 圖表服務 - 核心圖表處理邏輯
 * 負責數據處理、圖表配置生成、類型推薦等功能
 */

import {
  isArray,
  isObject,
  isNumber,
  uniq,
  maxBy,
  minBy,
  mean,
  sum,
} from "lodash";
import { dataProcessor } from "@/utils/dataProcessor";
import { chartRecommender } from "@/utils/chartRecommender";

class ChartService {
  constructor() {
    this.defaultColors = {
      light: [
        "#5470c6",
        "#91cc75",
        "#fac858",
        "#ee6666",
        "#73c0de",
        "#3ba272",
        "#fc8452",
        "#9a60b4",
        "#ea7ccc",
        "#ff9f7f",
      ],
      dark: [
        "#4992ff",
        "#7cffb2",
        "#fddd60",
        "#ff6e6e",
        "#58d9f9",
        "#05c091",
        "#ff8a45",
        "#8d48e3",
        "#dd79ff",
        "#f68c5d",
      ],
    };

    this.chartTypes = {
      bar: { label: "柱狀圖", icon: "BarChart" },
      line: { label: "折線圖", icon: "LineChart" },
      pie: { label: "餅圖", icon: "PieChart" },
      scatter: { label: "散點圖", icon: "ScatterChart" },
      radar: { label: "雷達圖", icon: "RadarChart" },
      gauge: { label: "儀表盤", icon: "GaugeChart" },
      funnel: { label: "漏斗圖", icon: "FunnelChart" },
    };
  }

  /**
   * 主要圖表生成方法
   * @param {Object} params 生成參數
   * @param {Array|Object} params.data 原始數據
   * @param {string} params.chartType 圖表類型
   * @param {Object} params.config 額外配置
   * @param {string} params.theme 主題 (light/dark)
   * @returns {Object} 圖表配置結果
   */
  async generateChart({
    data,
    chartType = "auto",
    config = {},
    theme = "light",
  }) {
    try {
      // 1. 數據預處理和驗證
      const processedData = await dataProcessor.process(data);

      if (
        !processedData ||
        (!isArray(processedData) && !isObject(processedData))
      ) {
        throw new Error("無效的數據格式");
      }

      // 2. 數據分析
      const dataAnalysis = this.analyzeData(processedData);

      // 3. 圖表類型推薦 (如果是 auto 模式)
      let finalChartType = chartType;
      let suggestions = [];

      if (chartType === "auto") {
        suggestions = chartRecommender.recommend(dataAnalysis);
        finalChartType = suggestions[0]?.type || "bar";
      } else {
        suggestions = chartRecommender
          .recommend(dataAnalysis)
          .filter((s) => s.type !== chartType);
        suggestions.unshift({
          type: chartType,
          label: this.chartTypes[chartType]?.label,
          score: 100,
        });
      }

      // 4. 生成圖表配置
      const option = this.generateChartOption(
        processedData,
        finalChartType,
        dataAnalysis,
        theme,
        config
      );

      // 5. 生成表格數據
      const { tableData, tableColumns } = this.generateTableData(
        processedData,
        dataAnalysis
      );

      return {
        option,
        suggestions,
        tableData,
        tableColumns,
        dataAnalysis,
        chartType: finalChartType,
      };
    } catch (error) {
      console.error("圖表生成錯誤:", error);
      throw new Error(`圖表生成失敗: ${error.message}`);
    }
  }

  /**
   * 分析數據特徵
   * @param {Array|Object} data 處理後的數據
   * @returns {Object} 數據分析結果
   */
  analyzeData(data) {
    const analysis = {
      dataType: "unknown",
      recordCount: 0,
      dimensions: [],
      measures: [],
      hasTime: false,
      hasCategories: false,
      hasNumbers: false,
      structure: "unknown",
    };

    try {
      if (isArray(data)) {
        analysis.recordCount = data.length;
        analysis.structure = "array";

        if (data.length > 0) {
          const firstItem = data[0];

          if (isObject(firstItem)) {
            // 對象數組格式
            analysis.dataType = "objectArray";
            const keys = Object.keys(firstItem);

            keys.forEach((key) => {
              const values = data
                .map((item) => item[key])
                .filter((v) => v != null);
              const sample = values[0];

              if (
                isNumber(sample) ||
                (!isNaN(Number(sample)) && sample !== "")
              ) {
                analysis.measures.push({
                  name: key,
                  type: "number",
                  min: Math.min(...values.map(Number)),
                  max: Math.max(...values.map(Number)),
                  avg: mean(values.map(Number)),
                });
                analysis.hasNumbers = true;
              } else if (this.isTimeField(key, sample)) {
                analysis.dimensions.push({
                  name: key,
                  type: "time",
                  unique: uniq(values).length,
                });
                analysis.hasTime = true;
              } else {
                analysis.dimensions.push({
                  name: key,
                  type: "category",
                  unique: uniq(values).length,
                });
                analysis.hasCategories = true;
              }
            });
          } else {
            // 簡單數組格式
            analysis.dataType = "simpleArray";
            if (data.every((item) => isNumber(item) || !isNaN(Number(item)))) {
              analysis.hasNumbers = true;
              analysis.measures.push({
                name: "value",
                type: "number",
                min: Math.min(...data.map(Number)),
                max: Math.max(...data.map(Number)),
                avg: mean(data.map(Number)),
              });
            } else {
              analysis.hasCategories = true;
              analysis.dimensions.push({
                name: "category",
                type: "category",
                unique: uniq(data).length,
              });
            }
          }
        }
      } else if (isObject(data)) {
        // 對象格式
        analysis.structure = "object";
        analysis.dataType = "keyValue";
        const keys = Object.keys(data);
        analysis.recordCount = keys.length;

        const values = Object.values(data);
        if (values.every((v) => isNumber(v) || !isNaN(Number(v)))) {
          analysis.hasNumbers = true;
          analysis.hasCategories = true;
          analysis.measures.push({
            name: "value",
            type: "number",
            min: Math.min(...values.map(Number)),
            max: Math.max(...values.map(Number)),
            avg: mean(values.map(Number)),
          });
          analysis.dimensions.push({
            name: "key",
            type: "category",
            unique: keys.length,
          });
        }
      }
    } catch (error) {
      console.error("數據分析錯誤:", error);
    }

    return analysis;
  }

  /**
   * 檢測是否為時間字段
   */
  isTimeField(fieldName, value) {
    const timeFields = [
      "time",
      "date",
      "datetime",
      "時間",
      "日期",
      "月份",
      "年份",
    ];
    const fieldLower = fieldName.toLowerCase();

    if (timeFields.some((tf) => fieldLower.includes(tf))) {
      return true;
    }

    // 檢測值是否為時間格式
    if (typeof value === "string") {
      const timePatterns = [
        /^\d{4}-\d{2}-\d{2}/, // YYYY-MM-DD
        /^\d{1,2}月/, // 1月, 12月
        /^\d{4}年/, // 2023年
        /^Q[1-4]/, // Q1, Q2
        /^第[一二三四]季度/, // 第一季度
      ];
      return timePatterns.some((pattern) => pattern.test(value));
    }

    return false;
  }

  /**
   * 生成圖表配置
   */
  generateChartOption(data, chartType, analysis, theme, config) {
    const colors = this.defaultColors[theme] || this.defaultColors.light;

    const baseOption = {
      color: colors,
      backgroundColor: "transparent",
      textStyle: {
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      },
      tooltip: {
        trigger: "item",
        confine: true,
      },
      legend: {
        type: "scroll",
        orient: "horizontal",
        left: "center",
        bottom: 0,
      },
    };

    let specificOption = {};

    switch (chartType) {
      case "bar":
        specificOption = this.generateBarOption(data, analysis);
        break;
      case "line":
        specificOption = this.generateLineOption(data, analysis);
        break;
      case "pie":
        specificOption = this.generatePieOption(data, analysis);
        break;
      case "scatter":
        specificOption = this.generateScatterOption(data, analysis);
        break;
      case "radar":
        specificOption = this.generateRadarOption(data, analysis);
        break;
      case "gauge":
        specificOption = this.generateGaugeOption(data, analysis);
        break;
      case "funnel":
        specificOption = this.generateFunnelOption(data, analysis);
        break;
      default:
        specificOption = this.generateBarOption(data, analysis);
    }

    // 過濾掉非 ECharts 配置的屬性
    const { title, description, ...echartsConfig } = config || {};

    // 合併配置
    return {
      ...baseOption,
      ...specificOption,
      ...echartsConfig, // 只合併有效的 ECharts 配置
    };
  }

  /**
   * 生成柱狀圖配置
   */
  generateBarOption(data, analysis) {
    if (analysis.dataType === "keyValue") {
      // 簡單鍵值對數據
      const keys = Object.keys(data);
      const values = Object.values(data).map(Number);

      return {
        xAxis: {
          type: "category",
          data: keys,
          axisLabel: { rotate: keys.some((k) => k.length > 4) ? 45 : 0 },
        },
        yAxis: { type: "value" },
        series: [
          {
            type: "bar",
            data: values,
            itemStyle: { borderRadius: [4, 4, 0, 0] },
          },
        ],
        tooltip: {
          trigger: "axis",
          formatter: "{b}: {c}",
        },
      };
    } else if (analysis.dataType === "objectArray") {
      // 對象數組數據
      const categoryDim = analysis.dimensions[0];
      const measureDim = analysis.measures[0];

      if (!categoryDim || !measureDim) {
        throw new Error("數據缺少必要的維度或度量");
      }

      const categories = data.map((item) => item[categoryDim.name]);
      const values = data.map((item) => Number(item[measureDim.name]) || 0);

      return {
        xAxis: {
          type: "category",
          data: categories,
          axisLabel: {
            rotate: categories.some((c) => String(c).length > 4) ? 45 : 0,
          },
        },
        yAxis: { type: "value" },
        series: [
          {
            type: "bar",
            data: values,
            name: measureDim.name,
            itemStyle: { borderRadius: [4, 4, 0, 0] },
          },
        ],
        tooltip: {
          trigger: "axis",
          formatter: `{b}: {c}`,
        },
      };
    }

    throw new Error("不支援的數據格式用於柱狀圖");
  }

  /**
   * 生成折線圖配置
   */
  generateLineOption(data, analysis) {
    if (analysis.dataType === "objectArray") {
      const xDim =
        analysis.dimensions.find((d) => d.type === "time") ||
        analysis.dimensions[0];
      const yDim = analysis.measures[0];

      if (!xDim || !yDim) {
        throw new Error("數據缺少必要的維度或度量");
      }

      const xData = data.map((item) => item[xDim.name]);
      const yData = data.map((item) => Number(item[yDim.name]) || 0);

      return {
        xAxis: {
          type: "category",
          data: xData,
          boundaryGap: false,
        },
        yAxis: { type: "value" },
        series: [
          {
            type: "line",
            data: yData,
            name: yDim.name,
            smooth: true,
            symbol: "circle",
            symbolSize: 6,
            lineStyle: { width: 3 },
            areaStyle: { opacity: 0.3 },
          },
        ],
        tooltip: {
          trigger: "axis",
          formatter: `{b}: {c}`,
        },
      };
    }

    return this.generateBarOption(data, analysis); // 降級到柱狀圖
  }

  /**
   * 生成餅圖配置
   */
  generatePieOption(data, analysis) {
    let pieData = [];

    if (analysis.dataType === "keyValue") {
      pieData = Object.entries(data).map(([name, value]) => ({
        name,
        value: Number(value) || 0,
      }));
    } else if (analysis.dataType === "objectArray") {
      const nameDim = analysis.dimensions[0];
      const valueDim = analysis.measures[0];

      if (!nameDim || !valueDim) {
        throw new Error("數據缺少必要的維度或度量");
      }

      pieData = data.map((item) => ({
        name: item[nameDim.name],
        value: Number(item[valueDim.name]) || 0,
      }));
    }

    return {
      series: [
        {
          type: "pie",
          data: pieData,
          radius: ["40%", "70%"],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 5,
            borderColor: "#fff",
            borderWidth: 2,
          },
          label: {
            show: true,
            formatter: "{b}: {d}%",
          },
          emphasis: {
            label: { show: true, fontSize: 14, fontWeight: "bold" },
          },
        },
      ],
      tooltip: {
        trigger: "item",
        formatter: "{b}: {c} ({d}%)",
      },
    };
  }

  /**
   * 生成散點圖配置
   */
  generateScatterOption(data, analysis) {
    if (analysis.measures.length >= 2) {
      const xMeasure = analysis.measures[0];
      const yMeasure = analysis.measures[1];

      const scatterData = data.map((item) => [
        Number(item[xMeasure.name]) || 0,
        Number(item[yMeasure.name]) || 0,
      ]);

      return {
        xAxis: { type: "value", name: xMeasure.name },
        yAxis: { type: "value", name: yMeasure.name },
        series: [
          {
            type: "scatter",
            data: scatterData,
            symbolSize: 8,
          },
        ],
        tooltip: {
          trigger: "item",
          formatter: `${xMeasure.name}: {c[0]}<br/>${yMeasure.name}: {c[1]}`,
        },
      };
    }

    return this.generateBarOption(data, analysis); // 降級到柱狀圖
  }

  /**
   * 生成雷達圖配置
   */
  generateRadarOption(data, analysis) {
    if (analysis.measures.length >= 3) {
      const indicators = analysis.measures.map((m) => ({
        name: m.name,
        max: m.max * 1.2, // 稍微放大最大值
      }));

      const radarData = [
        {
          value: analysis.measures.map((m) => {
            const values = data.map((item) => Number(item[m.name]) || 0);
            return mean(values);
          }),
          name: "平均值",
        },
      ];

      return {
        radar: {
          indicator: indicators,
          radius: "70%",
        },
        series: [
          {
            type: "radar",
            data: radarData,
            areaStyle: { opacity: 0.3 },
          },
        ],
        tooltip: { trigger: "item" },
      };
    }

    return this.generateBarOption(data, analysis); // 降級到柱狀圖
  }

  /**
   * 生成儀表盤配置
   */
  generateGaugeOption(data, analysis) {
    if (analysis.measures.length >= 1) {
      const measure = analysis.measures[0];
      const values = data.map((item) => Number(item[measure.name]) || 0);
      const avgValue = mean(values);

      return {
        series: [
          {
            type: "gauge",
            data: [{ value: avgValue, name: measure.name }],
            min: measure.min,
            max: measure.max,
            detail: { formatter: "{value}" },
            progress: { show: true, width: 18 },
            axisLine: { lineStyle: { width: 18 } },
          },
        ],
        tooltip: { formatter: "{b}: {c}" },
      };
    }

    return this.generateBarOption(data, analysis); // 降級到柱狀圖
  }

  /**
   * 生成漏斗圖配置
   */
  generateFunnelOption(data, analysis) {
    return this.generatePieOption(data, analysis); // 使用餅圖邏輯，但改為漏斗圖
  }

  /**
   * 生成表格數據
   */
  generateTableData(data, analysis) {
    let tableData = [];
    let tableColumns = [];

    if (analysis.dataType === "keyValue") {
      tableColumns = [
        { title: "項目", dataIndex: "key", key: "key" },
        { title: "數值", dataIndex: "value", key: "value", align: "right" },
      ];
      tableData = Object.entries(data).map(([key, value], index) => ({
        key: index,
        key: key,
        value: value,
      }));
    } else if (analysis.dataType === "objectArray") {
      const allKeys = [...analysis.dimensions, ...analysis.measures];
      tableColumns = allKeys.map((field) => ({
        title: field.name,
        dataIndex: field.name,
        key: field.name,
        align: field.type === "number" ? "right" : "left",
      }));
      tableData = data.map((item, index) => ({
        key: index,
        ...item,
      }));
    }

    return { tableData, tableColumns };
  }
}

// 創建並導出服務實例
export const chartService = new ChartService();
export default chartService;
