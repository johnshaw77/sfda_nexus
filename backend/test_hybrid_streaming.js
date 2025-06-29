/**
 * 測試混合流式方案：工具快速回應 + AI總結打字機效果
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';
const API_URL = `${BASE_URL}/api`;

async function testHybridStreaming() {
  console.log('🎯 開始測試混合流式方案...\n');

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
        title: '混合流式測試',
        model_id: 1,
      }),
    });

    if (!conversationResponse.ok) {
      throw new Error(`創建對話失敗: ${conversationResponse.status}`);
    }

    const conversationData = await conversationResponse.json();
    const conversationId = conversationData.data.id;
    console.log('✅ 創建對話成功，ID:', conversationId, '\n');

    // 3. 發送會觸發MCP工具的消息並監聽SSE
    console.log('3. 發送包含MCP工具調用的消息...');
    
    const testMessage = '請使用get-mil-list工具查詢MIL系統中的專案資料，我想了解專案狀態分布情況';

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

    console.log('✅ 開始監聽SSE事件...\n');

    // 監聽SSE事件
    const reader = response.body;
    let buffer = '';
    let eventLog = [];

    // 階段追蹤
    let phases = {
      toolProcessing: false,
      toolResultStreaming: false,
      aiSummaryStreaming: false
    };

    reader.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const eventData = JSON.parse(line.slice(6));
            
            // 記錄事件
            eventLog.push({
              type: eventData.type,
              timestamp: new Date().toISOString(),
              data: eventData
            });
            
            switch (eventData.type) {
              case 'tool_processing_start':
                phases.toolProcessing = true;
                console.log('🔧 工具處理階段開始');
                break;

              case 'tool_result_section':
                if (!phases.toolResultStreaming) {
                  phases.toolResultStreaming = true;
                  console.log('📋 工具結果分段串流階段開始');
                }
                console.log(`  └─ 分段 ${eventData.section_index + 1}/${eventData.total_sections} (${eventData.progress}%)`);
                break;

              case 'ai_summary_start':
                phases.aiSummaryStreaming = true;
                console.log('🤖 AI總結生成階段開始');
                break;

              case 'ai_summary_delta':
                process.stdout.write(eventData.content);
                break;

              case 'ai_summary_complete':
                console.log('\n✅ AI總結生成完成');
                break;

              case 'stream_done':
                console.log('\n🏁 整個流程完成');
                
                // 分析事件序列
                console.log('\n📊 事件序列分析:');
                const eventTypes = eventLog.map(e => e.type);
                const uniqueEvents = [...new Set(eventTypes)];
                
                console.log('事件類型:', uniqueEvents.join(' → '));
                console.log('工具結果分段數量:', eventTypes.filter(t => t === 'tool_result_section').length);
                console.log('AI總結字符數量:', eventTypes.filter(t => t === 'ai_summary_delta').length);
                
                // 檢查是否有重複總結
                const hasOldSummary = eventLog.some(e => 
                  e.type === 'content_delta' && 
                  e.data.content && 
                  e.data.content.includes('AI智能分析總結')
                );
                
                if (hasOldSummary) {
                  console.log('⚠️  檢測到舊的AI總結機制仍在運行');
                } else {
                  console.log('✅ 確認只有新的流式總結在運行');
                }
                
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

    // 等待流程完成
    await new Promise(resolve => setTimeout(resolve, 60000));

  } catch (error) {
    console.error('❌ 測試失敗:', error.message);
  }
}

// 執行測試
testHybridStreaming().then(() => {
  console.log('\n🎯 測試完成');
  process.exit(0);
}).catch(error => {
  console.error('❌ 測試執行失敗:', error);
  process.exit(1);
});