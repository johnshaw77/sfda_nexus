<template>
  <div
    v-if="message.role === 'assistant' && message.isOptimizing"
    class="optimizing-section">
    <div class="optimizing-header">
      <BulbOutlined />
      <span>{{ message.optimizingMessage || "正在優化回應內容..." }}</span>
      <LoadingOutlined
        spin
        class="processing-spinner" />
    </div>
  </div>
</template>

<script setup>
import { BulbOutlined, LoadingOutlined } from '@ant-design/icons-vue';

// Props
defineProps({
  message: {
    type: Object,
    required: true
  }
});
</script>

<style scoped>
.optimizing-section {
  background: linear-gradient(135deg, #fff7e6 0%, #fff 100%);
  border: 1px solid #ffd591;
  border-radius: 8px;
  margin: 8px 0;
  overflow: hidden;
}

.optimizing-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: linear-gradient(90deg, #fa8c16 0%, #ffa940 100%);
  color: white;
  font-weight: 500;
}

.processing-spinner {
  margin-left: auto;
  color: white;
  font-size: 16px;
}
</style>