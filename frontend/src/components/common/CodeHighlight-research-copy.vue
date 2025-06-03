<template>
  <div
    class="markdown-stream-container"
    ref="containerRef">
    <div
      class="markdown-content"
      v-html="renderedContent"
      @scroll="handleScroll"></div>
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
import { ref, computed, watch, nextTick, onMounted } from "vue";
import { useThrottleFn, useElementSize } from "@vueuse/core";
import MarkdownIt from "markdown-it";
import { getHighlighter } from "shiki";

const props = defineProps({
  streamContent: {
    type: String,
    default: "",
  },
  isStreaming: {
    type: Boolean,
    default: false,
  },
  theme: {
    type: String,
    default: "github-light",
  },
  autoScroll: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits(["scroll", "chunk-rendered"]);

// Refs
const containerRef = ref(null);
const highlighter = ref(null);
const buffer = ref("");
const renderedChunks = ref([]);
const shouldAutoScroll = ref(true);
const streamingText = ref("正在接收內容...");

// 使用 VueUse 的工具
const { width, height } = useElementSize(containerRef);

// 初始化 Shiki 高亮器
onMounted(async () => {
  try {
    highlighter.value = await getHighlighter({
      themes: ["github-light", "github-dark", "monokai", "nord"],
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
        "react",
      ],
    });
  } catch (error) {
    console.error("初始化 Shiki 失敗:", error);
  }
});

// 配置 MarkdownIt
const md = computed(() => {
  if (!highlighter.value) {
    return new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true,
    });
  }

  return new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
    highlight: (code, lang) => {
      const displayLang = lang || "text";
      const langHeader = `
        <div class="code-header">
          <span class="language-label">${displayLang}</span>
          <div class="code-actions">
            <button class="copy-btn" onclick="copyCodeToClipboard(this)" title="複製程式碼">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="m5 15-2-2 2-2"></path>
                <path d="M5 9V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2"></path>
              </svg>
              複製
            </button>
          </div>
        </div>`;

      try {
        // 使用 Shiki 進行語法高亮
        const html = highlighter.value.codeToHtml(code, {
          lang: lang || "text",
          theme: props.theme,
        });

        // 提取 pre 標籤內的內容
        const preMatch = html.match(/<pre[^>]*>([\s\S]*?)<\/pre>/);
        const preContent = preMatch ? preMatch[1] : `<code>${code}</code>`;

        return `
          <div class="code-block-wrapper" data-lang="${displayLang}">
            ${langHeader}
            <pre class="shiki-pre">${preContent}</pre>
          </div>`;
      } catch (error) {
        console.warn(`語法高亮失敗 (${lang}):`, error);
        return `
          <div class="code-block-wrapper" data-lang="${displayLang}">
            ${langHeader}
            <pre class="fallback-pre"><code>${escapeHtml(code)}</code></pre>
          </div>`;
      }
    },
  });
});

// HTML 轉義函數
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

// 處理串流內容
watch(
  () => props.streamContent,
  (newContent) => {
    if (!newContent) return;

    buffer.value = newContent;
    processStreamChunk();
  },
  { immediate: true }
);

// 節流的串流處理
const processStreamChunk = useThrottleFn(() => {
  if (!md.value) return;

  try {
    // 檢測完整的 markdown 塊
    const chunks = buffer.value.split(/\n\s*\n/);

    if (chunks.length > 1 || !props.isStreaming) {
      const completeChunks = props.isStreaming ? chunks.slice(0, -1) : chunks;
      const remaining = props.isStreaming ? chunks[chunks.length - 1] : "";

      completeChunks.forEach((chunk, index) => {
        if (chunk.trim()) {
          const rendered = md.value.render(chunk.trim());
          renderedChunks.value.push({
            id: Date.now() + index,
            content: rendered,
            timestamp: new Date(),
          });

          emit("chunk-rendered", {
            chunk: chunk.trim(),
            rendered,
            index: renderedChunks.value.length - 1,
          });
        }
      });

      buffer.value = remaining;

      // 自動滾動
      if (shouldAutoScroll.value && props.autoScroll) {
        nextTick(() => {
          scrollToBottom();
        });
      }
    }
  } catch (error) {
    console.error("處理串流塊錯誤:", error);
  }
}, 150);

// 計算最終渲染內容
const renderedContent = computed(() => {
  let content = renderedChunks.value.map((chunk) => chunk.content).join("");

  // 如果正在串流且有緩衝內容
  if (props.isStreaming && buffer.value.trim()) {
    try {
      const currentChunk = md.value.render(buffer.value);
      content += `<div class="streaming-chunk">${currentChunk}</div>`;
    } catch (error) {
      // 顯示原始文本
      content += `<div class="streaming-raw">${escapeHtml(buffer.value)}</div>`;
    }
  }

  return content;
});

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
  renderedChunks.value = [];
  buffer.value = "";
};

// 設置主題
const setTheme = (theme) => {
  // 這裡可以動態切換主題
  console.log("切換主題:", theme);
};

// 全局複製函數
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
      watch(
        () => props.isStreaming,
        (newStreaming) => {
          if (!newStreaming) {
            clearInterval(interval);
            streamingText.value = "完成";
          }
        }
      );
    }
  }
);

// 暴露方法
defineExpose({
  clearContent,
  scrollToBottom,
  setTheme,
  renderedChunks: renderedChunks.value,
});
</script>

<style scoped>
.markdown-stream-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.markdown-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  line-height: 1.7;
  font-size: 16px;
  color: #2c3e50;
}

.streaming-indicator {
  padding: 12px 20px;
  background: linear-gradient(90deg, #f8f9fa 0%, #e9ecef 100%);
  border-top: 1px solid #dee2e6;
  display: flex;
  align-items: center;
  justify-content: center;
}

.typing-animation {
  display: flex;
  align-items: center;
  color: #6c757d;
  font-size: 14px;
  font-weight: 500;
}

.typing-animation::after {
  content: "";
  width: 3px;
  height: 18px;
  background: #007bff;
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

.streaming-chunk {
  opacity: 0.85;
  transition: opacity 0.3s ease;
  border-left: 3px solid #007bff;
  padding-left: 12px;
  margin: 8px 0;
}

.streaming-raw {
  color: #6c757d;
  font-style: italic;
  white-space: pre-wrap;
  background: #f8f9fa;
  padding: 8px 12px;
  border-radius: 4px;
  border-left: 3px solid #ffc107;
}

/* 程式碼塊樣式 */
.markdown-content :deep(.code-block-wrapper) {
  margin: 20px 0;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #e1e4e8;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  transition: box-shadow 0.2s ease;
}

.markdown-content :deep(.code-block-wrapper:hover) {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.markdown-content :deep(.code-header) {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(90deg, #f6f8fa 0%, #f1f3f4 100%);
  padding: 12px 16px;
  border-bottom: 1px solid #e1e4e8;
  font-size: 14px;
}

.markdown-content :deep(.language-label) {
  color: #586069;
  font-weight: 600;
  text-transform: uppercase;
  font-size: 12px;
  letter-spacing: 0.5px;
}

.markdown-content :deep(.code-actions) {
  display: flex;
  gap: 8px;
}

.markdown-content :deep(.copy-btn) {
  display: flex;
  align-items: center;
  gap: 4px;
  background: #ffffff;
  border: 1px solid #d0d7de;
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 12px;
  cursor: pointer;
  color: #24292f;
  transition: all 0.2s ease;
  font-weight: 500;
}

.markdown-content :deep(.copy-btn:hover) {
  background: #f3f4f6;
  border-color: #8c959f;
  transform: translateY(-1px);
}

.markdown-content :deep(.copy-btn.copied) {
  background: #dcfce7;
  border-color: #22c55e;
  color: #16a34a;
}

.markdown-content :deep(.shiki-pre) {
  margin: 0;
  padding: 20px;
  overflow-x: auto;
  font-family:
    "Fira Code", "SF Mono", "Monaco", "Inconsolata", "Roboto Mono", monospace;
  font-size: 14px;
  line-height: 1.6;
  background: transparent !important;
}

.markdown-content :deep(.fallback-pre) {
  margin: 0;
  padding: 20px;
  background: #f6f8fa;
  overflow-x: auto;
  font-family:
    "Fira Code", "SF Mono", "Monaco", "Inconsolata", "Roboto Mono", monospace;
  font-size: 14px;
  line-height: 1.6;
}

.markdown-content :deep(.fallback-pre code) {
  background: none;
  padding: 0;
  color: #24292f;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .markdown-content {
    padding: 16px;
    font-size: 15px;
  }

  .markdown-content :deep(.code-header) {
    padding: 10px 12px;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .markdown-content :deep(.shiki-pre),
  .markdown-content :deep(.fallback-pre) {
    padding: 16px;
    font-size: 13px;
  }
}

/* 滾動條樣式 */
.markdown-content::-webkit-scrollbar {
  width: 8px;
}

.markdown-content::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.markdown-content::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.markdown-content::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>
