<template>
  <div class="admin-page">
    <a-card
      title="AI 模型管理"
      :bordered="false">
      <template #extra>
        <a-button
          type="primary"
          @click="handleAddModel">
          <PlusOutlined />
          添加模型
        </a-button>
      </template>

      <!-- 搜索和篩選 -->
      <div class="search-section">
        <a-row :gutter="16">
          <a-col :span="8">
            <a-input-search
              v-model:value="searchText"
              placeholder="搜索模型名稱或提供商"
              @search="handleSearch"
              allow-clear />
          </a-col>
          <a-col :span="6">
            <a-select
              v-model:value="filterProvider"
              placeholder="選擇提供商"
              style="width: 100%"
              allow-clear>
              <a-select-option value="openai">OpenAI</a-select-option>
              <a-select-option value="gemini">Google Gemini</a-select-option>
              <a-select-option value="claude">Anthropic Claude</a-select-option>
              <a-select-option value="ollama">Ollama</a-select-option>
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

      <!-- 模型列表 -->
      <a-table
        :columns="columns"
        :data-source="filteredModels"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        @change="handleTableChange">
        <!-- 提供商列 -->
        <template #provider="{ record }">
          <a-tag :color="getProviderColor(record.provider)">
            {{ getProviderName(record.provider) }}
          </a-tag>
        </template>

        <!-- 狀態列 -->
        <template #status="{ record }">
          <a-switch
            v-model:checked="record.is_active"
            :loading="record.updating"
            @change="handleStatusChange(record)" />
        </template>

        <!-- 配置列 -->
        <template #config="{ record }">
          <a-tooltip title="查看配置">
            <a-button
              type="text"
              size="small"
              @click="handleViewConfig(record)">
              <EyeOutlined />
            </a-button>
          </a-tooltip>
        </template>

        <!-- 操作列 -->
        <template #action="{ record }">
          <a-space>
            <a-button
              type="text"
              size="small"
              @click="handleEdit(record)">
              <EditOutlined />
              編輯
            </a-button>
            <a-button
              type="text"
              size="small"
              @click="handleTest(record)">
              <PlayCircleOutlined />
              測試
            </a-button>
            <a-popconfirm
              title="確定要刪除這個模型嗎？"
              @confirm="handleDelete(record)">
              <a-button
                type="text"
                size="small"
                danger>
                <DeleteOutlined />
                刪除
              </a-button>
            </a-popconfirm>
          </a-space>
        </template>
      </a-table>
    </a-card>

    <!-- 添加/編輯模型對話框 -->
    <a-modal
      v-model:open="modalVisible"
      :title="modalTitle"
      :width="600"
      @ok="handleModalOk"
      @cancel="handleModalCancel">
      <a-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        layout="vertical">
        <a-form-item
          label="模型名稱"
          name="name">
          <a-input
            v-model:value="formData.name"
            placeholder="輸入模型名稱" />
        </a-form-item>

        <a-form-item
          label="提供商"
          name="provider">
          <a-select
            v-model:value="formData.provider"
            placeholder="選擇提供商">
            <a-select-option value="openai">OpenAI</a-select-option>
            <a-select-option value="gemini">Google Gemini</a-select-option>
            <a-select-option value="claude">Anthropic Claude</a-select-option>
            <a-select-option value="ollama">Ollama</a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item
          label="模型ID"
          name="model_id">
          <a-input
            v-model:value="formData.model_id"
            placeholder="輸入模型ID" />
        </a-form-item>

        <a-form-item
          label="API 端點"
          name="api_endpoint">
          <a-input
            v-model:value="formData.api_endpoint"
            placeholder="輸入API端點URL" />
        </a-form-item>

        <a-form-item
          label="API 密鑰"
          name="api_key">
          <a-input-password
            v-model:value="formData.api_key"
            placeholder="輸入API密鑰" />
        </a-form-item>

        <a-form-item
          label="描述"
          name="description">
          <a-textarea
            v-model:value="formData.description"
            placeholder="輸入模型描述"
            :rows="3" />
        </a-form-item>

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

    <!-- 配置查看對話框 -->
    <a-modal
      v-model:open="configModalVisible"
      title="模型配置"
      :footer="null"
      :width="500">
      <pre class="config-display">{{ selectedConfig }}</pre>
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
  EyeOutlined,
  PlayCircleOutlined,
} from "@ant-design/icons-vue";

// 響應式數據
const loading = ref(false);
const searchText = ref("");
const filterProvider = ref(undefined);
const filterStatus = ref(undefined);
const modalVisible = ref(false);
const configModalVisible = ref(false);
const selectedConfig = ref("");
const formRef = ref();

// 表格配置
const columns = [
  {
    title: "模型名稱",
    dataIndex: "name",
    key: "name",
    sorter: true,
  },
  {
    title: "提供商",
    dataIndex: "provider",
    key: "provider",
    slots: { customRender: "provider" },
  },
  {
    title: "模型ID",
    dataIndex: "model_id",
    key: "model_id",
  },
  {
    title: "狀態",
    dataIndex: "is_active",
    key: "is_active",
    slots: { customRender: "status" },
  },
  {
    title: "配置",
    key: "config",
    slots: { customRender: "config" },
  },
  {
    title: "創建時間",
    dataIndex: "created_at",
    key: "created_at",
    sorter: true,
  },
  {
    title: "操作",
    key: "action",
    slots: { customRender: "action" },
  },
];

// 分頁配置
const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (total) => `共 ${total} 條記錄`,
});

// 模擬數據
const models = ref([
  {
    id: 1,
    name: "GPT-4",
    provider: "openai",
    model_id: "gpt-4",
    api_endpoint: "https://api.openai.com/v1",
    is_active: true,
    description: "OpenAI GPT-4 模型",
    config: '{"temperature": 0.7, "max_tokens": 2048}',
    created_at: "2025-01-15 10:30:00",
    updating: false,
  },
  {
    id: 2,
    name: "Gemini Pro",
    provider: "gemini",
    model_id: "gemini-pro",
    api_endpoint: "https://generativelanguage.googleapis.com/v1",
    is_active: true,
    description: "Google Gemini Pro 模型",
    config: '{"temperature": 0.8, "max_tokens": 1024}',
    created_at: "2025-01-14 15:20:00",
    updating: false,
  },
  {
    id: 3,
    name: "Claude 3",
    provider: "claude",
    model_id: "claude-3-sonnet",
    api_endpoint: "https://api.anthropic.com/v1",
    is_active: false,
    description: "Anthropic Claude 3 模型",
    config: '{"temperature": 0.6, "max_tokens": 4096}',
    created_at: "2025-01-13 09:15:00",
    updating: false,
  },
]);

// 表單數據
const formData = reactive({
  id: null,
  name: "",
  provider: "",
  model_id: "",
  api_endpoint: "",
  api_key: "",
  description: "",
  config: "",
});

// 表單驗證規則
const formRules = {
  name: [{ required: true, message: "請輸入模型名稱" }],
  provider: [{ required: true, message: "請選擇提供商" }],
  model_id: [{ required: true, message: "請輸入模型ID" }],
  api_endpoint: [{ required: true, message: "請輸入API端點" }],
};

// 計算屬性
const modalTitle = computed(() => (formData.id ? "編輯模型" : "添加模型"));

const filteredModels = computed(() => {
  let result = models.value;

  if (searchText.value) {
    result = result.filter(
      (model) =>
        model.name.toLowerCase().includes(searchText.value.toLowerCase()) ||
        model.provider.toLowerCase().includes(searchText.value.toLowerCase())
    );
  }

  if (filterProvider.value) {
    result = result.filter((model) => model.provider === filterProvider.value);
  }

  if (filterStatus.value) {
    const isActive = filterStatus.value === "active";
    result = result.filter((model) => model.is_active === isActive);
  }

  return result;
});

// 方法
const getProviderColor = (provider) => {
  const colors = {
    openai: "green",
    gemini: "blue",
    claude: "orange",
    ollama: "purple",
  };
  return colors[provider] || "default";
};

const getProviderName = (provider) => {
  const names = {
    openai: "OpenAI",
    gemini: "Google",
    claude: "Anthropic",
    ollama: "Ollama",
  };
  return names[provider] || provider;
};

const handleSearch = () => {
  // 搜索邏輯
  console.log("搜索:", searchText.value);
};

const handleReset = () => {
  searchText.value = "";
  filterProvider.value = undefined;
  filterStatus.value = undefined;
};

const handleAddModel = () => {
  resetForm();
  modalVisible.value = true;
};

const handleEdit = (record) => {
  Object.assign(formData, record);
  modalVisible.value = true;
};

const handleDelete = async (record) => {
  try {
    // 這裡應該調用API刪除模型
    const index = models.value.findIndex((m) => m.id === record.id);
    if (index > -1) {
      models.value.splice(index, 1);
    }
    message.success("模型刪除成功");
  } catch (error) {
    message.error("刪除失敗");
  }
};

const handleStatusChange = async (record) => {
  record.updating = true;
  try {
    // 這裡應該調用API更新狀態
    await new Promise((resolve) => setTimeout(resolve, 1000));
    message.success(`模型已${record.is_active ? "啟用" : "停用"}`);
  } catch (error) {
    record.is_active = !record.is_active;
    message.error("狀態更新失敗");
  } finally {
    record.updating = false;
  }
};

const handleViewConfig = (record) => {
  try {
    selectedConfig.value = JSON.stringify(JSON.parse(record.config), null, 2);
  } catch {
    selectedConfig.value = record.config;
  }
  configModalVisible.value = true;
};

const handleTest = async (record) => {
  message.loading("正在測試模型連接...", 0);
  try {
    // 這裡應該調用API測試模型
    await new Promise((resolve) => setTimeout(resolve, 2000));
    message.destroy();
    message.success("模型測試成功");
  } catch (error) {
    message.destroy();
    message.error("模型測試失敗");
  }
};

const handleTableChange = (pag, filters, sorter) => {
  pagination.current = pag.current;
  pagination.pageSize = pag.pageSize;
};

const handleModalOk = async () => {
  try {
    await formRef.value.validate();

    if (formData.id) {
      // 編輯模型
      const index = models.value.findIndex((m) => m.id === formData.id);
      if (index > -1) {
        models.value[index] = { ...formData };
      }
      message.success("模型更新成功");
    } else {
      // 添加模型
      const newModel = {
        ...formData,
        id: Date.now(),
        is_active: true,
        created_at: new Date().toLocaleString("zh-CN"),
        updating: false,
      };
      models.value.unshift(newModel);
      message.success("模型添加成功");
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
    provider: "",
    model_id: "",
    api_endpoint: "",
    api_key: "",
    description: "",
    config: "",
  });
};

// 生命週期
onMounted(() => {
  pagination.total = models.value.length;
});
</script>

<style scoped>
/* 使用全局 admin 樣式，無需重複定義 */
</style>
