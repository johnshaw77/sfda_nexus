<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    x="0px"
    y="0px"
    :width="width || size"
    :height="height || size"
    viewBox="0 0 48 48">
    <defs>
      <linearGradient
        id="csvGradient"
        x1="6"
        x2="27"
        y1="24"
        y2="24"
        gradientUnits="userSpaceOnUse">
        <stop
          offset="0"
          stop-color="#4ade80"></stop>
        <stop
          offset="1"
          stop-color="#16a34a"></stop>
      </linearGradient>
    </defs>
    <!-- 背景 -->
    <path
      fill="#059669"
      d="m41,10h-16v28h16c.55,0,1-.45,1-1V11c0-.55-.45-1-1-1Z"></path>
    <!-- CSV 圖標和網格 -->
    <path
      fill="#fff"
      d="m26,15h13v2h-13v-2Zm0,4h13v2h-13v-2Zm0,4h13v2h-13v-2Zm0,4h13v2h-13v-2Zm0,4h13v2h-13v-2Z"></path>
    <path
      fill="#fff"
      d="m29,15v16m4,0v-16m4,16v-16"></path>
    <!-- 左側標籤 -->
    <path
      fill="url(#csvGradient)"
      d="m27,42l-21-4V10l21-4v36Z"></path>
    <!-- CSV 文字 -->
    <text
      x="16.5"
      y="26"
      font-family="Arial, sans-serif"
      font-size="6"
      font-weight="bold"
      fill="#fff"
      text-anchor="middle">
      CSV
    </text>
  </svg>
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
