/**
 * 測試 MCP 工具結果 SSE 串流功能
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';
const API_URL = `${BASE_URL}/api`;

// 測試用戶登入信息
const testUser = {
  identifier: 'admin',
  password: 'admin123'
};

async function testSSEStreaming() {
  console.log('🎯 開始測試 MCP 工具結果 SSE 串流功能...\n');

  try {
    // 1. 用戶登入
    console.log('1. 用戶登入...');
    const loginResponse = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testUser),
    });

    if (!loginResponse.ok) {
      throw new Error(`登入失敗: ${loginResponse.status}`);
    }

    const loginData = await loginResponse.json();
    const token = loginData.data.access_token;
    console.log('✅ 登入成功，獲得token\n');

    // 2. 創建對話
    console.log('2. 創建對話...');
    const conversationResponse = await fetch(`${API_URL}/chat/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: 'MCP SSE 串流測試',
        model_id: 1,
      }),
    });

    if (!conversationResponse.ok) {
      throw new Error(`創建對話失敗: ${conversationResponse.status}`);
    }

    const conversationData = await conversationResponse.json();
    const conversationId = conversationData.data.id;
    console.log('✅ 創建對話成功，ID:', conversationId, '\n');

    // 3. 發送包含 MCP 工具調用的消息並監聽 SSE
    console.log('3. 發送包含 MCP 工具調用的消息...');
    
    // 創建一個會觸發 MCP 工具調用的消息
    const testMessage = '請查詢軍品管理資料庫中的專案資料，我想了解目前有哪些專案正在進行中';

    // 使用 SSE 端點
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
        content: testMessage,
        attachments: [],
      }),
    });

    if (!response.ok) {
      throw new Error(`發送消息失敗: ${response.status}`);
    }

    console.log('✅ 開始監聽 SSE 事件...\n');

    // 監聽 SSE 事件
    const reader = response.body;
    let buffer = '';
    let toolResultSections = [];

    reader.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop(); // 保留不完整的行

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const eventData = JSON.parse(line.slice(6));
            
            switch (eventData.type) {
              case 'message_start':
                console.log('📨 消息開始:', {
                  messageId: eventData.message_id,
                  role: eventData.role
                });
                break;

              case 'content_delta':
                process.stdout.write(eventData.content);
                break;

              case 'tool_calls':
                console.log('\n🔧 工具調用:', {
                  toolName: eventData.tool_name,
                  parameters: eventData.parameters
                });
                break;

              case 'tool_result_section':
                console.log('\n📋 工具結果分段:', {
                  sectionType: eventData.section_type,
                  sectionIndex: eventData.section_index,
                  progress: eventData.progress + '%',
                  contentLength: eventData.section_content?.length || 0
                });
                
                toolResultSections.push({
                  type: eventData.section_type,
                  index: eventData.section_index,
                  content: eventData.section_content
                });
                break;

              case 'tool_result':
                console.log('\n✅ 工具結果完成:', {
                  toolName: eventData.tool_name,
                  success: eventData.success
                });
                break;

              case 'message_complete':
                console.log('\n\n✅ 消息完成:', {
                  messageId: eventData.message_id,
                  totalTokens: eventData.usage?.total_tokens
                });
                
                // 組裝完整的工具結果
                if (toolResultSections.length > 0) {
                  console.log('\n📊 工具結果分段統計:');
                  toolResultSections
                    .sort((a, b) => a.index - b.index)
                    .forEach((section, i) => {
                      console.log(`  ${i + 1}. ${section.type}: ${section.content?.length || 0} 字符`);
                    });
                  
                  const fullContent = toolResultSections
                    .sort((a, b) => a.index - b.index)
                    .map(section => section.content)
                    .join('');
                  
                  console.log(`\n📋 完整工具結果 (${fullContent.length} 字符):`);
                  console.log(fullContent.substring(0, 200) + '...');
                }
                return;

              case 'error':
                console.log('\n❌ 錯誤:', eventData.error);
                return;
            }
          } catch (error) {
            console.log('解析 SSE 事件失敗:', error.message);
          }
        }
      }
    });

    reader.on('end', () => {
      console.log('\n🏁 SSE 串流結束');
    });

    reader.on('error', (error) => {
      console.error('❌ SSE 串流錯誤:', error);
    });

    // 等待一段時間讓事件完成
    await new Promise(resolve => setTimeout(resolve, 30000));

  } catch (error) {
    console.error('❌ 測試失敗:', error.message);
  }
}

// 執行測試
testSSEStreaming().then(() => {
  console.log('\n🎯 測試完成');
  process.exit(0);
}).catch(error => {
  console.error('❌ 測試執行失敗:', error);
  process.exit(1);
});