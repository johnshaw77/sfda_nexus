<!--
  登入頁面 - 整合了完整的認證布局
  提供用戶登入功能，包含表單驗證、錯誤處理、自動跳轉等
-->

<template>
  <div class="auth-layout">
    <!-- 主題切換按鈕 -->
    <div class="theme-toggle-container">
      <a-tooltip
        :title="configStore.isDarkMode ? '切換至亮色模式' : '切換至暗黑模式'">
        <a-button
          type="text"
          @click="configStore.toggleTheme"
          class="theme-toggle-btn">
          <MoonStar
            v-if="configStore.isDarkMode"
            :size="24" />
          <Lightbulb
            v-else
            :size="24" />
        </a-button>
      </a-tooltip>
    </div>

    <!-- 背景裝飾 -->
    <div
      class="auth-background"
      :style="authBackgroundStyle">
      <div class="bg-pattern"></div>
      <div class="bg-gradient"></div>
    </div>

    <!-- 主要內容區域 -->
    <div class="auth-container">
      <a-row
        type="flex"
        align="middle"
        justify="center"
        :gutter="[60, 40]"
        class="auth-row">
        <!-- 左側品牌區域 -->
        <a-col
          :xs="24"
          :sm="24"
          :md="24"
          :lg="14"
          :xl="14"
          :xxl="12">
          <div class="auth-brand">
            <div class="brand-content">
              <!-- Logo -->
              <div class="brand-logo">
                <svg
                  width="80"
                  height="80"
                  viewBox="0 0 80 80"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg">
                  <circle
                    cx="40"
                    cy="40"
                    r="35"
                    fill="#1890ff"
                    opacity="0.1" />
                  <circle
                    cx="40"
                    cy="40"
                    r="25"
                    fill="#1890ff"
                    opacity="0.2" />
                  <circle
                    cx="40"
                    cy="40"
                    r="15"
                    fill="#1890ff" />
                  <path
                    d="M32 35h16v2H32v-2zm0 4h12v2H32v-2zm0 4h8v2H32v-2z"
                    fill="white" />
                </svg>
              </div>

              <!-- 品牌信息 -->
              <h1 class="brand-title">
                <span
                  ref="titleText"
                  class="typewriter-text"
                  >台郡科技 Nexus</span
                >
              </h1>
              <p class="brand-subtitle">
                <span
                  ref="subtitleText"
                  class="typewriter-text"
                  >企業級 AI 聊天助手</span
                >
              </p>
              <p class="brand-description">
                <span
                  ref="descriptionText"
                  class="slide-text">
                  Connect. Create. Collaborate.<br />
                  讓 AI 成為您工作中的得力助手
                </span>
              </p>

              <!-- 特色功能 -->
              <div
                ref="featuresText"
                class="feature-highlights"
                style="opacity: 0">
                <div class="feature-item">
                  <CheckCircleOutlined class="feature-icon" />
                  <span>多模型 AI 支持</span>
                </div>
                <div class="feature-item">
                  <CheckCircleOutlined class="feature-icon" />
                  <span>實時聊天體驗</span>
                </div>
                <div class="feature-item">
                  <CheckCircleOutlined class="feature-icon" />
                  <span>企業級安全保障</span>
                </div>
                <div class="feature-item">
                  <CheckCircleOutlined class="feature-icon" />
                  <span>智能工作流程</span>
                </div>
              </div>
            </div>
          </div>
        </a-col>

        <!-- 右側表單區域 -->
        <a-col
          :xs="24"
          :sm="24"
          :md="24"
          :lg="10"
          :xl="10"
          :xxl="12">
          <div class="auth-form">
            <div class="form-container">
              <!-- 表單頭部 -->
              <div class="form-header">
                <h2 class="form-title">歡迎回來</h2>
                <p class="form-subtitle">登入您的 SFDA Nexus 帳號</p>
              </div>

              <!-- 表單內容 -->
              <div class="form-content">
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
                        <!-- <a-button
                          type="link"
                          size="small"
                          @click="handleForgotPassword">
                          忘記密碼？
                        </a-button> -->
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

                    <!-- 快速登錄測試帳號 -->
                    <div class="quick-login-section">
                      <a-divider>
                        <span style="color: #999; font-size: 12px"
                          >快速測試登錄</span
                        >
                      </a-divider>
                      <div class="quick-login-buttons">
                        <a-button
                          type="text"
                          size="small"
                          @click="handleQuickLogin('admin', 'admin123')"
                          :disabled="isLoading"
                          class="quick-login-btn">
                          蕭傳璋(SUPER_ADMIN)
                        </a-button>
                        <a-button
                          type="text"
                          size="small"
                          @click="handleQuickLogin('user010', 'password123')"
                          :disabled="isLoading"
                          class="quick-login-btn">
                          呂鈺泓(VP)
                        </a-button>
                        <a-button
                          type="text"
                          size="small"
                          @click="handleQuickLogin('user007', 'password123')"
                          :disabled="isLoading"
                          class="quick-login-btn">
                          鄭揚(CEO)
                        </a-button>
                      </div>
                    </div>
                  </a-form>
                </div>
              </div>
            </div>
          </div>
        </a-col>
      </a-row>
    </div>

    <!-- 頁腳 -->
    <div class="auth-footer">
      <div class="footer-content">
        <span>© 2025 SFDA Nexus. All rights reserved.</span>
        <div class="footer-links">
          <a
            href="#"
            @click.prevent
            >隱私政策</a
          >
          <a
            href="#"
            @click.prevent
            >服務條款</a
          >
          <a
            href="#"
            @click.prevent
            >幫助中心</a
          >
        </div>
      </div>
    </div>

    <!-- 裝飾元素 -->
    <div class="decorative-elements">
      <div class="floating-shape shape-1"></div>
      <div class="floating-shape shape-2"></div>
      <div class="floating-shape shape-3"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, h, onMounted, nextTick, computed, watch } from "vue";
import { useRouter } from "vue-router";
import { message } from "ant-design-vue";
import { Lightbulb, MoonStar } from "lucide-vue-next";
import {
  CheckCircleOutlined,
  UserOutlined,
  LockOutlined,
} from "@ant-design/icons-vue";
import { useAuthStore } from "@/stores/auth";
import { useConfigStore } from "@/stores/config";
import { debugAuthStore, debugUserData } from "@/utils/debugAuth";
import { gsap } from "gsap";
import { TextPlugin } from "gsap/TextPlugin";

// 註冊 GSAP 插件
gsap.registerPlugin(TextPlugin);

const router = useRouter();
const authStore = useAuthStore();
const configStore = useConfigStore();
const formRef = ref();
const isLoading = ref(false);

// 打字機效果的 refs
const titleText = ref();
const subtitleText = ref();
const descriptionText = ref();
const featuresText = ref();

// 表單數據
const formData = reactive({
  username: "",
  password: "",
  rememberMe: true,
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

// 處理快速登錄
const handleQuickLogin = (username, password) => {
  formData.username = username;
  formData.password = password;
  // 觸發表單提交
  nextTick(() => {
    formRef.value?.submit();
  });
};

// 標題循環動畫
const titleCycleAnimation = () => {
  const titles = [
    "台郡科技 Nexus",
    "數據分析部開發",
    "千問 Qwen3 本地模型",
    "DeepSeek R1本地模型",
    "Gemma3 本地模型",
    "AI 虛擬組織",
    "企業級解決方案",
    "硬體資源不夠優",
    "加減使用",
  ];
  let currentIndex = 0;

  const cycleTitles = () => {
    if (titleText.value) {
      gsap.to(titleText.value, {
        duration: 0.5,
        opacity: 0,
        y: -20,
        ease: "power2.in",
        onComplete: () => {
          currentIndex = (currentIndex + 1) % titles.length;
          titleText.value.textContent = titles[currentIndex];
          gsap.to(titleText.value, {
            duration: 0.5,
            opacity: 1,
            y: 0,
            ease: "power2.out",
          });
        },
      });
    }
  };

  // 每3秒循環一次
  setInterval(cycleTitles, 3000);
};

// GSAP 動畫時間線
const startAnimations = async () => {
  try {
    // 等待 DOM 元素準備好
    await nextTick();

    // 創建主時間線
    const tl = gsap.timeline();

    // 1. GSAP 打字機效果：標題
    if (titleText.value) {
      // 初始化元素，保持原始文字
      gsap.set(titleText.value, { opacity: 1, text: "" });

      tl.to(titleText.value, {
        duration: 2,
        text: "台郡科技 Nexus",
        ease: "none",
        onComplete: () => {
          // 移除閃爍游標並開始循環
          titleText.value.classList.add("completed");
          // 延遲3秒後開始循環
          setTimeout(titleCycleAnimation, 3000);
        },
      });
    }

    // 2. GSAP 打字機效果：副標題
    if (subtitleText.value) {
      gsap.set(subtitleText.value, { opacity: 1, text: "" });

      tl.to(
        subtitleText.value,
        {
          duration: 1.2,
          text: "企業級 AI 聊天助手",
          ease: "none",
          delay: 1.2,
          onComplete: () => {
            subtitleText.value.classList.add("completed");
          },
        },
        "-=1.5"
      );
    }

    // 3. 描述文字滑動進入效果
    if (descriptionText.value) {
      gsap.set(descriptionText.value, { opacity: 0, x: 50 });

      tl.to(
        descriptionText.value,
        {
          duration: 1.2,
          opacity: 1,
          x: 0,
          ease: "power2.out",
          delay: 1.6,
        },
        "-=1"
      );
    }

    // 4. GSAP 淡入和滑入效果：特色功能
    if (featuresText.value) {
      // 設置初始狀態
      gsap.set(featuresText.value, { opacity: 0, y: 30 });

      tl.to(
        featuresText.value,
        {
          duration: 1,
          opacity: 1,
          y: 0,
          ease: "power2.out",
          delay: 0.5,
        },
        "-=1.5"
      );

      // 為每個功能項目添加交錯動畫
      const featureItems = featuresText.value.querySelectorAll(".feature-item");
      gsap.set(featureItems, { opacity: 0, x: -20 });

      tl.to(
        featureItems,
        {
          duration: 0.6,
          opacity: 1,
          x: 0,
          ease: "power2.out",
          stagger: 0.1,
        },
        "-=0.8"
      );
    }

    // 5. Logo 旋轉動畫
    const logo = document.querySelector(".brand-logo svg");
    if (logo) {
      tl.from(
        logo,
        {
          duration: 1,
          rotation: 360,
          scale: 0.8,
          ease: "elastic.out(1, 0.5)",
        },
        0
      );
    }
  } catch (error) {
    console.error("GSAP 動畫執行錯誤:", error);
  }
};

// 背景
const lightImages = ["bg-light1.png", "bg-light2.png", "bg-light3.png"];
const darkImages = ["bg-dark1.png", "bg-dark2.png", "bg-dark3.png"];

// 隨機選圖
const randomIndex = ref(0);
function pickRandom() {
  randomIndex.value = Math.floor(Math.random() * 3);
}

const authBackgroundStyle = computed(() => ({
  backgroundImage: `url('/images/${
    configStore.isDarkMode
      ? darkImages[randomIndex.value]
      : lightImages[randomIndex.value]
  }')`,
  backgroundSize: "cover",
  backgroundPosition: "center",
}));

// 監聽暗黑模式變化
watch(
  () => configStore.isDarkMode,
  () => {
    console.log("🔍 暗黑模式", configStore.isDarkMode);
    console.log("🔍 暗黑模式改變，重新選圖");
    pickRandom();
  }
);

// 檢查是否已登入
onMounted(() => {
  pickRandom();
  if (authStore.isAuthenticated) {
    router.push("/");
  } else {
    // 啟動打字機動畫
    startAnimations();
  }
});

console.log("🔍 暗黑模式", configStore.isDarkMode);
</script>

<style scoped>
.auth-layout {
  min-height: 100vh;
  position: relative;
  overflow: hidden;
}

.theme-toggle-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
}

.theme-toggle-btn {
  width: 36px;
  padding: 8px;
  height: 36px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: #5662b0;
  backdrop-filter: blur(16px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  color: rgba(255, 255, 255, 0.8);
}

.theme-toggle-btn:hover {
  background: #6c7bdd;
  border-color: rgba(255, 255, 255, 0.3);
  color: rgba(255, 255, 255, 1);
  transform: translateY(-2px);
}

html.dark .theme-toggle-btn,
[data-theme="dark"] .theme-toggle-btn {
  border-color: rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.7);
}

html.dark .theme-toggle-btn:hover,
[data-theme="dark"] .theme-toggle-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.9);
}

.auth-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 0;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

.bg-pattern {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image:
    radial-gradient(
      circle at 25% 25%,
      rgba(24, 144, 255, 0.1) 0%,
      transparent 50%
    ),
    radial-gradient(
      circle at 75% 75%,
      rgba(82, 196, 26, 0.1) 0%,
      transparent 50%
    );
  animation: patternMove 20s ease-in-out infinite;
}

.bg-gradient {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  opacity: 0.8;
}

/* 暗黑模式背景調整 */
:deep(.dark) .bg-gradient,
html.dark .bg-gradient,
[data-theme="dark"] .bg-gradient {
  background: linear-gradient(
    135deg,
    #0f0f0f 0%,
    #1a1a1a 50%,
    #2d3748 100%
  ) !important;
  opacity: 0.95 !important;
}

:deep(.dark) .bg-pattern,
html.dark .bg-pattern,
[data-theme="dark"] .bg-pattern {
  background-image:
    radial-gradient(
      circle at 25% 25%,
      rgba(59, 130, 246, 0.08) 0%,
      transparent 50%
    ),
    radial-gradient(
      circle at 75% 75%,
      rgba(16, 185, 129, 0.08) 0%,
      transparent 50%
    ) !important;
}

@keyframes patternMove {
  0%,
  100% {
    transform: translate(0, 0) rotate(0deg);
  }
  33% {
    transform: translate(30px, -30px) rotate(120deg);
  }
  66% {
    transform: translate(-20px, 20px) rotate(240deg);
  }
}

.auth-container {
  position: relative;
  z-index: 1;
  min-height: 100vh;
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
}

.auth-row {
  min-height: calc(100vh - 80px);
  align-items: center;
}

.auth-brand {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.brand-content {
  max-width: 500px;
}

.brand-logo {
  margin-bottom: 32px;
  display: flex;
  justify-content: center;
}

.brand-logo svg {
  transition: transform 0.3s ease;
  cursor: pointer;
}

.brand-logo svg:hover {
  transform: scale(1.05);
}

.brand-title {
  font-size: 48px;
  font-weight: 700;
  color: var(--primary-color);
  margin-bottom: 16px;
  background-clip: text;
  min-height: 60px;
}

.typewriter-text {
  display: inline-block;
  border-right: 2px solid #1890ff;
  animation: blink 1s infinite;
}

.typewriter-text.completed {
  border-right: none;
  animation: none;
}

.slide-text {
  display: inline-block;
  opacity: 0;
  transform: translateX(50px);
}

@keyframes blink {
  0%,
  50% {
    border-color: var(--primary-color);
    opacity: 1;
  }
  51%,
  100% {
    border-color: transparent;
    opacity: 0.8;
  }
}

.brand-subtitle {
  font-size: 24px;
  font-weight: 500;
  color: var(--text-color-secondary);
  margin-bottom: 16px;
}

.brand-description {
  font-size: 16px;
  color: var(--text-color-secondary);
  line-height: 1.6;
  margin-bottom: 40px;
}

.feature-highlights {
  display: flex;
  flex-direction: column;
  gap: 12px;
  font-size: 16px;
  color: var(--text-color);
  opacity: 0;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 16px;
  color: var(--text-color);
  opacity: 0;
  transform: translateX(-20px);
  transition: all 0.3s ease;
}

.feature-item:hover {
  transform: translateX(5px);
  color: var(--primary-color);
}

.feature-icon {
  color: #52c41a;
  font-size: 18px;
}

.auth-form {
  display: flex;
  align-items: center;
  justify-content: center;
}

.form-container {
  width: 100%;
  max-width: 400px;
  background: var(--background-color);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  padding: 40px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

/* 暗黑模式表單容器調整 */
:deep(.dark) .form-container,
html.dark .form-container,
[data-theme="dark"] .form-container {
  background: rgba(15, 15, 15, 0.95) !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5) !important;
}

.form-header {
  text-align: center;
  margin-bottom: 32px;
  color: var(--text-color);
}

.form-title {
  font-size: 28px;
  font-weight: 600;
  color: var(--text-color);
  margin-bottom: 8px;
}

.form-subtitle {
  font-size: 14px;
  color: var(--text-color-secondary);
  margin: 0;
}

.form-content {
  margin-bottom: 24px;
}

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

.auth-footer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1;
  padding: 20px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
}

/* 暗黑模式頁腳調整 */
:deep(.dark) .auth-footer,
html.dark .auth-footer,
[data-theme="dark"] .auth-footer {
  background: rgba(10, 10, 10, 0.95) !important;
}

.footer-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  color: var(--text-color-secondary);
}

.footer-links {
  display: flex;
  gap: 24px;
}

.footer-links a {
  color: var(--text-color-secondary);
  text-decoration: none;
  transition: color 0.2s;
}

.footer-links a:hover {
  color: #1890ff;
}

.decorative-elements {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 0;
  pointer-events: none;
}

.floating-shape {
  position: absolute;
  border-radius: 50%;
  background: linear-gradient(
    135deg,
    rgba(24, 144, 255, 0.1),
    rgba(82, 196, 26, 0.1)
  );
  animation: float 6s ease-in-out infinite;
}

/* 暗黑模式裝飾元素調整 */
:deep(.dark) .floating-shape,
html.dark .floating-shape,
[data-theme="dark"] .floating-shape {
  background: linear-gradient(
    135deg,
    rgba(59, 130, 246, 0.1),
    rgba(16, 185, 129, 0.1)
  ) !important;
}

.shape-1 {
  width: 100px;
  height: 100px;
  top: 10%;
  right: 10%;
  animation-delay: 0s;
}

.shape-2 {
  width: 60px;
  height: 60px;
  top: 60%;
  left: 5%;
  animation-delay: 2s;
}

.shape-3 {
  width: 80px;
  height: 80px;
  bottom: 20%;
  right: 20%;
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

/* 表單樣式優化 */
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

:deep(.ant-btn-link) {
  padding: 0;
  height: auto;
}

/* 快速登錄樣式 */
.quick-login-section {
  margin-top: 16px;
}

.quick-login-buttons {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
}

.quick-login-btn {
  font-size: 11px !important;
  height: auto !important;
  padding: 6px !important;
  text-align: left !important;
  border: 1px solid #d9d9d9 !important;
  border-radius: 6px !important;
  background: #fafafa !important;
  transition: all 0.3s ease !important;
}

.quick-login-btn:hover {
  border-color: #1890ff !important;
  background: #f0f8ff !important;
  color: #1890ff !important;
}

.quick-login-btn:hover .account-info {
  color: #1890ff !important;
}

.account-info {
  font-size: 11px;
  color: #999;
  font-weight: normal;
}

/* 暗黑模式快速登錄樣式 */
:deep(.dark) .quick-login-btn,
html.dark .quick-login-btn,
[data-theme="dark"] .quick-login-btn {
  border-color: #434343 !important;
  background: rgba(255, 255, 255, 0.04) !important;
  color: rgba(255, 255, 255, 0.85) !important;
}

:deep(.dark) .quick-login-btn:hover,
html.dark .quick-login-btn:hover,
[data-theme="dark"] .quick-login-btn:hover {
  border-color: #1890ff !important;
  background: rgba(24, 144, 255, 0.1) !important;
  color: #1890ff !important;
}

:deep(.dark) .account-info,
html.dark .account-info,
[data-theme="dark"] .account-info {
  color: rgba(255, 255, 255, 0.45) !important;
}
</style>
