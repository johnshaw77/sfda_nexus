<template>
  <a-modal
    v-model:open="visible"
    title="聊天設置"
    width="500px"
    :maskClosable="false"
    @ok="handleSave"
    @cancel="handleCancel">
    
    <a-form layout="vertical" :model="formData">
      <!-- 溫度設置 -->
      <a-form-item label="溫度 (創造性)">
        <a-slider
          v-model:value="formData.temperature"
          :min="0"
          :max="2"
          :step="0.1"
          :marks="temperatureMarks"
          :tooltip-formatter="(value) => `${value} (${getTemperatureLabel(value)})`" />
        <div class="setting-description">
          控制 AI 回應的創造性程度。較低值更保守準確，較高值更有創意但可能不太穩定。
        </div>
      </a-form-item>

      <!-- 最大回應長度 -->
      <a-form-item label="最大回應長度">
        <a-input-number
          v-model:value="formData.maxTokens"
          :min="100"
          :max="16384"
          :step="100"
          style="width: 100%"
          :formatter="(value) => `${value} tokens`"
          :parser="(value) => value.replace(' tokens', '')" />
        <div class="setting-description">
          限制 AI 單次回應的最大長度。較高值允許更長的回應，但會消耗更多資源。
        </div>
      </a-form-item>

      <!-- 字體大小 -->
      <a-form-item label="字體大小">
        <a-input-number
          v-model:value="formData.fontSize"
          :min="12"
          :max="20"
          :step="1"
          style="width: 100%"
          :formatter="(value) => `${value}px`"
          :parser="(value) => value.replace('px', '')" />
        <div class="setting-description">
          調整聊天消息的字體大小，影響閱讀體驗。
        </div>
      </a-form-item>

      <!-- 系統提示詞 -->
      <a-form-item>
        <template #label>
          <div class="system-prompt-header">
            <span>系統提示詞</span>
            <a-button
              v-if="agent"
              type="link"
              size="small"
              @click="handleResetToDefault">
              恢復默認
            </a-button>
          </div>
        </template>
        
        <div class="system-prompt-info">
          {{
            agent
              ? `${agent.display_name || agent.name} 的系統提示詞`
              : "全域系統提示詞"
          }}
        </div>
        
        <a-textarea
          v-model:value="formData.systemPrompt"
          placeholder="設置 AI 的行為和角色..."
          :rows="8"
          :maxlength="2000"
          show-count
          class="system-prompt-textarea" />
        
        <div class="setting-description">
          系統提示詞定義了 AI 的角色、行為方式和回應風格。修改後將影響後續的對話。
        </div>
      </a-form-item>

      <!-- 高級設置 -->
      <a-collapse ghost>
        <a-collapse-panel key="advanced" header="高級設置">
          
          <!-- 串流模式 -->
          <a-form-item label="串流模式">
            <a-switch
              v-model:checked="formData.useStreamMode"
              checked-children="啟用"
              un-checked-children="禁用" />
            <div class="setting-description">
              啟用後將使用類似 ChatGPT 的逐字顯示效果，禁用則一次性顯示完整回應。
            </div>
          </a-form-item>

          <!-- 即時渲染 -->
          <a-form-item label="即時渲染">
            <a-switch
              v-model:checked="formData.useRealtimeRender"
              checked-children="啟用"
              un-checked-children="禁用" />
            <div class="setting-description">
              串流過程中即時渲染內容，或等待串流完成後一次性渲染。
            </div>
          </a-form-item>

          <!-- 思考模式 -->
          <a-form-item label="思考模式">
            <a-switch
              v-model:checked="formData.thinkingMode"
              checked-children="開啟"
              un-checked-children="關閉" />
            <div class="setting-description">
              開啟後 AI 會顯示思考過程，關閉則直接輸出結果。
            </div>
          </a-form-item>

        </a-collapse-panel>
      </a-collapse>

    </a-form>
  </a-modal>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import { message } from 'ant-design-vue';

// Props
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  agent: {
    type: Object,
    default: null
  },
  initialSettings: {
    type: Object,
    default: () => ({
      temperature: 0.7,
      maxTokens: 8192,
      fontSize: 14,
      systemPrompt: '',
      useStreamMode: true,
      useRealtimeRender: true,
      thinkingMode: true
    })
  }
});

// Emits
const emit = defineEmits(['update:visible', 'save', 'reset-prompt']);

// 響應式狀態
const formData = ref({
  temperature: 0.7,
  maxTokens: 8192,
  fontSize: 14,
  systemPrompt: '',
  useStreamMode: true,
  useRealtimeRender: true,
  thinkingMode: true
});

// 溫度標記
const temperatureMarks = {
  0: '保守',
  0.5: '穩定',
  1: '平衡',
  1.5: '創新',
  2: '極創'
};

// 計算屬性
const getTemperatureLabel = (value) => {
  if (value <= 0.3) return '非常保守';
  if (value <= 0.7) return '穩定';
  if (value <= 1.2) return '平衡';
  if (value <= 1.7) return '創新';
  return '極度創新';
};

// 監聽 visible 變化，重置表單數據
watch(() => props.visible, (newVisible) => {
  if (newVisible) {
    // 重置表單數據為初始設置
    Object.assign(formData.value, props.initialSettings);
  }
});

// 監聽初始設置變化
watch(() => props.initialSettings, (newSettings) => {
  if (props.visible) {
    Object.assign(formData.value, newSettings);
  }
}, { deep: true });

/**
 * 處理保存
 */
const handleSave = () => {
  // 驗證數據
  if (formData.value.maxTokens < 100 || formData.value.maxTokens > 16384) {
    message.error('最大回應長度必須在 100-16384 之間');
    return;
  }

  if (formData.value.fontSize < 12 || formData.value.fontSize > 20) {
    message.error('字體大小必須在 12-20px 之間');
    return;
  }

  if (formData.value.temperature < 0 || formData.value.temperature > 2) {
    message.error('溫度值必須在 0-2 之間');
    return;
  }

  // 發送保存事件
  emit('save', { ...formData.value });
  emit('update:visible', false);
};

/**
 * 處理取消
 */
const handleCancel = () => {
  emit('update:visible', false);
};

/**
 * 恢復默認系統提示詞
 */
const handleResetToDefault = () => {
  emit('reset-prompt');
};
</script>

<style scoped>
.system-prompt-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.system-prompt-info {
  font-size: 12px;
  color: var(--custom-text-secondary);
  margin-bottom: 8px;
}

.system-prompt-textarea {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
}

.setting-description {
  font-size: 12px;
  color: var(--custom-text-secondary);
  margin-top: 4px;
  line-height: 1.4;
}

:deep(.ant-slider-mark-text) {
  font-size: 11px;
  color: var(--custom-text-secondary);
}

:deep(.ant-collapse-ghost > .ant-collapse-item > .ant-collapse-content > .ant-collapse-content-box) {
  padding-top: 16px;
}

:deep(.ant-form-item) {
  margin-bottom: 20px;
}

:deep(.ant-form-item:last-child) {
  margin-bottom: 0;
}

/* 高級設置樣式 */
:deep(.ant-collapse-header) {
  padding: 8px 0 !important;
  font-size: 13px;
  color: var(--custom-text-primary);
}

:deep(.ant-collapse-content) {
  border-top: 1px solid var(--custom-border-primary);
}
</style> 