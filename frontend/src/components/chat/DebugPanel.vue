<template>
  <div
    ref="debugPanel"
    class="debug-panel"
    :class="{ expanded: isExpanded, dragging: isDragging }"
    :style="{
      transform: `translate(${position.x}px, ${position.y}px)`,
      left: 0,
      top: 0,
    }">
    <!-- 調試面板頭部 -->
    <div
      class="debug-header"
      @click="togglePanel"
      @mousedown="handleDragStart">
      <div class="debug-title">
        <BugOutlined />
        <span>後端調試面板</span>
        <a-badge
          :count="debugMessages.length"
          :offset="[10, 0]" />
      </div>
      <div class="debug-controls">
        <a-button
          type="text"
          size="small"
          @click.stop="handleResetPosition"
          title="重置位置">
          <AimOutlined />
        </a-button>
        <a-button
          type="text"
          size="small"
          @click.stop="clearMessages"
          title="清空調試信息">
          <ClearOutlined />
        </a-button>
        <a-button
          type="text"
          size="small"
          @click.stop="toggleAutoScroll"
          :class="{ active: autoScroll }"
          title="自動滾動">
          <VerticalAlignBottomOutlined />
        </a-button>

        <UpOutlined
          v-if="isExpanded"
          class="expand-icon" />
        <DownOutlined
          v-else
          class="expand-icon" />
      </div>
    </div>

    <!-- 調試內容 -->
    <div
      class="debug-content"
      v-if="isExpanded">
      <div class="debug-filters">
        <a-space>
          <a-select
            v-model:value="selectedSession"
            placeholder="選擇會話"
            style="width: 200px"
            size="small"
            allow-clear>
            <a-select-option
              v-for="session in uniqueSessions"
              :key="session.sessionId"
              :value="session.sessionId">
              {{ session.conversationId }} - {{ formatTime(session.startTime) }}
            </a-select-option>
          </a-select>

          <a-select
            v-model:value="selectedStages"
            mode="multiple"
            placeholder="過濾階段"
            style="width: 300px"
            size="small"
            :max-tag-count="2">
            <a-select-option
              v-for="stage in availableStages"
              :key="stage"
              :value="stage">
              {{ getStageLabel(stage) }}
            </a-select-option>
          </a-select>
        </a-space>
      </div>

      <div
        class="debug-messages"
        ref="messagesContainer"
        :style="{ maxHeight: panelHeight + 'px' }">
        <div
          v-for="message in filteredMessages"
          :key="message.id"
          class="debug-message"
          :class="[
            `stage-${message.stage}`,
            { error: message.stage === 'error' },
          ]">
          <!-- 消息頭部 -->
          <div class="message-header">
            <div class="message-meta">
              <a-tag
                :color="getStageColor(message.stage)"
                size="small">
                {{ getStageLabel(message.stage) }}
              </a-tag>
              <span class="timestamp">{{ formatTime(message.timestamp) }}</span>
              <span
                class="session-id"
                v-if="!selectedSession">
                {{ message.sessionId.split("_")[1] }}
              </span>
            </div>
            <a-button
              type="text"
              size="small"
              @click="toggleMessageDetails(message.id)"
              :class="{ active: expandedMessages.includes(message.id) }">
              <UpOutlined v-if="expandedMessages.includes(message.id)" />
              <DownOutlined v-else />
            </a-button>
          </div>

          <!-- 消息內容 -->
          <div class="message-content">
            <div class="message-title">{{ message.message }}</div>

            <!-- 詳細信息 -->
            <div
              v-if="expandedMessages.includes(message.id)"
              class="message-details">
              <!-- 系統提示詞預覽 -->
              <div
                v-if="message.promptPreview"
                class="detail-section">
                <div class="detail-title">
                  系統提示詞預覽 ({{ message.promptLength }} 字符)
                </div>
                <div class="code-block">{{ message.promptPreview }}</div>
                <div class="prompt-flags">
                  <a-tag
                    v-if="message.hasToolInfo"
                    color="green"
                    >包含工具信息</a-tag
                  >
                  <a-tag
                    v-if="message.hasEmployeeTools"
                    color="blue"
                    >包含員工工具</a-tag
                  >
                </div>
              </div>

              <!-- 模型信息 -->
              <div
                v-if="message.model"
                class="detail-section">
                <div class="detail-title">模型信息</div>
                <div class="model-info">
                  <div><strong>ID:</strong> {{ message.model.id }}</div>
                  <div><strong>名稱:</strong> {{ message.model.name }}</div>
                  <div>
                    <strong>顯示名稱:</strong> {{ message.model.display_name }}
                  </div>
                  <div>
                    <strong>提供者:</strong> {{ message.model.provider }}
                  </div>
                </div>
              </div>

              <!-- 上下文信息 -->
              <div
                v-if="message.contextPreview"
                class="detail-section">
                <div class="detail-title">
                  對話上下文 ({{ message.messageCount }} 條消息)
                </div>
                <div class="context-preview">
                  <div
                    v-for="(ctx, idx) in message.contextPreview"
                    :key="idx"
                    class="context-item">
                    <a-tag
                      :color="ctx.role === 'user' ? 'blue' : 'green'"
                      size="small">
                      {{ ctx.role }}
                    </a-tag>
                    {{ ctx.contentPreview }}
                  </div>
                </div>
              </div>

              <!-- AI 回應信息 -->
              <div
                v-if="message.responsePreview"
                class="detail-section">
                <div class="detail-title">
                  AI 回應 ({{ message.responseLength }} 字符,
                  {{ message.tokensUsed }} tokens,
                  {{ message.processingTime }}ms)
                </div>
                <div class="response-info">
                  <div><strong>提供者:</strong> {{ message.provider }}</div>
                  <div><strong>模型:</strong> {{ message.model }}</div>
                </div>
                <div class="code-block">{{ message.responsePreview }}</div>
              </div>

              <!-- 工具調用信息 -->
              <div
                v-if="message.toolCalls && message.toolCalls.length > 0"
                class="detail-section">
                <div class="detail-title">
                  工具調用 ({{ message.toolCallsCount }} 個)
                </div>
                <div class="tool-calls">
                  <div
                    v-for="(call, idx) in message.toolCalls"
                    :key="idx"
                    class="tool-call">
                    <a-tag color="purple">{{ call.name }}</a-tag>
                    <span class="format">{{ call.format }}</span>
                    <div class="parameters">
                      {{ JSON.stringify(call.parameters, null, 2) }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- 工具結果信息 -->
              <div
                v-if="message.toolResults && message.toolResults.length > 0"
                class="detail-section">
                <div class="detail-title">
                  工具執行結果 ({{ message.toolResultsCount }} 個)
                </div>
                <div class="tool-results">
                  <div
                    v-for="(result, idx) in message.toolResults"
                    :key="idx"
                    class="tool-result">
                    <div class="result-header">
                      <a-tag :color="result.success ? 'green' : 'red'">
                        {{ result.tool_name }}
                      </a-tag>
                      <span class="execution-time"
                        >{{ result.execution_time }}ms</span
                      >
                    </div>
                    <div class="result-data">{{ result.dataPreview }}</div>
                  </div>
                </div>
              </div>

              <!-- 錯誤信息 -->
              <div
                v-if="message.error"
                class="detail-section error">
                <div class="detail-title">錯誤信息</div>
                <div class="error-message">{{ message.error }}</div>
              </div>

              <!-- 性能信息 -->
              <div
                v-if="message.totalTime"
                class="detail-section">
                <div class="detail-title">性能指標</div>
                <div class="performance-info">
                  <div><strong>總耗時:</strong> {{ message.totalTime }}ms</div>
                  <div v-if="message.usedSecondaryAI">
                    <strong>使用二次 AI:</strong> 是
                  </div>
                </div>
              </div>

              <!-- 其他詳細數據 -->
              <div
                v-if="hasOtherDetails(message)"
                class="detail-section">
                <div class="detail-title">其他信息</div>
                <pre class="json-data">{{
                  JSON.stringify(getOtherDetails(message), null, 2)
                }}</pre>
              </div>
            </div>
          </div>
        </div>

        <!-- 空狀態 -->
        <div
          v-if="filteredMessages.length === 0"
          class="empty-state">
          <BugOutlined style="font-size: 48px; color: #d9d9d9" />
          <div>暫無調試信息</div>
          <div class="empty-tip">發送消息後將顯示調試信息</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch, onMounted, onUnmounted } from "vue";
import { useLocalStorage } from "@vueuse/core";
import { useWebSocket } from "@/composables/useWebSocket";
import {
  BugOutlined,
  ClearOutlined,
  VerticalAlignBottomOutlined,
  UpOutlined,
  DownOutlined,
  AimOutlined,
} from "@ant-design/icons-vue";

// Props
const props = defineProps({
  conversationId: {
    type: [String, Number],
    default: null,
  },
});

// 響應式數據
const isExpanded = ref(false);
const autoScroll = ref(true);
const debugMessages = ref([]);
const selectedSession = ref(null);
const selectedStages = ref([]);
const expandedMessages = ref([]);
const messagesContainer = ref(null);
const panelHeight = ref(300);

// 拖拉相關狀態
const debugPanel = ref(null);
const isDragging = ref(false);
const dragOffset = ref({ x: 0, y: 0 });

// 使用 localStorage 記住面板位置，調整預設位置避免擋到發送按鈕
const position = useLocalStorage("backend-debug-panel-position", {
  x: window.innerWidth - 620, // 預設在右側，留出更多空間
  y: 100, // 調高位置，避免擋到發送按鈕
});

// WebSocket
const { socket, addEventListener, removeEventListener } = useWebSocket();

// 計算屬性
const uniqueSessions = computed(() => {
  const sessions = new Map();
  debugMessages.value.forEach((msg) => {
    if (!sessions.has(msg.sessionId)) {
      sessions.set(msg.sessionId, {
        sessionId: msg.sessionId,
        conversationId: msg.conversationId,
        startTime: msg.timestamp,
      });
    }
  });
  return Array.from(sessions.values()).sort(
    (a, b) => b.startTime - a.startTime
  );
});

const availableStages = computed(() => {
  const stages = new Set(debugMessages.value.map((msg) => msg.stage));
  return Array.from(stages).sort();
});

const filteredMessages = computed(() => {
  let filtered = debugMessages.value;

  if (selectedSession.value) {
    filtered = filtered.filter(
      (msg) => msg.sessionId === selectedSession.value
    );
  }

  if (selectedStages.value.length > 0) {
    filtered = filtered.filter((msg) =>
      selectedStages.value.includes(msg.stage)
    );
  }

  if (props.conversationId) {
    filtered = filtered.filter(
      (msg) => String(msg.conversationId) === String(props.conversationId)
    );
  }

  return filtered.sort((a, b) => a.timestamp - b.timestamp);
});

// 方法
const togglePanel = (event) => {
  // 如果是拖拉操作，不切換面板狀態
  if (isDragging.value) return;
  isExpanded.value = !isExpanded.value;
};

// 拖拉功能實現
const handleDragStart = (event) => {
  // 如果點擊的是控制按鈕，不開始拖拉
  if (event.target.closest(".debug-controls")) {
    return;
  }

  isDragging.value = true;
  const rect = debugPanel.value.getBoundingClientRect();
  dragOffset.value = {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };

  // 防止文字選取
  document.body.style.userSelect = "none";
  document.body.style.cursor = "grabbing";

  // 添加全域事件監聽器
  document.addEventListener("mousemove", handleDragMove);
  document.addEventListener("mouseup", handleDragEnd);

  event.preventDefault();
};

const handleDragMove = (event) => {
  if (!isDragging.value) return;

  const newX = event.clientX - dragOffset.value.x;
  const newY = event.clientY - dragOffset.value.y;

  // 邊界限制
  const panelWidth = debugPanel.value?.offsetWidth || 600;
  const panelHeight = debugPanel.value?.offsetHeight || 400;

  const maxX = window.innerWidth - panelWidth;
  const maxY = window.innerHeight - panelHeight;

  position.value = {
    x: Math.max(0, Math.min(maxX, newX)),
    y: Math.max(0, Math.min(maxY, newY)),
  };
};

const handleDragEnd = () => {
  isDragging.value = false;
  document.body.style.userSelect = "";
  document.body.style.cursor = "";

  // 移除全域事件監聽器
  document.removeEventListener("mousemove", handleDragMove);
  document.removeEventListener("mouseup", handleDragEnd);
};

// 重置位置
const handleResetPosition = () => {
  position.value = {
    x: window.innerWidth - 620,
    y: 100,
  };
};

const clearMessages = () => {
  debugMessages.value = [];
  expandedMessages.value = [];
};

const toggleAutoScroll = () => {
  autoScroll.value = !autoScroll.value;
};

const toggleMessageDetails = (messageId) => {
  const index = expandedMessages.value.indexOf(messageId);
  if (index > -1) {
    expandedMessages.value.splice(index, 1);
  } else {
    expandedMessages.value.push(messageId);
  }
};

const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleTimeString("zh-TW", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
  });
};

const getStageLabel = (stage) => {
  const labels = {
    start: "開始",
    model_selected: "模型選擇",
    context_loading: "載入上下文",
    context_loaded: "上下文完成",
    system_prompt_generating: "生成提示詞",
    system_prompt_generated: "提示詞完成",
    ai_calling: "調用 AI",
    ai_response_received: "AI 回應",
    tool_processing_start: "工具處理",
    tool_processing_complete: "工具完成",
    final_response: "最終回應",
    complete: "完成",
    error: "錯誤",
  };
  return labels[stage] || stage;
};

const getStageColor = (stage) => {
  const colors = {
    start: "blue",
    model_selected: "cyan",
    context_loading: "geekblue",
    context_loaded: "geekblue",
    system_prompt_generating: "purple",
    system_prompt_generated: "purple",
    ai_calling: "orange",
    ai_response_received: "orange",
    tool_processing_start: "magenta",
    tool_processing_complete: "magenta",
    final_response: "lime",
    complete: "green",
    error: "red",
  };
  return colors[stage] || "default";
};

const hasOtherDetails = (message) => {
  const excludeKeys = [
    "id",
    "sessionId",
    "conversationId",
    "stage",
    "timestamp",
    "message",
    "promptPreview",
    "promptLength",
    "hasToolInfo",
    "hasEmployeeTools",
    "model",
    "contextPreview",
    "messageCount",
    "responsePreview",
    "responseLength",
    "tokensUsed",
    "processingTime",
    "provider",
    "toolCalls",
    "toolCallsCount",
    "toolResults",
    "toolResultsCount",
    "error",
    "totalTime",
    "usedSecondaryAI",
  ];
  return Object.keys(message).some((key) => !excludeKeys.includes(key));
};

const getOtherDetails = (message) => {
  const excludeKeys = [
    "id",
    "sessionId",
    "conversationId",
    "stage",
    "timestamp",
    "message",
    "promptPreview",
    "promptLength",
    "hasToolInfo",
    "hasEmployeeTools",
    "model",
    "contextPreview",
    "messageCount",
    "responsePreview",
    "responseLength",
    "tokensUsed",
    "processingTime",
    "provider",
    "toolCalls",
    "toolCallsCount",
    "toolResults",
    "toolResultsCount",
    "error",
    "totalTime",
    "usedSecondaryAI",
  ];
  const result = {};
  Object.keys(message).forEach((key) => {
    if (!excludeKeys.includes(key)) {
      result[key] = message[key];
    }
  });
  return result;
};

const scrollToBottom = () => {
  if (autoScroll.value && messagesContainer.value) {
    nextTick(() => {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    });
  }
};

// WebSocket 事件處理
const handleDebugMessage = (data) => {
  const message = {
    id: `${data.sessionId}_${data.stage}_${Date.now()}`,
    ...data,
  };
  debugMessages.value.push(message);
  scrollToBottom();
};

// 生命週期
onMounted(() => {
  // 監聽調試信息事件
  addEventListener("debug_info", handleDebugMessage);
});

onUnmounted(() => {
  // 移除事件監聽器
  removeEventListener("debug_info", handleDebugMessage);
});

watch(
  () => filteredMessages.value.length,
  () => {
    scrollToBottom();
  }
);
</script>

<style scoped>
.debug-panel {
  position: fixed;
  width: 600px;
  max-width: 90vw;
  max-height: 70vh;
  background: var(--custom-bg-primary);
  border: 0px solid var(--custom-border-primary);
  border-radius: 8px;
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  transition: all 0.3s ease;
}

.debug-panel.dragging {
  transition: none;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}

.debug-panel:not(.expanded) {
  height: 48px;
}

.debug-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--custom-bg-tertiary) !important;
  color: var(--custom-text-primary);
  border-bottom: 1px solid var(--custom-border-secondary);
  cursor: grab;
  user-select: none;
}

.debug-header:active {
  cursor: grabbing;
}

.debug-header:hover {
  background: var(--custom-bg-secondary);
}

.debug-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  color: var(--custom-text-primary);
}

.debug-controls {
  display: flex;
  align-items: center;
  gap: 4px;
}

.debug-controls .ant-btn.active {
  color: var(--primary-color);
  background: var(--custom-bg-secondary);
}

.expand-icon {
  transition: transform 0.3s ease;
}

.debug-content {
  padding: 16px;
  background: var(--custom-bg-primary) !important;
  max-height: calc(70vh - 80px);
  overflow: hidden;
}

.debug-filters {
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--custom-border-primary);
}

.debug-messages {
  overflow-y: auto;
  padding-right: 4px;
}

.debug-message {
  margin-bottom: 12px;
  padding: 12px;
  border: 1px solid var(--custom-border-primary);
  border-radius: 6px;
  background: var(--custom-bg-secondary);
  transition: all 0.2s ease;
}

.debug-message:hover {
  border-color: var(--custom-border-secondary);
  background: var(--custom-bg-tertiary);
}

.debug-message.error {
  border-color: var(--error-color);
  background: var(--error-bg-color);
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.message-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.timestamp {
  font-size: 12px;
  color: var(--custom-text-tertiary);
  font-family: monospace;
}

.session-id {
  font-size: 10px;
  color: var(--custom-text-tertiary);
  font-family: monospace;
}

.message-content {
  font-size: 14px;
}

.message-title {
  font-weight: 500;
  color: var(--custom-text-primary);
  margin-bottom: 8px;
}

.message-details {
  margin-top: 12px;
}

.detail-section {
  margin-bottom: 16px;
  padding: 12px;
  background: var(--custom-bg-primary);
  border: 1px solid var(--custom-border-primary);
  border-radius: 4px;
}

.detail-section.error {
  border-color: var(--error-color);
  background: var(--error-bg-color);
}

.detail-title {
  font-weight: 600;
  color: var(--custom-text-primary);
  margin-bottom: 8px;
  font-size: 13px;
}

.code-block {
  background: var(--custom-bg-secondary);
  border: 1px solid var(--custom-border-primary);
  border-radius: 4px;
  padding: 8px;
  font-family: "Courier New", monospace;
  font-size: 12px;
  color: var(--custom-text-primary);
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 200px;
  overflow-y: auto;
}

.prompt-flags {
  margin-top: 8px;
}

.model-info {
  font-size: 12px;
  line-height: 1.6;
}

.context-preview {
  max-height: 150px;
  overflow-y: auto;
}

.context-item {
  margin-bottom: 4px;
  font-size: 12px;
  line-height: 1.4;
}

.response-info {
  font-size: 12px;
  margin-bottom: 8px;
  line-height: 1.6;
}

.tool-calls,
.tool-results {
  max-height: 200px;
  overflow-y: auto;
}

.tool-call {
  margin-bottom: 8px;
  padding: 8px;
  background: var(--custom-bg-secondary);
  border-radius: 4px;
  border: 1px solid var(--custom-border-primary);
}

.tool-call .format {
  margin-left: 8px;
  font-size: 11px;
  color: var(--primary-color);
}

.tool-call .parameters {
  margin-top: 4px;
  font-family: monospace;
  font-size: 11px;
  background: var(--custom-bg-primary);
  padding: 4px;
  border-radius: 2px;
  white-space: pre-wrap;
}

.tool-result {
  margin-bottom: 8px;
  padding: 8px;
  border-radius: 4px;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.execution-time {
  font-size: 11px;
  color: var(--custom-text-tertiary);
  font-family: monospace;
}

.result-data {
  font-family: monospace;
  font-size: 11px;
  background: var(--custom-bg-secondary);
  padding: 4px;
  border-radius: 2px;
  word-break: break-all;
}

.error-message {
  color: var(--error-color);
  font-family: monospace;
  font-size: 12px;
}

.performance-info {
  font-size: 12px;
  line-height: 1.6;
}

.json-data {
  font-family: monospace;
  font-size: 11px;
  background: var(--custom-bg-secondary);
  border: 1px solid var(--custom-border-primary);
  border-radius: 4px;
  padding: 8px;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 200px;
  overflow-y: auto;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--custom-text-tertiary);
}

.empty-tip {
  font-size: 12px;
  margin-top: 8px;
}

/* 自定義滾動條 */
.debug-messages::-webkit-scrollbar,
.code-block::-webkit-scrollbar,
.json-data::-webkit-scrollbar {
  width: 6px;
}

.debug-messages::-webkit-scrollbar-track,
.code-block::-webkit-scrollbar-track,
.json-data::-webkit-scrollbar-track {
  background: var(--custom-bg-primary);
  border-radius: 3px;
}

.debug-messages::-webkit-scrollbar-thumb,
.code-block::-webkit-scrollbar-thumb,
.json-data::-webkit-scrollbar-thumb {
  background: var(--custom-border-primary);
  border-radius: 3px;
}

.debug-messages::-webkit-scrollbar-thumb:hover,
.code-block::-webkit-scrollbar-thumb:hover,
.json-data::-webkit-scrollbar-thumb:hover {
  background: var(--custom-border-secondary);
}
</style>
