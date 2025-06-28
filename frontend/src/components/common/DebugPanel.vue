<template>
  <div class="debug-panel">
    <a-card
      title="🔍 二次 AI 調用調試信息"
      size="small"
      :bordered="true"
      class="debug-card">
      <template #extra>
        <a-button
          type="link"
          size="small"
          @click="copyToClipboard">
          <CopyOutlined />
          複製全部
        </a-button>
      </template>

      <a-collapse
        v-model:activeKey="activeKeys"
        size="small"
        ghost>
        <!-- 基本信息 -->
        <a-collapse-panel
          key="basic"
          header="📋 基本信息">
          <div class="debug-section">
            <div class="debug-item">
              <span class="label">調用時間：</span>
              <span class="value">{{
                formatTimestamp(debugInfo.secondaryAI.timestamp)
              }}</span>
            </div>
            <div class="debug-item">
              <span class="label">用戶問題：</span>
              <div class="value text-content">
                {{ debugInfo.secondaryAI.userQuestion }}
              </div>
            </div>
            <div class="debug-item">
              <span class="label">模型配置：</span>
              <pre class="json-content">{{
                formatJson(debugInfo.secondaryAI.modelConfig)
              }}</pre>
            </div>
          </div>
        </a-collapse-panel>

        <!-- System Prompt -->
        <a-collapse-panel
          key="system"
          header="🤖 System Prompt">
          <div class="debug-section">
            <div class="prompt-content">
              <pre class="prompt-text">{{
                debugInfo.secondaryAI.systemPrompt
              }}</pre>
            </div>
            <div class="prompt-stats">
              <a-tag color="blue"
                >長度:
                {{ debugInfo.secondaryAI.systemPrompt.length }} 字符</a-tag
              >
              <a-tag color="green"
                >行數:
                {{
                  debugInfo.secondaryAI.systemPrompt.split("\n").length
                }}</a-tag
              >
            </div>
          </div>
        </a-collapse-panel>

        <!-- User Prompt -->
        <a-collapse-panel
          key="user"
          header="👤 User Prompt">
          <div class="debug-section">
            <div class="prompt-content">
              <pre class="prompt-text">{{
                debugInfo.secondaryAI.userPrompt
              }}</pre>
            </div>
            <div class="prompt-stats">
              <a-tag color="blue"
                >長度: {{ debugInfo.secondaryAI.userPrompt.length }} 字符</a-tag
              >
              <a-tag color="green"
                >行數:
                {{ debugInfo.secondaryAI.userPrompt.split("\n").length }}</a-tag
              >
            </div>
          </div>
        </a-collapse-panel>

        <!-- 完整消息 -->
        <a-collapse-panel
          key="messages"
          header="💬 完整消息陣列">
          <div class="debug-section">
            <pre class="json-content">{{
              formatJson(debugInfo.secondaryAI.fullMessages)
            }}</pre>
          </div>
        </a-collapse-panel>

        <!-- 工具結果 -->
        <a-collapse-panel
          key="results"
          header="🛠️ 格式化工具結果">
          <div class="debug-section">
            <div class="prompt-content">
              <pre class="prompt-text">{{
                debugInfo.secondaryAI.formattedResults
              }}</pre>
            </div>
            <div class="prompt-stats">
              <a-tag color="orange"
                >長度:
                {{ debugInfo.secondaryAI.formattedResults.length }} 字符</a-tag
              >
            </div>
          </div>
        </a-collapse-panel>

        <!-- AI 回應 -->
        <a-collapse-panel
          v-if="debugInfo.secondaryAI.actualResponse"
          key="response"
          header="🎯 AI 實際回應">
          <div class="debug-section">
            <a-tabs size="small">
              <a-tab-pane
                key="original"
                tab="原始回應">
                <pre class="prompt-text">{{
                  debugInfo.secondaryAI.actualResponse.original
                }}</pre>
              </a-tab-pane>
              <a-tab-pane
                key="cleaned"
                tab="清理後回應">
                <pre class="prompt-text">{{
                  debugInfo.secondaryAI.actualResponse.cleaned
                }}</pre>
              </a-tab-pane>
              <a-tab-pane
                key="final"
                tab="最終回應">
                <pre class="prompt-text">{{
                  debugInfo.secondaryAI.actualResponse.final
                }}</pre>
              </a-tab-pane>
            </a-tabs>
          </div>
        </a-collapse-panel>
      </a-collapse>
    </a-card>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { CopyOutlined } from "@ant-design/icons-vue";
import { message } from "ant-design-vue";

const props = defineProps({
  debugInfo: {
    type: Object,
    required: true,
  },
});

const activeKeys = ref(["basic", "system"]);

// 格式化 JSON
const formatJson = (obj) => {
  try {
    return JSON.stringify(obj, null, 2);
  } catch (error) {
    return String(obj);
  }
};

// 格式化時間戳
const formatTimestamp = (timestamp) => {
  if (!timestamp) return "N/A";
  return new Date(timestamp).toLocaleString("zh-TW");
};

// 複製到剪貼板
const copyToClipboard = async () => {
  try {
    const debugText = `
=== 二次 AI 調用調試信息 ===

調用時間: ${formatTimestamp(props.debugInfo.secondaryAI.timestamp)}
用戶問題: ${props.debugInfo.secondaryAI.userQuestion}

=== System Prompt ===
${props.debugInfo.secondaryAI.systemPrompt}

=== User Prompt ===
${props.debugInfo.secondaryAI.userPrompt}

=== 模型配置 ===
${formatJson(props.debugInfo.secondaryAI.modelConfig)}

=== 完整消息陣列 ===
${formatJson(props.debugInfo.secondaryAI.fullMessages)}

=== 格式化工具結果 ===
${props.debugInfo.secondaryAI.formattedResults}

${
  props.debugInfo.secondaryAI.actualResponse
    ? `
=== AI 實際回應 ===
原始回應:
${props.debugInfo.secondaryAI.actualResponse.original}

清理後回應:
${props.debugInfo.secondaryAI.actualResponse.cleaned}

最終回應:
${props.debugInfo.secondaryAI.actualResponse.final}
`
    : ""
}
    `.trim();

    await navigator.clipboard.writeText(debugText);
    message.success("調試信息已複製到剪貼板");
  } catch (error) {
    console.error("複製失敗:", error);
    message.error("複製失敗");
  }
};
</script>

<style scoped>
.debug-panel {
  margin: 16px 0;
}

.debug-card {
  background: #fafafa;
  border: 1px solid #d9d9d9;
}

.debug-card :deep(.ant-card-head) {
  background: #f0f2f5;
  border-bottom: 1px solid #d9d9d9;
}

.debug-card :deep(.ant-card-head-title) {
  font-size: 14px;
  font-weight: 600;
}

.debug-section {
  padding: 8px 0;
}

.debug-item {
  display: flex;
  align-items: flex-start;
  margin-bottom: 8px;
  padding: 4px 0;
}

.debug-item .label {
  font-weight: 500;
  color: #666;
  min-width: 80px;
  margin-right: 8px;
  flex-shrink: 0;
}

.debug-item .value {
  color: #333;
  flex: 1;
}

.text-content {
  background: #f8f8f8;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #e8e8e8;
  font-family: "Monaco", "Menlo", "Ubuntu Mono", monospace;
  font-size: 12px;
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-word;
}

.prompt-content {
  margin-bottom: 8px;
}

.prompt-text {
  background: #f8f8f8;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  padding: 12px;
  font-family: "Monaco", "Menlo", "Ubuntu Mono", monospace;
  font-size: 12px;
  line-height: 1.5;
  color: #333;
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
  max-height: 300px;
  overflow-y: auto;
}

.json-content {
  background: #f8f8f8;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  padding: 12px;
  font-family: "Monaco", "Menlo", "Ubuntu Mono", monospace;
  font-size: 11px;
  line-height: 1.4;
  color: #333;
  white-space: pre;
  overflow-x: auto;
  margin: 0;
  max-height: 200px;
  overflow-y: auto;
}

.prompt-stats {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.debug-card :deep(.ant-collapse) {
  background: transparent;
}

.debug-card :deep(.ant-collapse-item) {
  border-bottom: 1px solid #e8e8e8;
}

.debug-card :deep(.ant-collapse-header) {
  padding: 8px 16px !important;
  font-size: 13px;
  font-weight: 500;
}

.debug-card :deep(.ant-collapse-content-box) {
  padding: 12px 16px !important;
}

.debug-card :deep(.ant-tabs-tab) {
  font-size: 12px;
}

.debug-card :deep(.ant-tabs-content-holder) {
  padding-top: 8px;
}
</style>
