<template>
  <div
    ref="containerRef"
    class="code-highlight-container">
    <div
      v-if="renderedHtml"
      class="markdown-content"
      v-html="renderedHtml"
      @scroll="handleScroll" />
    <div
      v-else
      class="empty-content">
      <slot />
    </div>

    <!-- 串流指示器 -->
    <div
      v-if="isStreaming"
      class="streaming-indicator">
      <div class="typing-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <span class="streaming-text">正在接收內容...</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from "vue";
import { useThrottleFn } from "@vueuse/core";
import MarkdownIt from "markdown-it";
import { codeToHtml } from "shiki";
import DOMPurify from "dompurify";

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
  theme: {
    type: String,
    default: "auto",
    validator: (value) => ["auto", "light", "dark"].includes(value),
  },
  autoScroll: {
    type: Boolean,
    default: true,
  },
  debug: {
    type: Boolean,
    default: false,
  },
  realtimeRender: {
    type: Boolean,
    default: false,
  },
});

// Emits
const emit = defineEmits(["scroll", "chunk-rendered"]);

// Refs
const containerRef = ref(null);
const shouldAutoScroll = ref(true);

// 主題檢測函數
const detectTheme = () => {
  if (props.theme === "dark") return "dark";
  if (props.theme === "light") return "light";
  // auto 模式：檢查 HTML 元素的 data-theme 或 class
  const htmlElement = document.documentElement;
  const dataTheme = htmlElement.getAttribute("data-theme");
  if (dataTheme === "dark" || dataTheme === "light") {
    return dataTheme;
  }
  return htmlElement.classList.contains("dark") ? "dark" : "light";
};

// 響應式主題狀態
const currentTheme = ref(detectTheme());

// MarkdownIt 實例
let md = null;

// 初始化 Markdown 渲染器
onMounted(async () => {
  md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
    breaks: true,
  });

  // 自定義程式碼塊渲染規則
  md.renderer.rules.fence = (tokens, idx, options, env, slf) => {
    const token = tokens[idx];
    const code = token.content.trim();
    const lang = token.info.trim() || "text";

    if (props.debug) {
      console.log("=== Fence 渲染 ===");
      console.log("Language:", lang);
      console.log("Code:", JSON.stringify(code));
    }

    // 為程式碼塊添加包裝器
    return `<div class="code-block-wrapper" data-lang="${lang}">
      <div class="code-header">
        <span class="language-label">${lang}</span>
        <button class="copy-btn" onclick="copyCodeToClipboard(this)" title="複製程式碼">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
          </svg>
          複製
        </button>
      </div>
      <div class="shiki-container" data-code="${encodeURIComponent(code)}" data-lang="${lang}"></div>
    </div>`;
  };

  // 監聽 DOM 主題變化
  setupThemeObserver();
});

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
            if (props.debug) {
              console.log(
                `主題切換檢測: ${oldTheme} → ${newTheme} (${attributeName} 變更)`
              );
            }
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
};

// Shiki 高亮渲染
const renderShikiCode = async (code, lang) => {
  if (!code.trim()) return "";

  try {
    const html = await codeToHtml(code, {
      lang: lang || "text",
      theme: currentTheme.value === "dark" ? "github-dark" : "github-light",
      transformers: [],
    });

    if (props.debug) {
      console.log("=== Shiki 渲染結果 ===");
      console.log("Input code:", JSON.stringify(code));
      console.log("Output HTML:", html);
    }

    return html;
  } catch (error) {
    console.error("Shiki 渲染失敗:", error);
    return `<pre><code>${escapeHtml(code)}</code></pre>`;
  }
};

// HTML 轉義
const escapeHtml = (text) => {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
};

// 渲染 Markdown 內容
const renderContent = async (content) => {
  if (!content || !md) return "";

  try {
    if (props.debug) {
      console.log("=== 開始渲染 ===");
      console.log("原始內容:", JSON.stringify(content));
    }

    // 使用 MarkdownIt 渲染
    let html = md.render(content);

    if (props.debug) {
      console.log("=== MarkdownIt 渲染後 ===");
      console.log(html);
    }

    // 查找並替換 Shiki 容器
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const shikiContainers = doc.querySelectorAll(".shiki-container");

    for (const container of shikiContainers) {
      const code = decodeURIComponent(
        container.getAttribute("data-code") || ""
      );
      const lang = container.getAttribute("data-lang") || "text";

      if (code) {
        const shikiHtml = await renderShikiCode(code, lang);
        container.innerHTML = shikiHtml;
      }
    }

    // 獲取更新後的 HTML
    html = doc.body.innerHTML;

    if (props.debug) {
      console.log("=== 最終 HTML ===");
      console.log(html);
    }

    // 清理 HTML
    return DOMPurify.sanitize(html, {
      ADD_TAGS: ["span", "div", "button", "svg", "path", "rect"],
      ADD_ATTR: [
        "class",
        "onclick",
        "title",
        "data-lang",
        "data-code",
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
    console.error("渲染失敗:", error);
    return `<div class="error-message">
      <p>⚠️ 內容渲染失敗</p>
      <pre>${escapeHtml(error.message)}</pre>
    </div>`;
  }
};

// 計算渲染的 HTML
const renderedHtml = ref("");

// 監聽內容變化
watch(
  () => props.content,
  async (newContent) => {
    if (!newContent) {
      renderedHtml.value = "";
      return;
    }

    if (props.isStreaming && !props.realtimeRender) {
      // 串流中且非即時渲染：顯示原始文字
      renderedHtml.value = `<pre class="streaming-raw">${escapeHtml(newContent)}</pre>`;
    } else {
      // 非串流或即時渲染：完整渲染
      renderedHtml.value = await renderContent(newContent);

      // 渲染完成後處理 Shiki 容器
      await nextTick();
      await processShikiContainers();
    }

    // 自動滾動
    if (shouldAutoScroll.value && props.autoScroll) {
      await nextTick();
      scrollToBottom();
    }
  },
  { immediate: true }
);

// 處理 Shiki 容器
const processShikiContainers = async () => {
  if (!containerRef.value) return;

  const containers = containerRef.value.querySelectorAll(".shiki-container");
  for (const container of containers) {
    const code = decodeURIComponent(container.getAttribute("data-code") || "");
    const lang = container.getAttribute("data-lang") || "text";

    if (code && !container.querySelector("pre")) {
      const shikiHtml = await renderShikiCode(code, lang);
      container.innerHTML = shikiHtml;
    }
  }
};

// 滾動處理
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

// 監聽串流狀態變化
watch(
  () => props.isStreaming,
  async (newVal, oldVal) => {
    if (oldVal === true && newVal === false) {
      // 串流完成，重新渲染
      renderedHtml.value = await renderContent(props.content);
      await nextTick();
      await processShikiContainers();

      if (shouldAutoScroll.value && props.autoScroll) {
        await nextTick();
        scrollToBottom();
      }
    }
  }
);

// 監聽 props.theme 變化
watch(
  () => props.theme,
  () => {
    const newTheme = detectTheme();
    if (newTheme !== currentTheme.value) {
      currentTheme.value = newTheme;
    }
  }
);

// 監聽主題變化 - 重新渲染所有程式碼塊以更新 Shiki 主題
watch(
  () => currentTheme.value,
  async (newTheme, oldTheme) => {
    if (newTheme !== oldTheme && props.content) {
      console.log(`主題切換: ${oldTheme} → ${newTheme}，重新渲染程式碼塊`);
      renderedHtml.value = await renderContent(props.content);
      await nextTick();
      await processShikiContainers();
    }
  }
);

// 全局複製函數
if (typeof window !== "undefined") {
  window.copyCodeToClipboard = function (button) {
    const wrapper = button.closest(".code-block-wrapper");
    const codeContainer = wrapper.querySelector(".shiki-container code");
    const text = codeContainer ? codeContainer.textContent : "";

    navigator.clipboard
      .writeText(text)
      .then(() => {
        const originalText = button.innerHTML;
        button.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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

// 對外暴露方法
defineExpose({
  scrollToBottom,
});
</script>

<style scoped>
.code-highlight-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.markdown-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  font-size: var(--chat-font-size, 16px);
  line-height: 1.6;
  color: var(--text-color, #333);
}

.empty-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-color-secondary, #666);
}

/* 串流指示器 */
.streaming-indicator {
  padding: 12px 16px;
  background: var(--bg-color-secondary, #f5f5f5);
  border-top: 1px solid var(--border-color, #e8e8e8);
  display: flex;
  align-items: center;
  gap: 8px;
}

.typing-dots {
  display: flex;
  gap: 4px;
}

.typing-dots span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--primary-color, #1890ff);
  animation: typing 1.4s infinite ease-in-out;
}

.typing-dots span:nth-child(1) {
  animation-delay: -0.32s;
}
.typing-dots span:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes typing {
  0%,
  80%,
  100% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.streaming-text {
  font-size: calc(var(--chat-font-size, 16px) - 2px);
  color: var(--text-color-secondary, #666);
}

/* 基本 Markdown 樣式 */
.markdown-content :deep(h1),
.markdown-content :deep(h2),
.markdown-content :deep(h3),
.markdown-content :deep(h4),
.markdown-content :deep(h5),
.markdown-content :deep(h6) {
  margin: 16px 0 8px 0;
  font-weight: 600;
  color: var(--text-color, #333);
}

.markdown-content :deep(p) {
  margin: 8px 0;
  color: var(--text-color, #333);
}

.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  margin: 8px 0;
  padding-left: 20px;
}

.markdown-content :deep(li) {
  margin: 4px 0;
}

.markdown-content :deep(blockquote) {
  border-left: 4px solid var(--primary-color, #1890ff);
  padding-left: 16px;
  margin: 16px 0;
  color: var(--text-color-secondary, #666);
  background: var(--bg-color-secondary, #f5f5f5);
  padding: 12px 16px;
  border-radius: 4px;
}

/* 程式碼塊包裝器 */
.markdown-content :deep(.code-block-wrapper) {
  margin: 16px 0;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--border-color, #e8e8e8);
  background: var(--bg-color-secondary, #f8f9fa);
}

.markdown-content :deep(.code-header) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: var(--bg-color-tertiary, #f0f0f0);
  border-bottom: 1px solid var(--border-color, #e8e8e8);
}

.markdown-content :deep(.language-label) {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-color-secondary, #666);
  background: var(--bg-color, #fff);
  padding: 2px 8px;
  border-radius: 12px;
  border: 1px solid var(--border-color, #e8e8e8);
}

.markdown-content :deep(.copy-btn) {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: transparent;
  border: none;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  cursor: pointer;
  color: var(--text-color-secondary, #666);
  transition: all 0.2s ease;
}

.markdown-content :deep(.copy-btn:hover) {
  background: var(--bg-color, #fff);
  color: var(--primary-color, #1890ff);
}

.markdown-content :deep(.copy-btn.copied) {
  background: var(--success-color, #52c41a);
  color: white;
}

/* Shiki 容器樣式 */
.markdown-content :deep(.shiki-container) {
  position: relative;
}

.markdown-content :deep(.shiki-container pre) {
  margin: 0 !important;
  padding: 16px !important;
  background: transparent !important;
  overflow-x: auto;
  font-family:
    "Fira Code", "SF Mono", "Monaco", "Inconsolata", "Roboto Mono", monospace !important;
  font-size: calc(var(--chat-font-size, 16px) - 2px) !important;
  line-height: 1.5 !important;
}

.markdown-content :deep(.shiki-container code) {
  background: transparent !important;
  padding: 0 !important;
  font-family: inherit !important;
}

/* 串流原始文字 */
.markdown-content :deep(.streaming-raw) {
  background: var(--bg-color-secondary, #f5f5f5);
  border: 1px solid var(--border-color, #e8e8e8);
  border-radius: 4px;
  padding: 16px;
  font-family:
    "Fira Code", "SF Mono", "Monaco", "Inconsolata", "Roboto Mono", monospace;
  font-size: calc(var(--chat-font-size, 16px) - 2px);
  line-height: 1.5;
  white-space: pre-wrap;
  color: var(--text-color-secondary, #666);
  border-left: 3px solid var(--warning-color, #faad14);
}

/* 錯誤信息 */
.markdown-content :deep(.error-message) {
  background: var(--error-bg, #fff2f0);
  border: 1px solid var(--error-color, #ff4d4f);
  border-radius: 8px;
  padding: 16px;
  margin: 12px 0;
  color: var(--error-color, #ff4d4f);
}

.markdown-content :deep(.error-message pre) {
  background: var(--bg-color-secondary, #f5f5f5);
  padding: 8px;
  border-radius: 4px;
  font-size: 12px;
  overflow-x: auto;
  margin-top: 8px;
}

/* 行內代碼 */
.markdown-content :deep(p code),
.markdown-content :deep(li code),
.markdown-content :deep(td code) {
  background: var(--bg-color-secondary, #f5f5f5);
  color: var(--primary-color, #1890ff);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: calc(var(--chat-font-size, 16px) - 3px);
  font-family:
    "Fira Code", "SF Mono", "Monaco", "Inconsolata", "Roboto Mono", monospace;
}

/* 亮色主題（默認） */
.code-highlight-container {
  --text-color: #262626;
  --text-color-secondary: #8c8c8c;
  --bg-color: #ffffff;
  --bg-color-secondary: #fafafa;
  --bg-color-tertiary: #f5f5f5;
  --border-color: #d9d9d9;
  --primary-color: #1890ff;
  --success-color: #52c41a;
  --warning-color: #faad14;
  --error-color: #ff4d4f;
  --error-bg: #fff2f0;
}

/* 深色主題 - 使用全局 dark class */

[data-theme="dark"] .code-highlight-container {
  --text-color: #ffffff;
  --text-color-secondary: #b3b3b3;
  --bg-color: #1f1f1f;
  --bg-color-secondary: #2a2a2a;
  --bg-color-tertiary: #3a3a3a;
  --border-color: #404040;
  --primary-color: #4096ff;
  --success-color: #52c41a;
  --warning-color: #faad14;
  --error-color: #ff4d4f;
  --error-bg: #2a1818;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .markdown-content {
    padding: 12px;
    font-size: calc(var(--chat-font-size, 16px) - 2px);
  }

  .markdown-content :deep(.code-header) {
    padding: 6px 12px;
  }

  .markdown-content :deep(.shiki-container pre) {
    padding: 12px !important;
    font-size: calc(var(--chat-font-size, 16px) - 3px) !important;
  }
}

/* 滾動條樣式 */
.markdown-content::-webkit-scrollbar {
  width: 8px;
}

.markdown-content::-webkit-scrollbar-track {
  background: var(--bg-color-secondary, #f5f5f5);
  border-radius: 4px;
}

.markdown-content::-webkit-scrollbar-thumb {
  background: var(--border-color, #e8e8e8);
  border-radius: 4px;
}

.markdown-content::-webkit-scrollbar-thumb:hover {
  background: var(--text-color-secondary, #666);
}
</style>
