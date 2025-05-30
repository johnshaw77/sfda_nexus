<!--
  設置頁面
  提供用戶個人設置、系統偏好設置等功能
-->

<template>
  <div class="settings-container">
    <div class="settings-header">
      <h1 class="settings-title">設置</h1>
      <p class="settings-subtitle">管理您的帳號和偏好設置</p>
    </div>

    <div class="settings-content">
      <a-row :gutter="[24, 24]">
        <!-- 設置菜單 -->
        <a-col
          :xs="24"
          :lg="6">
          <a-card class="settings-menu-card">
            <a-menu
              v-model:selectedKeys="selectedMenuKeys"
              mode="vertical"
              class="settings-menu"
              @click="handleMenuClick">
              <a-menu-item key="profile">
                <template #icon>
                  <UserOutlined />
                </template>
                個人資料
              </a-menu-item>
              <a-menu-item key="security">
                <template #icon>
                  <LockOutlined />
                </template>
                安全設置
              </a-menu-item>
              <a-menu-item key="notifications">
                <template #icon>
                  <BellOutlined />
                </template>
                通知設置
              </a-menu-item>
              <a-menu-item key="appearance">
                <template #icon>
                  <BgColorsOutlined />
                </template>
                外觀設置
              </a-menu-item>
              <a-menu-item key="chat">
                <template #icon>
                  <MessageOutlined />
                </template>
                聊天設置
              </a-menu-item>
            </a-menu>
          </a-card>
        </a-col>

        <!-- 設置內容 -->
        <a-col
          :xs="24"
          :lg="18">
          <!-- 個人資料 -->
          <a-card
            v-show="activeTab === 'profile'"
            title="個人資料"
            class="settings-panel">
            <a-form
              ref="profileFormRef"
              :model="profileForm"
              :rules="profileRules"
              layout="vertical"
              @finish="handleUpdateProfile">
              <a-row :gutter="16">
                <a-col :span="12">
                  <a-form-item
                    name="username"
                    label="用戶名">
                    <a-input
                      v-model:value="profileForm.username"
                      disabled
                      placeholder="用戶名不可修改" />
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item
                    name="email"
                    label="郵箱">
                    <a-input
                      v-model:value="profileForm.email"
                      placeholder="請輸入郵箱" />
                  </a-form-item>
                </a-col>
              </a-row>

              <a-row :gutter="16">
                <a-col :span="12">
                  <a-form-item
                    name="displayName"
                    label="顯示名稱">
                    <a-input
                      v-model:value="profileForm.displayName"
                      placeholder="請輸入顯示名稱" />
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item
                    name="role"
                    label="角色">
                    <a-input
                      v-model:value="profileForm.role"
                      disabled
                      placeholder="角色由管理員分配" />
                  </a-form-item>
                </a-col>
              </a-row>

              <a-form-item
                name="bio"
                label="個人簡介">
                <a-textarea
                  v-model:value="profileForm.bio"
                  placeholder="介紹一下自己..."
                  :rows="4" />
              </a-form-item>

              <a-form-item>
                <a-button
                  type="primary"
                  html-type="submit"
                  :loading="isUpdatingProfile">
                  保存更改
                </a-button>
              </a-form-item>
            </a-form>
          </a-card>

          <!-- 安全設置 -->
          <a-card
            v-show="activeTab === 'security'"
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

          <!-- 通知設置 -->
          <a-card
            v-show="activeTab === 'notifications'"
            title="通知設置"
            class="settings-panel">
            <div class="notification-section">
              <div class="notification-item">
                <div class="notification-info">
                  <h4>新消息通知</h4>
                  <p>當收到新的 AI 回覆時顯示通知</p>
                </div>
                <a-switch v-model:checked="notificationSettings.newMessage" />
              </div>

              <div class="notification-item">
                <div class="notification-info">
                  <h4>系統通知</h4>
                  <p>接收系統更新和重要公告</p>
                </div>
                <a-switch v-model:checked="notificationSettings.system" />
              </div>

              <div class="notification-item">
                <div class="notification-info">
                  <h4>郵件通知</h4>
                  <p>通過郵件接收重要通知</p>
                </div>
                <a-switch v-model:checked="notificationSettings.email" />
              </div>

              <div class="notification-item">
                <div class="notification-info">
                  <h4>聲音提示</h4>
                  <p>新消息時播放提示音</p>
                </div>
                <a-switch v-model:checked="notificationSettings.sound" />
              </div>
            </div>

            <a-divider />

            <a-button
              type="primary"
              @click="handleSaveNotificationSettings">
              保存設置
            </a-button>
          </a-card>

          <!-- 外觀設置 -->
          <a-card
            v-show="activeTab === 'appearance'"
            title="外觀設置"
            class="settings-panel">
            <div class="appearance-section">
              <div class="setting-group">
                <h4>主題模式</h4>
                <a-radio-group v-model:value="appearanceSettings.theme">
                  <a-radio value="light">淺色模式</a-radio>
                  <a-radio value="dark">深色模式</a-radio>
                  <a-radio value="auto">跟隨系統</a-radio>
                </a-radio-group>
              </div>

              <div class="setting-group">
                <h4>字體大小</h4>
                <a-slider
                  v-model:value="appearanceSettings.fontSize"
                  :min="12"
                  :max="18"
                  :marks="{ 12: '小', 14: '中', 16: '大', 18: '特大' }" />
              </div>

              <div class="setting-group">
                <h4>緊湊模式</h4>
                <a-switch
                  v-model:checked="appearanceSettings.compact"
                  checked-children="開"
                  un-checked-children="關" />
                <p class="setting-description">減少界面間距，顯示更多內容</p>
              </div>
            </div>

            <a-divider />

            <a-button
              type="primary"
              @click="handleSaveAppearanceSettings">
              保存設置
            </a-button>
          </a-card>

          <!-- 聊天設置 -->
          <a-card
            v-show="activeTab === 'chat'"
            title="聊天設置"
            class="settings-panel">
            <div class="chat-section">
              <div class="setting-group">
                <h4>默認 AI 模型</h4>
                <a-select
                  v-model:value="chatSettings.defaultModel"
                  placeholder="選擇默認模型"
                  style="width: 200px">
                  <a-select-option value="ollama:qwen3"
                    >Qwen3 (Ollama)</a-select-option
                  >
                  <a-select-option value="gemini:pro"
                    >Gemini Pro</a-select-option
                  >
                </a-select>
              </div>

              <div class="setting-group">
                <h4>消息發送方式</h4>
                <a-radio-group v-model:value="chatSettings.sendMode">
                  <a-radio value="enter">Enter 發送</a-radio>
                  <a-radio value="ctrl-enter">Ctrl+Enter 發送</a-radio>
                </a-radio-group>
              </div>

              <div class="setting-group">
                <h4>自動保存對話</h4>
                <a-switch
                  v-model:checked="chatSettings.autoSave"
                  checked-children="開"
                  un-checked-children="關" />
                <p class="setting-description">自動保存對話記錄到雲端</p>
              </div>

              <div class="setting-group">
                <h4>顯示輸入狀態</h4>
                <a-switch
                  v-model:checked="chatSettings.showTyping"
                  checked-children="開"
                  un-checked-children="關" />
                <p class="setting-description">向其他用戶顯示您的輸入狀態</p>
              </div>
            </div>

            <a-divider />

            <a-button
              type="primary"
              @click="handleSaveChatSettings">
              保存設置
            </a-button>
          </a-card>
        </a-col>
      </a-row>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from "vue";
import { message } from "ant-design-vue";
import {
  UserOutlined,
  LockOutlined,
  BellOutlined,
  BgColorsOutlined,
  MessageOutlined,
} from "@ant-design/icons-vue";
import { useAuthStore } from "@/store/auth";

const authStore = useAuthStore();

// 響應式數據
const selectedMenuKeys = ref(["profile"]);
const activeTab = ref("profile");
const isUpdatingProfile = ref(false);
const isChangingPassword = ref(false);

// 表單引用
const profileFormRef = ref();
const passwordFormRef = ref();

// 個人資料表單
const profileForm = reactive({
  username: "",
  email: "",
  displayName: "",
  role: "",
  bio: "",
});

// 密碼修改表單
const passwordForm = reactive({
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
});

// 通知設置
const notificationSettings = reactive({
  newMessage: true,
  system: true,
  email: false,
  sound: true,
});

// 外觀設置
const appearanceSettings = reactive({
  theme: "light",
  fontSize: 14,
  compact: false,
});

// 聊天設置
const chatSettings = reactive({
  defaultModel: "ollama:qwen3",
  sendMode: "enter",
  autoSave: true,
  showTyping: true,
});

// 表單驗證規則
const profileRules = {
  email: [
    { required: true, message: "請輸入郵箱", trigger: "blur" },
    { type: "email", message: "請輸入有效的郵箱地址", trigger: "blur" },
  ],
  displayName: [
    { required: true, message: "請輸入顯示名稱", trigger: "blur" },
    { min: 2, max: 50, message: "顯示名稱長度為2-50個字符", trigger: "blur" },
  ],
};

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
const handleMenuClick = ({ key }) => {
  activeTab.value = key;
  selectedMenuKeys.value = [key];
};

const handleUpdateProfile = async (values) => {
  isUpdatingProfile.value = true;
  try {
    const result = await authStore.handleUpdateProfile({
      email: values.email,
      display_name: values.displayName,
      bio: values.bio,
    });

    if (result.success) {
      message.success("個人資料更新成功");
    }
  } catch (error) {
    console.error("更新個人資料失敗:", error);
  } finally {
    isUpdatingProfile.value = false;
  }
};

const handleChangePassword = async (values) => {
  isChangingPassword.value = true;
  try {
    const result = await authStore.handleChangePassword({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
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

const handleSaveNotificationSettings = () => {
  // 保存通知設置到本地存儲或服務器
  localStorage.setItem(
    "notificationSettings",
    JSON.stringify(notificationSettings)
  );
  message.success("通知設置已保存");
};

const handleSaveAppearanceSettings = () => {
  // 保存外觀設置到本地存儲
  localStorage.setItem(
    "appearanceSettings",
    JSON.stringify(appearanceSettings)
  );
  message.success("外觀設置已保存");
};

const handleSaveChatSettings = () => {
  // 保存聊天設置到本地存儲
  localStorage.setItem("chatSettings", JSON.stringify(chatSettings));
  message.success("聊天設置已保存");
};

// 初始化數據
const initializeData = () => {
  // 載入用戶資料
  if (authStore.user) {
    profileForm.username = authStore.user.username;
    profileForm.email = authStore.user.email;
    profileForm.displayName = authStore.user.display_name;
    profileForm.role = authStore.user.role;
    profileForm.bio = authStore.user.bio || "";
  }

  // 載入本地設置
  const savedNotificationSettings = localStorage.getItem(
    "notificationSettings"
  );
  if (savedNotificationSettings) {
    Object.assign(notificationSettings, JSON.parse(savedNotificationSettings));
  }

  const savedAppearanceSettings = localStorage.getItem("appearanceSettings");
  if (savedAppearanceSettings) {
    Object.assign(appearanceSettings, JSON.parse(savedAppearanceSettings));
  }

  const savedChatSettings = localStorage.getItem("chatSettings");
  if (savedChatSettings) {
    Object.assign(chatSettings, JSON.parse(savedChatSettings));
  }
};

onMounted(() => {
  initializeData();
});
</script>

<style scoped>
.settings-container {
  padding: 24px;
  background: #f5f5f5;
  min-height: calc(100vh - 64px);
}

.settings-header {
  margin-bottom: 24px;
}

.settings-title {
  font-size: 28px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: #333;
}

.settings-subtitle {
  color: #666;
  font-size: 16px;
  margin: 0;
}

.settings-content {
  max-width: 1200px;
}

.settings-menu-card {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.settings-menu {
  border: none;
}

.settings-panel {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  min-height: 500px;
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

.notification-section {
  margin-bottom: 24px;
}

.notification-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid #f0f0f0;
}

.notification-item:last-child {
  border-bottom: none;
}

.notification-info h4 {
  margin: 0 0 4px 0;
  color: #333;
  font-weight: 500;
}

.notification-info p {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.appearance-section,
.chat-section {
  margin-bottom: 24px;
}

.setting-group {
  margin-bottom: 24px;
}

.setting-group h4 {
  margin: 0 0 12px 0;
  color: #333;
  font-weight: 500;
}

.setting-description {
  margin: 8px 0 0 0;
  color: #666;
  font-size: 14px;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .settings-container {
    padding: 16px;
  }

  .settings-title {
    font-size: 24px;
  }
}

/* 表單樣式優化 */
:deep(.ant-form-item-label > label) {
  font-weight: 500;
  color: #333;
}

:deep(.ant-card-head-title) {
  font-weight: 600;
  color: #333;
}

:deep(.ant-menu-item-selected) {
  background-color: #e6f7ff;
  border-radius: 6px;
}
</style>
