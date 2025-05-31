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
              <a-select-option value="general">通用</a-select-option>
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
                    :src="agent.avatar"
                    :style="{
                      backgroundColor: agent.avatar ? 'transparent' : '#1890ff',
                    }">
                    <template #icon>
                      <RobotOutlined v-if="!agent.avatar" />
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
                :title="agent.display_name || agent.name"
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
                  <span class="stat-value">{{ agent.usage_count || 0 }}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">評分:</span>
                  <a-rate
                    :value="agent.rating || 0"
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
          :current="pagination.page"
          :page-size="pagination.limit"
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
        <!-- 頭像上傳 -->
        <a-form-item label="智能體頭像">
          <div class="avatar-upload-section">
            <div class="avatar-preview">
              <a-avatar
                :size="80"
                :src="avatarPreview || formData.avatar">
                <template #icon>
                  <RobotOutlined v-if="!avatarPreview && !formData.avatar" />
                </template>
              </a-avatar>
            </div>

            <div class="avatar-upload-controls">
              <a-upload
                :show-upload-list="false"
                :before-upload="handleBeforeUpload"
                accept="image/*">
                <a-button
                  size="small"
                  :loading="uploadLoading">
                  <UploadOutlined />
                  上傳頭像
                </a-button>
              </a-upload>

              <a-button
                v-if="avatarPreview || formData.avatar"
                type="text"
                size="small"
                danger
                @click="handleRemoveAvatar">
                <DeleteOutlined />
                移除
              </a-button>
            </div>
          </div>

          <div class="avatar-tips">
            <a-typography-text
              type="secondary"
              :style="{ fontSize: '12px' }">
              支持 JPG、PNG 格式，建議尺寸 200x200 像素，文件大小不超過 2MB
            </a-typography-text>
          </div>
        </a-form-item>

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
              label="顯示名稱"
              name="display_name">
              <a-input
                v-model:value="formData.display_name"
                placeholder="輸入顯示名稱" />
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item
              label="分類"
              name="category">
              <a-select
                v-model:value="formData.category"
                placeholder="選擇分類">
                <a-select-option value="general">通用</a-select-option>
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

        <a-form-item
          label="標籤"
          name="tags">
          <a-select
            v-model:value="formData.tags"
            mode="tags"
            placeholder="輸入標籤，按 Enter 添加"
            style="width: 100%"
            :token-separators="[',']">
          </a-select>
        </a-form-item>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item
              label="能力配置"
              name="capabilities">
              <a-textarea
                v-model:value="formData.capabilities"
                placeholder="輸入JSON格式的能力配置"
                :rows="4" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item
              label="工具配置"
              name="tools">
              <a-textarea
                v-model:value="formData.tools"
                placeholder="輸入JSON格式的工具配置"
                :rows="4" />
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item
              label="啟用狀態"
              name="is_active">
              <a-switch
                v-model:checked="formData.is_active"
                checked-children="啟用"
                un-checked-children="停用" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item
              label="公開狀態"
              name="is_public">
              <a-switch
                v-model:checked="formData.is_public"
                checked-children="公開"
                un-checked-children="私有" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from "vue";
import { message } from "ant-design-vue";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  PlayCircleOutlined,
  UploadOutlined,
  RobotOutlined,
  EditFilled,
  BarChartOutlined,
  CustomerServiceOutlined,
} from "@ant-design/icons-vue";
import { useAdminAgentsStore } from "@/stores/adminAgents";
import { smartCompressImage, validateImage } from "@/utils/imageCompress";

// Store
const adminAgentsStore = useAdminAgentsStore();

// 響應式數據
const searchText = ref("");
const filterCategory = ref();
const filterStatus = ref();
const modalVisible = ref(false);
const formRef = ref();
const uploadLoading = ref(false);
const avatarPreview = ref(null);

// 分頁
const pagination = computed(() => adminAgentsStore.getPagination);

// 計算屬性
const agents = computed(() => adminAgentsStore.getAllAgents);
const loading = computed(() => adminAgentsStore.isLoading);

// 表單數據
const formData = reactive({
  id: null,
  name: "",
  display_name: "",
  description: "",
  category: "",
  system_prompt: "",
  model_id: "",
  avatar: "",
  tags: [],
  capabilities: {},
  tools: {},
  is_active: true,
  is_public: true,
});

// 表單驗證規則
const formRules = {
  name: [
    { required: true, message: "請輸入智能體名稱" },
    { min: 2, max: 100, message: "智能體名稱長度應在2-100個字符之間" },
  ],
  display_name: [
    { required: true, message: "請輸入顯示名稱" },
    { min: 2, max: 200, message: "顯示名稱長度應在2-200個字符之間" },
  ],
  description: [
    { required: true, message: "請輸入描述" },
    { max: 1000, message: "描述不能超過1000個字符" },
  ],
  system_prompt: [
    { required: true, message: "請輸入系統提示詞" },
    { min: 10, message: "系統提示詞至少需要10個字符" },
  ],
  model_id: [{ required: true, message: "請選擇關聯模型" }],
  category: [{ required: true, message: "請選擇分類" }],
};

// 計算屬性
const modalTitle = computed(() => (formData.id ? "編輯智能體" : "創建智能體"));

const filteredAgents = computed(() => {
  let result = agents.value;

  if (searchText.value) {
    result = result.filter(
      (agent) =>
        (agent.name &&
          agent.name.toLowerCase().includes(searchText.value.toLowerCase())) ||
        (agent.display_name &&
          agent.display_name
            .toLowerCase()
            .includes(searchText.value.toLowerCase())) ||
        (agent.description &&
          agent.description
            .toLowerCase()
            .includes(searchText.value.toLowerCase()))
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
    general: "default",
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
    general: "通用",
    assistant: "通用助手",
    coding: "編程助手",
    writing: "寫作助手",
    analysis: "分析助手",
    customer_service: "客服助手",
  };
  return names[category] || category;
};

const handleSearch = () => {
  adminAgentsStore.fetchAgents({
    page: 1,
    limit: pagination.value.limit,
    category: filterCategory.value,
    is_active: filterStatus.value,
    search: searchText.value,
  });
};

const handleReset = () => {
  searchText.value = "";
  filterCategory.value = undefined;
  filterStatus.value = undefined;

  // 重新獲取數據
  adminAgentsStore.fetchAgents({
    page: 1,
    limit: pagination.value.limit,
  });
};

const handleAddAgent = () => {
  resetForm();
  modalVisible.value = true;
};

const handleEdit = (record) => {
  Object.assign(formData, {
    ...record,
    // 處理 JSON 字段的顯示
    capabilities:
      typeof record.capabilities === "object"
        ? JSON.stringify(record.capabilities, null, 2)
        : record.capabilities || "",
    tools:
      typeof record.tools === "object"
        ? JSON.stringify(record.tools, null, 2)
        : record.tools || "",
    tags: record.tags || [],
  });

  // 如果有頭像數據，設置預覽
  if (record.avatar) {
    avatarPreview.value = null; // 使用原始頭像，不設置預覽
  }
  modalVisible.value = true;
};

const handleClone = async (record) => {
  try {
    await adminAgentsStore.duplicateAgent(record.id);
    message.success("智能體複製成功");
  } catch (error) {
    message.error("複製失敗");
  }
};

const handleDelete = async (record) => {
  try {
    await adminAgentsStore.deleteAgent(record.id);
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
    await adminAgentsStore.updateAgentStatus(record.id, record.is_active);
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
  // 重新獲取數據
  adminAgentsStore.fetchAgents({
    page,
    limit: pageSize,
    category: filterCategory.value,
    is_active: filterStatus.value,
    search: searchText.value,
  });
};

const handleModalOk = async () => {
  try {
    await formRef.value.validate();

    // 準備提交數據
    const submitData = { ...formData };

    // 確保 model_id 是數字類型
    if (submitData.model_id) {
      submitData.model_id = parseInt(submitData.model_id);
    }

    // 如果有新頭像，添加到表單數據中
    if (avatarPreview.value) {
      submitData.avatar = avatarPreview.value;
    }

    // 處理 JSON 字段
    if (typeof submitData.capabilities === "string") {
      try {
        submitData.capabilities = JSON.parse(submitData.capabilities);
      } catch (error) {
        message.error("能力配置 JSON 格式錯誤");
        return;
      }
    }

    if (typeof submitData.tools === "string") {
      try {
        submitData.tools = JSON.parse(submitData.tools);
      } catch (error) {
        message.error("工具配置 JSON 格式錯誤");
        return;
      }
    }

    if (submitData.id) {
      // 編輯智能體
      await adminAgentsStore.updateAgent(submitData.id, submitData);
      message.success("智能體更新成功");
    } else {
      // 創建智能體
      await adminAgentsStore.createAgent(submitData);
      message.success("智能體創建成功");
    }

    modalVisible.value = false;
    resetForm();

    // 重新獲取數據以顯示最新的頭像
    await adminAgentsStore.fetchAgents({
      page: pagination.value.page,
      limit: pagination.value.limit,
      category: filterCategory.value,
      is_active: filterStatus.value,
      search: searchText.value,
    });
  } catch (error) {
    console.error("操作失敗:", error);

    // 顯示詳細的錯誤訊息
    if (error.response?.data?.details) {
      const details = error.response.data.details;
      details.forEach((detail) => {
        message.error(`${detail.path?.join(".")}: ${detail.message}`);
      });
    } else if (error.response?.data?.message) {
      message.error(error.response.data.message);
    } else if (error.message) {
      message.error(error.message);
    } else {
      message.error("操作失敗，請檢查表單內容");
    }
  }
};

const handleModalCancel = () => {
  modalVisible.value = false;
  resetForm();
};

const resetForm = () => {
  Object.assign(formData, {
    id: null,
    name: "",
    display_name: "",
    description: "",
    category: "",
    system_prompt: "",
    model_id: "",
    avatar: "",
    tags: [],
    capabilities: {},
    tools: {},
    is_active: true,
    is_public: true,
  });
  avatarPreview.value = null;
};

// 處理頭像上傳前的驗證
const handleBeforeUpload = async (file) => {
  try {
    // 驗證圖片文件
    const validation = validateImage(file, {
      maxSize: 5 * 1024 * 1024, // 5MB（原始文件限制）
      allowedTypes: ["image/jpeg", "image/png", "image/webp"],
    });

    if (!validation.valid) {
      message.error(validation.error);
      return false;
    }

    uploadLoading.value = true;

    // 使用智能壓縮
    const compressedBase64 = await smartCompressImage(file, {
      targetSize: 50 * 1024, // 目標 50KB
      maxWidth: 300,
      maxHeight: 300,
    });

    avatarPreview.value = compressedBase64;
    uploadLoading.value = false;

    message.success("頭像上傳成功！");
  } catch (error) {
    console.error("頭像處理失敗:", error);
    message.error("頭像處理失敗: " + error.message);
    uploadLoading.value = false;
  }

  return false; // 阻止自動上傳
};

// 移除頭像
const handleRemoveAvatar = () => {
  avatarPreview.value = null;
  formData.avatar = "";
};

// 生命週期
onMounted(async () => {
  try {
    // 初始化智能體數據
    await adminAgentsStore.fetchAgents();
  } catch (error) {
    console.error("載入智能體數據失敗:", error);
    message.error("載入智能體數據失敗");
  }
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

.avatar-upload-section {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  background: #fafafa;
  transition: all 0.3s ease;
}

.avatar-upload-section:hover {
  border-color: #1890ff;
  background: #f0f8ff;
}

.avatar-preview {
  flex-shrink: 0;
}

.avatar-upload-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.avatar-tips {
  margin-top: 8px;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .avatar-upload-section {
    flex-direction: column;
    text-align: center;
  }

  .avatar-upload-controls {
    flex-direction: row;
    justify-content: center;
  }
}
</style>
