import bcrypt from "bcryptjs";
import { query, initializeDatabase } from "./src/config/database.config.js";

async function testLogin() {
  console.log("=== 登入測試開始 ===");

  try {
    // 初始化資料庫
    console.log("1. 初始化資料庫連接...");
    await initializeDatabase();

    // 測試資料庫連接
    console.log("2. 測試資料庫連接...");
    const { rows } = await query("SELECT 1 as test");
    console.log("✅ 資料庫連接正常");

    // 查找用戶
    console.log("\n3. 查找用戶...");
    const userResult = await query(
      "SELECT * FROM users WHERE username = ? AND is_active = 1",
      ["admin"]
    );

    if (userResult.rows.length === 0) {
      console.log("❌ 用戶不存在或未啟用");
      return;
    }

    const user = userResult.rows[0];
    console.log("✅ 找到用戶:", {
      id: user.id,
      username: user.username,
      email: user.email,
      is_active: user.is_active,
    });

    // 測試密碼驗證
    console.log("\n4. 測試密碼驗證...");
    const testPassword = "admin123"; // 測試密碼
    console.log("測試密碼:", testPassword);
    console.log("儲存的哈希:", user.password_hash);

    const isValid = await bcrypt.compare(testPassword, user.password_hash);
    console.log("密碼驗證結果:", isValid);

    if (isValid) {
      console.log("✅ 密碼驗證成功");
    } else {
      console.log("❌ 密碼驗證失敗");

      // 測試其他常見密碼
      const commonPasswords = ["password", "123456", "admin", "MyPwd@1234"];
      console.log("\n5. 測試常見密碼...");

      for (const pwd of commonPasswords) {
        const result = await bcrypt.compare(pwd, user.password_hash);
        console.log(`密碼 "${pwd}": ${result ? "✅ 正確" : "❌ 錯誤"}`);
        if (result) break;
      }
    }
  } catch (error) {
    console.error("❌ 測試過程中發生錯誤:", error);
  }

  console.log("\n=== 登入測試結束 ===");
  process.exit();
}

testLogin();
