<template>
  <div
    class="code-highlight-container"
    :class="{ 'dark-theme': isDarkTheme, 'light-theme': !isDarkTheme }"
    ref="containerRef">
    <div
      v-if="content"
      class="markdown-content"
      v-html="renderedContent"></div>
    <slot v-else />
    {{ isDarkTheme }}
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted, watch, nextTick } from "vue";
import { marked } from "marked";
import DOMPurify from "dompurify";
import Prism from "prismjs";
import { useAppStore } from "@/stores/app";
import "prismjs/themes/prism.css";
import "prismjs/themes/prism-tomorrow.css";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-python";
import "prismjs/components/prism-css";
import "prismjs/components/prism-json";
import "prismjs/components/prism-bash";

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
});

// Refs
const containerRef = ref(null);
let mutationObserver = null;
let highlightTimeout = null;
let isHighlighting = false; // 防止循環的標記

// 使用 Pinia store
const appStore = useAppStore();

// 響應式主題狀態
const currentTheme = ref("light"); // 先設定預設值

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

// 動態設置程式碼主題
const updateCodeTheme = () => {
  const root = document.documentElement;
  console.log(isDarkTheme.value, "isDarkTheme.value");
  // if (isDarkTheme.value) {
  //   root.style.setProperty("--code-bg", "#2d3748");
  //   root.style.setProperty("--code-text", "#e2e8f0");
  // } else {
  //   root.style.setProperty("--code-bg", "#f5f2f0");
  //   root.style.setProperty("--code-text", "#403f53");
  // }

  console.log(
    root.style.getPropertyValue("--code-bg"),
    "root.style.getPropertyValue('--code-bg')"
  );
};

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

// 關鍵字高亮函數
const addKeywordHighlighting = (html) => {
  if (!props.enableKeywordHighlight) return html;

  try {
    const keywords = [
      // 編程概念
      "API",
      "JSON",
      "HTTP",
      "HTTPS",
      "REST",
      "GraphQL",
      "SQL",
      "JavaScript",
      "TypeScript",
      "Python",
      "Java",
      "C\\+\\+",
      "CSS",
      "HTML",
      "Vue",
      "React",
      "Angular",
      "Node\\.js",
      "Express",
      "MongoDB",
      "MySQL",
      // 檔案類型
      "\\.js",
      "\\.ts",
      "\\.vue",
      "\\.py",
      "\\.css",
      "\\.html",
      "\\.json",
      "\\.md",
      // 常見指令
      "npm",
      "yarn",
      "git",
      "docker",
      "cd",
      "ls",
      "mkdir",
      "rm",
      // 狀態和結果
      "成功",
      "失敗",
      "錯誤",
      "警告",
      "完成",
      "開始",
      "結束",
      "正確",
      "有效",
      "無效",
      "啟用",
      "停用",
    ];

    // 使用正則表達式分離出程式碼塊和普通文字
    const codeBlockRegex = /<pre><code[^>]*>[\s\S]*?<\/code><\/pre>/gi;
    const inlineCodeRegex = /<code[^>]*>[\s\S]*?<\/code>/gi;

    // 保存所有程式碼塊
    const codeBlocks = [];
    let processedHtml = html;

    // 替換程式碼塊為佔位符
    processedHtml = processedHtml.replace(codeBlockRegex, (match) => {
      const index = codeBlocks.length;
      codeBlocks.push(match);
      return `__CODE_BLOCK_${index}__`;
    });

    // 替換行內程式碼為佔位符
    processedHtml = processedHtml.replace(inlineCodeRegex, (match) => {
      const index = codeBlocks.length;
      codeBlocks.push(match);
      return `__CODE_BLOCK_${index}__`;
    });

    // 在非程式碼區域應用關鍵字高亮
    keywords.forEach((keyword) => {
      const regex = new RegExp(`\\b${keyword}\\b`, "gi");
      processedHtml = processedHtml.replace(regex, (match) => {
        return `<span class="highlight-keyword">${match}</span>`;
      });
    });

    // 恢復程式碼塊
    processedHtml = processedHtml.replace(
      /__CODE_BLOCK_(\d+)__/g,
      (match, index) => {
        return codeBlocks[parseInt(index)] || match;
      }
    );

    return processedHtml;
  } catch (error) {
    console.error("關鍵字高亮處理失敗:", error);
    return html;
  }
};

// 改進的 Markdown 渲染函數
const renderMarkdown = (content) => {
  if (!content || typeof content !== "string") {
    console.warn("renderMarkdown: 無效的內容");
    return "";
  }

  try {
    // 創建自定義 renderer
    const renderer = new marked.Renderer();

    // 自定義程式碼塊渲染
    renderer.code = function (code, lang, escaped) {
      const codeContent =
        typeof code === "string" ? code : code?.text || String(code || "");

      // 語言名稱映射
      const langMap = {
        js: "javascript",
        ts: "typescript",
        py: "python",
        sh: "bash",
        shell: "bash",
      };

      const actualLang = lang
        ? langMap[lang.toLowerCase()] || lang.toLowerCase()
        : "";
      const langClass = actualLang ? `language-${actualLang}` : "";

      return `<pre role="region" aria-label="代碼塊"><code class="${langClass}" aria-label="${actualLang || "代碼"}">${escapeHtml(codeContent)}</code></pre>`;
    };

    // 配置 marked
    marked.setOptions({
      breaks: true,
      gfm: true,
      renderer: renderer,
      highlight: function (code, lang) {
        return escapeHtml(code);
      },
    });

    let html = marked.parse(content);

    // 後處理：添加關鍵字高亮
    html = addKeywordHighlighting(html);

    // 清理 HTML 並返回
    return DOMPurify.sanitize(html, {
      ADD_TAGS: ["span"],
      ADD_ATTR: ["class", "role", "aria-label"],
    });
  } catch (error) {
    console.error("Markdown 渲染失敗:", error);
    // 返回用戶友好的錯誤信息
    return `<div class="error-message" role="alert">
      <p>⚠️ 內容渲染失敗</p>
      <details>
        <summary>錯誤詳情</summary>
        <pre>${escapeHtml(error.message)}</pre>
      </details>
    </div>`;
  }
};

// 程式碼高亮函數（帶 debounce 和防循環）
const highlightCodeBlocks = async () => {
  // 防止在高亮過程中重複觸發
  if (isHighlighting) {
    console.log("CodeHighlight: 正在高亮中，跳過此次調用");
    return;
  }

  if (highlightTimeout) {
    clearTimeout(highlightTimeout);
  }

  highlightTimeout = setTimeout(async () => {
    await nextTick();

    if (!containerRef.value) return;

    // 設置高亮標記
    isHighlighting = true;

    try {
      const allCodeBlocks = containerRef.value.querySelectorAll("pre code");
      console.log(`CodeHighlight: 找到 ${allCodeBlocks.length} 個程式碼塊`);

      allCodeBlocks.forEach((block, index) => {
        // 檢查是否已經高亮過
        if (block.hasAttribute("data-highlighted")) {
          return;
        }

        let language = block.className.match(/language-(\w+)/)?.[1];

        if (!language) {
          const pre = block.closest("pre");
          if (pre) {
            language = pre.className.match(/language-(\w+)/)?.[1];
          }
          if (!language) {
            language = "javascript";
          }
        }

        if (language && Prism.languages[language]) {
          try {
            const code = block.textContent;
            if (code && code.trim()) {
              if (!block.className.includes(`language-${language}`)) {
                block.className = `language-${language}`;
              }

              block.classList.remove("token");

              const highlighted = Prism.highlight(
                code,
                Prism.languages[language],
                language
              );

              // 暫時斷開觀察器，避免觸發循環
              if (mutationObserver) {
                mutationObserver.disconnect();
              }

              block.innerHTML = highlighted;
              // 標記已高亮
              block.setAttribute("data-highlighted", "true");

              // 重新連接觀察器
              if (mutationObserver && containerRef.value) {
                mutationObserver.observe(containerRef.value, {
                  childList: true,
                  subtree: true,
                });
              }

              console.log(`CodeHighlight: 程式碼高亮完成 (${language})`);
            }
          } catch (error) {
            console.warn(`CodeHighlight: 程式碼高亮失敗 (${language}):`, error);
          }
        }
      });
    } finally {
      // 清除高亮標記
      isHighlighting = false;
    }
  }, 150);
};

// 設置 MutationObserver（改進版）
const setupMutationObserver = () => {
  if (!containerRef.value) return;

  mutationObserver = new MutationObserver((mutations) => {
    // 如果正在高亮，忽略變更
    if (isHighlighting) {
      return;
    }

    let shouldHighlight = false;

    mutations.forEach((mutation) => {
      if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
        // 檢查是否有新的代碼塊
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node;
            // 檢查是否包含未高亮的代碼塊
            const codeBlocks = element.querySelectorAll(
              "pre code:not([data-highlighted])"
            );
            if (codeBlocks.length > 0) {
              shouldHighlight = true;
            }
          }
        });
      }
    });

    if (shouldHighlight && !props.isStreaming) {
      console.log("MutationObserver: 檢測到新的代碼塊，觸發高亮");
      highlightCodeBlocks();
    }
  });

  mutationObserver.observe(containerRef.value, {
    childList: true,
    subtree: true,
  });
};

// 清除所有高亮標記（用於重新渲染）
const clearHighlightMarkers = () => {
  if (!containerRef.value) return;

  const highlightedBlocks = containerRef.value.querySelectorAll(
    "code[data-highlighted]"
  );
  highlightedBlocks.forEach((block) => {
    block.removeAttribute("data-highlighted");
  });
};

// 渲染的內容
const renderedContent = computed(() => {
  if (!props.content) return "";
  return renderMarkdown(props.content);
});

// 監聽串流狀態變化
watch(
  () => props.isStreaming,
  async (newVal, oldVal) => {
    if (oldVal === true && newVal === false) {
      console.log("CodeHighlight: 串流完成，重新觸發程式碼高亮");
      await highlightCodeBlocks();
    }
  },
  { immediate: false }
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

// 監聽主題變化
watch(
  isDarkTheme,
  (newVal) => {
    console.log(`CodeHighlight: 應用主題變化 isDarkTheme=${newVal}`);
    updateCodeTheme();
  },
  { immediate: true }
);

// 監聽內容變化
watch(
  () => props.content,
  () => {
    // 內容變化時清除高亮標記，允許重新高亮
    clearHighlightMarkers();

    if (!props.isStreaming) {
      nextTick(() => {
        highlightCodeBlocks();
      });
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
          console.log(
            `CodeHighlight: DOM屬性變化檢測 - ${attributeName}:`,
            target.className,
            target.getAttribute("data-theme")
          );
          themeChanged = true;
        }
      }
    });

    if (themeChanged) {
      const newTheme = getCurrentTheme();
      //code-highlight-container light-theme
      document.querySelector(".code-highlight-container").className =
        `code-highlight-container ${newTheme}-theme`;

      // 重點是這裡
      const codeHighlightContainers = document.querySelectorAll(
        ".code-highlight-container"
      );
      codeHighlightContainers.forEach((container) => {
        container.className = `code-highlight-container ${document.documentElement.getAttribute("data-theme")}-theme`;
        console.log(container.className, "container.className");
      });
      console.log(
        document.querySelector(".code-highlight-container").className,
        "9090 document.querySelector('.code-highlight-container').className"
      );

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

// 生命週期
onMounted(() => {
  // 初始化主題
  currentTheme.value = getCurrentTheme();
  console.log(`CodeHighlight: 初始主題設定為 ${currentTheme.value}`);

  updateCodeTheme();
  setupMutationObserver();

  // 設置主題監聽器
  const cleanupThemeObserver = setupThemeObserver();

  // 保存清理函數
  window._codeHighlightThemeCleanup = cleanupThemeObserver;

  if (!props.isStreaming) {
    highlightCodeBlocks();
  }
});

onUnmounted(() => {
  // 清理定時器
  if (highlightTimeout) {
    clearTimeout(highlightTimeout);
    highlightTimeout = null;
  }

  // 清理 MutationObserver
  if (mutationObserver) {
    mutationObserver.disconnect();
    mutationObserver = null;
  }

  // 清理主題監聽器
  if (window._codeHighlightThemeCleanup) {
    window._codeHighlightThemeCleanup();
    delete window._codeHighlightThemeCleanup;
  }

  // 重置狀態
  isHighlighting = false;
});

// 對外暴露的方法
defineExpose({
  highlightCodeBlocks,
  updateCodeTheme,
  clearHighlightMarkers,
});
</script>

<style scoped>
.code-highlight-container {
  width: 100%;
  line-height: 1.6;
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

.markdown-content :deep(pre),
.markdown-content :deep(.code-block) {
  border-radius: 8px;
  padding: 16px;
  overflow-x: auto;
  margin: 12px 0;
  font-family:
    "Fira Code", "Monaco", "Menlo", "Ubuntu Mono", "Consolas", monospace !important;
  font-size: calc(var(--chat-font-size, 14px) - 1px);
  line-height: 1.5;
  border: 1px solid var(--custom-border-primary);
  position: relative;
  background: var(--code-bg);
  color: var(--code-text);
  box-shadow: none !important;
  text-shadow: none !important;
}

/* 移除錯誤的藍色背景 */

.markdown-content :deep(pre[class*="language-"]) {
  background: var(--code-bg) !important;
  color: var(--code-text) !important;
}

/* 程式碼塊內的程式碼字體樣式 */
.markdown-content :deep(code[class*="language-"]) {
  background: transparent !important;
  color: inherit !important;
  padding: 0 !important;
  border: none !important;
  box-shadow: none !important;
  text-shadow: none !important;
  font-family: "Fira Code" !important;
}
.light-theme .markdown-content :deep(pre),
.light-theme .markdown-content :deep(.code-block) {
  background: var(--custom-bg-primary) !important;
}
.markdown-content :deep(code:not([class*="language-"])) {
  background: var(--custom-bg-tertiary);
  color: #0c9af9;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: calc(var(--chat-font-size, 14px) - 1px);
  border: 1px solid var(--custom-border-primary);
}

/* 關鍵字高亮樣式 */
.markdown-content :deep(.highlight-keyword) {
  background: linear-gradient(
    120deg,
    rgba(132, 204, 22, 0.2) 0%,
    rgba(132, 204, 22, 0.1) 100%
  );
  color: var(--primary-color, #22c55e);
  font-weight: 500;
  padding: 1px 3px;
  border-radius: 3px;
  transition: all 0.2s ease;
}

.markdown-content :deep(.highlight-keyword:hover) {
  background: linear-gradient(
    120deg,
    rgba(132, 204, 22, 0.3) 0%,
    rgba(132, 204, 22, 0.2) 100%
  );
  transform: scale(1.02);
}

/* 亮色主題下的關鍵字樣式 */
.light-theme .markdown-content :deep(.highlight-keyword) {
  background: linear-gradient(
    120deg,
    rgba(59, 130, 246, 0.15) 0%,
    rgba(59, 130, 246, 0.08) 100%
  );
  color: #3b82f6;
}

.light-theme .markdown-content :deep(.highlight-keyword:hover) {
  background: linear-gradient(
    120deg,
    rgba(59, 130, 246, 0.25) 0%,
    rgba(59, 130, 246, 0.15) 100%
  );
}
</style>

<style>
/* CSS 變數定義 */
:root {
  /* 代碼主題變數 */
  --code-bg: #f5f2f0;
  --code-text: #ffffff;

  /* Token 顏色變數 - 亮色主題 */
  --token-comment: #708090;
  --token-punctuation: #999999;
  --token-property: #905;
  --token-boolean: #905;
  --token-number: #905;
  --token-selector: #690;
  --token-string: #690;
  --token-entity: #9a6e3a;
  --token-url: #9a6e3a;
  --token-variable: #9a6e3a;
  --token-atrule: #dd4a68;
  --token-function: #dd4a68;
  --token-keyword: #07a;
  --token-regex: #e90;
  --token-important: #e90;
}

/* 暗色主題變數 */
[data-theme="dark"],
.dark-theme {
  --code-bg: #232323;
  --code-text: #e2e8f0;

  --token-comment: #8292a2;
  --token-punctuation: #f8f8f2;
  --token-property: #f92672;
  --token-boolean: #ae81ff;
  --token-number: #ae81ff;
  --token-selector: #a6e22e;
  --token-string: #a6e22e;
  --token-entity: #f8f8f2;
  --token-url: #f8f8f2;
  --token-variable: #f8f8f2;
  --token-atrule: #e6db74;
  --token-function: #e6db74;
  --token-keyword: #66d9ef;
  --token-regex: #fd971f;
  --token-important: #fd971f;
}

/* 亮色主題變數 */
[data-theme="light"],
.light-theme {
  --code-bg: #f5f2f0;
  --code-text: #403f53;

  --token-comment: #708090;
  --token-punctuation: #999999;
  --token-property: #905;
  --token-boolean: #905;
  --token-number: #905;
  --token-selector: #690;
  --token-string: #690;
  --token-entity: #9a6e3a;
  --token-url: #9a6e3a;
  --token-variable: #9a6e3a;
  --token-atrule: #dd4a68;
  --token-function: #dd4a68;
  --token-keyword: #07a;
  --token-regex: #e90;
  --token-important: #e90;
}

/* 系統暗色主題檢測 */
@media (prefers-color-scheme: dark) {
  :root {
    --code-bg: #2d3748;
    --code-text: #f8f8;

    --token-comment: #f8f8;
    --token-punctuation: #f8f8f2;
    --token-property: #f92672;
    --token-boolean: #ae81ff;
    --token-number: #ae81ff;
    --token-selector: #a6e22e;
    --token-string: #a6e22e;
    --token-entity: #f8f8f2;
    --token-url: #f8f8f2;
    --token-variable: #f8f8f2;
    --token-atrule: #e6db74;
    --token-function: #e6db74;
    --token-keyword: #66d9ef;
    --token-regex: #fd971f;
    --token-important: #fd971f;
  }
}

/* 使用 CSS 變數的 Prism.js 全局樣式 */
.token.comment,
.token.prolog,
.token.doctype,
.token.cdata {
  color: var(--token-comment);
}

.token.punctuation {
  color: var(--token-punctuation);
}

.token.property,
.token.tag,
.token.constant,
.token.symbol,
.token.deleted {
  color: var(--token-property);
}

.token.boolean,
.token.number {
  color: var(--token-number);
}

.token.selector,
.token.attr-name,
.token.string,
.token.char,
.token.builtin,
.token.inserted {
  color: var(--token-string);
}

.token.entity,
.token.url,
.language-css .token.string,
.style .token.string,
.token.variable {
  color: var(--token-variable);
}

.token.atrule,
.token.attr-value,
.token.function,
.token.class-name {
  color: var(--token-function);
}

.token.keyword {
  color: var(--token-keyword);
}

.token.regex,
.token.important {
  color: var(--token-important);
}

.token.important,
.token.bold {
  font-weight: bold;
}

.token.italic {
  font-style: italic;
}

.token.operator {
  background: transparent !important;
  color: inherit !important;
}
</style>
