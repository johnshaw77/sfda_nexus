<template>
  <div class="quick-commands-container">
    <a-dropdown
      v-model:open="dropdownVisible"
      :trigger="['click']"
      placement="bottomLeft"
      :getPopupContainer="() => document.body">
      
      <template #overlay>
        <a-menu class="quick-commands-menu">
          <!-- 動態命令 -->
          <template v-if="quickCommands && quickCommands.length > 0">
            <a-menu-item
              v-for="command in quickCommands"
              :key="command.id"
              @click="handleQuickCommand(command)"
              class="quick-command-item">
              <div class="command-content">
                <span class="command-title">{{ command.title }}</span>
                <span class="command-description">{{ command.description }}</span>
              </div>
            </a-menu-item>
            <a-menu-divider />
          </template>

          <!-- 靜態快速命令（備用） -->
          <template v-else>
            <a-menu-item
              key="summarize"
              @click="handleStaticCommand('summarize')"
              class="quick-command-item">
              <div class="command-content">
                <span class="command-title">總結要點</span>
                <span class="command-description">總結對話中的關鍵信息</span>
              </div>
            </a-menu-item>
            
            <a-menu-item
              key="translate"
              @click="handleStaticCommand('translate')"
              class="quick-command-item">
              <div class="command-content">
                <span class="command-title">翻譯內容</span>
                <span class="command-description">翻譯最近的對話內容</span>
              </div>
            </a-menu-item>
            
            <a-menu-item
              key="explain"
              @click="handleStaticCommand('explain')"
              class="quick-command-item">
              <div class="command-content">
                <span class="command-title">詳細解釋</span>
                <span class="command-description">對複雜概念進行詳細說明</span>
              </div>
            </a-menu-item>
            
            <a-menu-item
              key="examples"
              @click="handleStaticCommand('examples')"
              class="quick-command-item">
              <div class="command-content">
                <span class="command-title">提供範例</span>
                <span class="command-description">給出相關的實際範例</span>
              </div>
            </a-menu-item>
            
            <a-menu-item
              key="optimize"
              @click="handleStaticCommand('optimize')"
              class="quick-command-item">
              <div class="command-content">
                <span class="command-title">優化建議</span>
                <span class="command-description">提供改進和優化的建議</span>
              </div>
            </a-menu-item>
          </template>
        </a-menu>
      </template>

      <a-button
        type="text"
        size="small"
        class="quick-commands-trigger"
        :class="{ 'dropdown-open': dropdownVisible }">
        <template #icon>
          <BulbOutlined />
        </template>
        快速命令
        <DownOutlined class="dropdown-arrow" />
      </a-button>
    </a-dropdown>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

// Props
const props = defineProps({
  quickCommands: {
    type: Array,
    default: () => []
  },
  conversationId: {
    type: [String, Number],
    default: null
  }
});

// Emits
const emit = defineEmits(['command-selected']);

// 響應式狀態
const dropdownVisible = ref(false);

/**
 * 處理動態快速命令點擊
 */
const handleQuickCommand = (command) => {
  dropdownVisible.value = false;
  emit('command-selected', {
    type: 'dynamic',
    command: command
  });
};

/**
 * 處理靜態快速命令點擊
 */
const handleStaticCommand = (commandKey) => {
  dropdownVisible.value = false;
  
  const staticCommands = {
    summarize: '請總結一下我們剛才對話的重點',
    translate: '請將上面的內容翻譯成英文',
    explain: '請詳細解釋一下剛才提到的概念',
    examples: '請提供一些相關的實際範例',
    optimize: '請給出一些優化和改進的建議'
  };

  const commandText = staticCommands[commandKey];
  if (commandText) {
    emit('command-selected', {
      type: 'static',
      text: commandText
    });
  }
};
</script>

<style scoped>
.quick-commands-container {
  display: inline-block;
}

.quick-commands-trigger {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--custom-text-primary) !important;
  font-size: 12px;
  height: 28px;
  padding: 0 8px;
  border-radius: 6px;
  border: 1px solid var(--custom-border-primary) !important;
  background: var(--custom-bg-secondary) !important;
  transition: all 0.2s ease;
}

.quick-commands-trigger:hover {
  background: var(--custom-bg-quaternary) !important;
  border-color: var(--custom-border-secondary) !important;
}

.quick-commands-trigger.dropdown-open {
  background: var(--custom-bg-quaternary) !important;
  border-color: var(--custom-primary-color) !important;
}

.dropdown-arrow {
  font-size: 10px;
  transition: transform 0.2s ease;
}

.quick-commands-trigger.dropdown-open .dropdown-arrow {
  transform: rotate(180deg);
}

:deep(.quick-commands-menu) {
  background: var(--custom-bg-primary);
  border: 1px solid var(--custom-border-primary);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 4px;
  min-width: 280px;
  max-height: 400px;
  overflow-y: auto;
}

:deep(.quick-command-item) {
  padding: 8px 12px;
  margin: 2px 0;
  border-radius: 6px;
  transition: all 0.2s ease;
}

:deep(.quick-command-item:hover) {
  background: var(--custom-bg-quaternary);
}

.command-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.command-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--custom-text-primary);
}

.command-description {
  font-size: 11px;
  color: var(--custom-text-secondary);
  line-height: 1.3;
}

:deep(.ant-menu-item-divider) {
  background: var(--custom-border-primary);
  margin: 4px 0;
}
</style> 