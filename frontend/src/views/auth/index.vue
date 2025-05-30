<template>
  <div class="auth-page">
    <div class="auth-container">
      <div class="auth-header">
        <h1 class="auth-title">SFDA Nexus</h1>
        <p class="auth-subtitle">企業 AI 聊天系統</p>
      </div>

      <div class="auth-tabs">
        <a-tabs
          v-model:activeKey="activeTab"
          centered>
          <a-tab-pane
            key="login"
            tab="登入">
            <LoginForm @success="handleAuthSuccess" />
          </a-tab-pane>
          <a-tab-pane
            key="register"
            tab="註冊">
            <RegisterForm @success="handleAuthSuccess" />
          </a-tab-pane>
        </a-tabs>
      </div>
    </div>
  </div>
</template>

<script>
import LoginForm from "./components/Login.vue";
import RegisterForm from "./components/Register.vue";

export default {
  name: "AuthPage",
  components: {
    LoginForm,
    RegisterForm,
  },
  data() {
    return {
      activeTab: "login",
    };
  },
  methods: {
    handleAuthSuccess() {
      // 認證成功後的處理
      this.$router.push("/dashboard");
    },
  },
};
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.auth-container {
  width: 100%;
  max-width: 400px;
  padding: 40px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
}

.auth-header {
  text-align: center;
  margin-bottom: 32px;
}

.auth-title {
  font-size: 32px;
  font-weight: 700;
  color: #1890ff;
  margin-bottom: 8px;
}

.auth-subtitle {
  color: #666;
  font-size: 16px;
  margin: 0;
}

.auth-tabs {
  margin-top: 24px;
}
</style>
