/**
 * 資料庫 Schema 提取腳本
 * 連接到 .env 指定的資料庫，獲取完整的 schema 結構（包含欄位註解）
 */

import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// ES6 模組中取得 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 載入環境變數
dotenv.config({ path: "../../.env" });

// 資料庫連接配置
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "sfda_nexus",
  charset: "utf8mb4",
  timezone: "+08:00",
};

/**
 * 獲取所有資料表清單
 */
const getTables = async (connection) => {
  const [rows] = await connection.execute(
    `
    SELECT 
      TABLE_NAME as tableName,
      TABLE_COMMENT as tableComment,
      ENGINE as engine,
      TABLE_COLLATION as collation,
      CREATE_TIME as createTime,
      UPDATE_TIME as updateTime
    FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_SCHEMA = ? 
    ORDER BY TABLE_NAME
  `,
    [dbConfig.database]
  );

  return rows;
};

/**
 * 獲取資料表的欄位資訊
 */
const getTableColumns = async (connection, tableName) => {
  const [rows] = await connection.execute(
    `
    SELECT 
      COLUMN_NAME as columnName,
      COLUMN_TYPE as columnType,
      DATA_TYPE as dataType,
      IS_NULLABLE as isNullable,
      COLUMN_DEFAULT as defaultValue,
      COLUMN_COMMENT as comment,
      COLUMN_KEY as columnKey,
      EXTRA as extra,
      CHARACTER_SET_NAME as characterSet,
      COLLATION_NAME as collation,
      NUMERIC_PRECISION as numericPrecision,
      NUMERIC_SCALE as numericScale,
      CHARACTER_MAXIMUM_LENGTH as maxLength
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
    ORDER BY ORDINAL_POSITION
  `,
    [dbConfig.database, tableName]
  );

  return rows;
};

/**
 * 獲取資料表的索引資訊
 */
const getTableIndexes = async (connection, tableName) => {
  const [rows] = await connection.execute(
    `
    SELECT 
      INDEX_NAME as indexName,
      COLUMN_NAME as columnName,
      NON_UNIQUE as nonUnique,
      INDEX_TYPE as indexType,
      SEQ_IN_INDEX as seqInIndex,
      INDEX_COMMENT as comment
    FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
    ORDER BY INDEX_NAME, SEQ_IN_INDEX
  `,
    [dbConfig.database, tableName]
  );

  return rows;
};

/**
 * 獲取外鍵資訊
 */
const getForeignKeys = async (connection, tableName) => {
  const [rows] = await connection.execute(
    `
    SELECT 
      CONSTRAINT_NAME as constraintName,
      COLUMN_NAME as columnName,
      REFERENCED_TABLE_NAME as referencedTable,
      REFERENCED_COLUMN_NAME as referencedColumn
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
    WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = ? 
      AND REFERENCED_TABLE_NAME IS NOT NULL
    ORDER BY CONSTRAINT_NAME, ORDINAL_POSITION
  `,
    [dbConfig.database, tableName]
  );

  return rows;
};

/**
 * 格式化欄位類型顯示
 */
const formatColumnType = (column) => {
  let type = column.columnType;

  // 添加是否允許 NULL
  if (column.isNullable === "NO") {
    type += " NOT NULL";
  }

  // 添加預設值
  if (column.defaultValue !== null) {
    if (column.defaultValue === "CURRENT_TIMESTAMP") {
      type += ` DEFAULT ${column.defaultValue}`;
    } else {
      type += ` DEFAULT '${column.defaultValue}'`;
    }
  }

  // 添加 AUTO_INCREMENT
  if (column.extra && column.extra.includes("auto_increment")) {
    type += " AUTO_INCREMENT";
  }

  return type;
};

/**
 * 生成資料表的 Markdown 文檔
 */
const generateTableMarkdown = (table, columns, indexes, foreignKeys) => {
  let markdown = `### 📋 ${table.tableName}\n\n`;

  // 資料表資訊
  if (table.tableComment) {
    markdown += `**說明**: ${table.tableComment}\n\n`;
  }

  markdown += `**引擎**: ${table.engine} | **字符集**: ${table.collation}\n\n`;

  // 欄位資訊
  markdown += "#### 📝 欄位結構\n\n";
  markdown += "| 欄位名稱 | 類型 | 說明 | 鍵值 |\n";
  markdown += "|----------|------|------|------|\n";

  columns.forEach((column) => {
    const keyInfo =
      column.columnKey === "PRI"
        ? "🔑 主鍵"
        : column.columnKey === "UNI"
          ? "🔒 唯一"
          : column.columnKey === "MUL"
            ? "🔗 索引"
            : "";

    markdown += `| \`${column.columnName}\` | \`${formatColumnType(column)}\` | ${column.comment || "-"} | ${keyInfo} |\n`;
  });

  // 索引資訊
  if (indexes.length > 0) {
    markdown += "\n#### 🗂️ 索引\n\n";

    const indexGroups = {};
    indexes.forEach((index) => {
      if (!indexGroups[index.indexName]) {
        indexGroups[index.indexName] = {
          name: index.indexName,
          type: index.indexType,
          unique: index.nonUnique === 0,
          columns: [],
          comment: index.comment,
        };
      }
      indexGroups[index.indexName].columns.push(index.columnName);
    });

    markdown += "| 索引名稱 | 類型 | 欄位 | 說明 |\n";
    markdown += "|----------|------|------|------|\n";

    Object.values(indexGroups).forEach((index) => {
      const typeInfo =
        index.name === "PRIMARY"
          ? "🔑 主鍵"
          : index.unique
            ? "🔒 唯一索引"
            : "🔗 一般索引";
      markdown += `| \`${index.name}\` | ${typeInfo} | \`${index.columns.join(", ")}\` | ${index.comment || "-"} |\n`;
    });
  }

  // 外鍵資訊
  if (foreignKeys.length > 0) {
    markdown += "\n#### 🔗 外鍵關聯\n\n";
    markdown += "| 約束名稱 | 本表欄位 | 參考資料表 | 參考欄位 |\n";
    markdown += "|----------|----------|------------|----------|\n";

    foreignKeys.forEach((fk) => {
      markdown += `| \`${fk.constraintName}\` | \`${fk.columnName}\` | \`${fk.referencedTable}\` | \`${fk.referencedColumn}\` |\n`;
    });
  }

  markdown += "\n---\n\n";
  return markdown;
};

/**
 * 主要執行函數
 */
const main = async () => {
  let connection;

  try {
    console.log("🔍 開始連接資料庫...");
    console.log(
      `📍 連接到: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`
    );

    // 建立資料庫連接
    connection = await mysql.createConnection(dbConfig);
    console.log("✅ 資料庫連接成功");

    // 獲取所有資料表
    console.log("📋 獲取資料表清單...");
    const tables = await getTables(connection);
    console.log(`📊 找到 ${tables.length} 個資料表`);

    if (tables.length === 0) {
      console.log("⚠️  資料庫中沒有找到任何資料表");
      return;
    }

    // 生成 Markdown 文檔
    const currentTime = new Date().toLocaleString("zh-TW");
    let markdown = `# ${dbConfig.database} 資料庫 Schema 文檔\n\n`;
    markdown += `> 自動生成於: ${currentTime}\n\n`;
    markdown += `## 📊 資料庫概覽\n\n`;
    markdown += `- **資料庫名稱**: \`${dbConfig.database}\`\n`;
    markdown += `- **主機**: \`${dbConfig.host}:${dbConfig.port}\`\n`;
    markdown += `- **總資料表數**: ${tables.length}\n`;
    markdown += `- **字符集**: \`utf8mb4\`\n\n`;

    // 資料表摘要
    markdown += `## 📋 資料表清單\n\n`;
    markdown += "| 資料表名稱 | 說明 | 引擎 | 建立時間 |\n";
    markdown += "|------------|------|------|----------|\n";

    tables.forEach((table) => {
      const createTime = table.createTime
        ? new Date(table.createTime).toLocaleDateString("zh-TW")
        : "-";
      markdown += `| [\`${table.tableName}\`](#-${table.tableName.toLowerCase()}) | ${table.tableComment || "-"} | ${table.engine} | ${createTime} |\n`;
    });

    markdown += "\n---\n\n";
    markdown += "## 📝 詳細結構\n\n";

    // 處理每個資料表
    for (const table of tables) {
      console.log(`📝 處理資料表: ${table.tableName}`);

      // 獲取欄位資訊
      const columns = await getTableColumns(connection, table.tableName);

      // 獲取索引資訊
      const indexes = await getTableIndexes(connection, table.tableName);

      // 獲取外鍵資訊
      const foreignKeys = await getForeignKeys(connection, table.tableName);

      // 生成該資料表的文檔
      markdown += generateTableMarkdown(table, columns, indexes, foreignKeys);
    }

    // 添加腳本資訊
    markdown += `## 🔧 關於此文檔\n\n`;
    markdown += `此文檔由 \`generate-db-schema.js\` 腳本自動生成，包含了 \`${dbConfig.database}\` 資料庫的完整 schema 結構。\n\n`;
    markdown += `### 重新生成此文檔\n\n`;
    markdown += `\`\`\`bash\n`;
    markdown += `node generate-db-schema.js\n`;
    markdown += `\`\`\`\n\n`;
    markdown += `### 注意事項\n\n`;
    markdown += `- 此文檔反映了生成時的資料庫結構\n`;
    markdown += `- 如果資料庫結構有變更，請重新執行腳本更新文檔\n`;
    markdown += `- 包含了所有資料表、欄位、索引和外鍵關聯資訊\n\n`;
    markdown += `---\n\n`;
    markdown += `*最後更新: ${currentTime}*\n`;

    // 寫入檔案
    const outputPath = path.join(__dirname, "DATABASE_SCHEMA.md");
    fs.writeFileSync(outputPath, markdown, "utf8");

    console.log(`✅ 資料庫 Schema 文檔已生成: DATABASE_SCHEMA.md`);
    console.log(`📊 統計: ${tables.length} 個資料表`);
  } catch (error) {
    console.error("❌ 生成資料庫 Schema 時發生錯誤:", error.message);

    if (error.code === "ER_ACCESS_DENIED_ERROR") {
      console.error("🔐 資料庫連接被拒絕，請檢查用戶名和密碼");
    } else if (error.code === "ECONNREFUSED") {
      console.error("🚫 無法連接到資料庫，請檢查主機和端口設定");
    } else if (error.code === "ER_BAD_DB_ERROR") {
      console.error("🗃️ 找不到指定的資料庫，請檢查資料庫名稱");
    }

    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log("🔌 資料庫連接已關閉");
    }
  }
};

// 執行腳本
main();
