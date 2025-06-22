<template>
  <div class="intelligent-analyzer">
    <!-- 分析觸發器 -->
    <div
      v-if="!isAnalyzing && !showResults && hasAnalyzableContent"
      class="analyzer-trigger"
      @click="handleStartAnalysis">
      <div class="trigger-content">
        <BarChartOutlined />
        <span>檢測到可視化數據，點擊分析</span>
        <RightOutlined />
      </div>
    </div>

    <!-- 分析進行中 -->
    <div
      v-if="isAnalyzing"
      class="analyzer-loading">
      <LoadingOutlined spin />
      <span>AI 正在分析數據並生成圖表建議...</span>
    </div>

    <!-- 分析結果 -->
    <div
      v-if="showResults && analysisResults.length > 0"
      class="analyzer-results">
      <div class="results-header">
        <EyeOutlined />
        <span>智能分析結果</span>
        <a-button
          type="text"
          size="small"
          @click="handleDismiss"
          class="dismiss-btn">
          <CloseOutlined />
        </a-button>
      </div>

      <div class="results-content">
        <!-- 數據洞察 -->
        <div
          v-if="dataInsights"
          class="insights-section">
          <h4>📊 數據洞察</h4>
          <p>{{ dataInsights }}</p>
        </div>

        <!-- 圖表建議 -->
        <div class="charts-section">
          <h4>📈 推薦圖表</h4>
          <div class="chart-suggestions">
            <div
              v-for="(chart, index) in analysisResults"
              :key="index"
              class="chart-suggestion"
              @click="handleGenerateChart(chart)">
              <div class="chart-preview">
                <component :is="getChartIcon(chart.type)" />
              </div>
              <div class="chart-info">
                <div class="chart-name">{{ chart.title }}</div>
                <div class="chart-desc">{{ chart.description }}</div>
                <div class="chart-confidence">
                  <span class="confidence-label">適合度:</span>
                  <a-progress
                    :percent="Math.round(chart.confidence * 100)"
                    size="small"
                    :show-info="false"
                    :stroke-color="getConfidenceColor(chart.confidence)" />
                  <span class="confidence-value"
                    >{{ Math.round(chart.confidence * 100) }}%</span
                  >
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 數據品質報告 -->
        <div
          v-if="dataQuality"
          class="quality-section">
          <h4>🔍 數據品質</h4>
          <div class="quality-metrics">
            <div class="metric">
              <span>完整性:</span>
              <a-tag :color="getQualityColor(dataQuality.completeness)">
                {{ Math.round(dataQuality.completeness * 100) }}%
              </a-tag>
            </div>
            <div class="metric">
              <span>準確性:</span>
              <a-tag :color="getQualityColor(dataQuality.accuracy)">
                {{ Math.round(dataQuality.accuracy * 100) }}%
              </a-tag>
            </div>
            <div class="metric">
              <span>一致性:</span>
              <a-tag :color="getQualityColor(dataQuality.consistency)">
                {{ Math.round(dataQuality.consistency * 100) }}%
              </a-tag>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 錯誤狀態 -->
    <div
      v-if="analysisError"
      class="analyzer-error">
      <ExclamationCircleOutlined />
      <span>分析失敗: {{ analysisError }}</span>
      <a-button
        type="link"
        size="small"
        @click="handleRetryAnalysis"
        >重試</a-button
      >
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import { message } from "ant-design-vue";
import {
  BarChartOutlined,
  LineChartOutlined,
  LoadingOutlined,
  EyeOutlined,
  CloseOutlined,
  RightOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons-vue";
import { chartIntegrationService } from "@/services/chartIntegrationService";

// Props
const props = defineProps({
  content: {
    type: String,
    required: true,
  },
  toolCalls: {
    type: Array,
    default: () => [],
  },
  autoAnalyze: {
    type: Boolean,
    default: false,
  },
});

// Emits
const emit = defineEmits(["chart-generated", "analysis-complete"]);

// 響應式狀態
const isAnalyzing = ref(false);
const showResults = ref(false);
const analysisResults = ref([]);
const analysisError = ref(null);
const dataInsights = ref("");
const dataQuality = ref(null);

// 計算屬性
const hasAnalyzableContent = computed(() => {
  // 檢查內容中是否包含數字、表格或統計相關詞彙
  const hasNumbers = /\d+/.test(props.content);
  const hasTableLike = /[|]\s*\w+\s*[|]/.test(props.content);
  const hasStatKeywords = /統計|數據|分析|圖表|報表|趨勢/.test(props.content);

  return (
    (hasNumbers && (hasTableLike || hasStatKeywords)) ||
    props.toolCalls.length > 0
  );
});

// 方法
const handleStartAnalysis = async () => {
  isAnalyzing.value = true;
  analysisError.value = null;

  try {
    // 分析工具調用結果
    let chartSuggestions = [];

    if (props.toolCalls.length > 0) {
      for (const toolCall of props.toolCalls) {
        if (toolCall.success && toolCall.result) {
          const suggestion = await analyzeToolCallResult(toolCall);
          if (suggestion) {
            chartSuggestions.push(suggestion);
          }
        }
      }
    }

    // 分析對話內容
    const contentAnalysis = await analyzeConversationContent(props.content);
    if (contentAnalysis.charts.length > 0) {
      chartSuggestions.push(...contentAnalysis.charts);
    }

    // 設置結果
    analysisResults.value = chartSuggestions;
    dataInsights.value = contentAnalysis.insights;
    dataQuality.value = contentAnalysis.quality;
    showResults.value = true;

    emit("analysis-complete", {
      insights: dataInsights.value,
      charts: chartSuggestions,
      quality: dataQuality.value,
    });
  } catch (error) {
    console.error("🔍 [IntelligentAnalyzer] 分析失敗:", error);
    analysisError.value = error.message;
  } finally {
    isAnalyzing.value = false;
  }
};

const analyzeToolCallResult = async (toolCall) => {
  try {
    const result = await chartIntegrationService.processData(
      JSON.stringify(toolCall.result),
      "mcp-statistical",
      { toolName: toolCall.name }
    );

    if (result.success && result.chartData) {
      return {
        type: result.chartData.type,
        title: result.chartData.title,
        description: result.chartData.description,
        data: result.chartData.data,
        confidence: 0.9,
        source: "tool-call",
      };
    }
  } catch (error) {
    console.warn("🔍 [IntelligentAnalyzer] 工具調用分析失敗:", error);
  }
  return null;
};

const analyzeConversationContent = async (content) => {
  try {
    const result = await chartIntegrationService.processData(
      content,
      "conversation"
    );

    const insights = generateDataInsights(content);
    const quality = assessDataQuality(content);

    return {
      charts: result.success ? [result.chartData] : [],
      insights,
      quality,
    };
  } catch (error) {
    console.warn("🔍 [IntelligentAnalyzer] 對話內容分析失敗:", error);
    return { charts: [], insights: "", quality: null };
  }
};

const generateDataInsights = (content) => {
  const numbers = content.match(/\d+\.?\d*/g) || [];
  const hasPercentage = /%/.test(content);
  const hasCurrency = /[$¥€£]/.test(content);
  const hasDate = /\d{4}年|\d{1,2}月|\d{1,2}日/.test(content);

  let insights = "根據數據分析，發現了以下關鍵特徵：";

  if (numbers.length > 0) {
    insights += `包含 ${numbers.length} 個數值數據點，`;
  }
  if (hasPercentage) {
    insights += "包含百分比數據，適合餅圖或條狀圖，";
  }
  if (hasCurrency) {
    insights += "包含金額數據，建議使用柱狀圖展示，";
  }
  if (hasDate) {
    insights += "包含時間維度，適合使用折線圖顯示趨勢。";
  }

  return insights.replace(/，$/, "。");
};

const assessDataQuality = (content) => {
  const lines = content.split("\n").filter((line) => line.trim());
  const numbers = content.match(/\d+\.?\d*/g) || [];

  // 簡單的品質評估
  const completeness = Math.min(1, lines.length / 5); // 假設至少需要5行數據
  const accuracy = numbers.length > 0 ? 0.85 : 0.5; // 有數字則認為較準確
  const consistency = lines.length > 1 ? 0.9 : 0.6; // 多行數據一致性較好

  return { completeness, accuracy, consistency };
};

const handleGenerateChart = (chartData) => {
  emit("chart-generated", chartData);
  message.success(`已生成 ${chartData.title}`);
};

const handleDismiss = () => {
  showResults.value = false;
  analysisResults.value = [];
};

const handleRetryAnalysis = () => {
  analysisError.value = null;
  handleStartAnalysis();
};

const getChartIcon = (type) => {
  switch (type) {
    case "bar":
      return BarChartOutlined;
    case "line":
      return LineChartOutlined;
    default:
      return BarChartOutlined;
  }
};

const getConfidenceColor = (confidence) => {
  if (confidence >= 0.8) return "#52c41a";
  if (confidence >= 0.6) return "#faad14";
  return "#ff4d4f";
};

const getQualityColor = (quality) => {
  if (quality >= 0.8) return "green";
  if (quality >= 0.6) return "orange";
  return "red";
};

// 自動分析
watch(
  () => props.content,
  (newContent) => {
    if (props.autoAnalyze && hasAnalyzableContent.value && newContent) {
      setTimeout(() => {
        handleStartAnalysis();
      }, 1000);
    }
  },
  { immediate: true }
);
</script>

<style scoped>
.intelligent-analyzer {
  margin: 8px 0;
}

.analyzer-trigger {
  padding: 12px;
  border: 1px solid var(--custom-border-primary);
  border-radius: 8px;
  background: linear-gradient(
    135deg,
    rgba(24, 144, 255, 0.05) 0%,
    rgba(24, 144, 255, 0.1) 100%
  );
  cursor: pointer;
  transition: all 0.3s ease;
  border-left: 3px solid #1890ff;
}

.analyzer-trigger:hover {
  background: linear-gradient(
    135deg,
    rgba(24, 144, 255, 0.1) 0%,
    rgba(24, 144, 255, 0.15) 100%
  );
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.15);
}

.trigger-content {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #1890ff;
  font-weight: 500;
}

.analyzer-loading {
  padding: 12px;
  text-align: center;
  color: var(--custom-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.analyzer-results {
  border: 1px solid var(--custom-border-primary);
  border-radius: 8px;
  overflow: hidden;
  background: var(--custom-bg-secondary);
}

.results-header {
  padding: 12px 16px;
  background: var(--custom-bg-tertiary);
  border-bottom: 1px solid var(--custom-border-primary);
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  color: var(--custom-text-primary);
}

.dismiss-btn {
  margin-left: auto;
  color: var(--custom-text-tertiary) !important;
}

.results-content {
  padding: 16px;
}

.insights-section,
.charts-section,
.quality-section {
  margin-bottom: 16px;
}

.insights-section h4,
.charts-section h4,
.quality-section h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--custom-text-primary);
}

.insights-section p {
  margin: 0;
  color: var(--custom-text-secondary);
  line-height: 1.5;
}

.chart-suggestions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.chart-suggestion {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--custom-border-secondary);
  border-radius: 6px;
  background: var(--custom-bg-primary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.chart-suggestion:hover {
  border-color: #1890ff;
  background: var(--custom-bg-tertiary);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.15);
}

.chart-preview {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  background: rgba(24, 144, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1890ff;
  font-size: 20px;
  flex-shrink: 0;
}

.chart-info {
  flex: 1;
  min-width: 0;
}

.chart-name {
  font-weight: 500;
  color: var(--custom-text-primary);
  margin-bottom: 4px;
}

.chart-desc {
  font-size: 12px;
  color: var(--custom-text-secondary);
  margin-bottom: 6px;
}

.chart-confidence {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.confidence-label {
  color: var(--custom-text-tertiary);
}

.confidence-value {
  color: var(--custom-text-secondary);
  font-weight: 500;
}

.quality-metrics {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.metric {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

.analyzer-error {
  padding: 12px;
  background: rgba(255, 77, 79, 0.05);
  border: 1px solid rgba(255, 77, 79, 0.2);
  border-radius: 6px;
  color: #ff4d4f;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 暗黑模式適配 */
:root[data-theme="dark"] .analyzer-trigger {
  background: linear-gradient(
    135deg,
    rgba(105, 192, 255, 0.05) 0%,
    rgba(105, 192, 255, 0.1) 100%
  );
  border-left-color: #69c0ff;
}

:root[data-theme="dark"] .analyzer-trigger:hover {
  background: linear-gradient(
    135deg,
    rgba(105, 192, 255, 0.1) 0%,
    rgba(105, 192, 255, 0.15) 100%
  );
  box-shadow: 0 4px 12px rgba(105, 192, 255, 0.15);
}

:root[data-theme="dark"] .trigger-content {
  color: #69c0ff;
}

:root[data-theme="dark"] .chart-preview {
  background: rgba(105, 192, 255, 0.1);
  color: #69c0ff;
}
</style>
