const mysql = require("mysql2/promise");

async function testModelsAPI() {
  try {
    // 連接數據庫
    const connection = await mysql.createConnection({
      host: "localhost",
      port: 3306,
      user: "root",
      password: "MyPwd@1234",
      database: "sfda_nexus",
    });

    console.log("✅ 數據庫連接成功");

    // 查詢模型數據
    const [rows] = await connection.execute(`
      SELECT 
        id,
        name as model_name,
        display_name,
        model_type as provider,
        is_active
      FROM ai_models 
      ORDER BY model_type, display_name
    `);

    console.log("📊 數據庫中的模型數據:");
    console.table(rows);

    // 模擬前端 API 響應格式
    const apiResponse = {
      success: true,
      data: {
        data: rows,
      },
    };

    console.log("\n🔄 模擬 API 響應格式:");
    console.log(JSON.stringify(apiResponse, null, 2));

    // 模擬前端選擇器選項
    const selectorOptions = rows.map((model) => ({
      label: model.display_name || model.model_name || model.name,
      value: model.id,
      disabled: !model.is_active,
    }));

    console.log("\n🎯 前端選擇器選項:");
    console.table(selectorOptions);

    await connection.end();
    console.log("✅ 測試完成");
  } catch (error) {
    console.error("❌ 測試失敗:", error);
  }
}

testModelsAPI();
