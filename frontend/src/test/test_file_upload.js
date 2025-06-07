/**
 * 測試檔案上傳功能
 */

import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import path from "path";

const API_BASE_URL = "http://localhost:3000";

// 測試用的認證 token
let authToken = "";

async function login() {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
      identifier: "admin",
      password: "admin123",
    });

    if (response.data.success) {
      authToken = response.data.data.access_token;
      console.log("✅ 登入成功");
      return true;
    } else {
      console.error("❌ 登入失敗:", response.data.message);
      return false;
    }
  } catch (error) {
    console.error("❌ 登入請求失敗:", error.message);
    return false;
  }
}

async function testFileUpload() {
  try {
    // 創建一個測試文件
    const testContent = "This is a test file for upload functionality.";
    const testFilePath = "./test_upload.txt";
    fs.writeFileSync(testFilePath, testContent);

    // 準備 FormData
    const formData = new FormData();
    formData.append("file", fs.createReadStream(testFilePath));

    const response = await axios.post(
      `${API_BASE_URL}/api/files/upload`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          ...formData.getHeaders(),
        },
      }
    );

    // 清理測試文件
    fs.unlinkSync(testFilePath);

    if (response.data.success) {
      console.log("✅ 檔案上傳成功");
      console.log("📄 檔案信息:", {
        id: response.data.data.id,
        filename: response.data.data.filename,
        file_size: response.data.data.file_size,
        mime_type: response.data.data.mime_type,
        file_type: response.data.data.file_type,
      });
      return response.data.data;
    } else {
      console.error("❌ 檔案上傳失敗:", response.data.message);
      return null;
    }
  } catch (error) {
    console.error(
      "❌ 檔案上傳請求失敗:",
      error.response?.data || error.message
    );
    return null;
  }
}

async function testGetFiles() {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/files`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    if (response.data.success) {
      console.log("✅ 獲取檔案列表成功");
      console.log("📋 檔案數量:", response.data.data.length);
      response.data.data.forEach((file, index) => {
        console.log(
          `  ${index + 1}. ${file.filename} (${file.file_size} bytes)`
        );
      });
      return response.data.data;
    } else {
      console.error("❌ 獲取檔案列表失敗:", response.data.message);
      return [];
    }
  } catch (error) {
    console.error(
      "❌ 獲取檔案列表請求失敗:",
      error.response?.data || error.message
    );
    return [];
  }
}

async function testDownloadFile(fileId, filename) {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/api/files/${fileId}/download`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        responseType: "stream",
      }
    );

    const downloadPath = `./downloaded_${filename}`;
    const writer = fs.createWriteStream(downloadPath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on("finish", () => {
        console.log("✅ 檔案下載成功:", downloadPath);
        // 清理下載的文件
        fs.unlinkSync(downloadPath);
        resolve();
      });
      writer.on("error", reject);
    });
  } catch (error) {
    console.error("❌ 檔案下載失敗:", error.response?.data || error.message);
  }
}

async function testDeleteFile(fileId) {
  try {
    const response = await axios.delete(`${API_BASE_URL}/api/files/${fileId}`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    if (response.data.success) {
      console.log("✅ 檔案刪除成功");
      return true;
    } else {
      console.error("❌ 檔案刪除失敗:", response.data.message);
      return false;
    }
  } catch (error) {
    console.error(
      "❌ 檔案刪除請求失敗:",
      error.response?.data || error.message
    );
    return false;
  }
}

async function runTests() {
  console.log("🚀 開始測試檔案上傳功能\n");

  // 1. 登入
  const loginSuccess = await login();
  if (!loginSuccess) {
    return;
  }

  // 2. 測試檔案上傳
  console.log("\n📤 測試檔案上傳...");
  const uploadedFile = await testFileUpload();
  if (!uploadedFile) {
    return;
  }

  // 3. 測試獲取檔案列表
  console.log("\n📋 測試獲取檔案列表...");
  await testGetFiles();

  // 4. 測試檔案下載
  console.log("\n📥 測試檔案下載...");
  await testDownloadFile(uploadedFile.id, uploadedFile.filename);

  // 5. 測試檔案刪除
  console.log("\n🗑️ 測試檔案刪除...");
  await testDeleteFile(uploadedFile.id);

  console.log("\n🎉 檔案上傳功能測試完成！");
}

runTests().catch(console.error);
