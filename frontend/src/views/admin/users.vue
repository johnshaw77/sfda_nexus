<template>
  <div class="users-page">
    <a-card
      title="用戶管理"
      :bordered="false">
      <template #extra>
        <a-button
          type="primary"
          @click="handleAddUser">
          <PlusOutlined />
          添加用戶
        </a-button>
      </template>

      <!-- 搜索和篩選 -->
      <div class="search-section">
        <a-row :gutter="16">
          <a-col :span="8">
            <a-input-search
              :value="searchText"
              placeholder="搜索用戶名或郵箱"
              @search="handleSearch"
              allow-clear />
          </a-col>
          <a-col :span="6">
            <a-select
              :value="filterRole"
              placeholder="選擇角色"
              style="width: 100%"
              allow-clear>
              <a-select-option value="admin">管理員</a-select-option>
              <a-select-option value="user">普通用戶</a-select-option>
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

      <!-- 用戶列表 -->
      <a-table
        :columns="columns"
        :data-source="filteredUsers"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        @change="handleTableChange">
        <!-- 頭像列 -->
        <template #avatar="{ record }">
          <a-avatar
            :size="40"
            :style="{ backgroundColor: '#1890ff' }">
            {{ record.username.charAt(0).toUpperCase() }}
          </a-avatar>
        </template>

        <!-- 角色列 -->
        <template #role="{ record }">
          <a-tag :color="record.role === 'admin' ? 'red' : 'blue'">
            {{ record.role === "admin" ? "管理員" : "普通用戶" }}
          </a-tag>
        </template>

        <!-- 狀態列 -->
        <template #status="{ record }">
          <a-switch
            :checked="record.is_active"
            :loading="record.updating"
            @change="handleStatusChange(record)" />
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
              @click="handleResetPassword(record)">
              <KeyOutlined />
              重置密碼
            </a-button>
            <a-popconfirm
              title="確定要刪除這個用戶嗎？"
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

    <!-- 添加/編輯用戶對話框 -->
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
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item
              label="用戶名"
              name="username">
              <a-input
                :value="formData.username"
                placeholder="輸入用戶名" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item
              label="郵箱"
              name="email">
              <a-input
                :value="formData.email"
                placeholder="輸入郵箱" />
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item
              label="角色"
              name="role">
              <a-select
                :value="formData.role"
                placeholder="選擇角色">
                <a-select-option value="admin">管理員</a-select-option>
                <a-select-option value="user">普通用戶</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item
              label="密碼"
              name="password"
              v-if="!formData.id">
              <a-input-password
                :value="formData.password"
                placeholder="輸入密碼" />
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
  KeyOutlined,
} from "@ant-design/icons-vue";

// 響應式數據
const loading = ref(false);
const searchText = ref("");
const filterRole = ref(undefined);
const filterStatus = ref(undefined);
const modalVisible = ref(false);
const formRef = ref();

// 表格配置
const columns = [
  {
    title: "頭像",
    key: "avatar",
    slots: { customRender: "avatar" },
  },
  {
    title: "用戶名",
    dataIndex: "username",
    key: "username",
    sorter: true,
  },
  {
    title: "郵箱",
    dataIndex: "email",
    key: "email",
  },
  {
    title: "角色",
    dataIndex: "role",
    key: "role",
    slots: { customRender: "role" },
  },
  {
    title: "狀態",
    dataIndex: "is_active",
    key: "is_active",
    slots: { customRender: "status" },
  },
  {
    title: "最後登入",
    dataIndex: "last_login",
    key: "last_login",
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
const users = ref([
  {
    id: 1,
    username: "admin",
    email: "admin@example.com",
    role: "admin",
    is_active: true,
    last_login: "2025-01-15 10:30:00",
    created_at: "2025-01-01 00:00:00",
    updating: false,
  },
  {
    id: 2,
    username: "user001",
    email: "user001@example.com",
    role: "user",
    is_active: true,
    last_login: "2025-01-14 15:20:00",
    created_at: "2025-01-02 10:00:00",
    updating: false,
  },
  {
    id: 3,
    username: "user002",
    email: "user002@example.com",
    role: "user",
    is_active: false,
    last_login: "2025-01-10 09:15:00",
    created_at: "2025-01-03 14:30:00",
    updating: false,
  },
]);

// 表單數據
const formData = reactive({
  id: null,
  username: "",
  email: "",
  role: "user",
  password: "",
});

// 表單驗證規則
const formRules = {
  username: [{ required: true, message: "請輸入用戶名" }],
  email: [
    { required: true, message: "請輸入郵箱" },
    { type: "email", message: "請輸入有效的郵箱地址" },
  ],
  role: [{ required: true, message: "請選擇角色" }],
  password: [{ required: true, message: "請輸入密碼" }],
};

// 計算屬性
const modalTitle = computed(() => (formData.id ? "編輯用戶" : "添加用戶"));

const filteredUsers = computed(() => {
  let result = users.value;

  if (searchText.value) {
    result = result.filter(
      (user) =>
        user.username.toLowerCase().includes(searchText.value.toLowerCase()) ||
        user.email.toLowerCase().includes(searchText.value.toLowerCase())
    );
  }

  if (filterRole.value) {
    result = result.filter((user) => user.role === filterRole.value);
  }

  if (filterStatus.value) {
    const isActive = filterStatus.value === "active";
    result = result.filter((user) => user.is_active === isActive);
  }

  return result;
});

// 方法
const handleSearch = () => {
  console.log("搜索:", searchText.value);
};

const handleReset = () => {
  searchText.value = "";
  filterRole.value = undefined;
  filterStatus.value = undefined;
};

const handleAddUser = () => {
  resetForm();
  modalVisible.value = true;
};

const handleEdit = (record) => {
  Object.assign(formData, record);
  modalVisible.value = true;
};

const handleDelete = async (record) => {
  try {
    const index = users.value.findIndex((u) => u.id === record.id);
    if (index > -1) {
      users.value.splice(index, 1);
    }
    message.success("用戶刪除成功");
  } catch (error) {
    message.error("刪除失敗");
  }
};

const handleStatusChange = async (record) => {
  record.updating = true;
  try {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    message.success(`用戶已${record.is_active ? "啟用" : "停用"}`);
  } catch (error) {
    record.is_active = !record.is_active;
    message.error("狀態更新失敗");
  } finally {
    record.updating = false;
  }
};

const handleResetPassword = (record) => {
  message.success(`已為用戶 ${record.username} 重置密碼`);
};

const handleTableChange = (pag, filters, sorter) => {
  pagination.current = pag.current;
  pagination.pageSize = pag.pageSize;
};

const handleModalOk = async () => {
  try {
    await formRef.value.validate();

    if (formData.id) {
      // 編輯用戶
      const index = users.value.findIndex((u) => u.id === formData.id);
      if (index > -1) {
        users.value[index] = { ...formData };
      }
      message.success("用戶更新成功");
    } else {
      // 添加用戶
      const newUser = {
        ...formData,
        id: Date.now(),
        is_active: true,
        last_login: null,
        created_at: new Date().toLocaleString("zh-CN"),
        updating: false,
      };
      users.value.unshift(newUser);
      message.success("用戶添加成功");
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
    username: "",
    email: "",
    role: "user",
    password: "",
  });
};

// 生命週期
onMounted(() => {
  pagination.total = users.value.length;
});
</script>

<style scoped>
.users-page {
  padding: 12px;
}

.search-section {
  margin-bottom: 24px;
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
}
</style>
