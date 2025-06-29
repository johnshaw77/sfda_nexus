/**
 * 測試系統提示詞生成，查看 AI 是否能看到工具信息
 */

import chatService from './src/services/chat.service.js';

async function testSystemPrompt() {
  console.log('🎯 開始測試系統提示詞生成...\n');

  try {
    // ChatService is already instantiated as a singleton
    
    // 生成系統提示詞
    const systemPrompt = await chatService.generateSystemPrompt('', {
      user_id: 1,
      conversation_id: 1,
      model_type: 'gemini'
    });
    
    console.log('📋 生成的系統提示詞長度:', systemPrompt.length);
    console.log('\n📝 系統提示詞內容:');
    console.log('='.repeat(80));
    console.log(systemPrompt);
    console.log('='.repeat(80));
    
    // 檢查是否包含工具信息
    const hasGetMilList = systemPrompt.includes('get-mil-list');
    const hasGetStatusReport = systemPrompt.includes('get-status-report');
    const hasToolFormat = systemPrompt.includes('{"tool":');
    
    console.log('\n🔍 工具信息檢查:');
    console.log('- 包含 get-mil-list:', hasGetMilList);
    console.log('- 包含 get-status-report:', hasGetStatusReport);
    console.log('- 包含工具調用格式:', hasToolFormat);
    
    if (hasGetMilList && hasGetStatusReport && hasToolFormat) {
      console.log('✅ 系統提示詞包含完整的工具信息');
    } else {
      console.log('⚠️ 系統提示詞可能缺少工具信息');
    }

  } catch (error) {
    console.error('❌ 測試失敗:', error.message);
    console.error('Stack:', error.stack);
  }
}

// 執行測試
testSystemPrompt().then(() => {
  console.log('\n🎯 測試完成');
  process.exit(0);
}).catch(error => {
  console.error('❌ 測試執行失敗:', error);
  process.exit(1);
});