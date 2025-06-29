#!/usr/bin/env node
/**
 * AI 模型配置測試腳本
 * 驗證環境變數配置是否正確讀取和模型是否存在
 */

import dotenv from "dotenv";
import { query, initializeDatabase } from "./src/config/database.config.js";

// 載入環境變數
dotenv.config();

// 初始化資料庫連接
await initializeDatabase();

console.log("=== AI 模型配置測試 ===\n");

// 1. 檢查環境變數配置
console.log("📋 環境變數配置:");
console.log(
  `PROMPT_OPTIMIZATION_MODEL_ID: ${process.env.PROMPT_OPTIMIZATION_MODEL_ID || "未設置 (默認: 46)"}`
);
console.log(
  `PROMPT_OPTIMIZATION_MODEL_NAME: ${process.env.PROMPT_OPTIMIZATION_MODEL_NAME || "未設置 (默認: qwen2.5:1.5b)"}`
);
console.log(
  `AI_SUMMARY_MODEL_ID: ${process.env.AI_SUMMARY_MODEL_ID || "未設置 (默認: 47)"}`
);
console.log(
  `AI_SUMMARY_MODEL_NAME: ${process.env.AI_SUMMARY_MODEL_NAME || "未設置 (默認: qwen2.5:14b)"}`
);
console.log("");

async function testModelConfig() {
  try {
    // 2. 檢查提示詞優化模型
    console.log("🤖 提示詞優化模型檢查:");
    const promptModelId = process.env.PROMPT_OPTIMIZATION_MODEL_ID || 46;
    const promptModelName =
      process.env.PROMPT_OPTIMIZATION_MODEL_NAME || "qwen2.5:1.5b";

    // 按 ID 查找
    const { rows: promptModelById } = await query(
      "SELECT * FROM ai_models WHERE id = ? AND is_active = TRUE",
      [promptModelId]
    );

    if (promptModelById.length > 0) {
      console.log(
        `✅ 找到模型 (ID: ${promptModelId}): ${promptModelById[0].display_name || promptModelById[0].model_id}`
      );
      console.log(`   - 提供商: ${promptModelById[0].model_type}`);
      console.log(`   - 端點: ${promptModelById[0].endpoint_url || "默認"}`);
    } else {
      console.log(`❌ 未找到模型 ID: ${promptModelId}`);

      // 嘗試按名稱查找
      const { rows: promptModelByName } = await query(
        "SELECT * FROM ai_models WHERE model_id = ? AND is_active = TRUE",
        [promptModelName]
      );

      if (promptModelByName.length > 0) {
        console.log(
          `✅ 找到備用模型 (名稱: ${promptModelName}): ${promptModelByName[0].display_name || promptModelByName[0].model_id}`
        );
        console.log(`   - ID: ${promptModelByName[0].id}`);
        console.log(`   - 提供商: ${promptModelByName[0].model_type}`);
      } else {
        console.log(`❌ 也未找到模型名稱: ${promptModelName}`);
      }
    }

    console.log("");

    // 3. 檢查 AI 總結模型
    console.log("🧠 AI 總結模型檢查:");
    const summaryModelId = process.env.AI_SUMMARY_MODEL_ID || 47;
    const summaryModelName = process.env.AI_SUMMARY_MODEL_NAME || "qwen2.5:14b";

    // 按 ID 查找
    const { rows: summaryModelById } = await query(
      "SELECT * FROM ai_models WHERE id = ? AND is_active = TRUE",
      [summaryModelId]
    );

    if (summaryModelById.length > 0) {
      console.log(
        `✅ 找到模型 (ID: ${summaryModelId}): ${summaryModelById[0].display_name || summaryModelById[0].model_id}`
      );
      console.log(`   - 提供商: ${summaryModelById[0].model_type}`);
      console.log(`   - 端點: ${summaryModelById[0].endpoint_url || "默認"}`);
    } else {
      console.log(`❌ 未找到模型 ID: ${summaryModelId}`);

      // 嘗試按名稱查找
      const { rows: summaryModelByName } = await query(
        "SELECT * FROM ai_models WHERE model_id = ? AND is_active = TRUE",
        [summaryModelName]
      );

      if (summaryModelByName.length > 0) {
        console.log(
          `✅ 找到備用模型 (名稱: ${summaryModelName}): ${summaryModelByName[0].display_name || summaryModelByName[0].model_id}`
        );
        console.log(`   - ID: ${summaryModelByName[0].id}`);
        console.log(`   - 提供商: ${summaryModelByName[0].model_type}`);
      } else {
        console.log(`❌ 也未找到模型名稱: ${summaryModelName}`);
      }
    }

    console.log("");

    // 4. 列出所有可用的 AI 模型
    console.log("📊 所有可用的 AI 模型:");
    const { rows: allModels } = await query(
      "SELECT id, model_id, display_name, model_type, is_active FROM ai_models ORDER BY id"
    );

    if (allModels.length > 0) {
      console.log("ID | 模型名稱 | 顯示名稱 | 提供商 | 狀態");
      console.log("---|----------|----------|--------|------");
      allModels.forEach((model) => {
        const status = model.is_active ? "✅" : "❌";
        console.log(
          `${model.id.toString().padEnd(2)} | ${(model.model_id || "").padEnd(15)} | ${(model.display_name || "").padEnd(15)} | ${(model.model_type || "").padEnd(8)} | ${status}`
        );
      });
    } else {
      console.log("❌ 未找到任何 AI 模型");
    }

    console.log("\n=== 測試完成 ===");
  } catch (error) {
    console.error("❌ 測試失敗:", error.message);
    console.error("錯誤詳情:", error);
  } finally {
    process.exit(0);
  }
}

// 執行測試
testModelConfig();
