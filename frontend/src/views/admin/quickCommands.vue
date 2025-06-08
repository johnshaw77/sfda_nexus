<template>
  <div class="admin-page">
    <a-card
      title="快速命令管理"
      :bordered="false">
      <template #extra>
        <a-button
          type="primary"
          @click="handleAddCommand">
          <PlusOutlined />
          添加命令
        </a-button>
      </template>

      <!-- 搜索和篩選 -->
      <div class="search-section">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-input-search
              :value="searchText"
              placeholder="搜索命令文字或描述"
              @search="handleSearch"
              @change="handleSearchChange"
              allow-clear />
          </a-col>
          <a-col :span="8">
            <a-select
              :value="filterStatus"
              placeholder="選擇狀態"
              style="width: 100%"
              @change="handleStatusChange"
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

      <!-- 快速命令列表 -->
      <a-table
        :columns="columns"
        :data-source="filteredCommands"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        @change="handleTableChange">
        <!-- 智能體列 -->
        <template #agent="{ record }">
          <span v-if="record.agent_id">
            {{ getAgentName(record.agent_id) }}
          </span>
          <a-tag
            v-else
            color="default"
            >通用</a-tag
          >
        </template>

        <!-- 狀態列 -->
        <template #status="{ record }">
          <a-switch
            v-model:checked="record.is_active"
            :loading="record.updating"
            @change="(checked) => handleStatusToggle(record, checked)" />
        </template>

        <!-- 使用次數列 -->
        <template #usage="{ record }">
          <a-statistic
            :value="record.usage_count || 0"
            suffix="次"
            :value-style="{ fontSize: '14px' }" />
        </template>

        <!-- 操作列 -->
        <template #action="{ record }">
          <a-space :size="0">
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
              title="確定要刪除這個快速命令嗎？"
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

    <!-- 添加/編輯快速命令對話框 -->
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
          label="命令文字"
          name="text">
          <a-input
            :value="formData.text"
            @input="handleTextChange"
            placeholder="輸入快速命令文字" />
        </a-form-item>

        <a-form-item
          label="描述"
          name="description">
          <a-textarea
            :value="formData.description"
            @input="handleDescriptionChange"
            placeholder="輸入命令描述"
            :rows="3" />
        </a-form-item>

        <a-form-item
          label="圖標"
          name="icon">
          <a-input
            :value="formData.icon"
            @input="handleIconChange"
            placeholder="輸入圖標名稱（可選）" />
        </a-form-item>

        <a-form-item
          label="智能體關聯"
          name="agent_id">
          <a-select
            :value="formData.agent_id"
            @change="handleAgentChange"
            placeholder="選擇關聯的智能體（可選）"
            allow-clear>
            <a-select-option
              v-for="agent in availableAgents"
              :key="agent.id"
              :value="agent.id">
              {{ agent.display_name || agent.name }}
            </a-select-option>
          </a-select>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from "vue";
import { message } from "ant-design-vue";
import {
  getAllQuickCommandsForAdmin,
  createQuickCommand,
  updateQuickCommand,
  deleteQuickCommand,
} from "@/api/quickCommands";
import { getAgents } from "@/api/agents";

// 響應式數據
const loading = ref(false);
const searchText = ref("");

const filterStatus = ref(undefined);
const modalVisible = ref(false);
const formRef = ref();

// 表格配置
const columns = [
  {
    title: "智能體",
    dataIndex: "agent_id",
    key: "agent_id",
    slots: { customRender: "agent" },
    width: 120,
    sorter: true,
  },
  {
    title: "命令文字",
    dataIndex: "text", // 後端字段名是 text，不是 command_text
    key: "text",
    sorter: true,
  },
  {
    title: "描述",
    dataIndex: "description",
    key: "description",
    ellipsis: true,
  },

  {
    title: "使用次數",
    dataIndex: "usage_count",
    key: "usage_count",
    slots: { customRender: "usage" },
    align: "right",
    width: 120,
    sorter: true,
  },
  {
    title: "狀態",
    dataIndex: "is_active",
    key: "is_active",
    slots: { customRender: "status" },
    width: 60,
  },
  // 暫時註釋創建時間列，等待後端支援
  {
    title: "創建時間",
    dataIndex: "created_at",
    key: "created_at",
    sorter: true,
    customRender: ({ text, record }) => {
      // 檢查多個可能的時間字段
      const timeValue =
        record.created_at ||
        record.createdAt ||
        record.create_time ||
        record.createTime;
      if (!timeValue) {
        return "未知";
      }
      // 如果是時間戳，轉換為日期 TODO: 利用工具函數來處理
      if (typeof timeValue === "number") {
        return new Date(timeValue * 1000).toLocaleString("zh-TW");
      }
      // 如果是日期字符串，直接顯示
      return new Date(timeValue).toLocaleString("zh-TW");
    },
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

// 快速命令數據
const commands = ref([]);
const availableAgents = ref([]);

// 表單數據
const formData = reactive({
  id: null,
  text: "",
  description: "",
  icon: "",
  agent_id: null,
});

// 表單驗證規則
const formRules = {
  text: [{ required: true, message: "請輸入命令文字" }],
  description: [{ required: true, message: "請輸入命令描述" }],
};

// 計算屬性
const modalTitle = computed(() =>
  formData.id ? "編輯快速命令" : "添加快速命令"
);

const filteredCommands = computed(() => {
  let result = commands.value;

  if (searchText.value) {
    result = result.filter(
      (cmd) =>
        cmd.text.toLowerCase().includes(searchText.value.toLowerCase()) ||
        (cmd.description &&
          cmd.description
            .toLowerCase()
            .includes(searchText.value.toLowerCase()))
    );
  }

  if (filterStatus.value) {
    const isActive = filterStatus.value === "active";
    result = result.filter((cmd) => cmd.is_active === isActive);
  }

  return result;
});

// 初始化時載入數據
onMounted(() => {
  handleLoadCommands();
  handleLoadAgents();
});

// 載入快速命令數據
const handleLoadCommands = async () => {
  try {
    loading.value = true;
    const response = await getAllQuickCommandsForAdmin({
      active:
        filterStatus.value === "active"
          ? true
          : filterStatus.value === "inactive"
            ? false
            : undefined,
    });

    // 現在 response 直接是數據數組，因為 API 已經提取了 data 字段
    let rawData = Array.isArray(response) ? response : [];

    console.log("rawData", rawData);
    // 處理數據類型轉換，確保 is_active 是布爾值
    commands.value = rawData.map((cmd) => {
      // 調試：打印數據結構
      if (commands.value.length === 0) {
        // 只在第一次載入時打印
        console.log("快速命令數據結構:", cmd);
      }
      return {
        ...cmd,
        is_active: Boolean(cmd.is_active), // 將 1/0 轉換為 true/false
        updating: false, // 添加 updating 狀態
      };
    });

    // 設置總數為數據長度（如果後端沒有分頁信息）
    pagination.total = commands.value.length;
  } catch (error) {
    console.error("載入快速命令數據失敗:", error);
    message.error("載入快速命令數據失敗，請稍後重試");
  } finally {
    loading.value = false;
  }
};

// 載入智能體數據
const handleLoadAgents = async () => {
  try {
    const response = await getAgents();
    if (response.success) {
      availableAgents.value = response.data.data || response.data;
    }
  } catch (error) {
    console.error("載入智能體數據失敗:", error);
  }
};

// 方法

const getAgentName = (agentId) => {
  console.log("availableAgents", availableAgents);
  const agent = availableAgents.value.find((a) => a.id === agentId);
  return agent ? agent.display_name || agent.name : "未知智能體";
};

const handleSearchChange = (e) => {
  searchText.value = e.target.value;
};

const handleSearch = () => {
  console.log("搜索:", searchText.value);
};

const handleStatusChange = (value) => {
  filterStatus.value = value;
};

const handleReset = () => {
  searchText.value = "";
  filterStatus.value = undefined;
};

const handleAddCommand = () => {
  resetForm();
  modalVisible.value = true;
};

const handleEdit = (record) => {
  Object.assign(formData, {
    id: record.id,
    text: record.text,
    description: record.description,
    icon: record.icon || "",
    agent_id: record.agent_id,
  });
  modalVisible.value = true;
};

const handleDelete = async (record) => {
  try {
    const response = await deleteQuickCommand(record.id);
    if (response.success) {
      message.success("刪除成功");
      handleLoadCommands();
    } else {
      message.error(response.message || "刪除失敗");
    }
  } catch (error) {
    console.error("刪除快速命令失敗:", error);
    message.error("刪除失敗，請稍後重試");
  }
};

const handleTest = (record) => {
  message.info(`測試命令: ${record.text}`);
  // 這裡可以添加實際的測試邏輯
};

const handleStatusToggle = async (record, newStatus) => {
  try {
    record.updating = true;
    const response = await updateQuickCommand(record.id, {
      is_active: newStatus,
    });

    if (response.success) {
      // 更新成功，狀態已經通過 v-model 自動更新
      message.success(newStatus ? "命令已啟用" : "命令已停用");
    } else {
      // 更新失敗，恢復原狀態
      record.is_active = !newStatus;
      message.error(response.message || "狀態更新失敗");
    }
  } catch (error) {
    console.error("更新命令狀態失敗:", error);
    // 更新失敗，恢復原狀態
    record.is_active = !newStatus;
    message.error("狀態更新失敗，請稍後重試");
  } finally {
    record.updating = false;
  }
};

const handleTableChange = (pag, filters, sorter) => {
  pagination.current = pag.current;
  pagination.pageSize = pag.pageSize;
  handleLoadCommands();
};

const handleModalOk = async () => {
  try {
    await formRef.value.validate();

    let response;
    if (formData.id) {
      response = await updateQuickCommand(formData.id, formData);
    } else {
      response = await createQuickCommand(formData);
    }

    if (response.success) {
      message.success(formData.id ? "更新成功" : "添加成功");
      modalVisible.value = false;
      handleLoadCommands();
    } else {
      message.error(response.message || "操作失敗");
    }
  } catch (error) {
    if (error.errorFields) {
      message.error("請檢查輸入數據");
    } else {
      console.error("保存快速命令失敗:", error);
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
    text: "",
    description: "",
    icon: "",
    agent_id: null,
  });
  if (formRef.value) {
    formRef.value.resetFields();
  }
};

// 表單輸入處理
const handleTextChange = (e) => {
  formData.text = e.target.value;
};

const handleDescriptionChange = (e) => {
  formData.description = e.target.value;
};

const handleIconChange = (e) => {
  formData.icon = e.target.value;
};

const handleAgentChange = (value) => {
  formData.agent_id = value;
};
</script>

<style scoped>
.search-section {
  margin-bottom: 16px;
  padding: 16px;
  background: var(--custom-bg-secondary);
  border-radius: var(--border-radius-base);
}
</style>
