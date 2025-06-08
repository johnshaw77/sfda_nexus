<!--
  通用頭像上傳組件
  支持圖片上傳、裁剪、預覽和移除功能
-->

<template>
  <div class="avatar-upload-container">
    <div
      class="avatar-wrapper"
      @paste="handlePaste"
      @drop="handleDrop"
      @dragover="handleDragOver"
      @dragenter="handleDragEnter"
      @dragleave="handleDragLeave"
      :class="{ 'drag-over': isDragOver }"
      tabindex="0">
      <a-avatar
        :size="size"
        :src="modelValue"
        :icon="!modelValue ? defaultIcon : undefined"
        class="profile-avatar" />

      <!-- 上傳按鈕 -->
      <a-upload
        v-if="editable"
        :show-upload-list="false"
        :before-upload="handleBeforeUpload"
        :custom-request="() => {}"
        :accept="'image/*'"
        :multiple="false"
        class="avatar-upload-trigger">
        <div class="upload-icon">
          <UploadOutlined />
        </div>
      </a-upload>

      <!-- 移除按鈕 -->
      <div
        v-if="editable && modelValue"
        class="remove-icon"
        @click="handleRemoveAvatar">
        <DeleteOutlined />
      </div>
    </div>

    <div
      v-if="showTips"
      class="avatar-tips">
      <a-typography-text
        type="secondary"
        :style="{ fontSize: '12px' }">
        {{ tips }}
      </a-typography-text>
    </div>

    <!-- 裁剪對話框 -->
    <a-modal
      v-model:open="showCropModal"
      title="調整頭像"
      :width="600"
      :maskClosable="false"
      :keyboard="false">
      <div class="cropper-container">
        <Cropper
          ref="cropperRef"
          class="cropper"
          :src="imageUrl"
          :stencil-props="{
            aspectRatio: 1,
          }" />
      </div>
      <template #footer>
        <a-space>
          <a-button @click="showCropModal = false">取消</a-button>
          <a-button
            type="primary"
            :loading="uploadLoading"
            @click="handleCropComplete">
            確定
          </a-button>
        </a-space>
      </template>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, h } from "vue";
import { message } from "ant-design-vue";
import { smartCompressImage, validateImage } from "@/utils/imageCompress";
import { Cropper } from "vue-advanced-cropper";
import "vue-advanced-cropper/dist/style.css";

const props = defineProps({
  modelValue: {
    type: String,
    default: "",
  },
  size: {
    type: Number,
    default: 80,
  },
  editable: {
    type: Boolean,
    default: true,
  },
  defaultIcon: {
    type: [Object, Function],
    default: () => h("span", { class: "anticon anticon-user" }),
  },
  showTips: {
    type: Boolean,
    default: true,
  },
  tips: {
    type: String,
    default:
      "點擊右下角圖標上傳頭像，支持 JPG、PNG 格式，建議尺寸 200x200 像素",
  },
});

const emit = defineEmits(["update:modelValue", "change"]);

const uploadLoading = ref(false);
const showCropModal = ref(false);
const cropperRef = ref(null);
const imageUrl = ref("");
const isDragOver = ref(false);

// 處理文件上傳前的驗證
const handleBeforeUpload = (file) => {
  const validation = validateImage(file);
  if (!validation.valid) {
    message.error(validation.message);
    return false;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    imageUrl.value = e.target.result;
    showCropModal.value = true;
  };
  reader.readAsDataURL(file);

  return false; // 阻止自動上傳
};

// 處理貼上圖片
const handlePaste = (event) => {
  if (!props.editable) return;

  const items = event.clipboardData?.items;
  if (!items) return;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.type.indexOf("image") !== -1) {
      const file = item.getAsFile();
      if (file) {
        handleBeforeUpload(file);
      }
      break;
    }
  }
};

// 完成裁剪
const handleCropComplete = async () => {
  if (!cropperRef.value) return;

  uploadLoading.value = true;
  try {
    const { canvas } = cropperRef.value.getResult();
    if (!canvas) {
      message.error("裁剪失敗，請重試");
      return;
    }

    // 將 canvas 轉換為 blob
    const blob = await new Promise((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.8);
    });

    // 壓縮圖片
    const compressedDataUrl = await smartCompressImage(blob, {
      maxWidth: 200,
      maxHeight: 200,
      quality: 0.8,
    });

    emit("update:modelValue", compressedDataUrl);
    emit("change", compressedDataUrl);

    showCropModal.value = false;
    message.success("頭像上傳成功");
  } catch (error) {
    console.error("頭像上傳失敗:", error);
    message.error("頭像上傳失敗");
  } finally {
    uploadLoading.value = false;
  }
};

// 移除頭像
const handleRemoveAvatar = () => {
  emit("update:modelValue", "");
  emit("change", "");
  message.success("頭像已移除");
};

// 拖放處理
const handleDragOver = (event) => {
  if (!props.editable) return;
  event.preventDefault();
};

const handleDragEnter = (event) => {
  if (!props.editable) return;
  event.preventDefault();
  isDragOver.value = true;
};

const handleDragLeave = (event) => {
  if (!props.editable) return;
  event.preventDefault();
  // 檢查是否真的離開了拖放區域
  const rect = event.currentTarget.getBoundingClientRect();
  const x = event.clientX;
  const y = event.clientY;

  if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
    isDragOver.value = false;
  }
};

const handleDrop = (event) => {
  if (!props.editable) return;
  event.preventDefault();
  isDragOver.value = false;

  const files = event.dataTransfer.files;
  if (files.length > 0) {
    const file = files[0];
    if (file.type.startsWith("image/")) {
      handleBeforeUpload(file);
    } else {
      message.error("請拖放圖片文件");
    }
  }
};
</script>

<style scoped>
.avatar-upload-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.avatar-wrapper {
  position: relative;
  display: inline-block;
  outline: none;
  transition: all 0.3s ease;
}

.avatar-wrapper.drag-over {
  transform: scale(1.05);
  filter: brightness(1.1);
}

.avatar-wrapper.drag-over .profile-avatar {
  border-color: var(--ant-primary-color);
  box-shadow: 0 0 15px rgba(24, 144, 255, 0.3);
}

.profile-avatar {
  border: 2px solid var(--border-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  cursor: pointer;
}

.profile-avatar:hover {
  border-color: var(--ant-primary-color);
  transform: scale(1.02);
}

.avatar-upload-trigger {
  position: absolute;
  bottom: 0;
  right: 0;
  z-index: 2;
}

.upload-icon {
  width: 28px;
  height: 28px;
  background: var(--ant-primary-color);
  border: 2px solid #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.upload-icon:hover {
  background: var(--ant-primary-color-hover);
  transform: scale(1.1);
}

.upload-icon .anticon {
  color: #fff;
  font-size: 12px;
}

.remove-icon {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 20px;
  height: 20px;
  background: #ff4d4f;
  border: 2px solid #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  z-index: 3;
  opacity: 0;
  transform: scale(0.8);
}

.avatar-wrapper:hover .remove-icon {
  opacity: 1;
  transform: scale(1);
}

.remove-icon:hover {
  background: #ff7875;
  transform: scale(1.1) !important;
}

.remove-icon .anticon {
  color: #fff;
  font-size: 10px;
}

.avatar-tips {
  text-align: center;
  max-width: 240px;
}

.cropper-container {
  width: 100%;
  height: 400px;
}

.cropper {
  height: 100%;
  background: #f5f5f5;
}

/* 暗黑模式適配 */
:root[data-theme="dark"] .profile-avatar {
  border-color: #434343;
}

:root[data-theme="dark"] .upload-icon {
  border-color: var(--background-color);
}

:root[data-theme="dark"] .remove-icon {
  border-color: var(--background-color);
}

/* 響應式設計 */
@media (max-width: 768px) {
  .upload-icon {
    width: 24px;
    height: 24px;
  }

  .upload-icon .anticon {
    font-size: 10px;
  }

  .remove-icon {
    width: 18px;
    height: 18px;
    top: -4px;
    right: -4px;
  }

  .remove-icon .anticon {
    font-size: 8px;
  }
}
</style>
