<template>
  <div class="file-analysis-card">
    <!-- 關閉按鈕 -->
    <div class="close-button">
      <a-button
        type="text"
        size="small"
        @click="$emit('close')">
        <CloseOutlined />
      </a-button>
    </div>

    <!-- 檔案信息卡片 -->
    <div class="file-info-card">
      <div class="file-icon">
        <FileTextOutlined v-if="isTextFile" />
        <FilePdfOutlined v-else-if="isPdfFile" />
        <FileImageOutlined v-else-if="isImageFile" />
        <FileOutlined v-else />
      </div>
      <div class="file-details">
        <div class="file-name">{{ fileInfo.filename }}</div>
        <div class="file-size">{{ formatFileSize(fileInfo.file_size) }}</div>
      </div>
    </div>

    <!-- 功能按鈕 -->
    <div class="action-buttons">
      <a-button
        class="action-btn"
        :loading="summarizing"
        @click="handleSummarize">
        <template #icon>
          <UnorderedListOutlined />
        </template>
        總結關鍵要點
      </a-button>

      <a-button
        class="action-btn"
        :loading="generating"
        @click="handleGenerateDoc">
        <template #icon>
          <FileAddOutlined />
        </template>
        生成文件
      </a-button>
    </div>

    <!-- 問答輸入框 -->
    <div class="question-input">
      <a-input
        v-model:value="question"
        placeholder="問我任何問題..."
        :disabled="asking"
        @press-enter="handleAskQuestion">
        <template #suffix>
          <a-button
            type="text"
            size="small"
            :loading="asking"
            @click="handleAskQuestion"
            :disabled="!question.trim()">
            <SendOutlined />
          </a-button>
        </template>
      </a-input>
    </div>

    <!-- 分析結果顯示 -->
    <div
      v-if="analysisResult"
      class="analysis-result">
      <a-card
        size="small"
        :title="analysisResult.title">
        <div
          class="result-content"
          v-html="analysisResult.content"></div>
      </a-card>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { message } from "ant-design-vue";
import {
  FileTextOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  FileOutlined,
  UnorderedListOutlined,
  FileAddOutlined,
  SendOutlined,
  CloseOutlined,
} from "@ant-design/icons-vue";

// Props
const props = defineProps({
  fileInfo: {
    type: Object,
    required: true,
  },
});

// Emits
const emit = defineEmits([
  "close",
  "summarize",
  "generate-doc",
  "ask-question",
]);

// 響應式數據
const question = ref("");
const summarizing = ref(false);
const generating = ref(false);
const asking = ref(false);
const analysisResult = ref(null);

// 計算屬性
const isTextFile = computed(() => {
  const textTypes = ["text/plain", "text/markdown", "application/json"];
  return (
    textTypes.includes(props.fileInfo.mime_type) ||
    props.fileInfo.filename.endsWith(".md") ||
    props.fileInfo.filename.endsWith(".txt")
  );
});

const isPdfFile = computed(() => {
  return props.fileInfo.mime_type === "application/pdf";
});

const isImageFile = computed(() => {
  return props.fileInfo.mime_type.startsWith("image/");
});

// 方法
const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const handleSummarize = async () => {
  try {
    summarizing.value = true;

    // 調用檔案分析 API
    const { analyzeFile } = await import("@/api/files.js");
    const response = await analyzeFile(props.fileInfo.id, "summarize");

    if (response.success) {
      analysisResult.value = {
        title: "關鍵要點總結",
        content: response.data.summary,
      };
      message.success("總結完成");
    } else {
      message.error(response.message || "總結失敗");
    }
  } catch (error) {
    console.error("總結失敗:", error);
    message.error("總結失敗，請稍後重試");
  } finally {
    summarizing.value = false;
  }
};

const handleGenerateDoc = async () => {
  try {
    generating.value = true;

    // 調用文檔生成 API
    const { analyzeFile } = await import("@/api/files.js");
    const response = await analyzeFile(props.fileInfo.id, "generate");

    if (response.success) {
      analysisResult.value = {
        title: "生成的文檔",
        content: response.data.document,
      };
      message.success("文檔生成完成");
    } else {
      message.error(response.message || "文檔生成失敗");
    }
  } catch (error) {
    console.error("文檔生成失敗:", error);
    message.error("文檔生成失敗，請稍後重試");
  } finally {
    generating.value = false;
  }
};

const handleAskQuestion = async () => {
  if (!question.value.trim()) return;

  try {
    asking.value = true;

    // 調用檔案問答 API
    const { askFileQuestion } = await import("@/api/files.js");
    const response = await askFileQuestion(props.fileInfo.id, question.value);

    if (response.success) {
      analysisResult.value = {
        title: `問題：${question.value}`,
        content: response.data.answer,
      };
      question.value = ""; // 清空輸入框
      message.success("回答完成");
    } else {
      message.error(response.message || "問答失敗");
    }
  } catch (error) {
    console.error("問答失敗:", error);
    message.error("問答失敗，請稍後重試");
  } finally {
    asking.value = false;
  }
};
</script>

<style scoped>
.file-analysis-card {
  max-width: 300px;
  margin: 0 0 16px 0;
  padding: 16px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #f0f0f0;
  position: relative;
}

/* 當作為內聯組件使用時的特殊樣式 */
.inline-file-analysis .file-analysis-card {
  margin: 0 0 12px 0;
  padding: 12px;
  background: #fafafa;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  max-width: 300px;
}

.inline-file-analysis .file-info-card {
  padding: 12px;
  margin-bottom: 12px;
}

.inline-file-analysis .file-icon {
  width: 40px;
  height: 40px;
  font-size: 16px;
}

.inline-file-analysis .file-name {
  font-size: 14px;
  margin-bottom: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 200px;
}

.inline-file-analysis .file-size {
  font-size: 12px;
}

.inline-file-analysis .action-buttons {
  gap: 8px;
  margin-bottom: 12px;
}

.inline-file-analysis .action-btn {
  height: 32px;
  font-size: 12px;
}

.inline-file-analysis .question-input {
  margin-bottom: 12px;
}

.inline-file-analysis .question-input .ant-input {
  font-size: 13px;
  padding: 6px 10px;
}

.inline-file-analysis .analysis-result {
  margin-top: 12px;
}

.close-button {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 10;
}

.file-info-card {
  display: flex;
  align-items: center;
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
  margin-bottom: 16px;
  border: 1px solid #e8e8e8;
}

.file-icon {
  width: 48px;
  height: 48px;
  background: #ff8c00;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  color: white;
  font-size: 20px;
}

.file-details {
  flex: 1;
}

.file-name {
  font-size: 16px;
  font-weight: 500;
  color: #262626;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-size {
  font-size: 14px;
  color: #8c8c8c;
}

.action-buttons {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.action-btn {
  flex: 1;
  height: 40px;
  border-radius: 8px;
  border: 1px solid #d9d9d9;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: all 0.3s;
}

.action-btn:hover {
  border-color: #1890ff;
  color: #1890ff;
}

.question-input {
  margin-bottom: 16px;
}

.question-input .ant-input {
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 14px;
}

.analysis-result {
  margin-top: 16px;
}

.result-content {
  white-space: pre-wrap;
  line-height: 1.6;
  color: #262626;
}

.result-content :deep(h1),
.result-content :deep(h2),
.result-content :deep(h3) {
  margin-top: 16px;
  margin-bottom: 8px;
  color: #262626;
}

.result-content :deep(p) {
  margin-bottom: 8px;
}

.result-content :deep(ul),
.result-content :deep(ol) {
  margin-bottom: 8px;
  padding-left: 20px;
}

.result-content :deep(li) {
  margin-bottom: 4px;
}
</style>
