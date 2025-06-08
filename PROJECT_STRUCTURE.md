# sfda_nexus 專案結構

> 自動生成於: 2025/6/8 下午12:44:04

## 📋 目錄結構

```
└── 📁 sfda_nexus
    ├── 📁 backend
    │   ├── 📁 database
    │   │   ├── 📁 scripts
    │   │   │   ├── 📝 MULTIMODAL_STATUS.md
    │   │   │   ├── 📝 README.md
    │   │   │   ├── 🗃️ add_agent_services_table.sql
    │   │   │   ├── 🗃️ add_gemini_models.sql
    │   │   │   ├── 🗃️ add_llava_model.sql
    │   │   │   ├── 🗃️ add_mcp_tables.sql
    │   │   │   ├── 🗃️ add_mcp_tools_fields.sql
    │   │   │   ├── 🗃️ add_new_models.sql
    │   │   │   ├── 🗃️ add_premium_models.sql
    │   │   │   ├── 🗃️ add_quick_commands_tables.sql
    │   │   │   ├── 🗃️ add_token_blacklist.sql
    │   │   │   ├── 📜 check_admin.js
    │   │   │   ├── 📜 cleanup_duplicate_services.js
    │   │   │   ├── 📜 cleanup_orphaned_files.js
    │   │   │   ├── 🗃️ fix_all_chinese_encoding.sql
    │   │   │   ├── 🗃️ fix_gemini_chinese_encoding.sql
    │   │   │   ├── 🗃️ fix_mcp_encoding.sql
    │   │   │   ├── 🗃️ fix_mcp_encoding_final.sql
    │   │   │   ├── 📝 multimodal_test_guide.md
    │   │   │   ├── 🗃️ remove_category_from_quick_commands.sql
    │   │   │   ├── 📜 reset_admin_password.js
    │   │   │   ├── 📜 seed_chat_data.js
    │   │   │   ├── 📜 seed_data.js
    │   │   │   ├── 📜 setup_database.js
    │   │   │   ├── 📜 sync_mcp_services.js
    │   │   │   ├── 📜 test_api_structure.js
    │   │   │   ├── 📜 test_avatar_update.js
    │   │   │   ├── 📜 test_file_upload.js
    │   │   │   ├── 📜 test_full_login.js
    │   │   │   ├── 📜 test_llava_multimodal.js
    │   │   │   ├── 📜 test_login.js
    │   │   │   ├── 📜 test_login_debug.js
    │   │   │   ├── 📜 test_model_params.js
    │   │   │   ├── 📜 test_multimodal.js
    │   │   │   ├── 📜 test_print_sql.js
    │   │   │   ├── 📜 test_quickcommands_refactor.js
    │   │   │   ├── 📜 test_status_toggle.js
    │   │   │   ├── 📜 test_stream.js
    │   │   │   ├── 📜 test_sync.js
    │   │   │   ├── 📜 test_users_api.js
    │   │   │   └── 📜 test_users_table.js
    │   │   ├── 📜 create_admin.js
    │   │   └── 🗃️ schema.sql
    │   ├── 📁 src
    │   │   ├── 📁 config
    │   │   │   ├── 📜 app.config.js
    │   │   │   ├── 📜 cors.config.js
    │   │   │   ├── 📜 database.config.js
    │   │   │   └── 📜 swagger.config.js
    │   │   ├── 📁 controllers
    │   │   │   ├── 📜 agents.controller.js
    │   │   │   ├── 📜 auth.controller.js
    │   │   │   ├── 📜 chat.controller.js
    │   │   │   ├── 📜 files.controller.js
    │   │   │   ├── 📜 mcpAgents.controller.js
    │   │   │   ├── 📜 mcpServices.controller.js
    │   │   │   ├── 📜 mcpTools.controller.js
    │   │   │   ├── 📜 models.controller.js
    │   │   │   ├── 📜 quickCommands.controller.js
    │   │   │   ├── 📜 system.controller.js
    │   │   │   └── 📜 users.controller.js
    │   │   ├── 📁 docs
    │   │   │   ├── 📁 schemas
    │   │   │   └── 📁 swagger
    │   │   ├── 📁 middleware
    │   │   │   ├── 📜 auth.middleware.js
    │   │   │   ├── 📜 errorHandler.middleware.js
    │   │   │   ├── 📜 logger.middleware.js
    │   │   │   └── 📜 rateLimit.middleware.js
    │   │   ├── 📁 models
    │   │   │   ├── 📜 Conversation.model.js
    │   │   │   ├── 📜 File.model.js
    │   │   │   ├── 📜 McpService.model.js
    │   │   │   ├── 📜 McpTool.model.js
    │   │   │   ├── 📜 Message.model.js
    │   │   │   ├── 📜 Model.model.js
    │   │   │   ├── 📜 QuickCommand.model.js
    │   │   │   └── 📜 User.model.js
    │   │   ├── 📁 routes
    │   │   │   ├── 📜 admin.route.js
    │   │   │   ├── 📜 agents.route.js
    │   │   │   ├── 📜 auth.route.js
    │   │   │   ├── 📜 chat.route.js
    │   │   │   ├── 📜 files.route.js
    │   │   │   ├── 📜 index.route.js
    │   │   │   ├── 📜 mcpAgents.route.js
    │   │   │   ├── 📜 mcpServices.route.js
    │   │   │   ├── 📜 mcpTools.route.js
    │   │   │   ├── 📜 models.route.js
    │   │   │   ├── 📜 quickCommands.route.js
    │   │   │   ├── 📜 system.route.js
    │   │   │   └── 📜 users.route.js
    │   │   ├── 📁 services
    │   │   │   ├── 📜 ai.service.js
    │   │   │   ├── 📜 chat.service.js
    │   │   │   ├── 📜 mcp.service.js
    │   │   │   ├── 📜 mcpDiscovery.service.js
    │   │   │   ├── 📜 mcpSync.service.js
    │   │   │   └── 📜 mcpToolParser.service.js
    │   │   ├── 📁 utils
    │   │   │   ├── 📜 jwt.util.js
    │   │   │   └── 📜 logger.util.js
    │   │   └── 📁 websocket
    │   │       ├── 📜 chat.handler.js
    │   │       └── 📜 index.js
    │   ├── 📁 tests
    │   │   ├── 📁 e2e
    │   │   ├── 📁 fixtures
    │   │   ├── 📁 integration
    │   │   ├── 📁 setup
    │   │   └── 📁 unit
    │   ├── 🔑 .env
    │   ├── 📜 debug_chat_error.js
    │   ├── 📄 package-lock.json
    │   ├── 📦 package.json
    │   ├── 📜 reset_admin_password.js
    │   └── 📜 server.js
    ├── 📁 docs
    │   ├── 📁 mcp
    │   │   ├── 📝 mcp_database.md
    │   │   ├── 📝 mcp_endpoints.md
    │   │   └── 📝 nexus_mcp_todo.md
    │   ├── 📁 plan
    │   │   ├── 📝 01_項目概述.md
    │   │   ├── 📝 02_前端設計規劃.md
    │   │   ├── 📝 03_後端設計規劃.md
    │   │   ├── 📝 04_資料庫設計規劃.md
    │   │   ├── 📝 05_開發階段規劃.md
    │   │   └── 📝 06_Docker部署配置.md
    │   ├── 📁 ui_research
    │   │   ├── 📁 imgs
    │   │   │   ├── 📄 chatbot_com.png-2025-05-30T02-23-29-025Z.png
    │   │   │   ├── 📄 cherry_ai.png-2025-05-30T02-22-04-497Z.png
    │   │   │   ├── 📄 dribbble_ai_chatbot.png-2025-05-30T02-23-57-310Z.png
    │   │   │   ├── 📄 eleken_chatbot.png-2025-05-30T02-23-03-849Z.png
    │   │   │   └── 📄 tidio_chatbot.png-2025-05-30T02-22-33-847Z.png
    │   │   └── 🌐 ui_research.html
    │   ├── 📝 MCP如何實作範例.md
    │   ├── 📝 admin-dark-mode-fix.md
    │   ├── 📝 系統開發計劃.md
    │   └── 📝 虛擬角色實做說明.md
    ├── 📁 frontend
    │   ├── 📁 public
    │   │   ├── 📄 config.json
    │   │   ├── 📄 favicon.ico
    │   │   └── 📄 flexium_logo.png
    │   ├── 📁 src
    │   │   ├── 📁 api
    │   │   │   ├── 📜 agents.js
    │   │   │   ├── 📜 auth.js
    │   │   │   ├── 📜 chat.js
    │   │   │   ├── 📜 files.js
    │   │   │   ├── 📜 index.js
    │   │   │   ├── 📜 mcp.js
    │   │   │   ├── 📜 models.js
    │   │   │   ├── 📜 quickCommands.js
    │   │   │   ├── 📜 system.js
    │   │   │   └── 📜 users.js
    │   │   ├── 📁 assets
    │   │   │   ├── 📁 icons
    │   │   │   ├── 📁 images
    │   │   │   └── 📁 styles
    │   │   │       ├── 🎨 admin.css
    │   │   │       ├── 🎨 components.css
    │   │   │       ├── 🎨 main.css
    │   │   │       └── 🎨 variables.css
    │   │   ├── 📁 components
    │   │   │   ├── 📁 admin
    │   │   │   │   └── 💚 McpAgentPermissions.vue
    │   │   │   ├── 📁 common
    │   │   │   │   ├── 💚 AvatarUpload.vue
    │   │   │   │   ├── 💚 CodeHighlight-copy.vue
    │   │   │   │   ├── 💚 CodeHighlight-test.vue
    │   │   │   │   ├── 💚 CodeHighlight.vue
    │   │   │   │   ├── 💚 FileAnalysisCard.vue
    │   │   │   │   ├── 💚 FilePreview.vue
    │   │   │   │   ├── 💚 IconButton.vue
    │   │   │   │   ├── 💚 JsonHighlight.vue
    │   │   │   │   ├── 💚 JsonViewer.vue
    │   │   │   │   ├── 💚 Logo.vue
    │   │   │   │   └── 💚 StatusTag.vue
    │   │   │   ├── 📁 workflow
    │   │   │   └── 💚 AppSidebar.vue
    │   │   ├── 📁 layouts
    │   │   │   ├── 💚 AdminLayout.vue
    │   │   │   └── 💚 MainLayout.vue
    │   │   ├── 📁 router
    │   │   │   └── 📜 index.js
    │   │   ├── 📁 stores
    │   │   │   ├── 📜 agents.js
    │   │   │   ├── 📜 app.js
    │   │   │   ├── 📜 auth.js
    │   │   │   ├── 📜 chat.js
    │   │   │   ├── 📜 config.js
    │   │   │   ├── 📜 models.js
    │   │   │   ├── 📜 websocket.js
    │   │   │   └── 📜 workflows.js
    │   │   ├── 📁 test
    │   │   │   ├── 📜 test_duplicate_fix.js
    │   │   │   ├── 📜 test_file_upload.js
    │   │   │   ├── 📜 test_login_debug.js
    │   │   │   ├── 📜 test_mcp_sync.js
    │   │   │   ├── 📜 test_simple_enable.js
    │   │   │   ├── 📜 test_stream_improvements.js
    │   │   │   └── 📜 test_system_prompt.js
    │   │   ├── 📁 utils
    │   │   │   ├── 📜 dataConverter.js
    │   │   │   ├── 📜 datetimeFormat.js
    │   │   │   ├── 📜 debugAuth.js
    │   │   │   └── 📜 imageCompress.js
    │   │   ├── 📁 views
    │   │   │   ├── 📁 admin
    │   │   │   │   ├── 💚 McpServices.vue
    │   │   │   │   ├── 💚 agents.vue
    │   │   │   │   ├── 💚 index.vue
    │   │   │   │   ├── 💚 models.vue
    │   │   │   │   ├── 💚 quickCommands.vue
    │   │   │   │   ├── 💚 system.vue
    │   │   │   │   └── 💚 users.vue
    │   │   │   ├── 📁 auth
    │   │   │   │   └── 📁 components
    │   │   │   │       ├── 💚 Login.vue
    │   │   │   │       └── 💚 Register.vue
    │   │   │   ├── 📁 chat
    │   │   │   │   ├── 📁 components
    │   │   │   │   │   ├── 💚 ChatArea.vue
    │   │   │   │   │   ├── 💚 ConversationList.vue
    │   │   │   │   │   ├── 💚 MessageBubble.vue
    │   │   │   │   │   ├── 💚 ModelSelector.vue
    │   │   │   │   │   └── 💚 WelcomeScreen.vue
    │   │   │   │   └── 💚 index.vue
    │   │   │   ├── 📁 dashboard
    │   │   │   │   └── 💚 index.vue
    │   │   │   ├── 📁 error
    │   │   │   │   └── 💚 NotFound.vue
    │   │   │   ├── 📁 playground
    │   │   │   │   └── 💚 index.vue
    │   │   │   ├── 📁 settings
    │   │   │   │   ├── 📁 components
    │   │   │   │   │   ├── 💚 AppearanceSettings.vue
    │   │   │   │   │   ├── 💚 ChatSettings.vue
    │   │   │   │   │   ├── 💚 NotificationSettings.vue
    │   │   │   │   │   └── 💚 SecuritySettings.vue
    │   │   │   │   ├── 💚 Settings.vue
    │   │   │   │   └── 💚 index.vue
    │   │   │   └── 📁 user
    │   │   │       ├── 📁 components
    │   │   │       │   └── 💚 ProfileForm.vue
    │   │   │       └── 💚 index.vue
    │   │   ├── 💚 App.vue
    │   │   └── 📜 main.js
    │   ├── 📘 auto-imports.d.ts
    │   ├── 📘 components.d.ts
    │   ├── 🌐 index.html
    │   ├── 📄 package-lock.json
    │   ├── 📦 package.json
    │   ├── 🌐 test-highlight.html
    │   └── ⚡ vite.config.js
    ├── 📝 DEV_SCRIPTS_README.md
    ├── 📝 README.md
    ├── 📝 TODO.md
    ├── 📜 generate-structure-simple.js
    ├── 📜 generate-structure.js
    ├── 📦 package.json
    ├── 📜 platform-check.js
    ├── 📄 sfda_nexus_mcpserver.code-workspace
    ├── 📜 start-dev-concurrent.js
    ├── ⚙️ start-dev.bat
    ├── 📜 start-dev.js
    ├── 💻 start-dev.ps1
    ├── 🐚 start-dev.sh
    └── 📜 test-models-api.js
```

## 📊 專案統計

- **總目錄數**: 56
- **總檔案數**: 219

## 📂 主要目錄說明

- **📁 frontend/** - 前端應用程式 (Vue.js + Vite)
- **📁 backend/** - 後端 API 服務 (Node.js + Express)
- **📁 docs/** - 專案文檔和說明
- **📜 start-dev.*** - 開發環境啟動腳本 (多平台支援)

## 📝 說明

這個文件是由 `generate-structure.js` 腳本自動生成的，包含了整個專案的目錄結構。

### 使用方式

```bash
# 重新生成專案結構文件
node generate-structure.js
```

### 注意事項

- 排除了 node_modules、.git、logs 等不必要的目錄
- 僅顯示專案開發相關的重要檔案
- 最大掃描深度限制為 8 層

---

*最後更新: 2025/6/8 下午12:44:04*
