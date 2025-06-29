<!--
/**
 * @fileoverview MessageContent - 消息內容渲染組件
 * @description 負責渲染不同類型的消息內容，包括純文本、動畫內容、代碼高亮、
 * 錯誤消息等。支援工具摘要顯示、用戶消息的展開/收起功能，
 * 以及智能的內容渲染策略選擇。
 * 
 * @component MessageContent
 * @author SFDA Development Team
 * @since 1.0.0
 * @version 2.1.0
 * 
 * @example
 * <MessageContent 
 *   :message="messageObject"
 *   :is-error-message="false"
 *   :should-use-content-animation="true"
 *   :is-chart-message="false"
 *   :is-user-message-collapsed="true"
 *   :should-show-expand-button="false"
 *   :realtime-render="true"
 *   :tool-summaries="summaryArray"
 *   @toggle-user-message-expand="handleToggleExpand"
 * />
 * 
 * @description 功能特點：
 * - 多種渲染模式：純文本、動畫內容、代碼高亮、錯誤消息
 * - 工具摘要顯示：展示 MCP 工具提供的數據摘要
 * - 智能內容動畫：根據內容類型和長度決定是否使用動畫
 * - 用戶消息管理：支援長文本的展開/收起功能
 * - 主題適配：支援暗黑/明亮主題切換
 * - 錯誤狀態處理：特殊的錯誤消息顯示樣式
 * 
 * @requires vue
 * @requires @ant-design/icons-vue
 * @requires @/components/common/AnimatedContent.vue
 * @requires @/components/common/CodeHighlight.vue
 */
-->
<template>
  <div class="message-text">
    <!-- Summary 模式標識 -->
    <div
      v-if="message.role === 'assistant' && message.used_summary"
      class="summary-mode-indicator">
      <div class="summary-badge">
        <FileTextOutlined />
        <span>工具摘要模式</span>
        <a-tooltip
          title="工具提供了數據摘要，AI 基於此摘要和完整數據進行了智能分析">
          <InfoCircleOutlined class="info-icon" />
        </a-tooltip>
      </div>
    </div>

    <!-- 工具 Summary 顯示（AI 回應之前） -->
    <div
      v-if="message.role === 'assistant' && toolSummaries.length > 0"
      class="tool-summaries-section">
      <div
        v-for="(summaryItem, index) in toolSummaries"
        :key="index"
        class="tool-summary-item">
        <div class="tool-summary-header">
          <FileTextOutlined />
          <span class="tool-summary-title"
            >{{ summaryItem.toolName }} 數據摘要</span
          >
          <a-tag
            color="green"
            size="small"
            >工具摘要</a-tag
          >
        </div>
        <div class="tool-summary-content">
          {{ summaryItem.summary }}
        </div>
      </div>
    </div>

    <!-- AI 消息 - 錯誤訊息使用純文本顯示 -->
    <div
      v-if="message.role === 'assistant' && isErrorMessage"
      class="plain-text error-text">
      {{ message.content }}
    </div>

    <!-- AI 消息 - 使用動畫內容組件 -->
    <AnimatedContent
      v-else-if="
        shouldUseContentAnimation &&
        message.role === 'assistant' &&
        !isChartMessage
      "
      :content="message.content"
      :enable-animation="true"
      :animation-speed="'normal'"
      :chunk-size-range="[15, 25]"
      :enable-gradient-effect="true"
      ref="animatedContentRef"
      @animation-complete="() => {}" />

    <!-- AI 消息 - 使用 CodeHighlight 組件 (fallback) -->
    <CodeHighlight
      v-else-if="message.role === 'assistant' && !isChartMessage"
      :content="message.content"
      :is-streaming="message.isStreaming"
      :enable-keyword-highlight="true"
      theme="auto"
      :debug="false"
      :realtime-render="realtimeRender"
      ref="codeHighlightRef" />

    <!-- 純文本（用戶消息） -->
    <div
      v-else
      class="plain-text"
      :class="{
        collapsed: isUserMessageCollapsed && shouldShowExpandButton,
      }"
      ref="userMessageContent">
      {{ message.content }}
    </div>

    <!-- 展開/收起按鈕（用戶消息） -->
    <div
      v-if="message.role === 'user' && shouldShowExpandButton"
      class="expand-button-container">
      <a-button
        type="link"
        size="small"
        @click="$emit('toggle-user-message-expand')"
        class="expand-button">
        <template #icon>
          <svg
            v-if="isUserMessageCollapsed"
            viewBox="0 0 24 24"
            width="14"
            height="14"
            fill="currentColor">
            <path d="M7 14l5-5 5 5z" />
          </svg>
          <svg
            v-else
            viewBox="0 0 24 24"
            width="14"
            height="14"
            fill="currentColor">
            <path d="M7 10l5 5 5-5z" />
          </svg>
        </template>
        {{ isUserMessageCollapsed ? "展開" : "收起" }}
      </a-button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import { FileTextOutlined, InfoCircleOutlined } from "@ant-design/icons-vue";
import AnimatedContent from "@/components/common/AnimatedContent.vue";
import CodeHighlight from "@/components/common/CodeHighlight.vue";

/**
 * @typedef {Object} MessageObject
 * @property {string} id - 消息唯一標識符
 * @property {'user'|'assistant'|'system'} role - 消息角色類型
 * @property {string} content - 消息文本內容
 * @property {boolean} [isStreaming] - 是否正在串流
 * @property {boolean} [used_summary] - 是否使用了工具摘要模式
 * @property {Object} [metadata] - 消息元數據
 */

/**
 * @typedef {Object} ToolSummary
 * @property {string} toolName - 工具名稱
 * @property {string} summary - 工具摘要內容
 */

/**
 * 組件 Props 定義
 * @typedef {Object} Props
 * @property {MessageObject} message - 要渲染的消息對象
 * @property {boolean} [isErrorMessage=false] - 是否為錯誤消息
 * @property {boolean} [shouldUseContentAnimation=true] - 是否使用內容動畫
 * @property {boolean} [isChartMessage=false] - 是否為圖表消息
 * @property {boolean} [isUserMessageCollapsed=false] - 用戶消息是否折疊
 * @property {boolean} [shouldShowExpandButton=false] - 是否顯示展開按鈕
 * @property {boolean} [realtimeRender=true] - 是否啟用實時渲染
 * @property {ToolSummary[]} [toolSummaries=[]] - 工具摘要列表
 */
const props = defineProps({
  /** @type {MessageObject} 消息對象，包含要渲染的所有內容和元數據 */
  message: {
    type: Object,
    required: true,
  },
  /** @type {boolean} 是否為錯誤消息，影響渲染樣式和方式 */
  isErrorMessage: {
    type: Boolean,
    default: false,
  },
  /** @type {boolean} 是否啟用內容動畫效果，用於提升用戶體驗 */
  shouldUseContentAnimation: {
    type: Boolean,
    default: true,
  },
  /** @type {boolean} 是否為圖表消息，影響內容渲染邏輯 */
  isChartMessage: {
    type: Boolean,
    default: false,
  },
  /** @type {boolean} 用戶消息是否處於折疊狀態 */
  isUserMessageCollapsed: {
    type: Boolean,
    default: false,
  },
  /** @type {boolean} 是否顯示展開/收起按鈕（當用戶消息過長時） */
  shouldShowExpandButton: {
    type: Boolean,
    default: false,
  },
  /** @type {boolean} 是否啟用實時渲染，影響代碼高亮的處理方式 */
  realtimeRender: {
    type: Boolean,
    default: true,
  },
  /** @type {ToolSummary[]} 工具摘要列表，在 AI 回應前顯示 */
  toolSummaries: {
    type: Array,
    default: () => [],
  },
});

/**
 * 組件事件定義
 * @typedef {Object} Emits
 * @property {Function} toggle-user-message-expand - 切換用戶消息展開狀態事件
 */
defineEmits([
  /**
   * 切換用戶消息展開狀態
   * @description 當用戶點擊展開/收起按鈕時觸發
   */
  "toggle-user-message-expand",
]);

/**
 * DOM 引用
 * @description 用於直接操作 DOM 元素的引用集合
 */
/** @type {Ref<Component|null>} 動畫內容組件引用 */
const animatedContentRef = ref(null);
/** @type {Ref<Component|null>} 代碼高亮組件引用 */
const codeHighlightRef = ref(null);
/** @type {Ref<HTMLElement|null>} 用戶消息內容 DOM 引用 */
const userMessageContent = ref(null);
</script>

<style scoped>
.message-text {
  font-size: var(--chat-font-size, 14px);
  line-height: 1.6;
}

.summary-mode-indicator {
  margin-bottom: 12px;
}

.summary-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background: linear-gradient(135deg, #e6f7ff 0%, #f0f9ff 100%);
  border: 1px solid #91d5ff;
  border-radius: 4px;
  font-size: 12px;
  color: #1890ff;
  font-weight: 500;
}

.info-icon {
  margin-left: 4px;
  color: #1890ff;
  cursor: help;
}

.tool-summaries-section {
  margin-bottom: 12px;
}

.tool-summary-item {
  border: 1px solid var(--custom-border-primary);
  border-radius: 6px;
  margin-bottom: 8px;
  overflow: hidden;
}

.tool-summary-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--custom-bg-tertiary);
  border-bottom: 1px solid var(--custom-border-primary);
  font-size: 13px;
  font-weight: 500;
  color: var(--custom-text-secondary);
}

.tool-summary-title {
  flex: 1;
}

.tool-summary-content {
  padding: 10px 12px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--custom-text-primary);
  background: var(--custom-bg-secondary);
  white-space: pre-wrap;
  word-break: break-word;
}

.plain-text {
  white-space: pre-wrap;
  transition: max-height 0.3s ease-in-out;
  overflow: hidden;
}

.plain-text.collapsed {
  max-height: 9em;
  position: relative;
}

.plain-text.collapsed::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2em;
  background: linear-gradient(transparent, var(--custom-bg-primary));
  pointer-events: none;
}

.error-text {
  color: var(--ant-color-error);
  background: var(--ant-color-error-bg);
  border: 1px solid var(--ant-color-error-border);
  border-radius: 6px;
  padding: 12px;
}

.expand-button-container {
  margin-top: 8px;
  text-align: center;
}

.expand-button {
  font-size: 12px;
  color: var(--custom-text-tertiary);
  padding: 0 8px;
}

/* 暗黑模式適配 */
:root[data-theme="dark"] .summary-badge {
  background: linear-gradient(135deg, #001529 0%, #002140 100%);
  border-color: #1e3a5f;
  color: #69c0ff;
}

:root[data-theme="dark"] .info-icon {
  color: #69c0ff;
}

:root[data-theme="dark"] .tool-summary-item {
  border-color: var(--custom-border-secondary);
}

:root[data-theme="dark"] .tool-summary-header {
  background: var(--custom-bg-secondary);
  border-bottom-color: var(--custom-border-secondary);
  color: var(--custom-text-primary);
}

:root[data-theme="dark"] .tool-summary-content {
  background: var(--custom-bg-primary);
}

:root[data-theme="dark"] .plain-text.collapsed::after {
  background: linear-gradient(transparent, var(--custom-bg-primary));
}

:root[data-theme="dark"] .error-text {
  background: rgba(255, 77, 79, 0.06);
  border-color: var(--ant-color-error-border);
}
</style>
