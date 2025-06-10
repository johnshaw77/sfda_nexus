# Vue 3 + Ant Design Vue + VueUse + Axios Development Instructions

## 技術棧規範

- **Vue 3** with Composition API
- **Script Setup** 語法（避免使用 Options API）
- **Ant Design Vue** 作為主要 UI 框架
- **VueUse** 作為組合式函數庫（排除網路請求相關）
- **Axios** 作為 HTTP 客戶端
- **響應式設計** 使用 Ant Design 網格系統
- **純 JavaScript**（不使用 TypeScript）
- **圖示庫** 使用 Ant Design Vue 的內建圖示，以及 lucide-icons-vue 作為輔助
- **狀態管理** 使用 Pinia（Vuex 4）
- **路由管理** 使用 Vue Router 4
- **全局樣式** 使用 Ant Design Vue 的樣式和自定義樣式
- **組件庫** 使用 Ant Design Vue 的組件

## 命名規範

- **方法命名**: 統一使用 `handleXXX` 格式
- **變數命名**: camelCase
- **組件命名**: PascalCase
- **常數命名**: UPPER_SNAKE_CASE

## Script Setup 最佳實踐

### 基本結構

```vue
<script setup>
// 1. 導入依賴
import { ref, reactive, computed, watch, onMounted } from "vue";
import { useLocalStorage, useToggle, useBreakpoints } from "@vueuse/core";
import { Button, Form, Input, Row, Col, message } from "ant-design-vue";
import axios from "axios";

// 2. 定義 props 和 emits
const props = defineProps({
  title: {
    type: String,
    default: "預設標題",
  },
  userId: {
    type: [String, Number],
    default: null,
  },
});

const emit = defineEmits(["submit", "cancel"]);

// 3. VueUse 組合式函數
const [isVisible, toggleVisible] = useToggle(false);
const userData = useLocalStorage("user-data", {});

// 4. 響應式資料
const loading = ref(false);
const formData = reactive({
  username: "",
  password: "",
});
const userList = ref([]);

// 5. 方法 - 統一使用 handleXXX 命名
const handleFetchUsers = async () => {
  loading.value = true;
  try {
    const response = await axios.get("/api/users");
    userList.value = response.data;
    message.success("資料載入成功");
  } catch (error) {
    message.error("載入失敗：" + error.message);
  } finally {
    loading.value = false;
  }
};

const handleSubmit = () => {
  emit("submit", formData);
};

const handleCancel = () => {
  emit("cancel");
};

// 6. 生命週期
onMounted(() => {
  handleFetchUsers();
});
</script>
```

## Axios 使用規範

### Axios 實例配置

- config.json 放置於 public 目錄下

```javascript
// api/index.js
import axios from "axios";
import { message } from "ant-design-vue";
import NProgress from "nprogress";
import "nprogress/nprogress.css";
import { useConfigStore } from "@/stores/config";

// NProgress 配置
NProgress.configure({
  showSpinner: false,
  minimum: 0.1,
  speed: 500,
});

// Token 管理
let authToken = localStorage.getItem("token");
let refreshToken = localStorage.getItem("refreshToken");

// 設置認證 header
export const setAuthHeader = (token) => {
  authToken = token;
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
};

// config.json 放置於 public 目錄下
// 確保配置已載入的函數
const ensureConfigLoaded = async () => {
  const configStore = useConfigStore();
  if (!configStore.isLoaded) {
    await configStore.loadConfig();
  }
  return configStore;
};

// 創建 axios 實例
const api = axios.create({
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// 請求攔截器
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 響應攔截器
// 請求攔截器
api.interceptors.request.use(
  async (config) => {
    // 獲取配置並設置 baseURL
    const configStore = await ensureConfigLoaded();
    if (!config.baseURL) {
      config.baseURL = configStore.apiBaseUrl;
    }

    // 啟動進度條
    NProgress.start();

    // 自動添加認證 header
    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }

    // 添加請求時間戳（用於調試）
    config.metadata = { startTime: new Date() };

    return config;
  },
  (error) => {
    NProgress.done();
    return Promise.reject(error);
  }
);

// 響應攔截器
api.interceptors.response.use(
  (response) => {
    // 完成進度條
    NProgress.done();

    // 計算請求耗時（用於調試）
    const endTime = new Date();
    const duration = endTime - response.config.metadata.startTime;
    //console.log(`API 請求耗時: ${duration}ms - ${response.config.url}`);

    // 調試：打印詳細回應信息（僅針對聊天 API）
    // console.log("=== API 回應攔截器調試 ===");
    // console.log("請求 URL:", response.config.url);
    // console.log("請求方法:", response.config.method);
    // console.log("回應狀態:", response.status);
    // console.log("回應 headers:", response.headers);
    // console.log("回應數據:", response.data);
    // console.log("=== API 回應攔截器調試結束 ===\n");

    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // 處理 401 錯誤（token 過期）
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // 嘗試刷新 token
        if (refreshToken) {
          const response = await api.post("/api/auth/refresh", {
            refreshToken,
          });

          const { token: newToken, refreshToken: newRefreshToken } =
            response.data.data;
          saveAuth(newToken, newRefreshToken);

          // 重新發送原始請求
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // 刷新失敗，清除認證信息並跳轉到登入頁
        clearAuth();
        window.location.href = "/auth/login";
        return Promise.reject(refreshError);
      }
    }

    // 完成進度條
    NProgress.done();

    // 處理其他錯誤
    const errorMessage =
      error.response?.data?.message || error.message || "請求失敗";

    // 只在非靜默請求時顯示錯誤消息
    if (!originalRequest.silent) {
      message.error(errorMessage);
    }

    return Promise.reject(error);
  }
);

export default api;
```

### 組合式函數中使用 Axios

```vue
<script setup>
import { ref, reactive } from "vue";
import { useToggle } from "@vueuse/core";
import { message } from "ant-design-vue";
import api from "@/api";

// 列表資料處理
const useUserList = () => {
  const users = ref([]);
  const loading = ref(false);
  const pagination = reactive({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  const handleFetchUsers = async (params = {}) => {
    loading.value = true;
    try {
      const response = await api.get("/users", {
        params: {
          page: pagination.current,
          size: pagination.pageSize,
          ...params,
        },
      });
      users.value = response.data.list;
      pagination.total = response.data.total;
    } catch (error) {
      message.error("載入用戶列表失敗");
    } finally {
      loading.value = false;
    }
  };

  const handleDeleteUser = async (id) => {
    try {
      await api.delete(`/users/${id}`);
      message.success("刪除成功");
      handleFetchUsers(); // 重新載入
    } catch (error) {
      message.error("刪除失敗");
    }
  };

  const handlePageChange = (page, pageSize) => {
    pagination.current = page;
    pagination.pageSize = pageSize;
    handleFetchUsers();
  };

  return {
    users,
    loading,
    pagination,
    handleFetchUsers,
    handleDeleteUser,
    handlePageChange,
  };
};

// 使用組合式函數
const {
  users,
  loading,
  pagination,
  handleFetchUsers,
  handleDeleteUser,
  handlePageChange,
} = useUserList();
</script>
```

### 表單提交處理

#### 範例

```vue
<script setup>
import { reactive, ref } from "vue";
import { useToggle } from "@vueuse/core";
import { Form, Input, Button, message } from "ant-design-vue";
import api from "@/api";

const formRef = ref();
const [submitting, toggleSubmitting] = useToggle(false);

const formState = reactive({
  username: "",
  email: "",
  password: "",
});

const rules = {
  username: [{ required: true, message: "請輸入用戶名", trigger: "blur" }],
  email: [
    { required: true, message: "請輸入郵箱", trigger: "blur" },
    { type: "email", message: "請輸入有效的郵箱", trigger: "blur" },
  ],
};

const handleSubmit = async () => {
  try {
    await formRef.value.validate();
    toggleSubmitting(true);

    const response = await api.post("/users", formState);
    message.success("創建用戶成功");

    handleResetForm();
  } catch (error) {
    if (error.response) {
      message.error(error.response.data.message || "提交失敗");
    }
  } finally {
    toggleSubmitting(false);
  }
};

const handleResetForm = () => {
  formRef.value.resetFields();
};

const handleCancel = () => {
  handleResetForm();
  emit("cancel");
};
</script>

<template>
  <a-form
    ref="formRef"
    :model="formState"
    :rules="rules"
    layout="vertical"
    @finish="handleSubmit">
    <a-form-item
      label="用戶名"
      name="username">
      <a-input v-model:value="formState.username" />
    </a-form-item>

    <a-form-item
      label="郵箱"
      name="email">
      <a-input v-model:value="formState.email" />
    </a-form-item>

    <a-form-item>
      <a-space>
        <a-button
          type="primary"
          html-type="submit"
          :loading="submitting">
          提交
        </a-button>
        <a-button @click="handleCancel"> 取消 </a-button>
        <a-button @click="handleResetForm"> 重置 </a-button>
      </a-space>
    </a-form-item>
  </a-form>
</template>
```

## VueUse 優先使用（排除網路請求）

### 常用 VueUse 組合式函數

```vue
<script setup>
import {
  useLocalStorage, // 本地存儲
  useSessionStorage, // 會話存儲
  useToggle, // 切換狀態
  useCounter, // 計數器
  useBreakpoints, // 響應式斷點
  useWindowSize, // 視窗大小
  useMouse, // 滑鼠位置
  useScroll, // 滾動狀態
  useClipboard, // 剪貼板
  useTitle, // 頁面標題
  useDebounce, // 防抖
  useThrottle, // 節流
} from "@vueuse/core";

// 使用範例（不包含網路請求相關）
const { copy, copied } = useClipboard();
const { width, height } = useWindowSize();
const [count, { inc, dec, reset }] = useCounter(0);
const [isLoading, toggleLoading] = useToggle(false);

// 搜尋防抖
const searchText = ref("");
const debouncedSearch = useDebounce(searchText, 500);

// 方法命名使用 handleXXX
const handleCopy = async (text) => {
  await copy(text);
  if (copied.value) {
    message.success("複製成功");
  }
};

const handleSearch = (value) => {
  searchText.value = value;
};

const handleIncrement = () => {
  inc();
};

const handleDecrement = () => {
  dec();
};

const handleReset = () => {
  reset();
};

watch(debouncedSearch, (newValue) => {
  if (newValue) {
    handleSearchUsers(newValue);
  }
});

const handleSearchUsers = async (keyword) => {
  // 使用 axios 進行搜尋
  try {
    const response = await api.get("/users/search", {
      params: { keyword },
    });
    // 處理搜尋結果
  } catch (error) {
    message.error("搜尋失敗");
  }
};
</script>
```

## 常用 API 處理模式

### CRUD 操作組合式函數

```javascript
// composables/useApi.js
import { ref, reactive } from "vue";
import { message } from "ant-design-vue";
import api from "@/api";

export function useCrud(endpoint) {
  const data = ref([]);
  const loading = ref(false);
  const pagination = reactive({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  // 查詢列表
  const handleFetchList = async (params = {}) => {
    loading.value = true;
    try {
      const response = await api.get(endpoint, {
        params: {
          page: pagination.current,
          size: pagination.pageSize,
          ...params,
        },
      });
      data.value = response.data.list || response.data;
      pagination.total = response.data.total || data.value.length;
    } catch (error) {
      message.error("載入資料失敗");
    } finally {
      loading.value = false;
    }
  };

  // 創建
  const handleCreate = async (formData) => {
    try {
      await api.post(endpoint, formData);
      message.success("創建成功");
      handleFetchList(); // 重新載入
      return true;
    } catch (error) {
      message.error("創建失敗");
      return false;
    }
  };

  // 更新
  const handleUpdate = async (id, formData) => {
    try {
      await api.put(`${endpoint}/${id}`, formData);
      message.success("更新成功");
      handleFetchList(); // 重新載入
      return true;
    } catch (error) {
      message.error("更新失敗");
      return false;
    }
  };

  // 刪除
  const handleDelete = async (id) => {
    try {
      await api.delete(`${endpoint}/${id}`);
      message.success("刪除成功");
      handleFetchList(); // 重新載入
      return true;
    } catch (error) {
      message.error("刪除失敗");
      return false;
    }
  };

  // 分頁變更
  const handlePageChange = (page, pageSize) => {
    pagination.current = page;
    pagination.pageSize = pageSize;
    handleFetchList();
  };

  return {
    data,
    loading,
    pagination,
    handleFetchList,
    handleCreate,
    handleUpdate,
    handleDelete,
    handlePageChange,
  };
}
```

### 檔案上傳處理

```vue
<script setup>
import { ref } from "vue";
import { Upload, message } from "ant-design-vue";
import api from "@/api";

const fileList = ref([]);
const uploading = ref(false);

const handleUpload = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  uploading.value = true;
  try {
    const response = await api.post("/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (progressEvent) => {
        const progress = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        console.log(`上傳進度: ${progress}%`);
      },
    });

    message.success("上傳成功");
    return response.data.url;
  } catch (error) {
    message.error("上傳失敗");
    throw error;
  } finally {
    uploading.value = false;
  }
};

const handleCustomRequest = async ({ file, onSuccess, onError }) => {
  try {
    const url = await handleUpload(file);
    onSuccess(url);
  } catch (error) {
    onError(error);
  }
};

const handleRemove = (file) => {
  const index = fileList.value.indexOf(file);
  if (index > -1) {
    fileList.value.splice(index, 1);
  }
};

const handlePreview = (file) => {
  // 預覽邏輯
  console.log("預覽檔案:", file);
};
</script>

<template>
  <a-upload
    v-model:file-list="fileList"
    :custom-request="handleCustomRequest"
    :loading="uploading"
    @remove="handleRemove"
    @preview="handlePreview">
    <a-button :loading="uploading"> 點擊上傳 </a-button>
  </a-upload>
</template>
```

## 表格操作範例

### 完整表格 CRUD 操作

```vue
<script setup>
import { ref, reactive, onMounted } from "vue";
import { useToggle } from "@vueuse/core";
import { Table, Button, Modal, Space, message } from "ant-design-vue";
import { useCrud } from "@/composables/useApi";

// 使用 CRUD 組合式函數
const {
  data: users,
  loading,
  pagination,
  handleFetchList,
  handleDelete,
} = useCrud("/users");

// 模態框控制
const [modalVisible, toggleModal] = useToggle(false);
const [editMode, toggleEditMode] = useToggle(false);
const currentRecord = ref(null);

// 表格欄位定義
const columns = [
  { title: "姓名", dataIndex: "name", key: "name" },
  { title: "郵箱", dataIndex: "email", key: "email" },
  { title: "狀態", dataIndex: "status", key: "status" },
  {
    title: "操作",
    key: "action",
    width: 200,
    customRender: ({ record }) =>
      h(Space, [
        h(
          Button,
          {
            type: "primary",
            size: "small",
            onClick: () => handleEdit(record),
          },
          "編輯"
        ),
        h(
          Button,
          {
            danger: true,
            size: "small",
            onClick: () => handleConfirmDelete(record),
          },
          "刪除"
        ),
      ]),
  },
];

// 事件處理方法
const handleAdd = () => {
  currentRecord.value = null;
  toggleEditMode(false);
  toggleModal(true);
};

const handleEdit = (record) => {
  currentRecord.value = { ...record };
  toggleEditMode(true);
  toggleModal(true);
};

const handleConfirmDelete = (record) => {
  Modal.confirm({
    title: "確認刪除",
    content: `確定要刪除用戶 "${record.name}" 嗎？`,
    onOk: () => handleDeleteUser(record.id),
  });
};

const handleDeleteUser = async (id) => {
  const success = await handleDelete(id);
  if (success) {
    message.success("刪除成功");
  }
};

const handleModalCancel = () => {
  toggleModal(false);
  currentRecord.value = null;
};

const handleModalSubmit = (formData) => {
  // 處理表單提交
  toggleModal(false);
  handleFetchList(); // 重新載入列表
};

const handleTableChange = (pag, filters, sorter) => {
  pagination.current = pag.current;
  pagination.pageSize = pag.pageSize;
  handleFetchList();
};

// 初始化
onMounted(() => {
  handleFetchList();
});
</script>

<template>
  <div>
    <div style="margin-bottom: 16px;">
      <a-button
        type="primary"
        @click="handleAdd">
        新增用戶
      </a-button>
    </div>

    <a-table
      :columns="columns"
      :data-source="users"
      :loading="loading"
      :pagination="pagination"
      @change="handleTableChange" />

    <!-- 編輯模態框 -->
    <user-form-modal
      v-model:visible="modalVisible"
      :edit-mode="editMode"
      :record="currentRecord"
      @submit="handleModalSubmit"
      @cancel="handleModalCancel" />
  </div>
</template>
```

## 錯誤處理最佳實踐

### 全局錯誤處理

```javascript
// utils/errorHandler.js
import { message } from "ant-design-vue";

export const handleApiError = (error) => {
  if (error.response) {
    const { status, data } = error.response;

    switch (status) {
      case 400:
        message.error(data.message || "請求參數錯誤");
        break;
      case 401:
        message.error("登入已過期，請重新登入");
        handleLogout();
        break;
      case 403:
        message.error("沒有權限執行此操作");
        break;
      case 404:
        message.error("請求的資源不存在");
        break;
      case 500:
        message.error("伺服器內部錯誤");
        break;
      default:
        message.error("請求失敗");
    }
  } else if (error.request) {
    message.error("網路連接失敗");
  } else {
    message.error("請求配置錯誤");
  }
};

const handleLogout = () => {
  localStorage.removeItem("token");
  // 跳轉到登入頁
  window.location.href = "/login";
};
```

## 回應指導原則

1. **所有方法統一使用 `handleXXX` 命名格式**
2. **使用 Axios 處理所有 HTTP 請求**，不使用 VueUse 的 useFetch
3. **優先使用 VueUse 組合式函數**處理非網路請求相關功能
4. **使用 Ant Design Vue 組件**，確保 UI 一致性
5. **提供完整的錯誤處理**，包含 loading 狀態和錯誤訊息
6. **使用組合式函數封裝 API 邏輯**，提高程式碼複用性
7. **確保響應式設計**，使用 Ant Design 網格系統
8. **使用 Script Setup 語法**，保持程式碼簡潔
9. **提供實際可用的程式碼範例**，包含完整的導入和配置
10. **事件處理、API 調用、用戶操作等所有方法都使用 handle 前綴**
