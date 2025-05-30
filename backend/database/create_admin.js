/**
 * 創建管理員帳號腳本
 * 用於生成正確的密碼哈希值並創建管理員帳號
 */

const bcrypt = require("bcrypt");
const mysql = require("mysql2/promise");
require("dotenv").config();

// 資料庫配置
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "sfda_nexus",
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

async function createAdminAccount() {
  let connection;

  try {
    console.log("🔗 連接資料庫...");
    connection = await mysql.createConnection(dbConfig);

    // 檢查管理員帳號是否已存在
    console.log("🔍 檢查管理員帳號是否已存在...");
    const [existingUsers] = await connection.execute(
      "SELECT id, username FROM users WHERE username = ? OR email = ?",
      [adminConfig.username, adminConfig.email]
    );

    if (existingUsers.length > 0) {
      console.log("⚠️  管理員帳號已存在:", existingUsers[0].username);
      console.log("如需重新創建，請先刪除現有帳號");
      return;
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
        status, 
        email_verified,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, 'active', 1, NOW(), NOW())`,
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
  } catch (error) {
    console.error("❌ 創建管理員帳號失敗:", error.message);

    if (error.code === "ER_DUP_ENTRY") {
      console.log("💡 提示: 用戶名或郵箱已存在，請檢查資料庫");
    } else if (error.code === "ECONNREFUSED") {
      console.log("💡 提示: 無法連接資料庫，請檢查資料庫服務是否啟動");
    } else if (error.code === "ER_BAD_DB_ERROR") {
      console.log("💡 提示: 資料庫不存在，請先執行 schema.sql 創建資料庫結構");
    }

    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log("🔌 資料庫連接已關閉");
    }
  }
}

// 驗證管理員帳號
async function verifyAdminAccount() {
  let connection;

  try {
    console.log("\n🔍 驗證管理員帳號...");
    connection = await mysql.createConnection(dbConfig);

    const [users] = await connection.execute(
      "SELECT id, username, email, display_name, role, status, created_at FROM users WHERE username = ?",
      [adminConfig.username]
    );

    if (users.length === 0) {
      console.log("❌ 管理員帳號不存在");
      return false;
    }

    const admin = users[0];
    console.log("✅ 管理員帳號驗證成功:");
    console.log(`   ID: ${admin.id}`);
    console.log(`   用戶名: ${admin.username}`);
    console.log(`   郵箱: ${admin.email}`);
    console.log(`   顯示名稱: ${admin.display_name}`);
    console.log(`   角色: ${admin.role}`);
    console.log(`   狀態: ${admin.status}`);
    console.log(`   創建時間: ${admin.created_at}`);

    // 驗證密碼
    const [passwordCheck] = await connection.execute(
      "SELECT password_hash FROM users WHERE username = ?",
      [adminConfig.username]
    );

    const isPasswordValid = await bcrypt.compare(
      adminConfig.password,
      passwordCheck[0].password_hash
    );

    if (isPasswordValid) {
      console.log("✅ 密碼驗證成功");
    } else {
      console.log("❌ 密碼驗證失敗");
    }

    return true;
  } catch (error) {
    console.error("❌ 驗證管理員帳號失敗:", error.message);
    return false;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 主函數
async function main() {
  console.log("🚀 SFDA Nexus 管理員帳號創建工具");
  console.log("=====================================\n");

  // 檢查必要的依賴
  try {
    require("bcrypt");
    require("mysql2/promise");
  } catch (error) {
    console.error("❌ 缺少必要的依賴包，請執行:");
    console.error("   npm install bcrypt mysql2");
    process.exit(1);
  }

  await createAdminAccount();
  await verifyAdminAccount();

  console.log("\n🎉 管理員帳號設置完成！");
  console.log("現在您可以使用以下帳號登入系統:");
  console.log(`   用戶名: ${adminConfig.username}`);
  console.log(`   密碼: ${adminConfig.password}`);
}

// 如果直接執行此腳本
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  createAdminAccount,
  verifyAdminAccount,
  adminConfig,
};
