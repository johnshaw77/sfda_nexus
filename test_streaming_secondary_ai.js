#!/usr/bin/env node

/**
 * 測試流式二次 AI 調用功能
 * 
 * 這個腳本測試：
 * 1. 用戶提問包含工具調用
 * 2. AI 思考 + 工具調用
 * 3. 工具執行
 * 4. 二次 AI 調用（流式）
 * 5. 最終回答以流式方式展示
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3001';
const TEST_TOKEN = 'your-test-token'; // 請替換為有效的測試 token

async function testStreamingSecondaryAI() {
  console.log('🏎️ 🛵 開始測試流式二次 AI 調用功能 🛵 🏎️\n');

  try {
    // 1. 準備測試數據
    const conversationId = 367; // 使用現有對話 ID
    const testMessage = "請查詢部門列表，並告訴我有多少個部門";

    console.log('📝 測試問題:', testMessage);
    console.log('🔗 對話 ID:', conversationId);
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

    let currentMessage = null;
    let hasToolCalls = false;
    let isSecondaryStreaming = false;
    let secondaryContent = '';

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
        case 'user_message':
          console.log('📤 用戶消息已創建');
          break;

        case 'assistant_message_created':
          console.log('🤖 AI 消息記錄已創建');
          currentMessage = eventData.assistant_message_id;
          break;

        case 'stream_content':
          // 思考內容
          if (eventData.thinking_content && !isSecondaryStreaming) {
            console.log('🧠 AI 思考中...');
          }
          
          // 主要內容（第一次 AI 回應）
          if (eventData.content && !isSecondaryStreaming) {
            process.stdout.write('💭 AI 回應: ');
            process.stdout.write(eventData.content.slice(-10)); // 只顯示最新的 10 個字符
          }

          // 二次 AI 流式內容
          if (isSecondaryStreaming && eventData.content) {
            const newContent = eventData.content.slice(secondaryContent.length);
            if (newContent) {
              process.stdout.write(newContent);
              secondaryContent = eventData.content;
            }
          }
          break;

        case 'tool_processing_start':
          console.log('\n🔧 開始工具處理...');
          break;

        case 'secondary_ai_start':
          console.log('🔄 開始二次 AI 調用（非流式）...');
          break;

        case 'secondary_ai_stream_start':
          console.log('🌊 開始二次 AI 流式調用...');
          console.log('📝 流式回答: ');
          isSecondaryStreaming = true;
          secondaryContent = '';
          break;

        case 'secondary_ai_stream_done':
          console.log('\n✅ 二次 AI 流式調用完成');
          isSecondaryStreaming = false;
          break;

        case 'secondary_ai_stream_error':
          console.log('\n❌ 二次 AI 流式調用失敗:', eventData.error);
          isSecondaryStreaming = false;
          break;

        case 'tool_calls_processed':
          console.log('🔧 工具調用處理完成');
          hasToolCalls = eventData.has_tool_calls;
          if (eventData.is_streaming_secondary) {
            console.log('🌊 檢測到流式二次調用標記');
          }
          break;

        case 'stream_done':
          console.log('\n🏁 整個流程完成');
          console.log('📊 統計信息:');
          console.log(`   - Tokens: ${eventData.tokens_used || 0}`);
          console.log(`   - 成本: ${eventData.cost || 0}`);
          console.log(`   - 處理時間: ${eventData.processing_time || 0}ms`);
          console.log(`   - 有工具調用: ${hasToolCalls ? '是' : '否'}`);
          console.log(`   - 使用二次 AI: ${eventData.tool_info?.used_secondary_ai ? '是' : '否'}`);
          break;

        default:
          // console.log(`📡 其他事件: ${eventType}`);
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
testStreamingSecondaryAI().catch(console.error); 