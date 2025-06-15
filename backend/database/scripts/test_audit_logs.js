/**
 * 測試審計日誌功能
 * 驗證審計日誌的創建、查詢和篩選功能
 */

import mysql from "mysql2/promise";
import dotenv from "dotenv";

// 載入環境變數
dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "MyPwd@1234",
  database: process.env.DB_NAME || "sfda_nexus",
  charset: "utf8mb4",
};

async function testAuditLogs() {
  let connection;

  try {
    console.log("🔗 連接到資料庫...");
    connection = await mysql.createConnection(dbConfig);

    // 1. 測試插入審計日誌
    console.log("\n📝 測試插入審計日誌...");

    const testLogs = [
      {
        user_id: 1,
        action: "login",
        resource_type: "user",
        resource_id: 1,
        details: JSON.stringify({
          ip_address: "192.168.1.100",
          user_agent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          login_method: "password",
        }),
        ip_address: "192.168.1.100",
        user_agent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      {
        user_id: 1,
        action: "create",
        resource_type: "model",
        resource_id: 5,
        details: JSON.stringify({
          model_name: "test-model",
          provider: "ollama",
          created_by: "admin",
        }),
        ip_address: "192.168.1.100",
        user_agent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      {
        user_id: 1,
        action: "API_ACCESS",
        resource_type: "api",
        details: JSON.stringify({
          method: "GET",
          path: "/api/models",
          status_code: 200,
          response_time: 150,
        }),
        ip_address: "192.168.1.100",
        user_agent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    ];

    for (const log of testLogs) {
      const [result] = await connection.execute(
        `INSERT INTO audit_logs (
          user_id, action, resource_type, resource_id, 
          details, ip_address, user_agent, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          log.user_id,
          log.action,
          log.resource_type,
          log.resource_id || null,
          log.details,
          log.ip_address,
          log.user_agent,
        ]
      );
      console.log(`✅ 插入審計日誌: ${log.action} (ID: ${result.insertId})`);
    }

    // 2. 測試查詢審計日誌
    console.log("\n📊 測試查詢審計日誌...");

    const [logs] = await connection.execute(`
      SELECT 
        al.id, al.user_id, al.action, al.details, 
        al.ip_address, al.user_agent, al.created_at,
        u.username, u.email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.created_at DESC
      LIMIT 10
    `);

    console.log(`📋 找到 ${logs.length} 條審計日誌記錄:`);
    logs.forEach((log, index) => {
      console.log(
        `${index + 1}. [${log.action}] ${log.username || "系統"} - ${log.created_at}`
      );
      if (log.details) {
        try {
          const details = JSON.parse(log.details);
          console.log(`   詳情: ${JSON.stringify(details, null, 2)}`);
        } catch (e) {
          console.log(`   詳情: ${log.details}`);
        }
      }
    });

    // 3. 測試按操作類型篩選
    console.log("\n🔍 測試按操作類型篩選...");

    const [loginLogs] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM audit_logs 
      WHERE action = 'login'
    `);
    console.log(`✅ 登入操作記錄: ${loginLogs[0].count} 條`);

    const [apiLogs] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM audit_logs 
      WHERE action = 'API_ACCESS'
    `);
    console.log(`✅ API 訪問記錄: ${apiLogs[0].count} 條`);

    // 4. 測試按用戶篩選
    console.log("\n👤 測試按用戶篩選...");

    const [userLogs] = await connection.execute(`
      SELECT 
        u.username,
        COUNT(al.id) as log_count,
        MAX(al.created_at) as last_activity
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.user_id IS NOT NULL
      GROUP BY al.user_id, u.username
      ORDER BY log_count DESC
    `);

    console.log("📊 用戶活動統計:");
    userLogs.forEach((user) => {
      console.log(
        `  ${user.username}: ${user.log_count} 次操作，最後活動: ${user.last_activity}`
      );
    });

    // 5. 測試按時間範圍篩選
    console.log("\n📅 測試按時間範圍篩選...");

    const today = new Date().toISOString().split("T")[0];
    const [todayLogs] = await connection.execute(
      `
      SELECT COUNT(*) as count
      FROM audit_logs 
      WHERE DATE(created_at) = ?
    `,
      [today]
    );
    console.log(`✅ 今日操作記錄: ${todayLogs[0].count} 條`);

    // 6. 測試分頁查詢
    console.log("\n📄 測試分頁查詢...");

    const page = 1;
    const limit = 5;
    const offset = (page - 1) * limit;

    const [pagedLogs] = await connection.execute(
      `SELECT 
        al.id, al.action, al.created_at,
        u.username
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.created_at DESC
      LIMIT ${limit} OFFSET ${offset}`
    );

    console.log(`📋 分頁查詢結果 (第 ${page} 頁，每頁 ${limit} 條):`);
    pagedLogs.forEach((log, index) => {
      console.log(
        `  ${index + 1}. [${log.action}] ${log.username || "系統"} - ${log.created_at}`
      );
    });

    // 7. 測試統計查詢
    console.log("\n📈 測試統計查詢...");

    const [stats] = await connection.execute(`
      SELECT 
        action,
        COUNT(*) as count,
        DATE(created_at) as date
      FROM audit_logs 
      WHERE DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      GROUP BY action, DATE(created_at)
      ORDER BY date DESC, count DESC
    `);

    console.log("📊 最近 7 天操作統計:");
    const groupedStats = {};
    stats.forEach((stat) => {
      if (!groupedStats[stat.date]) {
        groupedStats[stat.date] = {};
      }
      groupedStats[stat.date][stat.action] = stat.count;
    });

    Object.entries(groupedStats).forEach(([date, actions]) => {
      console.log(`  ${date}:`);
      Object.entries(actions).forEach(([action, count]) => {
        console.log(`    ${action}: ${count} 次`);
      });
    });

    console.log("\n✅ 審計日誌功能測試完成！");
  } catch (error) {
    console.error("❌ 測試失敗:", error);

    if (error.code === "ER_NO_SUCH_TABLE") {
      console.log("💡 提示: audit_logs 表不存在，請先執行資料庫初始化");
    } else if (error.code === "ECONNREFUSED") {
      console.log("💡 提示: 無法連接到資料庫，請檢查 MySQL 服務是否啟動");
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log("🔌 資料庫連接已關閉");
    }
  }
}

// 執行測試
testAuditLogs();
