<template>
  <div class="file-preview">
    <!-- 圖片預覽 -->
    <div
      v-if="isImage"
      class="image-preview"
      @click="handlePreview">
      <img
        :src="previewUrl"
        :alt="file.filename"
        class="preview-image" />
      <div class="image-overlay">
        <EyeOutlined class="preview-icon" />
      </div>
    </div>

    <!-- 檔案信息卡片 -->
    <div
      v-else
      class="file-card"
      @click="handleDownload">
      <div class="file-icon">
        <component
          :is="fileIconComponent"
          class="icon" />
      </div>
      <div class="file-info">
        <div class="file-name">{{ file.filename }}</div>
        <div class="file-meta">
          <span class="file-size">{{ formatFileSize(file.file_size) }}</span>
          <span class="file-type">{{ getFileTypeText(file.mime_type) }}</span>
        </div>
      </div>
      <div class="file-actions">
        <a-button
          type="text"
          size="small"
          @click.stop="handleDownload">
          <DownloadOutlined />
        </a-button>
      </div>
    </div>

    <!-- 圖片預覽模態框 -->
    <a-modal
      v-model:open="previewVisible"
      :title="file.filename"
      :footer="null"
      :width="800"
      centered>
      <div class="image-modal-content">
        <img
          :src="previewUrl"
          :alt="file.filename"
          class="modal-image" />
      </div>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { message } from "ant-design-vue";
import {
  EyeOutlined,
  DownloadOutlined,
  FileOutlined,
  FileImageOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FilePptOutlined,
  FileTextOutlined,
  FileZipOutlined,
  SoundOutlined,
  VideoCameraOutlined,
} from "@ant-design/icons-vue";
import {
  downloadFile,
  getFilePreviewUrl,
  formatFileSize,
  isImageFile,
} from "@/api/files.js";

const props = defineProps({
  file: {
    type: Object,
    required: true,
  },
  showActions: {
    type: Boolean,
    default: true,
  },
});

const previewVisible = ref(false);

// 計算屬性
const isImage = computed(() => isImageFile(props.file.mime_type));

const previewUrl = computed(() => {
  if (isImage.value) {
    return getFilePreviewUrl(props.file.id);
  }
  return null;
});

const fileIconComponent = computed(() => {
  const mimeType = props.file.mime_type;

  if (isImageFile(mimeType)) {
    return FileImageOutlined;
  }

  if (mimeType === "application/pdf") {
    return FilePdfOutlined;
  }

  if (mimeType.includes("word") || mimeType.includes("document")) {
    return FileWordOutlined;
  }

  if (mimeType.includes("excel") || mimeType.includes("sheet")) {
    return FileExcelOutlined;
  }

  if (mimeType.includes("powerpoint") || mimeType.includes("presentation")) {
    return FilePptOutlined;
  }

  if (mimeType.startsWith("text/")) {
    return FileTextOutlined;
  }

  if (mimeType.startsWith("audio/")) {
    return SoundOutlined;
  }

  if (mimeType.startsWith("video/")) {
    return VideoCameraOutlined;
  }

  if (
    mimeType.includes("zip") ||
    mimeType.includes("rar") ||
    mimeType.includes("7z")
  ) {
    return FileZipOutlined;
  }

  return FileOutlined;
});

// 方法
const getFileTypeText = (mimeType) => {
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType.includes("word")) return "Word";
  if (mimeType.includes("excel")) return "Excel";
  if (mimeType.includes("powerpoint")) return "PowerPoint";
  if (mimeType.startsWith("image/")) return "圖片";
  if (mimeType.startsWith("text/")) return "文本";
  if (mimeType.startsWith("audio/")) return "音頻";
  if (mimeType.startsWith("video/")) return "視頻";
  if (mimeType.includes("zip")) return "壓縮檔";
  return "檔案";
};

const handlePreview = () => {
  if (isImage.value) {
    previewVisible.value = true;
  }
};

const handleDownload = async () => {
  try {
    await downloadFile(props.file.id, props.file.filename);
    message.success("檔案下載成功");
  } catch (error) {
    console.error("下載檔案失敗:", error);
    message.error("下載檔案失敗");
  }
};
</script>

<style scoped>
.file-preview {
  max-width: 300px;
  margin: 8px 0;
}

/* 圖片預覽樣式 */
.image-preview {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.image-preview:hover {
  transform: scale(1.02);
}

.preview-image {
  width: 100%;
  height: auto;
  max-height: 200px;
  object-fit: cover;
  display: block;
}

.image-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.image-preview:hover .image-overlay {
  opacity: 1;
}

.preview-icon {
  color: white;
  font-size: 24px;
}

/* 檔案卡片樣式 */
.file-card {
  display: flex;
  align-items: center;
  padding: 12px;
  border: 1px solid var(--custom-border-color);
  border-radius: 8px;
  background: var(--custom-bg-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.file-card:hover {
  border-color: var(--custom-primary-color);
  background: var(--custom-bg-hover);
}

.file-icon {
  margin-right: 12px;
  color: var(--custom-primary-color);
}

.file-icon .icon {
  font-size: 24px;
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-weight: 500;
  color: var(--custom-text-primary);
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-meta {
  display: flex;
  gap: 8px;
  font-size: 12px;
  color: var(--custom-text-secondary);
}

.file-actions {
  margin-left: 8px;
}

/* 模態框樣式 */
.image-modal-content {
  text-align: center;
}

.modal-image {
  max-width: 100%;
  max-height: 70vh;
  object-fit: contain;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .file-preview {
    max-width: 100%;
  }

  .file-card {
    padding: 10px;
  }

  .file-icon .icon {
    font-size: 20px;
  }
}
</style>
