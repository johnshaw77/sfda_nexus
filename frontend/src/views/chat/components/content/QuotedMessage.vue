<!--
/**
 * @fileoverview QuotedMessage - 引用消息顯示組件
 * @description 用於顯示回覆或引用的消息內容，提供簡潔的引用預覽功能。
 * 支援用戶消息和 AI 助手消息的引用顯示，自動截取過長內容並顯示預覽。
 * 
 * @component QuotedMessage
 * @author SFDA Development Team
 * @since 1.0.0
 * @version 1.1.0
 * 
 * @example
 * <QuotedMessage :message="messageWithQuote" />
 * 
 * @description 功能特點：
 * - 引用預覽：自動截取並顯示引用消息的前 100 個字符
 * - 角色識別：根據被引用消息的角色顯示相應圖示和名稱
 * - 智能體支持：自動顯示智能體名稱或使用備用名稱
 * - 響應式設計：適配不同主題和設備尺寸
 * - 簡潔布局：卡片式設計，清晰區分引用內容
 * 
 * @requires vue
 * @requires @ant-design/icons-vue
 * @requires @/stores/agents
 */
-->
<template>
  <div
    v-if="message.quoted_message"
    class="quoted-message">
    <div class="quote-header">
      <UserOutlined v-if="message.quoted_message.role === 'user'" />
      <RobotOutlined v-else />
      <span>{{
        message.quoted_message.role === "user"
          ? "用戶"
          : message.quoted_message.agent_name || agentDisplayName || "AI助手"
      }}</span>
    </div>
    <div class="quote-content">
      {{ getQuotePreview(message.quoted_message.content) }}
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { UserOutlined, RobotOutlined } from "@ant-design/icons-vue";
import { useAgentsStore } from "@/stores/agents";

/**
 * @typedef {Object} QuotedMessageObject
 * @property {'user'|'assistant'|'system'} role - 被引用消息的角色
 * @property {string} content - 被引用消息的內容
 * @property {string} [agent_name] - 智能體名稱（如果是 AI 助手消息）
 */

/**
 * @typedef {Object} MessageObject
 * @property {string} id - 消息唯一標識符
 * @property {QuotedMessageObject} [quoted_message] - 引用的消息對象
 */

/**
 * 組件 Props 定義
 * @typedef {Object} Props
 * @property {MessageObject} message - 包含引用消息的消息對象
 */
const props = defineProps({
  /** @type {MessageObject} 消息對象，檢查是否包含 quoted_message 字段 */
  message: {
    type: Object,
    required: true,
  },
});

/**
 * 智能體狀態管理
 * @description 用於獲取當前智能體的顯示名稱
 */
const agentsStore = useAgentsStore();

/**
 * 智能體顯示名稱
 * @description 獲取當前智能體的顯示名稱，優先使用 display_name，備用 name
 * @returns {string|undefined} 智能體顯示名稱
 * @computed
 */
const agentDisplayName = computed(() => {
  return (
    agentsStore.getCurrentAgent?.display_name ||
    agentsStore.getCurrentAgent?.name
  );
});

/**
 * 獲取引用消息的預覽文本
 * @description 將引用消息內容截取到指定長度，超出部分用省略號表示
 * @param {string} content - 原始消息內容
 * @returns {string} 處理後的預覽文本
 *
 * @example
 * getQuotePreview("這是一段很長的消息內容...")
 * // 返回: "這是一段很長的消息內容，超過100字符的部分會被截取..."
 */
const getQuotePreview = (content) => {
  if (!content) return "";
  const maxLength = 100;
  if (content.length <= maxLength) return content;
  return content.substring(0, maxLength) + "...";
};
</script>

<style scoped>
.quoted-message {
  background: var(--custom-bg-secondary);
  border: 1px solid var(--custom-border-primary);
  border-radius: 8px;
  margin: 8px 0 12px 0;
  overflow: hidden;
}

.quote-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: var(--custom-bg-tertiary);
  border-bottom: 1px solid var(--custom-border-primary);
  font-size: 12px;
  font-weight: 500;
  color: var(--custom-text-secondary);
}

.quote-content {
  padding: 8px 10px;
  font-size: 13px;
  line-height: 1.4;
  color: var(--custom-text-tertiary);
  white-space: pre-wrap;
  word-break: break-word;
}

/* 暗黑模式適配 */
:root[data-theme="dark"] .quoted-message {
  border-color: var(--custom-border-secondary);
  background: var(--custom-bg-primary);
}

:root[data-theme="dark"] .quote-header {
  background: var(--custom-bg-secondary);
  border-bottom-color: var(--custom-border-secondary);
  color: var(--custom-text-primary);
}

:root[data-theme="dark"] .quote-content {
  color: var(--custom-text-secondary);
}
</style>
