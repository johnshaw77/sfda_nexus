<template>
  <div
    class="code-highlight-container"
    :class="{ 'dark-theme': isDarkTheme, 'light-theme': !isDarkTheme }"
    ref="containerRef">
    <!-- 調試區域 -->
    <div
      v-if="debug && content"
      class="debug-panel">
      <details>
        <summary>🐛 詳細調試信息 - 內縮問題分析</summary>
        <div class="debug-content">
          <h4>📝 原始 Markdown 內容（完整）：</h4>
          <pre class="debug-raw">{{ content }}</pre>

          <h4>🔤 可見字符顯示（完整）：</h4>
          <pre class="debug-chars">{{ debugFormattedContent }}</pre>

          <h4>📊 基本信息：</h4>
          <div class="debug-info">
            <p>總字符數：{{ content.length }}</p>
            <p>總行數：{{ content.split("\n").length }}</p>
            <p>是否包含程式碼塊：{{ content.includes("```") ? "是" : "否" }}</p>
          </div>

          <h4>📋 逐行分析：</h4>
          <div class="debug-lines">
            <div
              v-for="(line, index) in content.split('\n')"
              :key="index"
              class="debug-line">
              <span class="line-number">第{{ index + 1 }}行:</span>
              <span class="line-length">[{{ line.length }}字符]</span>
              <pre class="line-content">
"{{ line.replace(/\t/g, "[TAB]").replace(/ /g, "[SPACE]") }}"</pre
              >
              <div
                v-if="line.length > 0"
                class="line-analysis">
                <span
                  v-if="/^\s+/.test(line)"
                  class="warning"
                  >⚠️ 此行開頭有空白字符</span
                >
                <span
                  v-if="line.includes('\t')"
                  class="info"
                  >📍 包含 TAB 字符</span
                >
                <span
                  v-if="/^\s*```/.test(line)"
                  class="code-marker"
                  >🔖 程式碼塊標記</span
                >
              </div>
            </div>
          </div>

          <h4>🏗️ 渲染後 HTML 結構（部分）：</h4>
          <pre class="debug-html">{{ debugHtmlPreview }}</pre>

          <h4>🎨 CSS 檢查：</h4>
          <div
            class="debug-css"
            ref="debugCssRef">
            <p>檢查 pre 標籤的樣式...</p>
          </div>

          <h4>🔧 手動檢查工具：</h4>
          <div class="debug-tools">
            <button
              @click="checkCssStyles"
              class="debug-btn">
              重新檢查 CSS
            </button>
            <button
              @click="inspectDomStructure"
              class="debug-btn">
              檢查 DOM 結構
            </button>
            <button
              @click="logCurrentHTML"
              class="debug-btn">
              列印當前 HTML
            </button>
          </div>

          <h4>🏗️ DOM 結構檢查：</h4>
          <div
            class="debug-dom"
            ref="debugDomRef">
            <p>點擊上方按鈕進行檢查...</p>
          </div>
        </div>
      </details>
    </div>

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
  debug: {
    type: Boolean,
    default: false,
  },
  realtimeRender: {
    type: Boolean,
    default: false, // 默認為等待渲染模式
  },
});

const emit = defineEmits(["scroll", "chunk-rendered"]);

// Refs
const containerRef = ref(null);
const shouldAutoScroll = ref(true);
const streamingText = ref("正在接收內容...");
const mdInstance = ref(null);
const debugCssRef = ref(null);
const debugDomRef = ref(null);

// 使用 Pinia store
const appStore = useAppStore();

// 使用 VueUse 的工具
const { width, height } = useElementSize(containerRef);

// 響應式主題狀態
const currentTheme = ref("light");

// 調試格式化內容
const debugFormattedContent = computed(() => {
  if (!props.content) return "";
  return props.content
    .replace(/\t/g, "[TAB]")
    .replace(/ /g, "[SPACE]")
    .replace(/\n/g, "[\\n]\n");
});

// 調試 HTML 預覽
const debugHtmlPreview = computed(() => {
  if (!props.content || !mdInstance.value) return "尚未渲染";
  try {
    const html = mdInstance.value.render(props.content);
    // 只顯示前 500 個字符，避免過長
    return html.length > 500 ? html.substring(0, 500) + "..." : html;
  } catch (error) {
    return `渲染錯誤: ${error.message}`;
  }
});

// 檢查 CSS 樣式的方法
const checkCssStyles = () => {
  if (!debugCssRef.value) return;

  nextTick(() => {
    const preElements = document.querySelectorAll(".markdown-content pre");
    const codeElements = document.querySelectorAll(".markdown-content code");

    let cssInfo = "";

    if (preElements.length > 0) {
      const preStyle = window.getComputedStyle(preElements[0]);
      cssInfo += `Pre 元素樣式:\n`;
      cssInfo += `- padding: ${preStyle.padding}\n`;
      cssInfo += `- margin: ${preStyle.margin}\n`;
      cssInfo += `- text-indent: ${preStyle.textIndent}\n`;
      cssInfo += `- padding-left: ${preStyle.paddingLeft}\n`;
      cssInfo += `- margin-left: ${preStyle.marginLeft}\n`;
      cssInfo += `- white-space: ${preStyle.whiteSpace}\n`;
      cssInfo += `- display: ${preStyle.display}\n`;
      cssInfo += `- position: ${preStyle.position}\n`;
      cssInfo += `- left: ${preStyle.left}\n`;
      cssInfo += `- transform: ${preStyle.transform}\n`;

      // 檢查第一行的實際位置
      const firstLine = preElements[0].querySelector("code span:first-child");
      if (firstLine) {
        const firstLineStyle = window.getComputedStyle(firstLine);
        const rect = firstLine.getBoundingClientRect();
        cssInfo += `\n第一行元素檢查:\n`;
        cssInfo += `- 元素內容: "${firstLine.textContent}"\n`;
        cssInfo += `- 距離左邊界: ${rect.left}px\n`;
        cssInfo += `- margin-left: ${firstLineStyle.marginLeft}\n`;
        cssInfo += `- padding-left: ${firstLineStyle.paddingLeft}\n`;
        cssInfo += `- text-indent: ${firstLineStyle.textIndent}\n`;
        cssInfo += `- transform: ${firstLineStyle.transform}\n`;
      }
    }

    if (codeElements.length > 0) {
      const codeStyle = window.getComputedStyle(codeElements[0]);
      cssInfo += `\nCode 元素樣式:\n`;
      cssInfo += `- padding: ${codeStyle.padding}\n`;
      cssInfo += `- margin: ${codeStyle.margin}\n`;
      cssInfo += `- text-indent: ${codeStyle.textIndent}\n`;
      cssInfo += `- display: ${codeStyle.display}\n`;
      cssInfo += `- position: ${codeStyle.position}\n`;
      cssInfo += `- left: ${codeStyle.left}\n`;
      cssInfo += `- transform: ${codeStyle.transform}\n`;

      // 檢查所有直接子元素
      const spans = codeElements[0].querySelectorAll("span");
      cssInfo += `\n程式碼 span 元素數量: ${spans.length}\n`;
      if (spans.length > 0) {
        const firstSpan = spans[0];
        const firstSpanStyle = window.getComputedStyle(firstSpan);
        const firstSpanRect = firstSpan.getBoundingClientRect();
        cssInfo += `第一個 span 元素:\n`;
        cssInfo += `- 內容: "${firstSpan.textContent}"\n`;
        cssInfo += `- 距離左邊界: ${firstSpanRect.left}px\n`;
        cssInfo += `- margin-left: ${firstSpanStyle.marginLeft}\n`;
        cssInfo += `- padding-left: ${firstSpanStyle.paddingLeft}\n`;
        cssInfo += `- text-indent: ${firstSpanStyle.textIndent}\n`;
        cssInfo += `- transform: ${firstSpanStyle.transform}\n`;
      }
    }

    // 檢查容器元素
    const container = containerRef.value;
    if (container) {
      const containerStyle = window.getComputedStyle(container);
      cssInfo += `\n容器元素樣式:\n`;
      cssInfo += `- padding-left: ${containerStyle.paddingLeft}\n`;
      cssInfo += `- margin-left: ${containerStyle.marginLeft}\n`;
      cssInfo += `- text-indent: ${containerStyle.textIndent}\n`;
      cssInfo += `- direction: ${containerStyle.direction}\n`;
    }

    debugCssRef.value.innerHTML = `<pre>${cssInfo}</pre>`;
  });
};

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

// 簡化的 Markdown 渲染函數 - 採用純 Shiki 方式
const renderMarkdown = (content) => {
  if (!content || typeof content !== "string" || !mdInstance.value) {
    console.warn("renderMarkdown: 無效的內容或未初始化");
    return "";
  }

  try {
    // 調試：打印原始內容
    if (props.debug) {
      console.log("=== DEBUG: 原始 Markdown 內容 ===");
      console.log(JSON.stringify(content));
      console.log("=== 原始內容（可見字符） ===");
      console.log(
        content
          .replace(/\t/g, "[TAB]")
          .replace(/ /g, "[SPACE]")
          .replace(/\n/g, "[\\n]\n")
      );
    }

    // ✅ 直接使用 Shiki 渲染，不做任何預處理
    let html = mdInstance.value.render(content);

    // 調試：打印渲染後的 HTML
    if (props.debug) {
      console.log("=== DEBUG: Shiki 渲染後的 HTML ===");
      console.log(html);
    }

    // 添加複製按鈕到程式碼塊
    html = html.replace(
      /<pre[^>]*><code[^>]*class="language-([^"]*)"[^>]*>/g,
      (match, lang) => {
        const displayLang = lang || "text";

        // 調試：檢查程式碼塊匹配
        if (props.debug) {
          console.log("=== DEBUG: 程式碼塊匹配 ===");
          console.log("Language:", displayLang);
          console.log("Match:", match);
        }

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

    // 調試：打印最終 HTML
    if (props.debug) {
      console.log("=== DEBUG: 最終 HTML (無後處理) ===");
      console.log(html);
    }

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
    if (props.realtimeRender) {
      // 即時渲染模式：串流過程中即時渲染 Markdown
      return renderMarkdown(props.content);
    } else {
      // 等待渲染模式：串流過程中顯示原始文本，避免頻繁渲染 markdown
      return `<div class="streaming-raw">${escapeHtml(props.content)}</div>`;
    }
  } else {
    // 非串流時或串流完成後直接渲染完整內容
    return renderMarkdown(props.content);
  }
});

// 監聽內容變化，更新 CSS 檢查
watch(
  () => renderedContent.value,
  () => {
    if (props.debug) {
      checkCssStyles();
    }
  },
  { flush: "post" }
);

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

// 移除複雜的強制修正函數

// 這個 watch 也移動到 renderedContent 定義之後

// DOM 結構檢查函數
const inspectDomStructure = () => {
  if (!debugDomRef.value) return;

  nextTick(() => {
    const codeBlocks = containerRef.value?.querySelectorAll(
      ".code-block-wrapper"
    );
    let domInfo = "";

    if (codeBlocks && codeBlocks.length > 0) {
      domInfo += `找到 ${codeBlocks.length} 個程式碼塊\n\n`;

      codeBlocks.forEach((block, index) => {
        domInfo += `=== 程式碼塊 ${index + 1} ===\n`;

        const pre = block.querySelector("pre");
        const code = block.querySelector("code");

        if (pre && code) {
          // 檢查第一個文字節點
          const walker = document.createTreeWalker(
            code,
            NodeFilter.SHOW_TEXT,
            null,
            false
          );

          const textNodes = [];
          let node;
          while ((node = walker.nextNode())) {
            if (node.textContent.trim()) {
              textNodes.push(node);
            }
          }

          if (textNodes.length > 0) {
            const firstTextNode = textNodes[0];
            const firstChar = firstTextNode.textContent.charAt(0);
            domInfo += `第一個文字節點: "${firstTextNode.textContent.substring(0, 20)}..."\n`;
            domInfo += `第一個字符: "${firstChar}" (Unicode: ${firstChar.charCodeAt(0)})\n`;
            domInfo += `節點類型: ${firstTextNode.nodeType}\n`;
            domInfo += `父元素: ${firstTextNode.parentElement?.tagName}\n`;

            // 檢查父元素的樣式
            if (firstTextNode.parentElement) {
              const parentStyle = window.getComputedStyle(
                firstTextNode.parentElement
              );
              domInfo += `父元素樣式:\n`;
              domInfo += `  - text-indent: ${parentStyle.textIndent}\n`;
              domInfo += `  - padding-left: ${parentStyle.paddingLeft}\n`;
              domInfo += `  - margin-left: ${parentStyle.marginLeft}\n`;
            }
          }
        }

        domInfo += "\n";
      });
    } else {
      domInfo = "沒有找到程式碼塊";
    }

    debugDomRef.value.innerHTML = `<pre>${domInfo}</pre>`;
  });
};

// 列印當前 HTML 函數
const logCurrentHTML = () => {
  nextTick(() => {
    const markdownContent =
      containerRef.value?.querySelector(".markdown-content");
    if (markdownContent) {
      console.log("=== 當前 HTML 結構 ===");
      console.log(markdownContent.innerHTML);

      const codeBlocks = markdownContent.querySelectorAll("pre code");
      console.log(`\n=== 找到 ${codeBlocks.length} 個程式碼元素 ===`);

      codeBlocks.forEach((codeElement, index) => {
        console.log(`\n--- 程式碼塊 ${index + 1} ---`);
        console.log("HTML:", codeElement.outerHTML);
        console.log("文字內容:", JSON.stringify(codeElement.textContent));

        // 檢查第一行
        const firstLine = codeElement.textContent.split("\n")[0];
        console.log("第一行內容:", JSON.stringify(firstLine));
        if (firstLine.length > 0) {
          console.log("第一行開頭字符:", firstLine.charCodeAt(0));
        }
      });
    } else {
      console.log("沒有找到 markdown-content 元素");
    }
  });
};
</script>

<style scoped>
.code-highlight-container {
  width: 100%;
  line-height: 1.6;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 10px;
  height: 600px;
}

/* 調試面板樣式 */
.debug-panel {
  background: var(--custom-bg-secondary);
  border: 1px solid var(--custom-border-primary);
  border-radius: 8px;
  margin: 8px 0;
  padding: 8px;
}

.debug-panel summary {
  cursor: pointer;
  font-weight: 600;
  color: var(--custom-text-primary);
  padding: 4px 0;
}

.debug-content {
  margin-top: 8px;
  padding: 8px;
  background: var(--custom-bg-tertiary);
  border-radius: 4px;
}

.debug-content h4 {
  margin: 8px 0 4px 0;
  color: var(--custom-text-primary);
  font-size: 12px;
}

.debug-info {
  background: var(--custom-bg-primary);
  border: 1px solid var(--custom-border-primary);
  border-radius: 4px;
  padding: 8px;
  margin: 4px 0 8px 0;
}

.debug-info p {
  margin: 2px 0;
  font-size: 11px;
  color: var(--custom-text-secondary);
}

.debug-lines {
  background: var(--custom-bg-primary);
  border: 1px solid var(--custom-border-primary);
  border-radius: 4px;
  padding: 8px;
  margin: 4px 0 8px 0;
  max-height: 300px;
  overflow-y: auto;
}

.debug-line {
  margin-bottom: 8px;
  padding: 4px;
  border-bottom: 1px solid var(--custom-border-primary);
}

.debug-line:last-child {
  border-bottom: none;
}

.line-number {
  color: var(--primary-color);
  font-weight: 600;
  font-size: 10px;
  margin-right: 8px;
}

.line-length {
  color: var(--custom-text-tertiary);
  font-size: 10px;
  margin-right: 8px;
}

.line-content {
  background: transparent;
  border: none;
  padding: 2px 0;
  margin: 2px 0;
  font-size: 10px;
  color: var(--custom-text-primary);
  white-space: pre-wrap;
}

.line-analysis {
  margin-top: 4px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.line-analysis span {
  font-size: 9px;
  padding: 2px 4px;
  border-radius: 2px;
}

.warning {
  background: #fff2e8;
  color: #d46b08;
  border: 1px solid #ffd591;
}

.dark-theme .warning {
  background: rgba(212, 107, 8, 0.2);
  color: #ffa940;
  border-color: rgba(255, 213, 145, 0.3);
}

.info {
  background: #e6f7ff;
  color: #1890ff;
  border: 1px solid #91d5ff;
}

.dark-theme .info {
  background: rgba(24, 144, 255, 0.2);
  color: #69c0ff;
  border-color: rgba(145, 213, 255, 0.3);
}

.code-marker {
  background: #f6ffed;
  color: #52c41a;
  border: 1px solid #b7eb8f;
}

.dark-theme .code-marker {
  background: rgba(82, 196, 26, 0.2);
  color: #95de64;
  border-color: rgba(183, 235, 143, 0.3);
}

.debug-html {
  background: var(--custom-bg-primary);
  border: 1px solid var(--custom-border-primary);
  border-radius: 4px;
  padding: 8px;
  font-size: 10px;
  color: var(--custom-text-secondary);
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 200px;
  overflow-y: auto;
  margin: 4px 0 8px 0;
}

.debug-css {
  background: var(--custom-bg-primary);
  border: 1px solid var(--custom-border-primary);
  border-radius: 4px;
  padding: 8px;
  margin: 4px 0 8px 0;
  font-family: "Courier New", monospace;
  font-size: 10px;
  color: var(--custom-text-secondary);
  max-height: 200px;
  overflow-y: auto;
}

.debug-raw,
.debug-chars {
  background: var(--custom-bg-primary);
  border: 1px solid var(--custom-border-primary);
  border-radius: 4px;
  padding: 8px;
  font-size: 11px;
  font-family: "Courier New", monospace;
  color: var(--custom-text-secondary);
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 200px;
  overflow-y: auto;
  margin: 4px 0 8px 0;
}

.debug-tools {
  margin: 8px 0;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.debug-btn {
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 6px 12px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.debug-btn:hover {
  background: var(--primary-color);
  opacity: 0.8;
  transform: translateY(-1px);
}

.debug-dom {
  background: var(--custom-bg-primary);
  border: 1px solid var(--custom-border-primary);
  border-radius: 4px;
  padding: 8px;
  margin: 4px 0 8px 0;
  font-family: "Courier New", monospace;
  font-size: 10px;
  color: var(--custom-text-secondary);
  max-height: 300px;
  overflow-y: auto;
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
  text-indent: 0 !important;
  text-align: left !important;
  margin-left: 0 !important;
  padding-left: 16px !important;
  border-left: none !important;
  text-align-last: left !important;
}

.markdown-content :deep(code) {
  font-family:
    "Fira Code", "SF Mono", "Monaco", "Inconsolata", "Roboto Mono", monospace !important;
  text-indent: 0 !important;
  margin-left: 0 !important;
  padding-left: 0 !important;
  border-left: none !important;
  text-align: left !important;
}

/* 確保程式碼塊內容沒有額外的內縮 */
.markdown-content :deep(.code-block-wrapper pre code) {
  display: block !important;
  padding: 0 !important;
  margin: 0 !important;
  text-indent: 0 !important;
  white-space: pre !important;
  margin-left: 0 !important;
  padding-left: 0 !important;
  border-left: none !important;
  text-align: left !important;
}

/* 確保 Shiki 生成的 span 元素也沒有內縮 */
.markdown-content :deep(pre code span) {
  text-indent: 0 !important;
  margin-left: 0 !important;
  padding-left: 0 !important;
  border-left: none !important;
  text-align: left !important;
}

/* 強制第一行完全靠左 - 針對首行縮排問題加強 */
.markdown-content :deep(pre code span:first-child),
.markdown-content :deep(pre code:first-line) {
  text-indent: 0 !important;
  margin-left: 0 !important;
  padding-left: 0 !important;
  text-align: left !important;
  position: relative !important;
  left: 0 !important;
  transform: none !important;
}

/* 針對 Shiki 生成的首行 span 元素特別處理 */
.markdown-content :deep(pre code > span:first-child) {
  text-indent: 0 !important;
  margin-left: 0 !important;
  padding-left: 0 !important;
  text-align: left !important;
  position: relative !important;
  left: 0 !important;
  transform: none !important;
  display: inline !important;
}

/* 針對 Shiki 的第一個文字節點 */
.markdown-content :deep(pre code span:first-child::before) {
  content: none !important;
}

/* 針對 Shiki 可能生成的特殊結構 */
.markdown-content :deep(.shiki),
.markdown-content :deep(.shiki code),
.markdown-content :deep(.shiki pre) {
  text-indent: 0 !important;
  margin-left: 0 !important;
  padding-left: 0 !important;
  text-align: left !important;
  white-space: pre !important;
}

/* 針對可能的行號或特殊格式 */
.markdown-content :deep(pre code .line:first-child),
.markdown-content :deep(pre code [data-line="1"]) {
  text-indent: 0 !important;
  margin-left: 0 !important;
  padding-left: 0 !important;
  text-align: left !important;
  position: relative !important;
  left: 0 !important;
  transform: none !important;
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
