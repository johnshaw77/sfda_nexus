import { initializeDatabase } from "../../src/config/database.config.js";
import chatService from "../../src/services/chat.service.js";

async function clearChatCache() {
  console.log("🔄 清除聊天服務快取");

  try {
    await initializeDatabase();
    
    // 清除系統提示詞快取
    chatService.clearCache();
    
    console.log("✅ 快取已清除，新的系統提示詞將在下次對話時生效");
    
    process.exit(0);
  } catch (error) {
    console.error("❌ 清除快取失敗:", error);
    process.exit(1);
  }
}

clearChatCache(); 