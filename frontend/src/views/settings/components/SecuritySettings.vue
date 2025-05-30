<!--
  安全設置組件
  包含密碼修改、會話管理等安全相關功能
-->

<template>
  <a-card
    title="安全設置"
    class="settings-panel">
    <div class="security-section">
      <h3>修改密碼</h3>
      <a-form
        ref="passwordFormRef"
        :model="passwordForm"
        :rules="passwordRules"
        layout="vertical"
        @finish="handleChangePassword">
        <a-form-item
          name="currentPassword"
          label="當前密碼">
          <a-input-password
            v-model:value="passwordForm.currentPassword"
            placeholder="請輸入當前密碼" />
        </a-form-item>

        <a-form-item
          name="newPassword"
          label="新密碼">
          <a-input-password
            v-model:value="passwordForm.newPassword"
            placeholder="請輸入新密碼" />
        </a-form-item>

        <a-form-item
          name="confirmPassword"
          label="確認新密碼">
          <a-input-password
            v-model:value="passwordForm.confirmPassword"
            placeholder="請再次輸入新密碼" />
        </a-form-item>

        <a-form-item>
          <a-button
            type="primary"
            html-type="submit"
            :loading="isChangingPassword">
            修改密碼
          </a-button>
        </a-form-item>
      </a-form>
    </div>

    <a-divider />

    <div class="security-section">
      <h3>登入會話</h3>
      <p class="section-description">管理您的登入會話和設備</p>
      <a-button
        type="default"
        @click="handleLogoutAllDevices">
        登出所有設備
      </a-button>
    </div>
  </a-card>
</template>

<script setup>
import { ref, reactive } from "vue";
import { message } from "ant-design-vue";
import { useAuthStore } from "@/stores/auth";

const authStore = useAuthStore();

// 響應式數據
const isChangingPassword = ref(false);
const passwordFormRef = ref();

// 密碼修改表單
const passwordForm = reactive({
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
});

// 表單驗證規則
const passwordRules = {
  currentPassword: [
    { required: true, message: "請輸入當前密碼", trigger: "blur" },
  ],
  newPassword: [
    { required: true, message: "請輸入新密碼", trigger: "blur" },
    { min: 6, message: "密碼至少6個字符", trigger: "blur" },
  ],
  confirmPassword: [
    { required: true, message: "請確認新密碼", trigger: "blur" },
    {
      validator: (rule, value) => {
        if (value !== passwordForm.newPassword) {
          return Promise.reject("兩次輸入的密碼不一致");
        }
        return Promise.resolve();
      },
      trigger: "blur",
    },
  ],
};

// 事件處理
const handleChangePassword = async (values) => {
  isChangingPassword.value = true;
  try {
    const result = await authStore.handleChangePassword({
      current_password: values.currentPassword,
      new_password: values.newPassword,
      confirm_password: values.confirmPassword,
    });

    if (result.success) {
      message.success("密碼修改成功");
      passwordFormRef.value.resetFields();
    }
  } catch (error) {
    console.error("修改密碼失敗:", error);
  } finally {
    isChangingPassword.value = false;
  }
};

const handleLogoutAllDevices = () => {
  message.info("登出所有設備功能開發中");
};
</script>

<style scoped>
.settings-panel {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.security-section {
  margin-bottom: 24px;
}

.security-section h3 {
  margin: 0 0 16px 0;
  color: #333;
}

.section-description {
  color: #666;
  margin-bottom: 16px;
}

:deep(.ant-form-item-label > label) {
  font-weight: 500;
  color: #333;
}

:deep(.ant-card-head-title) {
  font-weight: 600;
  color: #333;
}
</style>
