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

async function testLogin() {
  const connection = await mysql.createConnection(dbConfig);

  console.log("🔍 測試登入邏輯...");

  // 1. 測試根據用戶名查詢
  console.log("\n1. 根據用戶名查詢:");
  const [usersByUsername] = await connection.execute(
    "SELECT * FROM users WHERE username = ? AND is_active = 1",
    ["admin"]
  );
  console.log("查詢結果數量:", usersByUsername.length);
  if (usersByUsername.length > 0) {
    const user = usersByUsername[0];
    console.log("用戶信息:", {
      id: user.id,
      username: user.username,
      email: user.email,
      is_active: user.is_active,
      role: user.role,
    });

    // 測試密碼驗證
    const isPasswordValid = await bcrypt.compare(
      "admin123",
      user.password_hash
    );
    console.log("密碼驗證結果:", isPasswordValid);
  }

  // 2. 測試根據郵箱查詢
  console.log("\n2. 根據郵箱查詢:");
  const [usersByEmail] = await connection.execute(
    "SELECT * FROM users WHERE email = ? AND is_active = 1",
    ["admin@sfda-nexus.com"]
  );
  console.log("查詢結果數量:", usersByEmail.length);

  // 3. 測試不帶 is_active 條件的查詢
  console.log("\n3. 不帶 is_active 條件的查詢:");
  const [allUsers] = await connection.execute(
    "SELECT * FROM users WHERE username = ?",
    ["admin"]
  );
  console.log("查詢結果數量:", allUsers.length);
  if (allUsers.length > 0) {
    console.log(
      "is_active 值:",
      allUsers[0].is_active,
      "類型:",
      typeof allUsers[0].is_active
    );
  }

  await connection.end();
}

testLogin().catch(console.error);
