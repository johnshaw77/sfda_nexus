<!--
  聊天設置組件
  管理聊天相關的偏好設置
-->

<template>
  <a-card
    title="聊天設置"
    class="settings-panel">
    <div class="chat-section">
      <div class="setting-group">
        <h4>默認 AI 模型</h4>
        <a-select
          v-model:value="chatSettings.defaultModel"
          placeholder="選擇默認模型"
          style="width: 200px">
          <a-select-option value="ollama:qwen3">Qwen3 (Ollama)</a-select-option>
          <a-select-option value="gemini:pro">Gemini Pro</a-select-option>
        </a-select>
      </div>

      <div class="setting-group">
        <h4>消息發送方式</h4>
        <a-radio-group v-model:value="chatSettings.sendMode">
          <a-radio value="enter">Enter 發送</a-radio>
          <a-radio value="ctrl-enter">Ctrl+Enter 發送</a-radio>
        </a-radio-group>
      </div>

      <div class="setting-group">
        <h4>自動保存對話</h4>
        <a-switch
          v-model:checked="chatSettings.autoSave"
          checked-children="開"
          un-checked-children="關" />
        <p class="setting-description">自動保存對話記錄到雲端</p>
      </div>

      <div class="setting-group">
        <h4>顯示輸入狀態</h4>
        <a-switch
          v-model:checked="chatSettings.showTyping"
          checked-children="開"
          un-checked-children="關" />
        <p class="setting-description">向其他用戶顯示您的輸入狀態</p>
      </div>
    </div>

    <a-divider />

    <a-button
      type="primary"
      @click="handleSaveChatSettings">
      保存設置
    </a-button>
  </a-card>
</template>

<script setup>
import { reactive, onMounted } from "vue";
import { message } from "ant-design-vue";

// 聊天設置
const chatSettings = reactive({
  defaultModel: "ollama:qwen3",
  sendMode: "enter",
  autoSave: true,
  showTyping: true,
});

// 事件處理
const handleSaveChatSettings = () => {
  // 保存聊天設置到本地存儲
  localStorage.setItem("chatSettings", JSON.stringify(chatSettings));
  message.success("聊天設置已保存");
};

// 初始化數據
const initializeData = () => {
  // 載入本地設置
  const savedChatSettings = localStorage.getItem("chatSettings");
  if (savedChatSettings) {
    Object.assign(chatSettings, JSON.parse(savedChatSettings));
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

.chat-section {
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
