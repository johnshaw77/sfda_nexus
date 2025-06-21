<template>
  <div class="tool-call-display">
    <!-- 工具調用標題 -->
    <div class="tool-call-header">
      <div class="tool-info">
        <component
          :is="getToolIcon(toolCall.toolName)"
          class="tool-icon" />
        <span class="tool-name">{{
          getToolDisplayName(toolCall.toolName)
        }}</span>
        <a-tag
          :color="getToolColor(toolCall.toolName)"
          size="small">
          {{ getToolCategory(toolCall.toolName) }}
        </a-tag>
      </div>
      <div class="tool-status">
        <a-tag
          :color="toolCall.success ? 'success' : 'error'"
          size="small">
          {{ toolCall.success ? "成功" : "失敗" }}
        </a-tag>
        <span
          class="execution-time"
          v-if="toolCall.executionTime">
          {{ toolCall.executionTime }}ms
        </span>
      </div>
    </div>

    <!-- 工具參數（可摺疊） -->
    <div
      class="tool-parameters"
      v-if="toolCall.arguments && showDetails">
      <div class="section-title">
        <CodeOutlined />
        <span>調用參數</span>
      </div>
      <div class="parameters-content">
        <pre class="json-display">{{ formatJson(toolCall.arguments) }}</pre>
      </div>
    </div>

    <!-- 工具結果 -->
    <div class="tool-result">
      <div class="section-title">
        <CheckCircleOutlined v-if="toolCall.success" />
        <ExclamationCircleOutlined v-else />
        <span>執行結果</span>
        <a-button
          type="link"
          size="small"
          @click="toggleDetails"
          class="toggle-details">
          {{ showDetails ? "收起詳情" : "顯示詳情" }}
        </a-button>
        <!-- 流式展示切換按鈕 -->
        <a-button
          v-if="supportsStreaming && toolCall.success"
          type="link"
          size="small"
          @click="toggleStreamingMode"
          class="streaming-toggle">
          {{ useStreaming ? "標準模式" : "流式展示" }}
        </a-button>
      </div>

      <!-- 成功結果 -->
      <div
        v-if="toolCall.success"
        class="result-content success">
        
        <!-- 流式展示模式 -->
        <div
          v-if="useStreaming && streamingData"
          class="streaming-result">
          <StreamingResultViewer 
            :data="streamingData"
            :auto-start="true"
            :animation-speed="800"
            @complete="onStreamingComplete"
            @stage-complete="onStageComplete"
          />
        </div>
        
        <!-- 標準展示模式 -->
        <div v-else>
          <!-- 結構化數據顯示 -->
          <div
            v-if="isStructuredData(toolCall.result)"
            class="structured-result">
            <StructuredDataDisplay :data="toolCall.result" />
          </div>
          <!-- 純文本結果 -->
          <div
            v-else
            class="text-result">
            {{ formatResult(toolCall.result) }}
          </div>
        </div>
      </div>

      <!-- 錯誤結果 -->
      <div
        v-else
        class="result-content error">
        <div class="error-message">
          {{ toolCall.error || "工具調用失敗" }}
        </div>
        <div
          v-if="toolCall.details"
          class="error-details">
          <pre>{{ formatJson(toolCall.details) }}</pre>
        </div>
      </div>
    </div>

    <!-- 工具調用元數據（詳情模式） -->
    <div
      class="tool-metadata"
      v-if="showDetails && toolCall.metadata">
      <div class="section-title">
        <InfoCircleOutlined />
        <span>調用信息</span>
      </div>
      <div class="metadata-content">
        <div
          class="metadata-item"
          v-if="toolCall.metadata.timestamp">
          <span class="label">時間：</span>
          <span class="value">{{
            formatTimestamp(toolCall.metadata.timestamp)
          }}</span>
        </div>
        <div
          class="metadata-item"
          v-if="toolCall.metadata.version">
          <span class="label">版本：</span>
          <span class="value">{{ toolCall.metadata.version }}</span>
        </div>
        <div
          class="metadata-item"
          v-if="toolCall.metadata.executionId">
          <span class="label">執行ID：</span>
          <span class="value">{{ toolCall.metadata.executionId }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import StructuredDataDisplay from "./StructuredDataDisplay.vue";
import StreamingResultViewer from "./StreamingResultViewer.vue";
import ToolDisplayConfigManager from "@/utils/toolDisplayConfig.js";
import { parseStatisticalResult, isStreamingSupported } from "@/utils/statisticalResultParser.js";

const props = defineProps({
  toolCall: {
    type: Object,
    required: true,
  },
});

const showDetails = ref(false);
const useStreaming = ref(false);
const streamingData = ref(null);

const toggleDetails = () => {
  showDetails.value = !showDetails.value;
};

// 檢查是否支援流式展示
const supportsStreaming = computed(() => {
  const toolName = props.toolCall.toolName || props.toolCall.name;
  return isStreamingSupported(toolName);
});

// 切換流式模式
const toggleStreamingMode = () => {
  useStreaming.value = !useStreaming.value;
  
  if (useStreaming.value && !streamingData.value) {
    // 解析統計結果為流式格式
    const parsed = parseStatisticalResult(props.toolCall);
    if (parsed) {
      streamingData.value = parsed;
    } else {
      // 如果解析失敗，回退到標準模式
      useStreaming.value = false;
      console.warn('無法解析工具結果為流式格式');
    }
  }
};

// 流式展示事件處理
const onStreamingComplete = () => {
  console.log('流式展示完成');
};

const onStageComplete = (event) => {
  console.log('階段完成:', event);
};

// 監聽工具調用變化，重置流式數據
watch(() => props.toolCall, () => {
  streamingData.value = null;
  useStreaming.value = false;
}, { deep: true });

// 使用智能配置系統獲取工具配置
const toolConfig = computed(() => {
  return ToolDisplayConfigManager.getToolConfig(
    props.toolCall.toolName || props.toolCall.name
  );
});

// 工具圖標（使用智能配置）
const getToolIcon = (toolName) => {
  const config = ToolDisplayConfigManager.getToolConfig(toolName);
  return config.icon;
};

// 工具顯示名稱（使用智能配置）
const getToolDisplayName = (toolName) => {
  const config = ToolDisplayConfigManager.getToolConfig(toolName);
  return config.displayName;
};

// 工具類別（使用智能配置）
const getToolCategory = (toolName) => {
  const config = ToolDisplayConfigManager.getToolConfig(toolName);
  return config.category;
};

// 工具顏色（使用智能配置）
const getToolColor = (toolName) => {
  const config = ToolDisplayConfigManager.getToolConfig(toolName);
  return config.color;
};

// 檢查是否為結構化數據
const isStructuredData = (data) => {
  return typeof data === "object" && data !== null && !Array.isArray(data);
};

// 格式化 JSON
const formatJson = (obj) => {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
};

// 格式化結果
const formatResult = (result) => {
  if (typeof result === "string") return result;
  if (typeof result === "object") return JSON.stringify(result, null, 2);
  return String(result);
};

// 格式化時間戳
const formatTimestamp = (timestamp) => {
  try {
    return new Date(timestamp).toLocaleString("zh-TW");
  } catch {
    return timestamp;
  }
};
</script>

<style scoped>
.tool-call-display {
  border: 1px solid var(--custom-border-primary);
  border-radius: 8px;
  margin: 8px 0;
  background: var(--custom-bg-secondary);
  overflow: hidden;
}

.tool-call-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--custom-bg-tertiary);
  border-bottom: 1px solid var(--custom-border-primary);
}

.tool-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tool-icon {
  font-size: 16px;
  color: var(--custom-primary-color);
}

.tool-name {
  font-weight: 500;
  color: var(--custom-text-primary);
}

.tool-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.execution-time {
  font-size: 12px;
  color: var(--custom-text-tertiary);
}

.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
  color: var(--custom-text-secondary);
  margin-bottom: 8px;
  font-size: 13px;
}

.tool-parameters,
.tool-result,
.tool-metadata {
  padding: 12px 16px;
}

.tool-parameters {
  background: var(--custom-bg-primary);
  border-bottom: 1px solid var(--custom-border-primary);
}

.parameters-content,
.metadata-content {
  margin-top: 8px;
}

.json-display {
  background: var(--custom-bg-component);
  border: 1px solid var(--custom-border-secondary);
  border-radius: 4px;
  padding: 8px;
  font-size: 12px;
  color: var(--custom-text-secondary);
  overflow-x: auto;
  margin: 0;
}

.result-content {
  margin-top: 8px;
}

.result-content.success {
  color: var(--custom-success-color);
}

.result-content.error {
  color: var(--custom-error-color);
}

.structured-result {
  background: var(--custom-bg-component);
  border: 1px solid var(--custom-border-secondary);
  border-radius: 4px;
  padding: 12px;
}

.text-result {
  background: var(--custom-bg-component);
  border: 1px solid var(--custom-border-secondary);
  border-radius: 4px;
  padding: 12px;
  white-space: pre-wrap;
  font-family: "Monaco", "Menlo", "Ubuntu Mono", monospace;
  font-size: 13px;
  color: var(--custom-text-primary);
}

.error-message {
  font-weight: 500;
  margin-bottom: 8px;
}

.error-details {
  background: var(--custom-error-bg);
  border: 1px solid var(--custom-error-border);
  border-radius: 4px;
  padding: 8px;
  font-size: 12px;
  color: var(--custom-error-color);
}

.metadata-item {
  display: flex;
  margin-bottom: 4px;
}

.metadata-item .label {
  font-weight: 500;
  min-width: 60px;
  color: var(--custom-text-tertiary);
}

.metadata-item .value {
  color: var(--custom-text-primary);
}

.toggle-details {
  margin-left: auto;
  padding: 0;
  height: auto;
  color: var(--custom-text-secondary);
}

.toggle-details:hover {
  color: var(--custom-primary-color);
}

.streaming-toggle {
  padding: 0 !important;
  height: auto !important;
  margin-left: 8px;
  color: var(--primary-color) !important;
  font-size: 12px;
}

.streaming-toggle:hover {
  background: rgba(24, 144, 255, 0.1) !important;
}

.streaming-result {
  margin-top: 8px;
}

/* 為了向後兼容，保留深色模式支援（使用 CSS 變量覆蓋） */
:root[data-theme="dark"] .tool-call-display {
  background: var(--custom-bg-primary);
  border-color: var(--custom-border-secondary);
}

:root[data-theme="dark"] .tool-call-header {
  background: var(--custom-bg-secondary);
  border-color: var(--custom-border-secondary);
}

:root[data-theme="dark"] .tool-parameters {
  background: var(--custom-bg-primary);
  border-color: var(--custom-border-secondary);
}

:root[data-theme="dark"] .json-display,
:root[data-theme="dark"] .structured-result,
:root[data-theme="dark"] .text-result {
  background: var(--custom-bg-component);
  border-color: var(--custom-border-secondary);
  color: var(--custom-text-primary);
}

:root[data-theme="dark"] .error-details {
  background: var(--custom-error-bg);
  border-color: var(--custom-error-border);
}
</style>
