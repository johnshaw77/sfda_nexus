<template>
  <div class="agents-page">
    <a-card
      title="智能體管理"
      :bordered="false">
      <template #extra>
        <a-space>
          <a-button @click="handleImport">
            <UploadOutlined />
            導入智能體
          </a-button>
          <a-button
            type="primary"
            @click="handleAddAgent">
            <PlusOutlined />
            創建智能體
          </a-button>
        </a-space>
      </template>

      <!-- 搜索和篩選 -->
      <div class="search-section">
        <a-row :gutter="16">
          <a-col :span="8">
            <a-input-search
              v-model:value="searchText"
              placeholder="搜索智能體名稱或描述"
              @search="handleSearch"
              allow-clear />
          </a-col>
          <a-col :span="6">
            <a-select
              v-model:value="filterCategory"
              placeholder="選擇分類"
              style="width: 100%"
              allow-clear>
              <a-select-option value="assistant">通用助手</a-select-option>
              <a-select-option value="coding">編程助手</a-select-option>
              <a-select-option value="writing">寫作助手</a-select-option>
              <a-select-option value="analysis">分析助手</a-select-option>
              <a-select-option value="customer_service"
                >客服助手</a-select-option
              >
            </a-select>
          </a-col>
          <a-col :span="6">
            <a-select
              v-model:value="filterStatus"
              placeholder="選擇狀態"
              style="width: 100%"
              allow-clear>
              <a-select-option value="active">啟用</a-select-option>
              <a-select-option value="inactive">停用</a-select-option>
            </a-select>
          </a-col>
          <a-col :span="4">
            <a-button @click="handleReset">重置</a-button>
          </a-col>
        </a-row>
      </div>

      <!-- 智能體卡片列表 -->
      <div class="agents-grid">
        <a-row :gutter="[24, 24]">
          <a-col
            v-for="agent in filteredAgents"
            :key="agent.id"
            :xs="24"
            :sm="12"
            :md="8"
            :lg="6">
            <a-card
              hoverable
              class="agent-card"
              :class="{ disabled: !agent.is_active }">
              <!-- 卡片頭部 -->
              <template #cover>
                <div class="agent-avatar">
                  <a-avatar
                    :size="64"
                    :style="{ backgroundColor: agent.avatar_color }">
                    <template #icon>
                      <component :is="agent.avatar_icon" />
                    </template>
                  </a-avatar>
                </div>
              </template>

              <!-- 卡片操作 -->
              <template #actions>
                <a-tooltip title="編輯">
                  <EditOutlined @click="handleEdit(agent)" />
                </a-tooltip>
                <a-tooltip title="複製">
                  <CopyOutlined @click="handleClone(agent)" />
                </a-tooltip>
                <a-tooltip title="測試">
                  <PlayCircleOutlined @click="handleTest(agent)" />
                </a-tooltip>
                <a-popconfirm
                  title="確定要刪除這個智能體嗎？"
                  @confirm="handleDelete(agent)">
                  <a-tooltip title="刪除">
                    <DeleteOutlined />
                  </a-tooltip>
                </a-popconfirm>
              </template>

              <!-- 卡片內容 -->
              <a-card-meta
                :title="agent.name"
                :description="agent.description">
                <template #avatar>
                  <a-tag :color="getCategoryColor(agent.category)">
                    {{ getCategoryName(agent.category) }}
                  </a-tag>
                </template>
              </a-card-meta>

              <!-- 狀態和統計 -->
              <div class="agent-stats">
                <div class="stat-item">
                  <span class="stat-label">使用次數:</span>
                  <span class="stat-value">{{ agent.usage_count }}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">評分:</span>
                  <a-rate
                    :value="agent.rating"
                    :disabled="true"
                    :count="5"
                    style="font-size: 12px" />
                </div>
                <div class="stat-item">
                  <span class="stat-label">狀態:</span>
                  <a-switch
                    v-model:checked="agent.is_active"
                    size="small"
                    :loading="agent.updating"
                    @change="handleStatusChange(agent)" />
                </div>
              </div>
            </a-card>
          </a-col>
        </a-row>
      </div>

      <!-- 分頁 -->
      <div class="pagination-wrapper">
        <a-pagination
          v-model:current="pagination.current"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :show-size-changer="true"
          :show-quick-jumper="true"
          :show-total="(total) => `共 ${total} 個智能體`"
          @change="handlePageChange" />
      </div>
    </a-card>

    <!-- 創建/編輯智能體對話框 -->
    <a-modal
      v-model:open="modalVisible"
      :title="modalTitle"
      :width="800"
      @ok="handleModalOk"
      @cancel="handleModalCancel">
      <a-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        layout="vertical">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item
              label="智能體名稱"
              name="name">
              <a-input
                v-model:value="formData.name"
                placeholder="輸入智能體名稱" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item
              label="分類"
              name="category">
              <a-select
                v-model:value="formData.category"
                placeholder="選擇分類">
                <a-select-option value="assistant">通用助手</a-select-option>
                <a-select-option value="coding">編程助手</a-select-option>
                <a-select-option value="writing">寫作助手</a-select-option>
                <a-select-option value="analysis">分析助手</a-select-option>
                <a-select-option value="customer_service"
                  >客服助手</a-select-option
                >
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item
          label="描述"
          name="description">
          <a-textarea
            v-model:value="formData.description"
            placeholder="輸入智能體描述"
            :rows="3" />
        </a-form-item>

        <a-form-item
          label="系統提示詞"
          name="system_prompt">
          <a-textarea
            v-model:value="formData.system_prompt"
            placeholder="輸入系統提示詞，定義智能體的行為和角色"
            :rows="6" />
        </a-form-item>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item
              label="關聯模型"
              name="model_id">
              <a-select
                v-model:value="formData.model_id"
                placeholder="選擇AI模型">
                <a-select-option value="1">GPT-4</a-select-option>
                <a-select-option value="2">Gemini Pro</a-select-option>
                <a-select-option value="3">Claude 3</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item
              label="頭像顏色"
              name="avatar_color">
              <a-input
                v-model:value="formData.avatar_color"
                type="color" />
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item
          label="配置參數"
          name="config">
          <a-textarea
            v-model:value="formData.config"
            placeholder="輸入JSON格式的配置參數"
            :rows="4" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from "vue";
import { message } from "ant-design-vue";
import {
  PlusOutlined,
  UploadOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  PlayCircleOutlined,
  RobotOutlined,
  CodeOutlined,
  EditFilled,
  BarChartOutlined,
  CustomerServiceOutlined,
} from "@ant-design/icons-vue";

// 響應式數據
const searchText = ref("");
const filterCategory = ref(undefined);
const filterStatus = ref(undefined);
const modalVisible = ref(false);
const formRef = ref();

// 分頁配置
const pagination = reactive({
  current: 1,
  pageSize: 12,
  total: 0,
});

// 模擬數據
const agents = ref([
  {
    id: 1,
    name: "編程助手",
    description: "專業的代碼編寫和調試助手，精通多種編程語言",
    category: "coding",
    system_prompt: "你是一個專業的編程助手，擅長代碼編寫、調試和優化...",
    model_id: "1",
    avatar_color: "#52c41a",
    avatar_icon: "CodeOutlined",
    is_active: true,
    usage_count: 1250,
    rating: 4.8,
    config: '{"temperature": 0.3, "max_tokens": 2048}',
    created_at: "2025-01-15 10:30:00",
    updating: false,
  },
  {
    id: 2,
    name: "寫作助手",
    description: "創意寫作和文案編輯的專業助手",
    category: "writing",
    system_prompt: "你是一個專業的寫作助手，擅長創意寫作、文案編輯...",
    model_id: "2",
    avatar_color: "#1890ff",
    avatar_icon: "EditFilled",
    is_active: true,
    usage_count: 890,
    rating: 4.6,
    config: '{"temperature": 0.8, "max_tokens": 1024}',
    created_at: "2025-01-14 15:20:00",
    updating: false,
  },
  {
    id: 3,
    name: "數據分析師",
    description: "專業的數據分析和可視化助手",
    category: "analysis",
    system_prompt: "你是一個專業的數據分析師，擅長數據處理和分析...",
    model_id: "1",
    avatar_color: "#722ed1",
    avatar_icon: "BarChartOutlined",
    is_active: false,
    usage_count: 456,
    rating: 4.5,
    config: '{"temperature": 0.5, "max_tokens": 1536}',
    created_at: "2025-01-13 09:15:00",
    updating: false,
  },
  {
    id: 4,
    name: "客服助手",
    description: "友善的客戶服務助手，提供專業的客戶支持",
    category: "customer_service",
    system_prompt: "你是一個友善的客服助手，專門處理客戶問題...",
    model_id: "3",
    avatar_color: "#fa8c16",
    avatar_icon: "CustomerServiceOutlined",
    is_active: true,
    usage_count: 2340,
    rating: 4.9,
    config: '{"temperature": 0.7, "max_tokens": 1024}',
    created_at: "2025-01-12 14:45:00",
    updating: false,
  },
]);

// 表單數據
const formData = reactive({
  id: null,
  name: "",
  description: "",
  category: "",
  system_prompt: "",
  model_id: "",
  avatar_color: "#1890ff",
  config: "",
});

// 表單驗證規則
const formRules = {
  name: [{ required: true, message: "請輸入智能體名稱" }],
  category: [{ required: true, message: "請選擇分類" }],
  description: [{ required: true, message: "請輸入描述" }],
  system_prompt: [{ required: true, message: "請輸入系統提示詞" }],
  model_id: [{ required: true, message: "請選擇關聯模型" }],
};

// 計算屬性
const modalTitle = computed(() => (formData.id ? "編輯智能體" : "創建智能體"));

const filteredAgents = computed(() => {
  let result = agents.value;

  if (searchText.value) {
    result = result.filter(
      (agent) =>
        agent.name.toLowerCase().includes(searchText.value.toLowerCase()) ||
        agent.description.toLowerCase().includes(searchText.value.toLowerCase())
    );
  }

  if (filterCategory.value) {
    result = result.filter((agent) => agent.category === filterCategory.value);
  }

  if (filterStatus.value) {
    const isActive = filterStatus.value === "active";
    result = result.filter((agent) => agent.is_active === isActive);
  }

  return result;
});

// 方法
const getCategoryColor = (category) => {
  const colors = {
    assistant: "blue",
    coding: "green",
    writing: "purple",
    analysis: "orange",
    customer_service: "cyan",
  };
  return colors[category] || "default";
};

const getCategoryName = (category) => {
  const names = {
    assistant: "通用助手",
    coding: "編程助手",
    writing: "寫作助手",
    analysis: "分析助手",
    customer_service: "客服助手",
  };
  return names[category] || category;
};

const handleSearch = () => {
  console.log("搜索:", searchText.value);
};

const handleReset = () => {
  searchText.value = "";
  filterCategory.value = undefined;
  filterStatus.value = undefined;
};

const handleAddAgent = () => {
  resetForm();
  modalVisible.value = true;
};

const handleEdit = (record) => {
  Object.assign(formData, record);
  modalVisible.value = true;
};

const handleClone = (record) => {
  Object.assign(formData, {
    ...record,
    id: null,
    name: `${record.name} (副本)`,
    usage_count: 0,
    rating: 0,
  });
  modalVisible.value = true;
};

const handleDelete = async (record) => {
  try {
    const index = agents.value.findIndex((a) => a.id === record.id);
    if (index > -1) {
      agents.value.splice(index, 1);
    }
    message.success("智能體刪除成功");
  } catch (error) {
    message.error("刪除失敗");
  }
};

const handleTest = (record) => {
  message.info(`正在測試智能體: ${record.name}`);
  // 這裡可以打開測試對話框
};

const handleStatusChange = async (record) => {
  record.updating = true;
  try {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    message.success(`智能體已${record.is_active ? "啟用" : "停用"}`);
  } catch (error) {
    record.is_active = !record.is_active;
    message.error("狀態更新失敗");
  } finally {
    record.updating = false;
  }
};

const handleImport = () => {
  message.info("智能體導入功能開發中");
};

const handlePageChange = (page, pageSize) => {
  pagination.current = page;
  pagination.pageSize = pageSize;
};

const handleModalOk = async () => {
  try {
    await formRef.value.validate();

    if (formData.id) {
      // 編輯智能體
      const index = agents.value.findIndex((a) => a.id === formData.id);
      if (index > -1) {
        agents.value[index] = { ...formData };
      }
      message.success("智能體更新成功");
    } else {
      // 創建智能體
      const newAgent = {
        ...formData,
        id: Date.now(),
        is_active: true,
        usage_count: 0,
        rating: 0,
        avatar_icon: "RobotOutlined",
        created_at: new Date().toLocaleString("zh-CN"),
        updating: false,
      };
      agents.value.unshift(newAgent);
      message.success("智能體創建成功");
    }

    modalVisible.value = false;
  } catch (error) {
    console.error("表單驗證失敗:", error);
  }
};

const handleModalCancel = () => {
  modalVisible.value = false;
};

const resetForm = () => {
  Object.assign(formData, {
    id: null,
    name: "",
    description: "",
    category: "",
    system_prompt: "",
    model_id: "",
    avatar_color: "#1890ff",
    config: "",
  });
};

// 生命週期
onMounted(() => {
  pagination.total = agents.value.length;
});
</script>

<style scoped>
.agents-page {
  padding: 24px;
}

.search-section {
  margin-bottom: 24px;
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
}

.agents-grid {
  margin-bottom: 24px;
}

.agent-card {
  height: 100%;
  transition: all 0.3s;
}

.agent-card.disabled {
  opacity: 0.6;
}

.agent-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.agent-avatar {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 120px;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.agent-stats {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 12px;
  color: #666;
}

.stat-value {
  font-size: 12px;
  font-weight: 600;
  color: #1890ff;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 24px;
}
</style>
