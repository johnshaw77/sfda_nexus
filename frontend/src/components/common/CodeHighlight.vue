<template>
  <div
    class="code-highlight-container"
    :class="{ 'dark-theme': isDarkTheme, 'light-theme': !isDarkTheme }"
    ref="containerRef">
    <div
      v-if="content"
      class="markdown-content"
      v-html="renderedContent"
      @DOMNodeInserted="handleContentUpdate"></div>
    <slot v-else />
  </div>
</template>

<script setup>
import { computed, ref, onMounted, watch, nextTick } from "vue";
import { marked } from "marked";
import DOMPurify from "dompurify";
import Prism from "prismjs";
import "prismjs/themes/prism.css"; // 亮色主題
import "prismjs/themes/prism-tomorrow.css"; // 暗色主題
// 只引入基本語言，避免依賴問題
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
  },
});

// Refs
const containerRef = ref(null);

// 主題檢測
const isDarkTheme = computed(() => {
  if (props.theme === "dark") return true;
  if (props.theme === "light") return false;

  // auto 模式：檢查系統主題
  return (
    document.documentElement.classList.contains("dark") ||
    document.documentElement.getAttribute("data-theme") === "dark" ||
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
});

// 動態設置程式碼主題
const updateCodeTheme = () => {
  const root = document.documentElement;
  if (isDarkTheme.value) {
    root.style.setProperty("--code-bg", "#2d3748");
    root.style.setProperty("--code-text", "#e2e8f0");
  } else {
    root.style.setProperty("--code-bg", "#f5f2f0");
    root.style.setProperty("--code-text", "#403f53");
  }
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

// Markdown 渲染函數
const renderMarkdown = (content) => {
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

      return `<pre><code class="${langClass}">${escapeHtml(codeContent)}</code></pre>`;
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

    return DOMPurify.sanitize(html, {
      ADD_TAGS: ["span"],
      ADD_ATTR: ["class"],
    });
  } catch (error) {
    console.error("Markdown 渲染失敗:", error);
    return escapeHtml(content);
  }
};

// 程式碼高亮函數（帶 debounce）
let highlightTimeout = null;

const highlightCodeBlocks = async () => {
  if (highlightTimeout) {
    clearTimeout(highlightTimeout);
  }

  highlightTimeout = setTimeout(async () => {
    await nextTick();

    if (!containerRef.value) return;

    const allCodeBlocks = containerRef.value.querySelectorAll("pre code");
    console.log(`CodeHighlight: 找到 ${allCodeBlocks.length} 個程式碼塊`);

    allCodeBlocks.forEach((block, index) => {
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
            block.innerHTML = highlighted;
            console.log(`CodeHighlight: 程式碼高亮完成 (${language})`);
          }
        } catch (error) {
          console.warn(`CodeHighlight: 程式碼高亮失敗 (${language}):`, error);
        }
      }
    });
  }, 150);
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

// 監聽主題變化
watch(
  isDarkTheme,
  () => {
    updateCodeTheme();
  },
  { immediate: true }
);

// 內容更新處理
const handleContentUpdate = () => {
  if (!props.isStreaming) {
    highlightCodeBlocks();
  }
};

// 生命週期
onMounted(() => {
  updateCodeTheme();

  if (!props.isStreaming) {
    highlightCodeBlocks();
  }
});

// 對外暴露的方法
defineExpose({
  highlightCodeBlocks,
  updateCodeTheme,
});
</script>

<style scoped>
.code-highlight-container {
  width: 100%;
  line-height: 1.6;
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
    "Arial", "Monaco", "Menlo", "Ubuntu Mono", "Consolas", monospace !important;
  font-size: calc(var(--chat-font-size, 14px) - 1px);
  line-height: 1.5;
  border: 1px solid var(--custom-border-primary);
  position: relative;
  background: #262626;
  color: var(--code-text, #e2e8f0);
  /* 明確移除陰影效果 */
  box-shadow: none !important;
  text-shadow: none !important;
}

.markdown-content :deep(pre[class*="language-"]) {
  background: var(--code-bg, #2d3748) !important;
  color: var(--code-text, #e2e8f0) !important;
}

.markdown-content :deep(code[class*="language-"]) {
  background: transparent !important;
  color: inherit !important;
  padding: 0 !important;
  border: none !important;
  /* 移除陰影效果 */
  box-shadow: none !important;
  text-shadow: none !important;
}

.markdown-content :deep(code:not([class*="language-"])) {
  background: var(--custom-bg-tertiary);
  color: #0c9af9;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: "Consolas", monospace;
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
/* Prism.js 全局樣式 - 暗色主題 */
@media (prefers-color-scheme: dark) {
  .token.comment,
  .token.prolog,
  .token.doctype,
  .token.cdata {
    color: transparent;
  }

  .token.punctuation {
    color: #f8f8f2;
  }

  .token.property,
  .token.tag,
  .token.constant,
  .token.symbol,
  .token.deleted {
    color: #f92672;
  }

  .token.boolean,
  .token.number {
    color: #ae81ff;
  }

  .token.selector,
  .token.attr-name,
  .token.string,
  .token.char,
  .token.builtin,
  .token.inserted {
    color: #a6e22e;
  }

  .token.operator,
  .token.entity,
  .token.url,
  .language-css .token.string,
  .style .token.string,
  .token.variable {
    color: #f8f8f2;
  }

  .token.atrule,
  .token.attr-value,
  .token.function,
  .token.class-name {
    color: #e6db74;
  }

  .token.keyword {
    color: #66d9ef;
  }

  .token.regex,
  .token.important {
    color: #fd971f;
  }
}

[data-theme="dark"] .token.comment,
[data-theme="dark"] .token.prolog,
[data-theme="dark"] .token.doctype,
[data-theme="dark"] .token.cdata {
  color: #8292a2;
}

[data-theme="dark"] .token.punctuation {
  color: #f8f8f2;
}

[data-theme="dark"] .token.property,
[data-theme="dark"] .token.tag,
[data-theme="dark"] .token.constant,
[data-theme="dark"] .token.symbol,
[data-theme="dark"] .token.deleted {
  color: #f92672;
}

[data-theme="dark"] .token.boolean,
[data-theme="dark"] .token.number {
  color: #ae81ff;
}

[data-theme="dark"] .token.selector,
[data-theme="dark"] .token.attr-name,
[data-theme="dark"] .token.string,
[data-theme="dark"] .token.char,
[data-theme="dark"] .token.builtin,
[data-theme="dark"] .token.inserted {
  color: #a6e22e;
}

[data-theme="dark"] .token.operator,
[data-theme="dark"] .token.entity,
[data-theme="dark"] .token.url,
[data-theme="dark"] .language-css .token.string,
[data-theme="dark"] .style .token.string,
[data-theme="dark"] .token.variable {
  color: #f8f8f2;
}

[data-theme="dark"] .token.atrule,
[data-theme="dark"] .token.attr-value,
[data-theme="dark"] .token.function,
[data-theme="dark"] .token.class-name {
  color: #e6db74;
}

[data-theme="dark"] .token.keyword {
  color: #66d9ef;
}

[data-theme="dark"] .token.regex,
[data-theme="dark"] .token.important {
  color: #fd971f;
}

/* Prism.js 全局樣式 - 亮色主題 */
@media (prefers-color-scheme: light) {
  .token.comment,
  .token.prolog,
  .token.doctype,
  .token.cdata {
    color: #708090;
  }

  .token.punctuation {
    color: #999999;
  }

  .token.property,
  .token.tag,
  .token.constant,
  .token.symbol,
  .token.deleted {
    color: #905;
  }

  .token.boolean,
  .token.number {
    color: #905;
  }

  .token.selector,
  .token.attr-name,
  .token.string,
  .token.char,
  .token.builtin,
  .token.inserted {
    color: #690;
  }

  .token.operator,
  .token.entity,
  .token.url,
  .language-css .token.string,
  .style .token.string,
  .token.variable {
    color: #9a6e3a;
  }

  .token.atrule,
  .token.attr-value,
  .token.function,
  .token.class-name {
    color: #dd4a68;
  }

  .token.keyword {
    color: #07a;
  }

  .token.regex,
  .token.important {
    color: #e90;
  }
}

[data-theme="light"] .token.comment,
[data-theme="light"] .token.prolog,
[data-theme="light"] .token.doctype,
[data-theme="light"] .token.cdata {
  color: #708090;
}

[data-theme="light"] .token.punctuation {
  color: #999999;
}

[data-theme="light"] .token.property,
[data-theme="light"] .token.tag,
[data-theme="light"] .token.constant,
[data-theme="light"] .token.symbol,
[data-theme="light"] .token.deleted {
  color: #905;
}

[data-theme="light"] .token.boolean,
[data-theme="light"] .token.number {
  color: #905;
}

[data-theme="light"] .token.selector,
[data-theme="light"] .token.attr-name,
[data-theme="light"] .token.string,
[data-theme="light"] .token.char,
[data-theme="light"] .token.builtin,
[data-theme="light"] .token.inserted {
  color: #690;
}

[data-theme="light"] .token.operator,
[data-theme="light"] .token.entity,
[data-theme="light"] .token.url,
[data-theme="light"] .language-css .token.string,
[data-theme="light"] .style .token.string,
[data-theme="light"] .token.variable {
  color: #9a6e3a;
}

[data-theme="light"] .token.atrule,
[data-theme="light"] .token.attr-value,
[data-theme="light"] .token.function,
[data-theme="light"] .token.class-name {
  color: #dd4a68;
}

[data-theme="light"] .token.keyword {
  color: #07a;
}

[data-theme="light"] .token.regex,
[data-theme="light"] .token.important {
  color: #e90;
}

.token.important,
.token.bold {
  font-weight: bold;
}

.token.italic {
  font-style: italic;
}
</style>
