<template>
  <div class="global-prompt-manager">
    <!-- 簡化的全域提示詞編輯器 -->
    <div class="prompt-editor">
      <a-form layout="vertical">
        <a-form-item label="全域提示詞">
          <a-textarea
            v-model:value="globalRules"
            placeholder="輸入全域提示詞內容..."
            :rows="15"
            :loading="loading"
            style="
              font-family:
                &quot;Monaco&quot;, &quot;Menlo&quot;, &quot;Ubuntu Mono&quot;,
                monospace;
              font-size: 13px;
            " />
        </a-form-item>

        <a-form-item>
          <a-space>
            <a-button
              type="primary"
              @click="handleSave"
              :loading="saving">
              <SaveOutlined />
              保存
            </a-button>
            <a-button @click="handleReset">
              <ReloadOutlined />
              重置
            </a-button>
            <a-button
              @click="handlePreview"
              type="dashed">
              <EyeOutlined />
              預覽當前規則
            </a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </div>

    <!-- 簡化的提示信息 -->
    <a-alert
      v-if="operationResult"
      :message="operationResult.message"
      :type="operationResult.type"
      :closable="true"
      show-icon
      @close="operationResult = null"
      style="margin-top: 16px" />

    <!-- 預覽區域 -->
    <a-card
      v-if="showPreview"
      title="當前全域提示詞"
      style="margin-top: 16px"
      size="small">
      <template #extra>
        <a-button
          size="small"
          type="text"
          @click="showPreview = false">
          <CloseOutlined />
        </a-button>
      </template>

      <a-typography-text
        :code="true"
        :copyable="{ text: currentRules }"
        style="
          white-space: pre-wrap;
          font-size: 12px;
          display: block;
          max-height: 400px;
          overflow-y: auto;
        ">
        {{ currentRules }}
      </a-typography-text>
    </a-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { message } from "ant-design-vue";
import api from "@/api/index.js";
import {
  SaveOutlined,
  ReloadOutlined,
  EyeOutlined,
  CloseOutlined,
} from "@ant-design/icons-vue";

// 響應式數據
const globalRules = ref("");
const currentRules = ref("");
const loading = ref(false);
const saving = ref(false);
const showPreview = ref(false);
const operationResult = ref(null);
const originalRules = ref("");

// 方法
const handlePreview = async () => {
  try {
    loading.value = true;
    const response = await api.get("/api/admin/global-prompt/preview");
    const data = response.data;

    if (data.success) {
      currentRules.value = data.data.rules;
      showPreview.value = true;
    } else {
      message.error("獲取規則預覽失敗");
    }
  } catch (error) {
    console.error("Preview error:", error);
    message.error("獲取規則預覽失敗");
  } finally {
    loading.value = false;
  }
};

const handleSave = async () => {
  if (!globalRules.value.trim()) {
    message.warning("請輸入全域提示詞內容");
    return;
  }

  try {
    saving.value = true;
    const response = await api.put("/api/admin/global-prompt/update", {
      rules: globalRules.value,
    });

    if (response.data.success) {
      originalRules.value = globalRules.value;
      operationResult.value = {
        type: "success",
        message: "全域提示詞保存成功",
      };
      message.success("保存成功");
    } else {
      message.error("保存失敗");
    }
  } catch (error) {
    console.error("Save error:", error);
    message.error("保存失敗");
  } finally {
    saving.value = false;
  }
};

const handleReset = () => {
  globalRules.value = originalRules.value;
  operationResult.value = {
    type: "info",
    message: "已重置為上次保存的內容",
  };
};

const loadCurrentRules = async () => {
  try {
    loading.value = true;
    const response = await api.get("/api/admin/global-prompt/preview");
    const data = response.data;

    if (data.success) {
      globalRules.value = data.data.rules;
      originalRules.value = data.data.rules;
    }
  } catch (error) {
    console.error("Load error:", error);
    message.error("載入全域提示詞失敗");
  } finally {
    loading.value = false;
  }
};

// 生命週期
onMounted(() => {
  loadCurrentRules();
});
</script>

<style scoped>
.global-prompt-manager {
  padding: 24px;
  min-height: 500px;
}

.prompt-editor {
  max-width: 100%;
}

.ant-typography {
  background: #f6f8fa !important;
  border: 1px solid #e1e4e8;
  border-radius: 6px;
  padding: 16px;
}

:root[data-theme="dark"] .ant-typography {
  background: #0d1117 !important;
  border-color: #30363d;
  color: #c9d1d9;
}

.ant-form-item {
  margin-bottom: 16px;
}

.ant-textarea {
  resize: vertical;
  min-height: 300px;
}

:root[data-theme="dark"] .ant-textarea {
  background-color: #1a1a1a;
  border-color: #434343;
  color: #e8e8e8;
}
</style>
