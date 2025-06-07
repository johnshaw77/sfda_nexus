/**
 * 清理重複的 MCP 服務腳本
 * 此腳本會：
 * 1. 識別重複的服務（相同名稱）
 * 2. 保留最新的服務記錄
 * 3. 刪除舊的重複記錄及其關聯的工具
 */

import {
  query,
  transaction,
  initializeDatabase,
} from "../../src/config/database.config.js";

async function cleanupDuplicateServices() {
  // 初始化資料庫連接
  await initializeDatabase();
  try {
    console.log("🧹 開始清理重複的 MCP 服務...");

    const result = await transaction(async (connection) => {
      // 1. 查找重複的服務
      const [duplicateGroups] = await connection.execute(`
        SELECT name, COUNT(*) as count, GROUP_CONCAT(id ORDER BY id DESC) as ids
        FROM mcp_services 
        WHERE is_deleted = 0 
        GROUP BY name 
        HAVING COUNT(*) > 1
      `);

      console.log(`📊 發現 ${duplicateGroups.length} 組重複服務`);

      let totalDeleted = 0;
      let totalToolsDeleted = 0;

      for (const group of duplicateGroups) {
        const ids = group.ids.split(",").map((id) => parseInt(id));
        const keepId = ids[0]; // 保留最新的（ID最大的）
        const deleteIds = ids.slice(1); // 刪除其他的

        console.log(`🔄 處理服務 "${group.name}"`);
        console.log(`   保留 ID: ${keepId}`);
        console.log(`   刪除 IDs: ${deleteIds.join(", ")}`);

        // 2. 刪除重複服務的工具
        for (const deleteId of deleteIds) {
          const [toolsResult] = await connection.execute(
            "DELETE FROM mcp_tools WHERE mcp_service_id = ?",
            [deleteId]
          );
          totalToolsDeleted += toolsResult.affectedRows;
          console.log(
            `   刪除服務 ${deleteId} 的 ${toolsResult.affectedRows} 個工具`
          );
        }

        // 3. 刪除重複的服務
        const [servicesResult] = await connection.execute(
          `DELETE FROM mcp_services WHERE id IN (${deleteIds.map(() => "?").join(",")})`,
          deleteIds
        );
        totalDeleted += servicesResult.affectedRows;
      }

      return {
        duplicateGroups: duplicateGroups.length,
        servicesDeleted: totalDeleted,
        toolsDeleted: totalToolsDeleted,
      };
    });

    console.log("✅ 清理完成！");
    console.log(`📈 統計結果：`);
    console.log(`   - 處理重複組數: ${result.duplicateGroups}`);
    console.log(`   - 刪除重複服務: ${result.servicesDeleted}`);
    console.log(`   - 刪除關聯工具: ${result.toolsDeleted}`);

    // 4. 顯示清理後的服務列表
    const remainingServices = await query(`
      SELECT id, name, description, created_at 
      FROM mcp_services 
      WHERE is_deleted = 0 
      ORDER BY name, id
    `);

    console.log("\n📋 清理後的服務列表：");
    remainingServices.forEach((service) => {
      console.log(`   ${service.id}: ${service.name} (${service.created_at})`);
    });
  } catch (error) {
    console.error("❌ 清理失敗:", error);
    throw error;
  }
}

// 執行清理
if (import.meta.url === `file://${process.argv[1]}`) {
  cleanupDuplicateServices()
    .then(() => {
      console.log("🎉 清理腳本執行完成");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 清理腳本執行失敗:", error);
      process.exit(1);
    });
}

export default cleanupDuplicateServices;
