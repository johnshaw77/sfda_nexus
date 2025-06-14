<template>
  <div
    v-if="visible"
    ref="debugPanel"
    class="debug-panel-draggable"
    :style="{
      position: 'fixed',
      left: `${position.x}px`,
      top: `${position.y}px`,
      zIndex: 1000,
    }">
    <!-- 拖拉手柄 -->
    <div
      ref="dragHandle"
      class="debug-panel-header"
      @mousedown="handleDragStart">
      <div class="debug-header-content">
        <div class="debug-title">
          <span class="debug-icon">🐛</span>
          <h4>調試面板</h4>
        </div>
        <div class="debug-header-actions">
          <a-tooltip
            title="重置位置"
            placement="bottom">
            <a-button
              type="text"
              size="small"
              @click="handleResetPosition"
              class="debug-action-btn">
              <svg
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="currentColor">
                <path
                  d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
              </svg>
            </a-button>
          </a-tooltip>
          <a-button
            type="text"
            size="small"
            @click="handleClose"
            class="debug-action-btn">
            <CloseOutlined />
          </a-button>
        </div>
      </div>
    </div>

    <!-- 調試內容 -->
    <div class="debug-panel-content">
      <a-row :gutter="[16, 8]">
        <a-col :span="24">
          <div class="debug-item">
            <label>當前模型:</label>
            <span class="debug-value">{{ selectedModelInfo }}</span>
          </div>
        </a-col>
        <a-col :span="24">
          <div class="debug-item">
            <label>模型端點:</label>
            <span class="debug-value mono">{{ modelEndpoint }}</span>
          </div>
        </a-col>
        <a-col :span="24">
          <div class="debug-item">
            <label>後端 API:</label>
            <span class="debug-value mono">{{ apiBaseUrl }}</span>
          </div>
        </a-col>
        <a-col :span="16">
          <div class="debug-item">
            <label>對話模式:</label>
            <span class="debug-value">{{
              streamMode ? "串流模式" : "普通模式"
            }}</span>
          </div>
        </a-col>

        <a-col :span="12">
          <div class="debug-item">
            <label>當前智能體:</label>
            <span class="debug-value">{{ agentName || "無" }}</span>
          </div>
        </a-col>

        <a-col :span="12">
          <div class="debug-item">
            <label>消息數量:</label>
            <span class="debug-value">{{ messageCount }}</span>
          </div>
        </a-col>
        <a-col :span="12">
          <div class="debug-item">
            <label>Temperature:</label>
            <span class="debug-value">{{ temperature }}</span>
          </div>
        </a-col>
        <a-col :span="12">
          <div class="debug-item">
            <label>Max Tokens:</label>
            <span class="debug-value">{{ maxTokens }}</span>
          </div>
        </a-col>
        <a-col :span="24">
          <label>用戶系統提示詞:</label>
        </a-col>

        <a-col :span="24">
          <div class="debug-item">
            <div class="debug-value system-prompt">
              {{ systemPrompt || "無自定義系統提示詞" }}
            </div>
          </div>
        </a-col>
        <a-col :span="24">
          <label>完整系統提示詞:</label>
        </a-col>
        <a-col :span="24">
          <div class="debug-item">
            <div class="debug-actions">
              <a-button
                type="link"
                size="small"
                @click="handlePreviewFullPrompt"
                :loading="loadingFullPrompt">
                {{ fullSystemPrompt ? "重新載入" : "載入預覽" }}
              </a-button>
              <a-button
                v-if="fullSystemPrompt"
                type="link"
                size="small"
                @click="showFullPromptModal = true">
                查看詳情
              </a-button>
            </div>
          </div>
        </a-col>
        <a-col :span="24">
          <div
            class="debug-value system-prompt"
            v-if="fullSystemPrompt">
            {{ getFullPromptPreview() }}
          </div>
          <div
            class="debug-value"
            v-else>
            點擊「載入預覽」查看包含全域規則的完整系統提示詞
          </div>
        </a-col>
        <a-col :span="24">
          <div class="debug-item">
            <label>最後發送狀態:</label>
            <div class="debug-status">
              <a-tag :color="sending ? 'processing' : 'default'">
                {{ sending ? "發送中" : "待命" }}
              </a-tag>
              <a-tag :color="isStreaming ? 'processing' : 'default'">
                {{ isStreaming ? "串流中" : "非串流" }}
              </a-tag>
              <a-tag :color="aiTyping ? 'processing' : 'default'">
                {{ aiTyping ? "AI 回應中" : "AI 待命" }}
              </a-tag>
            </div>
          </div>
        </a-col>
      </a-row>
    </div>

    <!-- 完整系統提示詞預覽模態框 -->
    <a-modal
      v-model:open="showFullPromptModal"
      title="完整系統提示詞預覽"
      width="80%"
      :footer="null">
      <div class="full-prompt-preview">
        <div class="prompt-info">
          <a-row :gutter="16">
            <a-col :span="8">
              <a-statistic
                title="總長度"
                :value="fullSystemPrompt?.length || 0"
                suffix="字符" />
            </a-col>
            <a-col :span="8">
              <a-statistic
                title="包含全域規則"
                :value="
                  fullSystemPrompt?.includes('🔒 核心行為規則') ? '是' : '否'
                " />
            </a-col>
            <a-col :span="8">
              <a-statistic
                title="生成時間"
                :value="fullPromptGeneratedAt || '未知'" />
            </a-col>
          </a-row>
        </div>
        <a-divider />
        <div class="prompt-content">
          <a-typography-paragraph
            :copyable="{ text: fullSystemPrompt }"
            class="prompt-text">
            <pre>{{ fullSystemPrompt }}</pre>
          </a-typography-paragraph>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useLocalStorage } from "@vueuse/core";
import { message } from "ant-design-vue";
import api from "@/api";

// Props
const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  selectedModelInfo: {
    type: String,
    default: "未選擇模型",
  },
  modelEndpoint: {
    type: String,
    default: "未配置端點",
  },
  apiBaseUrl: {
    type: String,
    default: "",
  },
  streamMode: {
    type: Boolean,
    default: false,
  },
  agentName: {
    type: String,
    default: "",
  },
  messageCount: {
    type: Number,
    default: 0,
  },
  temperature: {
    type: Number,
    default: 0.7,
  },
  maxTokens: {
    type: Number,
    default: 8192,
  },
  systemPrompt: {
    type: String,
    default: "",
  },
  sending: {
    type: Boolean,
    default: false,
  },
  isStreaming: {
    type: Boolean,
    default: false,
  },
  aiTyping: {
    type: Boolean,
    default: false,
  },
  selectedModelProvider: {
    type: String,
    default: "ollama",
  },
});

// Emits
const emit = defineEmits(["close", "preview-full-prompt"]);

// 拖拉相關狀態
const debugPanel = ref(null);
const dragHandle = ref(null);
const isDragging = ref(false);
const dragOffset = ref({ x: 0, y: 0 });

// 使用 localStorage 記住面板位置
const position = useLocalStorage("debug-panel-position", {
  x: window.innerWidth - 320, // 預設在右側
  y: 180,
});

// 完整系統提示詞相關狀態
const showFullPromptModal = ref(false);
const fullSystemPrompt = ref("");
const fullPromptGeneratedAt = ref("");
const loadingFullPrompt = ref(false);

// 拖拉功能實現
const handleDragStart = (event) => {
  if (event.target.closest(".debug-action-btn")) {
    return; // 如果點擊的是按鈕，不開始拖拉
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
  const panelWidth = debugPanel.value?.offsetWidth || 300;
  const panelHeight = debugPanel.value?.offsetHeight || 450;

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
    x: window.innerWidth - 320,
    y: 180,
  };
  message.success("調試面板位置已重置");
};

// 關閉面板
const handleClose = () => {
  emit("close");
};

// 預覽完整系統提示詞
const handlePreviewFullPrompt = async () => {
  if (loadingFullPrompt.value) return;

  loadingFullPrompt.value = true;
  try {
    const response = await api.post("/api/chat/system-prompt/preview", {
      base_prompt: props.systemPrompt,
      model_type: props.selectedModelProvider,
    });

    if (response.data.success) {
      fullSystemPrompt.value = response.data.data.full_system_prompt;
      fullPromptGeneratedAt.value = new Date(
        response.data.data.generated_at
      ).toLocaleString();
      message.success("完整系統提示詞載入成功");
    } else {
      throw new Error(response.data.message || "載入失敗");
    }
  } catch (error) {
    console.error("載入完整系統提示詞失敗:", error);
    message.error(`載入失敗: ${error.message}`);
  } finally {
    loadingFullPrompt.value = false;
  }
};

// 獲取完整提示詞預覽（截斷顯示）
const getFullPromptPreview = () => {
  if (!fullSystemPrompt.value) return "";
  const preview = fullSystemPrompt.value.substring(0, 200);
  return preview + (fullSystemPrompt.value.length > 200 ? "..." : "");
};

// 監聽視窗大小變化，調整面板位置
const handleWindowResize = () => {
  const panelWidth = debugPanel.value?.offsetWidth || 300;
  const panelHeight = debugPanel.value?.offsetHeight || 450;

  const maxX = window.innerWidth - panelWidth;
  const maxY = window.innerHeight - panelHeight;

  if (position.value.x > maxX || position.value.y > maxY) {
    position.value = {
      x: Math.max(0, Math.min(maxX, position.value.x)),
      y: Math.max(0, Math.min(maxY, position.value.y)),
    };
  }
};

onMounted(() => {
  window.addEventListener("resize", handleWindowResize);
});

onUnmounted(() => {
  window.removeEventListener("resize", handleWindowResize);
  // 清理拖拉事件監聽器
  document.removeEventListener("mousemove", handleDragMove);
  document.removeEventListener("mouseup", handleDragEnd);
  document.body.style.userSelect = "";
  document.body.style.cursor = "";
});
</script>

<style scoped>
.debug-panel-draggable {
  width: 300px;
  max-width: 300px;
  height: 450px;
  background: var(--custom-bg-secondary);
  border: 1px solid var(--custom-border-primary);
  border-radius: 8px;
  font-family:
    "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New",
    monospace;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  animation: slideInFromRight 0.3s ease-out;
  backdrop-filter: blur(10px);
  transition: box-shadow 0.2s ease;
}

.debug-panel-draggable:hover {
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

@keyframes slideInFromRight {
  0% {
    opacity: 0;
    transform: translateX(20px) scale(0.95);
  }
  100% {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
}

.debug-panel-header {
  background: var(--custom-bg-tertiary);
  border-bottom: 1px solid var(--custom-border-primary);
  border-radius: 8px 8px 0 0;
  cursor: grab;
  user-select: none;
  flex-shrink: 0;
  transition: background-color 0.2s ease;
}

.debug-panel-header:active {
  cursor: grabbing;
  background: var(--custom-bg-quaternary);
}

.debug-header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
}

.debug-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.debug-icon {
  font-size: 16px;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.debug-title h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--custom-text-primary);
}

.debug-header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.debug-action-btn {
  width: 24px !important;
  height: 24px !important;
  padding: 0 !important;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  color: var(--custom-text-secondary);
  transition: all 0.2s ease;
}

.debug-action-btn:hover {
  background: var(--custom-bg-primary) !important;
  color: var(--primary-color) !important;
  transform: scale(1.1);
}

.debug-panel-content {
  padding: 16px;
  flex: 1;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--custom-border-primary) transparent;
}

.debug-panel-content::-webkit-scrollbar {
  width: 6px;
}

.debug-panel-content::-webkit-scrollbar-track {
  background: transparent;
}

.debug-panel-content::-webkit-scrollbar-thumb {
  background: var(--custom-border-primary);
  border-radius: 3px;
}

.debug-panel-content::-webkit-scrollbar-thumb:hover {
  background: var(--custom-text-tertiary);
}

.debug-item {
  display: flex;
  align-items: flex-start;
  margin-bottom: 8px;
  font-size: 12px;
}

.debug-item label {
  font-weight: 600;
  color: var(--custom-text-secondary);
  min-width: 80px;
  margin-right: 8px;
  flex-shrink: 0;
}

.debug-value {
  color: var(--custom-text-primary);
  word-break: break-all;
  flex: 1;
}

.debug-value.mono {
  font-family:
    "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New",
    monospace;
  background: var(--custom-bg-primary);
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid var(--custom-border-primary);
}

.debug-value.system-prompt {
  background: var(--custom-bg-primary);
  padding: 8px;
  border-radius: 4px;
  border: 1px solid var(--custom-border-primary);
  max-height: 100px;
  overflow-y: auto;
  white-space: pre-wrap;
  font-size: 11px;
  line-height: 1.4;
}

.debug-status {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.debug-status .ant-tag {
  margin: 0;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 12px;
}

.debug-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.debug-actions .ant-btn {
  padding: 0 8px;
  height: 24px;
  font-size: 11px;
}

/* 完整系統提示詞預覽模態框樣式 */
.full-prompt-preview {
  max-height: 70vh;
  overflow-y: auto;
}

.prompt-info {
  background: var(--custom-bg-tertiary);
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 16px;
}

.prompt-content {
  background: var(--custom-bg-primary);
  border: 1px solid var(--custom-border-primary);
  border-radius: 8px;
  padding: 16px;
}

.prompt-text pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family:
    "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New",
    monospace;
  font-size: 12px;
  line-height: 1.5;
  color: var(--custom-text-primary);
  background: transparent;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .debug-panel-draggable {
    width: 280px;
    height: 400px;
  }

  .debug-panel-content {
    padding: 12px;
  }

  .debug-item {
    font-size: 11px;
  }

  .debug-item label {
    min-width: 70px;
  }
}
</style>
