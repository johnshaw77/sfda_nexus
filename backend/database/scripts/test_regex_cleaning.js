// 測試正則表達式清理 <think> 標籤

const testContent = `<think>
好的，用户问A123456的职位是什么。我需要调用get_employee_info工具来获取信息。首先确认员工编号格式是否正确，A123456符合要求。然后查看之前的对话记录，用户之前问过这个员工的电话号码，系统成功返回了数据，其中已经包含职位信息。在之前的回答中，职位是專案工程師。所以这次用户再次询问职位，可能是在确认或者需要更详细的信息。不过根据规则，需要再次调用工具来确保数据最新。不过之前的工具调用已经成功，可能不需要重复调用。但根据系统设定，每次查询都需调用工具。所以再次执行get_employee_info，参数employeeId=A123456。工具返回的结果中职位部分显示為專案工程師，部門是數據分析部。因此，回答用户时直接给出职位信息，并附上部门和其他相关信息，确保准确和完整。
</think>

✅ **get_employee_info** 執行成功
📋 **服務**: Hr 服務
⏱️ **執行時間**: 278ms

**職位資訊：**
- 員工編號：A123456
- 姓名：白勝宇
- **職位名稱**：專案工程師
- 職級：P5
- 部門：數據分析部
- 直屬主管：王工程師
- 入職日期：2020-03-01

如需更多職務細節（如職能描述或晉升歷程），可進一步協調人事部門提供完整資料。`;

console.log("=== 原始內容 ===");
console.log(testContent);
console.log("\n原始內容長度:", testContent.length);

console.log("\n=== 測試正則表達式清理 ===");

// 測試當前的正則表達式
const regex1 = /<think>[\s\S]*?<\/think>\s*/g;
const cleaned1 = testContent.replace(regex1, "").trim();

console.log("正則表達式 1:", regex1);
console.log("清理後內容:");
console.log(cleaned1);
console.log("清理後長度:", cleaned1.length);

// 測試更強的正則表達式
const regex2 = /<think>[\s\S]*?<\/think>\s*/gi;
const cleaned2 = testContent.replace(regex2, "").trim();

console.log("\n正則表達式 2 (忽略大小寫):", regex2);
console.log("清理後內容:");
console.log(cleaned2);
console.log("清理後長度:", cleaned2.length);

// 測試分步清理
console.log("\n=== 分步測試 ===");
console.log("是否包含 <think>:", testContent.includes("<think>"));
console.log("是否包含 </think>:", testContent.includes("</think>"));

const match = testContent.match(/<think>[\s\S]*?<\/think>/);
console.log("匹配結果:", match ? "找到匹配" : "未找到匹配");
if (match) {
  console.log("匹配內容長度:", match[0].length);
  console.log("匹配內容預覽:", match[0].substring(0, 100) + "...");
}
