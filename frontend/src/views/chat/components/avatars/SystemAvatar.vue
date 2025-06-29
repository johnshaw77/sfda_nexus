<template>
  <a-avatar
    :size="size"
    :style="{ backgroundColor: '#faad14' }">
    <InfoCircleOutlined />
  </a-avatar>
</template>

<script setup>
import { InfoCircleOutlined } from '@ant-design/icons-vue';

// Props
defineProps({
  size: {
    type: Number,
    default: 32
  }
});
</script>

<style scoped>
/* 如果需要特定的系統頭像樣式，可以在這裡添加 */
</style>