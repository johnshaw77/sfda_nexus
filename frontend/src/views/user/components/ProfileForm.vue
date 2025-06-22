<!--
  個人資料表單組件
  包含用戶基本信息編輯和頭像上傳功能
-->

<template>
  <a-form
    ref="formRef"
    :model="formData"
    :rules="formRules"
    :label-col="{
      xs: { span: 24 },
      sm: { span: 6 },
      md: { span: 6 },
      lg: { span: 6 },
      xl: { span: 6 },
    }"
    :wrapper-col="{
      xs: { span: 24 },
      sm: { span: 18 },
      md: { span: 18 },
      lg: { span: 18 },
      xl: { span: 18 },
    }"
    class="profile-form"
    @finish="handleSubmit">
    <!-- 頭像上傳 -->
    <a-form-item label="">
      <div
        class="avatar-upload-container"
        style="margin-left: 50%; width: 250px; text-align: center">
        <div
          class="avatar-wrapper"
          @paste="handlePaste"
          tabindex="0">
          <a-avatar
            :size="avatarSize"
            :src="formData.avatar"
            :icon="!formData.avatar ? h(UserOutlined) : undefined"
            class="profile-avatar" />

          <!-- 上傳按鈕 -->
          <a-upload
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
            v-if="formData.avatar"
            class="remove-icon"
            @click="handleRemoveAvatar">
            <DeleteOutlined />
          </div>
        </div>

        <div class="avatar-tips">
          <a-typography-text
            type="secondary"
            :style="{ fontSize: '12px' }">
            點擊右下角圖標上傳頭像，支持 JPG、PNG 格式，建議尺寸 200x200 像素
          </a-typography-text>
        </div>
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

    <a-form-item
      :wrapper-col="{
        xs: { span: 24, offset: 0 },
        sm: { span: 18, offset: 6 },
        md: { span: 18, offset: 6 },
        lg: { span: 18, offset: 6 },
        xl: { span: 18, offset: 6 },
      }"
      style="text-align: center">
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
import { ref, reactive, h, onMounted, watch, nextTick, computed } from "vue";
import { message } from "ant-design-vue";
// Icons are globally registered in main.js
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

// 響應式頭像尺寸
const avatarSize = computed(() => {
  // 使用媒體查詢檢測螢幕寬度
  if (typeof window !== "undefined") {
    return window.innerWidth <= 767 ? 80 : 100;
  }
  return 100;
});

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
      validator: (rule, value) => {
        if (!value) return Promise.resolve(); // 手機號碼不是必填的

        // 移除所有空格、破折號、括號等常見分隔符
        const cleanPhone = value.replace(/[\s\-\(\)\+]/g, "");

        // 支援多種手機號碼格式
        const patterns = [
          /^09\d{8}$/, // 台灣手機 (09開頭，共10位)
          /^1[3-9]\d{9}$/, // 11位數字，中國大陸
          /^[6-9]\d{7}$/, // 香港手機 (8位數字)
          /^(\+886|886)?9\d{8}$/, // 台灣國際格式 (+886912345678)
          /^(\+86|86)?1[3-9]\d{9}$/, // 中國國際格式
          /^(\+1|1)?[2-9]\d{9}$/, // 美國手機號碼 (不以0或1開頭的10位數字)
        ];

        const isValid = patterns.some((pattern) => pattern.test(cleanPhone));

        if (!isValid) {
          return Promise.reject(new Error("請輸入正確的手機號碼格式"));
        }

        return Promise.resolve();
      },
      trigger: "blur",
    },
  ],
  bio: [{ max: 500, message: "個人簡介不能超過500個字符", trigger: "blur" }],
};

// 初始化表單數據
const initFormData = () => {
  const user = props.user || authStore.user;

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

    Object.assign(formData, newData);
  } else {
    console.log("用戶數據為空，跳過初始化");
  }
};

// 處理貼上事件
const handlePaste = async (e) => {
  const items = (e.clipboardData || e.originalEvent.clipboardData).items;
  let blob = null;

  for (const item of items) {
    if (item.type.indexOf("image") === 0) {
      blob = item.getAsFile();
      break;
    }
  }

  if (blob) {
    const validation = validateImage(blob, {
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
    reader.readAsDataURL(blob);
  }
};

// 處理上傳前的驗證
const handleBeforeUpload = (file) => {
  const validation = validateImage(file, {
    maxSize: 5 * 1024 * 1024,
    allowedTypes: ["image/jpeg", "image/png", "image/webp"],
  });

  if (!validation.valid) {
    message.error(validation.error);
    return false;
  }

  // 讀取文件並顯示裁剪框
  const reader = new FileReader();
  reader.onload = () => {
    imageUrl.value = reader.result;
    showCropModal.value = true;
  };
  reader.readAsDataURL(file);

  return false; // 阻止自動上傳
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
    }

    const result = await authStore.handleUpdateProfile(updateData);

    if (result.success) {
      // 更新成功後，同步頭像數據
      if (formData.avatar) {
        formData.avatar = formData.avatar;
      }

      // 重新初始化數據以確保所有字段都是最新的
      await nextTick(); // 等待響應式更新完成
      initFormData();

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
    // console.log("authStore.user 更新:", newUser);
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
    // console.log("props.user 更新:", newUser);
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
.profile-form {
  max-width: 600px;
  margin: 0 auto;
  padding: 0 24px;
}

.avatar-upload-container {
  display: flex;
  flex-direction: column;
  align-items: center;

  gap: 16px;
}

.avatar-wrapper {
  position: relative;
  display: inline-block;
  outline: none;
}

/* 響應式頭像樣式 */
.profile-avatar {
  --avatar-size: 100px;
  --upload-icon-size: 32px;
  --remove-icon-size: 24px;
  border: 3px solid var(--border-color);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
  cursor: pointer;
}

.profile-avatar:hover {
  border-color: var(--ant-primary-color);
  transform: scale(1.05);
}

.avatar-upload-trigger {
  position: absolute;
  bottom: 0;
  right: 0;
  z-index: 2;
}

.upload-icon {
  width: var(--upload-icon-size);
  height: var(--upload-icon-size);
  background: var(--ant-primary-color);
  border: 2px solid #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.upload-icon:hover {
  background: var(--ant-primary-color-hover);
  transform: scale(1.1);
}

.upload-icon .anticon {
  color: #fff;
  font-size: 14px;
}

.remove-icon {
  position: absolute;
  top: -8px;
  right: -8px;
  width: var(--remove-icon-size);
  height: var(--remove-icon-size);
  background: #ff4d4f;
  border: 2px solid #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
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
  font-size: 12px;
}

.avatar-tips {
  text-align: center;
  max-width: 280px;
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

/* 小螢幕響應式適配 */
@media (max-width: 767px) {
  .profile-avatar {
    --avatar-size: 80px;
    --upload-icon-size: 28px;
    --remove-icon-size: 20px;
  }

  .upload-icon .anticon {
    font-size: 12px;
  }

  .remove-icon {
    top: -6px;
    right: -6px;
  }

  .remove-icon .anticon {
    font-size: 10px;
  }
}
</style>
