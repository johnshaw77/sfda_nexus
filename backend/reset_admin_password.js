/**
 * 重置管理員密碼腳本
 */

import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

// 載入環境變數
dotenv.config();

// 資料庫配置
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "sfda_nexus",
  charset: "utf8mb4",
};

// 新密碼
const newPassword = "admin123";

async function resetAdminPassword() {
  let connection;

  try {
    console.log("🔗 連接資料庫...");
    connection = await mysql.createConnection(dbConfig);
    console.log("✅ 資料庫連接成功");

    // 檢查管理員帳號
    console.log("🔍 檢查管理員帳號...");
    const [users] = await connection.execute(
      "SELECT id, username, email, password_hash FROM users WHERE username = ?",
      ["admin"]
    );

    if (users.length === 0) {
      console.log("❌ 管理員帳號不存在");
      return;
    }

    const admin = users[0];
    console.log("✅ 找到管理員帳號:", {
      id: admin.id,
      username: admin.username,
      email: admin.email,
    });

    // 測試當前密碼
    console.log("🔍 測試當前密碼...");
    const isCurrentPasswordValid = await bcrypt.compare(
      newPassword,
      admin.password_hash
    );
    if (isCurrentPasswordValid) {
      console.log("✅ 當前密碼已經是 admin123，無需重置");
      return;
    }

    // 生成新密碼哈希值
    console.log("🔐 生成新密碼哈希值...");
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    // 更新密碼
    console.log("🔄 更新管理員密碼...");
    await connection.execute(
      "UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?",
      [passwordHash, admin.id]
    );

    // 驗證新密碼
    console.log("🔍 驗證新密碼...");
    const isNewPasswordValid = await bcrypt.compare(newPassword, passwordHash);
    if (!isNewPasswordValid) {
      console.log("❌ 密碼驗證失敗，重置可能有問題");
      return;
    }

    console.log("✅ 管理員密碼重置成功！");
    console.log("📋 登入信息:");
    console.log(`   用戶名: admin`);
    console.log(`   密碼: ${newPassword}`);
    console.log(`   郵箱: ${admin.email}`);
  } catch (error) {
    console.error("❌ 重置密碼失敗:", error.message);

    if (error.code === "ECONNREFUSED") {
      console.log("💡 提示: 無法連接資料庫，請檢查 MySQL 服務是否啟動");
    } else if (error.code === "ER_ACCESS_DENIED_ERROR") {
      console.log("💡 提示: 資料庫訪問被拒絕，請檢查用戶名和密碼");
    }

    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log("🔌 資料庫連接已關閉");
    }
  }
}

// 執行重置
resetAdminPassword();
