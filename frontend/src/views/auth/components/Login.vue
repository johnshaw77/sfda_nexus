<!--
  登入頁面
  提供用戶登入功能，包含表單驗證、錯誤處理、自動跳轉等
-->

<template>
  <div class="login-form-wrapper">
    <!-- 登入表單 -->
    <a-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      layout="vertical"
      class="login-form"
      @finish="handleSubmit">
      <a-form-item
        name="username"
        label="用戶名">
        <a-input
          v-model:value="formData.username"
          size="large"
          placeholder="請輸入用戶名或郵箱"
          :prefix="h(UserOutlined)"
          :disabled="isLoading" />
      </a-form-item>

      <a-form-item
        name="password"
        label="密碼">
        <a-input-password
          v-model:value="formData.password"
          size="large"
          placeholder="請輸入密碼"
          :prefix="h(LockOutlined)"
          :disabled="isLoading" />
      </a-form-item>

      <a-form-item>
        <div class="login-options">
          <a-checkbox
            v-model:checked="formData.rememberMe"
            :disabled="isLoading">
            記住我
          </a-checkbox>
          <a-button
            type="link"
            size="small"
            @click="handleForgotPassword">
            忘記密碼？
          </a-button>
        </div>
      </a-form-item>

      <a-form-item>
        <a-button
          type="primary"
          html-type="submit"
          size="large"
          block
          :loading="isLoading">
          登入
        </a-button>
      </a-form-item>
    </a-form>
  </div>
</template>

<script setup>
import { ref, reactive, h, onMounted } from "vue";
import { useRouter } from "vue-router";
import { message } from "ant-design-vue";
import { UserOutlined, LockOutlined } from "@ant-design/icons-vue";
import { useAuthStore } from "@/stores/auth";
import { debugAuthStore, debugUserData } from "@/utils/debugAuth";

const router = useRouter();
const authStore = useAuthStore();
const formRef = ref();
const isLoading = ref(false);

// 表單數據
const formData = reactive({
  username: "",
  password: "",
  rememberMe: false,
});

// 表單驗證規則
const formRules = {
  username: [
    { required: true, message: "請輸入用戶名或郵箱", trigger: "blur" },
    { min: 3, message: "用戶名至少3個字符", trigger: "blur" },
  ],
  password: [
    { required: true, message: "請輸入密碼", trigger: "blur" },
    { min: 6, message: "密碼至少6個字符", trigger: "blur" },
  ],
};

// 處理登入提交
const handleSubmit = async (values) => {
  isLoading.value = true;

  try {
    console.log("🔐 開始登入流程...");
    const result = await authStore.handleLogin({
      username: values.username,
      password: values.password,
      rememberMe: values.rememberMe,
    });

    console.log("🔐 登入結果:", result);

    if (result.success) {
      console.log("✅ 登入成功");
      debugAuthStore(authStore);
      debugUserData(result.user, "登入返回的用戶數據");

      // 登入成功，跳轉到主頁面
      const redirectPath = router.currentRoute.value.query.redirect || "/";
      await router.push(redirectPath);
    }
  } catch (error) {
    console.error("登入失敗:", error);
  } finally {
    isLoading.value = false;
  }
};

// 處理忘記密碼
const handleForgotPassword = () => {
  message.info("忘記密碼功能開發中，請聯繫管理員");
};

// 檢查是否已登入
onMounted(() => {
  if (authStore.isAuthenticated) {
    router.push("/");
  }
});
</script>

<style scoped>
.login-form-wrapper {
  width: 100%;
}

.login-form {
  width: 100%;
}

.login-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* 表單樣式優化 */
:deep(.ant-form-item-label > label) {
  font-weight: 500;
  color: #333;
}

:deep(.ant-input-affix-wrapper) {
  border-radius: 8px;
}

:deep(.ant-btn-primary) {
  border-radius: 8px;
  height: 44px;
  font-weight: 500;
  background: linear-gradient(135deg, #1890ff, #722ed1);
  border: none;
}

:deep(.ant-btn-primary:hover) {
  background: linear-gradient(135deg, #40a9ff, #9254de);
}

:deep(.ant-checkbox-wrapper) {
  color: #666;
}

:deep(.ant-btn-link) {
  padding: 0;
  height: auto;
}
</style>
