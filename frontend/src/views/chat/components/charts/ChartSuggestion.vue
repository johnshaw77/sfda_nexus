<template>
  <div>
    <!-- 智能圖表建議（手動檢測） -->
    <div
      v-if="
        showChartSuggestion &&
        detectedCharts.length > 0 &&
        !hasBackendDetectedChart &&
        !hasMcpDetectedChart &&
        frontendChartDetectionEnabled
      "
      class="chart-suggestion-section">
      <div class="chart-suggestion-header">
        <BarChartOutlined />
        <span>檢測到可視化數據</span>
        <a-button
          type="text"
          size="small"
          @click="$emit('dismiss-chart-suggestion')"
          class="dismiss-button">
          <span style="font-size: 12px">×</span>
        </a-button>
      </div>
      <div class="chart-suggestions">
        <div
          v-for="(chart, index) in detectedCharts.slice(0, 3)"
          :key="index"
          class="chart-suggestion-item"
          @click="$emit('generate-chart', chart)">
          <div class="chart-icon">
            <BarChartOutlined v-if="chart.type === 'bar'" />
            <LineChartOutlined v-else-if="chart.type === 'line'" />
            <svg
              v-else-if="chart.type === 'pie'"
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="currentColor">
              <path
                d="M12 2C13.1 2 14 2.9 14 4V12H22C22 17.5 17.5 22 12 22S2 17.5 2 12S6.5 2 12 2Z" />
            </svg>
            <TableOutlined v-else />
          </div>
          <div class="chart-info">
            <div class="chart-title">
              {{ chart.title || `${chart.type} 圖表` }}
            </div>
            <div class="chart-confidence">
              可信度: {{ Math.round(chart.confidence * 100) }}%
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 檢測狀態指示器 -->
    <div
      v-if="isDetectingCharts"
      class="chart-detection-status">
      <LoadingOutlined spin />
      <span>分析數據中...</span>
    </div>

    <!-- 檢測錯誤 -->
    <div
      v-if="chartDetectionError"
      class="chart-detection-error">
      <ExclamationCircleOutlined />
      <span>{{ chartDetectionError }}</span>
    </div>
  </div>
</template>

<script setup>
import {
  BarChartOutlined,
  LineChartOutlined,
  TableOutlined,
  LoadingOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons-vue';

// Props
defineProps({
  showChartSuggestion: {
    type: Boolean,
    default: false
  },
  detectedCharts: {
    type: Array,
    default: () => []
  },
  hasBackendDetectedChart: {
    type: Boolean,
    default: false
  },
  hasMcpDetectedChart: {
    type: Boolean,
    default: false
  },
  frontendChartDetectionEnabled: {
    type: Boolean,
    default: true
  },
  isDetectingCharts: {
    type: Boolean,
    default: false
  },
  chartDetectionError: {
    type: String,
    default: ''
  }
});

// Emits
defineEmits(['dismiss-chart-suggestion', 'generate-chart']);
</script>

<style scoped>
.chart-suggestion-section {
  margin-top: 12px;
  border: 1px solid var(--custom-border-primary);
  border-radius: 8px;
  background: var(--custom-bg-secondary);
  overflow: hidden;
  border-left: 3px solid #1890ff;
}

.chart-suggestion-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--custom-bg-tertiary);
  border-bottom: 1px solid var(--custom-border-primary);
  font-size: 13px;
  font-weight: 500;
  color: #1890ff;
  gap: 6px;
}

.dismiss-button {
  color: var(--custom-text-tertiary);
  padding: 0;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dismiss-button:hover {
  background: var(--custom-bg-quaternary);
  color: var(--custom-text-secondary);
}

.chart-suggestions {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.chart-suggestion-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: var(--custom-bg-quaternary);
}

.chart-suggestion-item:hover {
  background: var(--custom-bg-elevated);
  transform: translateX(2px);
}

.chart-icon {
  color: #1890ff;
  font-size: 14px;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chart-info {
  flex: 1;
}

.chart-title {
  font-size: 12px;
  font-weight: 500;
  color: var(--custom-text-primary);
  margin-bottom: 2px;
}

.chart-confidence {
  font-size: 11px;
  color: var(--custom-text-tertiary);
}

.chart-detection-status {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: linear-gradient(135deg, #e6f7ff 0%, #f0f9ff 100%);
  border: 1px solid #91d5ff;
  border-radius: 6px;
  color: #1890ff;
  font-size: 13px;
}

.chart-detection-error {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--ant-color-error-bg);
  border: 1px solid var(--ant-color-error-border);
  border-radius: 6px;
  color: var(--ant-color-error);
  font-size: 13px;
}

/* 暗黑模式適配 */
:root[data-theme="dark"] .chart-suggestion-section {
  border-color: var(--custom-border-secondary);
  background: var(--custom-bg-primary);
}

:root[data-theme="dark"] .chart-suggestion-header {
  background: var(--custom-bg-secondary);
  border-bottom-color: var(--custom-border-secondary);
  color: #69c0ff;
}

:root[data-theme="dark"] .chart-suggestion-item {
  background: var(--custom-bg-secondary);
}

:root[data-theme="dark"] .chart-suggestion-item:hover {
  background: var(--custom-bg-tertiary);
}

:root[data-theme="dark"] .chart-icon {
  color: #69c0ff;
}

:root[data-theme="dark"] .chart-detection-status {
  background: linear-gradient(135deg, #001529 0%, #002140 100%);
  border-color: #1e3a5f;
  color: #69c0ff;
}

:root[data-theme="dark"] .dismiss-button:hover {
  background: var(--custom-bg-primary);
  color: var(--custom-text-primary);
}
</style>