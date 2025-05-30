import { initializeDatabase, query } from "./src/config/database.config.js";
import { UserModel } from "./src/models/User.model.js";
import bcrypt from "bcryptjs";

async function testFullLogin() {
  try {
    // 初始化資料庫
    await initializeDatabase();
    console.log("✅ 資料庫初始化成功");

    const identifier = "admin";
    const password = "admin123";

    console.log("\n🔍 開始完整登入測試...");
    console.log("用戶名:", identifier);
    console.log("密碼:", password);

    // 1. 根據用戶名查找用戶
    console.log("\n1. 根據用戶名查找用戶...");
    let user = await UserModel.findByUsername(identifier);
    console.log("findByUsername 結果:", user ? "找到用戶" : "未找到用戶");

    if (!user) {
      console.log("2. 根據郵箱查找用戶...");
      user = await UserModel.findByEmail(identifier);
      console.log("findByEmail 結果:", user ? "找到用戶" : "未找到用戶");
    }

    if (!user) {
      console.log("❌ 用戶不存在");
      return;
    }

    console.log("✅ 找到用戶:", {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      is_active: user.is_active,
    });

    // 2. 驗證密碼
    console.log("\n3. 驗證密碼...");
    const isPasswordValid = await UserModel.verifyPassword(
      password,
      user.password_hash
    );
    console.log("密碼驗證結果:", isPasswordValid);

    if (!isPasswordValid) {
      console.log("❌ 密碼錯誤");
      return;
    }

    // 3. 檢查用戶狀態
    console.log("\n4. 檢查用戶狀態...");
    console.log("is_active:", user.is_active, "類型:", typeof user.is_active);

    if (!user.is_active) {
      console.log("❌ 用戶已禁用");
      return;
    }

    console.log("✅ 登入驗證成功！");
  } catch (error) {
    console.error("❌ 測試失敗:", error.message);
    console.error("錯誤堆疊:", error.stack);
  }
}

testFullLogin();
