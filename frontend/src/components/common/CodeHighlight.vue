<template>
  <div
    class="code-highlight-container"
    :class="{ 'dark-theme': isDarkTheme, 'light-theme': !isDarkTheme }"
    ref="containerRef">
    <div
      v-if="content"
      class="markdown-content"
      v-html="renderedContent"
      @scroll="handleScroll"></div>
    <slot v-else />

    <div
      v-if="isStreaming"
      class="streaming-indicator">
      <div class="typing-animation">
        <span>{{ streamingText }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from "vue";
import { useThrottleFn, useElementSize } from "@vueuse/core";
import MarkdownIt from "markdown-it";
import Shiki from "@shikijs/markdown-it";
import DOMPurify from "dompurify";
import { useAppStore } from "@/stores/app";

// Props
const props = defineProps({
  content: {
    type: String,
    default: "",
  },
  isStreaming: {
    type: Boolean,
    default: false,
  },
  enableKeywordHighlight: {
    type: Boolean,
    default: true,
  },
  theme: {
    type: String,
    default: "auto", // 'auto', 'light', 'dark'
    validator: (value) => ["auto", "light", "dark"].includes(value),
  },
  autoScroll: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits(["scroll", "chunk-rendered"]);

// Refs
const containerRef = ref(null);
const shouldAutoScroll = ref(true);
const streamingText = ref("正在接收內容...");
const mdInstance = ref(null);

// 使用 Pinia store
const appStore = useAppStore();

// 使用 VueUse 的工具
const { width, height } = useElementSize(containerRef);

// 響應式主題狀態
const currentTheme = ref("light");

// 獲取當前主題
function getCurrentTheme() {
  if (props.theme === "dark") return "dark";
  if (props.theme === "light") return "light";

  // auto 模式：優先使用 store 的主題，然後檢查 DOM 和系統主題
  if (appStore.theme) {
    return appStore.theme;
  }

  return document.documentElement.classList.contains("dark") ||
    document.documentElement.getAttribute("data-theme") === "dark" ||
    window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

// 主題檢測
const isDarkTheme = computed(() => {
  return currentTheme.value === "dark";
});

// 初始化 Shiki 和 MarkdownIt
onMounted(async () => {
  // 初始化主題
  currentTheme.value = getCurrentTheme();
  console.log(`CodeHighlight: 初始主題設定為 ${currentTheme.value}`);

  try {
    // 使用官方插件初始化 MarkdownIt
    mdInstance.value = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true,
      breaks: true,
    });

    // 配置 Shiki 插件
    const shikiPlugin = await Shiki({
      themes: {
        light: "github-light",
        dark: "github-dark",
      },
      langs: [
        "javascript",
        "typescript",
        "python",
        "java",
        "cpp",
        "c",
        "css",
        "html",
        "json",
        "bash",
        "shell",
        "sql",
        "php",
        "go",
        "rust",
        "swift",
        "kotlin",
        "dart",
        "vue",
        "jsx",
        "tsx",
        "yaml",
        "xml",
        "markdown",
      ],
      // 根據當前主題選擇
      defaultTheme: isDarkTheme.value ? "dark" : "light",
    });

    mdInstance.value.use(shikiPlugin);
    console.log("CodeHighlight: 官方 Shiki 插件初始化成功");
  } catch (error) {
    console.error("CodeHighlight: 初始化失敗:", error);
  }

  setupThemeObserver();
});

// HTML轉義函數
const escapeHtml = (text) => {
  if (typeof text !== "string") {
    text = String(text || "");
  }

  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, function (m) {
    return map[m];
  });
};

// 簡化的 Markdown 渲染函數
const renderMarkdown = (content) => {
  if (!content || typeof content !== "string" || !mdInstance.value) {
    console.warn("renderMarkdown: 無效的內容或未初始化");
    return "";
  }

  try {
    let html = mdInstance.value.render(content);

    // 添加複製按鈕到程式碼塊
    html = html.replace(
      /<pre[^>]*><code[^>]*class="language-([^"]*)"[^>]*>/g,
      (match, lang) => {
        const displayLang = lang || "text";
        return `
          <div class="code-block-wrapper" data-lang="${displayLang}">
            <div class="code-header">
              <span class="language-label">${displayLang}</span>
              <button class="copy-btn" onclick="copyCodeToClipboard(this)" title="複製程式碼">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                  <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                </svg>
                複製
              </button>
            </div>
            ${match}
        `;
      }
    );

    // 添加結束標籤
    html = html.replace(/<\/code><\/pre>/g, "</code></pre></div>");

    return DOMPurify.sanitize(html, {
      ADD_TAGS: ["span", "div", "button", "svg", "rect", "path"],
      ADD_ATTR: [
        "class",
        "onclick",
        "title",
        "data-lang",
        "width",
        "height",
        "viewBox",
        "fill",
        "stroke",
        "stroke-width",
        "x",
        "y",
        "d",
        "rx",
        "ry",
      ],
    });
  } catch (error) {
    console.error("Markdown 渲染失敗:", error);
    return `<div class="error-message" role="alert">
      <p>⚠️ 內容渲染失敗</p>
      <details>
        <summary>錯誤詳情</summary>
        <pre>${escapeHtml(error.message)}</pre>
      </details>
    </div>`;
  }
};

// 簡化的串流處理 - 只處理滾動
watch(
  () => props.content,
  () => {
    // 自動滾動
    if (shouldAutoScroll.value && props.autoScroll) {
      nextTick(() => {
        scrollToBottom();
      });
    }
  },
  { immediate: true }
);

// 計算最終渲染內容
const renderedContent = computed(() => {
  if (!props.content) return "";

  if (props.isStreaming) {
    // 串流模式：顯示原始文本，避免頻繁渲染 markdown
    return `<div class="streaming-raw">${escapeHtml(props.content)}</div>`;
  } else {
    // 非串流時或串流完成後直接渲染完整內容
    return renderMarkdown(props.content);
  }
});

// 節流的滾動處理
const handleScroll = useThrottleFn(() => {
  if (!containerRef.value) return;

  const { scrollTop, scrollHeight, clientHeight } = containerRef.value;
  const isAtBottom = scrollTop + clientHeight >= scrollHeight - 50;

  shouldAutoScroll.value = isAtBottom;

  emit("scroll", {
    scrollTop,
    scrollHeight,
    clientHeight,
    isAtBottom,
  });
}, 100);

// 滾動到底部
const scrollToBottom = () => {
  if (containerRef.value) {
    containerRef.value.scrollTo({
      top: containerRef.value.scrollHeight,
      behavior: "smooth",
    });
  }
};

// 清理內容
const clearContent = () => {
  // 清理不再需要，因為已簡化為直接渲染模式
};

// 監聽串流狀態變化
watch(
  () => props.isStreaming,
  async (newVal, oldVal) => {
    if (oldVal === true && newVal === false) {
      console.log("CodeHighlight: 串流完成");

      // 串流完成後重新渲染
      await nextTick();

      if (shouldAutoScroll.value && props.autoScroll) {
        await nextTick();
        scrollToBottom();
      }
    }
  },
  { immediate: false }
);

// 監聽主題變化並重新配置 Shiki
watch(
  () => isDarkTheme.value,
  async (newIsDark) => {
    if (mdInstance.value) {
      console.log(
        `CodeHighlight: 主題變化，重新配置 Shiki - ${newIsDark ? "dark" : "light"}`
      );

      // 重新配置 Shiki 插件
      try {
        mdInstance.value = new MarkdownIt({
          html: true,
          linkify: true,
          typographer: true,
          breaks: true,
        });

        const shikiPlugin = await Shiki({
          themes: {
            light: "github-light",
            dark: "github-dark",
          },
          defaultTheme: newIsDark ? "dark" : "light",
        });

        mdInstance.value.use(shikiPlugin);
      } catch (error) {
        console.error("重新配置 Shiki 失敗:", error);
      }
    }
  }
);

// 監聽 store 主題變化
watch(
  () => appStore.theme,
  (newTheme) => {
    if (props.theme === "auto" && newTheme !== currentTheme.value) {
      console.log(
        `CodeHighlight: Store主題變化 ${currentTheme.value} → ${newTheme}`
      );
      currentTheme.value = newTheme;
    }
  }
);

// 監聽 props.theme 變化
watch(
  () => props.theme,
  () => {
    const newTheme = getCurrentTheme();
    if (newTheme !== currentTheme.value) {
      console.log(
        `CodeHighlight: Props主題變化 ${currentTheme.value} → ${newTheme}`
      );
      currentTheme.value = newTheme;
    }
  }
);

// 設置主題監聽器
const setupThemeObserver = () => {
  // 監聽 DOM 變化（class 和 data-theme 屬性）
  const themeObserver = new MutationObserver((mutations) => {
    let themeChanged = false;

    mutations.forEach((mutation) => {
      if (mutation.type === "attributes") {
        const { attributeName, target } = mutation;
        if (
          (attributeName === "class" && target === document.documentElement) ||
          (attributeName === "data-theme" &&
            target === document.documentElement)
        ) {
          console.log(`CodeHighlight: DOM屬性變化檢測 - ${attributeName}`);
          themeChanged = true;
        }
      }
    });

    if (themeChanged) {
      const newTheme = getCurrentTheme();
      if (newTheme !== currentTheme.value) {
        currentTheme.value = newTheme;
      }
    }
  });

  // 觀察 document.documentElement 的屬性變化
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "data-theme"],
  });

  // 監聽系統主題變化
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const handleMediaChange = () => {
    if (props.theme === "auto") {
      const newTheme = getCurrentTheme();
      if (newTheme !== currentTheme.value) {
        console.log(
          `CodeHighlight: 系統主題變化檢測 ${currentTheme.value} → ${newTheme}`
        );
        currentTheme.value = newTheme;
      }
    }
  };

  mediaQuery.addEventListener("change", handleMediaChange);

  // 返回清理函數
  return () => {
    themeObserver.disconnect();
    mediaQuery.removeEventListener("change", handleMediaChange);
  };
};

// 動畫文字效果
watch(
  () => props.isStreaming,
  (streaming) => {
    if (streaming) {
      const texts = ["正在接收內容...", "處理中...", "渲染中..."];
      let index = 0;
      const interval = setInterval(() => {
        streamingText.value = texts[index % texts.length];
        index++;
      }, 1500);

      // 清理定時器
      const stopInterval = () => {
        clearInterval(interval);
        streamingText.value = "完成";
      };

      // 當串流停止時清理
      const unwatch = watch(
        () => props.isStreaming,
        (newStreaming) => {
          if (!newStreaming) {
            stopInterval();
            unwatch();
          }
        }
      );
    }
  }
);

// 全局複製函數
if (typeof window !== "undefined") {
  window.copyCodeToClipboard = function (button) {
    const wrapper = button.closest(".code-block-wrapper");
    const code = wrapper.querySelector("code");
    const text = code ? code.textContent : "";

    navigator.clipboard
      .writeText(text)
      .then(() => {
        const originalText = button.innerHTML;
        button.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20,6 9,17 4,12"></polyline>
          </svg>
          已複製`;
        button.classList.add("copied");

        setTimeout(() => {
          button.innerHTML = originalText;
          button.classList.remove("copied");
        }, 2000);
      })
      .catch((err) => {
        console.error("複製失敗:", err);
      });
  };
}

// 生命週期
let cleanupThemeObserver = null;

onUnmounted(() => {
  // 清理主題監聽器
  if (cleanupThemeObserver) {
    cleanupThemeObserver();
    cleanupThemeObserver = null;
  }
});

// 對外暴露的方法
defineExpose({
  clearContent,
  scrollToBottom,
});
</script>

<style scoped>
.code-highlight-container {
  width: 100%;
  line-height: 1.6;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.markdown-content {
  flex: 1;
  overflow-y: auto;
  font-size: 16px;
  color: var(--custom-text-primary);
}

.streaming-indicator {
  padding: 12px 20px;
  background: linear-gradient(
    90deg,
    var(--custom-bg-secondary) 0%,
    var(--custom-bg-tertiary) 100%
  );
  border-top: 1px solid var(--custom-border-primary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.typing-animation {
  display: flex;
  align-items: center;
  color: var(--custom-text-secondary);
  font-size: 14px;
  font-weight: 500;
}

.typing-animation::after {
  content: "";
  width: 3px;
  height: 18px;
  background: var(--primary-color, #007bff);
  margin-left: 8px;
  border-radius: 2px;
  animation: blink 1.2s infinite;
}

@keyframes blink {
  0%,
  50% {
    opacity: 1;
  }
  51%,
  100% {
    opacity: 0;
  }
}

/* 錯誤信息樣式 */
.markdown-content :deep(.error-message) {
  background: #fee;
  border: 1px solid #fcc;
  border-radius: 8px;
  padding: 16px;
  margin: 12px 0;
  color: #c33;
}

.markdown-content :deep(.error-message details) {
  margin-top: 8px;
}

.markdown-content :deep(.error-message pre) {
  background: #f9f9f9;
  padding: 8px;
  border-radius: 4px;
  font-size: 12px;
  overflow-x: auto;
}

/* 基本的 markdown 樣式 */
.markdown-content :deep(h1),
.markdown-content :deep(h2),
.markdown-content :deep(h3),
.markdown-content :deep(h4),
.markdown-content :deep(h5),
.markdown-content :deep(h6) {
  margin: 16px 0 8px 0;
  font-weight: 600;
  color: var(--custom-text-primary);
}

.markdown-content :deep(p) {
  margin: 8px 0;
  color: var(--custom-text-primary);
}

.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  margin: 8px 0;
  padding-left: 20px;
  color: var(--custom-text-primary);
}

.markdown-content :deep(li) {
  margin: 4px 0;
}

.markdown-content :deep(blockquote) {
  border-left: 4px solid var(--primary-color, #007bff);
  padding-left: 16px;
  margin: 16px 0;
  color: var(--custom-text-secondary);
  background: var(--custom-bg-secondary);
  padding: 12px 16px;
  border-radius: 4px;
}

.markdown-content :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 16px 0;
}

.markdown-content :deep(th),
.markdown-content :deep(td) {
  border: 1px solid var(--custom-border-primary);
  padding: 8px 12px;
  text-align: left;
}

.markdown-content :deep(th) {
  background: var(--custom-bg-secondary);
  font-weight: 600;
}

/* 程式碼塊樣式 - 簡化版本 */
.markdown-content :deep(.code-block-wrapper) {
  margin: 16px 0;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--custom-border-primary);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  position: relative;
}

.dark-theme .markdown-content :deep(.code-block-wrapper) {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.markdown-content :deep(.code-header) {
  position: absolute;
  top: 0px;
  left: 0px;
  right: 0px;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--custom-bg-secondary) !important;
  padding: 8px 16px;
}

.markdown-content :deep(.language-label) {
  color: var(--custom-text-secondary);
  padding: 1px 6px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.3px;
  min-width: 20px;
  text-align: center;
  line-height: 1.2;
}

.dark-theme .markdown-content :deep(.language-label) {
  background: rgba(100, 108, 255, 0.2);
  color: #9ca3ff;
  border-color: rgba(100, 108, 255, 0.4);
}

.markdown-content :deep(.copy-btn) {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: var(--custom-bg-secondary);
  border: none;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  cursor: pointer;
  color: var(--custom-text-secondary);
  transition: all 0.2s ease;
  font-weight: 500;
}

.markdown-content :deep(.copy-btn:hover) {
  background: var(--custom-bg-tertiary);
  transform: translateY(-1px);
}

.markdown-content :deep(.copy-btn.copied) {
  background: rgba(34, 197, 94, 0.8);
  color: white;
}

.markdown-content :deep(.copy-btn svg) {
  width: 12px;
  height: 12px;
  flex-shrink: 0;
}

/* 讓 Shiki 生成的 pre 樣式正常顯示 */
.markdown-content :deep(pre) {
  margin: 0 !important;
  padding: 32px 16px 16px 16px !important;
  font-family:
    "Fira Code", "SF Mono", "Monaco", "Inconsolata", "Roboto Mono", monospace !important;
  font-size: 16px !important;
  line-height: 1.6 !important;
  overflow-x: auto;
}

.markdown-content :deep(code) {
  font-family:
    "Fira Code", "SF Mono", "Monaco", "Inconsolata", "Roboto Mono", monospace !important;
}

/* 行內代碼樣式 */
.markdown-content :deep(p code),
.markdown-content :deep(li code),
.markdown-content :deep(td code) {
  /* background: var(--custom-bg-tertiary) !important; */
  color: var(--primary-color, #007bff) !important;
  padding: 2px 6px !important;
  border-radius: 4px !important;
  font-size: calc(var(--chat-font-size, 14px) - 1px) !important;
  border: 0px solid var(--custom-border-primary) !important;
}

/* 串流樣式 */
.markdown-content :deep(.streaming-chunk) {
  opacity: 0.85;
  transition: opacity 0.3s ease;
  border-left: 3px solid var(--primary-color, #007bff);
  padding-left: 12px;
  margin: 8px 0;
}

.markdown-content :deep(.streaming-raw) {
  color: var(--custom-text-secondary);
  font-style: italic;
  white-space: pre-wrap;
  background: var(--custom-bg-tertiary);
  padding: 8px 12px;
  border-radius: 4px;
  border-left: 3px solid #ffc107;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .markdown-content {
    font-size: 15px;
  }

  .markdown-content :deep(.code-header) {
    position: static;
    background: var(--custom-bg-secondary);
    padding: 8px 12px;
    justify-content: space-between;
    border-bottom: 1px solid var(--custom-border-primary);
  }

  .markdown-content :deep(.language-label) {
    background: rgba(100, 108, 255, 0.1);
    color: var(--primary-color, #646cff);
    border: 1px solid rgba(100, 108, 255, 0.2);
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 10px;
  }

  .dark-theme .markdown-content :deep(.language-label) {
    background: rgba(100, 108, 255, 0.2);
    color: #9ca3ff;
    border-color: rgba(100, 108, 255, 0.4);
  }

  .markdown-content :deep(.copy-btn) {
    background: rgba(0, 0, 0, 0.7);
    color: white;
    border: none;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 10px;
  }

  .markdown-content :deep(pre) {
    padding: 40px 12px 12px 12px !important;
  }
}

/* 滾動條樣式 */
.markdown-content::-webkit-scrollbar {
  width: 8px;
}

.markdown-content::-webkit-scrollbar-track {
  background: var(--custom-bg-secondary);
  border-radius: 4px;
}

.markdown-content ::-webkit-scrollbar-thumb {
  background: var(--custom-border-secondary);
  border-radius: 4px;
}

.markdown-content::-webkit-scrollbar-thumb:hover {
  background: var(--custom-text-tertiary);
}
</style>
