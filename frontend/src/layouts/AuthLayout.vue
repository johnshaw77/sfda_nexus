<template>
  <div class="auth-layout">
    <!-- 背景裝飾 -->
    <div class="auth-background">
      <div class="bg-pattern"></div>
      <div class="bg-gradient"></div>
    </div>

    <!-- 主要內容區域 -->
    <div class="auth-container">
      <!-- 左側品牌區域 -->
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
          <h1 class="brand-title">SFDA Nexus</h1>
          <p class="brand-subtitle">企業級 AI 聊天助手</p>
          <p class="brand-description">
            Connect. Create. Collaborate.<br />
            讓 AI 成為您工作中的得力助手
          </p>

          <!-- 特色功能 -->
          <div class="feature-highlights">
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

      <!-- 右側表單區域 -->
      <div class="auth-form">
        <div class="form-container">
          <!-- 表單頭部 -->
          <div class="form-header">
            <h2 class="form-title">{{ getPageTitle() }}</h2>
            <p class="form-subtitle">{{ getPageSubtitle() }}</p>
          </div>

          <!-- 表單內容 -->
          <div class="form-content">
            <router-view />
          </div>

          <!-- 表單底部 -->
          <div class="form-footer">
            <div class="auth-links">
              <router-link
                v-if="$route.name !== 'Login'"
                to="/auth/login"
                class="auth-link">
                已有帳號？立即登入
              </router-link>
              <router-link
                v-if="$route.name !== 'Register'"
                to="/auth/register"
                class="auth-link">
                還沒有帳號？立即註冊
              </router-link>
              <router-link
                v-if="$route.name === 'Login'"
                to="/auth/forgot-password"
                class="auth-link forgot-link">
                忘記密碼？
              </router-link>
            </div>
          </div>
        </div>
      </div>
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
import { computed } from "vue";
import { useRoute } from "vue-router";
import { CheckCircleOutlined } from "@ant-design/icons-vue";

const route = useRoute();

// 計算屬性
const getPageTitle = () => {
  const titles = {
    Login: "歡迎回來",
    Register: "創建帳號",
    ForgotPassword: "重設密碼",
  };
  return titles[route.name] || "認證";
};

const getPageSubtitle = () => {
  const subtitles = {
    Login: "登入您的 SFDA Nexus 帳號",
    Register: "加入 SFDA Nexus，開始您的 AI 之旅",
    ForgotPassword: "輸入您的電子郵件地址，我們將發送重設連結",
  };
  return subtitles[route.name] || "";
};
</script>

<style scoped>
.auth-layout {
  min-height: 100vh;
  position: relative;
  overflow: hidden;
}

.auth-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 0;
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
  display: flex;
  align-items: center;
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
}

.auth-brand {
  flex: 1;
  padding-right: 60px;
  display: flex;
  align-items: center;
}

.brand-content {
  max-width: 500px;
}

.brand-logo {
  margin-bottom: 32px;
  display: flex;
  justify-content: flex-start;
}

.brand-title {
  font-size: 48px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 16px;
  background: linear-gradient(135deg, #1890ff, #52c41a);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.brand-subtitle {
  font-size: 24px;
  font-weight: 500;
  color: #666;
  margin-bottom: 16px;
}

.brand-description {
  font-size: 16px;
  color: #666;
  line-height: 1.6;
  margin-bottom: 40px;
}

.feature-highlights {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 16px;
  color: #333;
}

.feature-icon {
  color: #52c41a;
  font-size: 18px;
}

.auth-form {
  flex: 0 0 480px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.form-container {
  width: 100%;
  max-width: 400px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  padding: 40px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.form-header {
  text-align: center;
  margin-bottom: 32px;
}

.form-title {
  font-size: 28px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 8px;
}

.form-subtitle {
  font-size: 14px;
  color: #666;
  margin: 0;
}

.form-content {
  margin-bottom: 24px;
}

.form-footer {
  text-align: center;
}

.auth-links {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.auth-link {
  color: #1890ff;
  text-decoration: none;
  font-size: 14px;
  transition: color 0.2s;
}

.auth-link:hover {
  color: #40a9ff;
}

.forgot-link {
  color: #666;
  font-size: 13px;
}

.forgot-link:hover {
  color: #1890ff;
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

.footer-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  color: #666;
}

.footer-links {
  display: flex;
  gap: 24px;
}

.footer-links a {
  color: #666;
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

/* 響應式設計 */
@media (max-width: 1024px) {
  .auth-container {
    flex-direction: column;
    text-align: center;
  }

  .auth-brand {
    padding-right: 0;
    margin-bottom: 40px;
  }

  .brand-content {
    max-width: 600px;
    margin: 0 auto;
  }

  .auth-form {
    flex: none;
    width: 100%;
    max-width: 480px;
  }
}

@media (max-width: 768px) {
  .auth-container {
    padding: 20px;
  }

  .brand-title {
    font-size: 36px;
  }

  .brand-subtitle {
    font-size: 20px;
  }

  .form-container {
    padding: 32px 24px;
  }

  .footer-content {
    flex-direction: column;
    gap: 12px;
    text-align: center;
  }

  .footer-links {
    gap: 16px;
  }
}

@media (max-width: 480px) {
  .auth-container {
    padding: 16px;
  }

  .brand-title {
    font-size: 28px;
  }

  .form-container {
    padding: 24px 20px;
  }

  .feature-highlights {
    display: none;
  }
}
</style>
