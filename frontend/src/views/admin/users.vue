<template>
  <div class="admin-page">
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
        <a-row :gutter="[16, 16]">
          <a-col
            :xs="24"
            :sm="24"
            :md="8"
            :lg="8"
            :xl="8">
            <a-input-search
              v-model:value="searchText"
              placeholder="搜索用戶名或郵箱"
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
              v-model:value="filterRole"
              placeholder="選擇角色"
              style="width: 100%"
              allow-clear
              @change="handleSearch">
              <a-select-option value="admin">管理員</a-select-option>
              <a-select-option value="user">普通用戶</a-select-option>
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
              allow-clear
              @change="handleSearch">
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
            :style="{ backgroundColor: 'var(--primary-color)' }">
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
            @change="(checked) => handleStatusChange(record, checked)" />
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
        <a-row :gutter="[16, 16]">
          <a-col
            :xs="24"
            :sm="24"
            :md="12"
            :lg="12"
            :xl="12">
            <a-form-item
              label="用戶名"
              name="username">
              <a-input
                v-model:value="formData.username"
                placeholder="輸入用戶名" />
            </a-form-item>
          </a-col>
          <a-col
            :xs="24"
            :sm="24"
            :md="12"
            :lg="12"
            :xl="12">
            <a-form-item
              label="郵箱"
              name="email">
              <a-input
                v-model:value="formData.email"
                placeholder="輸入郵箱" />
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="[16, 16]">
          <a-col
            :xs="24"
            :sm="24"
            :md="12"
            :lg="12"
            :xl="12">
            <a-form-item
              label="角色"
              name="role">
              <a-select
                v-model:value="formData.role"
                placeholder="選擇角色">
                <a-select-option value="admin">管理員</a-select-option>
                <a-select-option value="user">普通用戶</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col
            :xs="24"
            :sm="24"
            :md="12"
            :lg="12"
            :xl="12">
            <a-form-item
              label="密碼"
              name="password"
              v-if="!formData.id">
              <a-input-password
                v-model:value="formData.password"
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
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  resetUserPassword,
} from "@/api/users.js";
import { convertUserBoolFields } from "@/utils/dataConverter";

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

// 用戶數據
const users = ref([]);

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

// 使用後端數據，不需要前端篩選
const filteredUsers = computed(() => users.value);

// 方法

/**
 * 獲取用戶列表
 */
const fetchUsers = async () => {
  loading.value = true;
  try {
    const params = {
      page: pagination.current,
      limit: pagination.pageSize,
    };

    // 添加搜索參數
    if (searchText.value) {
      params.search = searchText.value;
    }
    if (filterRole.value) {
      params.role = filterRole.value;
    }
    if (filterStatus.value) {
      params.is_active = filterStatus.value === "active" ? "true" : "false";
    }

    const response = await getUsers(params);
    const rawUsers = response.data.data || [];
    // 轉換布林值欄位
    users.value = convertUserBoolFields(rawUsers);
    pagination.total = response.data.pagination?.total || 0;
  } catch (error) {
    console.error("獲取用戶列表失敗:", error);
    message.error("獲取用戶列表失敗");
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  pagination.current = 1; // 重置到第一頁
  fetchUsers();
};

const handleReset = () => {
  searchText.value = "";
  filterRole.value = undefined;
  filterStatus.value = undefined;
  pagination.current = 1;
  fetchUsers();
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
    await deleteUser(record.id);
    message.success("用戶刪除成功");
    fetchUsers(); // 重新獲取用戶列表
  } catch (error) {
    console.error("刪除用戶失敗:", error);
    message.error("刪除用戶失敗");
  }
};

const handleStatusChange = async (record, checked) => {
  record.updating = true;

  // 更新本地狀態
  record.is_active = checked;

  try {
    await updateUser(record.id, { is_active: checked });
    message.success(`用戶已${checked ? "啟用" : "停用"}`);
  } catch (error) {
    console.error("更新用戶狀態失敗:", error);
    record.is_active = !checked; // 恢復原狀態
    message.error("狀態更新失敗");
  } finally {
    record.updating = false;
  }
};

const handleResetPassword = async (record) => {
  try {
    // 生成臨時密碼
    const tempPassword = Math.random().toString(36).slice(-8);
    await resetUserPassword(record.id, tempPassword);
    message.success(
      `已為用戶 ${record.username} 重置密碼，新密碼：${tempPassword}`
    );
  } catch (error) {
    console.error("重置密碼失敗:", error);
    message.error("重置密碼失敗");
  }
};

const handleTableChange = (pag, filters, sorter) => {
  pagination.current = pag.current;
  pagination.pageSize = pag.pageSize;
  fetchUsers(); // 重新獲取數據
};

const handleModalOk = async () => {
  try {
    await formRef.value.validate();

    if (formData.id) {
      // 編輯用戶
      const updateData = {
        username: formData.username,
        email: formData.email,
        role: formData.role,
      };
      await updateUser(formData.id, updateData);
      message.success("用戶更新成功");
    } else {
      // 添加用戶
      const userData = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        is_active: true,
      };
      await createUser(userData);
      message.success("用戶添加成功");
    }

    modalVisible.value = false;
    fetchUsers(); // 重新獲取用戶列表
  } catch (error) {
    console.error("保存用戶失敗:", error);
    message.error(formData.id ? "更新用戶失敗" : "創建用戶失敗");
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
  fetchUsers(); // 頁面載入時獲取用戶數據
});
</script>

<style scoped>
/* 使用全局 admin 樣式，無需重複定義 */
</style>
