<template>
  <div class="file-actions">
    <!-- 圖片的解釋按鈕 -->
    <template v-if="file.preview && isImageFile(file)">
      <a-button
        type="text"
        size="small"
        @click="handleAction('explain-image')"
        class="action-btn">
        <EyeOutlined />
        解釋此圖
      </a-button>
    </template>

    <!-- 文檔檔案的快速命令 -->
    <template v-else>
      <!-- PDF 檔案專用建議詞 -->
      <template v-if="isPdfFile(file)">
        <a-button
          type="text"
          size="small"
          @click="handleAction('extract-pdf-text')"
          class="action-btn">
          <FileTextOutlined />
          提取文字
        </a-button>
        <a-button
          type="text"
          size="small"
          @click="handleAction('summarize-pdf')"
          class="action-btn">
          <ReadOutlined />
          文件摘要
        </a-button>
      </template>

      <!-- Word 檔案專用建議詞 -->
      <template v-else-if="isWordFile(file)">
        <a-button
          type="text"
          size="small"
          @click="handleAction('analyze-document')"
          class="action-btn">
          <EditOutlined />
          文檔分析
        </a-button>
        <a-button
          type="text"
          size="small"
          @click="handleAction('format-document')"
          class="action-btn">
          <AlignLeftOutlined />
          格式整理
        </a-button>
      </template>

      <!-- CSV 檔案專用建議詞 -->
      <template v-else-if="isCsvFile(file)">
        <a-button
          type="text"
          size="small"
          @click="handleAction('analyze-csv-data')"
          class="action-btn">
          <BarChartOutlined />
          數據分析
        </a-button>
        <a-button
          type="text"
          size="small"
          @click="handleAction('generate-chart')"
          class="action-btn">
          <LineChartOutlined />
          生成圖表
        </a-button>
      </template>

      <!-- Excel 檔案專用建議詞 -->
      <template v-else-if="isExcelFile(file)">
        <a-button
          type="text"
          size="small"
          @click="handleAction('analyze-excel-data')"
          class="action-btn">
          <TableOutlined />
          數據分析
        </a-button>
        <a-button
          type="text"
          size="small"
          @click="handleAction('generate-excel-chart')"
          class="action-btn">
          <PieChartOutlined />
          生成圖表
        </a-button>
        <a-button
          type="text"
          size="small"
          @click="handleAction('summarize-excel-sheets')"
          class="action-btn">
          <FileSearchOutlined />
          工作表摘要
        </a-button>
      </template>

      <!-- PowerPoint 檔案專用建議詞 -->
      <template v-else-if="isPowerpointFile(file)">
        <a-button
          type="text"
          size="small"
          @click="handleAction('analyze-powerpoint')"
          class="action-btn">
          <PresentationChartLineOutlined />
          簡報分析
        </a-button>
        <a-button
          type="text"
          size="small"
          @click="handleAction('extract-slide-content')"
          class="action-btn">
          <FileImageOutlined />
          提取內容
        </a-button>
        <a-button
          type="text"
          size="small"
          @click="handleAction('optimize-presentation')"
          class="action-btn">
          <BulbOutlined />
          優化建議
        </a-button>
      </template>

      <!-- 文字檔案專用建議詞 -->
      <template v-else-if="isTextFile(file)">
        <a-button
          type="text"
          size="small"
          @click="handleAction('analyze-text')"
          class="action-btn">
          <FileTextOutlined />
          文本分析
        </a-button>
        <a-button
          type="text"
          size="small"
          @click="handleAction('summarize-text')"
          class="action-btn">
          <ReadOutlined />
          內容摘要
        </a-button>
      </template>

      <!-- JSON 檔案專用建議詞 -->
      <template v-else-if="isJsonFile(file)">
        <a-button
          type="text"
          size="small"
          @click="handleAction('parse-json')"
          class="action-btn">
          <CodeOutlined />
          解析結構
        </a-button>
        <a-button
          type="text"
          size="small"
          @click="handleAction('validate-json')"
          class="action-btn">
          <CheckCircleOutlined />
          驗證格式
        </a-button>
      </template>

      <!-- XML 檔案專用建議詞 -->
      <template v-else-if="isXmlFile(file)">
        <a-button
          type="text"
          size="small"
          @click="handleAction('parse-xml')"
          class="action-btn">
          <CodeOutlined />
          解析結構
        </a-button>
        <a-button
          type="text"
          size="small"
          @click="handleAction('transform-xml')"
          class="action-btn">
          <SwapOutlined />
          格式轉換
        </a-button>
      </template>

      <!-- 程式碼檔案專用建議詞 -->
      <template v-else-if="isCodeFile(file)">
        <a-button
          type="text"
          size="small"
          @click="handleAction('review-code')"
          class="action-btn">
          <BugOutlined />
          代碼審查
        </a-button>
        <a-button
          type="text"
          size="small"
          @click="handleAction('explain-code')"
          class="action-btn">
          <QuestionCircleOutlined />
          代碼解釋
        </a-button>
        <a-button
          type="text"
          size="small"
          @click="handleAction('optimize-code')"
          class="action-btn">
          <ThunderboltOutlined />
          優化建議
        </a-button>
      </template>

      <!-- 通用文檔建議詞 -->
      <template v-else>
        <a-button
          type="text"
          size="small"
          @click="handleAction('summarize-file')"
          class="action-btn">
          <FileTextOutlined />
          關鍵要點
        </a-button>
        <a-button
          type="text"
          size="small"
          @click="handleAction('generate-document')"
          class="action-btn">
          <EditOutlined />
          生成文件
        </a-button>
      </template>
    </template>
  </div>
</template>

<script setup>
import { useFileType } from '@/composables/useFileType';

// Props
const props = defineProps({
  file: {
    type: Object,
    required: true
  }
});

// Emits
const emit = defineEmits(['action']);

// Composables
const {
  isImageFile,
  isPdfFile,
  isWordFile,
  isCsvFile,
  isExcelFile,
  isPowerpointFile,
  isTextFile,
  isJsonFile,
  isXmlFile,
  isCodeFile
} = useFileType();

/**
 * 處理操作點擊
 */
const handleAction = (actionType) => {
  emit('action', actionType, props.file);
};
</script>

<style scoped>
/* 檔案快速命令按鈕樣式（放在卡片下方） */
.file-actions {
  display: flex;
  justify-content: center;
  gap: 4px;
  flex-wrap: wrap;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 2px;
  color: var(--custom-text-primary) !important;
  font-size: 11px;
  height: 24px;
  padding: 0 4px;
  border-radius: 6px;
  border: 1px solid var(--custom-border-primary) !important;
  background: var(--custom-bg-secondary) !important;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.action-btn:hover {
  background: var(--custom-bg-quaternary) !important;
  transform: scale(1.02);
}
</style> 