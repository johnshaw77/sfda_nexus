<!--
/**
 * @fileoverview MessageAttachments - 消息附件顯示組件
 * @description 處理和顯示消息中的各種類型附件，包括圖片、文檔、音視頻等文件
 * @component MessageAttachments
 * @author SFDA Nexus Team
 * @since 1.0.0
 * @version 1.0.0
 * 
 * @example
 * <MessageAttachments
 *   :message="message"
 *   @view-attachment="handleViewAttachment"
 * />
 * 
 * @requires @ant-design/icons-vue - UI 圖標組件
 * @requires @/api/files - 文件 API 服務
 * @requires @/assets/icons/* - 自定義文件類型圖標
 * 
 * @typedef {Object} Attachment
 * @property {string} id - 附件唯一標識
 * @property {string} filename - 文件名稱
 * @property {string} name - 文件顯示名稱
 * @property {string} file_type - 文件類型
 * @property {string} mime_type - MIME 類型
 * @property {number} file_size - 文件大小（字節）
 * @property {number} size - 文件大小（備用字段）
 * 
 * 功能特色:
 * - 📎 多種文件類型支援（圖片、文檔、音視頻等）
 * - 🖼️ 圖片縮圖預覽功能
 * - 📄 智能文件圖標顯示
 * - 📊 文件大小格式化顯示
 * - 🎨 響應式卡片布局
 * - 👁️ 點擊預覽功能
 */
-->
<template>
  <div>
    <!-- 圖片附件顯示（僅用戶訊息） -->
    <div
      v-if="message.role === 'user' && imageAttachments.length > 0"
      class="message-attachments">
      <div
        v-for="attachment in imageAttachments"
        :key="attachment.id"
        class="attachment-item"
        @click="$emit('view-attachment', attachment)">
        <div class="attachment-card">
          <div class="attachment-icon-container">
            <div class="attachment-icon image-preview-icon">
              <img
                :src="getImageSrc(attachment.id)"
                :alt="attachment.filename || attachment.name"
                class="image-preview-thumbnail"
                @error="handleImageError" />
              <div class="image-preview-overlay">
                <EyeOutlined class="preview-icon" />
              </div>
            </div>
          </div>
          <a-tooltip
            :title="attachment.filename || attachment.name"
            placement="top">
            <div class="attachment-info">
              <div class="attachment-meta">
                <span class="attachment-size">
                  {{ getFileTypeLabel(attachment) }}
                  {{ formatFileSize(attachment.file_size || attachment.size) }}
                </span>
              </div>
            </div>
          </a-tooltip>
        </div>
      </div>
    </div>

    <!-- 非圖片附件列表或AI消息的所有附件 -->
    <div
      v-if="
        message.attachments &&
        (message.role === 'assistant' || nonImageAttachments.length > 0)
      "
      class="message-attachments">
      <div
        v-for="attachment in message.role === 'assistant'
          ? message.attachments
          : nonImageAttachments"
        :key="attachment.id"
        class="attachment-item"
        @click="$emit('view-attachment', attachment)">
        <div class="attachment-card">
          <div class="attachment-icon-container">
            <!-- 圖片附件顯示預覽縮圖 -->
            <div
              v-if="
                attachment.file_type === 'image' ||
                attachment.mime_type?.startsWith('image/')
              "
              class="attachment-icon image-preview-icon">
              <img
                :src="getImageSrc(attachment.id)"
                :alt="attachment.filename || attachment.name"
                class="image-preview-thumbnail"
                @error="handleImageError" />
              <div class="image-preview-overlay">
                <EyeOutlined class="preview-icon" />
              </div>
            </div>
            <!-- 非圖片附件顯示檔案圖標 -->
            <div
              v-else
              class="attachment-icon">
              <component
                :is="getFileIcon(attachment)"
                :style="{ color: getFileTypeColor(attachment) }" />
            </div>
          </div>
          <a-tooltip
            :title="attachment.filename || attachment.name"
            placement="top">
            <div class="attachment-info">
              <!-- 非圖片附件顯示檔名，圖片附件不顯示檔名 -->
              <div
                v-if="
                  !(
                    attachment.file_type === 'image' ||
                    attachment.mime_type?.startsWith('image/')
                  )
                "
                class="attachment-filename">
                {{ attachment.filename || attachment.name }}
              </div>
              <div class="attachment-meta">
                <span class="attachment-size">
                  {{ getFileTypeLabel(attachment) }}
                  {{ formatFileSize(attachment.file_size || attachment.size) }}
                </span>
              </div>
            </div>
          </a-tooltip>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { EyeOutlined } from '@ant-design/icons-vue';
import { getImageBlobUrl } from '@/api/files';

// 導入自定義檔案圖示組件
import FileWord from '@/assets/icons/FileWord.vue';
import FileCSV from '@/assets/icons/FileCSV.vue';
import FileExcel from '@/assets/icons/FileExcel.vue';
import FilePowerpoint from '@/assets/icons/FilePowerpoint.vue';
import FilePDF from '@/assets/icons/FilePDF.vue';
import {
  TableOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FilePptOutlined,
  PictureOutlined,
  VideoCameraOutlined,
  AudioOutlined,
  FileOutlined,
} from '@ant-design/icons-vue';

/**
 * Props 定義
 * @description 定義組件接收的屬性和其類型約束
 */
const props = defineProps({
  /** @type {Object} 包含附件信息的消息對象 */
  message: {
    type: Object,
    required: true
  }
});

/**
 * Events 定義
 * @description 定義組件可觸發的事件
 * @event view-attachment - 點擊附件時觸發，傳遞附件對象
 */
defineEmits(['view-attachment']);

/**
 * 計算圖片附件
 * @description 從消息附件中篩選出圖片類型的附件
 * @returns {Array<Attachment>} 圖片附件數組
 */
const imageAttachments = computed(() => {
  if (!props.message.attachments) return [];
  return props.message.attachments.filter(
    attachment =>
      attachment.file_type === 'image' ||
      attachment.mime_type?.startsWith('image/')
  );
});

// 計算非圖片附件
const nonImageAttachments = computed(() => {
  if (!props.message.attachments) return [];
  return props.message.attachments.filter(
    attachment =>
      attachment.file_type !== 'image' &&
      !attachment.mime_type?.startsWith('image/')
  );
});

// 獲取圖片源
const getImageSrc = (attachmentId) => {
  return getImageBlobUrl(attachmentId);
};

// 處理圖片錯誤
const handleImageError = (event) => {
  console.warn('Image load error:', event);
  // 可以設置一個默認圖片或隱藏圖片
};

// 獲取檔案圖標
const getFileIcon = (attachment) => {
  const fileType = attachment.file_type || 
    attachment.mime_type?.split('/')[1] || 
    attachment.filename?.split('.').pop()?.toLowerCase();
    
  switch (fileType) {
    case 'csv': return FileCSV;
    case 'xlsx':
    case 'xls':
    case 'excel': return FileExcel;
    case 'docx':
    case 'doc':
    case 'word': return FileWord;
    case 'pptx':
    case 'ppt':
    case 'powerpoint': return FilePowerpoint;
    case 'pdf': return FilePDF;
    case 'image':
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg': return PictureOutlined;
    case 'video':
    case 'mp4':
    case 'avi':
    case 'mov': return VideoCameraOutlined;
    case 'audio':
    case 'mp3':
    case 'wav':
    case 'flac': return AudioOutlined;
    default: return FileOutlined;
  }
};

// 獲取檔案類型顏色
const getFileTypeColor = (attachment) => {
  const fileType = attachment.file_type || 
    attachment.mime_type?.split('/')[1] || 
    attachment.filename?.split('.').pop()?.toLowerCase();
    
  const colorMap = {
    'csv': '#52c41a',
    'xlsx': '#1890ff',
    'xls': '#1890ff',
    'excel': '#1890ff', 
    'docx': '#1890ff',
    'doc': '#1890ff',
    'word': '#1890ff',
    'pptx': '#fa8c16',
    'ppt': '#fa8c16',
    'powerpoint': '#fa8c16',
    'pdf': '#f5222d',
    'image': '#722ed1',
    'video': '#eb2f96',
    'audio': '#13c2c2'
  };
  
  return colorMap[fileType] || '#666';
};

// 獲取檔案類型標籤
const getFileTypeLabel = (attachment) => {
  const fileType = attachment.file_type || 
    attachment.mime_type?.split('/')[1] || 
    attachment.filename?.split('.').pop()?.toLowerCase();
    
  const labelMap = {
    'csv': 'CSV',
    'xlsx': 'Excel',
    'xls': 'Excel',
    'excel': 'Excel',
    'docx': 'Word',
    'doc': 'Word', 
    'word': 'Word',
    'pptx': 'PowerPoint',
    'ppt': 'PowerPoint',
    'powerpoint': 'PowerPoint',
    'pdf': 'PDF',
    'image': '圖片',
    'png': '圖片',
    'jpg': '圖片',
    'jpeg': '圖片',
    'gif': '圖片',
    'svg': '圖片',
    'video': '視頻',
    'audio': '音頻'
  };
  
  return labelMap[fileType] || '檔案';
};

// 格式化檔案大小
const formatFileSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};
</script>

<style scoped>
.message-attachments {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 8px 0;
}

.attachment-item {
  cursor: pointer;
  transition: transform 0.2s ease;
}

.attachment-item:hover {
  transform: translateY(-2px);
}

.attachment-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: var(--custom-bg-secondary);
  border: 1px solid var(--custom-border-primary);
  border-radius: 8px;
  min-width: 120px;
  max-width: 200px;
  transition: all 0.2s ease;
}

.attachment-card:hover {
  background: var(--color-bg-elevated);
  border-color: var(--ant-color-primary);
}

.attachment-icon-container {
  flex-shrink: 0;
}

.attachment-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  font-size: 24px;
  background-color: var(--color-bg-elevated);
  border-radius: 8px;
  transition: all 0.3s ease;
}

.image-preview-icon {
  padding: 0;
  overflow: hidden;
  position: relative;
}

.image-preview-thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 8px;
}

.image-preview-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;
  border-radius: 8px;
}

.attachment-item:hover .image-preview-overlay {
  opacity: 1;
}

.preview-icon {
  color: white;
  font-size: 20px;
}

.attachment-info {
  flex: 1;
  min-width: 0;
}

.attachment-filename {
  font-size: 13px;
  font-weight: 500;
  color: var(--custom-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 2px;
}

.attachment-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.attachment-size {
  font-size: 11px;
  color: var(--custom-text-tertiary);
}

/* 暗黑模式適配 */
:root[data-theme="dark"] .attachment-card {
  border-color: var(--custom-border-secondary);
}

:root[data-theme="dark"] .attachment-card:hover {
  background: var(--custom-bg-tertiary);
  border-color: var(--ant-color-primary);
}

:root[data-theme="dark"] .attachment-icon {
  background-color: var(--custom-bg-tertiary);
}
</style>