#!/usr/bin/env node

/**
 * SFDA Nexus 專案結構生成器
 * 自動掃描專案目錄並生成結構化的 Markdown 文件
 */

import { readdir, stat, writeFile } from "fs/promises";
import { join, relative, extname, basename, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// 配置
const config = {
  projectRoot: __dirname,
  outputFile: "PROJECT_STRUCTURE.md",
  maxDepth: 8,
  excludeDirs: [
    "node_modules",
    ".git",
    ".vscode",
    "dist",
    "build",
    "coverage",
    ".next",
    ".nuxt",
    "logs",
    "uploads",
  ],
  excludeFiles: [".DS_Store", "Thumbs.db"],
};

// 檔案類型圖示
const fileIcons = {
  "package.json": "📦",
  "vite.config.js": "⚡",
  "eslint.config.js": "🔍",
  "jest.config.js": "🧪",
  ".env": "🔑",
  "docker-compose.yml": "🐳",
  ".md": "📝",
  "README.md": "📖",
  "TODO.md": "📋",
  ".js": "📜",
  ".ts": "📘",
  ".vue": "💚",
  ".css": "🎨",
  ".html": "🌐",
  ".sql": "🗃️",
  ".sh": "🐚",
  ".bat": "⚙️",
  ".ps1": "💻",
  default: "📄",
};

// 取得檔案圖示
const getFileIcon = (fileName) => {
  const ext = extname(fileName).toLowerCase();
  const baseName = basename(fileName).toLowerCase();
  return fileIcons[baseName] || fileIcons[ext] || fileIcons.default;
};

// 檢查是否應該排除目錄
const shouldExcludeDir = (dirName) => {
  return config.excludeDirs.includes(dirName) || dirName.startsWith(".");
};

// 檢查是否應該排除檔案
const shouldExcludeFile = (fileName) => {
  if (fileName.startsWith(".") && fileName !== ".env") return true;
  return config.excludeFiles.includes(fileName);
};

// 掃描目錄結構
const scanDirectory = async (dirPath, depth = 0) => {
  if (depth > config.maxDepth) return null;

  try {
    const items = await readdir(dirPath);
    const structure = {
      name: basename(dirPath),
      type: "directory",
      path: relative(config.projectRoot, dirPath) || ".",
      children: [],
      files: [],
      stats: {
        totalFiles: 0,
        totalDirs: 0,
      },
    };

    items.sort();

    for (const item of items) {
      const itemPath = join(dirPath, item);
      const stats = await stat(itemPath);

      if (stats.isDirectory()) {
        if (shouldExcludeDir(item)) continue;

        const subStructure = await scanDirectory(itemPath, depth + 1);
        if (subStructure) {
          structure.children.push(subStructure);
          structure.stats.totalDirs += 1 + subStructure.stats.totalDirs;
          structure.stats.totalFiles += subStructure.stats.totalFiles;
        }
      } else {
        if (shouldExcludeFile(item)) continue;

        const fileInfo = {
          name: item,
          type: "file",
          path: relative(config.projectRoot, itemPath),
          icon: getFileIcon(item),
          size: stats.size,
        };

        structure.files.push(fileInfo);
        structure.stats.totalFiles += 1;
      }
    }

    return structure;
  } catch (error) {
    console.error(`掃描目錄時發生錯誤 ${dirPath}:`, error.message);
    return null;
  }
};

// 生成目錄樹文字
const generateTreeText = (structure, prefix = "", isLast = true) => {
  if (!structure) return "";

  let result = "";
  const connector = isLast ? "└── " : "├── ";
  const folderIcon = structure.type === "directory" ? "📁 " : "";

  result += `${prefix}${connector}${folderIcon}${structure.name}\n`;

  const newPrefix = prefix + (isLast ? "    " : "│   ");

  // 顯示子目錄
  if (structure.children && structure.children.length > 0) {
    structure.children.forEach((child, index) => {
      const isLastChild =
        index === structure.children.length - 1 && structure.files.length === 0;
      result += generateTreeText(child, newPrefix, isLastChild);
    });
  }

  // 顯示檔案
  if (structure.files && structure.files.length > 0) {
    structure.files.forEach((file, index) => {
      const isLastFile = index === structure.files.length - 1;
      const fileConnector = isLastFile ? "└── " : "├── ";
      result += `${newPrefix}${fileConnector}${file.icon} ${file.name}\n`;
    });
  }

  return result;
};

// 主要函式
const main = async () => {
  try {
    console.log("🔍 開始掃描專案結構...");

    const structure = await scanDirectory(config.projectRoot);

    if (!structure) {
      console.error("❌ 無法掃描專案結構");
      return;
    }

    console.log("📝 生成 Markdown 文件...");

    const currentTime = new Date().toLocaleString("zh-TW");
    const projectName = basename(config.projectRoot);

    const markdown = `# ${projectName} 專案結構

> 自動生成於: ${currentTime}

## 📋 目錄結構

\`\`\`
${generateTreeText(structure, "", true).trim()}
\`\`\`

## 📊 專案統計

- **總目錄數**: ${structure.stats.totalDirs}
- **總檔案數**: ${structure.stats.totalFiles}

## 📂 主要目錄說明

- **📁 frontend/** - 前端應用程式 (Vue.js + Vite)
- **📁 backend/** - 後端 API 服務 (Node.js + Express)
- **📁 docs/** - 專案文檔和說明
- **📜 start-dev.*** - 開發環境啟動腳本 (多平台支援)

## 📝 說明

這個文件是由 \`generate-structure.js\` 腳本自動生成的，包含了整個專案的目錄結構。

### 使用方式

\`\`\`bash
# 重新生成專案結構文件
node generate-structure.js
\`\`\`

### 注意事項

- 排除了 node_modules、.git、logs 等不必要的目錄
- 僅顯示專案開發相關的重要檔案
- 最大掃描深度限制為 ${config.maxDepth} 層

---

*最後更新: ${currentTime}*
`;

    const outputPath = join(config.projectRoot, config.outputFile);
    await writeFile(outputPath, markdown, "utf8");

    console.log(`✅ 專案結構已生成: ${config.outputFile}`);
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
