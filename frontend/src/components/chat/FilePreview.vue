<template>
  <div
    v-if="previewFiles.length > 0"
    class="preview-files-container">
    <div class="preview-files-list">
      <div
        v-for="file in previewFiles"
        :key="file.id"
        class="preview-file-wrapper">
        <!-- 預覽卡片 -->
        <div class="preview-file-item">
          <!-- 移除按鈕（放在卡片右上角） -->
          <a-button
            type="text"
            size="small"
            @click.stop="$emit('remove-file', file.id)"
            class="card-remove-btn">
            <CloseOutlined />
          </a-button>

          <!-- 檔案縮圖 -->
          <div
            class="file-thumbnail"
            :class="{
              clickable: file.preview && isImageFile(file),
            }"
            @click="handlePreviewImage(file)">
            <!-- 圖片檔案顯示預覽 -->
            <div v-if="file.preview" class="image-preview-container">
              <img
                :src="file.preview"
                :alt="file.filename"
                class="thumbnail-image" />
              <!-- 放大鏡圖示（僅圖片顯示） -->
              <div
                v-if="file.preview && isImageFile(file)"
                class="zoom-icon">
                <ZoomIn :size="8" />
              </div>
            </div>
            <!-- 非圖片檔案顯示圖示 -->
            <div
              v-else
              class="file-icon-container">
              <div class="thumbnail-icon">
                <!-- PDF 檔案 -->
                <FilePDF v-if="isPdfFile(file)" />
                <!-- Word 檔案 -->
                <FileWord v-else-if="isWordFile(file)" />
                <!-- CSV 檔案 -->
                <FileCSV v-else-if="isCsvFile(file)" />
                <!-- Excel 檔案 -->
                <FileExcel v-else-if="isExcelFile(file)" />
                <!-- PowerPoint 檔案 -->
                <FilePowerpoint v-else-if="isPowerpointFile(file)" />
                <!-- 預設檔案圖示 -->
                <FileOutlined v-else />
              </div>
              <!-- 檔案名稱 -->
              <div class="file-name-label">
                {{ file.filename }}
              </div>
            </div>
          </div>
        </div>

        <!-- 快速命令按鈕 -->
        <FileActions 
          :file="file" 
          @action="handleFileAction" />
      </div>
    </div>

    <!-- 圖片預覽模態框 -->
    <a-modal
      v-model:open="imagePreviewVisible"
      :title="null"
      :footer="null"
      width="30%"
      centered
      class="image-preview-modal">
      <div
        v-if="currentPreviewImage"
        class="image-preview-content">
        <img
          :src="currentPreviewImage.url"
          :alt="currentPreviewImage.filename"
          class="preview-image" />
      </div>
    </a-modal>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { ZoomIn } from 'lucide-vue-next';
import FileWord from '@/assets/icons/FileWord.vue';
import FileCSV from '@/assets/icons/FileCSV.vue';
import FileExcel from '@/assets/icons/FileExcel.vue';
import FilePowerpoint from '@/assets/icons/FilePowerpoint.vue';
import FilePDF from '@/assets/icons/FilePDF.vue';
import FileActions from './FileActions.vue';
import { useFileType } from '@/composables/useFileType';

// Props
const props = defineProps({
  previewFiles: {
    type: Array,
    default: () => []
  }
});

// Emits
const emit = defineEmits(['remove-file', 'file-action']);

// Composables
const {
  isImageFile,
  isPdfFile,
  isWordFile,
  isCsvFile,
  isExcelFile,
  isPowerpointFile
} = useFileType();

// 響應式狀態
const imagePreviewVisible = ref(false);
const currentPreviewImage = ref(null);

/**
 * 處理圖片預覽
 */
const handlePreviewImage = (file) => {
  if (file.preview && isImageFile(file)) {
    currentPreviewImage.value = {
      url: file.preview,
      filename: file.filename,
      fileSize: file.fileSize,
    };
    imagePreviewVisible.value = true;
  }
};

/**
 * 處理檔案操作
 */
const handleFileAction = (action, file) => {
  emit('file-action', action, file);
};
</script>

<style scoped>
/* 預覽檔案容器樣式 */
.preview-files-container {
  padding: 6px;
  border: 1px solid var(--custom-border-primary);
  border-bottom: none;
  border-radius: 8px 8px 0 0;
  background: var(--custom-bg-secondary);
  min-height: 48px;
  max-height: 110px;
  overflow-y: auto;
}

.preview-files-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  min-height: 40px;
}

.preview-file-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.preview-file-item {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0px;
  background: var(--custom-bg-tertiary);
  border: 1px solid var(--custom-border-primary);
  border-radius: 8px;
  max-width: 80px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.preview-file-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transform: translateY(-1px);
}

.file-thumbnail {
  position: relative;
  width: 80px;
  min-height: 60px;
  border-radius: 8px;
  overflow: visible;
  background: var(--custom-bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  border: 1px solid var(--custom-border-primary);
}

.file-thumbnail.clickable {
  cursor: pointer;
}

.file-thumbnail.clickable:hover {
  transform: scale(1.02);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.image-preview-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.thumbnail-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.file-icon-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 4px;
}

.thumbnail-icon {
  color: var(--custom-text-secondary);
  font-size: 24px;
}

.file-name-label {
  font-size: 10px;
  color: var(--custom-text-secondary);
  text-align: center;
  max-width: 70px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.2;
  margin-top: 2px;
}

/* 卡片右上角的移除按鈕 */
.card-remove-btn {
  position: absolute;
  top: -5px;
  right: -5px;
  width: 20px !important;
  height: 20px !important;
  padding: 0 !important;
  background: var(--error-color) !important;
  border: 0px solid var(--primary-color) !important;
  border-radius: 50%;
  color: white !important;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all 0.2s ease;
  z-index: 10;
}

.card-remove-btn:hover {
  opacity: 1 !important;
  background: var(--primary-color) !important;
  transform: scale(1.1);
  box-shadow: 0 2px 6px rgba(24, 144, 255, 0.3);
}

.preview-file-item:hover .card-remove-btn {
  opacity: 1;
}

.zoom-icon {
  position: absolute;
  bottom: -2px;
  right: 1px;
  width: 16px;
  height: 16px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.file-thumbnail.clickable:hover .zoom-icon {
  opacity: 1;
}

/* 圖片預覽 Modal 樣式 */
.image-preview-modal .ant-modal-body {
  padding: 0;
}

.image-preview-modal .ant-modal-header {
  display: none;
}

.image-preview-content {
  display: flex;
  justify-content: center;
  align-items: center;
}

.preview-image {
  max-width: 100%;
  max-height: 80vh;
  object-fit: contain;
  border-radius: 8px;
}
</style> 