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
        <a-row :gutter="[16, 16]">
          <a-col
            :xs="24"
            :sm="24"
            :md="8"
            :lg="8"
            :xl="8">
            <a-input-search
              v-model:value="searchText"
              placeholder="搜索模型名稱或提供商"
              @search="handleSearch"
              allow-clear />
          </a-col>
          <a-col
            :xs="12"
            :sm="12"
            :md="6"
            :lg="6"
            :xl="6">
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
          <a-col
            :xs="12"
            :sm="12"
            :md="6"
            :lg="6"
            :xl="6">
            <a-select
              v-model:value="filterStatus"
              placeholder="選擇狀態"
              style="width: 100%"
              allow-clear>
              <a-select-option value="active">啟用</a-select-option>
              <a-select-option value="inactive">停用</a-select-option>
            </a-select>
          </a-col>
          <a-col
            :xs="24"
            :sm="24"
            :md="4"
            :lg="4"
            :xl="4">
            <a-button
              @click="handleReset"
              style="width: 100%"
              >重置</a-button
            >
          </a-col>
        </a-row>
      </div>

      <!-- 模型列表 -->
      <a-table
        :columns="columns"
        :data-source="filteredModels"
        :loading="loading"
        :pagination="pagination"
        :scroll="{ x: isSmallScreen ? 600 : 'max-content' }"
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

        <!-- 預設模型列 -->
        <template #default="{ record }">
          <a-switch
            :checked="record.is_default"
            :loading="record.defaultUpdating"
            @change="(checked) => handleDefaultChange(record, checked)" />
        </template>

        <!-- 多模態列 -->
        <template #multimodal="{ record }">
          <a-tag
            v-if="record.is_multimodal"
            color="blue">
            支援
          </a-tag>
          <span v-else>-</span>
        </template>

        <!-- 最大 Tokens 列 -->
        <template #max_tokens="{ record }">
          {{ formatNumber(record.max_tokens) }}
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
          <a-space v-if="!isSmallScreen">
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

          <!-- 小螢幕下使用下拉菜單替代操作按鈕 -->
          <a-dropdown v-else>
            <a-button
              size="small"
              type="link">
              <MoreOutlined style="font-size: 18px" />
            </a-button>
            <template #overlay>
              <a-menu>
                <a-menu-item @click="handleEdit(record)">
                  <EditOutlined /> 編輯
                </a-menu-item>
                <a-menu-item @click="handleTest(record)">
                  <PlayCircleOutlined /> 測試
                </a-menu-item>
                <a-menu-divider />
                <a-menu-item
                  danger
                  @click="
                    () => {
                      const confirm = window.confirm('確定要刪除這個模型嗎？');
                      if (confirm) handleDelete(record);
                    }
                  ">
                  <DeleteOutlined /> 刪除
                </a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
        </template>
      </a-table>
    </a-card>

    <!-- 添加/編輯模型對話框 -->
    <a-modal
      :open="modalVisible"
      :title="modalTitle"
      :width="900"
      @ok="handleModalOk"
      @cancel="handleModalCancel">
      <a-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        layout="vertical">
        <!-- 第一行：基本信息 -->
        <a-row :gutter="[16, 16]">
          <a-col
            :xs="24"
            :sm="24"
            :md="8"
            :lg="8"
            :xl="8">
            <a-form-item
              label="模型名稱"
              name="model_name">
              <a-input
                v-model:value="formData.model_name"
                placeholder="輸入模型名稱" />
            </a-form-item>
          </a-col>
          <a-col
            :xs="24"
            :sm="12"
            :md="8"
            :lg="8"
            :xl="8">
            <a-form-item
              label="提供商"
              name="provider">
              <a-select
                v-model:value="formData.provider"
                placeholder="選擇提供商">
                <a-select-option value="openai">OpenAI</a-select-option>
                <a-select-option value="gemini">Google Gemini</a-select-option>
                <a-select-option value="claude"
                  >Anthropic Claude</a-select-option
                >
                <a-select-option value="ollama">Ollama</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col
            :xs="24"
            :sm="12"
            :md="8"
            :lg="8"
            :xl="8">
            <a-form-item
              label="模型ID"
              name="model_id">
              <a-input
                v-model:value="formData.model_id"
                placeholder="輸入模型ID" />
            </a-form-item>
          </a-col>
        </a-row>

        <!-- 第二行：API 配置 -->
        <a-row :gutter="16">
          <a-col
            :xs="24"
            :sm="24"
            :md="12"
            :lg="12"
            :xl="12">
            <a-form-item
              label="API 端點"
              name="endpoint_url">
              <a-input
                v-model:value="formData.endpoint_url"
                placeholder="輸入API端點URL" />
            </a-form-item>
          </a-col>
          <a-col
            :xs="24"
            :sm="24"
            :md="12"
            :lg="12"
            :xl="12">
            <a-form-item
              label="API 密鑰"
              name="api_key_encrypted">
              <a-input-password
                v-model:value="formData.api_key_encrypted"
                placeholder="輸入API密鑰" />
            </a-form-item>
          </a-col>
        </a-row>

        <!-- 第三行：參數配置 -->
        <a-row :gutter="16">
          <a-col
            :xs="24"
            :sm="24"
            :md="8"
            :lg="8"
            :xl="8">
            <a-form-item
              label="最大 Tokens"
              name="max_tokens">
              <a-input-number
                v-model:value="formData.max_tokens"
                placeholder="輸入最大 tokens"
                :min="1"
                :max="2097152"
                style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col
            :xs="24"
            :sm="12"
            :md="8"
            :lg="8"
            :xl="8">
            <a-form-item
              label="溫度參數"
              name="temperature">
              <a-input-number
                v-model:value="formData.temperature"
                placeholder="0.0-2.0"
                :min="0"
                :max="2"
                :step="0.01"
                :precision="2"
                style="width: 100%" />
              <div style="margin-top: 4px; color: #666; font-size: 11px">
                控制隨機性
              </div>
            </a-form-item>
          </a-col>
          <a-col
            :xs="24"
            :sm="12"
            :md="8"
            :lg="8"
            :xl="8">
            <a-form-item
              label="Top P 參數"
              name="top_p">
              <a-input-number
                v-model:value="formData.top_p"
                placeholder="0.0-1.0"
                :min="0"
                :max="1"
                :step="0.01"
                :precision="2"
                style="width: 100%" />
              <div style="margin-top: 4px; color: #666; font-size: 11px">
                控制詞彙範圍
              </div>
            </a-form-item>
          </a-col>
        </a-row>

        <!-- 第四行：開關配置 -->
        <a-row :gutter="16">
          <a-col
            :xs="24"
            :sm="24"
            :md="12"
            :lg="12"
            :xl="12">
            <a-form-item
              label="預設模型"
              name="is_default">
              <a-switch v-model:checked="formData.is_default" />
              <span style="margin-left: 8px; color: #666; font-size: 13px">
                設為預設模型
              </span>
            </a-form-item>
          </a-col>
          <a-col
            :xs="24"
            :sm="24"
            :md="12"
            :lg="12"
            :xl="12">
            <a-form-item
              label="多模態支援"
              name="is_multimodal">
              <a-switch v-model:checked="formData.is_multimodal" />
              <span style="margin-left: 8px; color: #666; font-size: 13px">
                支援圖像、音頻等多模態輸入
              </span>
            </a-form-item>
          </a-col>
        </a-row>

        <!-- 第五行：描述 -->
        <a-row>
          <a-col :span="24">
            <a-form-item
              label="描述"
              name="description">
              <a-textarea
                v-model:value="formData.description"
                placeholder="輸入模型描述"
                :rows="2" />
            </a-form-item>
          </a-col>
        </a-row>

        <!-- 第六行：JSON 配置 -->
        <a-row :gutter="16">
          <a-col
            :xs="24"
            :sm="24"
            :md="12"
            :lg="12"
            :xl="12">
            <a-form-item
              label="配置參數"
              name="config">
              <a-textarea
                v-model:value="formData.config"
                placeholder="輸入JSON格式的配置參數"
                :rows="3" />
            </a-form-item>
          </a-col>
          <a-col
            :xs="24"
            :sm="24"
            :md="12"
            :lg="12"
            :xl="12">
            <a-form-item
              label="能力配置"
              name="capabilities">
              <a-textarea
                v-model:value="formData.capabilities"
                placeholder='例如：{"streaming": true, "multimodal": true}'
                :rows="3" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>

    <!-- 配置查看對話框 -->
    <a-modal
      :open="configModalVisible"
      title="模型配置"
      :width="700"
      @ok="configModalVisible = false"
      @cancel="configModalVisible = false">
      <template #footer>
        <a-button @click="configModalVisible = false">關閉</a-button>
      </template>
      <JsonHighlight :content="selectedConfig" />
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
import JsonHighlight from "@/components/common/JsonHighlight.vue";
import {
  EyeOutlined,
  EditOutlined,
  PlayCircleOutlined,
  DeleteOutlined,
  MoreOutlined,
  PlusOutlined,
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

// 響應式斷點
const isSmallScreen = ref(false);
const isMediumScreen = ref(false);

// 監聽螢幕大小變化
const updateScreenSize = () => {
  isSmallScreen.value = window.innerWidth < 768;
  isMediumScreen.value = window.innerWidth >= 768 && window.innerWidth < 992;
};

// 表格配置
const columns = computed(() => {
  // 基本列配置
  const baseColumns = [
    {
      title: "模型名稱",
      dataIndex: "model_name",
      key: "model_name",
      sorter: true,
      width: 150,
      fixed: isSmallScreen.value ? "left" : undefined,
    },
    {
      title: "提供商",
      dataIndex: "provider",
      key: "provider",
      slots: { customRender: "provider" },
      width: 100,
    },
    {
      title: "模型ID",
      dataIndex: "model_id",
      key: "model_id",
      width: 120,
      responsive: ["md", "lg", "xl"], // 僅在中等及以上螢幕顯示
    },
    {
      title: "啟動",
      dataIndex: "is_active",
      key: "is_active",
      slots: { customRender: "status" },
      width: 80,
    },
    {
      title: "預設",
      dataIndex: "is_default",
      key: "is_default",
      slots: { customRender: "default" },
      width: 80,
      responsive: ["sm", "md", "lg", "xl"], // 在超小螢幕上隱藏
    },
    {
      title: "多模態",
      dataIndex: "is_multimodal",
      key: "is_multimodal",
      slots: { customRender: "multimodal" },
      width: 80,
      responsive: ["md", "lg", "xl"], // 僅在中等及以上螢幕顯示
    },
    {
      title: "最大 Tokens",
      dataIndex: "max_tokens",
      key: "max_tokens",
      align: "right",
      sorter: true,
      slots: { customRender: "max_tokens" },
      width: 120,
      responsive: ["lg", "xl"], // 僅在大螢幕上顯示
    },
    {
      title: "溫度",
      dataIndex: "temperature",
      key: "temperature",
      align: "right",
      sorter: true,
      width: 80,
      responsive: ["lg", "xl"], // 僅在大螢幕上顯示
    },
    {
      title: "配置",
      key: "config",
      slots: { customRender: "config" },
      width: 70,
      responsive: ["md", "lg", "xl"], // 僅在中等及以上螢幕顯示
    },
    {
      title: "創建時間",
      dataIndex: "created_at",
      key: "created_at",
      sorter: true,
      width: 150,
      responsive: ["lg", "xl"], // 僅在大螢幕上顯示
    },
    {
      title: "操作",
      key: "action",
      slots: { customRender: "action" },
      width: isSmallScreen.value ? 80 : 180,
      fixed: "right",
    },
  ];

  return baseColumns;
});

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
  endpoint_url: "",
  api_key_encrypted: "",
  description: "",
  config: "",
  is_default: false,
  is_multimodal: false,
  max_tokens: 4096,
  temperature: 0.7,
  top_p: 0.9,
  capabilities: "",
});

// 表單驗證規則
const formRules = {
  model_name: [{ required: true, message: "請輸入模型名稱" }],
  provider: [{ required: true, message: "請選擇提供商" }],
  model_id: [{ required: true, message: "請輸入模型ID" }],
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
  updateScreenSize();
  window.addEventListener("resize", updateScreenSize);
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

const formatNumber = (num) => {
  if (num == null || num === "") return "-";
  return Number(num).toLocaleString();
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
    // 確保數字類型正確
    max_tokens: Number(record.max_tokens) || 4096,
    temperature: Number(record.temperature) || 0.7,
    top_p: Number(record.top_p) || 0.9,
    // JSON 字符串轉換
    config:
      typeof record.config === "object"
        ? JSON.stringify(record.config, null, 2)
        : record.config || "",
    capabilities:
      typeof record.capabilities === "object"
        ? JSON.stringify(record.capabilities, null, 2)
        : record.capabilities || "",
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

const handleDefaultChange = async (record, checked) => {
  try {
    record.defaultUpdating = true;

    const response = await updateModel(record.id, {
      is_default: checked,
    });

    if (response.success) {
      // 如果設置為預設，需要更新其他同提供商的模型狀態
      if (checked) {
        models.value.forEach((model) => {
          if (model.provider === record.provider && model.id !== record.id) {
            model.is_default = false;
          }
        });
        record.is_default = true;
        message.success(
          `${record.display_name} 已設為 ${getProviderName(record.provider)} 的預設模型`
        );
      } else {
        record.is_default = false;
        message.success(`已取消 ${record.display_name} 的預設狀態`);
      }
    } else {
      message.error(response.message || "預設狀態更新失敗");
    }
  } catch (error) {
    console.error("更新預設狀態失敗:", error);
    message.error("預設狀態更新失敗，請稍後重試");
  } finally {
    record.defaultUpdating = false;
  }
};

const handleViewConfig = (record) => {
  const configInfo = {
    基本配置: {
      模型名稱: record.model_name,
      提供商: record.provider,
      模型ID: record.model_id,
      預設模型: record.is_default ? "是" : "否",
      多模態支援: record.is_multimodal ? "是" : "否",
    },
    參數配置: {
      最大Tokens: record.max_tokens,
      溫度: record.temperature,
      TopP: record.top_p,
    },
    詳細配置:
      typeof record.config === "object"
        ? record.config
        : record.config
          ? JSON.parse(record.config)
          : {},
    能力配置:
      typeof record.capabilities === "object"
        ? record.capabilities
        : record.capabilities
          ? JSON.parse(record.capabilities)
          : {},
  };

  // 直接傳遞對象給 JsonHighlight 組件
  selectedConfig.value = configInfo;
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

    // 處理數據類型轉換
    const submitData = {
      ...formData,
      // 確保數字類型正確
      max_tokens: Number(formData.max_tokens),
      temperature: Number(formData.temperature),
      top_p: Number(formData.top_p),
      // JSON 字符串解析
      config: formData.config ? JSON.parse(formData.config) : {},
      capabilities: formData.capabilities
        ? JSON.parse(formData.capabilities)
        : {},
    };

    console.log("提交數據:", submitData); // 調試用

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
      console.log("表單驗證錯誤:", error.errorFields); // 調試用
    } else if (error.name === "SyntaxError") {
      message.error("JSON 格式錯誤，請檢查配置或能力配置的格式");
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
    endpoint_url: "",
    api_key_encrypted: "",
    description: "",
    config: "",
    is_default: false,
    is_multimodal: false,
    max_tokens: 4096,
    temperature: 0.7,
    top_p: 0.9,
    capabilities: "",
  });
  if (formRef.value) {
    formRef.value.resetFields();
  }
};
</script>

<style scoped>
/* 使用全局 admin 樣式，無需重複定義 */
</style>
