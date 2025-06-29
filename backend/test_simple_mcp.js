/**
 * 簡單測試 MCP 工具調用
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';
const API_URL = `${BASE_URL}/api`;

async function testMCPCall() {
  console.log('🎯 開始測試 MCP 工具調用...\n');

  try {
    // 1. 用戶登入
    console.log('1. 用戶登入...');
    const loginResponse = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        identifier: 'admin',
        password: 'admin123'
      }),
    });

    if (!loginResponse.ok) {
      throw new Error(`登入失敗: ${loginResponse.status}`);
    }

    const loginData = await loginResponse.json();
    const token = loginData.data.access_token;
    console.log('✅ 登入成功\n');

    // 2. 創建對話
    console.log('2. 創建對話...');
    const conversationResponse = await fetch(`${API_URL}/chat/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: 'MCP 測試',
        model_id: 1,
      }),
    });

    if (!conversationResponse.ok) {
      throw new Error(`創建對話失敗: ${conversationResponse.status}`);
    }

    const conversationData = await conversationResponse.json();
    const conversationId = conversationData.data.id;
    console.log('✅ 創建對話成功，ID:', conversationId, '\n');

    // 3. 發送包含 MCP 工具調用的消息 (使用普通 API，不是 SSE)
    console.log('3. 發送包含 MCP 工具調用的消息...');
    
    const messageResponse = await fetch(`${API_URL}/chat/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        content: '請使用 get-mil-list 工具查詢 MIL 系統中的所有專案列表，然後用 get-status-report 工具分析專案狀態分布',
        attachments: [],
      }),
    });

    if (!messageResponse.ok) {
      const errorText = await messageResponse.text();
      throw new Error(`發送消息失敗: ${messageResponse.status} - ${errorText}`);
    }

    const messageData = await messageResponse.json();
    console.log('✅ 消息發送成功\n');
    
    console.log('📨 完整回應:', JSON.stringify(messageData, null, 2));

  } catch (error) {
    console.error('❌ 測試失敗:', error.message);
  }
}

// 執行測試
testMCPCall().then(() => {
  console.log('\n🎯 測試完成');
  process.exit(0);
}).catch(error => {
  console.error('❌ 測試執行失敗:', error);
  process.exit(1);
});