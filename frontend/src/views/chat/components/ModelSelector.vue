<!--
  模型選擇組件
  基於附圖設計，提供現代化的模型選擇界面
-->
<template>
  <div class="model-selector">
    <a-dropdown
      :open="dropdownVisible"
      @openChange="handleDropdownVisibleChange"
      :trigger="['click']"
      placement="topLeft"
      :overlayStyle="{ maxHeight: '400px', overflow: 'hidden' }">
      <template #overlay>
        <div class="model-dropdown">
          <!-- Header -->
          <div class="dropdown-header">
            <div class="header-content">
              <span class="header-title">選擇模型</span>
              <span class="model-count">{{ totalModelsCount }} 個模型</span>
            </div>
          </div>

          <!-- Models List -->
          <div class="models-list">
            <div
              v-for="model in models"
              :key="model.id"
              class="model-item"
              :class="{
                active: selectedModel?.id === model.id,
                unavailable: !model.is_active,
              }"
              @click="handleSelectModel(model)">
              <div class="model-content">
                <div class="model-main">
                  <div class="model-name-row">
                    <component
                      :is="getProviderIcon(model.provider)"
                      class="provider-icon" />
                    <span class="model-name">{{
                      model.display_name || model.name
                    }}</span>
                    <!-- <span class="provider-tag">{{
                      getProviderLabel(model.provider)
                    }}</span> -->
                  </div>
                  <div class="model-details">
                    <span class="model-id">{{
                      model.model_id || model.name
                    }}</span>
                    <!-- <div
                      class="model-specs"
                      v-if="model.max_tokens">
                      <span class="spec-item">{{
                        formatMaxTokens(model.max_tokens)
                      }}</span>
                    </div> -->
                  </div>
                </div>
                <div class="model-status">
                  <span class="provider-tag">{{
                    getProviderLabel(model.provider)
                  }}</span>
                </div>
                <!-- <div class="model-status">
                  <span
                    v-if="model.is_active"
                    class="status-available"
                    title="可用"
                    >可用</span
                  >
                  <span
                    v-else
                    class="status-unavailable"
                    title="不可用"
                    >不可用</span
                  >
                </div> -->
              </div>
            </div>
          </div>

          <!-- Loading State -->
          <div
            v-if="loading"
            class="loading-state">
            <a-spin size="small" />
            <span>載入模型中...</span>
          </div>

          <!-- Empty State -->
          <div
            v-if="!loading && models.length === 0"
            class="empty-state">
            <span>暫無可用模型</span>
          </div>
        </div>
      </template>

      <div
        class="trigger-button"
        ref="triggerRef">
        <div
          class="selected-model"
          v-if="selectedModel">
          <component
            :is="getProviderIcon(selectedModel.provider)"
            class="selected-icon" />
          <span class="selected-name">{{ selectedModel.display_name }}</span>
          <span class="selected-provider">{{
            getProviderLabel(selectedModel.provider)
          }}</span>
        </div>
        <div
          class="placeholder"
          v-else>
          <span>選擇模型</span>
        </div>
        <UpOutlined class="dropdown-icon" />
      </div>
    </a-dropdown>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from "vue";
import {
  UpOutlined,
  ApiOutlined,
  RobotOutlined,
  CloudOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons-vue";
import { useChatStore } from "@/stores/chat";
import { message } from "ant-design-vue";

const props = defineProps({
  modelValue: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(["update:modelValue", "change"]);

const dropdownVisible = ref(false);
const loading = ref(false);
const triggerRef = ref(null);
const chatStore = useChatStore();

const selectedModel = computed({
  get: () => props.modelValue,
  set: (value) => {
    emit("update:modelValue", value);
    emit("change", value);
    dropdownVisible.value = false;
  },
});

// 將所有模型平鋪成一個列表
const models = computed(() => {
  const models = [];
  if (
    chatStore.availableModels &&
    typeof chatStore.availableModels === "object"
  ) {
    // 動態遍歷所有提供商
    Object.keys(chatStore.availableModels).forEach((provider) => {
      if (chatStore.availableModels[provider]) {
        models.push(...chatStore.availableModels[provider]);
      }
    });
  }
  return models;
});

const totalModelsCount = computed(() => models.value.length);

const handleDropdownVisibleChange = (visible) => {
  // if (visible) {
  //   nextTick(() => {
  //     calculateDropdownPlacement();
  //   });
  // }
  dropdownVisible.value = visible;
};

const handleSelectModel = (model) => {
  if (!model.is_active) return;
  selectedModel.value = model;
};

const getProviderIcon = (provider) => {
  const iconMap = {
    openai: CloudOutlined,
    claude: RobotOutlined,
    gemini: ThunderboltOutlined,
    ollama: ApiOutlined,
  };
  return iconMap[provider] || ApiOutlined;
};

const getProviderLabel = (provider) => {
  const labelMap = {
    openai: "OpenAI",
    claude: "Claude",
    gemini: "Gemini",
    ollama: "Ollama",
  };
  return labelMap[provider] || provider;
};

const formatMaxTokens = (maxTokens) => {
  if (!maxTokens) return "";
  if (maxTokens >= 1000000) {
    return `${(maxTokens / 1000000).toFixed(1)}M tokens`;
  } else if (maxTokens >= 1000) {
    return `${(maxTokens / 1000).toFixed(0)}K tokens`;
  }
  return `${maxTokens} tokens`;
};

const formatPricing = (pricing) => {
  if (!pricing || !pricing.input) return "";
  return `$${pricing.input}/1K tokens`;
};

onMounted(async () => {
  loading.value = true;
  try {
    await chatStore.handleGetAvailableModels();
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.model-selector {
  width: 100%;
}

.trigger-button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 6px;
  font-size: 12px;
  border: 1px solid var(--custom-border-primary);
  border-radius: 6px;
  color: var(--custom-text-primary);
  background: var(--custom-bg-primary);
  cursor: pointer;
  transition: all 0.2s;
  min-height: 40px;
}

.trigger-button:hover {
  border-color: var(--custom-border-primary);
}

.selected-model {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.selected-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.selected-name {
  font-weight: 500;
  color: var(--custom-text-primary);
}

.selected-provider {
  padding: 2px 6px;
  background: var(--custom-bg-tertiary);
  border-radius: 4px;
  font-size: 12px;
  color: var(--custom-text-primary);
}

.placeholder {
  color: #bfbfbf;
}

.dropdown-icon {
  color: var(--custom-text-primary);
  font-size: 10px;
}

.model-dropdown {
  background: var(--custom-bg-primary);
  border-radius: 8px;
  box-shadow:
    0 6px 16px 0 rgba(0, 0, 0, 0.08),
    0 3px 6px -4px rgba(0, 0, 0, 0.12),
    0 9px 28px 8px rgba(0, 0, 0, 0.05);
  min-width: 400px;
  max-width: 500px;
  max-height: 400px;
  overflow: hidden;
}

.dropdown-header {
  padding: 16px;
  border-bottom: 1px solid var(--custom-border-primary);
  background: var(--custom-bg-primary);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-title {
  font-weight: 600;
  font-size: 16px;
  color: var(--custom-text-primary);
}

.model-count {
  font-size: 12px;
  color: var(--custom-text-primary);
}

.models-list {
  max-height: 300px;
  overflow-y: auto;
  padding: 8px 0;
}

.model-item {
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.2s;
  border-left: 3px solid transparent;
}

.model-item:hover:not(.unavailable) {
  background-color: var(--custom-bg-tertiary);
}

.model-item.active {
  background-color: var(--custom-bg-tertiary);
  border-left-color: var(--custom-border-primary);
}

.model-item.unavailable {
  opacity: 0.5;
  cursor: not-allowed;
}

.model-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.model-main {
  flex: 1;
}

.model-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.provider-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.model-name {
  font-weight: 500;
  color: var(--custom-text-primary);
}

.provider-tag {
  padding: 2px 6px;
  background: var(--custom-bg-quaternary);
  border-radius: 4px;
  font-size: 11px;
  color: var(--custom-text-primary);
}

.model-details {
  display: flex;
  align-items: center;
  gap: 12px;
}

.model-id {
  font-size: 12px;
  color: var(--custom-text-primary);
  font-family: "Monaco", "Menlo", monospace;
}

.model-specs {
  display: flex;
  gap: 8px;
}

.spec-item {
  font-size: 11px;
  color: var(--custom-text-primary);
  padding: 1px 4px;
  background: var(--custom-bg-tertiary);
  border-radius: 3px;
}

.model-status {
  display: flex;
  align-items: center;
}

.status-available {
  color: #52c41a;
  font-size: 12px;
  font-weight: 500;
}

.status-unavailable {
  color: #ff4d4f;
  font-size: 12px;
  font-weight: 500;
}

.loading-state,
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px 16px;
  color: var(--custom-text-primary);
}
</style>
