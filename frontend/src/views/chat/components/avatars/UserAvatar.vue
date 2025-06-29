<template>
  <a-avatar
    :size="size"
    :src="user?.avatar"
    :style="{
      backgroundColor: user?.avatar ? 'transparent' : '#1890ff',
    }">
    <UserOutlined v-if="!user?.avatar" />
  </a-avatar>
</template>

/**
 * @fileoverview UserAvatar - 用戶頭像組件
 * @description 顯示當前登入用戶的頭像，自動從認證 store 獲取用戶信息。
 * 支援自定義頭像圖片，當沒有頭像時顯示預設的用戶圖示。
 * 
 * @component UserAvatar
 * @author SFDA Development Team
 * @since 1.0.0
 * @version 1.1.0
 * 
 * @example
 * <UserAvatar :size="40" />
 * <UserAvatar /> <!-- 使用預設大小 32px -->
 * 
 * @description 功能特點：
 * - 自動獲取用戶信息：從認證 store 讀取當前用戶的頭像
 * - 備用圖示：當用戶沒有設定頭像時顯示預設用戶圖示
 * - 尺寸控制：支援自定義頭像大小
 * - 智能背景：有頭像時透明背景，無頭像時藍色背景
 * - 無狀態設計：純展示組件，不包含交互邏輯
 * 
 * @requires @ant-design/icons-vue
 * @requires @/stores/auth
 */

<script setup>
import { UserOutlined } from '@ant-design/icons-vue';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();

/**
 * 組件 Props 定義
 * @typedef {Object} Props
 * @property {number} [size=32] - 頭像大小（像素）
 */
defineProps({
  /** @type {number} 頭像大小，單位為像素 */
  size: {
    type: Number,
    default: 32
  }
});

/**
 * 當前用戶信息
 * @description 從認證 store 獲取當前登入用戶的信息，包含頭像 URL
 * @type {Object|null} user - 用戶對象，包含 avatar 字段
 */
const user = authStore.user;
</script>

<style scoped>
/* 如果需要特定的用戶頭像樣式，可以在這裡添加 */
</style>