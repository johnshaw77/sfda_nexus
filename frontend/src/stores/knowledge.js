/**
 * 知識庫管理 Store
 * 使用 Pinia 管理知識庫的狀態和操作
 */

import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { message } from "ant-design-vue";
import KnowledgeAPI from "@/api/knowledge.js";

export const useKnowledgeStore = defineStore("knowledge", () => {
  // ===== 狀態 =====

  // 分類相關
  const categories = ref([]);
  const selectedCategory = ref(null);
  const categoryLoading = ref(false);

  // 摘要相關
  const summaries = ref([]);
  const selectedSummary = ref(null);
  const summaryLoading = ref(false);
  const summaryPagination = ref({
    current: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // 搜索相關
  const searchQuery = ref("");
  const searchResults = ref([]);
  const searchLoading = ref(false);
  const searchPagination = ref({
    current: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // 統計相關
  const stats = ref({
    overview: {},
    categories: [],
  });
  const statsLoading = ref(false);

  // 文檔相關
  const selectedDocument = ref(null);
  const documentLoading = ref(false);

  // UI 狀態
  const sidebarCollapsed = ref(false);
  const activeView = ref("summaries"); // 'summaries' | 'search' | 'stats'

  // ===== 計算屬性 =====

  // 分類樹數據（用於樹形組件）
  const categoryTree = computed(() => {
    return categories.value.map((category) => ({
      key: category.code,
      title: category.name,
      icon: category.icon,
      stats: category.stats,
      children: [], // KESS 目前是平面結構
    }));
  });

  // 當前選中分類的統計信息
  const selectedCategoryStats = computed(() => {
    if (!selectedCategory.value) return null;
    return selectedCategory.value.stats;
  });

  // 是否有搜索結果
  const hasSearchResults = computed(() => {
    return searchResults.value.length > 0;
  });

  // 總文檔數
  const totalDocuments = computed(() => {
    return stats.value.overview?.total_documents || 0;
  });

  // ===== Actions =====

  /**
   * 初始化知識庫數據
   */
  async function initialize() {
    try {
      await Promise.all([loadCategories(), loadStats()]);
    } catch (error) {
      console.error("初始化知識庫失敗:", error);
      message.error("初始化知識庫失敗");
    }
  }

  /**
   * 載入分類列表
   */
  async function loadCategories() {
    try {
      categoryLoading.value = true;
      const response = await KnowledgeAPI.getCategories();

      if (response.data.success) {
        categories.value = response.data.data;
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      console.error("載入分類失敗:", error);
      message.error("載入分類失敗: " + error.message);
    } finally {
      categoryLoading.value = false;
    }
  }

  /**
   * 選擇分類
   */
  async function selectCategory(categoryCode) {
    try {
      const category = categories.value.find(
        (cat) => cat.code === categoryCode
      );
      if (!category) {
        throw new Error("分類不存在");
      }

      selectedCategory.value = category;

      // 載入該分類的摘要
      await loadSummaries(categoryCode, 1);

      // 切換到摘要視圖
      activeView.value = "summaries";
    } catch (error) {
      console.error("選擇分類失敗:", error);
      message.error("選擇分類失敗: " + error.message);
    }
  }

  /**
   * 載入摘要列表
   */
  async function loadSummaries(categoryCode, page = 1, search = "") {
    try {
      summaryLoading.value = true;

      const response = await KnowledgeAPI.getSummariesByCategory(categoryCode, {
        page,
        limit: summaryPagination.value.limit,
        search,
      });

      if (response.data.success) {
        summaries.value = response.data.data.summaries;
        summaryPagination.value = {
          ...summaryPagination.value,
          ...response.data.data.pagination,
        };
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      console.error("載入摘要失敗:", error);
      message.error("載入摘要失敗: " + error.message);
    } finally {
      summaryLoading.value = false;
    }
  }

  /**
   * 選擇摘要
   */
  async function selectSummary(summaryId) {
    try {
      const response = await KnowledgeAPI.getSummaryDetail(summaryId);

      if (response.data.success) {
        selectedSummary.value = response.data.data;
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      console.error("載入摘要詳情失敗:", error);
      message.error("載入摘要詳情失敗: " + error.message);
    }
  }

  /**
   * 搜索摘要
   */
  async function searchSummaries(query, page = 1) {
    try {
      if (!query.trim()) {
        searchResults.value = [];
        return;
      }

      searchLoading.value = true;
      searchQuery.value = query;

      const response = await KnowledgeAPI.searchSummaries(query, {
        page,
        limit: searchPagination.value.limit,
      });

      if (response.data.success) {
        searchResults.value = response.data.data.summaries;
        searchPagination.value = {
          ...searchPagination.value,
          ...response.data.data.pagination,
        };

        // 切換到搜索視圖
        activeView.value = "search";
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      console.error("搜索失敗:", error);
      message.error("搜索失敗: " + error.message);
    } finally {
      searchLoading.value = false;
    }
  }

  /**
   * 清空搜索
   */
  function clearSearch() {
    searchQuery.value = "";
    searchResults.value = [];
    searchPagination.value = {
      current: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
    };

    // 如果當前是搜索視圖，切換回摘要視圖
    if (activeView.value === "search") {
      activeView.value = "summaries";
    }
  }

  /**
   * 載入統計信息
   */
  async function loadStats() {
    try {
      statsLoading.value = true;

      const response = await KnowledgeAPI.getStats();

      if (response.data.success) {
        stats.value = response.data.data;
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      console.error("載入統計失敗:", error);
      message.error("載入統計失敗: " + error.message);
    } finally {
      statsLoading.value = false;
    }
  }

  /**
   * 載入文檔詳情
   */
  async function loadDocumentDetail(documentId) {
    try {
      documentLoading.value = true;

      const response = await KnowledgeAPI.getDocumentDetail(documentId);

      if (response.data.success) {
        selectedDocument.value = response.data.data;
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      console.error("載入文檔詳情失敗:", error);
      message.error("載入文檔詳情失敗: " + error.message);
    } finally {
      documentLoading.value = false;
    }
  }

  /**
   * 更新摘要
   */
  async function updateSummary(summaryId, data) {
    try {
      const response = await KnowledgeAPI.updateSummary(summaryId, data);

      if (response.data.success) {
        message.success("摘要更新成功");

        // 更新本地數據
        if (selectedSummary.value && selectedSummary.value.id === summaryId) {
          selectedSummary.value = { ...selectedSummary.value, ...data };
        }

        // 重新載入摘要列表
        if (selectedCategory.value) {
          await loadSummaries(
            selectedCategory.value.code,
            summaryPagination.value.current
          );
        }

        return true;
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      console.error("更新摘要失敗:", error);
      message.error("更新摘要失敗: " + error.message);
      return false;
    }
  }

  /**
   * 刪除摘要
   */
  async function deleteSummary(summaryId) {
    try {
      const response = await KnowledgeAPI.deleteSummary(summaryId);

      if (response.data.success) {
        message.success("摘要刪除成功");

        // 清空選中的摘要
        if (selectedSummary.value && selectedSummary.value.id === summaryId) {
          selectedSummary.value = null;
        }

        // 重新載入摘要列表
        if (selectedCategory.value) {
          await loadSummaries(
            selectedCategory.value.code,
            summaryPagination.value.current
          );
        }

        return true;
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      console.error("刪除摘要失敗:", error);
      message.error("刪除摘要失敗: " + error.message);
      return false;
    }
  }

  /**
   * 切換側邊欄
   */
  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value;
  }

  /**
   * 設置活動視圖
   */
  function setActiveView(view) {
    activeView.value = view;
  }

  /**
   * 重置狀態
   */
  function reset() {
    categories.value = [];
    selectedCategory.value = null;
    summaries.value = [];
    selectedSummary.value = null;
    searchQuery.value = "";
    searchResults.value = [];
    selectedDocument.value = null;
    stats.value = { overview: {}, categories: [] };
    activeView.value = "summaries";
  }

  // ===== 返回 =====
  return {
    // 狀態
    categories,
    selectedCategory,
    categoryLoading,
    summaries,
    selectedSummary,
    summaryLoading,
    summaryPagination,
    searchQuery,
    searchResults,
    searchLoading,
    searchPagination,
    stats,
    statsLoading,
    selectedDocument,
    documentLoading,
    sidebarCollapsed,
    activeView,

    // 計算屬性
    categoryTree,
    selectedCategoryStats,
    hasSearchResults,
    totalDocuments,

    // 方法
    initialize,
    loadCategories,
    selectCategory,
    loadSummaries,
    selectSummary,
    searchSummaries,
    clearSearch,
    loadStats,
    loadDocumentDetail,
    updateSummary,
    deleteSummary,
    toggleSidebar,
    setActiveView,
    reset,
  };
});
