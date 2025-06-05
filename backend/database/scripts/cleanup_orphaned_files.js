/**
 * 清理孤立文件記錄腳本
 * 刪除資料庫中物理文件不存在的記錄
 */

import { query, initializeDatabase } from "../../src/config/database.config.js";
import fs from "fs/promises";

console.log("🧹 開始清理孤立文件記錄...\n");

async function cleanupOrphanedFiles() {
  try {
    // 初始化資料庫連接
    console.log("初始化資料庫連接...");
    await initializeDatabase();
    console.log("✅ 資料庫連接成功\n");

    // 1. 獲取所有文件記錄
    console.log("=== 1. 獲取所有文件記錄 ===");
    const { rows: allFiles } = await query(`
      SELECT id, filename, stored_filename, file_path
      FROM files 
      ORDER BY created_at DESC
    `);

    console.log(`找到 ${allFiles.length} 個文件記錄`);

    // 2. 檢查物理文件存在性
    console.log("\n=== 2. 檢查物理文件存在性 ===");
    const orphanedFiles = [];
    const validFiles = [];

    for (const file of allFiles) {
      try {
        await fs.stat(file.file_path);
        validFiles.push(file);
        console.log(`✅ ${file.filename} - 文件存在`);
      } catch (error) {
        orphanedFiles.push(file);
        console.log(`❌ ${file.filename} - 文件不存在`);
      }
    }

    console.log(
      `\n統計: 有效文件 ${validFiles.length} 個, 孤立記錄 ${orphanedFiles.length} 個`
    );

    // 3. 清理孤立記錄
    if (orphanedFiles.length > 0) {
      console.log("\n=== 3. 清理孤立記錄 ===");
      console.log("準備刪除以下孤立記錄:");
      orphanedFiles.forEach((file) => {
        console.log(`  - ${file.filename} (ID: ${file.id})`);
      });

      // 刪除孤立記錄
      const orphanedIds = orphanedFiles.map((f) => f.id);
      const placeholders = orphanedIds.map(() => "?").join(",");

      await query(
        `DELETE FROM files WHERE id IN (${placeholders})`,
        orphanedIds
      );

      console.log(`✅ 已刪除 ${orphanedFiles.length} 個孤立記錄`);
    } else {
      console.log("\n✅ 沒有發現孤立記錄");
    }

    // 4. 清理訊息中的無效附件引用
    console.log("\n=== 4. 檢查訊息中的附件引用 ===");
    const { rows: messagesWithAttachments } = await query(`
      SELECT id, attachments 
      FROM messages 
      WHERE attachments IS NOT NULL 
      AND JSON_LENGTH(attachments) > 0
    `);

    let updatedMessages = 0;

    for (const message of messagesWithAttachments) {
      try {
        let attachments;
        if (typeof message.attachments === "string") {
          attachments = JSON.parse(message.attachments);
        } else {
          attachments = message.attachments;
        }

        // 檢查附件引用是否有效
        const validAttachments = [];
        const invalidAttachments = [];

        for (const attachment of attachments) {
          const fileExists = validFiles.some((f) => f.id === attachment.id);
          if (fileExists) {
            validAttachments.push(attachment);
          } else {
            invalidAttachments.push(attachment);
          }
        }

        // 如果有無效附件，更新訊息
        if (invalidAttachments.length > 0) {
          console.log(
            `訊息 ${message.id}: 移除 ${invalidAttachments.length} 個無效附件引用`
          );

          const newAttachments =
            validAttachments.length > 0
              ? JSON.stringify(validAttachments)
              : null;
          await query("UPDATE messages SET attachments = ? WHERE id = ?", [
            newAttachments,
            message.id,
          ]);
          updatedMessages++;
        }
      } catch (error) {
        console.log(`⚠️  處理訊息 ${message.id} 的附件時出錯:`, error.message);
      }
    }

    if (updatedMessages > 0) {
      console.log(`✅ 已更新 ${updatedMessages} 個訊息的附件引用`);
    } else {
      console.log("✅ 所有訊息的附件引用都是有效的");
    }

    console.log("\n🎉 清理完成！");
    console.log("現在可以重新測試文件上傳功能。");
  } catch (error) {
    console.error("❌ 清理失敗:", error.message);
    console.error(error.stack);
  }
}

async function main() {
  await cleanupOrphanedFiles();
  process.exit(0);
}

main();
