/**
TODO: 沒用到，先保留
*/

<template>
  <div class="text-converter-settings">
    <a-card
      title="思考內容繁簡轉換"
      :bordered="false"
      size="small"
      class="settings-card">
      <template #extra>
        <a-switch
          v-model:checked="isEnabled"
          @change="handleToggleConverter"
          :disabled="!converterInfo.isAvailable">
          <template #checkedChildren>啟用</template>
          <template #unCheckedChildren>關閉</template>
        </a-switch>
      </template>

      <!-- 轉換模式選擇 -->
      <div class="setting-item">
        <label class="setting-label">轉換模式：</label>
        <a-select
          v-model:value="selectedMode"
          @change="handleModeChange"
          :disabled="!isEnabled || !converterInfo.isAvailable"
          style="width: 200px">
          <a-select-option
            v-for="mode in converterInfo.supportedModes"
            :key="mode.value"
            :value="mode.value">
            {{ mode.label }}
          </a-select-option>
        </a-select>
      </div>

      <!-- 狀態信息 -->
      <div class="status-info">
        <a-space
          direction="vertical"
          size="small">
          <div class="status-item">
            <a-tag :color="converterInfo.isAvailable ? 'green' : 'red'">
              OpenCC: {{ converterInfo.isAvailable ? "可用" : "不可用" }}
            </a-tag>
          </div>

          <div
            class="status-item"
            v-if="isEnabled">
            <a-tag color="blue"> 當前模式: {{ getCurrentModeLabel() }} </a-tag>
          </div>
        </a-space>
      </div>

      <!-- 說明文字 -->
      <div class="description">
        <a-typography-text
          type="secondary"
          style="font-size: 12px">
          <InfoCircleOutlined />
          此功能會自動將 AI
          思考過程中的簡體中文轉換為繁體中文，支援串流和非串流模式。
        </a-typography-text>
      </div>
    </a-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useChatStore } from "@/stores/chat";
import { InfoCircleOutlined } from "@ant-design/icons-vue";
import { message } from "ant-design-vue";

const chatStore = useChatStore();

// 響應式數據
const isEnabled = ref(chatStore.isTextConverterEnabled);
const selectedMode = ref(chatStore.textConversionMode);
const converterInfo = ref(chatStore.getTextConverterInfo());

// 計算屬性
const getCurrentModeLabel = () => {
  const mode = converterInfo.value.supportedModes.find(
    (m) => m.value === selectedMode.value
  );
  return mode ? mode.label : selectedMode.value;
};

// 方法
const handleToggleConverter = (enabled) => {
  try {
    chatStore.toggleTextConverter(enabled);
    isEnabled.value = enabled;

    if (enabled) {
      message.success("文字轉換器已啟用");
    } else {
      message.info("文字轉換器已關閉，正在重新載入原始內容...");
    }

    // 更新狀態信息
    converterInfo.value = chatStore.getTextConverterInfo();
  } catch (error) {
    console.error("切換文字轉換器失敗:", error);
    message.error("切換失敗: " + error.message);
  }
};

const handleModeChange = (mode) => {
  try {
    chatStore.setTextConversionMode(mode);
    selectedMode.value = mode;

    message.success(`轉換模式已切換為: ${getCurrentModeLabel()}`);

    // 更新狀態信息
    converterInfo.value = chatStore.getTextConverterInfo();
  } catch (error) {
    console.error("切換轉換模式失敗:", error);
    message.error("模式切換失敗: " + error.message);
  }
};

// 生命週期
onMounted(() => {
  // 初始化時更新狀態信息
  converterInfo.value = chatStore.getTextConverterInfo();

  if (!converterInfo.value.isAvailable) {
    console.warn("OpenCC 文字轉換器不可用");
  }
});
</script>

<style scoped>
.text-converter-settings {
  width: 100%;
}

.settings-card {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.setting-item {
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.setting-label {
  font-weight: 500;
  color: #262626;
  min-width: 80px;
}

.status-info {
  margin: 16px 0;
  padding: 12px;
  background: #fafafa;
  border-radius: 6px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.description {
  margin-top: 16px;
  padding: 8px;
  background: #f6f8fa;
  border-radius: 4px;
  border-left: 3px solid #1890ff;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .setting-item {
    flex-direction: column;
    align-items: flex-start;
  }

  .setting-label {
    min-width: auto;
  }
}
</style>
