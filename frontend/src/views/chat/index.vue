<template>
  <div class="chat-page">
    <ChatContainer :agent-id="agentId" />
  </div>
</template>

<script setup>
import { defineProps } from "vue";
import ChatContainer from "./components/ChatContainer.vue";

// 接收路由參數
const props = defineProps({
  agentId: {
    type: String,
    default: null,
  },
});
</script>

<style scoped>
.chat-page {
  height: 100%;
  overflow: hidden;
}
</style>
