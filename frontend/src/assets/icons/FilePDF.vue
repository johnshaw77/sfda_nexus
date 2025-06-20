<template>
  <div class="pdf-icon">
    <svg
      :width="width || size"
      :height="height || size"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg">
      <!-- 主體背景 -->
      <rect
        x="8"
        y="6"
        width="28"
        height="36"
        rx="2"
        fill="#FF4444"
        stroke="#CC3333"
        stroke-width="1" />

      <!-- 右上角折角 -->
      <path
        d="M28 6 L36 14 L28 14 Z"
        fill="#CC3333" />
      <path
        d="M28 6 L28 14 L36 14"
        stroke="#AA2222"
        stroke-width="1"
        fill="none" />

      <!-- PDF 文字 -->
      <text
        x="22"
        y="20"
        text-anchor="middle"
        fill="white"
        font-family="Arial, sans-serif"
        font-size="6"
        font-weight="bold">
        PDF
      </text>

      <!-- 文件線條 -->
      <line
        x1="12"
        y1="26"
        x2="32"
        y2="26"
        stroke="white"
        stroke-width="1"
        opacity="0.8" />
      <line
        x1="12"
        y1="30"
        x2="28"
        y2="30"
        stroke="white"
        stroke-width="1"
        opacity="0.6" />
      <line
        x1="12"
        y1="34"
        x2="30"
        y2="34"
        stroke="white"
        stroke-width="1"
        opacity="0.6" />
      <line
        x1="12"
        y1="38"
        x2="24"
        y2="38"
        stroke="white"
        stroke-width="1"
        opacity="0.4" />
    </svg>
  </div>
</template>

<script setup>
defineProps({
  size: {
    type: [Number, String],
    default: 24,
  },
  width: {
    type: [Number, String],
    default: null,
  },
  height: {
    type: [Number, String],
    default: null,
  },
});
</script>

<style scoped>
.pdf-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
</style>
