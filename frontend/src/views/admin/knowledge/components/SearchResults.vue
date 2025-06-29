<template>
  <div class="search-results">
    <!-- 搜索頭部 -->
    <div class="search-header">
      <div class="search-info">
        <h3>搜索結果</h3>
        <p v-if="query">
          關鍵字: <strong>"{{ query }}"</strong>
          <span v-if="knowledgeStore.searchPagination.total > 0">
            - 找到 {{ knowledgeStore.searchPagination.total }} 條結果
          </span>
        </p>
      </div>

      <div class="search-actions">
        <a-button @click="handleClearSearch">
          <CloseOutlined />
          清空搜索
        </a-button>
      </div>
    </div>

    <!-- 搜索結果內容 -->
    <div class="search-content">
      <!-- 加載狀態 -->
      <div
        v-if="knowledgeStore.searchLoading"
        class="loading-container">
        <a-spin size="large" />
        <p>搜索中...</p>
      </div>

      <!-- 搜索結果列表 -->
      <div
        v-else-if="knowledgeStore.searchResults.length > 0"
        class="results-list">
        <div
          v-for="result in knowledgeStore.searchResults"
          :key="result.id"
          class="result-item"
          @click="handleSelectResult(result)">
          <!-- 結果頭部 -->
          <div class="result-header">
            <div class="title-section">
              <h4
                class="result-title"
                v-html="highlightText(result.title, query)"></h4>
              <div class="meta-info">
                <a-tag color="blue">{{ result.category_name }}</a-tag>
                <span class="file-info">
                  <FileTextOutlined />
                  {{ result.original_filename }}
                </span>
                <span class="date-info">
                  <CalendarOutlined />
                  {{ formatDate(result.created_at) }}
                </span>
              </div>
            </div>

            <div class="status-section">
              <a-tag :color="getStatusColor(result.status)">
                {{ getStatusText(result.status) }}
              </a-tag>
            </div>
          </div>

          <!-- 摘要內容 -->
          <div class="result-content">
            <p
              class="summary-snippet"
              v-html="highlightText(result.ai_summary, query)"></p>

            <!-- 關鍵詞 -->
            <div
              v-if="result.keywords && result.keywords.length > 0"
              class="keywords-section">
              <a-tag
                v-for="keyword in result.keywords.slice(0, 3)"
                :key="keyword"
                size="small"
                :color="
                  keyword.toLowerCase().includes(query.toLowerCase())
                    ? 'red'
                    : 'processing'
                ">
                {{ keyword }}
              </a-tag>
            </div>
          </div>

          <!-- 相關度評分 -->
          <div class="relevance-section">
            <span class="relevance-label">相關度:</span>
            <a-progress
              :percent="Math.round((result.relevance_score || 0.8) * 100)"
              :stroke-width="4"
              :show-info="false"
              style="width: 100px" />
          </div>
        </div>
      </div>

      <!-- 無結果狀態 -->
      <div
        v-else
        class="no-results">
        <a-empty
          description="沒有找到相關結果"
          :image="Empty.PRESENTED_IMAGE_SIMPLE">
          <template #image>
            <SearchOutlined style="font-size: 64px; color: #d9d9d9" />
          </template>
          <template #description>
            <p>
              沒有找到包含 <strong>"{{ query }}"</strong> 的文檔
            </p>
            <p>請嘗試:</p>
            <ul style="text-align: left; display: inline-block">
              <li>使用不同的關鍵字</li>
              <li>減少搜索詞數量</li>
              <li>檢查拼寫是否正確</li>
            </ul>
          </template>
        </a-empty>
      </div>
    </div>

    <!-- 分頁 -->
    <div
      v-if="knowledgeStore.searchResults.length > 0"
      class="pagination-section">
      <a-pagination
        v-model:current="knowledgeStore.searchPagination.current"
        v-model:page-size="knowledgeStore.searchPagination.limit"
        :total="knowledgeStore.searchPagination.total"
        :show-size-changer="true"
        :show-quick-jumper="true"
        :show-total="
          (total, range) => `第 ${range[0]}-${range[1]} 條，共 ${total} 條結果`
        "
        @change="handlePageChange"
        @showSizeChange="handlePageSizeChange" />
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { message, Empty } from "ant-design-vue";
import {
  SearchOutlined,
  CloseOutlined,
  FileTextOutlined,
  CalendarOutlined,
} from "@ant-design/icons-vue";

// Store
import { useKnowledgeStore } from "@/stores/knowledge.js";

// Props
const props = defineProps({
  query: {
    type: String,
    default: "",
  },
});

const knowledgeStore = useKnowledgeStore();

// 方法
const handleSelectResult = (result) => {
  knowledgeStore.selectSummary(result.id);
};

const handleClearSearch = () => {
  knowledgeStore.clearSearch();
};

const handlePageChange = (page, pageSize) => {
  knowledgeStore.searchSummaries(props.query, page);
};

const handlePageSizeChange = (current, size) => {
  knowledgeStore.searchPagination.limit = size;
  handlePageChange(1, size);
};

// 工具函數
const highlightText = (text, query) => {
  if (!text || !query) return text;

  const regex = new RegExp(`(${query})`, "gi");
  return text.replace(regex, "<mark>$1</mark>");
};

const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
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
.search-results {
  height: 100%;
  display: flex;
  flex-direction: column;

  .search-header {
    padding: 16px 24px;
    border-bottom: 1px solid #f0f0f0;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;

    .search-info {
      h3 {
        margin: 0 0 8px 0;
        font-size: 18px;
        font-weight: 600;
        color: #262626;
      }

      p {
        margin: 0;
        color: #8c8c8c;
        font-size: 14px;
      }
    }
  }

  .search-content {
    flex: 1;
    overflow-y: auto;
    padding: 16px 24px;

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 200px;
      color: #8c8c8c;

      p {
        margin-top: 16px;
        margin-bottom: 0;
      }
    }

    .results-list {
      display: flex;
      flex-direction: column;
      gap: 16px;

      .result-item {
        background: white;
        border: 1px solid #e8e8e8;
        border-radius: 8px;
        padding: 16px;
        cursor: pointer;
        transition: all 0.2s ease;

        &:hover {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          border-color: #1890ff;
        }

        .result-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;

          .title-section {
            flex: 1;
            min-width: 0;

            .result-title {
              margin: 0 0 8px 0;
              font-size: 16px;
              font-weight: 600;
              color: #262626;
              line-height: 1.4;

              :deep(mark) {
                background: #fff2e8;
                color: #fa8c16;
                padding: 2px 4px;
                border-radius: 2px;
              }
            }

            .meta-info {
              display: flex;
              gap: 12px;
              flex-wrap: wrap;
              align-items: center;

              span {
                display: flex;
                align-items: center;
                gap: 4px;
                font-size: 12px;
                color: #8c8c8c;
              }
            }
          }

          .status-section {
            margin-left: 16px;
          }
        }

        .result-content {
          margin-bottom: 12px;

          .summary-snippet {
            margin: 0 0 12px 0;
            color: #595959;
            line-height: 1.5;
            font-size: 14px;

            :deep(mark) {
              background: #fff2e8;
              color: #fa8c16;
              padding: 2px 4px;
              border-radius: 2px;
            }
          }

          .keywords-section {
            display: flex;
            gap: 4px;
            flex-wrap: wrap;
          }
        }

        .relevance-section {
          display: flex;
          align-items: center;
          gap: 8px;
          border-top: 1px solid #f0f0f0;
          padding-top: 12px;

          .relevance-label {
            font-size: 12px;
            color: #8c8c8c;
          }
        }
      }
    }

    .no-results {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 400px;

      ul {
        margin: 8px 0 0 0;
        color: #8c8c8c;
        font-size: 14px;
      }
    }
  }

  .pagination-section {
    padding: 16px 24px;
    border-top: 1px solid #f0f0f0;
    display: flex;
    justify-content: center;
  }
}

// 響應式設計
@media (max-width: 768px) {
  .search-results {
    .search-header {
      flex-direction: column;
      gap: 12px;
      align-items: stretch;
    }

    .search-content {
      padding: 12px 16px;

      .results-list {
        .result-item {
          padding: 12px;

          .result-header {
            flex-direction: column;
            gap: 8px;

            .status-section {
              margin-left: 0;
              align-self: flex-start;
            }
          }

          .relevance-section {
            flex-direction: column;
            align-items: flex-start;
            gap: 4px;
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
