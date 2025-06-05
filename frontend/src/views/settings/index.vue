<!--
  設置頁面
  提供用戶系統偏好設置等功能
  個人資料功能已移至 /user 路由
-->

<template>
  <div class="settings-container">
    <div class="settings-header">
      <h1 class="settings-title">設置</h1>
      <p class="settings-subtitle">管理您的系統偏好設置</p>
    </div>

    <div class="settings-content">
      <a-row :gutter="[24, 24]">
        <!-- 設置菜單 -->
        <a-col
          :xs="24"
          :lg="6">
          <a-card class="settings-menu-card">
            <a-menu
              v-model:selectedKeys="selectedMenuKeys"
              mode="vertical"
              class="settings-menu"
              @click="handleMenuClick">
              <a-menu-item key="security">
                <template #icon>
                  <LockOutlined />
                </template>
                安全設置
              </a-menu-item>
              <a-menu-item key="notifications">
                <template #icon>
                  <BellOutlined />
                </template>
                通知設置
              </a-menu-item>
              <a-menu-item key="appearance">
                <template #icon>
                  <BgColorsOutlined />
                </template>
                外觀設置
              </a-menu-item>
              <a-menu-item key="chat">
                <template #icon>
                  <MessageOutlined />
                </template>
                聊天設置
              </a-menu-item>
            </a-menu>
          </a-card>
        </a-col>

        <!-- 設置內容 -->
        <a-col
          :xs="24"
          :lg="18">
          <!-- 安全設置 -->
          <SecuritySettings v-show="activeTab === 'security'" />

          <!-- 通知設置 -->
          <NotificationSettings v-show="activeTab === 'notifications'" />

          <!-- 外觀設置 -->
          <AppearanceSettings v-show="activeTab === 'appearance'" />

          <!-- 聊天設置 -->
          <ChatSettings v-show="activeTab === 'chat'" />
        </a-col>
      </a-row>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
// Icons are globally registered in main.js
import SecuritySettings from "./components/SecuritySettings.vue";
import NotificationSettings from "./components/NotificationSettings.vue";
import AppearanceSettings from "./components/AppearanceSettings.vue";
import ChatSettings from "./components/ChatSettings.vue";

const router = useRouter();

// 響應式數據
const selectedMenuKeys = ref(["security"]); // 默認選中安全設置
const activeTab = ref("security");

// 事件處理
const handleMenuClick = ({ key }) => {
  activeTab.value = key;
  selectedMenuKeys.value = [key];
};
</script>

<style scoped>
.settings-container {
  padding: 24px;
  min-height: 100%;
  overflow-y: auto;
}

.settings-header {
  margin-bottom: 24px;
}

.settings-title {
  font-size: 28px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: var(--custom-text-primary);
}

.settings-subtitle {
  color: var(--custom-text-secondary);
  font-size: 16px;
  margin: 0;
}

.settings-content {
  max-width: 1200px;
}

.settings-menu-card {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  background: var(--custom-bg-primary);
  border: 1px solid var(--custom-border-primary);
}

.settings-menu {
  border: none !important;
  background: transparent;
}

.settings-panel {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  min-height: 500px;
  background: var(--custom-bg-primary);
  border: 1px solid var(--custom-border-primary);
}

/* 響應式設計 */
@media (max-width: 768px) {
  .settings-container {
    padding: 16px;
  }

  .settings-title {
    font-size: 24px;
  }
}

/* 表單樣式優化 */
:deep(.ant-form-item-label > label) {
  font-weight: 500;
  color: var(--custom-text-primary);
}

:deep(.ant-card-head-title) {
  font-weight: 600;
  color: var(--custom-text-primary);
}

:deep(.ant-menu-item-selected) {
  background-color: var(--primary-color);
  color: white;
  border-radius: 6px;
}

:deep(.ant-menu-item) {
  color: var(--custom-text-secondary);
  border-radius: 6px;
  margin-bottom: 4px;
}

:deep(.ant-menu-item:hover) {
  background-color: var(--custom-bg-tertiary);
  color: var(--custom-text-primary);
}

:deep(.ant-card) {
  background: var(--custom-bg-primary);
  border: 1px solid var(--custom-border-primary);
}

:deep(.ant-card-body) {
  background: var(--custom-bg-primary);
}
</style>
