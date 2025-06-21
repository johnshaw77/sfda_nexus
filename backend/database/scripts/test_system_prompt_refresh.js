/**
 * 測試系統提示詞刷新和快取清除功能
 * 
 * 這個腳本用於測試：
 * 1. 智能體系統提示詞的更新
 * 2. 快取清除機制
 * 3. 前端獲取最新系統提示詞
 */

import mysql from 'mysql2/promise';
import axios from 'axios';

// 資料庫配置
const dbConfig = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: 'MyPwd@1234',
  database: 'sfda_nexus',
  charset: 'utf8mb4'
};

// API 配置
const API_BASE_URL = 'http://localhost:3001';
let authToken = '';

// 測試用的智能體 ID（專案經理）
const TEST_AGENT_ID = 1;

async function login() {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
      identifier: 'admin',
      password: 'admin123'
    });
    
    if (response.data.success) {
      authToken = response.data.data.token;
      console.log('✅ 登入成功');
      return true;
    } else {
      console.error('❌ 登入失敗:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ 登入請求失敗:', error.message);
    return false;
  }
}

async function updateAgentSystemPrompt(agentId, newPrompt) {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    const [result] = await connection.execute(
      'UPDATE agents SET system_prompt = ?, updated_at = NOW() WHERE id = ?',
      [newPrompt, agentId]
    );
    
    console.log(`✅ 智能體 ${agentId} 系統提示詞已更新`);
    console.log(`   影響行數: ${result.affectedRows}`);
    return true;
  } catch (error) {
    console.error('❌ 更新智能體系統提示詞失敗:', error.message);
    return false;
  } finally {
    await connection.end();
  }
}

async function getAgentSystemPrompt(agentId) {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    const [rows] = await connection.execute(
      'SELECT system_prompt, updated_at FROM agents WHERE id = ?',
      [agentId]
    );
    
    if (rows.length > 0) {
      return {
        systemPrompt: rows[0].system_prompt,
        updatedAt: rows[0].updated_at
      };
    }
    return null;
  } catch (error) {
    console.error('❌ 獲取智能體系統提示詞失敗:', error.message);
    return null;
  } finally {
    await connection.end();
  }
}

async function clearSystemPromptCache() {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/chat/system-prompt/clear-cache`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );
    
    if (response.data.success) {
      console.log('✅ 系統提示詞快取已清除');
      return true;
    } else {
      console.error('❌ 清除快取失敗:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ 清除快取請求失敗:', error.message);
    return false;
  }
}

async function previewSystemPrompt(basePrompt = '') {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/chat/system-prompt/preview`,
      {
        base_prompt: basePrompt,
        model_type: 'ollama'
      },
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );
    
    if (response.data.success) {
      const data = response.data.data;
      console.log('✅ 系統提示詞預覽成功');
      console.log(`   基礎提示詞長度: ${data.base_prompt.length}`);
      console.log(`   完整提示詞長度: ${data.prompt_length}`);
      console.log(`   生成時間: ${data.generated_at}`);
      
      // 顯示基礎提示詞的前 200 個字符
      const preview = data.base_prompt.substring(0, 200);
      console.log(`   基礎提示詞預覽: ${preview}${data.base_prompt.length > 200 ? '...' : ''}`);
      
      return data;
    } else {
      console.error('❌ 預覽系統提示詞失敗:', response.data.message);
      return null;
    }
  } catch (error) {
    console.error('❌ 預覽系統提示詞請求失敗:', error.message);
    return null;
  }
}

async function runTest() {
  console.log('🚀 開始測試系統提示詞刷新功能\n');
  
  // 1. 登入
  console.log('📝 步驟 1: 登入系統');
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('❌ 測試終止：登入失敗');
    return;
  }
  console.log('');
  
  // 2. 獲取當前系統提示詞
  console.log('📝 步驟 2: 獲取當前智能體系統提示詞');
  const currentPrompt = await getAgentSystemPrompt(TEST_AGENT_ID);
  if (!currentPrompt) {
    console.log('❌ 測試終止：無法獲取當前系統提示詞');
    return;
  }
  console.log(`   當前系統提示詞: ${currentPrompt.systemPrompt.substring(0, 100)}...`);
  console.log(`   最後更新時間: ${currentPrompt.updatedAt}`);
  console.log('');
  
  // 3. 預覽當前系統提示詞（測試快取）
  console.log('📝 步驟 3: 預覽當前系統提示詞（可能使用快取）');
  const preview1 = await previewSystemPrompt(currentPrompt.systemPrompt);
  console.log('');
  
  // 4. 更新系統提示詞
  console.log('📝 步驟 4: 更新智能體系統提示詞');
  const newPrompt = `${currentPrompt.systemPrompt}\n\n[測試更新 - ${new Date().toISOString()}] 這是一個測試更新，用於驗證系統提示詞刷新功能。`;
  const updateSuccess = await updateAgentSystemPrompt(TEST_AGENT_ID, newPrompt);
  if (!updateSuccess) {
    console.log('❌ 測試終止：更新系統提示詞失敗');
    return;
  }
  console.log('');
  
  // 5. 預覽更新後的系統提示詞（可能仍使用快取）
  console.log('📝 步驟 5: 預覽更新後的系統提示詞（可能仍使用舊快取）');
  const preview2 = await previewSystemPrompt(newPrompt);
  console.log('');
  
  // 6. 清除快取
  console.log('📝 步驟 6: 清除系統提示詞快取');
  const clearSuccess = await clearSystemPromptCache();
  if (!clearSuccess) {
    console.log('⚠️  警告：快取清除失敗，繼續測試');
  }
  console.log('');
  
  // 7. 再次預覽系統提示詞（應該使用新的內容）
  console.log('📝 步驟 7: 清除快取後預覽系統提示詞（應該是最新內容）');
  const preview3 = await previewSystemPrompt(newPrompt);
  console.log('');
  
  // 8. 恢復原始系統提示詞
  console.log('📝 步驟 8: 恢復原始系統提示詞');
  const restoreSuccess = await updateAgentSystemPrompt(TEST_AGENT_ID, currentPrompt.systemPrompt);
  if (restoreSuccess) {
    console.log('✅ 原始系統提示詞已恢復');
  } else {
    console.log('⚠️  警告：恢復原始系統提示詞失敗');
  }
  console.log('');
  
  // 9. 最終清除快取
  console.log('📝 步驟 9: 最終清除快取');
  await clearSystemPromptCache();
  
  console.log('🎉 測試完成！');
  console.log('\n📊 測試結果總結:');
  console.log(`   - 登入: ${loginSuccess ? '✅' : '❌'}`);
  console.log(`   - 系統提示詞更新: ${updateSuccess ? '✅' : '❌'}`);
  console.log(`   - 快取清除: ${clearSuccess ? '✅' : '❌'}`);
  console.log(`   - 系統提示詞恢復: ${restoreSuccess ? '✅' : '❌'}`);
  
  if (preview1 && preview2 && preview3) {
    console.log('\n🔍 快取行為分析:');
    console.log(`   - 更新前預覽時間: ${preview1.generated_at}`);
    console.log(`   - 更新後預覽時間: ${preview2.generated_at}`);
    console.log(`   - 清除快取後預覽時間: ${preview3.generated_at}`);
    
    const time1 = new Date(preview1.generated_at).getTime();
    const time2 = new Date(preview2.generated_at).getTime();
    const time3 = new Date(preview3.generated_at).getTime();
    
    if (time2 === time1) {
      console.log('   ⚠️  更新後仍使用舊快取（符合預期）');
    } else {
      console.log('   ℹ️  更新後生成了新的預覽（可能快取已過期）');
    }
    
    if (time3 > time2) {
      console.log('   ✅ 清除快取後生成了新的預覽（符合預期）');
    } else {
      console.log('   ⚠️  清除快取後未生成新的預覽（可能有問題）');
    }
  }
}

// 執行測試
runTest().catch(console.error); 