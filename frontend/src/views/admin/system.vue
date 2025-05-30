<template>
  <div class="system-page">
    <a-row :gutter="24">
      <!-- 系統信息 -->
      <a-col
        :span="24"
        :lg="12">
        <a-card
          title="系統信息"
          :bordered="false">
          <a-descriptions
            :column="1"
            bordered>
            <a-descriptions-item label="系統版本">
              <a-tag color="blue">v1.6.2</a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="運行時間">
              {{ systemInfo.uptime }}
            </a-descriptions-item>
            <a-descriptions-item label="CPU 使用率">
              <a-progress
                :percent="systemInfo.cpu"
                size="small" />
            </a-descriptions-item>
            <a-descriptions-item label="內存使用率">
              <a-progress
                :percent="systemInfo.memory"
                size="small" />
            </a-descriptions-item>
            <a-descriptions-item label="磁盤使用率">
              <a-progress
                :percent="systemInfo.disk"
                size="small" />
            </a-descriptions-item>
            <a-descriptions-item label="在線用戶">
              {{ systemInfo.onlineUsers }} 人
            </a-descriptions-item>
          </a-descriptions>
        </a-card>
      </a-col>

      <!-- 系統配置 -->
      <a-col
        :span="24"
        :lg="12">
        <a-card
          title="系統配置"
          :bordered="false">
          <template #extra>
            <a-button
              type="primary"
              @click="handleSaveConfig">
              <SaveOutlined />
              保存配置
            </a-button>
          </template>

          <a-form layout="vertical">
            <a-form-item label="系統名稱">
              <a-input v-model:value="config.systemName" />
            </a-form-item>

            <a-form-item label="系統描述">
              <a-textarea
                v-model:value="config.systemDescription"
                :rows="3" />
            </a-form-item>

            <a-form-item label="允許註冊">
              <a-switch v-model:checked="config.allowRegistration" />
            </a-form-item>

            <a-form-item label="郵件通知">
              <a-switch v-model:checked="config.emailNotification" />
            </a-form-item>

            <a-form-item label="最大文件大小 (MB)">
              <a-input-number
                v-model:value="config.maxFileSize"
                :min="1"
                :max="100"
                style="width: 100%" />
            </a-form-item>
          </a-form>
        </a-card>
      </a-col>
    </a-row>

    <!-- 數據庫管理 -->
    <a-row
      :gutter="24"
      style="margin-top: 24px">
      <a-col :span="24">
        <a-card
          title="數據庫管理"
          :bordered="false">
          <a-row :gutter="16">
            <a-col :span="6">
              <a-statistic
                title="總用戶數"
                :value="dbStats.totalUsers" />
            </a-col>
            <a-col :span="6">
              <a-statistic
                title="總對話數"
                :value="dbStats.totalConversations" />
            </a-col>
            <a-col :span="6">
              <a-statistic
                title="總消息數"
                :value="dbStats.totalMessages" />
            </a-col>
            <a-col :span="6">
              <a-statistic
                title="數據庫大小"
                :value="dbStats.dbSize"
                suffix="MB" />
            </a-col>
          </a-row>

          <a-divider />

          <a-space>
            <a-button @click="handleBackupDatabase">
              <DatabaseOutlined />
              備份數據庫
            </a-button>
            <a-button @click="handleOptimizeDatabase">
              <ThunderboltOutlined />
              優化數據庫
            </a-button>
            <a-popconfirm
              title="確定要清理日誌嗎？這將刪除30天前的日誌記錄。"
              @confirm="handleCleanLogs">
              <a-button>
                <ClearOutlined />
                清理日誌
              </a-button>
            </a-popconfirm>
          </a-space>
        </a-card>
      </a-col>
    </a-row>

    <!-- 系統日誌 -->
    <a-row
      :gutter="24"
      style="margin-top: 24px">
      <a-col :span="24">
        <a-card
          title="系統日誌"
          :bordered="false">
          <template #extra>
            <a-space>
              <a-select
                v-model:value="logLevel"
                style="width: 120px">
                <a-select-option value="all">全部</a-select-option>
                <a-select-option value="error">錯誤</a-select-option>
                <a-select-option value="warn">警告</a-select-option>
                <a-select-option value="info">信息</a-select-option>
              </a-select>
              <a-button @click="handleRefreshLogs">
                <ReloadOutlined />
                刷新
              </a-button>
            </a-space>
          </template>

          <div class="log-container">
            <div
              v-for="log in filteredLogs"
              :key="log.id"
              class="log-item"
              :class="log.level">
              <span class="log-time">{{ log.timestamp }}</span>
              <span class="log-level">{{ log.level.toUpperCase() }}</span>
              <span class="log-message">{{ log.message }}</span>
            </div>
          </div>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from "vue";
import { message } from "ant-design-vue";
import {
  SaveOutlined,
  DatabaseOutlined,
  ThunderboltOutlined,
  ClearOutlined,
  ReloadOutlined,
} from "@ant-design/icons-vue";

// 響應式數據
const logLevel = ref("all");

// 系統信息
const systemInfo = reactive({
  uptime: "7天 12小時 30分鐘",
  cpu: 45,
  memory: 68,
  disk: 32,
  onlineUsers: 15,
});

// 系統配置
const config = reactive({
  systemName: "SFDA Nexus",
  systemDescription: "企業 AI 聊天系統",
  allowRegistration: true,
  emailNotification: true,
  maxFileSize: 10,
});

// 數據庫統計
const dbStats = reactive({
  totalUsers: 1250,
  totalConversations: 8960,
  totalMessages: 45230,
  dbSize: 256,
});

// 系統日誌
const logs = ref([
  {
    id: 1,
    timestamp: "2025-01-15 10:30:15",
    level: "info",
    message: "用戶 admin 登入系統",
  },
  {
    id: 2,
    timestamp: "2025-01-15 10:28:42",
    level: "warn",
    message: "AI 模型 GPT-4 響應時間較長 (3.2s)",
  },
  {
    id: 3,
    timestamp: "2025-01-15 10:25:18",
    level: "error",
    message: "數據庫連接超時，已自動重連",
  },
  {
    id: 4,
    timestamp: "2025-01-15 10:20:05",
    level: "info",
    message: "系統備份任務執行成功",
  },
  {
    id: 5,
    timestamp: "2025-01-15 10:15:33",
    level: "info",
    message: "新用戶 user123 註冊成功",
  },
]);

// 計算屬性
const filteredLogs = computed(() => {
  if (logLevel.value === "all") {
    return logs.value;
  }
  return logs.value.filter((log) => log.level === logLevel.value);
});

// 方法
const handleSaveConfig = () => {
  message.success("系統配置保存成功");
};

const handleBackupDatabase = () => {
  message.loading("正在備份數據庫...", 0);
  setTimeout(() => {
    message.destroy();
    message.success("數據庫備份完成");
  }, 3000);
};

const handleOptimizeDatabase = () => {
  message.loading("正在優化數據庫...", 0);
  setTimeout(() => {
    message.destroy();
    message.success("數據庫優化完成");
  }, 2000);
};

const handleCleanLogs = () => {
  message.success("日誌清理完成");
};

const handleRefreshLogs = () => {
  message.success("日誌已刷新");
};

// 生命週期
onMounted(() => {
  // 模擬實時更新系統信息
  setInterval(() => {
    systemInfo.cpu = Math.floor(Math.random() * 100);
    systemInfo.memory = Math.floor(Math.random() * 100);
    systemInfo.onlineUsers = Math.floor(Math.random() * 50) + 10;
  }, 5000);
});
</script>

<style scoped>
.system-page {
  padding: 24px;
}

.log-container {
  max-height: 400px;
  overflow-y: auto;
  background: #f5f5f5;
  border-radius: 4px;
  padding: 12px;
}

.log-item {
  display: flex;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid #e8e8e8;
  font-family: "Monaco", "Menlo", "Ubuntu Mono", monospace;
  font-size: 12px;
}

.log-item:last-child {
  border-bottom: none;
}

.log-time {
  color: #666;
  min-width: 140px;
}

.log-level {
  min-width: 60px;
  font-weight: bold;
}

.log-item.error .log-level {
  color: #ff4d4f;
}

.log-item.warn .log-level {
  color: #faad14;
}

.log-item.info .log-level {
  color: #52c41a;
}

.log-message {
  flex: 1;
  color: #333;
}
</style>
