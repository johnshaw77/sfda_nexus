/**
 * 數據填充腳本
 * 插入 AI 模型配置和生成測試數據
 */

import mysql from "mysql2/promise";
import bcrypt from "bcrypt";
import { fileURLToPath } from "url";
import { dirname } from "path";

// 獲取當前文件的目錄路徑
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 載入環境變數
const loadEnv = async () => {
  try {
    const fs = await import("fs");
    const path = await import("path");
    const envPath = path.join(__dirname, ".env");
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, "utf8");
      envContent.split("\n").forEach((line) => {
        const [key, value] = line.split("=");
        if (key && value) {
          process.env[key.trim()] = value.trim();
        }
      });
    }
  } catch (error) {
    console.warn("載入環境變數失敗:", error.message);
  }
};

await loadEnv();

// 資料庫配置
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: "sfda_nexus",
  charset: "utf8mb4",
};

// AI 模型配置數據
const aiModelsData = [
  {
    name: "gemini-2.0-flash",
    display_name: "Gemini 2.0 Flash",
    description: "Google 最新的多模態 AI 模型，支援文字、圖像和語音處理",
    model_type: "gemini",
    model_id: "gemini-2.0-flash",
    endpoint_url: process.env.GEMINI_API_URL,
    api_key_encrypted: process.env.GEMINI_API_KEY, // 實際應用中需要加密
    is_active: true,
    is_default: true,
    is_multimodal: true,
    max_tokens: 8192,
    temperature: 0.7,
    top_p: 0.9,
    pricing: JSON.stringify({
      input_cost_per_1k: 0.0015,
      output_cost_per_1k: 0.006,
      currency: "USD",
    }),
    capabilities: JSON.stringify({
      text_generation: true,
      image_understanding: true,
      code_generation: true,
      reasoning: true,
      multimodal: true,
    }),
  },
  {
    name: "qwen3-30b",
    display_name: "Qwen 3 30B",
    description: "阿里巴巴通義千問 3 代 30B 參數模型，本地部署",
    model_type: "ollama",
    model_id: "qwen3:30b",
    endpoint_url: process.env.OLLAMA_BASE_URL,
    is_active: true,
    is_default: false,
    is_multimodal: false,
    max_tokens: 4096,
    temperature: 0.7,
    top_p: 0.9,
    pricing: JSON.stringify({
      input_cost_per_1k: 0,
      output_cost_per_1k: 0,
      currency: "USD",
      note: "本地部署，無額外費用",
    }),
    capabilities: JSON.stringify({
      text_generation: true,
      chinese_support: true,
      code_generation: true,
      reasoning: true,
      local_deployment: true,
    }),
  },
  {
    name: "gpt-4o",
    display_name: "GPT-4 Omni",
    description: "OpenAI 的多模態旗艦模型",
    model_type: "openai",
    model_id: "gpt-4o",
    endpoint_url: "https://api.openai.com/v1/chat/completions",
    api_key_encrypted: process.env.OPENAI_API_KEY || "placeholder",
    is_active: false,
    is_default: false,
    is_multimodal: true,
    max_tokens: 4096,
    temperature: 0.7,
    top_p: 0.9,
    pricing: JSON.stringify({
      input_cost_per_1k: 0.005,
      output_cost_per_1k: 0.015,
      currency: "USD",
    }),
    capabilities: JSON.stringify({
      text_generation: true,
      image_understanding: true,
      code_generation: true,
      reasoning: true,
      multimodal: true,
    }),
  },
  {
    name: "claude-3-5-sonnet",
    display_name: "Claude 3.5 Sonnet",
    description: "Anthropic 的高性能 AI 助手",
    model_type: "claude",
    model_id: "claude-3-5-sonnet-20241022",
    endpoint_url: "https://api.anthropic.com/v1/messages",
    api_key_encrypted: process.env.ANTHROPIC_API_KEY || "placeholder",
    is_active: false,
    is_default: false,
    is_multimodal: true,
    max_tokens: 4096,
    temperature: 0.7,
    top_p: 0.9,
    pricing: JSON.stringify({
      input_cost_per_1k: 0.003,
      output_cost_per_1k: 0.015,
      currency: "USD",
    }),
    capabilities: JSON.stringify({
      text_generation: true,
      image_understanding: true,
      code_generation: true,
      reasoning: true,
      analysis: true,
    }),
  },
];

// 系統配置數據
const systemConfigsData = [
  {
    config_key: "system_name",
    config_value: process.env.SYSTEM_NAME || "SFDA Nexus",
    config_type: "string",
    description: "系統名稱",
  },
  {
    config_key: "system_version",
    config_value: process.env.SYSTEM_VERSION || "1.4.0",
    config_type: "string",
    description: "系統版本",
  },
  {
    config_key: "max_conversation_history",
    config_value: "50",
    config_type: "number",
    description: "對話歷史記錄最大條數",
  },
  {
    config_key: "default_model_temperature",
    config_value: "0.7",
    config_type: "number",
    description: "默認模型溫度參數",
  },
  {
    config_key: "max_file_upload_size",
    config_value: process.env.MAX_FILE_SIZE || "10485760",
    config_type: "number",
    description: "最大檔案上傳大小（位元組）",
  },
  {
    config_key: "session_timeout",
    config_value: "7200",
    config_type: "number",
    description: "會話超時時間（秒）",
  },
  {
    config_key: "enable_audit_log",
    config_value: "true",
    config_type: "boolean",
    description: "是否啟用審計日誌",
  },
  {
    config_key: "default_theme",
    config_value: "light",
    config_type: "string",
    description: "默認主題模式",
  },
  {
    config_key: "enable_notifications",
    config_value: "true",
    config_type: "boolean",
    description: "是否啟用通知功能",
  },
  {
    config_key: "maintenance_mode",
    config_value: "false",
    config_type: "boolean",
    description: "維護模式開關",
  },
];

// 生成隨機用戶數據
const generateUsers = async (count = 10) => {
  const users = [];
  const departments = [
    "技術部",
    "產品部",
    "市場部",
    "人事部",
    "財務部",
    "運營部",
  ];
  const positions = [
    "工程師",
    "產品經理",
    "設計師",
    "分析師",
    "專員",
    "主管",
    "經理",
  ];

  for (let i = 1; i <= count; i++) {
    const username = `user${i.toString().padStart(3, "0")}`;
    const email = `${username}@sfdanexus.com`;
    const passwordHash = await bcrypt.hash("password123", 10);
    const department =
      departments[Math.floor(Math.random() * departments.length)];
    const position = positions[Math.floor(Math.random() * positions.length)];

    users.push({
      username,
      email,
      password_hash: passwordHash,
      display_name: `測試用戶 ${i}`,
      role: Math.random() > 0.9 ? "admin" : "user",
      department,
      position,
      phone: `09${Math.floor(Math.random() * 100000000)
        .toString()
        .padStart(8, "0")}`,
      is_active: Math.random() > 0.1,
      email_verified: Math.random() > 0.2,
      preferences: JSON.stringify({
        theme: Math.random() > 0.5 ? "light" : "dark",
        language: "zh-TW",
        notifications: Math.random() > 0.3,
      }),
    });
  }

  return users;
};

// 生成隨機智能體數據
const generateAgents = (count = 10) => {
  const categories = [
    "assistant",
    "coding",
    "writing",
    "analysis",
    "creative",
    "support",
  ];
  const agents = [];

  const agentTemplates = [
    {
      name: "code-assistant",
      display_name: "程式碼助手",
      description: "專業的程式設計助手，擅長多種程式語言",
      system_prompt:
        "你是一個專業的程式設計助手，擅長 JavaScript、Python、Java 等多種程式語言。請提供清晰、高效的程式碼解決方案。",
      category: "coding",
    },
    {
      name: "writing-expert",
      display_name: "寫作專家",
      description: "專業的文案寫作和內容創作助手",
      system_prompt:
        "你是一個專業的寫作專家，擅長各種文體的寫作，包括商業文案、技術文檔、創意寫作等。",
      category: "writing",
    },
    {
      name: "data-analyst",
      display_name: "數據分析師",
      description: "專業的數據分析和商業智能助手",
      system_prompt: `你是一個專業的數據分析師，擅長數據處理、統計分析和商業洞察。

🎯 **重要工作流程規則：**
1. **第一次回應只能包含工具調用**
   - 如果需要進行統計分析，只能生成統計工具調用指令
   - 絕對不可以在工具執行前提供任何具體分析結果或數據
   - 不可以猜測或假設工具會返回什麼結果

2. **等待工具執行完成後才能回答**
   - 必須等到統計工具成功執行並返回真實數據
   - 基於工具結果進行第二次回應時才能提供具體統計分析
   - 如果工具執行失敗，明確告知用戶並停止

3. **絕對避免流式幻覺回應**
   - 不可以在工具調用過程中輸出任何推測性統計內容
   - 不可以提前描述可能的分析結果或圖表
   - 確保用戶只看到一次完整、準確的統計分析回應

🔧 **統計分析專業能力：**
- 精通描述性統計、假設檢定、相關分析
- 熟悉盒鬚圖、直方圖、散點圖等視覺化方法
- 擅長解釋統計結果並提供商業洞察
- 能夠根據數據特性選擇合適的統計方法`,
      category: "analysis",
    },
    {
      name: "creative-designer",
      display_name: "創意設計師",
      description: "創意設計和視覺藝術助手",
      system_prompt: "你是一個創意設計師，擅長視覺設計、用戶體驗和創意思維。",
      category: "creative",
    },
    {
      name: "customer-support",
      display_name: "客服助手",
      description: "專業的客戶服務和問題解決助手",
      system_prompt:
        "你是一個專業的客服助手，擅長解決客戶問題，提供友善和有效的服務。",
      category: "support",
    },
    {
      name: "project-manager",
      display_name: "專案經理",
      description: "專案管理和團隊協作助手",
      system_prompt:
        "你是一個專業的專案經理，擅長專案規劃、進度管理和團隊協調。",
      category: "assistant",
    },
    {
      name: "marketing-expert",
      display_name: "行銷專家",
      description: "數位行銷和品牌策略助手",
      system_prompt: "你是一個行銷專家，擅長數位行銷、品牌策略和市場分析。",
      category: "analysis",
    },
    {
      name: "translator",
      display_name: "翻譯助手",
      description: "多語言翻譯和本地化助手",
      system_prompt: "你是一個專業的翻譯助手，擅長中英文翻譯和多語言本地化。",
      category: "writing",
    },
    {
      name: "research-assistant",
      display_name: "研究助手",
      description: "學術研究和資料整理助手",
      system_prompt: "你是一個研究助手，擅長學術研究、資料收集和文獻整理。",
      category: "analysis",
    },
    {
      name: "general-assistant",
      display_name: "通用助手",
      description: "全能型 AI 助手，適用於各種任務",
      system_prompt: "你是一個通用 AI 助手，可以協助用戶處理各種任務和問題。",
      category: "assistant",
    },
  ];

  for (let i = 0; i < count; i++) {
    const template = agentTemplates[i % agentTemplates.length];
    const suffix =
      i >= agentTemplates.length
        ? `-${Math.floor(i / agentTemplates.length) + 1}`
        : "";

    agents.push({
      name: `${template.name}${suffix}`,
      display_name: `${template.display_name}${suffix ? ` ${Math.floor(i / agentTemplates.length) + 1}` : ""}`,
      description: template.description,
      system_prompt: template.system_prompt,
      model_id: Math.random() > 0.5 ? 1 : 2, // 隨機選擇模型
      category: template.category,
      tags: JSON.stringify(["AI", "助手", template.category]),
      capabilities: JSON.stringify({
        text_generation: true,
        conversation: true,
        task_specific: true,
      }),
      tools: JSON.stringify([]),
      is_active: Math.random() > 0.1,
      is_public: Math.random() > 0.2,
      rating: Math.round((Math.random() * 2 + 3) * 100) / 100, // 3.0-5.0
      rating_count: Math.floor(Math.random() * 100),
      created_by: 1, // admin 用戶
    });
  }

  return agents;
};

async function insertAIModels(connection) {
  console.log("📦 插入 AI 模型配置...");

  try {
    for (const model of aiModelsData) {
      const [result] = await connection.execute(
        `INSERT INTO ai_models (
          name, display_name, description, model_type, model_id, 
          endpoint_url, api_key_encrypted, is_active, is_default, 
          is_multimodal, max_tokens, temperature, top_p, 
          pricing, capabilities, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE
          display_name = VALUES(display_name),
          description = VALUES(description),
          endpoint_url = VALUES(endpoint_url),
          updated_at = NOW()`,
        [
          model.name,
          model.display_name,
          model.description,
          model.model_type,
          model.model_id,
          model.endpoint_url || null,
          model.api_key_encrypted || null,
          model.is_active,
          model.is_default,
          model.is_multimodal,
          model.max_tokens,
          model.temperature,
          model.top_p,
          model.pricing,
          model.capabilities,
        ]
      );

      console.log(
        `✅ AI 模型 ${model.display_name} 插入成功 (ID: ${result.insertId || "已存在"})`
      );
    }
  } catch (error) {
    console.error("❌ 插入 AI 模型失敗:", error.message);
    throw error;
  }
}

async function insertSystemConfigs(connection) {
  console.log("⚙️ 插入系統配置...");

  try {
    for (const config of systemConfigsData) {
      await connection.execute(
        `INSERT INTO system_configs (
          config_key, config_value, config_type, description, 
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE
          config_value = VALUES(config_value),
          config_type = VALUES(config_type),
          description = VALUES(description),
          updated_at = NOW()`,
        [
          config.config_key,
          config.config_value,
          config.config_type,
          config.description,
        ]
      );

      console.log(`✅ 系統配置 ${config.config_key} 插入成功`);
    }
  } catch (error) {
    console.error("❌ 插入系統配置失敗:", error.message);
    throw error;
  }
}

async function insertUsers(connection, count = 10) {
  console.log(`👥 生成 ${count} 個測試用戶...`);

  try {
    const users = await generateUsers(count);

    for (const user of users) {
      const [result] = await connection.execute(
        `INSERT INTO users (
          username, email, password_hash, display_name, role,
          department, position, phone, is_active, email_verified,
          preferences, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE
          display_name = VALUES(display_name),
          department = VALUES(department),
          position = VALUES(position),
          updated_at = NOW()`,
        [
          user.username,
          user.email,
          user.password_hash,
          user.display_name,
          user.role,
          user.department,
          user.position,
          user.phone,
          user.is_active,
          user.email_verified,
          user.preferences,
        ]
      );

      console.log(
        `✅ 用戶 ${user.username} 創建成功 (ID: ${result.insertId || "已存在"})`
      );
    }
  } catch (error) {
    console.error("❌ 插入用戶失敗:", error.message);
    throw error;
  }
}

async function insertAgents(connection, count = 10) {
  console.log(`🤖 生成 ${count} 個測試智能體...`);

  try {
    const agents = generateAgents(count);

    for (const agent of agents) {
      const [result] = await connection.execute(
        `INSERT INTO agents (
          name, display_name, description, system_prompt, model_id,
          category, tags, capabilities, tools, is_active, is_public,
          rating, rating_count, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE
          display_name = VALUES(display_name),
          description = VALUES(description),
          system_prompt = VALUES(system_prompt),
          updated_at = NOW()`,
        [
          agent.name,
          agent.display_name,
          agent.description,
          agent.system_prompt,
          agent.model_id,
          agent.category,
          agent.tags,
          agent.capabilities,
          agent.tools,
          agent.is_active,
          agent.is_public,
          agent.rating,
          agent.rating_count,
          agent.created_by,
        ]
      );

      console.log(
        `✅ 智能體 ${agent.display_name} 創建成功 (ID: ${result.insertId || "已存在"})`
      );
    }
  } catch (error) {
    console.error("❌ 插入智能體失敗:", error.message);
    throw error;
  }
}

async function main() {
  let connection;

  try {
    console.log("🎯 SFDA Nexus 數據填充工具");
    console.log("=====================================");

    // 連接資料庫
    console.log("🔗 連接資料庫...");
    connection = await mysql.createConnection(dbConfig);
    console.log("✅ 資料庫連接成功");

    // 插入 AI 模型配置
    await insertAIModels(connection);

    // 插入系統配置
    await insertSystemConfigs(connection);

    // 插入測試用戶
    await insertUsers(connection, 10);

    // 插入測試智能體
    await insertAgents(connection, 10);

    console.log("\n🎉 數據填充完成！");
    console.log("=====================================");
    console.log("已插入的數據:");
    console.log("- 4 個 AI 模型配置");
    console.log("- 10 個系統配置項");
    console.log("- 10 個測試用戶");
    console.log("- 10 個測試智能體");
  } catch (error) {
    console.error("❌ 數據填充失敗:", error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log("🔌 資料庫連接已關閉");
    }
  }
}

// 如果直接執行此腳本
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
