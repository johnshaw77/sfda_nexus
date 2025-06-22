/**
 * performTTest 集成測試腳本
 * 
 * 測試從後端管理系統到 MCP 服務器再到 SFDA Stat API 的完整流程
 */

const axios = require('axios');

// 配置
const BACKEND_URL = 'http://localhost:3000';
const TEST_CREDENTIALS = {
  identifier: 'admin',
  password: 'admin123'
};

// 測試數據 - 與您在管理後台使用的相同數據
const TEST_DATA = {
  serviceId: 49,
  toolId: 209, // 這個需要從資料庫查詢實際的 tool ID
  toolName: 'perform_ttest',
  parameters: {
    data: {
      sample1: [498.2, 501.3, 499.8, 502.1, 500.5, 497.9, 503.2, 499.1, 501.8, 500.3],
      sample2: null,
      paired: false,
      alpha: 0.05,
      alternative: "two-sided"
    },
    context: {
      scenario: "quality",
      description: "檢測產品重量是否符合標準規格 500g",
      hypothesis: {
        null: "平均重量等於標準重量 500g",
        alternative: "平均重量不等於標準重量 500g"
      }
    }
  }
};

async function runIntegrationTest() {
  let authToken = null;
  
  try {
    console.log('🚀 開始 performTTest 集成測試...');
    
    // 步驟 1: 登入獲取 token
    console.log('\n📝 步驟 1: 用戶登入...');
    const loginResponse = await axios.post(`${BACKEND_URL}/api/auth/login`, TEST_CREDENTIALS);
    
    if (loginResponse.data.success) {
      authToken = loginResponse.data.data.token;
      console.log('✅ 登入成功，獲得 token');
    } else {
      throw new Error('登入失敗：' + loginResponse.data.message);
    }
    
    // 步驟 2: 查詢 perform_ttest 工具的實際 ID
    console.log('\n🔍 步驟 2: 查詢 perform_ttest 工具 ID...');
    const toolsResponse = await axios.get(`${BACKEND_URL}/api/mcp/tools`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const performTTestTool = toolsResponse.data.data.find(tool => 
      tool.name === 'perform_ttest'
    );
    
    if (!performTTestTool) {
      throw new Error('找不到 perform_ttest 工具');
    }
    
    console.log(`✅ 找到工具: ${performTTestTool.name} (ID: ${performTTestTool.id})`);
    
    // 更新測試數據中的 toolId
    TEST_DATA.toolId = performTTestTool.id;
    
    // 步驟 3: 調用 MCP 工具
    console.log('\n🔧 步驟 3: 調用 perform_ttest 工具...');
    console.log('請求參數:', JSON.stringify(TEST_DATA, null, 2));
    
    const toolCallResponse = await axios.post(`${BACKEND_URL}/api/mcp/tools/call`, TEST_DATA, {
      headers: { 
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (toolCallResponse.data.success) {
      console.log('✅ 工具調用成功！');
      console.log('\n📊 T檢定結果:');
      
      const result = toolCallResponse.data.data;
      console.log('- 成功狀態:', result.success);
      console.log('- 工具名稱:', result.tool_name);
      console.log('- 服務名稱:', result.service_name);
      console.log('- 執行時間:', result.execution_time + 'ms');
      
      if (result.data && result.data.result) {
        const statResult = result.data.result;
        console.log('- t統計量:', statResult.statistic);
        console.log('- p值:', statResult.p_value);
        console.log('- 自由度:', statResult.degrees_of_freedom);
        console.log('- 拒絕虛無假設:', statResult.reject_null);
        console.log('- 信賴區間:', statResult.confidence_interval);
        
        if (statResult.interpretation) {
          console.log('\n📝 結果解釋:');
          console.log('- 摘要:', statResult.interpretation.summary);
          console.log('- 結論:', statResult.interpretation.conclusion);
          console.log('- 實際意義:', statResult.interpretation.practical_significance);
          if (statResult.interpretation.recommendations) {
            console.log('- 建議:', statResult.interpretation.recommendations.join(', '));
          }
        }
      }
      
      console.log('\n🎉 集成測試完成 - 所有步驟都成功！');
      
    } else {
      throw new Error('工具調用失敗：' + toolCallResponse.data.message);
    }
    
  } catch (error) {
    console.error('\n❌ 測試失敗:', error.message);
    
    if (error.response) {
      console.error('HTTP 狀態碼:', error.response.status);
      console.error('回應數據:', JSON.stringify(error.response.data, null, 2));
    }
    
    process.exit(1);
  }
}

// 執行測試
runIntegrationTest(); 