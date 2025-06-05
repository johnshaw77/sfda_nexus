/**
 * 多模態功能測試腳本
 * 測試圖片附件的處理和AI多模態回應
 */

import { query, initializeDatabase } from "../../src/config/database.config.js";
import { AIService } from "../../src/services/ai.service.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("🔍 開始多模態功能測試...\n");

async function testMultimodalCapabilities() {
  try {
    // 初始化資料庫連接
    console.log("初始化資料庫連接...");
    await initializeDatabase();
    console.log("✅ 資料庫連接成功\n");

    // 1. 檢查資料庫中的附件
    console.log("=== 1. 檢查資料庫中的圖片附件 ===");
    const { rows: files } = await query(`
      SELECT id, filename, stored_filename, file_path, mime_type, file_size
      FROM files 
      WHERE mime_type LIKE 'image/%' 
      ORDER BY created_at DESC 
      LIMIT 5
    `);

    if (files.length === 0) {
      console.log("❌ 資料庫中沒有找到圖片附件");
      console.log("請先上傳一些圖片到聊天中，然後再運行此測試");
      return;
    }

    console.log(`✅ 找到 ${files.length} 個圖片附件:`);
    files.forEach((file, index) => {
      console.log(
        `  ${index + 1}. ${file.filename} (${file.mime_type}, ${file.file_size} bytes)`
      );
      console.log(`     路徑: ${file.file_path}`);
    });

    // 2. 檢查訊息中的附件關聯
    console.log("\n=== 2. 檢查訊息中的附件關聯 ===");
    const { rows: messagesWithAttachments } = await query(`
      SELECT m.id, m.content, m.attachments, m.role, c.title
      FROM messages m
      LEFT JOIN conversations c ON m.conversation_id = c.id
      WHERE m.attachments IS NOT NULL 
      AND JSON_LENGTH(m.attachments) > 0
      ORDER BY m.created_at DESC
      LIMIT 5
    `);

    if (messagesWithAttachments.length === 0) {
      console.log("❌ 沒有找到包含附件的訊息");
      return;
    }

    console.log(`✅ 找到 ${messagesWithAttachments.length} 條包含附件的訊息:`);
    messagesWithAttachments.forEach((msg, index) => {
      console.log(
        `  ${index + 1}. 訊息 ${msg.id} (${msg.role}): "${msg.content.substring(0, 50)}..."`
      );
      console.log(`     對話: ${msg.title}`);
      console.log(`     附件原始數據類型: ${typeof msg.attachments}`);
      console.log(`     附件原始數據: ${JSON.stringify(msg.attachments)}`);

      try {
        let attachments;
        if (typeof msg.attachments === "string") {
          attachments = JSON.parse(msg.attachments);
        } else if (Array.isArray(msg.attachments)) {
          attachments = msg.attachments;
        } else {
          attachments = [msg.attachments];
        }

        console.log(`     附件數量: ${attachments.length}`);
        attachments.forEach((att, attIndex) => {
          console.log(
            `       附件 ${attIndex + 1}: ${att.filename} (${att.mime_type})`
          );
        });
      } catch (parseError) {
        console.log(`     ❌ 附件解析錯誤: ${parseError.message}`);
      }
    });

    // 3. 測試圖片讀取和base64轉換
    console.log("\n=== 3. 測試圖片讀取和base64轉換 ===");
    const testFile = files[0];
    try {
      const fs = await import("fs/promises");
      const fileBuffer = await fs.readFile(testFile.file_path);
      const base64Image = fileBuffer.toString("base64");

      console.log(`✅ 圖片讀取成功: ${testFile.filename}`);
      console.log(`   原始大小: ${testFile.file_size} bytes`);
      console.log(`   Base64長度: ${base64Image.length} 字符`);
      console.log(`   Base64預覽: ${base64Image.substring(0, 50)}...`);

      // 4. 測試多模態消息格式
      console.log("\n=== 4. 測試多模態消息格式 ===");

      // Ollama 格式
      const ollamaMessage = {
        role: "user",
        content: [
          {
            type: "text",
            text: "請描述這張圖片的內容",
          },
          {
            type: "image_url",
            image_url: `data:${testFile.mime_type};base64,${base64Image}`,
          },
        ],
      };

      console.log("Ollama 多模態格式:");
      console.log(`  角色: ${ollamaMessage.role}`);
      console.log(`  內容部分數量: ${ollamaMessage.content.length}`);
      console.log(`  文字部分: "${ollamaMessage.content[0].text}"`);
      console.log(
        `  圖片部分: ${ollamaMessage.content[1].image_url.substring(0, 50)}...`
      );

      // Gemini 格式
      const geminiMessage = {
        role: "user",
        content: [
          {
            type: "text",
            text: "請描述這張圖片的內容",
          },
          {
            type: "image",
            source: {
              type: "base64",
              media_type: testFile.mime_type,
              data: base64Image,
            },
          },
        ],
      };

      console.log("\nGemini 多模態格式:");
      console.log(`  角色: ${geminiMessage.role}`);
      console.log(`  內容部分數量: ${geminiMessage.content.length}`);
      console.log(`  文字部分: "${geminiMessage.content[0].text}"`);
      console.log(`  圖片部分: ${geminiMessage.content[1].source.media_type}`);

      // 5. 測試可用模型
      console.log("\n=== 5. 檢查可用的多模態模型 ===");
      try {
        const availableModels = await AIService.getAvailableModels();

        console.log("Ollama 模型:");
        if (availableModels.ollama && availableModels.ollama.length > 0) {
          availableModels.ollama.forEach((model, index) => {
            console.log(`  ${index + 1}. ${model.name}`);
          });
        } else {
          console.log("  ❌ 沒有找到 Ollama 模型");
        }

        console.log("\nGemini 模型:");
        if (availableModels.gemini && availableModels.gemini.length > 0) {
          availableModels.gemini.forEach((model, index) => {
            console.log(
              `  ${index + 1}. ${model.name} - ${model.display_name}`
            );
          });
        } else {
          console.log("  ❌ 沒有配置 Gemini 模型");
        }
      } catch (error) {
        console.log(`❌ 獲取模型列表失敗: ${error.message}`);
      }

      // 6. 提供調試建議
      console.log("\n=== 6. 調試建議 ===");
      console.log("✅ 多模態數據準備完成！");
      console.log("\n現在你可以:");
      console.log('1. 在聊天中上傳圖片並發送 "請解釋這張圖片"');
      console.log("2. 檢查後端控制台的詳細調試輸出");
      console.log(
        "3. 確認你使用的 Ollama 模型支持視覺輸入 (如 llava, qwen2-vl)"
      );
      console.log("4. 如果使用 Gemini，確保 API key 已正確配置");

      console.log("\n要檢查的關鍵日誌:");
      console.log('- "=== 處理消息附件 ===" - 確認附件被正確識別');
      console.log('- "=== 轉換為多模態格式 ===" - 確認格式轉換成功');
      console.log('- "=== OLLAMA 調用開始 ===" - 確認模型調用包含多模態');
      console.log('- "✅ AI 回應似乎包含對圖片的描述" - 確認AI處理了圖片');
    } catch (fileError) {
      console.log(`❌ 圖片讀取失敗: ${fileError.message}`);
      console.log("請檢查文件路徑是否正確");
    }
  } catch (error) {
    console.error("❌ 測試失敗:", error.message);
    console.error(error.stack);
  }
}

async function main() {
  await testMultimodalCapabilities();
  process.exit(0);
}

main();
