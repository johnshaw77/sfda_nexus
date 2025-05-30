/**
 * 資料庫設置腳本
 * 執行現有的 schema.sql 文件並創建管理員帳號
 */

import fs from "fs";
import path from "path";
import mysql from "mysql2/promise";
import bcrypt from "bcrypt";
import { fileURLToPath } from "url";
import { dirname } from "path";

// 獲取當前文件的目錄路徑
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 載入環境變數（簡單實現）
const loadEnv = () => {
  try {
    const envPath = path.join(__dirname, ".env");
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, "utf8");
      envContent.split("\n").forEach((line) => {
        const [key, value] = line.split("=");
        if (key && value) {
          process.env[key.trim()] = value.trim();
        }
      });
    }
  } catch (error) {
    // 忽略環境變數載入錯誤
  }
};

loadEnv();

// 資料庫配置
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  charset: "utf8mb4",
};

// 管理員帳號配置
const adminConfig = {
  username: "admin",
  email: "admin@sfdanexus.com",
  password: "admin123",
  displayName: "系統管理員",
  role: "super_admin",
};

async function executeSchema() {
  let connection;

  try {
    console.log("🚀 開始設置 SFDA Nexus 資料庫...\n");

    // 讀取 schema.sql 文件
    console.log("📖 讀取 schema.sql 文件...");
    const schemaPath = path.join(__dirname, "database", "schema.sql");

    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema 文件不存在: ${schemaPath}`);
    }

    const schemaSQL = fs.readFileSync(schemaPath, "utf8");
    console.log("✅ Schema 文件讀取成功");

    // 分割 SQL 語句
    console.log("📝 解析 SQL 語句...");

    // 移除註釋並分割語句
    const cleanSQL = schemaSQL
      .split("\n")
      .filter((line) => !line.trim().startsWith("--") && line.trim().length > 0)
      .join("\n");

    const sqlStatements = cleanSQL
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0);

    console.log(`📝 解析到 ${sqlStatements.length} 個 SQL 語句`);

    // 調試：顯示前幾個語句
    console.log("前 3 個語句:");
    sqlStatements.slice(0, 3).forEach((stmt, index) => {
      console.log(`${index + 1}. ${stmt.substring(0, 80)}...`);
    });

    // 連接資料庫（不指定資料庫名稱）
    console.log("🔗 連接 MySQL 服務器...");
    console.log(`   主機: ${dbConfig.host}:${dbConfig.port}`);
    console.log(`   用戶: ${dbConfig.user}`);

    connection = await mysql.createConnection(dbConfig);
    console.log("✅ MySQL 服務器連接成功");

    // 先執行 CREATE DATABASE 語句
    console.log("📦 創建資料庫...");
    const createDbStatement = sqlStatements.find((stmt) =>
      stmt.toLowerCase().includes("create database")
    );

    if (createDbStatement) {
      console.log(`執行: ${createDbStatement.substring(0, 80)}...`);
      await connection.execute(createDbStatement);
      console.log("✅ 資料庫創建成功");
    } else {
      throw new Error("未找到 CREATE DATABASE 語句");
    }

    // 等待一下確保資料庫創建完成
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 重新連接到新創建的資料庫
    console.log("🔗 重新連接到 sfda_nexus 資料庫...");
    await connection.end();

    const newDbConfig = {
      ...dbConfig,
      database: "sfda_nexus",
    };

    connection = await mysql.createConnection(newDbConfig);
    console.log("✅ 成功連接到 sfda_nexus 資料庫");

    // 執行其他 SQL 語句（跳過 CREATE DATABASE 和 USE 語句）
    console.log("⚡ 執行資料庫結構創建...");

    let tableCount = 0;
    for (let i = 0; i < sqlStatements.length; i++) {
      const statement = sqlStatements[i];
      if (
        statement &&
        !statement.toLowerCase().includes("create database") &&
        !statement.toLowerCase().includes("use ")
      ) {
        try {
          await connection.execute(statement);
          if (statement.toLowerCase().includes("create table")) {
            const tableName = statement.match(
              /create table\s+(?:`)?(\w+)(?:`)?/i
            )?.[1];
            if (tableName) {
              tableCount++;
              console.log(`📋 表格 ${tableName} 創建成功 (${tableCount})`);
            }
          } else if (statement.toLowerCase().includes("insert into")) {
            console.log("📝 插入初始數據...");
          }
        } catch (error) {
          if (!error.message.includes("already exists")) {
            console.warn(`⚠️  執行 SQL 語句時出現警告: ${error.message}`);
            console.warn(`語句: ${statement.substring(0, 100)}...`);
          }
        }
      }
    }

    console.log("✅ 資料庫結構創建完成");

    // 驗證表格是否創建成功
    console.log("🔍 驗證資料庫結構...");
    const [tables] = await connection.execute("SHOW TABLES");
    console.log(`✅ 成功創建 ${tables.length} 個表格:`);
    tables.forEach((table) => {
      const tableName = Object.values(table)[0];
      console.log(`   - ${tableName}`);
    });

    return connection;
  } catch (error) {
    console.error("❌ 資料庫設置失敗:", error.message);
    console.error("錯誤詳情:", error);

    if (error.code === "ECONNREFUSED") {
      console.log("💡 提示: 無法連接 MySQL 服務器，請確認:");
      console.log("   1. MySQL 服務是否已啟動: brew services start mysql");
      console.log("   2. 連接參數是否正確");
      console.log("   3. 防火牆是否允許連接");
    } else if (error.code === "ER_ACCESS_DENIED_ERROR") {
      console.log("💡 提示: 資料庫訪問被拒絕，請檢查用戶名和密碼");
    } else if (error.code === "ER_BAD_DB_ERROR") {
      console.log("💡 提示: 資料庫不存在，這可能是正常的，正在創建...");
    }

    if (connection) {
      try {
        await connection.end();
      } catch (closeError) {
        console.warn("關閉連接時出錯:", closeError.message);
      }
    }
    return null;
  }
}

async function createAdminAccount(connection) {
  console.log("\n👤 創建管理員帳號...");

  try {
    // 檢查管理員帳號是否已存在
    console.log("🔍 檢查管理員帳號是否已存在...");
    const [existingUsers] = await connection.execute(
      "SELECT id, username FROM users WHERE username = ? OR email = ?",
      [adminConfig.username, adminConfig.email]
    );

    if (existingUsers.length > 0) {
      console.log("⚠️  管理員帳號已存在:", existingUsers[0].username);
      console.log("如需重新創建，請先刪除現有帳號");
      return true;
    }

    // 生成密碼哈希值
    console.log("🔐 生成密碼哈希值...");
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(adminConfig.password, saltRounds);

    // 插入管理員帳號
    console.log("👤 創建管理員帳號...");
    const [result] = await connection.execute(
      `INSERT INTO users (
        username, 
        email, 
        password_hash, 
        display_name, 
        role, 
        is_active, 
        email_verified,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, 1, 1, NOW(), NOW())`,
      [
        adminConfig.username,
        adminConfig.email,
        passwordHash,
        adminConfig.displayName,
        adminConfig.role,
      ]
    );

    console.log("✅ 管理員帳號創建成功！");
    console.log("📋 帳號信息:");
    console.log(`   用戶名: ${adminConfig.username}`);
    console.log(`   郵箱: ${adminConfig.email}`);
    console.log(`   密碼: ${adminConfig.password}`);
    console.log(`   角色: ${adminConfig.role}`);
    console.log(`   用戶ID: ${result.insertId}`);

    // 記錄審計日誌
    await connection.execute(
      `INSERT INTO audit_logs (
        user_id, 
        action, 
        resource_type, 
        resource_id, 
        details, 
        ip_address, 
        status,
        created_at
      ) VALUES (?, 'create_admin', 'user', ?, ?, '127.0.0.1', 'success', NOW())`,
      [
        result.insertId,
        result.insertId.toString(),
        JSON.stringify({
          username: adminConfig.username,
          email: adminConfig.email,
          role: adminConfig.role,
          created_by: "system_script",
        }),
      ]
    );

    console.log("📝 審計日誌已記錄");
    return true;
  } catch (error) {
    console.error("❌ 創建管理員帳號失敗:", error.message);

    if (error.code === "ER_DUP_ENTRY") {
      console.log("💡 提示: 用戶名或郵箱已存在，請檢查資料庫");
    }

    return false;
  }
}

async function main() {
  console.log("🎯 SFDA Nexus 資料庫設置工具");
  console.log("=====================================");

  // 檢查環境變數
  if (!process.env.DB_PASSWORD && !process.env.DB_USER) {
    console.log("⚠️  未檢測到資料庫配置，將使用默認設置:");
    console.log("   主機: localhost:3306");
    console.log("   用戶: root");
    console.log("   密碼: (空)");
    console.log("   資料庫: sfda_nexus");
    console.log("\n如需自定義配置，請創建 .env 文件\n");
  }

  // 執行資料庫設置
  const connection = await executeSchema();
  if (!connection) {
    console.log("\n❌ 資料庫設置失敗，請檢查錯誤信息並重試");
    process.exit(1);
  }

  // 創建管理員帳號
  const adminSuccess = await createAdminAccount(connection);

  // 關閉連接
  await connection.end();
  console.log("🔌 資料庫連接已關閉");

  if (!adminSuccess) {
    console.log("\n⚠️  管理員帳號創建失敗，但資料庫結構已建立");
  }

  console.log("\n🎉 資料庫設置完成！");
  console.log("=====================================");
  console.log("現在您可以:");
  console.log("1. 啟動後端服務: npm start");
  console.log("2. 使用管理員帳號登入: admin / admin123");
  console.log("3. 開始使用 SFDA Nexus 系統");
}

// 如果直接執行此腳本
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
