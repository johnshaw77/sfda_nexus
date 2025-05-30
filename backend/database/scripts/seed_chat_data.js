/**
 * 聊天測試數據生成腳本
 * 生成20組對話和相關訊息數據
 */

import { initializeDatabase, getPool } from "./src/config/database.config.js";

// 對話主題模板
const conversationTopics = [
  { title: "如何學習 Vue 3", category: "development" },
  { title: "健康飲食建議", category: "health" },
  { title: "旅遊規劃指南", category: "travel" },
  { title: "JavaScript 最佳實踐", category: "development" },
  { title: "投資理財入門", category: "finance" },
  { title: "時間管理技巧", category: "productivity" },
  { title: "英語學習方法", category: "education" },
  { title: "創業經驗分享", category: "business" },
  { title: "攝影技巧討論", category: "hobby" },
  { title: "料理食譜推薦", category: "cooking" },
  { title: "AI 技術發展趨勢", category: "technology" },
  { title: "心理健康維護", category: "health" },
  { title: "職場溝通技巧", category: "career" },
  { title: "環保生活方式", category: "lifestyle" },
  { title: "數據分析入門", category: "development" },
  { title: "音樂創作靈感", category: "art" },
  { title: "運動健身計劃", category: "fitness" },
  { title: "閱讀習慣培養", category: "education" },
  { title: "家居裝修建議", category: "lifestyle" },
  { title: "寵物照護指南", category: "pets" },
];

// 用戶訊息模板
const userMessages = [
  "你好，我想了解一下這個主題",
  "能給我一些具體的建議嗎？",
  "這個方法真的有效嗎？",
  "有沒有更簡單的方式？",
  "我遇到了一些困難，該怎麼辦？",
  "能推薦一些相關的資源嗎？",
  "這個和其他方法有什麼區別？",
  "初學者應該從哪裡開始？",
  "有什麼需要注意的地方嗎？",
  "謝謝你的建議，很有幫助！",
];

// AI 回應模板
const assistantMessages = [
  "很高興為您介紹這個主題！讓我為您詳細說明...",
  "當然可以！根據我的了解，我建議您可以從以下幾個方面著手...",
  "這確實是一個很好的方法，許多人都取得了不錯的成果...",
  "有的，我可以為您推薦一個更適合初學者的方式...",
  "遇到困難是很正常的，讓我幫您分析一下可能的解決方案...",
  "我很樂意為您推薦一些優質的學習資源...",
  "這是一個很好的問題！讓我為您比較一下不同方法的優缺點...",
  "對於初學者，我建議按照以下步驟循序漸進...",
  "確實有一些重要的注意事項需要提醒您...",
  "不客氣！如果您還有其他問題，隨時可以問我。",
];

// 生成隨機日期（最近30天內）
const getRandomDate = () => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const randomTime =
    thirtyDaysAgo.getTime() +
    Math.random() * (now.getTime() - thirtyDaysAgo.getTime());
  return new Date(randomTime);
};

// 生成對話數據
const generateConversations = async () => {
  try {
    console.log("🚀 開始生成聊天測試數據...");

    const pool = getPool();

    // 獲取用戶和模型數據
    const [users] = await pool.execute(
      'SELECT id FROM users WHERE role != "super_admin" LIMIT 10'
    );
    const [models] = await pool.execute(
      "SELECT id FROM ai_models WHERE is_active = 1"
    );
    const [agents] = await pool.execute(
      "SELECT id FROM agents WHERE is_active = 1"
    );

    if (users.length === 0) {
      console.log("❌ 沒有找到普通用戶，請先運行用戶數據生成腳本");
      return;
    }

    if (models.length === 0) {
      console.log("❌ 沒有找到可用的AI模型");
      return;
    }

    console.log(
      `📊 找到 ${users.length} 個用戶，${models.length} 個模型，${agents.length} 個智能體`
    );

    // 生成20組對話
    for (let i = 0; i < 20; i++) {
      const topic = conversationTopics[i];
      const user = users[Math.floor(Math.random() * users.length)];
      const model = models[Math.floor(Math.random() * models.length)];
      const agent =
        agents.length > 0
          ? agents[Math.floor(Math.random() * agents.length)]
          : null;

      const createdAt = getRandomDate();
      const messageCount = Math.floor(Math.random() * 8) + 3; // 3-10條訊息

      // 創建對話
      const [conversationResult] = await pool.execute(
        `INSERT INTO conversations 
         (user_id, agent_id, model_id, title, message_count, last_message_at, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          user.id,
          agent?.id || null,
          model.id,
          topic.title,
          messageCount,
          createdAt,
          createdAt,
          createdAt,
        ]
      );

      const conversationId = conversationResult.insertId;
      console.log(
        `📝 創建對話 ${i + 1}: "${topic.title}" (ID: ${conversationId})`
      );

      // 生成對話訊息
      let lastMessageTime = new Date(createdAt.getTime());

      for (let j = 0; j < messageCount; j++) {
        const isUserMessage = j % 2 === 0; // 交替用戶和AI訊息
        const role = isUserMessage ? "user" : "assistant";
        const content = isUserMessage
          ? userMessages[Math.floor(Math.random() * userMessages.length)]
          : assistantMessages[
              Math.floor(Math.random() * assistantMessages.length)
            ];

        // 每條訊息間隔1-30分鐘
        const messageTime = new Date(
          lastMessageTime.getTime() + Math.random() * 30 * 60 * 1000
        );
        lastMessageTime = messageTime;

        await pool.execute(
          `INSERT INTO messages 
           (conversation_id, role, content, tokens_used, created_at, updated_at) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            conversationId,
            role,
            content,
            Math.floor(Math.random() * 500) + 50, // 50-550 tokens
            messageTime,
            messageTime,
          ]
        );
      }

      // 更新對話的最後訊息時間
      await pool.execute(
        "UPDATE conversations SET last_message_at = ?, updated_at = ? WHERE id = ?",
        [lastMessageTime, lastMessageTime, conversationId]
      );
    }

    console.log("✅ 聊天測試數據生成完成！");
    console.log("📊 統計信息:");

    // 顯示統計信息
    const [conversationCount] = await pool.execute(
      "SELECT COUNT(*) as count FROM conversations"
    );
    const [messageCount] = await pool.execute(
      "SELECT COUNT(*) as count FROM messages"
    );

    console.log(`   - 對話總數: ${conversationCount[0].count}`);
    console.log(`   - 訊息總數: ${messageCount[0].count}`);
  } catch (error) {
    console.error("❌ 生成聊天數據時發生錯誤:", error);
  }
};

// 清理現有聊天數據
const clearChatData = async () => {
  try {
    console.log("🧹 清理現有聊天數據...");

    const pool = getPool();
    await pool.execute("DELETE FROM messages");
    await pool.execute("DELETE FROM conversations");
    await pool.execute("ALTER TABLE conversations AUTO_INCREMENT = 1");
    await pool.execute("ALTER TABLE messages AUTO_INCREMENT = 1");

    console.log("✅ 聊天數據清理完成");
  } catch (error) {
    console.error("❌ 清理聊天數據時發生錯誤:", error);
  }
};

// 主函數
const main = async () => {
  try {
    // 初始化資料庫連接
    await initializeDatabase();

    // 檢查是否需要清理現有數據
    const args = process.argv.slice(2);
    if (args.includes("--clear")) {
      await clearChatData();
    }

    // 生成測試數據
    await generateConversations();
  } catch (error) {
    console.error("❌ 執行失敗:", error);
  } finally {
    // 關閉資料庫連接
    const pool = getPool();
    if (pool) {
      await pool.end();
    }
    process.exit(0);
  }
};

// 執行腳本
main();
