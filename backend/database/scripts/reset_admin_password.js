/**
 * 重置 admin 用戶密碼
 */

import bcryptjs from "bcryptjs";
import { initializeDatabase, query } from "../../src/config/database.config.js";

async function resetAdminPassword() {
  try {
    // 初始化資料庫連接
    await initializeDatabase();

    const newPassword = "admin123";
    const hashedPassword = await bcryptjs.hash(newPassword, 12);

    // 更新 admin 用戶密碼
    const result = await query(
      "UPDATE users SET password_hash = ? WHERE username = ? OR email = ?",
      [hashedPassword, "admin", "admin@sfda-nexus.com"]
    );

    if (result.affectedRows > 0) {
      console.log("✅ Admin 用戶密碼已重置為:", newPassword);
      console.log("🔐 可以使用以下任一方式登入:");
      console.log("   - 用戶名: admin");
      console.log("   - 郵箱: admin@sfda-nexus.com");
      console.log("   - 密碼:", newPassword);
    } else {
      console.log("❌ 未找到 admin 用戶");
    }

    process.exit(0);
  } catch (error) {
    console.error("💥 重置密碼失敗:", error);
    process.exit(1);
  }
}

resetAdminPassword();
