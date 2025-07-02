<template>
  <div
    v-if="message.role === 'assistant' && message.isProcessingTools"
    class="tool-processing-section">
    <div class="tool-processing-header">
      <ToolOutlined />
      <div class="tool-processing-content">
        <div class="tool-processing-message">
          {{ message.toolProcessingMessage || "正在檢查並處理工具調用..." }}
        </div>
        <!-- 進度條 -->
        <div
          v-if="getProgressValue() !== undefined"
          class="tool-progress">
          <a-progress
            :percent="getProgressValue()"
            :show-info="false"
            size="small"
            :stroke-color="{
              '0%': '#108ee9',
              '100%': '#87d068',
            }" />
          <span class="progress-text">{{ getProgressValue() }}%</span>
        </div>
      </div>
      <LoadingOutlined
        spin
        class="processing-spinner" />
    </div>
  </div>
</template>

<script setup>
import { ToolOutlined, LoadingOutlined } from '@ant-design/icons-vue';

// Props
const props = defineProps({
  message: {
    type: Object,
    required: true
  }
});

// 🔧 修復：統一進度值處理，避免超過100%
const getProgressValue = () => {
  const message = props.message;
  
  // 優先使用 toolResultProgress（工具結果進度）
  if (message.toolResultProgress !== undefined) {
    return Math.min(100, Math.max(0, message.toolResultProgress));
  }
  
  // 其次使用 progress（工具調用進度）
  if (message.progress !== undefined) {
    return Math.min(100, Math.max(0, message.progress));
  }
  
  return undefined;
};
</script>

<style scoped>
.tool-processing-section {
  background: linear-gradient(135deg, #e6f7ff 0%, #fff 100%);
  border: 1px solid #91d5ff;
  border-radius: 8px;
  margin: 8px 0;
  overflow: hidden;
}

.tool-processing-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: linear-gradient(90deg, #1890ff 0%, #40a9ff 100%);
  color: white;
}

.tool-processing-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tool-processing-message {
  font-weight: 500;
  font-size: 14px;
}

.tool-progress {
  display: flex;
  align-items: center;
  gap: 8px;
}

.progress-text {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.9);
  min-width: 35px;
}

.processing-spinner {
  color: white;
  font-size: 16px;
}
</style>