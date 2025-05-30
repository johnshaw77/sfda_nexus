<!--
  外觀設置組件
  管理主題、字體大小等外觀相關設置
-->

<template>
  <a-card
    title="外觀設置"
    class="settings-panel">
    <div class="appearance-section">
      <div class="setting-group">
        <h4>主題模式</h4>
        <a-radio-group v-model:value="appearanceSettings.theme">
          <a-radio value="light">淺色模式</a-radio>
          <a-radio value="dark">深色模式</a-radio>
          <a-radio value="auto">跟隨系統</a-radio>
        </a-radio-group>
      </div>

      <div class="setting-group">
        <h4>字體大小</h4>
        <a-slider
          v-model:value="appearanceSettings.fontSize"
          :min="12"
          :max="18"
          :marks="{ 12: '小', 14: '中', 16: '大', 18: '特大' }" />
      </div>

      <div class="setting-group">
        <h4>緊湊模式</h4>
        <a-switch
          v-model:checked="appearanceSettings.compact"
          checked-children="開"
          un-checked-children="關" />
        <p class="setting-description">減少界面間距，顯示更多內容</p>
      </div>
    </div>

    <a-divider />

    <a-button
      type="primary"
      @click="handleSaveAppearanceSettings">
      保存設置
    </a-button>
  </a-card>
</template>

<script setup>
import { reactive, onMounted } from "vue";
import { message } from "ant-design-vue";

// 外觀設置
const appearanceSettings = reactive({
  theme: "light",
  fontSize: 14,
  compact: false,
});

// 事件處理
const handleSaveAppearanceSettings = () => {
  // 保存外觀設置到本地存儲
  localStorage.setItem(
    "appearanceSettings",
    JSON.stringify(appearanceSettings)
  );
  message.success("外觀設置已保存");
};

// 初始化數據
const initializeData = () => {
  // 載入本地設置
  const savedAppearanceSettings = localStorage.getItem("appearanceSettings");
  if (savedAppearanceSettings) {
    Object.assign(appearanceSettings, JSON.parse(savedAppearanceSettings));
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

.appearance-section {
  margin-bottom: 24px;
}

.setting-group {
  margin-bottom: 24px;
}

.setting-group h4 {
  margin: 0 0 12px 0;
  color: #333;
  font-weight: 500;
}

.setting-description {
  margin: 8px 0 0 0;
  color: #666;
  font-size: 14px;
}

:deep(.ant-card-head-title) {
  font-weight: 600;
  color: #333;
}
</style>
