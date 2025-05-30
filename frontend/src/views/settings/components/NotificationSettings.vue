<!--
  通知設置組件
  管理各種通知偏好設置
-->

<template>
  <a-card
    title="通知設置"
    class="settings-panel">
    <div class="notification-section">
      <div class="notification-item">
        <div class="notification-info">
          <h4>新消息通知</h4>
          <p>當收到新的 AI 回覆時顯示通知</p>
        </div>
        <a-switch v-model:checked="notificationSettings.newMessage" />
      </div>

      <div class="notification-item">
        <div class="notification-info">
          <h4>系統通知</h4>
          <p>接收系統更新和重要公告</p>
        </div>
        <a-switch v-model:checked="notificationSettings.system" />
      </div>

      <div class="notification-item">
        <div class="notification-info">
          <h4>郵件通知</h4>
          <p>通過郵件接收重要通知</p>
        </div>
        <a-switch v-model:checked="notificationSettings.email" />
      </div>

      <div class="notification-item">
        <div class="notification-info">
          <h4>聲音提示</h4>
          <p>新消息時播放提示音</p>
        </div>
        <a-switch v-model:checked="notificationSettings.sound" />
      </div>
    </div>

    <a-divider />

    <a-button
      type="primary"
      @click="handleSaveNotificationSettings">
      保存設置
    </a-button>
  </a-card>
</template>

<script setup>
import { reactive, onMounted } from "vue";
import { message } from "ant-design-vue";

// 通知設置
const notificationSettings = reactive({
  newMessage: true,
  system: true,
  email: false,
  sound: true,
});

// 事件處理
const handleSaveNotificationSettings = () => {
  // 保存通知設置到本地存儲或服務器
  localStorage.setItem(
    "notificationSettings",
    JSON.stringify(notificationSettings)
  );
  message.success("通知設置已保存");
};

// 初始化數據
const initializeData = () => {
  // 載入本地設置
  const savedNotificationSettings = localStorage.getItem(
    "notificationSettings"
  );
  if (savedNotificationSettings) {
    Object.assign(notificationSettings, JSON.parse(savedNotificationSettings));
  }
};

onMounted(() => {
  initializeData();
});
</script>

<style scoped>
.settings-panel {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.notification-section {
  margin-bottom: 24px;
}

.notification-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid #f0f0f0;
}

.notification-item:last-child {
  border-bottom: none;
}

.notification-info h4 {
  margin: 0 0 4px 0;
  color: #333;
  font-weight: 500;
}

.notification-info p {
  margin: 0;
  color: #666;
  font-size: 14px;
}

:deep(.ant-card-head-title) {
  font-weight: 600;
  color: #333;
}
</style>
