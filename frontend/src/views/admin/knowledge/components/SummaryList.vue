<template>
  <div class="summary-list">
    <!-- 列表頭部 -->
    <div class="list-header">
      <div class="header-info">
        <h3 v-if="knowledgeStore.selectedCategory">
          {{ knowledgeStore.selectedCategory.name }} - 文檔摘要
        </h3>
        <div
          class="stats-info"
          v-if="knowledgeStore.selectedCategoryStats">
          <a-tag color="blue">
            <FileTextOutlined />
            總計: {{ knowledgeStore.selectedCategoryStats.total_documents }}
          </a-tag>
          <a-tag color="green">
            <CheckCircleOutlined />
            已完成:
            {{ knowledgeStore.selectedCategoryStats.completed_documents }}
          </a-tag>
          <a-tag
            v-if="knowledgeStore.selectedCategoryStats.pending_documents > 0"
            color="orange">
            <ClockCircleOutlined />
            待處理: {{ knowledgeStore.selectedCategoryStats.pending_documents }}
          </a-tag>
        </div>
      </div>

      <div class="header-actions">
        <!-- 分類內搜索 -->
        <a-input-search
          v-model:value="localSearchQuery"
          placeholder="在此分類中搜索..."
          style="width: 250px"
          @search="handleLocalSearch"
          @pressEnter="handleLocalSearch"
          allowClear />

        <!-- 排序選項 -->
        <a-select
          v-model:value="sortBy"
          style="width: 120px; margin-left: 8px"
          @change="handleSortChange">
          <a-select-option value="created_desc">最新創建</a-select-option>
          <a-select-option value="created_asc">最早創建</a-select-option>
          <a-select-option value="updated_desc">最近更新</a-select-option>
          <a-select-option value="title_asc">標題 A-Z</a-select-option>
        </a-select>
      </div>
    </div>

    <!-- 摘要列表 -->
    <div class="list-content">
      <!-- 加載狀態 -->
      <div
        v-if="knowledgeStore.summaryLoading"
        class="loading-container">
        <a-spin size="large" />
        <p>載入摘要數據中...</p>
      </div>

      <!-- 摘要卡片列表 -->
      <div
        v-else-if="knowledgeStore.summaries.length > 0"
        class="summary-cards">
        <div
          v-for="summary in knowledgeStore.summaries"
          :key="summary.id"
          class="summary-card"
          @click="handleSelectSummary(summary)">
          <!-- 卡片頭部 -->
          <div class="card-header">
            <div class="title-section">
              <h4 class="summary-title">
                {{ summary.file_name || "未命名文檔" }}
              </h4>
              <div class="meta-info">
                <span class="file-info">
                  <FileTextOutlined />
                  {{ summary.file_name }}
                </span>
                <span class="size-info">
                  <DatabaseOutlined />
                  {{ formatFileSize(summary.file_size) }}
                </span>
                <span class="date-info">
                  <CalendarOutlined />
                  {{ formatDate(summary.document_created_at) }}
                </span>
              </div>
            </div>

            <div class="status-section">
              <a-tag :color="getStatusColor(summary.processing_status)">
                {{ getStatusText(summary.processing_status) }}
              </a-tag>
            </div>
          </div>

          <!-- 摘要內容預覽 -->
          <div class="card-content">
            <p class="summary-preview">
              {{ truncateText(summary.summary_text || "暫無摘要內容", 150) }}
            </p>

            <!-- 關鍵詞標籤 -->
            <div
              v-if="summary.keywords && summary.keywords.length > 0"
              class="keywords-section">
              <a-tag
                v-for="keyword in summary.keywords.slice(0, 5)"
                :key="keyword"
                size="small"
                color="processing">
                {{ keyword }}
              </a-tag>
              <span
                v-if="summary.keywords.length > 5"
                class="more-keywords">
                +{{ summary.keywords.length - 5 }} 更多
              </span>
            </div>
          </div>

          <!-- 卡片底部操作 -->
          <div class="card-footer">
            <div class="document-info">
              <a-tooltip title="查看原始文檔">
                <a-button
                  type="text"
                  size="small"
                  @click.stop="handleViewDocument(summary.id)">
                  <EyeOutlined />
                  查看文檔
                </a-button>
              </a-tooltip>
            </div>

            <div class="actions">
              <a-tooltip title="編輯摘要">
                <a-button
                  type="text"
                  size="small"
                  @click.stop="handleEditSummary(summary)">
                  <EditOutlined />
                </a-button>
              </a-tooltip>

              <a-tooltip title="刪除摘要">
                <a-button
                  type="text"
                  size="small"
                  danger
                  @click.stop="handleDeleteSummary(summary)">
                  <DeleteOutlined />
                </a-button>
              </a-tooltip>
            </div>
          </div>
        </div>
      </div>

      <!-- 空狀態 -->
      <div
        v-else
        class="empty-state">
        <a-empty
          description="此分類暫無摘要數據"
          :image="Empty.PRESENTED_IMAGE_SIMPLE">
          <template #image>
            <FileTextOutlined style="font-size: 64px; color: #d9d9d9" />
          </template>
        </a-empty>
      </div>
    </div>

    <!-- 分頁 -->
    <div
      v-if="knowledgeStore.summaries.length > 0"
      class="pagination-section">
      <a-pagination
        v-model:current="knowledgeStore.summaryPagination.current"
        v-model:page-size="knowledgeStore.summaryPagination.limit"
        :total="knowledgeStore.summaryPagination.total"
        :show-size-changer="true"
        :show-quick-jumper="true"
        :show-total="
          (total, range) => `第 ${range[0]}-${range[1]} 條，共 ${total} 條`
        "
        @change="handlePageChange"
        @showSizeChange="handlePageSizeChange" />
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from "vue";
import { message, Modal, Empty } from "ant-design-vue";
import {
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DatabaseOutlined,
  CalendarOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons-vue";

// Store
import { useKnowledgeStore } from "@/stores/knowledge.js";

const knowledgeStore = useKnowledgeStore();

// 響應式數據
const localSearchQuery = ref("");
const sortBy = ref("created_desc");

// 方法
const handleLocalSearch = () => {
  if (knowledgeStore.selectedCategory) {
    knowledgeStore.loadSummaries(
      knowledgeStore.selectedCategory.code,
      1,
      localSearchQuery.value
    );
  }
};

const handleSortChange = () => {
  // 這裡可以實現排序邏輯
  console.log("排序方式改變:", sortBy.value);
};

const handleSelectSummary = (summary) => {
  knowledgeStore.selectSummary(summary.id);
};

const handleViewDocument = (documentId) => {
  knowledgeStore.loadDocumentDetail(documentId);
};

const handleEditSummary = (summary) => {
  // 觸發編輯摘要的操作
  console.log("編輯摘要:", summary);
};

const handleDeleteSummary = (summary) => {
  Modal.confirm({
    title: "確認刪除",
    content: `確定要刪除摘要 "${summary.title}" 嗎？此操作不可恢復。`,
    okText: "確認刪除",
    okType: "danger",
    cancelText: "取消",
    onOk: async () => {
      const success = await knowledgeStore.deleteSummary(summary.id);
      if (success) {
        message.success("摘要刪除成功");
      }
    },
  });
};

const handlePageChange = (page, pageSize) => {
  if (knowledgeStore.selectedCategory) {
    knowledgeStore.loadSummaries(
      knowledgeStore.selectedCategory.code,
      page,
      localSearchQuery.value
    );
  }
};

const handlePageSizeChange = (current, size) => {
  knowledgeStore.summaryPagination.limit = size;
  handlePageChange(1, size);
};

// 工具函數
const formatFileSize = (bytes) => {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const truncateText = (text, maxLength) => {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
};

const getStatusColor = (status) => {
  const statusColors = {
    completed: "green",
    pending: "orange",
    processing: "blue",
    error: "red",
  };
  return statusColors[status] || "default";
};

const getStatusText = (status) => {
  const statusTexts = {
    completed: "已完成",
    pending: "待處理",
    processing: "處理中",
    error: "錯誤",
  };
  return statusTexts[status] || status;
};

// 監聽選中分類變化，清空本地搜索
watch(
  () => knowledgeStore.selectedCategory,
  () => {
    localSearchQuery.value = "";
  }
);
</script>

<style scoped lang="scss">
.summary-list {
  height: 100%;
  display: flex;
  flex-direction: column;

  .list-header {
    padding: 16px 24px;
    border-bottom: 1px solid var(--custom-border-primary);
    display: flex;
    justify-content: space-between;
    align-items: flex-start;

    .header-info {
      h3 {
        margin: 0 0 8px 0;
        font-size: 18px;
        font-weight: 600;
        color: var(--custom-text-primary);
      }

      .stats-info {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
  }

  .list-content {
    flex: 1;
    overflow-y: auto;
    padding: 16px 24px;

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 200px;
      color: var(--custom-text-tertiary);

      p {
        margin-top: 16px;
        margin-bottom: 0;
      }
    }

    .summary-cards {
      display: grid;
      gap: 16px;

      .summary-card {
        background: var(--custom-bg-primary);
        border: 1px solid var(--custom-border-primary);
        border-radius: 8px;
        padding: 16px;
        cursor: pointer;
        transition: all 0.2s ease;

        &:hover {
          box-shadow: var(--shadow-card-hover);
          border-color: var(--primary-color);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;

          .title-section {
            flex: 1;
            min-width: 0;

            .summary-title {
              margin: 0 0 8px 0;
              font-size: 16px;
              font-weight: 600;
              color: var(--custom-text-primary);
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }

            .meta-info {
              display: flex;
              gap: 16px;
              flex-wrap: wrap;

              span {
                display: flex;
                align-items: center;
                gap: 4px;
                font-size: 12px;
                color: var(--custom-text-tertiary);
              }
            }
          }

          .status-section {
            margin-left: 16px;
          }
        }

        .card-content {
          margin-bottom: 12px;

          .summary-preview {
            margin: 0 0 12px 0;
            color: var(--custom-text-secondary);
            line-height: 1.5;
            font-size: 14px;
          }

          .keywords-section {
            display: flex;
            gap: 4px;
            flex-wrap: wrap;
            align-items: center;

            .more-keywords {
              font-size: 12px;
              color: var(--custom-text-tertiary);
              margin-left: 4px;
            }
          }
        }

        .card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 1px solid var(--custom-border-secondary);
          padding-top: 12px;

          .document-info {
            flex: 1;
          }

          .actions {
            display: flex;
            gap: 4px;
          }
        }
      }
    }

    .empty-state {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 300px;
    }
  }

  .pagination-section {
    padding: 16px 24px;
    border-top: 1px solid var(--custom-border-secondary);
    display: flex;
    justify-content: center;
  }
}

// 響應式設計
@media (max-width: 1200px) {
  .summary-list {
    .list-header {
      flex-direction: column;
      gap: 16px;
      align-items: stretch;

      .header-actions {
        justify-content: space-between;
      }
    }
  }
}

@media (max-width: 768px) {
  .summary-list {
    .list-content {
      padding: 12px 16px;

      .summary-cards {
        .summary-card {
          padding: 12px;

          .card-header {
            flex-direction: column;
            gap: 8px;

            .status-section {
              margin-left: 0;
              align-self: flex-start;
            }
          }

          .card-footer {
            flex-direction: column;
            gap: 8px;
            align-items: stretch;
          }
        }
      }
    }

    .pagination-section {
      padding: 12px 16px;
    }
  }
}
</style>
