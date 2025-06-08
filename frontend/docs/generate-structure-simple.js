const fs = require("fs");
const path = require("path");

// 配置
const config = {
  excludeDirs: [
    "node_modules",
    ".git",
    ".vscode",
    "dist",
    "build",
    "coverage",
    "logs",
    "uploads",
  ],
  excludeFiles: [".DS_Store", "Thumbs.db"],
  maxDepth: 8,
};

// 檔案圖示
const getFileIcon = (fileName) => {
  const icons = {
    "package.json": "📦",
    "README.md": "📖",
    "TODO.md": "📋",
    ".js": "📜",
    ".vue": "💚",
    ".css": "🎨",
    ".html": "🌐",
    ".sql": "🗃️",
    ".md": "📝",
    ".sh": "🐚",
    ".bat": "⚙️",
    ".ps1": "💻",
  };

  const ext = path.extname(fileName).toLowerCase();
  const baseName = path.basename(fileName).toLowerCase();
  return icons[baseName] || icons[ext] || "📄";
};

// 掃描目錄
const scanDirectory = (dirPath, depth = 0) => {
  if (depth > config.maxDepth) return null;

  try {
    const items = fs.readdirSync(dirPath);
    const structure = {
      name: path.basename(dirPath),
      children: [],
      files: [],
      stats: { totalFiles: 0, totalDirs: 0 },
    };

    items.sort();

    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stats = fs.statSync(itemPath);

      if (stats.isDirectory()) {
        if (config.excludeDirs.includes(item) || item.startsWith(".")) continue;

        const subStructure = scanDirectory(itemPath, depth + 1);
        if (subStructure) {
          structure.children.push(subStructure);
          structure.stats.totalDirs += 1 + subStructure.stats.totalDirs;
          structure.stats.totalFiles += subStructure.stats.totalFiles;
        }
      } else {
        if (item.startsWith(".") && item !== ".env") continue;
        if (config.excludeFiles.includes(item)) continue;

        structure.files.push({
          name: item,
          icon: getFileIcon(item),
        });
        structure.stats.totalFiles += 1;
      }
    }

    return structure;
  } catch (error) {
    console.error(`掃描目錄錯誤 ${dirPath}:`, error.message);
    return null;
  }
};

// 生成樹狀結構
const generateTree = (structure, prefix = "", isLast = true) => {
  if (!structure) return "";

  let result = "";
  const connector = isLast ? "└── " : "├── ";
  result += `${prefix}${connector}📁 ${structure.name}\n`;

  const newPrefix = prefix + (isLast ? "    " : "│   ");

  // 子目錄
  if (structure.children.length > 0) {
    structure.children.forEach((child, index) => {
      const isLastChild =
        index === structure.children.length - 1 && structure.files.length === 0;
      result += generateTree(child, newPrefix, isLastChild);
    });
  }

  // 檔案
  if (structure.files.length > 0) {
    structure.files.forEach((file, index) => {
      const isLastFile = index === structure.files.length - 1;
      const fileConnector = isLastFile ? "└── " : "├── ";
      result += `${newPrefix}${fileConnector}${file.icon} ${file.name}\n`;
    });
  }

  return result;
};

// 主要執行
const main = () => {
  try {
    console.log("🔍 開始掃描專案結構...");

    const projectRoot = __dirname;
    const structure = scanDirectory(projectRoot);

    if (!structure) {
      console.error("❌ 無法掃描專案結構");
      return;
    }

    console.log("📝 生成 Markdown 文件...");

    const currentTime = new Date().toLocaleString("zh-TW");
    const projectName = path.basename(projectRoot);

    const markdown = `# ${projectName} 專案結構

> 自動生成於: ${currentTime}

## 📋 目錄結構

\`\`\`
${generateTree(structure, "", true).trim()}
\`\`\`

## 📊 專案統計

- **總目錄數**: ${structure.stats.totalDirs}
- **總檔案數**: ${structure.stats.totalFiles}

## 📂 主要目錄說明

- **📁 frontend/** - 前端應用程式 (Vue.js + Vite)
- **📁 backend/** - 後端 API 服務 (Node.js + Express)
- **📁 docs/** - 專案文檔和說明
- **📜 start-dev.*** - 開發環境啟動腳本 (多平台支援)

## 🚀 快速開始

\`\`\`bash
# 啟動開發環境 (推薦)
node start-dev.js

# 或使用平台特定腳本
./start-dev.sh     # macOS/Linux
start-dev.bat      # Windows
.\\start-dev.ps1    # PowerShell
\`\`\`

## 📝 說明

這個文件是由 \`generate-structure.js\` 腳本自動生成的，包含了整個專案的目錄結構。

### 重新生成結構文件

\`\`\`bash
node generate-structure.js
\`\`\`

### 注意事項

- 排除了 node_modules、.git、logs 等不必要的目錄
- 僅顯示專案開發相關的重要檔案
- 最大掃描深度限制為 ${config.maxDepth} 層

---

*最後更新: ${currentTime}*
`;

    const outputPath = path.join(projectRoot, "PROJECT_STRUCTURE.md");
    fs.writeFileSync(outputPath, markdown, "utf8");

    console.log(`✅ 專案結構已生成: PROJECT_STRUCTURE.md`);
    console.log(
      `📊 統計: ${structure.stats.totalDirs} 目錄, ${structure.stats.totalFiles} 檔案`
    );
  } catch (error) {
    console.error("❌ 生成專案結構時發生錯誤:", error.message);
    process.exit(1);
  }
};

// 執行
main();
