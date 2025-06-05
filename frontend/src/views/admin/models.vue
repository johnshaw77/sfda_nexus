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
              :value="searchText"
              placeholder="搜索模型名稱或提供商"
              @search="handleSearch"
              allow-clear />
          </a-col>
          <a-col :span="6">
            <a-select
              :value="filterProvider"
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
              :value="filterStatus"
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
            :checked="record.is_active"
            :loading="record.updating"
            @change="(checked) => handleStatusChange(record, checked)" />
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
      :open="modalVisible"
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
          name="model_name">
          <a-input
            :value="formData.model_name"
            placeholder="輸入模型名稱" />
        </a-form-item>

        <a-form-item
          label="提供商"
          name="provider">
          <a-select
            :value="formData.provider"
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
            :value="formData.model_id"
            placeholder="輸入模型ID" />
        </a-form-item>

        <a-form-item
          label="API 端點"
          name="api_endpoint">
          <a-input
            :value="formData.api_endpoint"
            placeholder="輸入API端點URL" />
        </a-form-item>

        <a-form-item
          label="API 密鑰"
          name="api_key">
          <a-input-password
            :value="formData.api_key"
            placeholder="輸入API密鑰" />
        </a-form-item>

        <a-form-item
          label="描述"
          name="description">
          <a-textarea
            :value="formData.description"
            placeholder="輸入模型描述"
            :rows="3" />
        </a-form-item>

        <a-form-item
          label="配置參數"
          name="config">
          <a-textarea
            :value="formData.config"
            placeholder="輸入JSON格式的配置參數"
            :rows="4" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 配置查看對話框 -->
    <a-modal
      :open="configModalVisible"
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
  getModels,
  createModel,
  updateModel,
  deleteModel,
  testModel,
} from "@/api/models";
import {
  convertModelBoolFields,
  MODEL_BOOL_FIELDS,
} from "@/utils/dataConverter";

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
    dataIndex: "model_name",
    key: "model_name",
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

// 模型數據 - 從後端拉取
const models = ref([]);

// 表單數據
const formData = reactive({
  id: null,
  model_name: "",
  provider: "",
  model_id: "",
  api_endpoint: "",
  api_key: "",
  description: "",
  config: "",
});

// 表單驗證規則
const formRules = {
  model_name: [{ required: true, message: "請輸入模型名稱" }],
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
        model.model_name
          .toLowerCase()
          .includes(searchText.value.toLowerCase()) ||
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

// 初始化時載入數據
onMounted(() => {
  handleLoadModels();
});

// 載入模型數據
const handleLoadModels = async () => {
  try {
    loading.value = true;
    const response = await getModels({
      page: pagination.current,
      pageSize: pagination.pageSize,
    });

    if (response.success) {
      const rawModels = response.data.models || response.data;
      // 轉換布林值欄位
      models.value = convertModelBoolFields(rawModels);
      // 更新分頁信息
      if (response.data.pagination) {
        pagination.total = response.data.pagination.total;
        pagination.current = response.data.pagination.current;
      }
    } else {
      message.error(response.message || "載入模型數據失敗");
    }
  } catch (error) {
    console.error("載入模型數據失敗:", error);
    message.error("載入模型數據失敗，請稍後重試");
  } finally {
    loading.value = false;
  }
};

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
  Object.assign(formData, {
    ...record,
    config:
      typeof record.config === "object"
        ? JSON.stringify(record.config, null, 2)
        : record.config,
  });
  modalVisible.value = true;
};

const handleDelete = async (record) => {
  try {
    const response = await deleteModel(record.id);
    if (response.success) {
      message.success("刪除成功");
      handleLoadModels(); // 重新載入數據
    } else {
      message.error(response.message || "刪除失敗");
    }
  } catch (error) {
    console.error("刪除模型失敗:", error);
    message.error("刪除失敗，請稍後重試");
  }
};

const handleStatusChange = async (record, checked) => {
  try {
    record.updating = true;

    // 更新本地狀態
    record.is_active = checked;

    const response = await updateModel(record.id, {
      is_active: checked,
    });

    if (response.success) {
      message.success(checked ? "模型已啟用" : "模型已停用");
    } else {
      // 恢復原狀態
      record.is_active = !checked;
      message.error(response.message || "狀態更新失敗");
    }
  } catch (error) {
    console.error("更新模型狀態失敗:", error);
    // 恢復原狀態
    record.is_active = !checked;
    message.error("狀態更新失敗，請稍後重試");
  } finally {
    record.updating = false;
  }
};

const handleViewConfig = (record) => {
  selectedConfig.value =
    typeof record.config === "object"
      ? JSON.stringify(record.config, null, 2)
      : record.config;
  configModalVisible.value = true;
};

const handleTest = async (record) => {
  try {
    loading.value = true;
    const response = await testModel(record.id, {
      message: "測試消息",
    });

    if (response.success) {
      message.success("模型測試成功");
    } else {
      message.error(response.message || "模型測試失敗");
    }
  } catch (error) {
    console.error("測試模型失敗:", error);
    message.error("測試失敗，請稍後重試");
  } finally {
    loading.value = false;
  }
};

const handleTableChange = (pag, filters, sorter) => {
  pagination.current = pag.current;
  pagination.pageSize = pag.pageSize;
  handleLoadModels();
};

const handleModalOk = async () => {
  try {
    await formRef.value.validate();

    const submitData = {
      ...formData,
      config: formData.config ? JSON.parse(formData.config) : {},
    };

    let response;
    if (formData.id) {
      response = await updateModel(formData.id, submitData);
    } else {
      response = await createModel(submitData);
    }

    if (response.success) {
      message.success(formData.id ? "更新成功" : "添加成功");
      modalVisible.value = false;
      handleLoadModels(); // 重新載入數據
    } else {
      message.error(response.message || "操作失敗");
    }
  } catch (error) {
    if (error.errorFields) {
      message.error("請檢查輸入數據");
    } else {
      console.error("保存模型失敗:", error);
      message.error("操作失敗，請稍後重試");
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
    model_name: "",
    provider: "",
    model_id: "",
    api_endpoint: "",
    api_key: "",
    description: "",
    config: "",
  });
  if (formRef.value) {
    formRef.value.resetFields();
  }
};
</script>

<style scoped>
/* 使用全局 admin 樣式，無需重複定義 */
</style>
