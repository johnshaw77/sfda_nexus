/**
 * 檔案上傳錯誤處理測試腳本
 * 測試各種檔案上傳錯誤情況，確保不會導致應用程式崩潰
 */

import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// API 設定
const API_BASE_URL = 'http://localhost:3000/api';
const TEST_USER = {
  identifier: 'admin',
  password: 'admin123'
};

// 創建測試用檔案
const createTestFiles = () => {
  const testDir = path.join(__dirname, '../scripts/test_data');
  
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  // 創建一個大文件 (超過 10MB)
  const largeBuf = Buffer.alloc(11 * 1024 * 1024); // 11MB
  fs.writeFileSync(path.join(testDir, 'large_file.txt'), largeBuf);

  // 創建一個正常大小的文件
  const normalContent = 'This is a test file for upload testing.';
  fs.writeFileSync(path.join(testDir, 'normal_file.txt'), normalContent);

  // 創建一個中文檔案
  const chineseContent = '這是一個測試中文檔案上傳的檔案。包含特殊字符：！@#$%^&*()';
  fs.writeFileSync(path.join(testDir, '測試檔案.txt'), chineseContent);

  console.log('✅ 測試檔案創建完成');
  return {
    largeFile: path.join(testDir, 'large_file.txt'),
    normalFile: path.join(testDir, 'normal_file.txt'),
    chineseFile: path.join(testDir, '測試檔案.txt')
  };
};

// 獲取認證 token
const authenticate = async () => {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, TEST_USER);
    return response.data.data.access_token;
  } catch (error) {
    console.error('❌ 認證失敗:', error.response?.data || error.message);
    throw error;
  }
};

// 測試單檔案上傳
const testSingleFileUpload = async (token, filePath, expectedToFail = false) => {
  const fileName = path.basename(filePath);
  console.log(`\n📤 測試上傳檔案: ${fileName}`);
  
  try {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));

    const response = await axios.post(`${API_BASE_URL}/files/upload`, formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${token}`
      }
    });

    if (expectedToFail) {
      console.log('⚠️  預期失敗但成功了:', response.data);
    } else {
      console.log('✅ 檔案上傳成功:', response.data.message);
    }
    
    return { success: true, data: response.data };
  } catch (error) {
    if (expectedToFail) {
      console.log('✅ 預期的失敗:', error.response?.data?.message || error.message);
      return { success: false, error: error.response?.data };
    } else {
      console.log('❌ 檔案上傳失敗:', error.response?.data?.message || error.message);
      return { success: false, error: error.response?.data || error.message };
    }
  }
};

// 測試多檔案上傳
const testMultipleFileUpload = async (token, filePaths) => {
  console.log('\n📤 測試多檔案上傳');
  
  try {
    const formData = new FormData();
    
    filePaths.forEach(filePath => {
      formData.append('files', fs.createReadStream(filePath));
    });

    const response = await axios.post(`${API_BASE_URL}/files/upload-multiple`, formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('✅ 多檔案上傳結果:', response.data.message);
    if (response.data.data.errors?.length > 0) {
      console.log('⚠️  部分檔案失敗:', response.data.data.errors);
    }
    
    return { success: true, data: response.data };
  } catch (error) {
    console.log('❌ 多檔案上傳失敗:', error.response?.data?.message || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
};

// 測試無檔案上傳
const testNoFileUpload = async (token) => {
  console.log('\n📤 測試無檔案上傳');
  
  try {
    const formData = new FormData();
    
    const response = await axios.post(`${API_BASE_URL}/files/upload`, formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('⚠️  無檔案上傳但成功了:', response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.log('✅ 預期的無檔案錯誤:', error.response?.data?.message || error.message);
    return { success: false, error: error.response?.data };
  }
};

// 測試不存在的檔案
const testNonExistentFile = async (token) => {
  console.log('\n📤 測試不存在的檔案上傳');
  
  try {
    const formData = new FormData();
    formData.append('file', fs.createReadStream('/non/existent/file.txt'));

    const response = await axios.post(`${API_BASE_URL}/files/upload`, formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('⚠️  不存在檔案上傳但成功了:', response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.log('✅ 預期的檔案不存在錯誤:', error.response?.data?.message || error.message);
    return { success: false, error: error.response?.data };
  }
};

// 主測試函數
const runTests = async () => {
  console.log('🚀 開始檔案上傳錯誤處理測試\n');

  try {
    // 創建測試檔案
    const testFiles = createTestFiles();

    // 獲取認證 token
    console.log('🔐 正在獲取認證 token...');
    const token = await authenticate();
    console.log('✅ 認證成功');

    const results = [];

    // 測試正常檔案上傳
    results.push(await testSingleFileUpload(token, testFiles.normalFile));

    // 測試中文檔案名
    results.push(await testSingleFileUpload(token, testFiles.chineseFile));

    // 測試超大檔案 (應該失敗)
    results.push(await testSingleFileUpload(token, testFiles.largeFile, true));

    // 測試無檔案上傳 (應該失敗)
    results.push(await testNoFileUpload(token));

    // 測試不存在的檔案 (應該失敗)
    results.push(await testNonExistentFile(token));

    // 測試多檔案上傳 (混合成功和失敗)
    results.push(await testMultipleFileUpload(token, [
      testFiles.normalFile,
      testFiles.chineseFile,
      testFiles.largeFile // 這個應該失敗
    ]));

    // 清理測試檔案
    console.log('\n🧹 清理測試檔案...');
    [testFiles.largeFile, testFiles.normalFile, testFiles.chineseFile].forEach(file => {
      try {
        fs.unlinkSync(file);
        console.log(`✅ 已刪除: ${path.basename(file)}`);
      } catch (error) {
        console.log(`⚠️  無法刪除: ${path.basename(file)}`);
      }
    });

    // 統計結果
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    console.log('\n📊 測試結果統計:');
    console.log(`✅ 成功: ${successCount} 個測試`);
    console.log(`❌ 失敗: ${failCount} 個測試`);

    console.log('\n🎉 檔案上傳錯誤處理測試完成!');
    console.log('💡 如果伺服器沒有崩潰，說明錯誤處理修復成功！');

  } catch (error) {
    console.error('❌ 測試執行失敗:', error.message);
    process.exit(1);
  }
};

// 執行測試
runTests().catch(console.error); 