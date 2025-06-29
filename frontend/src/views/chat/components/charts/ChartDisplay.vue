<template>
  <div>
    <!-- 智能圖表展示 -->
    <div
      v-if="isChartMessage && chartData"
      class="chart-message-container">
      <SmartChart
        :data="chartData.data || {}"
        :prebuilt-chart="chartData"
        :chart-type="chartData.type || chartData.chartType"
        :title="chartData.title"
        :description="chartData.description"
        :width="'100%'"
        :height="400"
        :enable-download="true"
        :enable-fullscreen="true"
        :enable-data-view="true"
        :enable-type-switch="true" />
    </div>

    <!-- MCP 工具創建的圖表（最高優先級） -->
    <div
      v-if="hasMcpDetectedChart"
      class="smart-chart-section mcp-chart">
      <div class="smart-chart-header">
        <BarChartOutlined />
        <span>🛠️ AI工具圖表創建</span>
        <div class="confidence-badge">
          可信度: {{ Math.round(mcpChartDetection.confidence * 100) }}%
        </div>
      </div>
      <div class="smart-chart-content">
        <SmartChart
          :data="mcpChartDetection.data"
          :chart-type="mcpChartDetection.chartType"
          :title="mcpChartDetection.title"
          :config="{
            height: 300,
            showActions: true,
            enableExport: true,
          }"
          class="mcp-generated-chart" />
      </div>
      <div class="smart-chart-reasoning">
        <div class="reasoning-text">
          {{ mcpChartDetection.reasoning }}
        </div>
      </div>
    </div>

    <!-- 後端智能檢測到的圖表（自動顯示，當沒有 MCP 圖表時） -->
    <div
      v-if="hasBackendDetectedChart && !hasMcpDetectedChart"
      class="smart-chart-section">
      <div class="smart-chart-header">
        <BarChartOutlined />
        <span>🧠 AI智能圖表分析</span>
        <div class="confidence-badge">
          可信度: {{ Math.round(backendChartDetection.confidence * 100) }}%
        </div>
      </div>
      <div class="smart-chart-content">
        <SmartChart
          :data="backendChartDetection.data"
          :chart-type="backendChartDetection.chartType"
          :title="backendChartDetection.title"
          :config="{
            height: 300,
            showActions: true,
            enableExport: true,
          }"
          class="auto-generated-chart" />
      </div>
      <div class="smart-chart-reasoning">
        <div class="reasoning-text">
          {{ backendChartDetection.reasoning }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { BarChartOutlined } from '@ant-design/icons-vue';
import SmartChart from '@/components/common/SmartChart.vue';

// Props
defineProps({
  isChartMessage: {
    type: Boolean,
    default: false
  },
  chartData: {
    type: Object,
    default: null
  },
  hasMcpDetectedChart: {
    type: Boolean,
    default: false
  },
  mcpChartDetection: {
    type: Object,
    default: null
  },
  hasBackendDetectedChart: {
    type: Boolean,
    default: false
  },
  backendChartDetection: {
    type: Object,
    default: null
  }
});
</script>

<style scoped>
.chart-message-container {
  margin: 12px 0;
  border: 1px solid var(--custom-border-primary);
  border-radius: 8px;
  overflow: hidden;
  background: var(--custom-bg-secondary);
}

.smart-chart-section {
  margin-top: 12px;
  border: 1px solid var(--custom-border-primary);
  border-radius: 8px;
  background: var(--custom-bg-secondary);
  overflow: hidden;
}

.smart-chart-section.mcp-chart {
  border-left: 3px solid #52c41a;
}

.smart-chart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--custom-bg-tertiary);
  border-bottom: 1px solid var(--custom-border-primary);
  font-size: 13px;
  font-weight: 500;
  color: var(--custom-text-secondary);
}

.confidence-badge {
  background: linear-gradient(135deg, #e6f7ff 0%, #f0f9ff 100%);
  color: #1890ff;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}

.smart-chart-content {
  padding: 12px;
}

.smart-chart-reasoning {
  padding: 8px 12px;
  background: var(--custom-bg-quaternary);
  border-top: 1px solid var(--custom-border-primary);
}

.reasoning-text {
  font-size: 12px;
  color: var(--custom-text-tertiary);
  line-height: 1.4;
  font-style: italic;
}

.mcp-generated-chart,
.auto-generated-chart {
  border-radius: 6px;
  overflow: hidden;
}

/* 暗黑模式適配 */
:root[data-theme="dark"] .smart-chart-section {
  border-color: var(--custom-border-secondary);
  background: var(--custom-bg-primary);
}

:root[data-theme="dark"] .smart-chart-header {
  background: var(--custom-bg-secondary);
  border-bottom-color: var(--custom-border-secondary);
  color: var(--custom-text-primary);
}

:root[data-theme="dark"] .confidence-badge {
  background: linear-gradient(135deg, #001529 0%, #002140 100%);
  color: #69c0ff;
}

:root[data-theme="dark"] .smart-chart-reasoning {
  background: var(--custom-bg-secondary);
  border-top-color: var(--custom-border-secondary);
}

:root[data-theme="dark"] .chart-message-container {
  border-color: var(--custom-border-secondary);
  background: var(--custom-bg-primary);
}
</style>