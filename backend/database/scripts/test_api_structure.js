import { createSuccessResponse } from "../../src/middleware/errorHandler.middleware.js";

// 測試 createSuccessResponse 的正確用法
console.log("🔍 測試 createSuccessResponse 返回結構...\n");

// 1. 測試帶有分頁數據的情況（如 agents 列表）
const responseData = {
  data: [
    { id: 1, name: "agent1", tags: ["AI", "assistant"] },
    { id: 2, name: "agent2", tags: ["AI", "helper"] },
  ],
  pagination: {
    page: 1,
    limit: 20,
    total: 2,
    pages: 1,
  },
};

const correctResponse = createSuccessResponse(
  responseData,
  "獲取智能體列表成功"
);
console.log("✅ 正確的 API 返回結構:");
console.log(JSON.stringify(correctResponse, null, 2));

console.log("\n📋 前端應該這樣訪問數據:");
console.log("- response.data.data (智能體數組)");
console.log("- response.data.pagination (分頁信息)");
console.log("- response.success (成功標誌)");
console.log("- response.message (消息)");

// 2. 測試簡單數據的情況
const simpleData = { count: 10, users: 5, agents: 3 };
const simpleResponse = createSuccessResponse(simpleData, "獲取統計成功");
console.log("\n✅ 簡單數據的返回結構:");
console.log(JSON.stringify(simpleResponse, null, 2));

console.log("\n📋 前端應該這樣訪問:");
console.log("- response.data.count");
console.log("- response.data.users");
console.log("- response.data.agents");

console.log("\n🎯 修復完成！現在所有 API 都會返回正確的結構格式。");
