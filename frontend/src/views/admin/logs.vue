<template>
  <div class="admin-page">
    <a-card
      title="審計日誌"
      :bordered="false">
      <template #extra>
        <a-space>
          <a-button @click="handleRefresh">
            <ReloadOutlined />
            刷新
          </a-button>
          <a-button @click="handleExport">
            <DownloadOutlined />
            導出
          </a-button>
        </a-space>
      </template>

      <!-- 搜索和篩選 -->
      <div class="search-section">
        <a-row :gutter="[16, 16]">
          <a-col
            :xs="24"
            :sm="24"
            :md="6"
            :lg="6"
            :xl="6">
            <a-input-search
              v-model:value="searchText"
              placeholder="搜索用戶名或操作"
              @search="handleSearch"
              allow-clear />
          </a-col>
          <a-col
            :xs="12"
            :sm="12"
            :md="4"
            :lg="4"
            :xl="4">
            <a-select
              v-model:value="filterAction"
              placeholder="操作類型"
              style="width: 100%"
              allow-clear
              @change="handleSearch">
              <a-select-option value="login">登入</a-select-option>
              <a-select-option value="logout">登出</a-select-option>
              <a-select-option value="create">創建</a-select-option>
              <a-select-option value="update">更新</a-select-option>
              <a-select-option value="delete">刪除</a-select-option>
              <a-select-option value="API_ACCESS">API 訪問</a-select-option>
            </a-select>
          </a-col>
          <a-col
            :xs="12"
            :sm="12"
            :md="4"
            :lg="4"
            :xl="4">
            <a-select
              v-model:value="filterUserId"
              placeholder="選擇用戶"
              style="width: 100%"
              allow-clear
              show-search
              :filter-option="filterUserOption"
              @change="handleSearch">
              <a-select-option
                v-for="user in userOptions"
                :key="user.id"
                :value="user.id">
                {{ user.username }} ({{ user.email }})
              </a-select-option>
            </a-select>
          </a-col>
          <a-col
            :xs="12"
            :sm="12"
            :md="5"
            :lg="5"
            :xl="5">
            <a-range-picker
              v-model:value="dateRange"
              style="width: 100%"
              @change="handleDateChange"
              :placeholder="['開始日期', '結束日期']" />
          </a-col>
          <a-col
            :xs="12"
            :sm="12"
            :md="5"
            :lg="5"
            :xl="5">
            <a-space>
              <a-button @click="handleSearch">
                <SearchOutlined />
                搜索
              </a-button>
              <a-button @click="handleReset">重置</a-button>
            </a-space>
          </a-col>
        </a-row>
      </div>

      <!-- 統計信息 -->
      <div class="stats-section">
        <a-row :gutter="16">
          <a-col
            :xs="12"
            :sm="6"
            :md="6"
            :lg="6"
            :xl="6">
            <a-statistic
              title="今日操作"
              :value="stats.todayCount"
              :value-style="{ color: '#1890ff' }" />
          </a-col>
          <a-col
            :xs="12"
            :sm="6"
            :md="6"
            :lg="6"
            :xl="6">
            <a-statistic
              title="本週操作"
              :value="stats.weekCount"
              :value-style="{ color: '#52c41a' }" />
          </a-col>
          <a-col
            :xs="12"
            :sm="6"
            :md="6"
            :lg="6"
            :xl="6">
            <a-statistic
              title="活躍用戶"
              :value="stats.activeUsers"
              :value-style="{ color: '#722ed1' }" />
          </a-col>
          <a-col
            :xs="12"
            :sm="6"
            :md="6"
            :lg="6"
            :xl="6">
            <a-statistic
              title="總記錄數"
              :value="pagination.total"
              :value-style="{ color: '#fa8c16' }" />
          </a-col>
        </a-row>
      </div>

      <!-- 審計日誌表格 -->
      <a-table
        :columns="columns"
        :data-source="logs"
        :loading="loading"
        :pagination="pagination"
        :scroll="{ x: 1200 }"
        @change="handleTableChange"
        row-key="id">
        <!-- 用戶信息 -->
        <template #user="{ record }">
          <div v-if="record.username">
            <a-avatar
              size="small"
              :style="{ backgroundColor: getUserColor(record.username) }">
              {{ record.username.charAt(0).toUpperCase() }}
            </a-avatar>
            <span style="margin-left: 8px">{{ record.username }}</span>
          </div>
          <span
            v-else
            class="text-muted"
            >系統</span
          >
        </template>

        <!-- 操作類型 -->
        <template #action="{ record }">
          <a-tag :color="getActionColor(record.action)">
            {{ getActionLabel(record.action) }}
          </a-tag>
        </template>

        <!-- IP 地址 -->
        <template #ip="{ record }">
          <span v-if="record.ip_address">{{ record.ip_address }}</span>
          <span
            v-else
            class="text-muted"
            >-</span
          >
        </template>

        <!-- 操作詳情 -->
        <template #details="{ record }">
          <a-button
            type="link"
            size="small"
            @click="showDetails(record)">
            查看詳情
          </a-button>
        </template>

        <!-- 時間 -->
        <template #time="{ record }">
          <div>
            <div>{{ formatDate(record.created_at) }}</div>
            <small class="text-muted">{{
              formatTime(record.created_at)
            }}</small>
          </div>
        </template>
      </a-table>
    </a-card>

    <!-- 詳情模態框 -->
    <a-modal
      v-model:open="detailModalVisible"
      title="操作詳情"
      :width="800"
      :footer="null">
      <div v-if="selectedLog">
        <a-descriptions
          :column="1"
          bordered>
          <a-descriptions-item label="操作用戶">
            <div v-if="selectedLog.username">
              <a-avatar
                size="small"
                :style="{
                  backgroundColor: getUserColor(selectedLog.username),
                }">
                {{ selectedLog.username.charAt(0).toUpperCase() }}
              </a-avatar>
              <span style="margin-left: 8px">
                {{ selectedLog.username }} ({{ selectedLog.email }})
              </span>
            </div>
            <span v-else>系統操作</span>
          </a-descriptions-item>
          <a-descriptions-item label="操作類型">
            <a-tag :color="getActionColor(selectedLog.action)">
              {{ getActionLabel(selectedLog.action) }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="IP 地址">
            {{ selectedLog.ip_address || "-" }}
          </a-descriptions-item>
          <a-descriptions-item label="用戶代理">
            <div style="word-break: break-all; max-width: 500px">
              {{ selectedLog.user_agent || "-" }}
            </div>
          </a-descriptions-item>
          <a-descriptions-item label="操作時間">
            {{ formatDateTime(selectedLog.created_at) }}
          </a-descriptions-item>
        </a-descriptions>

        <a-divider>操作詳情</a-divider>

        <div v-if="selectedLog.details">
          <JsonViewer :data="selectedLog.details" />
        </div>
        <div
          v-else
          class="text-muted">
          無詳細信息
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from "vue";
import { message } from "ant-design-vue";
import { getAuditLogs } from "@/api/system";
import { getUsers } from "@/api/users";
import JsonViewer from "@/components/common/JsonViewer.vue";
import dayjs from "dayjs";
import {
  ReloadOutlined,
  DownloadOutlined,
  SearchOutlined,
} from "@ant-design/icons-vue";

// 響應式數據
const loading = ref(false);
const searchText = ref("");
const filterAction = ref(undefined);
const filterUserId = ref(undefined);
const dateRange = ref([]);
const detailModalVisible = ref(false);
const selectedLog = ref(null);

// 用戶選項
const userOptions = ref([]);

// 統計數據
const stats = reactive({
  todayCount: 0,
  weekCount: 0,
  activeUsers: 0,
});

// 響應式斷點
const isSmallScreen = ref(false);

// 監聽螢幕大小變化
const updateScreenSize = () => {
  isSmallScreen.value = window.innerWidth < 768;
};

onMounted(() => {
  updateScreenSize();
  window.addEventListener("resize", updateScreenSize);
});

// 表格配置
const columns = computed(() => {
  const baseColumns = [
    {
      title: "用戶",
      key: "user",
      slots: { customRender: "user" },
      width: 150,
      fixed: isSmallScreen.value ? "left" : undefined,
    },
    {
      title: "操作",
      key: "action",
      slots: { customRender: "action" },
      width: 120,
    },
    {
      title: "IP 地址",
      key: "ip_address",
      slots: { customRender: "ip" },
      width: 130,
      responsive: ["md", "lg", "xl"],
    },
    {
      title: "時間",
      key: "created_at",
      slots: { customRender: "time" },
      width: 150,
      sorter: true,
    },
    {
      title: "詳情",
      key: "details",
      slots: { customRender: "details" },
      width: 80,
      fixed: "right",
    },
  ];

  return baseColumns;
});

// 分頁配置
const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (total) => `共 ${total} 條記錄`,
});

// 審計日誌數據
const logs = ref([]);

// 方法

/**
 * 獲取審計日誌
 */
const fetchLogs = async () => {
  loading.value = true;
  try {
    const params = {
      page: pagination.current,
      limit: pagination.pageSize,
      sortOrder: "DESC",
    };

    // 添加搜索參數
    if (searchText.value) {
      params.search = searchText.value;
    }
    if (filterAction.value) {
      params.action = filterAction.value;
    }
    if (filterUserId.value) {
      params.user_id = filterUserId.value;
    }
    if (dateRange.value && dateRange.value.length === 2) {
      params.start_date = dateRange.value[0].format("YYYY-MM-DD");
      params.end_date = dateRange.value[1].format("YYYY-MM-DD");
    }

    const response = await getAuditLogs(params);
    logs.value = response.data.data || [];
    pagination.total = response.data.pagination?.total || 0;

    // 更新統計數據
    updateStats();
  } catch (error) {
    console.error("獲取審計日誌失敗:", error);
    message.error("獲取審計日誌失敗");
  } finally {
    loading.value = false;
  }
};

/**
 * 獲取用戶列表（用於篩選）
 */
const fetchUsers = async () => {
  try {
    const response = await getUsers({ limit: 1000 });
    userOptions.value = response.data.data || [];
  } catch (error) {
    console.error("獲取用戶列表失敗:", error);
  }
};

/**
 * 更新統計數據
 */
const updateStats = () => {
  const today = dayjs().format("YYYY-MM-DD");
  const weekStart = dayjs().subtract(7, "day").format("YYYY-MM-DD");

  stats.todayCount = logs.value.filter(
    (log) => dayjs(log.created_at).format("YYYY-MM-DD") === today
  ).length;

  stats.weekCount = logs.value.filter((log) =>
    dayjs(log.created_at).isAfter(weekStart)
  ).length;

  const uniqueUsers = new Set(
    logs.value.map((log) => log.user_id).filter(Boolean)
  );
  stats.activeUsers = uniqueUsers.size;
};

const handleSearch = () => {
  pagination.current = 1;
  fetchLogs();
};

const handleReset = () => {
  searchText.value = "";
  filterAction.value = undefined;
  filterUserId.value = undefined;
  dateRange.value = [];
  pagination.current = 1;
  fetchLogs();
};

const handleRefresh = () => {
  fetchLogs();
  message.success("已刷新");
};

const handleExport = () => {
  message.info("導出功能開發中");
};

const handleTableChange = (pag, filters, sorter) => {
  pagination.current = pag.current;
  pagination.pageSize = pag.pageSize;
  fetchLogs();
};

const handleDateChange = () => {
  handleSearch();
};

const showDetails = (record) => {
  selectedLog.value = record;
  detailModalVisible.value = true;
};

// 用戶篩選
const filterUserOption = (input, option) => {
  const user = userOptions.value.find((u) => u.id === option.value);
  if (!user) return false;
  return (
    user.username.toLowerCase().includes(input.toLowerCase()) ||
    user.email.toLowerCase().includes(input.toLowerCase())
  );
};

// 工具函數
const getUserColor = (username) => {
  const colors = ["#f56a00", "#7265e6", "#ffbf00", "#00a2ae", "#87d068"];
  const index = username.charCodeAt(0) % colors.length;
  return colors[index];
};

const getActionColor = (action) => {
  const colorMap = {
    login: "green",
    logout: "orange",
    create: "blue",
    update: "purple",
    delete: "red",
    API_ACCESS: "cyan",
  };
  return colorMap[action] || "default";
};

const getActionLabel = (action) => {
  const labelMap = {
    login: "登入",
    logout: "登出",
    create: "創建",
    update: "更新",
    delete: "刪除",
    API_ACCESS: "API 訪問",
    create_admin: "創建管理員",
  };
  return labelMap[action] || action;
};

const formatDate = (dateStr) => {
  return dayjs(dateStr).format("YYYY-MM-DD");
};

const formatTime = (dateStr) => {
  return dayjs(dateStr).format("HH:mm:ss");
};

const formatDateTime = (dateStr) => {
  return dayjs(dateStr).format("YYYY-MM-DD HH:mm:ss");
};

// 生命週期
onMounted(() => {
  fetchLogs();
  fetchUsers();
});
</script>

<style scoped>
.search-section {
  margin-bottom: 16px;
}

.stats-section {
  margin-bottom: 24px;
  padding: 16px;
  background: var(--custom-bg-secondary);
  border-radius: var(--border-radius-base);
}

.text-muted {
  color: var(--custom-text-tertiary);
}

/* 響應式設計 */
@media (max-width: 768px) {
  .search-section .ant-col {
    margin-bottom: 8px;
  }

  .stats-section .ant-col {
    margin-bottom: 16px;
  }
}
</style>
