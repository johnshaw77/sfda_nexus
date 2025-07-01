<!--
  
/**
 * @fileoverview MessageActions - 消息操作工具欄組件
 * @description 為 AI 助手消息提供操作工具欄，包括複製、重新生成、引用回覆、
 * 刪除等功能。同時顯示消息的模型信息和 Token 使用量。
 * 
 * @component MessageActions
 * @author SFDA Development Team
 * @since 1.0.0
 * @version 1.3.0
 * 
 * @example
 * <MessageActions 
 *   :message="assistantMessage"
 *   :enable-content-animation="true"
 *   @copy-content="handleCopy"
 *   @regenerate-response="handleRegenerate"
 *   @quote-message="handleQuote"
 *   @toggle-content-animation="handleToggleAnimation"
 *   @delete-message="handleDelete"
 * />
 * 
 * @description 功能特點：
 * - 複製功能：一鍵複製消息內容到剪貼板
 * - 重新生成：要求 AI 重新生成回應
 * - 引用回覆：在新消息中引用當前消息
 * - 動畫控制：切換內容動畫效果的開關
 * - 消息刪除：從對話中刪除當前消息
 * - 模型信息：顯示使用的 AI 模型和 Token 消耗
 * - 主題適配：支援暗黑/明亮主題
 * 
 * @requires @ant-design/icons-vue
 */

-->
<template>
  <div
    v-if="message.role === 'assistant'"
    class="model-info">
    <div class="model-info-left">
      <a-tooltip title="複製內容">
        <a-button
          type="text"
          size="small"
          @click="$emit('copy-content')">
          <CopyOutlined />
        </a-button>
      </a-tooltip>

      <a-tooltip title="重新生成">
        <a-button
          type="text"
          size="small"
          @click="$emit('regenerate-response')">
          <ReloadOutlined />
        </a-button>
      </a-tooltip>

      <a-tooltip title="引用回覆">
        <a-button
          type="text"
          size="small"
          @click="$emit('quote-message')">
          <MessageOutlined />
        </a-button>
      </a-tooltip>

      <!-- 動畫效果切換按鈕 
      <a-tooltip
        :title="enableContentAnimation ? '關閉動畫效果' : '開啟動畫效果'">
        <a-button
          type="text"
          size="small"
          @click="$emit('toggle-content-animation')"
          :class="{ 'animation-active': enableContentAnimation }">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="currentColor">
            <path
              v-if="enableContentAnimation"
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            <path
              v-else
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
              opacity="0.3" />
          </svg>
        </a-button>
      </a-tooltip>
-->
      <a-tooltip title="刪除消息">
        <a-button
          type="text"
          size="small"
          @click="$emit('delete-message')"
          class="danger-item">
          <DeleteOutlined />
        </a-button>
      </a-tooltip>
    </div>

    <div class="model-info-right">
      <span class="token-usage">
        Token: {{ (message.tokens_used || 0).toLocaleString() }}
      </span>
      <a-tag :color="getModelColor(message.model_info?.provider || 'default')">
        {{
          message.model_info?.model ||
          message.model ||
          message.model_info?.display_name ||
          "未知模型"
        }}
      </a-tag>
    </div>
  </div>
</template>

<script setup>
import {
  CopyOutlined,
  ReloadOutlined,
  MessageOutlined,
  DeleteOutlined,
} from "@ant-design/icons-vue";

/**
 * @typedef {Object} ModelInfo
 * @property {string} provider - AI 模型提供者 (gemini|ollama|openai|claude)
 * @property {string} model - 模型名稱
 * @property {string} [display_name] - 模型顯示名稱
 */

/**
 * @typedef {Object} AssistantMessage
 * @property {string} id - 消息唯一標識符
 * @property {'assistant'} role - 消息角色，固定為 'assistant'
 * @property {string} content - 消息內容
 * @property {number} [tokens_used] - 使用的 Token 數量
 * @property {ModelInfo} [model_info] - 模型信息對象
 * @property {string} [model] - 模型名稱（備用字段）
 */

/**
 * 組件 Props 定義
 * @typedef {Object} Props
 * @property {AssistantMessage} message - AI 助手消息對象
 * @property {boolean} [enableContentAnimation=true] - 是否啟用內容動畫效果
 */
defineProps({
  /** @type {AssistantMessage} AI 助手消息對象，包含模型信息和內容 */
  message: {
    type: Object,
    required: true,
  },
  /** @type {boolean} 內容動畫效果開關狀態 */
  enableContentAnimation: {
    type: Boolean,
    default: true,
  },
});

/**
 * 組件事件定義
 * @typedef {Object} Emits
 * @property {Function} copy-content - 複製消息內容事件
 * @property {Function} regenerate-response - 重新生成回應事件
 * @property {Function} quote-message - 引用消息事件
 * @property {Function} toggle-content-animation - 切換動畫效果事件
 * @property {Function} delete-message - 刪除消息事件
 */
defineEmits([
  /** 複製消息內容到剪貼板 */
  "copy-content",
  /** 要求 AI 重新生成當前回應 */
  "regenerate-response",
  /** 引用當前消息進行回覆 */
  "quote-message",
  /** 切換內容動畫效果的開關狀態 */
  "toggle-content-animation",
  /** 從對話中刪除當前消息 */
  "delete-message",
]);

/**
 * 獲取 AI 模型提供者對應的顏色標籤
 * @description 根據不同的 AI 模型提供者返回對應的顏色，用於 Tag 組件顯示
 * @param {string} provider - AI 模型提供者名稱
 * @returns {string} Ant Design 顏色名稱
 *
 * @example
 * getModelColor('gemini') // 返回 'blue'
 * getModelColor('ollama') // 返回 'green'
 * getModelColor('openai') // 返回 'purple'
 * getModelColor('claude') // 返回 'orange'
 * getModelColor('unknown') // 返回 'default'
 */
const getModelColor = (provider) => {
  const colorMap = {
    gemini: "blue",
    ollama: "green",
    openai: "purple",
    claude: "orange",
    default: "default",
  };
  return colorMap[provider] || colorMap.default;
};
</script>

<style scoped>
.model-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
  padding: 6px 8px;
  /* background: var(--custom-bg-tertiary); */
  border-radius: 6px;
  font-size: 12px;
  color: var(--custom-text-tertiary);
  /* border: 1px solid var(--custom-border-primary); */
}

.model-info-left {
  display: flex;
  align-items: center;
  gap: 4px;
}

.model-info-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.token-usage {
  color: var(--custom-text-tertiary);
  font-size: 11px;
}

.danger-item:hover {
  color: var(--ant-color-error) !important;
}

.animation-active {
  background-color: var(--ant-color-primary-bg) !important;
  color: var(--ant-color-primary) !important;
}

/* 暗黑模式適配 */
:root[data-theme="dark"] .model-info {
  background: var(--custom-bg-secondary);
  border-color: var(--custom-border-secondary);
  color: var(--custom-text-secondary);
}

:root[data-theme="dark"] .token-usage {
  color: var(--custom-text-secondary);
}

:root[data-theme="dark"] .animation-active {
  background-color: rgba(23, 125, 220, 0.2) !important;
}
</style>
