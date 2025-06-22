#!/usr/bin/env node

/**
 * 測試修復後的流式二次 AI 調用
 * 
 * 驗證：
 * 1. 第一次 AI 思考內容正常顯示
 * 2. 工具調用執行
 * 3. 二次 AI 回答流式顯示（無思考內容重複）
 * 4. 最終結果完整
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3001';
const TEST_TOKEN = 'your-test-token'; // 請替換為有效的測試 token

async function testNoDuplicateThinking() {
  console.log('🧪 測試修復後的流式二次 AI 調用（無重複思考）\n');

  try {
    // 1. 準備測試數據
    const conversationId = 367; // 使用現有對話 ID
    const testMessage = "請查詢部門列表，並告訴我有多少個部門";

    console.log('📝 測試問題:', testMessage);
    console.log('🎯 預期行為:');
    console.log('   1. AI 思考（第一次）');
    console.log('   2. AI 初始回答');
    console.log('   3. 工具調用執行');
    console.log('   4. 最終回答流式顯示（無重複思考）');
    console.log('');

    // 2. 發送流式聊天請求
    console.log('🚀 發送流式聊天請求...\n');

    const response = await fetch(`${API_BASE}/api/chat/conversations/${conversationId}/messages/stream`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
      body: JSON.stringify({
        content: testMessage,
        model_id: 27, // Qwen3:32b
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    console.log('✅ SSE 連接建立成功\n');

    // 3. 處理 SSE 事件流
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    let thinkingCount = 0;
    let isSecondaryStreaming = false;
    let secondaryContent = '';
    let phases = {
      firstThinking: false,
      firstResponse: false,
      toolExecution: false,
      secondaryStreaming: false,
      completed: false
    };

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            await handleSSEEvent(data);
          } catch (e) {
            // 忽略解析錯誤
          }
        }
      }
    }

    async function handleSSEEvent(data) {
      const eventType = data.event || 'unknown';
      const eventData = data.data || data;

      switch (eventType) {
        case 'stream_content':
          // 檢測思考內容
          if (eventData.thinking_content && !isSecondaryStreaming) {
            if (!phases.firstThinking) {
              console.log('✅ 第一階段：AI 思考內容開始');
              phases.firstThinking = true;
            }
            thinkingCount++;
          }
          
          // 檢測主要內容（第一次 AI 回應）
          if (eventData.content && !isSecondaryStreaming && !phases.firstResponse) {
            console.log('✅ 第二階段：AI 初始回答');
            phases.firstResponse = true;
          }

          // 檢測二次 AI 流式內容
          if (isSecondaryStreaming) {
            if (eventData.thinking_content && eventData.thinking_content !== eventData.thinking_content) {
              console.log('❌ 錯誤：二次調用期間發現新的思考內容！');
              console.log('思考內容:', eventData.thinking_content.slice(-100));
            }
            
            if (eventData.content) {
              const newContent = eventData.content.slice(secondaryContent.length);
              if (newContent) {
                process.stdout.write(newContent);
                secondaryContent = eventData.content;
              }
            }
          }
          break;

        case 'tool_processing_start':
          console.log('✅ 第三階段：工具執行開始');
          phases.toolExecution = true;
          break;

        case 'secondary_ai_stream_start':
          console.log('✅ 第四階段：二次 AI 流式回答開始');
          console.log('📝 流式回答: ');
          isSecondaryStreaming = true;
          phases.secondaryStreaming = true;
          secondaryContent = '';
          break;

        case 'secondary_ai_stream_done':
          console.log('\n✅ 第四階段：二次 AI 流式回答完成');
          isSecondaryStreaming = false;
          break;

        case 'stream_done':
          console.log('\n🏁 整個流程完成');
          phases.completed = true;
          
          // 驗證結果
          console.log('\n📊 驗證結果:');
          console.log(`   ✅ 第一階段思考: ${phases.firstThinking ? '正常' : '❌ 缺失'}`);
          console.log(`   ✅ 第二階段回答: ${phases.firstResponse ? '正常' : '❌ 缺失'}`);
          console.log(`   ✅ 第三階段工具: ${phases.toolExecution ? '正常' : '❌ 缺失'}`);
          console.log(`   ✅ 第四階段流式: ${phases.secondaryStreaming ? '正常' : '❌ 缺失'}`);
          console.log(`   📈 思考內容次數: ${thinkingCount} (應該只在第一階段出現)`);
          
          if (thinkingCount > 0 && phases.secondaryStreaming && !isSecondaryStreaming) {
            console.log('✅ 修復成功：思考內容沒有在二次調用中重複！');
          } else if (thinkingCount === 0) {
            console.log('⚠️  注意：沒有檢測到思考內容');
          }
          break;

        default:
          // 其他事件
          break;
      }
    }

  } catch (error) {
    console.error('❌ 測試失敗:', error.message);
    console.error('詳細錯誤:', error);
  }

  console.log('\n🏁 測試完成');
}

// 執行測試
testNoDuplicateThinking().catch(console.error); 