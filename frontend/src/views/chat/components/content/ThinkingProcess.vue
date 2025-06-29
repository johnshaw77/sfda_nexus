<!--
/**
 * @fileoverview ThinkingProcess - AI 思考過程顯示組件
 * @description 用於顯示 AI 助手的思考過程內容，支援實時思考動畫、內容折疊/展開功能
 * @component ThinkingProcess
 * @author SFDA Nexus Team
 * @since 1.0.0
 * @version 1.0.0
 * 
 * @example
 * <ThinkingProcess
 *   :message="message"
 *   :thinking-collapsed="false"
 *   :is-message-streaming="true"
 *   :is-thinking-animating="true"
 *   :displayed-thinking-content="displayedContent"
 *   @toggle-thinking-collapse="handleToggle"
 * />
 * 
 * @requires @ant-design/icons-vue - UI 圖標組件
 * 
 * @typedef {Object} Message
 * @property {string} role - 消息角色 ('assistant' | 'user' | 'system')
 * @property {string} [thinking] - 思考過程內容
 * @property {string} [thought_process] - 思考過程內容（備用字段）
 * 
 * 功能特色:
 * - 🧠 實時思考過程顯示
 * - 🔄 支援思考動畫效果
 * - 📁 可折疊/展開內容
 * - ⚡ 流式思考內容渲染
 * - 🎯 智能狀態指示器
 */
-->
<template>
  <div
    v-if="message.role === 'assistant' && getThinkingContent()"
    class="thinking-section">
    <div
      class="thinking-header"
      @click="$emit('toggle-thinking-collapse')"
      style="cursor: pointer">
      <div class="thinking-header-left">
        <BulbOutlined />
        <span>思考過程</span>
        <span
          v-if="isMessageStreaming || isThinkingAnimating"
          class="thinking-indicator">
          <LoadingOutlined spin />
          <span class="thinking-status">
            {{ isThinkingAnimating ? "思考中..." : "生成中..." }}
          </span>
        </span>
      </div>
      <div class="thinking-header-right">
        <DownOutlined
          :class="['collapse-icon', { collapsed: thinkingCollapsed }]" />
      </div>
    </div>
    <div
      v-show="!thinkingCollapsed"
      class="thinking-content">
      <div class="thinking-text">
        {{ displayedThinkingContent }}
        <span
          v-if="isThinkingAnimating"
          class="thinking-cursor"
          >|</span
        >
      </div>
    </div>
  </div>
</template>

<script setup>
import { BulbOutlined, LoadingOutlined, DownOutlined } from '@ant-design/icons-vue';

/**
 * Props 定義
 * @description 定義組件接收的屬性和其類型約束
 */
const props = defineProps({
  /** @type {Object} 消息對象，包含思考內容 */
  message: {
    type: Object,
    required: true
  },
  /** @type {Boolean} 思考過程是否折疊 */
  thinkingCollapsed: {
    type: Boolean,
    required: true
  },
  /** @type {Boolean} 消息是否正在流式傳輸 */
  isMessageStreaming: {
    type: Boolean,
    default: false
  },
  /** @type {Boolean} 思考過程是否正在動畫顯示 */
  isThinkingAnimating: {
    type: Boolean,
    default: false
  },
  /** @type {String} 當前顯示的思考內容 */
  displayedThinkingContent: {
    type: String,
    default: ''
  }
});

/**
 * Events 定義
 * @description 定義組件可觸發的事件
 * @event toggle-thinking-collapse - 切換思考過程折疊狀態
 */
defineEmits(['toggle-thinking-collapse']);

/**
 * 獲取思考內容
 * @description 從消息對象中提取思考過程內容，支援多種字段名稱
 * @returns {string|null} 思考過程內容，如果沒有則返回 null
 * @example
 * const content = getThinkingContent();
 * if (content) {
 *   // 顯示思考內容
 * }
 */
const getThinkingContent = () => {
  // 支援多種思考內容字段名稱
  return props.message.thinking || props.message.thought_process;
};
</script>

<style scoped>
.thinking-section {
  margin-top: 12px;
  border: 1px solid var(--custom-border-primary);
  border-radius: 8px;
  background: var(--custom-bg-secondary);
  overflow: hidden;
}

.thinking-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--custom-bg-tertiary);
  border-bottom: 1px solid var(--custom-border-primary);
  font-size: 13px;
  font-weight: 500;
  color: var(--custom-text-secondary);
  user-select: none;
  transition: background-color 0.2s ease;
}

.thinking-header:hover {
  background: var(--custom-bg-quaternary);
}

.thinking-header-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.thinking-header-right {
  display: flex;
  align-items: center;
}

.thinking-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: 8px;
  font-size: 12px;
  color: var(--custom-text-tertiary);
}

.thinking-status {
  font-weight: 400;
}

.collapse-icon {
  transition: transform 0.2s ease;
  color: var(--custom-text-tertiary);
  font-size: 12px;
}

.collapse-icon.collapsed {
  transform: rotate(-90deg);
}

.thinking-content {
  padding: 12px;
  border-top: 1px solid var(--custom-border-primary);
}

.thinking-text {
  font-size: 13px;
  line-height: 1.5;
  color: var(--custom-text-primary);
  white-space: pre-wrap;
  word-break: break-word;
  font-family: var(--font-mono);
}

.thinking-cursor {
  animation: blink 1s infinite;
  color: var(--custom-text-secondary);
  font-weight: bold;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

/* 暗黑模式適配 */
:root[data-theme="dark"] .thinking-section {
  border-color: var(--custom-border-secondary);
  background: var(--custom-bg-primary);
}

:root[data-theme="dark"] .thinking-header {
  background: var(--custom-bg-secondary);
  border-bottom-color: var(--custom-border-secondary);
  color: var(--custom-text-primary);
}

:root[data-theme="dark"] .thinking-header:hover {
  background: var(--custom-bg-tertiary);
}

:root[data-theme="dark"] .thinking-content {
  border-top-color: var(--custom-border-secondary);
}

:root[data-theme="dark"] .thinking-indicator {
  color: var(--custom-text-secondary);
}

:root[data-theme="dark"] .collapse-icon {
  color: var(--custom-text-secondary);
}
</style>