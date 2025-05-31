<template>
  <div class="settings-container">
    <a-card
      title="系統設置"
      class="settings-card">
      <!-- 主題設置 -->
      <div class="setting-section">
        <h3>主題設置</h3>
        <div class="setting-item">
          <span>暗黑模式</span>
          <a-switch
            :checked="configStore.isDarkMode"
            @change="configStore.toggleTheme" />
        </div>
      </div>

      <!-- 主色調設置 -->
      <div class="setting-section">
        <h3>主色調設置</h3>
        <div class="setting-item">
          <span>當前主色調：{{ configStore.colorPrimary }}</span>
          <div
            class="color-preview"
            :style="{ backgroundColor: configStore.colorPrimary }"></div>
        </div>
        <div class="color-options">
          <div
            v-for="color in colorOptions"
            :key="color.value"
            class="color-option"
            :class="{ active: configStore.colorPrimary === color.value }"
            :style="{ backgroundColor: color.value }"
            @click="handleColorChange(color.value)"
            :title="color.name"></div>
        </div>
        <div class="custom-color">
          <a-input
            v-model:value="customColor"
            placeholder="輸入自定義顏色 (如: #ff0000)"
            style="width: 200px; margin-right: 8px" />
          <a-button
            @click="handleColorChange(customColor)"
            type="primary">
            應用
          </a-button>
        </div>
      </div>

      <!-- 測試區域 -->
      <div class="setting-section">
        <h3>主色調測試</h3>
        <div class="test-buttons">
          <a-button type="primary">主要按鈕</a-button>
          <a-button
            type="primary"
            ghost
            >幽靈按鈕</a-button
          >
          <a-tag color="processing">標籤</a-tag>
        </div>
        <div class="menu-test">
          <div class="menu-item active">
            <span>活躍選單項目（應該使用主色調）</span>
          </div>
          <div class="menu-item">
            <span>普通選單項目</span>
          </div>
        </div>
      </div>
    </a-card>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useConfigStore } from "@/stores/config";
import { message } from "ant-design-vue";

const configStore = useConfigStore();
const customColor = ref("");

const colorOptions = [
  { name: "藍色", value: "#1677ff" },
  { name: "紫色", value: "#4216f4" },
  { name: "綠色", value: "#52c41a" },
  { name: "橙色", value: "#fa8c16" },
  { name: "紅色", value: "#ff4d4f" },
  { name: "青色", value: "#13c2c2" },
  { name: "粉色", value: "#eb2f96" },
  { name: "黃色", value: "#fadb14" },
];

const handleColorChange = (color) => {
  if (!color || !color.match(/^#[0-9A-Fa-f]{6}$/)) {
    message.error("請輸入有效的顏色值 (如: #ff0000)");
    return;
  }

  configStore.updatePrimaryColor(color);
  message.success(`主色調已更新為 ${color}`);
  customColor.value = "";
};
</script>

<style scoped>
.settings-container {
  padding: 24px;
  max-width: 800px;
  margin: 0 auto;
}

.settings-card {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.setting-section {
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--custom-border-primary);
}

.setting-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.setting-section h3 {
  margin-bottom: 16px;
  color: var(--custom-text-primary);
  font-size: 16px;
  font-weight: 600;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding: 12px 0;
}

.color-preview {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: 2px solid var(--custom-border-primary);
}

.color-options {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.color-option {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  cursor: pointer;
  border: 3px solid transparent;
  transition: all 0.2s ease;
  position: relative;
}

.color-option:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.color-option.active {
  border-color: var(--custom-text-primary);
  transform: scale(1.1);
}

.color-option.active::after {
  content: "✓";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-weight: bold;
  text-shadow: 0 0 3px rgba(0, 0, 0, 0.5);
}

.custom-color {
  display: flex;
  align-items: center;
  gap: 8px;
}

.test-buttons {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  align-items: center;
}

.menu-test {
  background: var(--custom-bg-primary);
  border: 1px solid var(--custom-border-primary);
  border-radius: 8px;
  overflow: hidden;
}

.menu-item {
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--custom-text-secondary);
}

.menu-item:hover {
  background: var(--custom-bg-tertiary);
  color: var(--custom-text-primary);
}

.menu-item.active {
  background: var(--primary-color);
  color: white;
  font-weight: 500;
}

.menu-item + .menu-item {
  border-top: 1px solid var(--custom-border-primary);
}
</style>
