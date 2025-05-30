<!--
  登入頁面
  提供用戶登入功能，包含表單驗證、錯誤處理、自動跳轉等
-->

<template>
  <div class="login-container">
    <div class="login-card">
      <!-- 品牌標題 -->
      <div class="login-header">
        <div class="brand-logo">
          <svg
            width="48"
            height="48"
            viewBox="0 0 48 48"
            fill="none">
            <rect
              width="48"
              height="48"
              rx="12"
              fill="#1890ff" />
            <path
              d="M12 24L20 16L28 24L36 16"
              stroke="white"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round" />
            <path
              d="M12 32L20 24L28 32L36 24"
              stroke="white"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round" />
          </svg>
        </div>
        <h1 class="brand-title">SFDA Nexus</h1>
        <p class="brand-subtitle">企業 AI 聊天系統</p>
      </div>

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

        <div class="login-footer">
          <span>還沒有帳號？</span>
          <router-link
            to="/register"
            class="register-link">
            立即註冊
          </router-link>
        </div>
      </a-form>
    </div>

    <!-- 背景裝飾 -->
    <div class="login-background">
      <div class="bg-shape bg-shape-1"></div>
      <div class="bg-shape bg-shape-2"></div>
      <div class="bg-shape bg-shape-3"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, h, onMounted } from "vue";
import { useRouter } from "vue-router";
import { message } from "ant-design-vue";
import { UserOutlined, LockOutlined } from "@ant-design/icons-vue";
import { useAuthStore } from "@/store/auth";

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
    const result = await authStore.handleLogin({
      username: values.username,
      password: values.password,
      rememberMe: values.rememberMe,
    });

    if (result.success) {
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
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
  overflow: hidden;
}

.login-card {
  width: 100%;
  max-width: 400px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  padding: 40px;
  position: relative;
  z-index: 10;
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.brand-logo {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
}

.brand-title {
  font-size: 28px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 8px 0;
  background: linear-gradient(135deg, #1890ff, #722ed1);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.brand-subtitle {
  color: #666;
  font-size: 14px;
  margin: 0;
}

.login-form {
  margin-top: 24px;
}

.login-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.login-footer {
  text-align: center;
  margin-top: 24px;
  color: #666;
}

.register-link {
  color: #1890ff;
  text-decoration: none;
  font-weight: 500;
  margin-left: 8px;
}

.register-link:hover {
  color: #40a9ff;
}

/* 背景裝飾 */
.login-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
}

.bg-shape {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  animation: float 6s ease-in-out infinite;
}

.bg-shape-1 {
  width: 200px;
  height: 200px;
  top: 10%;
  left: 10%;
  animation-delay: 0s;
}

.bg-shape-2 {
  width: 150px;
  height: 150px;
  top: 60%;
  right: 10%;
  animation-delay: 2s;
}

.bg-shape-3 {
  width: 100px;
  height: 100px;
  bottom: 20%;
  left: 20%;
  animation-delay: 4s;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0px) rotate(0deg);
  }
  50% {
    transform: translateY(-20px) rotate(180deg);
  }
}

/* 響應式設計 */
@media (max-width: 768px) {
  .login-container {
    padding: 20px;
  }

  .login-card {
    padding: 24px;
  }

  .brand-title {
    font-size: 24px;
  }
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
</style>
