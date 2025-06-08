# sfda_nexus 資料庫 Schema 文檔

> 自動生成於: 2025/6/8 下午1:26:59

## 📊 資料庫概覽

- **資料庫名稱**: `sfda_nexus`
- **主機**: `localhost:3306`
- **總資料表數**: 17
- **字符集**: `utf8mb4`

## 📋 資料表清單

| 資料表名稱 | 說明 | 引擎 | 建立時間 |
|------------|------|------|----------|
| [`agent_quick_commands`](#-agent_quick_commands) | 智能體快速命令詞關聯表 | InnoDB | 2025/6/4 |
| [`agents`](#-agents) | 智能體表 | InnoDB | 2025/5/30 |
| [`ai_models`](#-ai_models) | AI模型配置表 | InnoDB | 2025/5/30 |
| [`audit_logs`](#-audit_logs) | 操作日誌表 | InnoDB | 2025/5/30 |
| [`conversations`](#-conversations) | 對話表 | InnoDB | 2025/5/30 |
| [`files`](#-files) | 檔案表 | InnoDB | 2025/5/30 |
| [`mcp_agent_services`](#-mcp_agent_services) | æ™ºèƒ½é«”æœå‹™æ¬Šé™è¡¨ | InnoDB | 2025/6/7 |
| [`mcp_services`](#-mcp_services) | MCP æœå‹™è¡¨ | InnoDB | 2025/6/7 |
| [`mcp_tools`](#-mcp_tools) | MCP å·¥å…·è¡¨ | InnoDB | 2025/6/7 |
| [`messages`](#-messages) | 對話訊息表 | InnoDB | 2025/5/30 |
| [`quick_commands`](#-quick_commands) | 快速命令詞主表 | InnoDB | 2025/6/6 |
| [`system_configs`](#-system_configs) | 系統配置表 | InnoDB | 2025/5/30 |
| [`token_blacklist`](#-token_blacklist) | ä»¤ç‰Œé»‘åå–®è¡¨ | InnoDB | 2025/5/30 |
| [`user_quick_commands`](#-user_quick_commands) | 用戶自定義快速命令詞表 | InnoDB | 2025/6/4 |
| [`user_sessions`](#-user_sessions) | 用戶會話表 | InnoDB | 2025/5/30 |
| [`users`](#-users) | 用戶表 | InnoDB | 2025/5/30 |
| [`workflow_templates`](#-workflow_templates) | 工作流模板表 | InnoDB | 2025/5/30 |

---

## 📝 詳細結構

### 📋 agent_quick_commands

**說明**: 智能體快速命令詞關聯表

**引擎**: InnoDB | **字符集**: utf8mb4_unicode_ci

#### 📝 欄位結構

| 欄位名稱 | 類型 | 說明 | 鍵值 |
|----------|------|------|------|
| `id` | `int NOT NULL AUTO_INCREMENT` | - | 🔑 主鍵 |
| `agent_id` | `int NOT NULL` | 智能體ID | 🔗 索引 |
| `quick_command_id` | `int NOT NULL` | 快速命令詞ID | 🔗 索引 |
| `display_order` | `int DEFAULT '0'` | 顯示順序 | 🔗 索引 |
| `is_enabled` | `tinyint(1) DEFAULT '1'` | 該智能體是否啟用此命令 | 🔗 索引 |
| `custom_text` | `varchar(200)` | 智能體自定義文字（可選，覆蓋原始文字） |  |
| `created_at` | `timestamp DEFAULT CURRENT_TIMESTAMP` | 創建時間 |  |
| `updated_at` | `timestamp DEFAULT CURRENT_TIMESTAMP` | 更新時間 |  |

#### 🗂️ 索引

| 索引名稱 | 類型 | 欄位 | 說明 |
|----------|------|------|------|
| `idx_agent_id` | 🔗 一般索引 | `agent_id` | - |
| `idx_display_order` | 🔗 一般索引 | `display_order` | - |
| `idx_enabled` | 🔗 一般索引 | `is_enabled` | - |
| `PRIMARY` | 🔑 主鍵 | `id` | - |
| `quick_command_id` | 🔗 一般索引 | `quick_command_id` | - |
| `unique_agent_command` | 🔒 唯一索引 | `agent_id, quick_command_id` | - |

#### 🔗 外鍵關聯

| 約束名稱 | 本表欄位 | 參考資料表 | 參考欄位 |
|----------|----------|------------|----------|
| `agent_quick_commands_ibfk_1` | `agent_id` | `agents` | `id` |
| `agent_quick_commands_ibfk_2` | `quick_command_id` | `quick_commands` | `id` |

---

### 📋 agents

**說明**: 智能體表

**引擎**: InnoDB | **字符集**: utf8mb4_unicode_ci

#### 📝 欄位結構

| 欄位名稱 | 類型 | 說明 | 鍵值 |
|----------|------|------|------|
| `id` | `int NOT NULL AUTO_INCREMENT` | - | 🔑 主鍵 |
| `name` | `varchar(100) NOT NULL` | 智能體名稱 | 🔒 唯一 |
| `display_name` | `varchar(200) NOT NULL` | 顯示名稱 |  |
| `description` | `text` | 智能體描述 |  |
| `avatar` | `text` | 智能體頭像 |  |
| `system_prompt` | `text NOT NULL` | 系統提示詞 |  |
| `model_id` | `int NOT NULL` | 關聯的AI模型ID | 🔗 索引 |
| `category` | `varchar(50) DEFAULT 'general'` | 智能體分類 | 🔗 索引 |
| `tags` | `json` | 標籤 |  |
| `capabilities` | `json` | 能力配置 |  |
| `tools` | `json` | 可用工具配置 |  |
| `is_active` | `tinyint(1) DEFAULT '1'` | 是否啟用 | 🔗 索引 |
| `is_public` | `tinyint(1) DEFAULT '1'` | 是否公開 | 🔗 索引 |
| `usage_count` | `int DEFAULT '0'` | 使用次數 | 🔗 索引 |
| `rating` | `decimal(3,2) DEFAULT '0.00'` | 評分 | 🔗 索引 |
| `rating_count` | `int DEFAULT '0'` | 評分次數 |  |
| `created_by` | `int NOT NULL` | 創建者ID | 🔗 索引 |
| `created_at` | `timestamp DEFAULT CURRENT_TIMESTAMP` | 創建時間 |  |
| `updated_at` | `timestamp DEFAULT CURRENT_TIMESTAMP` | 更新時間 |  |

#### 🗂️ 索引

| 索引名稱 | 類型 | 欄位 | 說明 |
|----------|------|------|------|
| `created_by` | 🔗 一般索引 | `created_by` | - |
| `idx_active` | 🔗 一般索引 | `is_active` | - |
| `idx_category` | 🔗 一般索引 | `category` | - |
| `idx_model_id` | 🔗 一般索引 | `model_id` | - |
| `idx_public` | 🔗 一般索引 | `is_public` | - |
| `idx_rating` | 🔗 一般索引 | `rating` | - |
| `idx_usage_count` | 🔗 一般索引 | `usage_count` | - |
| `name` | 🔒 唯一索引 | `name` | - |
| `PRIMARY` | 🔑 主鍵 | `id` | - |

#### 🔗 外鍵關聯

| 約束名稱 | 本表欄位 | 參考資料表 | 參考欄位 |
|----------|----------|------------|----------|
| `agents_ibfk_1` | `model_id` | `ai_models` | `id` |
| `agents_ibfk_2` | `created_by` | `users` | `id` |

---

### 📋 ai_models

**說明**: AI模型配置表

**引擎**: InnoDB | **字符集**: utf8mb4_unicode_ci

#### 📝 欄位結構

| 欄位名稱 | 類型 | 說明 | 鍵值 |
|----------|------|------|------|
| `id` | `int NOT NULL AUTO_INCREMENT` | - | 🔑 主鍵 |
| `name` | `varchar(100) NOT NULL` | 模型名稱 | 🔒 唯一 |
| `display_name` | `varchar(200) NOT NULL` | 顯示名稱 |  |
| `description` | `text` | 模型描述 |  |
| `model_type` | `enum('ollama','gemini','openai','claude','custom') NOT NULL` | 模型類型 | 🔗 索引 |
| `model_id` | `varchar(200) NOT NULL` | 模型標識符 |  |
| `endpoint_url` | `varchar(500)` | 端點URL |  |
| `api_key_encrypted` | `text` | 加密的API密鑰 |  |
| `is_active` | `tinyint(1) DEFAULT '1'` | 是否啟用 | 🔗 索引 |
| `is_default` | `tinyint(1) DEFAULT '0'` | 是否為預設模型 | 🔗 索引 |
| `is_multimodal` | `tinyint(1) DEFAULT '0'` | 是否支援多模態 |  |
| `max_tokens` | `int DEFAULT '4096'` | 最大token數 |  |
| `temperature` | `decimal(3,2) DEFAULT '0.70'` | 溫度參數 |  |
| `top_p` | `decimal(3,2) DEFAULT '0.90'` | Top-p參數 |  |
| `pricing` | `json` | 定價信息 |  |
| `capabilities` | `json` | 模型能力配置 |  |
| `usage_count` | `int DEFAULT '0'` | 使用次數 | 🔗 索引 |
| `total_tokens_used` | `bigint DEFAULT '0'` | 總使用token數 |  |
| `created_by` | `int` | 創建者ID | 🔗 索引 |
| `created_at` | `timestamp DEFAULT CURRENT_TIMESTAMP` | 創建時間 |  |
| `updated_at` | `timestamp DEFAULT CURRENT_TIMESTAMP` | 更新時間 |  |

#### 🗂️ 索引

| 索引名稱 | 類型 | 欄位 | 說明 |
|----------|------|------|------|
| `created_by` | 🔗 一般索引 | `created_by` | - |
| `idx_active` | 🔗 一般索引 | `is_active` | - |
| `idx_default` | 🔗 一般索引 | `is_default` | - |
| `idx_model_type` | 🔗 一般索引 | `model_type` | - |
| `idx_usage_count` | 🔗 一般索引 | `usage_count` | - |
| `name` | 🔒 唯一索引 | `name` | - |
| `PRIMARY` | 🔑 主鍵 | `id` | - |

#### 🔗 外鍵關聯

| 約束名稱 | 本表欄位 | 參考資料表 | 參考欄位 |
|----------|----------|------------|----------|
| `ai_models_ibfk_1` | `created_by` | `users` | `id` |

---

### 📋 audit_logs

**說明**: 操作日誌表

**引擎**: InnoDB | **字符集**: utf8mb4_unicode_ci

#### 📝 欄位結構

| 欄位名稱 | 類型 | 說明 | 鍵值 |
|----------|------|------|------|
| `id` | `int NOT NULL AUTO_INCREMENT` | - | 🔑 主鍵 |
| `user_id` | `int` | 操作用戶ID | 🔗 索引 |
| `action` | `varchar(100) NOT NULL` | 操作類型 | 🔗 索引 |
| `resource_type` | `varchar(50)` | 資源類型 | 🔗 索引 |
| `resource_id` | `int` | 資源ID |  |
| `details` | `json` | 操作詳情 |  |
| `ip_address` | `varchar(45)` | IP地址 |  |
| `user_agent` | `text` | 用戶代理 |  |
| `created_at` | `timestamp DEFAULT CURRENT_TIMESTAMP` | 創建時間 | 🔗 索引 |

#### 🗂️ 索引

| 索引名稱 | 類型 | 欄位 | 說明 |
|----------|------|------|------|
| `idx_action` | 🔗 一般索引 | `action` | - |
| `idx_created_at` | 🔗 一般索引 | `created_at` | - |
| `idx_resource` | 🔗 一般索引 | `resource_type, resource_id` | - |
| `idx_user_id` | 🔗 一般索引 | `user_id` | - |
| `PRIMARY` | 🔑 主鍵 | `id` | - |

#### 🔗 外鍵關聯

| 約束名稱 | 本表欄位 | 參考資料表 | 參考欄位 |
|----------|----------|------------|----------|
| `audit_logs_ibfk_1` | `user_id` | `users` | `id` |

---

### 📋 conversations

**說明**: 對話表

**引擎**: InnoDB | **字符集**: utf8mb4_unicode_ci

#### 📝 欄位結構

| 欄位名稱 | 類型 | 說明 | 鍵值 |
|----------|------|------|------|
| `id` | `int NOT NULL AUTO_INCREMENT` | - | 🔑 主鍵 |
| `user_id` | `int NOT NULL` | 用戶ID | 🔗 索引 |
| `agent_id` | `int` | 智能體ID（可選） | 🔗 索引 |
| `model_id` | `int NOT NULL` | AI模型ID | 🔗 索引 |
| `title` | `varchar(200) DEFAULT '新對話'` | 對話標題 |  |
| `summary` | `text` | 對話摘要 |  |
| `context` | `json` | 對話上下文配置 |  |
| `message_count` | `int DEFAULT '0'` | 訊息數量 |  |
| `total_tokens` | `int DEFAULT '0'` | 總token使用量 |  |
| `total_cost` | `decimal(10,6) DEFAULT '0.000000'` | 總費用 |  |
| `status` | `enum('active','archived','deleted') DEFAULT 'active'` | 對話狀態 | 🔗 索引 |
| `is_pinned` | `tinyint(1) DEFAULT '0'` | 是否置頂 |  |
| `last_message_at` | `timestamp DEFAULT CURRENT_TIMESTAMP` | 最後訊息時間 | 🔗 索引 |
| `created_at` | `timestamp DEFAULT CURRENT_TIMESTAMP` | 創建時間 | 🔗 索引 |
| `updated_at` | `timestamp DEFAULT CURRENT_TIMESTAMP` | 更新時間 |  |

#### 🗂️ 索引

| 索引名稱 | 類型 | 欄位 | 說明 |
|----------|------|------|------|
| `idx_agent_id` | 🔗 一般索引 | `agent_id` | - |
| `idx_created_at` | 🔗 一般索引 | `created_at` | - |
| `idx_last_message_at` | 🔗 一般索引 | `last_message_at` | - |
| `idx_model_id` | 🔗 一般索引 | `model_id` | - |
| `idx_status` | 🔗 一般索引 | `status` | - |
| `idx_user_id` | 🔗 一般索引 | `user_id` | - |
| `PRIMARY` | 🔑 主鍵 | `id` | - |

#### 🔗 外鍵關聯

| 約束名稱 | 本表欄位 | 參考資料表 | 參考欄位 |
|----------|----------|------------|----------|
| `conversations_ibfk_1` | `user_id` | `users` | `id` |
| `conversations_ibfk_2` | `agent_id` | `agents` | `id` |
| `conversations_ibfk_3` | `model_id` | `ai_models` | `id` |

---

### 📋 files

**說明**: 檔案表

**引擎**: InnoDB | **字符集**: utf8mb4_unicode_ci

#### 📝 欄位結構

| 欄位名稱 | 類型 | 說明 | 鍵值 |
|----------|------|------|------|
| `id` | `int NOT NULL AUTO_INCREMENT` | - | 🔑 主鍵 |
| `user_id` | `int NOT NULL` | 上傳用戶ID | 🔗 索引 |
| `filename` | `varchar(255) NOT NULL` | 原始檔案名 |  |
| `stored_filename` | `varchar(255) NOT NULL` | 存儲檔案名 |  |
| `file_path` | `varchar(500) NOT NULL` | 檔案路徑 |  |
| `file_size` | `bigint NOT NULL` | 檔案大小(bytes) |  |
| `mime_type` | `varchar(100) NOT NULL` | MIME類型 |  |
| `file_hash` | `varchar(64) NOT NULL` | 檔案雜湊值 | 🔗 索引 |
| `file_type` | `enum('avatar','attachment','document','image') NOT NULL` | 檔案類型 | 🔗 索引 |
| `metadata` | `json` | 檔案元數據 |  |
| `is_public` | `tinyint(1) DEFAULT '0'` | 是否公開 |  |
| `download_count` | `int DEFAULT '0'` | 下載次數 |  |
| `created_at` | `timestamp DEFAULT CURRENT_TIMESTAMP` | 創建時間 | 🔗 索引 |

#### 🗂️ 索引

| 索引名稱 | 類型 | 欄位 | 說明 |
|----------|------|------|------|
| `idx_created_at` | 🔗 一般索引 | `created_at` | - |
| `idx_file_hash` | 🔗 一般索引 | `file_hash` | - |
| `idx_file_type` | 🔗 一般索引 | `file_type` | - |
| `idx_user_id` | 🔗 一般索引 | `user_id` | - |
| `PRIMARY` | 🔑 主鍵 | `id` | - |

#### 🔗 外鍵關聯

| 約束名稱 | 本表欄位 | 參考資料表 | 參考欄位 |
|----------|----------|------------|----------|
| `files_ibfk_1` | `user_id` | `users` | `id` |

---

### 📋 mcp_agent_services

**說明**: æ™ºèƒ½é«”æœå‹™æ¬Šé™è¡¨

**引擎**: InnoDB | **字符集**: utf8mb4_unicode_ci

#### 📝 欄位結構

| 欄位名稱 | 類型 | 說明 | 鍵值 |
|----------|------|------|------|
| `id` | `int NOT NULL AUTO_INCREMENT` | - | 🔑 主鍵 |
| `agent_id` | `int NOT NULL` | æ™ºèƒ½é«”ID | 🔗 索引 |
| `mcp_service_id` | `int NOT NULL` | MCPæœå‹™ID | 🔗 索引 |
| `is_active` | `tinyint(1) DEFAULT '1'` | æ˜¯å¦å•Ÿç”¨ (1=å•Ÿç”¨, 0=åœç”¨) |  |
| `created_at` | `datetime DEFAULT CURRENT_TIMESTAMP` | å»ºç«‹æ™‚é–“ |  |
| `updated_at` | `datetime DEFAULT CURRENT_TIMESTAMP` | æ›´æ–°æ™‚é–“ |  |

#### 🗂️ 索引

| 索引名稱 | 類型 | 欄位 | 說明 |
|----------|------|------|------|
| `idx_mcp_agent_services_agent` | 🔗 一般索引 | `agent_id, is_active` | - |
| `idx_mcp_agent_services_service` | 🔗 一般索引 | `mcp_service_id, is_active` | - |
| `PRIMARY` | 🔑 主鍵 | `id` | - |
| `unique_agent_service` | 🔒 唯一索引 | `agent_id, mcp_service_id` | - |

#### 🔗 外鍵關聯

| 約束名稱 | 本表欄位 | 參考資料表 | 參考欄位 |
|----------|----------|------------|----------|
| `mcp_agent_services_ibfk_1` | `agent_id` | `agents` | `id` |
| `mcp_agent_services_ibfk_2` | `mcp_service_id` | `mcp_services` | `id` |

---

### 📋 mcp_services

**說明**: MCP æœå‹™è¡¨

**引擎**: InnoDB | **字符集**: utf8mb4_unicode_ci

#### 📝 欄位結構

| 欄位名稱 | 類型 | 說明 | 鍵值 |
|----------|------|------|------|
| `id` | `int NOT NULL AUTO_INCREMENT` | - | 🔑 主鍵 |
| `name` | `varchar(100) NOT NULL` | MCP æœå‹™åç¨± | 🔗 索引 |
| `endpoint_url` | `varchar(255)` | MCP æœå‹™ç«¯é»ž URL |  |
| `description` | `varchar(255)` | MCP æœå‹™æè¿° |  |
| `is_active` | `tinyint(1) DEFAULT '1'` | æ˜¯å¦å•Ÿç”¨ (1=å•Ÿç”¨, 0=åœç”¨) | 🔗 索引 |
| `version` | `int DEFAULT '1'` | MCP æœå‹™ç‰ˆæœ¬è™Ÿ |  |
| `owner` | `varchar(100)` | æœå‹™æ“æœ‰è€… | 🔗 索引 |
| `icon` | `varchar(255)` | æœå‹™åœ–ç¤º URL |  |
| `is_deleted` | `tinyint(1) DEFAULT '0'` | è»Ÿåˆªé™¤æ¨™è¨˜ (1=å·²åˆªé™¤, 0=æ­£å¸¸) |  |
| `created_at` | `datetime DEFAULT CURRENT_TIMESTAMP` | å»ºç«‹æ™‚é–“ |  |
| `updated_at` | `datetime DEFAULT CURRENT_TIMESTAMP` | æ›´æ–°æ™‚é–“ |  |

#### 🗂️ 索引

| 索引名稱 | 類型 | 欄位 | 說明 |
|----------|------|------|------|
| `idx_mcp_services_active` | 🔗 一般索引 | `is_active, is_deleted` | - |
| `idx_mcp_services_name` | 🔗 一般索引 | `name` | - |
| `idx_mcp_services_owner` | 🔗 一般索引 | `owner` | - |
| `PRIMARY` | 🔑 主鍵 | `id` | - |

---

### 📋 mcp_tools

**說明**: MCP å·¥å…·è¡¨

**引擎**: InnoDB | **字符集**: utf8mb4_unicode_ci

#### 📝 欄位結構

| 欄位名稱 | 類型 | 說明 | 鍵值 |
|----------|------|------|------|
| `id` | `int NOT NULL AUTO_INCREMENT` | - | 🔑 主鍵 |
| `mcp_service_id` | `int NOT NULL` | å°æ‡‰çš„ MCP æœå‹™ ID | 🔗 索引 |
| `name` | `varchar(100) NOT NULL` | MCP å·¥å…·åç¨± | 🔗 索引 |
| `description` | `varchar(255)` | MCP å·¥å…·æè¿° |  |
| `version` | `varchar(20) DEFAULT '1.0.0'` | å·¥å…·ç‰ˆæœ¬è™Ÿ |  |
| `input_schema` | `json` | å·¥å…·è¼¸å…¥åƒæ•¸çµæ§‹ï¼ˆJSON æ ¼å¼ï¼‰ |  |
| `cacheable` | `tinyint(1) DEFAULT '0'` | æ˜¯å¦å¯ç·©å­˜ |  |
| `cache_ttl` | `int DEFAULT '0'` | ç·©å­˜æ™‚é–“ï¼ˆæ¯«ç§’ï¼‰ |  |
| `stats` | `json` | å·¥å…·çµ±è¨ˆä¿¡æ¯ |  |
| `priority` | `int DEFAULT '1'` | å„ªå…ˆç´šï¼Œæ•¸å­—è¶Šå¤§å„ªå…ˆç´šè¶Šé«˜ |  |
| `usage_count` | `int DEFAULT '0'` | ä½¿ç”¨æ¬¡æ•¸çµ±è¨ˆ | 🔗 索引 |
| `last_executed_at` | `datetime` | æœ€å¾ŒåŸ·è¡Œæ™‚é–“ |  |
| `success_count` | `int DEFAULT '0'` | åŸ·è¡ŒæˆåŠŸæ¬¡æ•¸ |  |
| `error_count` | `int DEFAULT '0'` | åŸ·è¡Œå¤±æ•—æ¬¡æ•¸ |  |
| `is_enabled` | `tinyint(1) DEFAULT '1'` | æ˜¯å¦å•Ÿç”¨ (1=å•Ÿç”¨, 0=åœç”¨) |  |
| `is_deleted` | `tinyint(1) DEFAULT '0'` | è»Ÿåˆªé™¤æ¨™è¨˜ (1=å·²åˆªé™¤, 0=æ­£å¸¸) |  |
| `created_at` | `datetime DEFAULT CURRENT_TIMESTAMP` | å»ºç«‹æ™‚é–“ |  |
| `updated_at` | `datetime DEFAULT CURRENT_TIMESTAMP` | æ›´æ–°æ™‚é–“ |  |

#### 🗂️ 索引

| 索引名稱 | 類型 | 欄位 | 說明 |
|----------|------|------|------|
| `idx_mcp_tools_enabled` | 🔗 一般索引 | `mcp_service_id, is_enabled, is_deleted` | - |
| `idx_mcp_tools_name` | 🔗 一般索引 | `name` | - |
| `idx_mcp_tools_service` | 🔗 一般索引 | `mcp_service_id` | - |
| `idx_mcp_tools_usage` | 🔗 一般索引 | `usage_count` | - |
| `PRIMARY` | 🔑 主鍵 | `id` | - |
| `uk_mcp_tools_service_name` | 🔒 唯一索引 | `mcp_service_id, name` | - |

#### 🔗 外鍵關聯

| 約束名稱 | 本表欄位 | 參考資料表 | 參考欄位 |
|----------|----------|------------|----------|
| `mcp_tools_ibfk_1` | `mcp_service_id` | `mcp_services` | `id` |

---

### 📋 messages

**說明**: 對話訊息表

**引擎**: InnoDB | **字符集**: utf8mb4_unicode_ci

#### 📝 欄位結構

| 欄位名稱 | 類型 | 說明 | 鍵值 |
|----------|------|------|------|
| `id` | `int NOT NULL AUTO_INCREMENT` | - | 🔑 主鍵 |
| `conversation_id` | `int NOT NULL` | 對話ID | 🔗 索引 |
| `role` | `enum('user','assistant','system') NOT NULL` | 角色 | 🔗 索引 |
| `content` | `text NOT NULL` | 訊息內容 |  |
| `content_type` | `enum('text','image','file','mixed') DEFAULT 'text'` | 內容類型 | 🔗 索引 |
| `attachments` | `json` | 附件信息 |  |
| `metadata` | `json` | 額外元數據 |  |
| `tokens_used` | `int DEFAULT '0'` | 使用的token數 |  |
| `cost` | `decimal(8,6) DEFAULT '0.000000'` | 費用 |  |
| `model_info` | `json` | 模型調用信息 |  |
| `processing_time` | `int DEFAULT '0'` | 處理時間(毫秒) |  |
| `is_edited` | `tinyint(1) DEFAULT '0'` | 是否已編輯 |  |
| `is_deleted` | `tinyint(1) DEFAULT '0'` | 是否已刪除 |  |
| `parent_message_id` | `int` | 父訊息ID（用於分支對話） | 🔗 索引 |
| `created_at` | `timestamp DEFAULT CURRENT_TIMESTAMP` | 創建時間 | 🔗 索引 |
| `updated_at` | `timestamp DEFAULT CURRENT_TIMESTAMP` | 更新時間 |  |

#### 🗂️ 索引

| 索引名稱 | 類型 | 欄位 | 說明 |
|----------|------|------|------|
| `idx_content_type` | 🔗 一般索引 | `content_type` | - |
| `idx_conversation_id` | 🔗 一般索引 | `conversation_id` | - |
| `idx_created_at` | 🔗 一般索引 | `created_at` | - |
| `idx_parent_message_id` | 🔗 一般索引 | `parent_message_id` | - |
| `idx_role` | 🔗 一般索引 | `role` | - |
| `PRIMARY` | 🔑 主鍵 | `id` | - |

#### 🔗 外鍵關聯

| 約束名稱 | 本表欄位 | 參考資料表 | 參考欄位 |
|----------|----------|------------|----------|
| `messages_ibfk_1` | `conversation_id` | `conversations` | `id` |
| `messages_ibfk_2` | `parent_message_id` | `messages` | `id` |

---

### 📋 quick_commands

**說明**: 快速命令詞主表

**引擎**: InnoDB | **字符集**: utf8mb4_unicode_ci

#### 📝 欄位結構

| 欄位名稱 | 類型 | 說明 | 鍵值 |
|----------|------|------|------|
| `id` | `int NOT NULL AUTO_INCREMENT` | - | 🔑 主鍵 |
| `command_text` | `varchar(200) NOT NULL` | 命令詞文字 |  |
| `description` | `text` | 命令說明 |  |
| `icon` | `varchar(50)` | 圖標名稱 |  |
| `usage_count` | `int DEFAULT '0'` | 使用次數統計 | 🔗 索引 |
| `is_active` | `tinyint(1) DEFAULT '1'` | 是否啟用 | 🔗 索引 |
| `is_system` | `tinyint(1) DEFAULT '1'` | 是否為系統預設命令 | 🔗 索引 |
| `created_by` | `int` | 創建者ID | 🔗 索引 |
| `created_at` | `timestamp DEFAULT CURRENT_TIMESTAMP` | 創建時間 |  |
| `updated_at` | `timestamp DEFAULT CURRENT_TIMESTAMP` | 更新時間 |  |

#### 🗂️ 索引

| 索引名稱 | 類型 | 欄位 | 說明 |
|----------|------|------|------|
| `created_by` | 🔗 一般索引 | `created_by` | - |
| `idx_active` | 🔗 一般索引 | `is_active` | - |
| `idx_system` | 🔗 一般索引 | `is_system` | - |
| `idx_usage_count` | 🔗 一般索引 | `usage_count` | - |
| `PRIMARY` | 🔑 主鍵 | `id` | - |

#### 🔗 外鍵關聯

| 約束名稱 | 本表欄位 | 參考資料表 | 參考欄位 |
|----------|----------|------------|----------|
| `quick_commands_ibfk_1` | `created_by` | `users` | `id` |

---

### 📋 system_configs

**說明**: 系統配置表

**引擎**: InnoDB | **字符集**: utf8mb4_unicode_ci

#### 📝 欄位結構

| 欄位名稱 | 類型 | 說明 | 鍵值 |
|----------|------|------|------|
| `id` | `int NOT NULL AUTO_INCREMENT` | - | 🔑 主鍵 |
| `config_key` | `varchar(100) NOT NULL` | 配置鍵 | 🔒 唯一 |
| `config_value` | `text` | 配置值 |  |
| `config_type` | `enum('string','number','boolean','json') DEFAULT 'string'` | 配置類型 |  |
| `description` | `text` | 配置描述 |  |
| `is_public` | `tinyint(1) DEFAULT '0'` | 是否公開 | 🔗 索引 |
| `updated_by` | `int` | 更新者ID | 🔗 索引 |
| `created_at` | `timestamp DEFAULT CURRENT_TIMESTAMP` | 創建時間 |  |
| `updated_at` | `timestamp DEFAULT CURRENT_TIMESTAMP` | 更新時間 |  |

#### 🗂️ 索引

| 索引名稱 | 類型 | 欄位 | 說明 |
|----------|------|------|------|
| `config_key` | 🔒 唯一索引 | `config_key` | - |
| `idx_config_key` | 🔗 一般索引 | `config_key` | - |
| `idx_is_public` | 🔗 一般索引 | `is_public` | - |
| `PRIMARY` | 🔑 主鍵 | `id` | - |
| `updated_by` | 🔗 一般索引 | `updated_by` | - |

#### 🔗 外鍵關聯

| 約束名稱 | 本表欄位 | 參考資料表 | 參考欄位 |
|----------|----------|------------|----------|
| `system_configs_ibfk_1` | `updated_by` | `users` | `id` |

---

### 📋 token_blacklist

**說明**: ä»¤ç‰Œé»‘åå–®è¡¨

**引擎**: InnoDB | **字符集**: utf8mb4_unicode_ci

#### 📝 欄位結構

| 欄位名稱 | 類型 | 說明 | 鍵值 |
|----------|------|------|------|
| `id` | `int NOT NULL AUTO_INCREMENT` | - | 🔑 主鍵 |
| `token` | `varchar(500) NOT NULL` | è¢«åˆ—å…¥é»‘åå–®çš„ä»¤ç‰Œ | 🔗 索引 |
| `user_id` | `int` | ç”¨æˆ¶ID | 🔗 索引 |
| `reason` | `varchar(100)` | åˆ—å…¥é»‘åå–®çš„åŽŸå›  |  |
| `created_at` | `timestamp DEFAULT CURRENT_TIMESTAMP` | å‰µå»ºæ™‚é–“ | 🔗 索引 |

#### 🗂️ 索引

| 索引名稱 | 類型 | 欄位 | 說明 |
|----------|------|------|------|
| `idx_created_at` | 🔗 一般索引 | `created_at` | - |
| `idx_token` | 🔗 一般索引 | `token` | - |
| `idx_user_id` | 🔗 一般索引 | `user_id` | - |
| `PRIMARY` | 🔑 主鍵 | `id` | - |

#### 🔗 外鍵關聯

| 約束名稱 | 本表欄位 | 參考資料表 | 參考欄位 |
|----------|----------|------------|----------|
| `token_blacklist_ibfk_1` | `user_id` | `users` | `id` |

---

### 📋 user_quick_commands

**說明**: 用戶自定義快速命令詞表

**引擎**: InnoDB | **字符集**: utf8mb4_unicode_ci

#### 📝 欄位結構

| 欄位名稱 | 類型 | 說明 | 鍵值 |
|----------|------|------|------|
| `id` | `int NOT NULL AUTO_INCREMENT` | - | 🔑 主鍵 |
| `user_id` | `int NOT NULL` | 用戶ID | 🔗 索引 |
| `agent_id` | `int` | 特定智能體的個性化（可選） | 🔗 索引 |
| `quick_command_id` | `int` | 基於現有命令的個性化（可選） | 🔗 索引 |
| `custom_command_text` | `varchar(200) NOT NULL` | 用戶自定義命令文字 |  |
| `description` | `text` | 用戶自定義說明 |  |
| `display_order` | `int DEFAULT '0'` | 顯示順序 |  |
| `usage_count` | `int DEFAULT '0'` | 使用次數 | 🔗 索引 |
| `is_active` | `tinyint(1) DEFAULT '1'` | 是否啟用 | 🔗 索引 |
| `created_at` | `timestamp DEFAULT CURRENT_TIMESTAMP` | 創建時間 |  |
| `updated_at` | `timestamp DEFAULT CURRENT_TIMESTAMP` | 更新時間 |  |

#### 🗂️ 索引

| 索引名稱 | 類型 | 欄位 | 說明 |
|----------|------|------|------|
| `idx_active` | 🔗 一般索引 | `is_active` | - |
| `idx_agent_id` | 🔗 一般索引 | `agent_id` | - |
| `idx_usage_count` | 🔗 一般索引 | `usage_count` | - |
| `idx_user_id` | 🔗 一般索引 | `user_id` | - |
| `PRIMARY` | 🔑 主鍵 | `id` | - |
| `quick_command_id` | 🔗 一般索引 | `quick_command_id` | - |

#### 🔗 外鍵關聯

| 約束名稱 | 本表欄位 | 參考資料表 | 參考欄位 |
|----------|----------|------------|----------|
| `user_quick_commands_ibfk_1` | `user_id` | `users` | `id` |
| `user_quick_commands_ibfk_2` | `agent_id` | `agents` | `id` |
| `user_quick_commands_ibfk_3` | `quick_command_id` | `quick_commands` | `id` |

---

### 📋 user_sessions

**說明**: 用戶會話表

**引擎**: InnoDB | **字符集**: utf8mb4_unicode_ci

#### 📝 欄位結構

| 欄位名稱 | 類型 | 說明 | 鍵值 |
|----------|------|------|------|
| `id` | `int NOT NULL AUTO_INCREMENT` | - | 🔑 主鍵 |
| `user_id` | `int NOT NULL` | 用戶ID | 🔗 索引 |
| `token_hash` | `varchar(255) NOT NULL` | Token雜湊值 | 🔗 索引 |
| `device_info` | `varchar(500)` | 設備信息 |  |
| `ip_address` | `varchar(45)` | IP地址 |  |
| `user_agent` | `text` | 用戶代理 |  |
| `expires_at` | `timestamp NOT NULL` | 過期時間 | 🔗 索引 |
| `is_active` | `tinyint(1) DEFAULT '1'` | 是否有效 | 🔗 索引 |
| `created_at` | `timestamp DEFAULT CURRENT_TIMESTAMP` | 創建時間 |  |
| `updated_at` | `timestamp DEFAULT CURRENT_TIMESTAMP` | 更新時間 |  |

#### 🗂️ 索引

| 索引名稱 | 類型 | 欄位 | 說明 |
|----------|------|------|------|
| `idx_active` | 🔗 一般索引 | `is_active` | - |
| `idx_expires_at` | 🔗 一般索引 | `expires_at` | - |
| `idx_token_hash` | 🔗 一般索引 | `token_hash` | - |
| `idx_user_id` | 🔗 一般索引 | `user_id` | - |
| `PRIMARY` | 🔑 主鍵 | `id` | - |

#### 🔗 外鍵關聯

| 約束名稱 | 本表欄位 | 參考資料表 | 參考欄位 |
|----------|----------|------------|----------|
| `user_sessions_ibfk_1` | `user_id` | `users` | `id` |

---

### 📋 users

**說明**: 用戶表

**引擎**: InnoDB | **字符集**: utf8mb4_unicode_ci

#### 📝 欄位結構

| 欄位名稱 | 類型 | 說明 | 鍵值 |
|----------|------|------|------|
| `id` | `int NOT NULL AUTO_INCREMENT` | - | 🔑 主鍵 |
| `username` | `varchar(50) NOT NULL` | 用戶名 | 🔒 唯一 |
| `email` | `varchar(100) NOT NULL` | 電子郵件 | 🔒 唯一 |
| `password_hash` | `varchar(255) NOT NULL` | 密碼雜湊值 |  |
| `display_name` | `varchar(100)` | 顯示名稱 |  |
| `avatar` | `text` | 頭像URL |  |
| `role` | `enum('user','admin','super_admin') DEFAULT 'user'` | 用戶角色 | 🔗 索引 |
| `department` | `varchar(100)` | 部門 | 🔗 索引 |
| `position` | `varchar(100)` | 職位 |  |
| `phone` | `varchar(20)` | 電話號碼 |  |
| `is_active` | `tinyint(1) DEFAULT '1'` | 是否啟用 | 🔗 索引 |
| `email_verified` | `tinyint(1) DEFAULT '0'` | 郵箱是否驗證 |  |
| `last_login_at` | `timestamp` | 最後登入時間 |  |
| `last_login_ip` | `varchar(45)` | 最後登入IP |  |
| `login_count` | `int DEFAULT '0'` | 登入次數 |  |
| `preferences` | `json` | 用戶偏好設置 |  |
| `created_at` | `timestamp DEFAULT CURRENT_TIMESTAMP` | 創建時間 | 🔗 索引 |
| `updated_at` | `timestamp DEFAULT CURRENT_TIMESTAMP` | 更新時間 |  |

#### 🗂️ 索引

| 索引名稱 | 類型 | 欄位 | 說明 |
|----------|------|------|------|
| `email` | 🔒 唯一索引 | `email` | - |
| `idx_active` | 🔗 一般索引 | `is_active` | - |
| `idx_created_at` | 🔗 一般索引 | `created_at` | - |
| `idx_department` | 🔗 一般索引 | `department` | - |
| `idx_email` | 🔗 一般索引 | `email` | - |
| `idx_role` | 🔗 一般索引 | `role` | - |
| `idx_username` | 🔗 一般索引 | `username` | - |
| `PRIMARY` | 🔑 主鍵 | `id` | - |
| `username` | 🔒 唯一索引 | `username` | - |

---

### 📋 workflow_templates

**說明**: 工作流模板表

**引擎**: InnoDB | **字符集**: utf8mb4_unicode_ci

#### 📝 欄位結構

| 欄位名稱 | 類型 | 說明 | 鍵值 |
|----------|------|------|------|
| `id` | `int NOT NULL AUTO_INCREMENT` | - | 🔑 主鍵 |
| `name` | `varchar(100) NOT NULL` | 工作流名稱 |  |
| `display_name` | `varchar(200) NOT NULL` | 顯示名稱 |  |
| `description` | `text` | 工作流描述 |  |
| `category` | `varchar(50) DEFAULT 'general'` | 分類 | 🔗 索引 |
| `definition` | `json NOT NULL` | 工作流定義 |  |
| `input_schema` | `json` | 輸入模式定義 |  |
| `output_schema` | `json` | 輸出模式定義 |  |
| `is_active` | `tinyint(1) DEFAULT '1'` | 是否啟用 | 🔗 索引 |
| `is_public` | `tinyint(1) DEFAULT '1'` | 是否公開 | 🔗 索引 |
| `usage_count` | `int DEFAULT '0'` | 使用次數 | 🔗 索引 |
| `created_by` | `int NOT NULL` | 創建者ID | 🔗 索引 |
| `created_at` | `timestamp DEFAULT CURRENT_TIMESTAMP` | 創建時間 |  |
| `updated_at` | `timestamp DEFAULT CURRENT_TIMESTAMP` | 更新時間 |  |

#### 🗂️ 索引

| 索引名稱 | 類型 | 欄位 | 說明 |
|----------|------|------|------|
| `created_by` | 🔗 一般索引 | `created_by` | - |
| `idx_active` | 🔗 一般索引 | `is_active` | - |
| `idx_category` | 🔗 一般索引 | `category` | - |
| `idx_public` | 🔗 一般索引 | `is_public` | - |
| `idx_usage_count` | 🔗 一般索引 | `usage_count` | - |
| `PRIMARY` | 🔑 主鍵 | `id` | - |

#### 🔗 外鍵關聯

| 約束名稱 | 本表欄位 | 參考資料表 | 參考欄位 |
|----------|----------|------------|----------|
| `workflow_templates_ibfk_1` | `created_by` | `users` | `id` |

---

## 🔧 關於此文檔

此文檔由 `generate-db-schema.js` 腳本自動生成，包含了 `sfda_nexus` 資料庫的完整 schema 結構。

### 重新生成此文檔

```bash
node generate-db-schema.js
```

### 注意事項

- 此文檔反映了生成時的資料庫結構
- 如果資料庫結構有變更，請重新執行腳本更新文檔
- 包含了所有資料表、欄位、索引和外鍵關聯資訊

---

*最後更新: 2025/6/8 下午1:26:59*
