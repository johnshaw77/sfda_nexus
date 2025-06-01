<!--
  個人資料表單組件
  包含用戶基本信息編輯和頭像上傳功能
-->

<template>
  <a-form
    ref="formRef"
    :model="formData"
    :rules="formRules"
    :label-col="{ span: 6 }"
    :wrapper-col="{ span: 18 }"
    @finish="handleSubmit">
    <!-- 頭像上傳 -->
    <a-form-item label="頭像">
      <div class="avatar-upload-section">
        <div class="avatar-preview">
          <a-avatar
            :size="80"
            :src="formData.avatar"
            :icon="!formData.avatar ? h(UserOutlined) : undefined"
            class="profile-avatar" />
        </div>

        <div class="avatar-upload-controls">
          <a-button
            size="small"
            :loading="uploadLoading"
            @click="$refs.fileInput.click()">
            <UploadOutlined />
            上傳頭像
          </a-button>

          <a-button
            v-if="formData.avatar"
            type="text"
            size="small"
            danger
            @click="handleRemoveAvatar">
            <DeleteOutlined />
            移除
          </a-button>
        </div>
      </div>

      <div class="avatar-tips">
        <a-typography-text
          type="secondary"
          :style="{ fontSize: '12px' }">
          支持 JPG、PNG 格式，建議尺寸 200x200 像素，文件大小不超過 2MB
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

      <!-- 隱藏的文件輸入框 -->
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        style="display: none"
        @change="handleFileSelect" />
    </a-form-item>

    <a-form-item
      label="用戶名"
      name="username">
      <a-input
        v-model:value="formData.username"
        disabled />
    </a-form-item>

    <a-form-item
      label="電子郵件"
      name="email">
      <a-input
        v-model:value="formData.email"
        disabled />
    </a-form-item>

    <a-form-item
      label="顯示名稱"
      name="displayName">
      <a-input v-model:value="formData.displayName" />
    </a-form-item>

    <a-form-item
      label="手機號碼"
      name="phone">
      <a-input v-model:value="formData.phone" />
    </a-form-item>

    <a-form-item
      label="部門"
      name="department">
      <a-input v-model:value="formData.department" />
    </a-form-item>

    <a-form-item
      label="職位"
      name="position">
      <a-input v-model:value="formData.position" />
    </a-form-item>

    <a-form-item
      label="個人簡介"
      name="bio">
      <a-textarea
        v-model:value="formData.bio"
        :rows="4" />
    </a-form-item>

    <a-form-item :wrapper-col="{ offset: 6, span: 18 }">
      <a-space>
        <a-button
          type="primary"
          html-type="submit"
          :loading="loading">
          更新資料
        </a-button>

        <a-button @click="handleReset"> 重置 </a-button>
      </a-space>
    </a-form-item>
  </a-form>
</template>

<script setup>
import { ref, reactive, h, onMounted, watch, nextTick } from "vue";
import { message } from "ant-design-vue";
import {
  UserOutlined,
  UploadOutlined,
  DeleteOutlined,
} from "@ant-design/icons-vue";
import { useAuthStore } from "@/stores/auth";
import { smartCompressImage, validateImage } from "@/utils/imageCompress";
import { Cropper } from "vue-advanced-cropper";
import "vue-advanced-cropper/dist/style.css";

const props = defineProps({
  user: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits(["update-success"]);

const authStore = useAuthStore();
const formRef = ref();
const loading = ref(false);
const uploadLoading = ref(false);
const showCropModal = ref(false);
const cropperRef = ref(null);
const imageUrl = ref("");

// 表單數據
const formData = reactive({
  username: "",
  email: "",
  displayName: "",
  phone: "",
  department: "",
  position: "",
  bio: "",
  avatar: "",
});

// 表單驗證規則
const formRules = {
  displayName: [
    { required: true, message: "請輸入顯示名稱", trigger: "blur" },
    { min: 2, max: 50, message: "顯示名稱長度為2-50個字符", trigger: "blur" },
  ],
  phone: [
    {
      pattern: /^1[3-9]\d{9}$/,
      message: "請輸入正確的手機號碼",
      trigger: "blur",
    },
  ],
};

// 初始化表單數據
const initFormData = () => {
  const user = props.user || authStore.user;
  console.log("initFormData 被調用，用戶數據:", user);

  if (user && Object.keys(user).length > 0) {
    const newData = {
      username: user.username || "",
      email: user.email || "",
      displayName: user.display_name || user.displayName || "",
      phone: user.phone || "",
      department: user.department || "",
      position: user.position || "",
      bio: user.bio || "",
      avatar: user.avatar || "",
    };

    console.log("設置新的表單數據:", newData);
    Object.assign(formData, newData);
    console.log("formData 更新後:", formData);
  } else {
    console.log("用戶數據為空，跳過初始化");
  }
};

// 處理文件選擇
const handleFileSelect = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  // 驗證文件
  const validation = validateImage(file, {
    maxSize: 5 * 1024 * 1024,
    allowedTypes: ["image/jpeg", "image/png", "image/webp"],
  });

  if (!validation.valid) {
    message.error(validation.error);
    return;
  }

  // 讀取文件並顯示裁剪框
  const reader = new FileReader();
  reader.onload = () => {
    imageUrl.value = reader.result;
    showCropModal.value = true;
  };
  reader.readAsDataURL(file);
};

// 處理裁剪完成
const handleCropComplete = async () => {
  try {
    uploadLoading.value = true;
    const { canvas } = cropperRef.value.getResult();

    // 將 canvas 轉換為 Blob
    canvas.toBlob(
      async (blob) => {
        try {
          // 使用智能壓縮
          const compressedBase64 = await smartCompressImage(blob, {
            targetSize: 50 * 1024,
            maxWidth: 300,
            maxHeight: 300,
          });

          formData.avatar = compressedBase64;
          showCropModal.value = false;
          message.success("頭像處理成功！");
        } catch (error) {
          console.error("頭像處理失敗:", error);
          message.error("頭像處理失敗: " + error.message);
        } finally {
          uploadLoading.value = false;
        }
      },
      "image/jpeg",
      0.9
    );
  } catch (error) {
    console.error("裁剪失敗:", error);
    message.error("裁剪失敗");
    uploadLoading.value = false;
  }
};

// 移除頭像
const handleRemoveAvatar = () => {
  formData.avatar = "";
};

// 提交表單
const handleSubmit = async (values) => {
  loading.value = true;

  try {
    const updateData = {
      display_name: values.displayName,
      phone: values.phone,
      department: values.department,
      position: values.position,
      bio: values.bio,
    };

    // 如果有新頭像，添加到更新數據中
    if (formData.avatar) {
      updateData.avatar = formData.avatar;
      console.log("準備更新頭像，大小:", formData.avatar.length);
    }

    console.log("發送更新請求:", updateData);
    const result = await authStore.handleUpdateProfile(updateData);
    console.log("更新結果:", result);

    if (result.success) {
      console.log("更新成功，新用戶數據:", result.user);

      // 更新成功後，同步頭像數據
      if (formData.avatar) {
        formData.avatar = formData.avatar;
        console.log("同步頭像到 formData.avatar");
      }

      // 重新初始化數據以確保所有字段都是最新的
      await nextTick(); // 等待響應式更新完成
      initFormData();

      console.log("最終 formData.avatar:", formData.avatar);
      console.log("最終 authStore.user.avatar:", authStore.user?.avatar);

      emit("update-success", result.user);
    }
  } catch (error) {
    console.error("更新資料失敗:", error);
  } finally {
    loading.value = false;
  }
};

// 重置表單
const handleReset = () => {
  initFormData();
  formRef.value?.clearValidate();
};

// 監聽 authStore.user 變化
watch(
  () => authStore.user,
  (newUser) => {
    console.log("authStore.user 更新:", newUser);
    if (newUser) {
      initFormData();
    }
  },
  { deep: true }
);

// 監聽 props.user 變化
watch(
  () => props.user,
  (newUser) => {
    console.log("props.user 更新:", newUser);
    if (newUser) {
      initFormData();
    }
  },
  { deep: true }
);

onMounted(() => {
  initFormData();
});
</script>

<style scoped>
.avatar-upload-section {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  transition: all 0.3s ease;
}

.avatar-upload-section:hover {
  border-color: #1890ff;
  background: #f0f8ff;
}

.avatar-preview {
  flex-shrink: 0;
}

.profile-avatar {
  border: 2px solid #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.avatar-upload-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.avatar-tips {
  margin-top: 8px;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .avatar-upload-section {
    flex-direction: column;
    text-align: center;
  }

  .avatar-upload-controls {
    flex-direction: row;
    justify-content: center;
  }
}

.hidden-input {
  display: none;
}

.upload-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.cropper-container {
  width: 100%;
  height: 400px;
}

.cropper {
  height: 100%;
  background: #f5f5f5;
}
</style>
