<!--
  註冊頁面
  提供用戶註冊功能，包含表單驗證、密碼確認、錯誤處理等
-->

<template>
  <div class="register-container">
    <div class="register-card">
      <!-- 品牌標題 -->
      <div class="register-header">
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
        <h1 class="brand-title">加入 SFDA Nexus</h1>
        <p class="brand-subtitle">創建您的企業 AI 助手帳號</p>
      </div>

      <!-- 註冊表單 -->
      <a-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        layout="vertical"
        class="register-form"
        @finish="handleSubmit">
        <a-form-item
          name="username"
          label="用戶名">
          <a-input
            v-model:value="formData.username"
            size="large"
            placeholder="請輸入用戶名（3-20個字符）"
            :prefix="h(UserOutlined)"
            :disabled="isLoading" />
        </a-form-item>

        <a-form-item
          name="email"
          label="郵箱">
          <a-input
            v-model:value="formData.email"
            size="large"
            placeholder="請輸入郵箱地址"
            :prefix="h(MailOutlined)"
            :disabled="isLoading" />
        </a-form-item>

        <a-form-item
          name="displayName"
          label="顯示名稱">
          <a-input
            v-model:value="formData.displayName"
            size="large"
            placeholder="請輸入顯示名稱"
            :prefix="h(IdcardOutlined)"
            :disabled="isLoading" />
        </a-form-item>

        <a-form-item
          name="password"
          label="密碼">
          <a-input-password
            v-model:value="formData.password"
            size="large"
            placeholder="請輸入密碼（至少6個字符）"
            :prefix="h(LockOutlined)"
            :disabled="isLoading" />
        </a-form-item>

        <a-form-item
          name="confirmPassword"
          label="確認密碼">
          <a-input-password
            v-model:value="formData.confirmPassword"
            size="large"
            placeholder="請再次輸入密碼"
            :prefix="h(LockOutlined)"
            :disabled="isLoading" />
        </a-form-item>

        <a-form-item name="agreement">
          <a-checkbox
            v-model:checked="formData.agreement"
            :disabled="isLoading">
            我已閱讀並同意
            <a-button
              type="link"
              size="small"
              @click="handleShowTerms">
              服務條款
            </a-button>
            和
            <a-button
              type="link"
              size="small"
              @click="handleShowPrivacy">
              隱私政策
            </a-button>
          </a-checkbox>
        </a-form-item>

        <a-form-item>
          <a-button
            type="primary"
            html-type="submit"
            size="large"
            block
            :loading="isLoading">
            創建帳號
          </a-button>
        </a-form-item>

        <div class="register-footer">
          <span>已有帳號？</span>
          <router-link
            to="/login"
            class="login-link">
            立即登入
          </router-link>
        </div>
      </a-form>
    </div>

    <!-- 背景裝飾 -->
    <div class="register-background">
      <div class="bg-shape bg-shape-1"></div>
      <div class="bg-shape bg-shape-2"></div>
      <div class="bg-shape bg-shape-3"></div>
      <div class="bg-shape bg-shape-4"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, h, onMounted } from "vue";
import { useRouter } from "vue-router";
import { message } from "ant-design-vue";
import {
  UserOutlined,
  LockOutlined,
  MailOutlined,
  IdcardOutlined,
} from "@ant-design/icons-vue";
import { useAuthStore } from "@/store/auth";

const router = useRouter();
const authStore = useAuthStore();
const formRef = ref();
const isLoading = ref(false);

// 表單數據
const formData = reactive({
  username: "",
  email: "",
  displayName: "",
  password: "",
  confirmPassword: "",
  agreement: false,
});

// 自定義驗證器
const validatePassword = async (rule, value) => {
  if (!value) {
    return Promise.reject("請輸入密碼");
  }
  if (value.length < 6) {
    return Promise.reject("密碼至少6個字符");
  }
  if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(value)) {
    return Promise.reject("密碼必須包含字母和數字");
  }
  return Promise.resolve();
};

const validateConfirmPassword = async (rule, value) => {
  if (!value) {
    return Promise.reject("請確認密碼");
  }
  if (value !== formData.password) {
    return Promise.reject("兩次輸入的密碼不一致");
  }
  return Promise.resolve();
};

const validateAgreement = async (rule, value) => {
  if (!value) {
    return Promise.reject("請同意服務條款和隱私政策");
  }
  return Promise.resolve();
};

// 表單驗證規則
const formRules = {
  username: [
    { required: true, message: "請輸入用戶名", trigger: "blur" },
    { min: 3, max: 20, message: "用戶名長度為3-20個字符", trigger: "blur" },
    {
      pattern: /^[a-zA-Z0-9_]+$/,
      message: "用戶名只能包含字母、數字和下劃線",
      trigger: "blur",
    },
  ],
  email: [
    { required: true, message: "請輸入郵箱", trigger: "blur" },
    { type: "email", message: "請輸入有效的郵箱地址", trigger: "blur" },
  ],
  displayName: [
    { required: true, message: "請輸入顯示名稱", trigger: "blur" },
    { min: 2, max: 50, message: "顯示名稱長度為2-50個字符", trigger: "blur" },
  ],
  password: [{ validator: validatePassword, trigger: "blur" }],
  confirmPassword: [{ validator: validateConfirmPassword, trigger: "blur" }],
  agreement: [{ validator: validateAgreement, trigger: "change" }],
};

// 處理註冊提交
const handleSubmit = async (values) => {
  isLoading.value = true;

  try {
    const result = await authStore.handleRegister({
      username: values.username,
      email: values.email,
      display_name: values.displayName,
      password: values.password,
    });

    if (result.success) {
      message.success("註冊成功！歡迎使用 SFDA Nexus");
      // 註冊成功，跳轉到主頁面
      await router.push("/");
    }
  } catch (error) {
    console.error("註冊失敗:", error);
  } finally {
    isLoading.value = false;
  }
};

// 顯示服務條款
const handleShowTerms = () => {
  message.info("服務條款功能開發中");
};

// 顯示隱私政策
const handleShowPrivacy = () => {
  message.info("隱私政策功能開發中");
};

// 檢查是否已登入
onMounted(() => {
  if (authStore.isAuthenticated) {
    router.push("/");
  }
});
</script>

<style scoped>
.register-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
  overflow: hidden;
  padding: 20px 0;
}

.register-card {
  width: 100%;
  max-width: 450px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  padding: 40px;
  position: relative;
  z-index: 10;
  margin: 20px 0;
}

.register-header {
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

.register-form {
  margin-top: 24px;
}

.register-footer {
  text-align: center;
  margin-top: 24px;
  color: #666;
}

.login-link {
  color: #1890ff;
  text-decoration: none;
  font-weight: 500;
  margin-left: 8px;
}

.login-link:hover {
  color: #40a9ff;
}

/* 背景裝飾 */
.register-background {
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
  animation: float 8s ease-in-out infinite;
}

.bg-shape-1 {
  width: 180px;
  height: 180px;
  top: 5%;
  left: 5%;
  animation-delay: 0s;
}

.bg-shape-2 {
  width: 120px;
  height: 120px;
  top: 50%;
  right: 5%;
  animation-delay: 2s;
}

.bg-shape-3 {
  width: 200px;
  height: 200px;
  bottom: 10%;
  left: 15%;
  animation-delay: 4s;
}

.bg-shape-4 {
  width: 80px;
  height: 80px;
  top: 20%;
  right: 20%;
  animation-delay: 6s;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0px) rotate(0deg);
  }
  33% {
    transform: translateY(-15px) rotate(120deg);
  }
  66% {
    transform: translateY(15px) rotate(240deg);
  }
}

/* 響應式設計 */
@media (max-width: 768px) {
  .register-container {
    padding: 10px;
  }

  .register-card {
    padding: 24px;
    margin: 10px 0;
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

:deep(.ant-btn-link) {
  padding: 0;
  height: auto;
}

/* 表單項間距優化 */
:deep(.ant-form-item) {
  margin-bottom: 20px;
}

:deep(.ant-form-item:last-child) {
  margin-bottom: 0;
}
</style>
