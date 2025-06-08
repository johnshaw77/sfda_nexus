<template>
  <div class="playground-container">
    <a-card
      title="🧪 Markdown & Shiki 測試實驗室"
      class="playground-card">
      <template #extra>
        <a-space wrap>
          <a-switch
            v-model:checked="debugMode"
            checked-children="調試"
            un-checked-children="調試" />
          <a-switch
            v-model:checked="realtimeRender"
            checked-children="即時"
            un-checked-children="等待" />
          <a-select
            v-model:value="currentTheme"
            style="width: 100px"
            size="small">
            <a-select-option value="auto">自動</a-select-option>
            <a-select-option value="light">淺色</a-select-option>
            <a-select-option value="dark">深色</a-select-option>
          </a-select>
          <a-switch
            v-model:checked="deepDebugMode"
            checked-children="深度"
            un-checked-children="深度" />
        </a-space>
      </template>

      <a-row :gutter="[16, 16]">
        <!-- 左側：輸入區域 -->
        <a-col
          :xs="24"
          :sm="24"
          :md="12"
          :lg="12"
          :xl="12">
          <div class="input-section">
            <div class="section-header">
              <h3>📝 Markdown 輸入</h3>
              <a-space wrap>
                <a-button
                  size="small"
                  @click="clearInput"
                  >清空</a-button
                >
                <a-button
                  size="small"
                  @click="loadSample"
                  >載入範例</a-button
                >
                <a-button
                  size="small"
                  @click="loadCodeBlockSample"
                  >載入程式碼範例</a-button
                >
              </a-space>
            </div>

            <a-textarea
              v-model:value="markdownInput"
              placeholder="在此輸入您的 Markdown 內容..."
              :rows="20"
              class="markdown-input"
              show-count
              :maxlength="10000" />

            <div class="input-stats">
              <a-space wrap>
                <span>字符數：{{ markdownInput.length }}</span>
                <span>行數：{{ markdownInput.split("\n").length }}</span>
                <span>程式碼塊：{{ codeBlockCount }}</span>
              </a-space>
            </div>
          </div>
        </a-col>

        <!-- 右側：預覽區域 -->
        <a-col
          :xs="24"
          :sm="24"
          :md="12"
          :lg="12"
          :xl="12">
          <div class="preview-section">
            <div class="section-header">
              <h3>👀 渲染預覽</h3>
              <a-space wrap>
                <a-button
                  size="small"
                  @click="handleRefresh"
                  >重新渲染</a-button
                >
                <a-button
                  size="small"
                  @click="copyToClipboard"
                  >複製結果</a-button
                >
              </a-space>
            </div>

            <div class="preview-container">
              <CodeHighlight
                :content="markdownInput"
                :debug="debugMode"
                :theme="currentTheme"
                :realtime-render="realtimeRender"
                :is-streaming="false"
                @scroll="handleScroll" />
            </div>
          </div>
        </a-col>
      </a-row>

      <!-- 測試案例區域 -->
      <a-divider>🔧 預設測試案例</a-divider>

      <a-row :gutter="[8, 8]">
        <a-col
          :xs="12"
          :sm="12"
          :md="8"
          :lg="6"
          :xl="6"
          v-for="(testCase, index) in testCases"
          :key="index">
          <a-card
            size="small"
            :title="testCase.name"
            class="test-case-card"
            @click="loadTestCase(testCase)">
            <template #extra>
              <a-button
                type="link"
                size="small"
                >載入</a-button
              >
            </template>
            <p class="test-case-desc">{{ testCase.description }}</p>
          </a-card>
        </a-col>
      </a-row>

      <!-- 深度調試面板 -->
      <div v-if="deepDebugMode">
        <a-divider>🔬 深度縮排分析</a-divider>

        <a-row :gutter="[16, 16]">
          <a-col
            :xs="24"
            :sm="24"
            :md="12"
            :lg="12"
            :xl="12">
            <a-card
              size="small"
              title="🧪 渲染引擎對比測試">
              <a-space
                direction="vertical"
                style="width: 100%">
                <a-button
                  block
                  @click="testRawHTML"
                  >原生 HTML</a-button
                >
                <a-button
                  block
                  @click="testMarkdownOnly"
                  >純 Markdown (無高亮)</a-button
                >
                <a-button
                  block
                  @click="testShikiOnly"
                  >純 Shiki (無預處理)</a-button
                >
                <a-button
                  block
                  @click="testCodeHighlightDirect"
                  >CodeHighlight (有預處理)</a-button
                >
                <a-button
                  block
                  @click="testForceResetCSS"
                  >強制重置 CSS</a-button
                >
              </a-space>
            </a-card>
          </a-col>

          <a-col
            :xs="24"
            :sm="24"
            :md="12"
            :lg="12"
            :xl="12">
            <a-card
              size="small"
              title="🔍 字符級別分析">
              <a-space
                direction="vertical"
                style="width: 100%">
                <a-button
                  block
                  @click="analyzeCharacters"
                  >分析字符編碼</a-button
                >
                <a-button
                  block
                  @click="analyzeDOMPosition"
                  >分析 DOM 位置</a-button
                >
                <a-button
                  block
                  @click="analyzeComputedStyles"
                  >分析計算樣式</a-button
                >
                <a-button
                  block
                  @click="detectBrowserIssues"
                  >檢測瀏覽器問題</a-button
                >
                <a-button
                  block
                  @click="analyzeFirstLineIssue"
                  type="primary"
                  >🔥 分析首行縮排問題</a-button
                >
              </a-space>
            </a-card>
          </a-col>
        </a-row>

        <!-- 深度分析結果 -->
        <div
          v-if="deepAnalysisResult"
          class="deep-analysis-result">
          <a-card
            size="small"
            title="🔬 深度分析結果">
            <pre class="analysis-output">{{ deepAnalysisResult }}</pre>
          </a-card>
        </div>

        <!-- 對比測試結果 -->
        <div
          v-if="comparisonResults.length > 0"
          class="comparison-results">
          <a-card
            size="small"
            title="⚖️ 渲染對比結果">
            <a-row :gutter="8">
              <a-col
                :span="6"
                v-for="(result, index) in comparisonResults"
                :key="index">
                <div class="comparison-item">
                  <h4>{{ result.name }}</h4>
                  <div
                    class="comparison-preview"
                    v-html="result.html"></div>
                </div>
              </a-col>
            </a-row>
          </a-card>
        </div>
      </div>

      <!-- 分析結果區域 -->
      <a-divider>📊 渲染分析</a-divider>

      <a-row :gutter="[16, 16]">
        <a-col
          :xs="24"
          :sm="8"
          :md="8"
          :lg="8"
          :xl="8">
          <a-statistic
            title="處理時間"
            :value="renderTime"
            suffix="ms" />
        </a-col>
        <a-col
          :xs="24"
          :sm="8"
          :md="8"
          :lg="8"
          :xl="8">
          <a-statistic
            title="程式碼塊數量"
            :value="codeBlockCount" />
        </a-col>
        <a-col
          :xs="24"
          :sm="8"
          :md="8"
          :lg="8"
          :xl="8">
          <a-statistic
            title="渲染模式"
            :value="realtimeRender ? '即時渲染' : '等待渲染'" />
        </a-col>
      </a-row>
    </a-card>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from "vue";
import { message } from "ant-design-vue";
import CodeHighlight from "@/components/common/CodeHighlight-test.vue";

// 響應式數據
const markdownInput = ref("");
const debugMode = ref(true);
const realtimeRender = ref(false);
const currentTheme = ref("auto");
const renderTime = ref(0);
const deepDebugMode = ref(false);
const deepAnalysisResult = ref("");
const comparisonResults = ref([]);

// 計算屬性
const codeBlockCount = computed(() => {
  const matches = markdownInput.value.match(/```[\s\S]*?```/g);
  return matches ? matches.length : 0;
});

// 測試案例
const testCases = ref([
  {
    name: "基本縮排測試",
    description: "測試程式碼塊首行縮排問題",
    content: `# 縮排測試

這是一個測試程式碼塊縮排的範例：

\`\`\`javascript
    function hello() {
        console.log("Hello, World!");
        return "success";
    }
\`\`\`

\`\`\`python
    def calculate(x, y):
        result = x + y
        return result
\`\`\``,
  },
  {
    name: "混合語言測試",
    description: "測試多種程式語言的渲染",
    content: `# 多語言程式碼測試

## JavaScript
\`\`\`javascript
const data = {
  name: 'test',
  value: 123
}
\`\`\`

## Python
\`\`\`python
def process_data(data):
    return data * 2
\`\`\`

## CSS
\`\`\`css
.container {
  display: flex;
  justify-content: center;
}
\`\`\``,
  },
  {
    name: "無語言標示",
    description: "測試沒有語言標示的程式碼塊",
    content: `# 無語言標示測試

\`\`\`
    這是沒有語言標示的程式碼塊
    可能會有縮排問題
    let test = "example"
\`\`\`

普通文字內容。`,
  },
  {
    name: "複雜縮排測試",
    description: "測試複雜的縮排情況",
    content: `# 複雜縮排測試

\`\`\`javascript
        // 這裡有很深的縮排
        function deepIndent() {
            if (true) {
                console.log("deep");
                return {
                    success: true,
                    data: "test"
                };
            }
        }
\`\`\`

## 另一個測試
\`\`\`css
            .deeply-nested {
                position: relative;
                z-index: 999;
            }
            
            .another-class {
                color: red;
            }
\`\`\``,
  },
]);

// 方法
const clearInput = () => {
  markdownInput.value = "";
  message.success("輸入已清空");
};

const loadSample = () => {
  markdownInput.value = `# 範例 Markdown 文檔

這是一個 **粗體** 和 *斜體* 的範例。

## 程式碼範例

行內程式碼：\`console.log("Hello")\`

程式碼塊：
\`\`\`javascript
function greet(name) {
  console.log(\`Hello, \${name}!\`)
  return true
}
\`\`\`

## 列表

- 項目 1
- 項目 2
  - 子項目 A
  - 子項目 B

## 引用

> 這是一個引用塊
> 用來測試樣式

## 表格

| 欄位1 | 欄位2 | 欄位3 |
|-------|-------|-------|
| 數據1 | 數據2 | 數據3 |
| 數據4 | 數據5 | 數據6 |`;

  message.success("已載入範例內容");
};

const loadCodeBlockSample = () => {
  markdownInput.value = `# 程式碼塊縮排測試

## 問題重現範例

\`\`\`javascript
    // 這行開頭有4個空格
    function test() {
        // 這行有8個空格
        console.log("測試縮排問題");
        
        if (true) {
            // 這行有12個空格
            return "success";
        }
    }
\`\`\`

## 無縮排對比

\`\`\`javascript
function normal() {
    console.log("正常的程式碼");
    return true;
}
\`\`\`

## Python 範例

\`\`\`python
        def indented_function():
            print("這個函數有縮排")
            for i in range(3):
                print(f"數字: {i}")
\`\`\``;

  message.success("已載入程式碼塊測試範例");
};

const loadTestCase = (testCase) => {
  markdownInput.value = testCase.content;
  message.success(`已載入測試案例：${testCase.name}`);
};

const handleRefresh = () => {
  const startTime = performance.now();

  // 強制重新渲染（通過清空再設回來）
  const content = markdownInput.value;
  markdownInput.value = "";

  nextTick(() => {
    markdownInput.value = content;
    const endTime = performance.now();
    renderTime.value = Math.round(endTime - startTime);
    message.success("重新渲染完成");
  });
};

const copyToClipboard = async () => {
  try {
    await navigator.clipboard.writeText(markdownInput.value);
    message.success("內容已複製到剪貼板");
  } catch (err) {
    message.error("複製失敗");
  }
};

const handleScroll = (scrollInfo) => {
  console.log("滾動信息:", scrollInfo);
};

// 監聽輸入變化，計算渲染時間
watch(
  () => markdownInput.value,
  () => {
    const startTime = performance.now();
    nextTick(() => {
      const endTime = performance.now();
      renderTime.value = Math.round(endTime - startTime);
    });
  }
);

// 深度調試方法
const testRawHTML = () => {
  const codeContent = extractCodeFromMarkdown(markdownInput.value);
  if (!codeContent) {
    message.warning("請先輸入包含程式碼塊的 Markdown");
    return;
  }

  const rawHTML = `<pre><code>${codeContent}</code></pre>`;
  addComparisonResult("原生 HTML", rawHTML);
  deepAnalysisResult.value = `原生 HTML 測試完成\n代碼內容：\n${codeContent}`;
};

const testMarkdownOnly = async () => {
  try {
    const MarkdownIt = (await import("markdown-it")).default;
    const md = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true,
      breaks: true,
    });
    const result = md.render(markdownInput.value);
    addComparisonResult("純 Markdown (無 Shiki)", result);
    deepAnalysisResult.value = `純 Markdown 渲染完成 (無語法高亮)\n渲染結果：\n${result}`;
  } catch (error) {
    message.error("無法載入 markdown-it 模組");
    deepAnalysisResult.value = `錯誤：無法載入 markdown-it 模組\n${error.message}`;
  }
};

const testShikiOnly = async () => {
  try {
    // 直接使用 Shiki + markdown-it，不通過 CodeHighlight 組件
    const MarkdownIt = (await import("markdown-it")).default;
    const Shiki = (await import("@shikijs/markdown-it")).default;

    const md = new MarkdownIt({
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
      ],
      defaultTheme: "light", // 固定使用亮色主題測試
    });

    md.use(shikiPlugin);

    // 直接渲染，不做任何預處理
    const result = md.render(markdownInput.value);
    addComparisonResult("純 Shiki (原始)", result);
    deepAnalysisResult.value = `純 Shiki 渲染完成\n無任何預處理和修正\n渲染結果：\n${result.substring(0, 500)}...`;
  } catch (error) {
    message.error("無法載入 Shiki 模組");
    deepAnalysisResult.value = `錯誤：無法載入 Shiki 模組\n${error.message}`;
  }
};

const testForceResetCSS = () => {
  const style = document.createElement("style");
  style.innerHTML = `
    .preview-container pre,
    .preview-container code,
    .preview-container pre *,
    .preview-container code * {
      text-indent: 0 !important;
      margin-left: 0 !important;
      padding-left: 0 !important;
      text-align: left !important;
      white-space: pre !important;
      transform: none !important;
      position: static !important;
    }
  `;
  document.head.appendChild(style);

  setTimeout(() => {
    document.head.removeChild(style);
  }, 5000);

  message.success("強制 CSS 重置已應用 5 秒");
  deepAnalysisResult.value =
    "強制 CSS 重置應用完成\n所有可能影響縮排的 CSS 屬性已被重置";
};

const analyzeCharacters = () => {
  const lines = markdownInput.value.split("\n");
  let analysis = "字符級別分析結果：\n\n";

  lines.forEach((line, index) => {
    if (line.trim().startsWith("```") || line.trim() === "") return;

    analysis += `行 ${index + 1}: "${line}"\n`;
    analysis += `  長度: ${line.length}\n`;
    analysis += `  首字符: "${line.charAt(0)}" (Unicode: ${line.charCodeAt(0)})\n`;
    analysis += `  前導空白: ${line.length - line.trimStart().length} 個\n`;

    // 檢查特殊字符
    const specialChars = [];
    for (let i = 0; i < Math.min(line.length, 10); i++) {
      const char = line.charAt(i);
      const code = line.charCodeAt(i);
      if (code > 127 || code === 9 || code === 160) {
        specialChars.push(`"${char}"(${code})`);
      }
    }
    if (specialChars.length > 0) {
      analysis += `  特殊字符: ${specialChars.join(", ")}\n`;
    }
    analysis += "\n";
  });

  deepAnalysisResult.value = analysis;
};

const analyzeDOMPosition = () => {
  const preElements = document.querySelectorAll(".preview-container pre");
  let analysis = "DOM 位置分析結果：\n\n";

  preElements.forEach((pre, index) => {
    const rect = pre.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(pre);

    analysis += `程式碼塊 ${index + 1}:\n`;
    analysis += `  位置: (${rect.left}, ${rect.top})\n`;
    analysis += `  大小: ${rect.width} x ${rect.height}\n`;
    analysis += `  text-indent: ${computedStyle.textIndent}\n`;
    analysis += `  padding-left: ${computedStyle.paddingLeft}\n`;
    analysis += `  margin-left: ${computedStyle.marginLeft}\n`;
    analysis += `  transform: ${computedStyle.transform}\n`;

    const codeElement = pre.querySelector("code");
    if (codeElement) {
      const codeRect = codeElement.getBoundingClientRect();
      const codeStyle = window.getComputedStyle(codeElement);
      analysis += `  code 位置: (${codeRect.left}, ${codeRect.top})\n`;
      analysis += `  code text-indent: ${codeStyle.textIndent}\n`;
    }

    analysis += "\n";
  });

  deepAnalysisResult.value = analysis;
};

const analyzeComputedStyles = () => {
  const preElements = document.querySelectorAll(
    ".preview-container pre, .preview-container code"
  );
  let analysis = "計算樣式分析結果：\n\n";

  const importantProps = [
    "text-indent",
    "padding-left",
    "margin-left",
    "border-left-width",
    "text-align",
    "white-space",
    "font-family",
    "font-size",
    "line-height",
    "letter-spacing",
    "word-spacing",
    "transform",
    "position",
    "left",
    "display",
    "box-sizing",
  ];

  preElements.forEach((element, index) => {
    const computedStyle = window.getComputedStyle(element);
    analysis += `元素 ${index + 1} (${element.tagName}):\n`;

    importantProps.forEach((prop) => {
      const value = computedStyle.getPropertyValue(prop);
      if (value && value !== "normal" && value !== "auto" && value !== "0px") {
        analysis += `  ${prop}: ${value}\n`;
      }
    });

    analysis += "\n";
  });

  deepAnalysisResult.value = analysis;
};

const detectBrowserIssues = () => {
  const userAgent = navigator.userAgent;
  const browser = getBrowserName(userAgent);

  let analysis = `瀏覽器檢測結果：\n\n`;
  analysis += `瀏覽器: ${browser}\n`;
  analysis += `User Agent: ${userAgent}\n\n`;

  // 檢查已知問題
  if (browser.includes("Safari") && !browser.includes("Chrome")) {
    analysis += "⚠️  Safari 已知問題:\n";
    analysis += "  - 可能存在字體渲染差異\n";
    analysis += "  - CSS transform 行為可能不同\n\n";
  }

  if (browser.includes("Firefox")) {
    analysis += "⚠️  Firefox 已知問題:\n";
    analysis += "  - text-indent 計算可能有差異\n";
    analysis += "  - 預設字體設置可能影響顯示\n\n";
  }

  // 檢查設備像素比
  analysis += `設備像素比: ${window.devicePixelRatio}\n`;
  analysis += `螢幕解析度: ${screen.width}x${screen.height}\n`;

  deepAnalysisResult.value = analysis;
};

const extractCodeFromMarkdown = (markdown) => {
  const codeBlockMatch = markdown.match(/```[a-zA-Z]*\n([\s\S]*?)\n```/);
  return codeBlockMatch ? codeBlockMatch[1] : null;
};

const addComparisonResult = (name, html) => {
  comparisonResults.value.push({ name, html });
};

const analyzeFirstLineIssue = () => {
  let analysis = "🔥 首行縮排問題深度分析：\n\n";

  // 分析原始 Markdown 內容
  const codeBlocks = markdownInput.value.match(/```[\w]*\n([\s\S]*?)\n```/g);
  if (!codeBlocks || codeBlocks.length === 0) {
    analysis += "❌ 沒有找到程式碼塊\n";
    deepAnalysisResult.value = analysis;
    return;
  }

  codeBlocks.forEach((block, blockIndex) => {
    analysis += `📋 程式碼塊 ${blockIndex + 1}:\n`;
    analysis += `原始內容: ${JSON.stringify(block)}\n\n`;

    // 提取程式碼內容
    const match = block.match(/```(\w*)\n([\s\S]*?)\n```/);
    if (!match) return;

    const [, lang, codeContent] = match;
    const lines = codeContent.split("\n");

    analysis += `語言: ${lang || "無標示"}\n`;
    analysis += `總行數: ${lines.length}\n\n`;

    // 分析每一行
    lines.forEach((line, lineIndex) => {
      analysis += `行 ${lineIndex + 1}: "${line}"\n`;
      analysis += `  長度: ${line.length}\n`;
      analysis += `  是否為空: ${line.trim() === "" ? "是" : "否"}\n`;

      if (line.length > 0) {
        analysis += `  首字符: "${line[0]}" (Unicode: ${line.charCodeAt(0)})\n`;
        const leadingSpaces = line.length - line.trimStart().length;
        analysis += `  前導空白: ${leadingSpaces} 個\n`;

        if (lineIndex === 0) {
          analysis += `  🚨 這是首行! 前導空白: ${leadingSpaces} 個\n`;
        }
      }
      analysis += "\n";
    });

    // 計算最小縮排（模擬 CodeHighlight 的邏輯）
    let minIndent = Infinity;
    const nonEmptyLines = [];

    lines.forEach((line, index) => {
      if (line.trim()) {
        nonEmptyLines.push(index);
        const indent = line.length - line.trimStart().length;
        minIndent = Math.min(minIndent, indent);
      }
    });

    analysis += `🔍 縮排分析結果:\n`;
    analysis += `  非空行索引: [${nonEmptyLines.join(", ")}]\n`;
    analysis += `  檢測到的最小縮排: ${minIndent === Infinity ? "無" : minIndent} 個空白\n`;

    if (minIndent > 0 && minIndent !== Infinity) {
      analysis += `\n🛠️ 去縮排處理後:\n`;
      lines.forEach((line, index) => {
        if (line.trim()) {
          const dedented = line.substring(minIndent);
          analysis += `  行 ${index + 1}: "${line}" → "${dedented}"\n`;

          if (index === 0) {
            analysis += `    🎯 首行去縮排: 移除了 ${minIndent} 個空白字符\n`;
          }
        }
      });
    } else {
      analysis += `\n✅ 無需去縮排處理\n`;
    }

    analysis += "\n" + "=".repeat(50) + "\n\n";
  });

  // 測試您發現的解決方案
  analysis += "🧪 測試解決方案:\n";
  analysis += "根據您的發現，在首行前添加空行可能會解決問題。\n";
  analysis += "這暗示問題可能出現在首行的特殊處理上。\n\n";

  analysis += "🔧 建議的修正方案:\n";
  analysis += "1. 檢查去縮排算法是否正確處理首行\n";
  analysis += "2. 考慮在程式碼塊開始時添加空行作為緩衝\n";
  analysis += "3. 檢查 Shiki 渲染器的首行處理邏輯\n";

  deepAnalysisResult.value = analysis;
};

// 測試 CodeHighlight 組件的直接渲染
const testCodeHighlightDirect = () => {
  // 使用當前的 CodeHighlight 組件渲染
  const previewContainer = document.querySelector(".preview-container");
  if (previewContainer) {
    const html = previewContainer.innerHTML;
    addComparisonResult("CodeHighlight 組件", html);
    deepAnalysisResult.value = `CodeHighlight 組件渲染完成\n包含預處理和修正邏輯\n當前 DOM 結構已捕獲`;
  } else {
    deepAnalysisResult.value = "無法找到 CodeHighlight 組件的渲染結果";
  }
};

const getBrowserName = (userAgent) => {
  if (userAgent.includes("Chrome")) return "Chrome";
  if (userAgent.includes("Firefox")) return "Firefox";
  if (userAgent.includes("Safari")) return "Safari";
  if (userAgent.includes("Edge")) return "Edge";
  return "Unknown";
};

// 初始載入一個測試案例
loadCodeBlockSample();
</script>

<style scoped>
.playground-container {
  padding: 20px;
  max-width: 1800px;
  margin: 0 auto;
}

.playground-card {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.input-section,
.preview-section {
  height: 100%;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--custom-border-primary);
}

.section-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--custom-text-primary);
}

.markdown-input {
  font-family:
    "Fira Code", "SF Mono", "Monaco", "Inconsolata", "Roboto Mono", monospace;
  font-size: 14px;
  line-height: 1.6;
  resize: vertical;
}

.input-stats {
  margin-top: 8px;
  padding: 8px;
  background: var(--custom-bg-secondary);
  border-radius: 4px;
  font-size: 12px;
  color: var(--custom-text-secondary);
}

.preview-container {
  border: 1px solid var(--custom-border-primary);
  border-radius: 8px;
  min-height: 500px;
  max-height: 600px;
  overflow: hidden;
  background: var(--custom-bg-primary);
}

.test-case-card {
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 8px;
}

.test-case-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.test-case-desc {
  margin: 0;
  font-size: 12px;
  color: var(--custom-text-secondary);
  line-height: 1.4;
}

/* 深度調試樣式 */
.deep-analysis-result {
  margin-top: 16px;
}

.analysis-output {
  max-height: 400px;
  overflow-y: auto;
  background: var(--custom-bg-secondary);
  border: 1px solid var(--custom-border-primary);
  border-radius: 4px;
  padding: 12px;
  font-family:
    "Fira Code", "SF Mono", "Monaco", "Inconsolata", "Roboto Mono", monospace;
  font-size: 12px;
  line-height: 1.4;
  color: var(--custom-text-primary);
  white-space: pre-wrap;
}

.comparison-results {
  margin-top: 16px;
}

.comparison-item {
  border: 1px solid var(--custom-border-primary);
  border-radius: 4px;
  padding: 8px;
  margin-bottom: 8px;
  background: var(--custom-bg-primary);
}

.comparison-item h4 {
  margin: 0 0 8px 0;
  font-size: 12px;
  color: var(--custom-text-secondary);
  text-align: center;
}

.comparison-preview {
  border: 1px solid var(--custom-border-secondary);
  border-radius: 3px;
  padding: 4px;
  max-height: 200px;
  overflow: auto;
  font-size: 10px;
  background: var(--custom-bg-secondary);
}

.comparison-preview pre {
  margin: 0;
  padding: 4px;
  font-size: 10px;
}

.comparison-preview code {
  font-size: 10px;
}

/* 響應式容器 padding */
.playground-container {
  padding: 24px;
}

/* 移動端響應式調整 */
@media (max-width: 991px) {
  .playground-container {
    padding: 16px;
  }
}

@media (max-width: 767px) {
  .playground-container {
    padding: 8px;
  }

  .section-header {
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }
}
</style>
