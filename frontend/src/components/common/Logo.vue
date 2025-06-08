<template>
  <svg
    width="256"
    height="256"
    viewBox="0 0 256 256"
    fill="none"
    xmlns="http://www.w3.org/2000/svg">
    <!-- 主體外框 -->
    <rect
      x="64"
      y="64"
      width="192"
      height="192"
      rx="48"
      fill="#181C2F"
      stroke="#8F5CFF"
      stroke-width="8" />
    <!-- 對話框尖角（左下） -->
    <polygon
      points="100,200 140,200 100,260"
      fill="#181C2F"
      stroke="#8F5CFF"
      stroke-width="8" />
    <!-- PCB電路線路與端點（更細緻） -->
    <!-- 上方線路 -->
    <rect
      x="140"
      y="16"
      width="6"
      height="28"
      rx="3"
      fill="#8F5CFF" />
    <circle
      cx="143"
      cy="16"
      r="6"
      fill="#8F5CFF"
      stroke="#fff"
      stroke-width="2" />
    <!-- 下方線路 -->
    <rect
      x="180"
      y="200"
      width="6"
      height="28"
      rx="3"
      fill="#8F5CFF" />
    <circle
      cx="183"
      cy="228"
      r="6"
      fill="#8F5CFF"
      stroke="#fff"
      stroke-width="2" />
    <!-- 左側線路 -->
    <rect
      x="16"
      y="120"
      width="28"
      height="6"
      rx="3"
      fill="#8F5CFF" />
    <circle
      cx="16"
      cy="123"
      r="6"
      fill="#8F5CFF"
      stroke="#fff"
      stroke-width="2" />
    <!-- 右側線路（線在外） -->
    <rect
      x="240"
      y="123"
      width="40"
      height="6"
      rx="3"
      fill="#8F5CFF" />
    <circle
      cx="280"
      cy="126"
      r="8"
      fill="#8F5CFF"
      stroke="#fff"
      stroke-width="2" />
    <!-- 對話框內「A」「I」 -->
    <text
      x="85"
      y="150"
      font-size="88"
      font-family="Montserrat, Arial, sans-serif"
      font-weight="bold"
      fill="#8F5CFF"
      letter-spacing="10">
      A
    </text>
    <text
      x="165"
      y="150"
      font-size="88"
      font-family="Montserrat, Arial, sans-serif"
      font-style="italic"
      font-weight="bold"
      fill="#8F5CFF">
      I
    </text>
    <!-- 左上數位像素塊（拉開間距） -->
    <rect
      x="28"
      y="14"
      width="14"
      height="14"
      rx="3"
      fill="#8F5CFF" />
    <rect
      x="52"
      y="16"
      width="8"
      height="8"
      rx="2"
      fill="#8F5CFF" />
    <rect
      x="30"
      y="36"
      width="8"
      height="8"
      rx="2"
      fill="#8F5CFF" />
    <rect
      x="60"
      y="28"
      width="6"
      height="6"
      rx="2"
      fill="#8F5CFF" />
  </svg>
</template>
