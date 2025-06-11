<template>
  <div class="structured-data-display">
    <!-- 表格數據 -->
    <div
      v-if="isTableData"
      class="table-display">
      <a-table
        :dataSource="tableData"
        :columns="tableColumns"
        :pagination="false"
        size="small"
        :scroll="{ x: 'max-content' }"
        bordered>
        <template #bodyCell="{ column, record, text }">
          <span
            v-if="column.dataIndex === 'status'"
            :class="getStatusClass(text)">
            {{ text }}
          </span>
          <span
            v-else-if="column.dataIndex === 'amount'"
            class="amount-cell">
            {{ formatAmount(text) }}
          </span>
          <span v-else>{{ text }}</span>
        </template>
      </a-table>
    </div>

    <!-- 卡片列表數據 -->
    <div
      v-else-if="isCardListData"
      class="card-list-display">
      <div
        v-for="(item, index) in cardListData"
        :key="index"
        class="data-card">
        <div class="card-header">
          <h4>{{ getCardTitle(item) }}</h4>
          <a-tag
            v-if="item.status"
            :color="getStatusColor(item.status)">
            {{ item.status }}
          </a-tag>
        </div>
        <div class="card-content">
          <div
            v-for="(value, key) in getCardFields(item)"
            :key="key"
            class="field-row">
            <span class="field-label">{{ formatFieldLabel(key) }}：</span>
            <span class="field-value">{{ formatFieldValue(value) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 鍵值對數據 -->
    <div
      v-else-if="isKeyValueData"
      class="key-value-display">
      <div
        v-for="(value, key) in data"
        :key="key"
        class="kv-row">
        <div class="kv-key">{{ formatFieldLabel(key) }}</div>
        <div class="kv-value">
          <StructuredDataDisplay
            v-if="typeof value === 'object' && value !== null"
            :data="value" />
          <span v-else>{{ formatFieldValue(value) }}</span>
        </div>
      </div>
    </div>

    <!-- 數組數據 -->
    <div
      v-else-if="Array.isArray(data)"
      class="array-display">
      <div
        v-for="(item, index) in data"
        :key="index"
        class="array-item">
        <div class="item-index">[{{ index }}]</div>
        <div class="item-content">
          <StructuredDataDisplay
            v-if="typeof item === 'object' && item !== null"
            :data="item" />
          <span v-else>{{ formatFieldValue(item) }}</span>
        </div>
      </div>
    </div>

    <!-- 純文本數據 -->
    <div
      v-else
      class="text-display">
      {{ formatFieldValue(data) }}
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  data: {
    type: [Object, Array, String, Number, Boolean],
    required: true,
  },
});

// 檢查是否為表格數據
const isTableData = computed(() => {
  if (!Array.isArray(props.data)) return false;
  if (props.data.length === 0) return false;

  // 檢查是否所有項目都是對象且有相似的鍵
  const firstItem = props.data[0];
  if (typeof firstItem !== "object" || firstItem === null) return false;

  const firstKeys = Object.keys(firstItem);
  return props.data.every(
    (item) =>
      typeof item === "object" &&
      item !== null &&
      Object.keys(item).some((key) => firstKeys.includes(key))
  );
});

// 檢查是否為卡片列表數據
const isCardListData = computed(() => {
  return (
    isTableData.value &&
    props.data.length <= 5 &&
    props.data.some((item) => Object.keys(item).length > 4)
  );
});

// 檢查是否為鍵值對數據
const isKeyValueData = computed(() => {
  return (
    typeof props.data === "object" &&
    props.data !== null &&
    !Array.isArray(props.data)
  );
});

// 表格數據
const tableData = computed(() => {
  if (!isTableData.value) return [];
  return props.data.map((item, index) => ({ ...item, key: index }));
});

// 表格列
const tableColumns = computed(() => {
  if (!isTableData.value) return [];

  const allKeys = new Set();
  props.data.forEach((item) => {
    Object.keys(item).forEach((key) => allKeys.add(key));
  });

  return Array.from(allKeys).map((key) => ({
    title: formatFieldLabel(key),
    dataIndex: key,
    key: key,
    ellipsis: true,
    width: getColumnWidth(key),
  }));
});

// 卡片列表數據
const cardListData = computed(() => {
  return isCardListData.value ? props.data : [];
});

// 獲取卡片標題
const getCardTitle = (item) => {
  // 優先使用 name, title, displayName 等字段
  return (
    item.name ||
    item.title ||
    item.displayName ||
    item.departmentName ||
    item.employeeName ||
    `項目 ${Object.keys(item)[0]}`
  );
};

// 獲取卡片字段（排除標題字段）
const getCardFields = (item) => {
  const titleFields = [
    "name",
    "title",
    "displayName",
    "departmentName",
    "employeeName",
  ];
  const result = {};

  Object.keys(item).forEach((key) => {
    if (!titleFields.includes(key)) {
      result[key] = item[key];
    }
  });

  return result;
};

// 格式化字段標籤
const formatFieldLabel = (key) => {
  const labelMap = {
    // 通用字段
    id: "ID",
    name: "名稱",
    title: "標題",
    description: "描述",
    status: "狀態",
    createdAt: "創建時間",
    updatedAt: "更新時間",
    created_at: "創建時間",
    updated_at: "更新時間",

    // HR 相關
    employeeId: "員工ID",
    employeeName: "員工姓名",
    departmentId: "部門ID",
    departmentName: "部門名稱",
    departmentCode: "部門代碼",
    englishName: "英文名稱",
    position: "職位",
    salary: "薪資",
    email: "郵箱",
    phone: "電話",
    hireDate: "入職日期",
    manager: "主管",
    location: "位置",
    budget: "預算",
    statistics: "統計",
    totalEmployees: "總員工數",
    activeEmployees: "在職員工數",
    averageAge: "平均年齡",
    averageTenure: "平均工齡",

    // 財務相關
    amount: "金額",
    currency: "貨幣",
    annual: "年度",
    monthly: "月度",
    quarterly: "季度",

    // 任務相關
    taskId: "任務ID",
    taskName: "任務名稱",
    priority: "優先級",
    assignee: "負責人",
    dueDate: "截止日期",
    progress: "進度",
  };

  return (
    labelMap[key] ||
    key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())
  );
};

// 格式化字段值
const formatFieldValue = (value) => {
  if (value === null || value === undefined) return "-";
  if (typeof value === "boolean") return value ? "是" : "否";
  if (typeof value === "number") {
    // 檢查是否為金額
    if (value > 1000000) {
      return (value / 10000).toFixed(1) + "萬";
    }
    return value.toLocaleString();
  }
  if (typeof value === "string") {
    // 檢查是否為日期
    if (value.match(/^\d{4}-\d{2}-\d{2}/)) {
      try {
        return new Date(value).toLocaleDateString("zh-TW");
      } catch {
        return value;
      }
    }
    return value;
  }
  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
};

// 格式化金額
const formatAmount = (amount) => {
  if (typeof amount !== "number") return amount;
  return `$${amount.toLocaleString()}`;
};

// 獲取狀態樣式
const getStatusClass = (status) => {
  const statusMap = {
    active: "status-active",
    inactive: "status-inactive",
    pending: "status-pending",
    completed: "status-completed",
    cancelled: "status-cancelled",
  };
  return statusMap[status] || "status-default";
};

// 獲取狀態顏色
const getStatusColor = (status) => {
  const colorMap = {
    active: "green",
    inactive: "red",
    pending: "orange",
    completed: "blue",
    cancelled: "default",
  };
  return colorMap[status] || "default";
};

// 獲取列寬度
const getColumnWidth = (key) => {
  const widthMap = {
    id: 80,
    name: 120,
    email: 180,
    phone: 120,
    status: 80,
    amount: 100,
  };
  return widthMap[key] || 100;
};
</script>

<style scoped>
.structured-data-display {
  font-size: 13px;
}

/* 表格顯示 */
.table-display {
  margin: 8px 0;
}

.table-display :deep(.ant-table) {
  font-size: 12px;
}

.table-display :deep(.ant-table-thead > tr > th) {
  background: #fafafa;
  font-weight: 500;
  padding: 8px;
}

.table-display :deep(.ant-table-tbody > tr > td) {
  padding: 6px 8px;
}

/* 卡片列表顯示 */
.card-list-display {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.data-card {
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  padding: 12px;
  background: #fff;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
}

.card-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: #262626;
}

.card-content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 6px;
}

.field-row {
  display: flex;
  align-items: center;
}

.field-label {
  font-weight: 500;
  color: #8c8c8c;
  min-width: 80px;
  margin-right: 8px;
}

.field-value {
  color: #262626;
  flex: 1;
}

/* 鍵值對顯示 */
.key-value-display {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.kv-row {
  display: flex;
  align-items: flex-start;
  padding: 4px 0;
}

.kv-key {
  font-weight: 500;
  color: #8c8c8c;
  min-width: 120px;
  margin-right: 12px;
  flex-shrink: 0;
}

.kv-value {
  color: #262626;
  flex: 1;
  word-break: break-word;
}

/* 數組顯示 */
.array-display {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.array-item {
  display: flex;
  align-items: flex-start;
  padding: 6px;
  background: #f9f9f9;
  border-radius: 4px;
}

.item-index {
  font-weight: 500;
  color: #1890ff;
  min-width: 40px;
  margin-right: 8px;
  flex-shrink: 0;
}

.item-content {
  flex: 1;
}

/* 文本顯示 */
.text-display {
  padding: 8px;
  background: #f9f9f9;
  border-radius: 4px;
  word-break: break-word;
}

/* 狀態樣式 */
.status-active {
  color: #52c41a;
  font-weight: 500;
}

.status-inactive {
  color: #ff4d4f;
  font-weight: 500;
}

.status-pending {
  color: #faad14;
  font-weight: 500;
}

.status-completed {
  color: #1890ff;
  font-weight: 500;
}

.status-cancelled {
  color: #8c8c8c;
  font-weight: 500;
}

.amount-cell {
  font-weight: 500;
  color: #52c41a;
}

/* 深色模式 */
.dark .data-card {
  background: #1f1f1f;
  border-color: #434343;
}

.dark .card-header {
  border-color: #434343;
}

.dark .card-header h4 {
  color: #d9d9d9;
}

.dark .field-value,
.dark .kv-value {
  color: #d9d9d9;
}

.dark .array-item,
.dark .text-display {
  background: #262626;
}
</style>
