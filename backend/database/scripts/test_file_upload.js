/**
 * 文件上傳測試腳本
 * 測試文件上傳流程和存儲位置
 */

import { query, initializeDatabase } from "../../src/config/database.config.js";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("🔍 開始文件上傳測試...\n");

async function testFileUpload() {
  try {
    // 初始化資料庫連接
    console.log("初始化資料庫連接...");
    await initializeDatabase();
    console.log("✅ 資料庫連接成功\n");

    // 1. 檢查上傳目錄
    console.log("=== 1. 檢查上傳目錄結構 ===");
    const uploadsDir = path.resolve(__dirname, "../../uploads");
    const attachmentsDir = path.resolve(uploadsDir, "attachments");

    console.log("主上傳目錄:", uploadsDir);
    console.log("附件目錄:", attachmentsDir);

    try {
      const uploadsStat = await fs.stat(uploadsDir);
      console.log("✅ uploads 目錄存在");

      const attachmentsStat = await fs.stat(attachmentsDir);
      console.log("✅ attachments 目錄存在");
    } catch (error) {
      console.log("❌ 目錄檢查失敗:", error.message);

      // 創建目錄
      console.log("嘗試創建目錄...");
      await fs.mkdir(attachmentsDir, { recursive: true });
      console.log("✅ 目錄創建成功");
    }

    // 2. 檢查資料庫中的文件記錄
    console.log("\n=== 2. 檢查資料庫中的文件記錄 ===");
    const { rows: allFiles } = await query(`
      SELECT id, filename, stored_filename, file_path, file_size, mime_type, created_at
      FROM files 
      ORDER BY created_at DESC 
      LIMIT 10
    `);

    if (allFiles.length === 0) {
      console.log("❌ 資料庫中沒有找到任何文件記錄");
      return;
    }

    console.log(`✅ 找到 ${allFiles.length} 個文件記錄:`);
    allFiles.forEach((file, index) => {
      console.log(`  ${index + 1}. ${file.filename}`);
      console.log(`     存儲文件名: ${file.stored_filename}`);
      console.log(`     文件路徑: ${file.file_path}`);
      console.log(`     文件大小: ${file.file_size} bytes`);
      console.log(`     創建時間: ${file.created_at}`);
    });

    // 3. 檢查文件實際存在性
    console.log("\n=== 3. 檢查文件實際存在性 ===");
    for (const file of allFiles) {
      try {
        const stat = await fs.stat(file.file_path);
        console.log(`✅ ${file.filename} - 文件存在 (${stat.size} bytes)`);

        if (stat.size !== file.file_size) {
          console.log(
            `⚠️  文件大小不匹配: 資料庫=${file.file_size}, 實際=${stat.size}`
          );
        }
      } catch (error) {
        console.log(`❌ ${file.filename} - 文件不存在: ${error.message}`);
        console.log(`   預期路徑: ${file.file_path}`);

        // 嘗試在其他位置尋找文件
        const possiblePaths = [
          path.join(attachmentsDir, file.stored_filename),
          path.join(uploadsDir, file.stored_filename),
          path.join(__dirname, "../../uploads", file.stored_filename),
        ];

        for (const possiblePath of possiblePaths) {
          try {
            await fs.stat(possiblePath);
            console.log(`   🔍 找到文件在: ${possiblePath}`);
            break;
          } catch {}
        }
      }
    }

    // 4. 檢查 attachments 目錄內容
    console.log("\n=== 4. 檢查 attachments 目錄實際內容 ===");
    try {
      const attachmentFiles = await fs.readdir(attachmentsDir);
      console.log(`attachments 目錄中有 ${attachmentFiles.length} 個文件:`);

      for (const filename of attachmentFiles) {
        const filePath = path.join(attachmentsDir, filename);
        const stat = await fs.stat(filePath);
        console.log(`  - ${filename} (${stat.size} bytes)`);
      }
    } catch (error) {
      console.log("❌ 無法讀取 attachments 目錄:", error.message);
    }

    // 5. 提供診斷建議
    console.log("\n=== 5. 診斷建議 ===");
    console.log("如果文件上傳有問題，請檢查:");
    console.log("1. 確保 uploads/attachments 目錄有寫入權限");
    console.log("2. 檢查磁碟空間是否足夠");
    console.log("3. 確認前端正確調用上傳 API");
    console.log("4. 檢查後端日誌中的錯誤信息");
    console.log("\n可以嘗試:");
    console.log("- 重新啟動後端服務");
    console.log("- 清空 uploads/attachments 目錄");
    console.log("- 檢查 FileModel.generateStoredFilename 方法");
  } catch (error) {
    console.error("❌ 測試失敗:", error.message);
    console.error(error.stack);
  }
}

async function main() {
  await testFileUpload();
  process.exit(0);
}

main();
