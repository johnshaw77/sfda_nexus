<template>
  <div
    v-if="
      message.role === 'assistant' &&
      backendChartDetection &&
      backendChartDetection.needsConfirmation
    "
    class="chart-confirmation-section">
    <div class="chart-confirmation-header">
      <QuestionCircleOutlined />
      <span>{{ backendChartDetection.confirmationMessage }}</span>
    </div>
    <div class="chart-confirmation-actions">
      <a-button
        type="primary"
        size="small"
        @click="$emit('confirm-chart', true)"
        :loading="isGeneratingChart">
        <BarChartOutlined />
        是的，製作圖表
      </a-button>
      <a-button
        size="small"
        @click="$emit('confirm-chart', false)">
        不需要
      </a-button>
    </div>
  </div>
</template>

<script setup>
import { QuestionCircleOutlined, BarChartOutlined } from '@ant-design/icons-vue';

// Props
defineProps({
  message: {
    type: Object,
    required: true
  },
  backendChartDetection: {
    type: Object,
    default: null
  },
  isGeneratingChart: {
    type: Boolean,
    default: false
  }
});

// Emits
defineEmits(['confirm-chart']);
</script>

<style scoped>
.chart-confirmation-section {
  margin-top: 12px;
  padding: 12px;
  background: linear-gradient(135deg, #fff7e6 0%, #fff 100%);
  border: 1px solid #ffd591;
  border-radius: 8px;
  border-left: 3px solid #fa8c16;
}

.chart-confirmation-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  color: #d48806;
  font-weight: 500;
  font-size: 14px;
}

.chart-confirmation-actions {
  display: flex;
  gap: 8px;
}

/* 暗黑模式適配 */
:root[data-theme="dark"] .chart-confirmation-section {
  background: linear-gradient(135deg, #2d1b08 0%, #1f1f1f 100%);
  border-color: #d48806;
}

:root[data-theme="dark"] .chart-confirmation-header {
  color: #ffa940;
}
</style>