<template>
  <div
    v-if="
      message.role === 'assistant' &&
      message.toolResultSections &&
      !message.finalContent
    "
    class="tool-result-streaming-section">
    <div class="tool-result-streaming-header">
      <LoadingOutlined spin />
      <div class="streaming-content">
        <div class="streaming-message">
          📋 正在組織結果 {{ message.currentSection || 0 }}/{{
            message.totalSections || 0
          }}
        </div>
        <div
          v-if="message.toolResultProgress !== undefined"
          class="streaming-progress">
          <a-progress
            :percent="message.toolResultProgress"
            :show-info="false"
            size="small"
            :stroke-color="{
              '0%': '#108ee9',
              '100%': '#52c41a',
            }" />
          <span class="progress-text"
            >{{ message.toolResultProgress }}%</span
          >
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { LoadingOutlined } from '@ant-design/icons-vue';

// Props
defineProps({
  message: {
    type: Object,
    required: true
  }
});
</script>

<style scoped>
.tool-result-streaming-section {
  background: linear-gradient(135deg, #f6ffed 0%, #fff 100%);
  border: 1px solid #b7eb8f;
  border-radius: 8px;
  margin: 8px 0;
  overflow: hidden;
}

.tool-result-streaming-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: linear-gradient(90deg, #52c41a 0%, #73d13d 100%);
  color: white;
}

.streaming-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.streaming-message {
  font-weight: 500;
  font-size: 14px;
}

.streaming-progress {
  display: flex;
  align-items: center;
  gap: 8px;
}

.progress-text {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.9);
  min-width: 35px;
}
</style>