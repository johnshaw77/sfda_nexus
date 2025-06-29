<template>
  <a-drawer
    v-model:open="isVisible"
    title="摘要詳情"
    placement="right"
    :width="600"
    :closable="true"
    @close="handleClose">
    <div
      v-if="knowledgeStore.selectedSummary"
      class="summary-detail">
      <!-- 摘要基本信息 -->
      <div class="summary-header">
        <h3 class="summary-title">
          {{ knowledgeStore.selectedSummary.file_name }}
        </h3>
        <div class="summary-meta">
          <a-tag
            :color="
              getStatusColor(knowledgeStore.selectedSummary.processing_status)
            ">
            {{
              getStatusText(knowledgeStore.selectedSummary.processing_status)
            }}
          </a-tag>
          <a-tag color="blue">{{
            knowledgeStore.selectedSummary.category_name
          }}</a-tag>
        </div>
      </div>

      <!-- 文檔信息 -->
      <div class="section">
        <h4 class="section-title">
          <FileTextOutlined />
          文檔信息
        </h4>
        <div class="info-grid">
          <div class="info-item">
            <span class="label">原始檔名:</span>
            <span class="value">{{
              knowledgeStore.selectedSummary.file_name
            }}</span>
          </div>
          <div class="info-item">
            <span class="label">文件大小:</span>
            <span class="value">{{
              formatFileSize(knowledgeStore.selectedSummary.file_size)
            }}</span>
          </div>
          <div class="info-item">
            <span class="label">創建時間:</span>
            <span class="value">{{
              formatDate(knowledgeStore.selectedSummary.document_created_at)
            }}</span>
          </div>
          <div class="info-item">
            <span class="label">更新時間:</span>
            <span class="value">{{
              formatDate(knowledgeStore.selectedSummary.summary_created_at)
            }}</span>
          </div>
        </div>
      </div>

      <!-- AI 摘要內容 -->
      <div class="section">
        <h4 class="section-title">
          <RobotOutlined />
          AI 智能摘要
        </h4>
        <div class="summary-content">
          <div class="content-text">
            {{ knowledgeStore.selectedSummary.summary_text || "暫無摘要內容" }}
          </div>

          <!-- 摘要操作按鈕 -->
          <div class="content-actions">
            <a-button
              type="primary"
              size="small"
              @click="handleEditSummary">
              <EditOutlined />
              編輯摘要
            </a-button>
            <a-button
              size="small"
              @click="handleCopySummary">
              <CopyOutlined />
              複製內容
            </a-button>
          </div>
        </div>
      </div>

      <!-- 關鍵詞 -->
      <div
        v-if="
          knowledgeStore.selectedSummary.keywords &&
          knowledgeStore.selectedSummary.keywords.length > 0
        "
        class="section">
        <h4 class="section-title">
          <TagOutlined />
          關鍵詞標籤
        </h4>
        <div class="keywords-container">
          <a-tag
            v-for="keyword in knowledgeStore.selectedSummary.keywords"
            :key="keyword"
            color="processing"
            closable
            @close="handleRemoveKeyword(keyword)">
            {{ keyword }}
          </a-tag>
          <a-button
            type="dashed"
            size="small"
            @click="showAddKeywordModal = true">
            <PlusOutlined />
            添加關鍵詞
          </a-button>
        </div>
      </div>

      <!-- 實體信息 -->
      <div
        v-if="
          knowledgeStore.selectedSummary.entities &&
          knowledgeStore.selectedSummary.entities.length > 0
        "
        class="section">
        <h4 class="section-title">
          <UserOutlined />
          實體識別
        </h4>
        <div class="entities-container">
          <a-tag
            v-for="entity in knowledgeStore.selectedSummary.entities"
            :key="entity"
            color="cyan">
            {{ entity }}
          </a-tag>
        </div>
      </div>

      <!-- 原始文檔操作 -->
      <div class="section">
        <h4 class="section-title">
          <DownloadOutlined />
          文檔操作
        </h4>
        <div class="document-actions">
          <a-button
            type="primary"
            @click="handleViewDocument">
            <EyeOutlined />
            查看原始文檔
          </a-button>
          <a-button
            @click="handleDownloadDocument"
            :loading="downloadLoading">
            <DownloadOutlined />
            下載文檔
          </a-button>
          <a-button
            danger
            @click="handleDeleteSummary">
            <DeleteOutlined />
            刪除摘要
          </a-button>
        </div>
      </div>

      <!-- 處理歷史 -->
      <div class="section">
        <h4 class="section-title">
          <HistoryOutlined />
          處理歷史
        </h4>
        <a-timeline>
          <a-timeline-item color="green">
            <template #dot>
              <CheckCircleOutlined />
            </template>
            <div class="timeline-content">
              <div class="timeline-title">摘要生成完成</div>
              <div class="timeline-time">
                {{
                  formatDate(knowledgeStore.selectedSummary.summary_created_at)
                }}
              </div>
            </div>
          </a-timeline-item>
          <a-timeline-item color="blue">
            <template #dot>
              <UploadOutlined />
            </template>
            <div class="timeline-content">
              <div class="timeline-title">文檔上傳成功</div>
              <div class="timeline-time">
                {{
                  formatDate(knowledgeStore.selectedSummary.document_created_at)
                }}
              </div>
            </div>
          </a-timeline-item>
        </a-timeline>
      </div>
    </div>

    <!-- 空狀態 -->
    <div
      v-else
      class="empty-state">
      <a-empty description="請選擇一個摘要查看詳情" />
    </div>

    <!-- 編輯摘要模態框 -->
    <a-modal
      v-model:open="showEditModal"
      title="編輯摘要"
      width="800px"
      @ok="handleSaveEdit"
      @cancel="handleCancelEdit">
      <a-textarea
        v-model:value="editSummaryContent"
        :rows="10"
        placeholder="請輸入摘要內容..." />
    </a-modal>

    <!-- 添加關鍵詞模態框 -->
    <a-modal
      v-model:open="showAddKeywordModal"
      title="添加關鍵詞"
      @ok="handleAddKeyword"
      @cancel="newKeyword = ''">
      <a-input
        v-model:value="newKeyword"
        placeholder="請輸入關鍵詞"
        @pressEnter="handleAddKeyword" />
    </a-modal>
  </a-drawer>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import { message, Modal } from "ant-design-vue";
import {
  FileTextOutlined,
  RobotOutlined,
  EditOutlined,
  CopyOutlined,
  TagOutlined,
  PlusOutlined,
  UserOutlined,
  DownloadOutlined,
  EyeOutlined,
  DeleteOutlined,
  HistoryOutlined,
  CheckCircleOutlined,
  UploadOutlined,
} from "@ant-design/icons-vue";

// Store
import { useKnowledgeStore } from "@/stores/knowledge.js";

const knowledgeStore = useKnowledgeStore();

// 響應式數據
const showEditModal = ref(false);
const showAddKeywordModal = ref(false);
const editSummaryContent = ref("");
const newKeyword = ref("");
const downloadLoading = ref(false);

// 計算屬性
const isVisible = computed(() => {
  return !!knowledgeStore.selectedSummary;
});

// 方法
const handleClose = () => {
  knowledgeStore.selectedSummary = null;
};

const handleEditSummary = () => {
  editSummaryContent.value = knowledgeStore.selectedSummary.summary_text || "";
  showEditModal.value = true;
};

const handleSaveEdit = async () => {
  try {
    const success = await knowledgeStore.updateSummary(
      knowledgeStore.selectedSummary.id,
      { summary_text: editSummaryContent.value }
    );

    if (success) {
      showEditModal.value = false;
      message.success("摘要更新成功");
    }
  } catch (error) {
    message.error("更新失敗: " + error.message);
  }
};

const handleCancelEdit = () => {
  showEditModal.value = false;
  editSummaryContent.value = "";
};

const handleCopySummary = async () => {
  try {
    await navigator.clipboard.writeText(
      knowledgeStore.selectedSummary.summary_text || ""
    );
    message.success("內容已複製到剪貼板");
  } catch (error) {
    message.error("複製失敗");
  }
};

const handleRemoveKeyword = async (keyword) => {
  try {
    const currentKeywords = knowledgeStore.selectedSummary.keywords || [];
    const newKeywords = currentKeywords.filter((k) => k !== keyword);

    const success = await knowledgeStore.updateSummary(
      knowledgeStore.selectedSummary.id,
      { keywords: newKeywords }
    );

    if (success) {
      message.success("關鍵詞移除成功");
    }
  } catch (error) {
    message.error("移除失敗: " + error.message);
  }
};

const handleAddKeyword = async () => {
  if (!newKeyword.value.trim()) {
    message.warning("請輸入關鍵詞");
    return;
  }

  try {
    const currentKeywords = knowledgeStore.selectedSummary.keywords || [];

    if (currentKeywords.includes(newKeyword.value.trim())) {
      message.warning("關鍵詞已存在");
      return;
    }

    const newKeywords = [...currentKeywords, newKeyword.value.trim()];

    const success = await knowledgeStore.updateSummary(
      knowledgeStore.selectedSummary.id,
      { keywords: newKeywords }
    );

    if (success) {
      showAddKeywordModal.value = false;
      newKeyword.value = "";
      message.success("關鍵詞添加成功");
    }
  } catch (error) {
    message.error("添加失敗: " + error.message);
  }
};

const handleViewDocument = () => {
  if (knowledgeStore.selectedSummary.id) {
    knowledgeStore.loadDocumentDetail(knowledgeStore.selectedSummary.id);
  }
};

const handleDownloadDocument = async () => {
  try {
    downloadLoading.value = true;

    // 這裡應該調用下載 API
    message.info("下載功能開發中...");
  } catch (error) {
    message.error("下載失敗: " + error.message);
  } finally {
    downloadLoading.value = false;
  }
};

const handleDeleteSummary = () => {
  Modal.confirm({
    title: "確認刪除",
    content: `確定要刪除摘要 "${knowledgeStore.selectedSummary.file_name}" 嗎？此操作不可恢復。`,
    okText: "確認刪除",
    okType: "danger",
    cancelText: "取消",
    onOk: async () => {
      const success = await knowledgeStore.deleteSummary(
        knowledgeStore.selectedSummary.id
      );
      if (success) {
        handleClose();
      }
    },
  });
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
</script>

<style scoped lang="scss">
.summary-detail {
  .summary-header {
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--custom-border-secondary);

    .summary-title {
      margin: 0 0 8px 0;
      font-size: 18px;
      font-weight: 600;
      color: var(--custom-text-primary);
    }

    .summary-meta {
      display: flex;
      gap: 8px;
    }
  }

  .section {
    margin-bottom: 24px;

    .section-title {
      margin: 0 0 12px 0;
      font-size: 14px;
      font-weight: 600;
      color: var(--custom-text-primary);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .info-grid {
      display: grid;
      gap: 12px;

      .info-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 0;
        border-bottom: 1px solid var(--custom-border-secondary);

        .label {
          font-weight: 500;
          color: var(--custom-text-secondary);
        }

        .value {
          color: var(--custom-text-primary);
          text-align: right;
          word-break: break-all;
        }
      }
    }

    .summary-content {
      .content-text {
        background: var(--custom-bg-secondary);
        border: 1px solid var(--custom-border-primary);
        border-radius: 6px;
        padding: 16px;
        line-height: 1.6;
        color: var(--custom-text-primary);
        margin-bottom: 12px;
        white-space: pre-wrap;
        min-height: 100px;
      }

      .content-actions {
        display: flex;
        gap: 8px;
      }
    }

    .keywords-container {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      align-items: center;
    }

    .entities-container {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .document-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .timeline-content {
      .timeline-title {
        font-weight: 500;
        color: var(--custom-text-primary);
        margin-bottom: 4px;
      }

      .timeline-time {
        font-size: 12px;
        color: var(--custom-text-tertiary);
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

// 響應式設計
@media (max-width: 768px) {
  .summary-detail {
    .section {
      .document-actions {
        flex-direction: column;

        :deep(.ant-btn) {
          width: 100%;
        }
      }

      .content-actions {
        flex-direction: column;

        :deep(.ant-btn) {
          width: 100%;
        }
      }
    }
  }
}
</style>
