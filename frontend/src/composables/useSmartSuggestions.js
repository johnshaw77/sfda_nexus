import { ref, computed, watch } from "vue";
import { chartIntegrationService } from "@/services/chartIntegrationService";

export function useSmartSuggestions() {
  // 響應式狀態
  const currentInput = ref("");
  const suggestions = ref([]);
  const isAnalyzing = ref(false);
  const lastAnalysisTime = ref(0);

  // 防抖延遲
  const DEBOUNCE_DELAY = 1000;
  const MIN_CHARS = 20;

  // 計算屬性：判斷是否應該顯示建議
  const shouldShowSuggestions = computed(() => {
    return (
      suggestions.value.length > 0 && currentInput.value.length >= MIN_CHARS
    );
  });

  // 計算屬性：過濾出圖表相關建議
  const chartSuggestions = computed(() => {
    return suggestions.value.filter((s) => s.type === "chart");
  });

  // 計算屬性：過濾出數據分析建議
  const analysisSuggestions = computed(() => {
    return suggestions.value.filter((s) => s.type === "analysis");
  });

  // 分析輸入內容並生成建議
  const analyzeInput = async (inputText) => {
    if (!inputText || inputText.length < MIN_CHARS) {
      suggestions.value = [];
      return;
    }

    // 防抖：避免過於頻繁的分析
    const now = Date.now();
    if (now - lastAnalysisTime.value < DEBOUNCE_DELAY) {
      return;
    }

    isAnalyzing.value = true;
    lastAnalysisTime.value = now;

    try {
      const newSuggestions = [];

      // 檢測數據模式
      const dataPatterns = detectDataPatterns(inputText);
      if (dataPatterns.length > 0) {
        // 添加圖表建議
        for (const pattern of dataPatterns) {
          const chartSuggestion = await generateChartSuggestion(
            pattern,
            inputText
          );
          if (chartSuggestion) {
            newSuggestions.push(chartSuggestion);
          }
        }
      }

      // 檢測分析需求
      const analysisNeeds = detectAnalysisNeeds(inputText);
      if (analysisNeeds.length > 0) {
        // 添加分析建議
        for (const need of analysisNeeds) {
          newSuggestions.push(generateAnalysisSuggestion(need, inputText));
        }
      }

      suggestions.value = newSuggestions;
    } catch (error) {
      console.error("🤖 [useSmartSuggestions] 分析失敗:", error);
      suggestions.value = [];
    } finally {
      isAnalyzing.value = false;
    }
  };

  // 檢測數據模式
  const detectDataPatterns = (text) => {
    const patterns = [];

    // 檢測表格數據
    if (/[|]\s*\w+\s*[|]/.test(text) || /\t/.test(text)) {
      patterns.push({
        type: "table",
        confidence: 0.9,
        description: "表格數據",
      });
    }

    // 檢測數值列表
    const numbers = text.match(/\d+\.?\d*/g) || [];
    if (numbers.length >= 3) {
      patterns.push({
        type: "numbers",
        confidence: 0.8,
        description: "數值數據",
        count: numbers.length,
      });
    }

    // 檢測百分比數據
    if (/%/.test(text) && numbers.length >= 2) {
      patterns.push({
        type: "percentage",
        confidence: 0.85,
        description: "百分比數據",
      });
    }

    // 檢測時間序列
    if (/\d{4}年|\d{1,2}月|\d{1,2}日|年份|月份/.test(text)) {
      patterns.push({
        type: "timeseries",
        confidence: 0.8,
        description: "時間序列數據",
      });
    }

    // 檢測比較數據
    if (
      /比較|對比|對照|高於|低於|大於|小於/.test(text) &&
      numbers.length >= 2
    ) {
      patterns.push({
        type: "comparison",
        confidence: 0.7,
        description: "比較數據",
      });
    }

    return patterns;
  };

  // 檢測分析需求
  const detectAnalysisNeeds = (text) => {
    const needs = [];

    // 統計分析需求
    if (/統計|平均|中位數|方差|標準差|相關|回歸/.test(text)) {
      needs.push({
        type: "statistical",
        confidence: 0.9,
        description: "統計分析需求",
      });
    }

    // 趨勢分析需求
    if (/趨勢|變化|增長|下降|波動|預測/.test(text)) {
      needs.push({
        type: "trend",
        confidence: 0.8,
        description: "趨勢分析需求",
      });
    }

    // 分布分析需求
    if (/分布|分佈|範圍|區間|群體|類別/.test(text)) {
      needs.push({
        type: "distribution",
        confidence: 0.7,
        description: "分布分析需求",
      });
    }

    return needs;
  };

  // 生成圖表建議
  const generateChartSuggestion = async (pattern, text) => {
    try {
      let chartType = "bar";
      let title = "數據圖表";
      let description = "基於輸入數據的可視化";

      // 根據數據模式推薦圖表類型
      switch (pattern.type) {
        case "table":
          chartType = "bar";
          title = "表格數據柱狀圖";
          description = "將表格數據轉換為直觀的柱狀圖";
          break;
        case "percentage":
          chartType = "pie";
          title = "百分比餅圖";
          description = "展示各部分的比例關係";
          break;
        case "timeseries":
          chartType = "line";
          title = "時間趨勢圖";
          description = "顯示數據隨時間的變化";
          break;
        case "comparison":
          chartType = "bar";
          title = "比較分析圖";
          description = "對比不同數據項的大小";
          break;
        default:
          chartType = "bar";
      }

      return {
        id: Date.now() + Math.random(),
        type: "chart",
        chartType,
        title,
        description,
        confidence: pattern.confidence,
        pattern: pattern.type,
        action: "生成圖表",
        handler: () => generateChart(text, chartType, title),
      };
    } catch (error) {
      console.error("🤖 [useSmartSuggestions] 圖表建議生成失敗:", error);
      return null;
    }
  };

  // 生成分析建議
  const generateAnalysisSuggestion = (need, text) => {
    let title = "數據分析";
    let description = "進行深度數據分析";
    let action = "開始分析";

    switch (need.type) {
      case "statistical":
        title = "統計分析";
        description = "計算平均值、標準差、相關性等統計指標";
        action = "執行統計分析";
        break;
      case "trend":
        title = "趨勢分析";
        description = "分析數據的變化趨勢和預測未來";
        action = "分析趨勢";
        break;
      case "distribution":
        title = "分布分析";
        description = "分析數據的分布特徵和模式";
        action = "分析分布";
        break;
    }

    return {
      id: Date.now() + Math.random(),
      type: "analysis",
      title,
      description,
      confidence: need.confidence,
      pattern: need.type,
      action,
      handler: () => performAnalysis(text, need.type),
    };
  };

  // 生成圖表
  const generateChart = async (text, chartType, title) => {
    try {
      console.log("🤖 [useSmartSuggestions] 開始生成圖表:", {
        text,
        chartType,
        title,
      });

      const result = await chartIntegrationService.processData({
        source: "conversation",
        data: text,
        options: {
          chartType,
          title,
        },
      });

      console.log("🤖 [useSmartSuggestions] 圖表處理結果:", {
        success: result.success,
        chartsLength: result.charts?.length,
        hasErrors: result.errors?.length > 0,
        errors: result.errors,
        metadata: result.metadata,
      });

      if (result.success && result.charts?.length > 0) {
        console.log("🤖 [useSmartSuggestions] 圖表生成成功:", result.charts[0]);
        return {
          success: true,
          chartData: {
            ...result.charts[0],
            type: chartType,
            title,
          },
        };
      } else {
        console.warn("🤖 [useSmartSuggestions] 圖表生成失敗 - 條件不滿足:", {
          success: result.success,
          chartsExist: !!result.charts,
          chartsLength: result.charts?.length,
          errors: result.errors,
        });
      }
    } catch (error) {
      console.error("🤖 [useSmartSuggestions] 圖表生成異常:", error);
    }

    return { success: false, error: "圖表生成失敗" };
  };

  // 執行分析
  const performAnalysis = async (text, analysisType) => {
    try {
      // 這裡可以根據分析類型調用不同的分析服務
      const result = await chartIntegrationService.processData({
        source: "conversation",
        data: text,
        options: {
          analysisType,
        },
      });
      return {
        success: true,
        analysisType,
        result: result.suggestions?.join(", ") || "分析完成",
      };
    } catch (error) {
      console.error("🤖 [useSmartSuggestions] 分析執行失敗:", error);
      return { success: false, error: "分析失敗" };
    }
  };

  // 清空建議
  const clearSuggestions = () => {
    suggestions.value = [];
  };

  // 設置輸入內容
  const setInput = (input) => {
    currentInput.value = input;
  };

  // 監聽輸入變化
  watch(currentInput, (newInput) => {
    if (newInput) {
      // 使用 setTimeout 實現防抖
      setTimeout(() => {
        if (currentInput.value === newInput) {
          analyzeInput(newInput);
        }
      }, DEBOUNCE_DELAY);
    } else {
      clearSuggestions();
    }
  });

  return {
    // 響應式狀態
    currentInput,
    suggestions,
    isAnalyzing,

    // 計算屬性
    shouldShowSuggestions,
    chartSuggestions,
    analysisSuggestions,

    // 方法
    analyzeInput,
    clearSuggestions,
    setInput,
    generateChart,
    performAnalysis,
  };
}
