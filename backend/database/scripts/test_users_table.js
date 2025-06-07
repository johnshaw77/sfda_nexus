import { query, initializeDatabase } from "../../src/config/database.config.js";

console.log("🔍 檢查用戶表結構和數據...\n");

async function testUsersTable() {
  try {
    // 初始化數據庫連接
    await initializeDatabase();
    // 1. 檢查表是否存在
    console.log("1. 檢查 users 表是否存在...");
    const tableCheckResult = await query(`
      SELECT COUNT(*) as table_exists 
      FROM information_schema.tables 
      WHERE table_schema = 'sfda_nexus' AND table_name = 'users'
    `);

    console.log("表存在檢查結果:", tableCheckResult);

    if (tableCheckResult.rows && tableCheckResult.rows[0]?.table_exists > 0) {
      console.log("✅ users 表存在");

      // 2. 檢查表結構
      console.log("\n2. 檢查表結構...");
      const structureResult = await query("DESCRIBE users");
      console.log("表結構:", structureResult.rows);

      // 3. 檢查數據數量
      console.log("\n3. 檢查數據數量...");
      const countResult = await query("SELECT COUNT(*) as total FROM users");
      console.log("用戶總數:", countResult.rows[0]?.total || 0);

      // 4. 查看前幾條數據
      if (countResult.rows[0]?.total > 0) {
        console.log("\n4. 查看前3條用戶數據...");
        const usersResult = await query(
          "SELECT id, username, email, role, is_active FROM users LIMIT 3"
        );
        console.log("用戶數據:", usersResult.rows);
      }
    } else {
      console.log("❌ users 表不存在");
    }
  } catch (error) {
    console.error("❌ 測試失敗:", error);
  }
}

testUsersTable();
