import { initializeDatabase } from "./src/config/database.config.js";
import { UserModel } from "./src/models/User.model.js";
import dotenv from "dotenv";

dotenv.config();

async function testAvatarUpdate() {
  try {
    // 初始化資料庫
    await initializeDatabase();
    console.log("✅ 資料庫初始化成功");

    // 查找管理員用戶
    const admin = await UserModel.findByUsername("admin");
    if (!admin) {
      console.log("❌ 管理員用戶不存在");
      return;
    }

    console.log("✅ 找到管理員用戶:", {
      id: admin.id,
      username: admin.username,
      avatar: admin.avatar ? "有頭像" : "無頭像",
    });

    // 模擬 base64 頭像數據（小圖片）
    const testAvatar =
      "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A";

    // 更新頭像
    console.log("🔄 更新管理員頭像...");
    const updatedUser = await UserModel.update(admin.id, {
      avatar: testAvatar,
    });

    console.log("✅ 頭像更新成功:", {
      id: updatedUser.id,
      username: updatedUser.username,
      avatar: updatedUser.avatar
        ? `有頭像 (${updatedUser.avatar.length} 字符)`
        : "無頭像",
    });

    // 驗證更新
    const verifyUser = await UserModel.findById(admin.id);
    console.log("🔍 驗證更新結果:", {
      id: verifyUser.id,
      username: verifyUser.username,
      avatar: verifyUser.avatar
        ? `有頭像 (${verifyUser.avatar.length} 字符)`
        : "無頭像",
    });

    if (verifyUser.avatar === testAvatar) {
      console.log("✅ 頭像更新驗證成功！");
    } else {
      console.log("❌ 頭像更新驗證失敗！");
    }
  } catch (error) {
    console.error("❌ 測試失敗:", error.message);
    console.error("錯誤堆疊:", error.stack);
  }
}

testAvatarUpdate();
