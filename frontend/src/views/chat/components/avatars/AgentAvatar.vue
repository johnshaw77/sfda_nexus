<template>
  <div class="agent-avatar-wrapper">
    <!-- 如果智能體有 base64 avatar，顯示圖片 -->
    <a-avatar
      v-if="
        agentAvatar &&
        typeof agentAvatar === 'string' &&
        agentAvatar.startsWith('data:')
      "
      :size="size"
      :src="agentAvatar"
      class="agent-avatar-image" />

    <!-- 如果智能體有頭像配置但不是圖片，使用漸變背景 -->
    <a-avatar
      v-else-if="agentAvatar && typeof agentAvatar === 'object'"
      :size="size"
      :style="{
        backgroundColor: 'transparent',
        background: agentAvatar.gradient || agentAvatar.background || '#52c41a',
      }"
      class="agent-avatar-bg">
      <!-- 如果有自定義圖標 -->
      <svg
        v-if="agentAvatar.icon"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="currentColor">
        <path :d="agentAvatar.icon" />
      </svg>
      <!-- 沒有自定義圖標使用默認 -->
      <RobotOutlined v-else />
    </a-avatar>

    <!-- 沒有頭像配置時使用默認 -->
    <a-avatar
      v-else
      :size="size"
      :style="{ backgroundColor: '#52c41a' }">
      <RobotOutlined />
    </a-avatar>
  </div>
</template>

<script setup>
import { RobotOutlined } from "@ant-design/icons-vue";

// Props
defineProps({
  agentAvatar: {
    type: [String, Object, null],
    default: null,
  },
  size: {
    type: Number,
    default: 32,
  },
});
</script>

<style scoped>
.agent-avatar-wrapper {
  position: relative;
}

.agent-avatar-image {
  border: 2px solid rgba(82, 196, 26, 0.2);
}

.agent-avatar-bg {
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.agent-avatar-bg svg {
  color: rgba(255, 255, 255, 0.9);
}
</style>
