<template>
  <div class="markdown-test-container">
    <div class="test-controls">
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
          :value="currentTheme"
          @change="(value) => (currentTheme = value)"
          style="width: 100px"
          size="small">
          <a-select-option value="auto">自動</a-select-option>
          <a-select-option value="light">淺色</a-select-option>
          <a-select-option value="dark">深色</a-select-option>
        </a-select>
      </a-space>
    </div>

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
            </a-space>
          </div>

          <a-textarea
            :value="markdownInput"
            @input="(e) => (markdownInput = e.target.value)"
            placeholder="在此輸入您的 Markdown 內容..."
            :rows="20"
            class="markdown-input"
            show-count
            :maxlength="10000" />

          <div class="input-stats">
            <a-space wrap>
              <span>字符數：{{ markdownInput.length }}</span>
              <span>行數：{{ markdownInput.split("\n").length }}</span>
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
              :is-streaming="false" />
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
  </div>
</template>

<script setup>
import { ref } from "vue";
import { message } from "ant-design-vue";
import CodeHighlight from "@/components/common/CodeHighlight.vue";

// 響應式數據
const markdownInput = ref(`# Markdown & Shiki 測試

這是一個 **粗體** 和 *斜體* 的測試。

## 程式碼高亮測試

\`\`\`javascript
console.log('Hello, World!')
\`\`\`

## 列表測試
- 項目 1
- 項目 2
- 項目 3

> 這是一個引用區塊
`);

const debugMode = ref(false);
const realtimeRender = ref(true);
const currentTheme = ref("auto");

// 測試案例
const testCases = ref([
  {
    name: "基本語法",
    description: "標題、粗體、斜體等基本 Markdown 語法",
    content: `# 標題 1\n## 標題 2\n\n這是 **粗體** 和 *斜體* 文字。`,
  },
  {
    name: "程式碼塊",
    description: "JavaScript 程式碼高亮測試",
    content: `\`\`\`javascript\nconst greeting = 'Hello, World!'\nconsole.log(greeting)\n\`\`\``,
  },
]);

// 方法
const clearInput = () => {
  markdownInput.value = "";
  message.success("已清空輸入");
};

const loadSample = () => {
  markdownInput.value = `# Markdown 範例文檔

## 文字格式

**粗體文字** 和 *斜體文字* 的範例。

## 程式碼

\`\`\`javascript
function greet(name) {
  console.log('Hello, ' + name + '!')
}
\`\`\`

## 列表
- 項目 1
- 項目 2
- 項目 3

> 這是一個引用區塊。`;
  message.success("已載入範例內容");
};

const loadTestCase = (testCase) => {
  markdownInput.value = testCase.content;
  message.success(`已載入測試案例：${testCase.name}`);
};

const handleRefresh = () => {
  message.success("已重新渲染");
};

const copyToClipboard = async () => {
  try {
    await navigator.clipboard.writeText(markdownInput.value);
    message.success("已複製到剪貼板");
  } catch (err) {
    message.error("複製失敗");
  }
};
</script>

<style scoped>
.markdown-test-container {
  padding: 16px 0;
}

.test-controls {
  margin-bottom: 16px;
  padding: 12px;
  background: var(--custom-bg-color);
  border-radius: 6px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--custom-border-color);
}

.section-header h3 {
  margin: 0;
  color: #1890ff;
}

.markdown-input {
  font-family: "Courier New", "Monaco", monospace;
  border-radius: 6px;
}

.input-stats {
  margin-top: 8px;
  padding: 8px;
  background: var(--custom-bg-color);
  border-radius: 4px;
  font-size: 12px;
  color: var(--custom-text-color);
}

.preview-container {
  border: 1px solid var(--custom-border-color);
  border-radius: 6px;
  padding: 16px;
  background: var(--custom-bg-color);
  min-height: 500px;
  max-height: 600px;
  overflow-y: auto;
}

.test-case-card {
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: 8px;
}

.test-case-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.test-case-desc {
  margin: 0;
  color: #666;
  font-size: 12px;
}

@media (max-width: 768px) {
  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .test-controls {
    overflow-x: auto;
  }
}
</style>
