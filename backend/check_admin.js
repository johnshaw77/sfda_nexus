import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "sfda_nexus",
  charset: "utf8mb4",
};

async function checkAdmin() {
  const connection = await mysql.createConnection(dbConfig);

  const [users] = await connection.execute(
    "SELECT id, username, email, is_active, email_verified, role, password_hash FROM users WHERE username = ?",
    ["admin"]
  );

  if (users.length > 0) {
    const admin = users[0];
    console.log("管理員帳號信息:");
    console.log("ID:", admin.id);
    console.log("用戶名:", admin.username);
    console.log("郵箱:", admin.email);
    console.log("是否啟用:", admin.is_active);
    console.log("郵箱已驗證:", admin.email_verified);
    console.log("角色:", admin.role);
    console.log("密碼哈希長度:", admin.password_hash.length);

    // 測試密碼
    const isValid = await bcrypt.compare("admin123", admin.password_hash);
    console.log("密碼驗證結果:", isValid);
  } else {
    console.log("未找到管理員帳號");
  }

  await connection.end();
}

checkAdmin().catch(console.error);
