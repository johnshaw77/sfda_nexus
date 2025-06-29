<!--
/**
 * @fileoverview MessageHeader - 消息頭部組件
 * @description 負責渲染消息的頭部信息，包括用戶頭像和消息元數據。
 * 根據消息角色動態選擇合適的頭像組件（用戶、AI 助手、系統）。
 * 
 * @component MessageHeader
 * @author SFDA Development Team
 * @since 1.0.0
 * @version 1.2.0
 * 
 * @example
 * <MessageHeader 
 *   :message="messageObject"
 *   :agent-avatar="agentAvatarData"
 * />
 * 
 * @description 功能特點：
 * - 動態頭像選擇：根據消息角色自動選擇對應的頭像組件
 * - 響應式設計：在移動設備上自動隱藏頭像以節省空間
 * - 消息信息展示：集成 MessageInfo 組件顯示消息時間、模型等信息
 * - 智能體支持：支持自定義智能體頭像顯示
 * 
 * @requires vue
 * @requires ../avatars/UserAvatar.vue
 * @requires ../avatars/AgentAvatar.vue
 * @requires ../avatars/SystemAvatar.vue
 * @requires ../common/MessageInfo.vue
 */

-->
<template>
  <div class="message-header">
    <div class="message-avatar">
      <!-- 動態選擇頭像組件 -->
      <component
        :is="avatarComponent"
        :agent-avatar="agentAvatar"
        :size="32" />
    </div>

    <!-- 消息元信息 -->
    <MessageInfo :message="message" />
  </div>
</template>

<script setup>
import { computed } from "vue";
import UserAvatar from "../avatars/UserAvatar.vue";
import AgentAvatar from "../avatars/AgentAvatar.vue";
import SystemAvatar from "../avatars/SystemAvatar.vue";
import MessageInfo from "../common/MessageInfo.vue";

/**
 * @typedef {Object} MessageObject
 * @property {string} id - 消息唯一標識符
 * @property {'user'|'assistant'|'system'} role - 消息角色，決定使用哪種頭像組件
 * @property {string} content - 消息內容
 * @property {string} [timestamp] - 消息時間戳
 * @property {Object} [metadata] - 消息元數據，包含模型信息等
 * @property {string} [agent_id] - 智能體 ID
 * @property {string} [agent_name] - 智能體名稱
 */

/**
 * 組件 Props 定義
 * @typedef {Object} Props
 * @property {MessageObject} message - 消息對象，包含角色、內容等信息
 * @property {string|Object|null} [agentAvatar=null] - 智能體頭像數據，可以是 URL 字符串或頭像對象
 */
const props = defineProps({
  /** @type {MessageObject} 消息對象，用於提取角色和其他頭像相關信息 */
  message: {
    type: Object,
    required: true,
  },
  /** @type {string|Object|null} 智能體頭像數據，傳遞給 AgentAvatar 組件 */
  agentAvatar: {
    type: [String, Object, null],
    default: null,
  },
});

/**
 * 動態頭像組件選擇器
 * @description 根據消息角色動態選擇對應的頭像組件
 * @returns {Component} Vue 組件構造函數
 * @computed
 *
 * @example
 * // 用戶消息 -> UserAvatar
 * // AI 助手消息 -> AgentAvatar
 * // 系統消息 -> SystemAvatar
 * // 未知角色 -> SystemAvatar (備用)
 */
const avatarComponent = computed(() => {
  switch (props.message.role) {
    case "user":
      return UserAvatar;
    case "assistant":
      return AgentAvatar;
    case "system":
      return SystemAvatar;
    default:
      // 備用方案：未知角色使用系統頭像
      return SystemAvatar;
  }
});
</script>

<style scoped>
.message-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.message-avatar {
  flex-shrink: 0;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .message-header {
    margin-bottom: 6px;
  }

  .message-avatar {
    display: none;
  }
}
</style>
