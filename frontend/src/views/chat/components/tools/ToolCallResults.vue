<!--

/**
 * @fileoverview ToolCallResults - 工具調用結果顯示組件
 * @description 負責展示 AI 助手消息中的工具調用結果，支援折疊/展開功能。
 * 將多個工具調用結果以列表形式組織顯示，提供簡潔的標題欄和詳細的結果內容。
 * 
 * @component ToolCallResults
 * @author SFDA Development Team
 * @since 1.0.0
 * @version 1.2.0
 * 
 * @example
 * <ToolCallResults 
 *   :message="assistantMessage"
 *   :effective-tool-calls="processedToolCalls"
 *   :tool-calls-collapsed="false"
 *   @toggle-tool-calls-collapse="handleToggleCollapse"
 * />
 * 
 * @description 功能特點：
 * - 工具調用展示：顯示 MCP 工具的調用結果和執行狀態
 * - 折疊控制：支援用戶手動展開/收起工具調用詳情
 * - 計數顯示：標題欄顯示工具調用的數量統計
 * - 動畫效果：平滑的展開/收起動畫過渡
 * - 狀態指示：通過圖示和顏色顯示工具調用的執行狀態
 * - 響應式設計：適配不同主題和設備尺寸
 * 
 * @requires @ant-design/icons-vue
 * @requires @/components/common/ToolCallDisplay.vue
 */
-->
<template>
  <div
    v-if="message.role === 'assistant' && effectiveToolCalls.length > 0"
    class="tool-calls-section">
    <div
      class="tool-calls-header"
      @click="$emit('toggle-tool-calls-collapse')"
      style="cursor: pointer">
      <div class="tool-calls-header-left">
        <ToolOutlined />
        <span>工具調用 ({{ effectiveToolCalls.length }})</span>
      </div>
      <div class="tool-calls-header-right">
        <DownOutlined
          :class="['collapse-icon', { collapsed: toolCallsCollapsed }]" />
      </div>
    </div>
    <div
      v-show="!toolCallsCollapsed"
      class="tool-calls-list">
      <ToolCallDisplay
        v-for="(toolCall, index) in effectiveToolCalls"
        :key="index"
        :tool-call="toolCall" />
    </div>
  </div>
</template>

<script setup>
import { ToolOutlined, DownOutlined } from "@ant-design/icons-vue";
import ToolCallDisplay from "@/components/common/ToolCallDisplay.vue";

/**
 * @typedef {Object} ToolCall
 * @property {string} name - 工具名稱
 * @property {Object} arguments - 工具調用參數
 * @property {boolean} success - 工具執行是否成功
 * @property {Object} result - 工具執行結果
 * @property {string} [error] - 錯誤信息（如果執行失敗）
 * @property {number} [executionTime] - 執行時間（毫秒）
 * @property {Object} [metadata] - 工具調用元數據
 */

/**
 * @typedef {Object} AssistantMessage
 * @property {string} id - 消息唯一標識符
 * @property {'assistant'} role - 消息角色，固定為 'assistant'
 * @property {string} content - 消息內容
 * @property {Array} [tool_calls] - 原始工具調用數據
 * @property {Object} [metadata] - 消息元數據，包含工具調用結果
 */

/**
 * 組件 Props 定義
 * @typedef {Object} Props
 * @property {AssistantMessage} message - AI 助手消息對象
 * @property {ToolCall[]} effectiveToolCalls - 處理後的有效工具調用列表
 * @property {boolean} toolCallsCollapsed - 工具調用區域是否折疊
 */
defineProps({
  /** @type {AssistantMessage} AI 助手消息對象，用於檢查角色和工具調用 */
  message: {
    type: Object,
    required: true,
  },
  /** @type {ToolCall[]} 經過處理的工具調用結果列表 */
  effectiveToolCalls: {
    type: Array,
    required: true,
  },
  /** @type {boolean} 工具調用結果區域的折疊狀態 */
  toolCallsCollapsed: {
    type: Boolean,
    required: true,
  },
});

/**
 * 組件事件定義
 * @typedef {Object} Emits
 * @property {Function} toggle-tool-calls-collapse - 切換工具調用折疊狀態事件
 */
defineEmits([
  /**
   * 切換工具調用結果的折疊/展開狀態
   * @description 當用戶點擊標題欄時觸發，用於控制結果列表的顯示/隱藏
   */
  "toggle-tool-calls-collapse",
]);
</script>

<style scoped>
.tool-calls-section {
  background: var(--custom-bg-secondary);
  border: 1px solid var(--custom-border-primary);
  border-radius: 8px;
  margin: 8px 0;
  padding: 8px;
  overflow: hidden;
}

.tool-calls-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--custom-bg-secondary);
  border-bottom: 1px solid var(--custom-border-primary);
  transition: background-color 0.3s ease;
}

.tool-calls-header:hover {
  background: var(--custom-bg-tertiary);
}

.tool-calls-header-left {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
  color: #1890ff;
}

.tool-calls-header-right {
  display: flex;
  align-items: center;
}

.collapse-icon {
  transition: transform 0.3s ease;
  color: #8c8c8c;
}

.collapse-icon.collapsed {
  transform: rotate(-90deg);
}

.tool-calls-list {
  padding: 0;
}
</style>
