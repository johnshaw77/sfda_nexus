<template>
  <div class="json-highlight-container">
    <div
      v-if="loading"
      class="loading">
      <a-spin size="small" />
      <span style="margin-left: 8px">正在渲染...</span>
    </div>
    <div
      v-else
      ref="contentRef"
      class="json-content"
      v-html="highlightedContent"></div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { codeToHtml } from "shiki";

// Props
const props = defineProps({
  content: {
    type: [String, Object],
    default: "",
  },
  theme: {
    type: String,
    default: "auto", // 默認自動檢測主題
  },
});

// 響應式數據
const contentRef = ref(null);
const highlightedContent = ref("");
const loading = ref(false);

// 主題檢測函數
const detectTheme = () => {
  if (props.theme === "dark") return "github-dark";
  if (props.theme === "light") return "github-light";
  if (props.theme !== "auto") return props.theme; // 自定義主題

  // auto 模式：檢查 HTML 元素的 data-theme
  const htmlElement = document.documentElement;
  const dataTheme = htmlElement.getAttribute("data-theme");
  if (dataTheme === "dark") return "github-dark";
  if (dataTheme === "light") return "github-light";

  // 檢查 class
  return htmlElement.classList.contains("dark")
    ? "github-dark"
    : "github-light";
};

// 響應式主題狀態
const currentTheme = ref(detectTheme());

// 計算屬性
const jsonString = computed(() => {
  if (typeof props.content === "string") {
    try {
      // 如果是字符串，嘗試解析並重新格式化
      const parsed = JSON.parse(props.content);
      return JSON.stringify(parsed, null, 2);
    } catch {
      // 如果解析失敗，直接返回原字符串
      return props.content;
    }
  } else if (typeof props.content === "object" && props.content !== null) {
    // 如果是對象，直接格式化
    return JSON.stringify(props.content, null, 2);
  }
  return "";
});

// 方法
const renderHighlight = async () => {
  if (!jsonString.value) {
    highlightedContent.value = "";
    return;
  }

  try {
    loading.value = true;

    const html = await codeToHtml(jsonString.value, {
      lang: "json",
      theme: currentTheme.value,
      transformers: [
        {
          pre(node) {
            // 移除默認的 tabindex
            delete node.properties.tabindex;
            // 添加自定義樣式類
            node.properties.class =
              (node.properties.class || "") + " json-highlight-pre";
          },
        },
      ],
    });

    highlightedContent.value = html;
  } catch (error) {
    console.error("JSON 高亮渲染失敗:", error);
    // 降級到普通 pre 標籤
    highlightedContent.value = `<pre class="json-fallback">${jsonString.value}</pre>`;
  } finally {
    loading.value = false;
  }
};

// 設置主題變化監聽器
const setupThemeObserver = () => {
  // 監聽 HTML 元素的屬性變化
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === "attributes") {
        const { attributeName, target } = mutation;
        if (
          target === document.documentElement &&
          (attributeName === "data-theme" || attributeName === "class")
        ) {
          // 重新檢測主題並更新
          const oldTheme = currentTheme.value;
          const newTheme = detectTheme();

          if (newTheme !== oldTheme) {
            currentTheme.value = newTheme;
            // 重新渲染
            renderHighlight();
          }
        }
      }
    });
  });

  // 觀察 HTML 元素的屬性變化
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme", "class"],
  });

  return observer;
};

// 生命週期
onMounted(() => {
  renderHighlight();
  setupThemeObserver();
});

// 監聽內容變化
watch([() => props.content, () => props.theme], () => {
  // 更新主題
  currentTheme.value = detectTheme();
  renderHighlight();
});
</script>

<style scoped>
.json-highlight-container {
  width: 100%;
  max-height: 400px;
  overflow: auto;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  background: #fafafa;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  color: #666;
}

.json-content {
  width: 100%;
}

/* 全局樣式 - 針對 Shiki 生成的內容 */
.json-highlight-container :deep(.json-highlight-pre) {
  margin: 0;
  padding: 16px;
  background: transparent !important;
  border: none;
  border-radius: 0;
  font-family: "Monaco", "Menlo", "Ubuntu Mono", monospace;
  font-size: 13px;
  line-height: 1.5;
  overflow: visible;
}

.json-highlight-container :deep(.json-highlight-pre code) {
  background: transparent !important;
  padding: 0;
  border: none;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
}

/* 降級樣式 */
.json-fallback {
  margin: 0;
  padding: 16px;
  background: #f5f5f5;
  border: none;
  border-radius: 0;
  font-family: "Monaco", "Menlo", "Ubuntu Mono", monospace;
  font-size: 13px;
  line-height: 1.5;
  color: #333;
  white-space: pre-wrap;
  word-wrap: break-word;
}

/* 深色主題適配 */
:root[data-theme="dark"] .json-highlight-container {
  background: #1f1f1f;
  border-color: #434343;
}

:root[data-theme="dark"] .json-highlight-container .json-fallback {
  background: #2d2d2d;
  color: #e0e0e0;
}

:root[data-theme="dark"] .json-highlight-container .loading {
  color: #ccc;
}
</style>
