import bcrypt from "bcryptjs";
import { query, initializeDatabase } from "./src/config/database.config.js";

async function resetAdminPassword() {
  console.log("=== 重置管理員密碼 ===");

  try {
    // 初始化資料庫
    await initializeDatabase();

    // 新密碼
    const newPassword = "admin123";

    // 生成密碼哈希
    console.log("正在生成密碼哈希...");
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    console.log("新密碼:", newPassword);
    console.log("新哈希:", passwordHash);

    // 更新資料庫
    console.log("正在更新資料庫...");
    const result = await query(
      "UPDATE users SET password_hash = ? WHERE username = 'admin'",
      [passwordHash]
    );

    console.log("✅ 密碼更新成功，影響行數:", result.rows.affectedRows);

    // 驗證新密碼
    console.log("正在驗證新密碼...");
    const isValid = await bcrypt.compare(newPassword, passwordHash);
    console.log("密碼驗證結果:", isValid ? "✅ 成功" : "❌ 失敗");
  } catch (error) {
    console.error("❌ 重置密碼失敗:", error);
  }

  console.log("=== 重置完成 ===");
  process.exit();
}

resetAdminPassword();
