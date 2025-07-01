<template>
  <div class="message-info">
    <div class="message-sender">
      {{ senderName }}
    </div>
    <div class="message-time">
      {{ formatMessageTime(message.created_at) }}
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useAuthStore } from "@/stores/auth";
import { useAgentsStore } from "@/stores/agents";
import { formatMessageTime } from "@/utils/datetimeFormat";

// Props
const props = defineProps({
  message: {
    type: Object,
    required: true,
  },
});

// Stores
const authStore = useAuthStore();
const agentsStore = useAgentsStore();

// 計算發送者名稱
const senderName = computed(() => {
  switch (props.message.role) {
    case "user":
      return (
        authStore.user?.display_name ||
        authStore.user?.username ||
        authStore.user?.email ||
        "用戶"
      );
    case "assistant":
      // 優先從消息中獲取智能體名稱，然後從當前智能體獲取
      if (props.message.agent_name) {
        return props.message.agent_name;
      }

      // 從當前智能體獲取
      const currentAgent = agentsStore.getCurrentAgent;
      if (currentAgent?.name) {
        return currentAgent.name;
      }

      // 使用模型信息作為後備
      if (props.message.model_info?.model_id) {
        return `AI (${props.message.model_info.model_id})`;
      }

      return "AI助手";
    case "system":
      return "系統";
    default:
      return "未知";
  }
});
</script>

<style scoped>
.message-info {
  margin-left: 8px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.message-sender {
  font-weight: 600;
  font-size: 14px;
  color: var(--text-color, #262626);
}

.message-time {
  font-size: 12px;
  opacity: 0.7;
  margin-top: 2px;
}

/* 針對用戶消息的特殊樣式 */
:deep(.user-message) .message-sender {
  color: var(--custom-text-primary);
}
</style>
