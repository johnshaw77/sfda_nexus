/**
 * 簡單的串流測試腳本
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';
const API_URL = `${BASE_URL}/api`;

async function testSimpleChat() {
  console.log('🎯 開始測試聊天...\n');

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
        title: '簡單聊天測試',
        model_id: 1,
      }),
    });

    if (!conversationResponse.ok) {
      throw new Error(`創建對話失敗: ${conversationResponse.status}`);
    }

    const conversationData = await conversationResponse.json();
    const conversationId = conversationData.data.id;
    console.log('✅ 創建對話成功，ID:', conversationId, '\n');

    // 3. 發送簡單消息（不觸發工具）
    console.log('3. 發送簡單消息...');
    
    const simpleMessage = '你好，請介紹一下自己';

    const sseUrl = `${API_URL}/chat/conversations/${conversationId}/messages/stream`;
    
    const response = await fetch(sseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
      body: JSON.stringify({
        content: simpleMessage,
        attachments: [],
      }),
    });

    if (!response.ok) {
      throw new Error(`發送消息失敗: ${response.status}`);
    }

    console.log('✅ 開始監聽SSE事件...\n');

    // 監聽SSE事件
    const reader = response.body;
    let buffer = '';
    let contentReceived = false;

    reader.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const eventData = JSON.parse(line.slice(6));
            
            switch (eventData.type) {
              case 'assistant_message_created':
                console.log('🤖 AI消息創建');
                break;

              case 'content_delta':
                if (!contentReceived) {
                  console.log('📝 開始接收內容');
                  contentReceived = true;
                }
                process.stdout.write(eventData.content || '');
                break;

              case 'stream_done':
                console.log('\n✅ 串流完成');
                return;

              case 'error':
                console.log('\n❌ 錯誤:', eventData.error);
                return;
            }
          } catch (error) {
            // 忽略解析錯誤
          }
        }
      }
    });

    reader.on('end', () => {
      console.log('\n🏁 SSE串流結束');
    });

    reader.on('error', (error) => {
      console.error('❌ SSE串流錯誤:', error);
    });

    // 等待完成
    await new Promise(resolve => setTimeout(resolve, 30000));

  } catch (error) {
    console.error('❌ 測試失敗:', error.message);
  }
}

// 執行測試
testSimpleChat().then(() => {
  console.log('\n🎯 測試完成');
  process.exit(0);
}).catch(error => {
  console.error('❌ 測試執行失敗:', error);
  process.exit(1);
});