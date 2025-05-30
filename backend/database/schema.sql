-- sfda_nexus 企業AI聊天系統資料庫結構
-- 使用 UTF8MB4 字符集支持 emoji 和特殊字符

CREATE DATABASE IF NOT EXISTS sfda_nexus CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sfda_nexus;

-- =====================================
-- 用戶管理相關表
-- =====================================

-- 用戶表
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE COMMENT '用戶名',
    email VARCHAR(100) NOT NULL UNIQUE COMMENT '電子郵件',
    password_hash VARCHAR(255) NOT NULL COMMENT '密碼雜湊值',
    display_name VARCHAR(100) DEFAULT NULL COMMENT '顯示名稱',
    avatar_url VARCHAR(500) DEFAULT NULL COMMENT '頭像URL',
    role ENUM('user', 'admin', 'super_admin') DEFAULT 'user' COMMENT '用戶角色',
    department VARCHAR(100) DEFAULT NULL COMMENT '部門',
    position VARCHAR(100) DEFAULT NULL COMMENT '職位',
    phone VARCHAR(20) DEFAULT NULL COMMENT '電話號碼',
    is_active BOOLEAN DEFAULT TRUE COMMENT '是否啟用',
    email_verified BOOLEAN DEFAULT FALSE COMMENT '郵箱是否驗證',
    last_login_at TIMESTAMP NULL COMMENT '最後登入時間',
    last_login_ip VARCHAR(45) DEFAULT NULL COMMENT '最後登入IP',
    login_count INT DEFAULT 0 COMMENT '登入次數',
    preferences JSON DEFAULT NULL COMMENT '用戶偏好設置',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '創建時間',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新時間',
    
    INDEX idx_email (email),
    INDEX idx_username (username),
    INDEX idx_role (role),
    INDEX idx_department (department),
    INDEX idx_active (is_active),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB COMMENT='用戶表';

-- 用戶會話表 (用於管理 JWT Token)
CREATE TABLE user_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL COMMENT '用戶ID',
    token_hash VARCHAR(255) NOT NULL COMMENT 'Token雜湊值',
    device_info VARCHAR(500) DEFAULT NULL COMMENT '設備信息',
    ip_address VARCHAR(45) DEFAULT NULL COMMENT 'IP地址',
    user_agent TEXT DEFAULT NULL COMMENT '用戶代理',
    expires_at TIMESTAMP NOT NULL COMMENT '過期時間',
    is_active BOOLEAN DEFAULT TRUE COMMENT '是否有效',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '創建時間',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新時間',
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_token_hash (token_hash),
    INDEX idx_expires_at (expires_at),
    INDEX idx_active (is_active)
) ENGINE=InnoDB COMMENT='用戶會話表';

-- =====================================
-- AI模型管理相關表
-- =====================================

-- AI模型配置表
CREATE TABLE ai_models (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE COMMENT '模型名稱',
    display_name VARCHAR(200) NOT NULL COMMENT '顯示名稱',
    description TEXT DEFAULT NULL COMMENT '模型描述',
    model_type ENUM('ollama', 'gemini', 'openai', 'claude', 'custom') NOT NULL COMMENT '模型類型',
    model_id VARCHAR(200) NOT NULL COMMENT '模型標識符',
    endpoint_url VARCHAR(500) DEFAULT NULL COMMENT '端點URL',
    api_key_encrypted TEXT DEFAULT NULL COMMENT '加密的API密鑰',
    is_active BOOLEAN DEFAULT TRUE COMMENT '是否啟用',
    is_default BOOLEAN DEFAULT FALSE COMMENT '是否為預設模型',
    is_multimodal BOOLEAN DEFAULT FALSE COMMENT '是否支援多模態',
    max_tokens INT DEFAULT 4096 COMMENT '最大token數',
    temperature DECIMAL(3,2) DEFAULT 0.7 COMMENT '溫度參數',
    top_p DECIMAL(3,2) DEFAULT 0.9 COMMENT 'Top-p參數',
    pricing JSON DEFAULT NULL COMMENT '定價信息',
    capabilities JSON DEFAULT NULL COMMENT '模型能力配置',
    usage_count INT DEFAULT 0 COMMENT '使用次數',
    total_tokens_used BIGINT DEFAULT 0 COMMENT '總使用token數',
    created_by INT DEFAULT NULL COMMENT '創建者ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '創建時間',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新時間',
    
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_model_type (model_type),
    INDEX idx_active (is_active),
    INDEX idx_default (is_default),
    INDEX idx_usage_count (usage_count)
) ENGINE=InnoDB COMMENT='AI模型配置表';

-- =====================================
-- 智能體管理相關表
-- =====================================

-- 智能體表
CREATE TABLE agents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE COMMENT '智能體名稱',
    display_name VARCHAR(200) NOT NULL COMMENT '顯示名稱',
    description TEXT DEFAULT NULL COMMENT '智能體描述',
    avatar_url VARCHAR(500) DEFAULT NULL COMMENT '智能體頭像',
    system_prompt TEXT NOT NULL COMMENT '系統提示詞',
    model_id INT NOT NULL COMMENT '關聯的AI模型ID',
    category VARCHAR(50) DEFAULT 'general' COMMENT '智能體分類',
    tags JSON DEFAULT NULL COMMENT '標籤',
    capabilities JSON DEFAULT NULL COMMENT '能力配置',
    tools JSON DEFAULT NULL COMMENT '可用工具配置',
    is_active BOOLEAN DEFAULT TRUE COMMENT '是否啟用',
    is_public BOOLEAN DEFAULT TRUE COMMENT '是否公開',
    usage_count INT DEFAULT 0 COMMENT '使用次數',
    rating DECIMAL(3,2) DEFAULT 0.00 COMMENT '評分',
    rating_count INT DEFAULT 0 COMMENT '評分次數',
    created_by INT NOT NULL COMMENT '創建者ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '創建時間',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新時間',
    
    FOREIGN KEY (model_id) REFERENCES ai_models(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_model_id (model_id),
    INDEX idx_category (category),
    INDEX idx_active (is_active),
    INDEX idx_public (is_public),
    INDEX idx_usage_count (usage_count),
    INDEX idx_rating (rating)
) ENGINE=InnoDB COMMENT='智能體表';

-- =====================================
-- 對話管理相關表
-- =====================================

-- 對話表
CREATE TABLE conversations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL COMMENT '用戶ID',
    agent_id INT DEFAULT NULL COMMENT '智能體ID（可選）',
    model_id INT NOT NULL COMMENT 'AI模型ID',
    title VARCHAR(200) DEFAULT '新對話' COMMENT '對話標題',
    summary TEXT DEFAULT NULL COMMENT '對話摘要',
    context JSON DEFAULT NULL COMMENT '對話上下文配置',
    message_count INT DEFAULT 0 COMMENT '訊息數量',
    total_tokens INT DEFAULT 0 COMMENT '總token使用量',
    total_cost DECIMAL(10,6) DEFAULT 0.000000 COMMENT '總費用',
    status ENUM('active', 'archived', 'deleted') DEFAULT 'active' COMMENT '對話狀態',
    is_pinned BOOLEAN DEFAULT FALSE COMMENT '是否置頂',
    last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '最後訊息時間',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '創建時間',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新時間',
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL,
    FOREIGN KEY (model_id) REFERENCES ai_models(id) ON DELETE RESTRICT,
    INDEX idx_user_id (user_id),
    INDEX idx_agent_id (agent_id),
    INDEX idx_model_id (model_id),
    INDEX idx_status (status),
    INDEX idx_last_message_at (last_message_at),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB COMMENT='對話表';

-- 對話訊息表
CREATE TABLE messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conversation_id INT NOT NULL COMMENT '對話ID',
    role ENUM('user', 'assistant', 'system') NOT NULL COMMENT '角色',
    content TEXT NOT NULL COMMENT '訊息內容',
    content_type ENUM('text', 'image', 'file', 'mixed') DEFAULT 'text' COMMENT '內容類型',
    attachments JSON DEFAULT NULL COMMENT '附件信息',
    metadata JSON DEFAULT NULL COMMENT '額外元數據',
    tokens_used INT DEFAULT 0 COMMENT '使用的token數',
    cost DECIMAL(8,6) DEFAULT 0.000000 COMMENT '費用',
    model_info JSON DEFAULT NULL COMMENT '模型調用信息',
    processing_time INT DEFAULT 0 COMMENT '處理時間(毫秒)',
    is_edited BOOLEAN DEFAULT FALSE COMMENT '是否已編輯',
    is_deleted BOOLEAN DEFAULT FALSE COMMENT '是否已刪除',
    parent_message_id INT DEFAULT NULL COMMENT '父訊息ID（用於分支對話）',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '創建時間',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新時間',
    
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_message_id) REFERENCES messages(id) ON DELETE SET NULL,
    INDEX idx_conversation_id (conversation_id),
    INDEX idx_role (role),
    INDEX idx_content_type (content_type),
    INDEX idx_created_at (created_at),
    INDEX idx_parent_message_id (parent_message_id)
) ENGINE=InnoDB COMMENT='對話訊息表';

-- =====================================
-- 工作流管理相關表
-- =====================================

-- 工作流模板表
CREATE TABLE workflow_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL COMMENT '工作流名稱',
    display_name VARCHAR(200) NOT NULL COMMENT '顯示名稱',
    description TEXT DEFAULT NULL COMMENT '工作流描述',
    category VARCHAR(50) DEFAULT 'general' COMMENT '分類',
    definition JSON NOT NULL COMMENT '工作流定義',
    input_schema JSON DEFAULT NULL COMMENT '輸入模式定義',
    output_schema JSON DEFAULT NULL COMMENT '輸出模式定義',
    is_active BOOLEAN DEFAULT TRUE COMMENT '是否啟用',
    is_public BOOLEAN DEFAULT TRUE COMMENT '是否公開',
    usage_count INT DEFAULT 0 COMMENT '使用次數',
    created_by INT NOT NULL COMMENT '創建者ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '創建時間',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新時間',
    
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_category (category),
    INDEX idx_active (is_active),
    INDEX idx_public (is_public),
    INDEX idx_usage_count (usage_count)
) ENGINE=InnoDB COMMENT='工作流模板表';

-- =====================================
-- 檔案管理相關表
-- =====================================

-- 檔案表
CREATE TABLE files (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL COMMENT '上傳用戶ID',
    filename VARCHAR(255) NOT NULL COMMENT '原始檔案名',
    stored_filename VARCHAR(255) NOT NULL COMMENT '存儲檔案名',
    file_path VARCHAR(500) NOT NULL COMMENT '檔案路徑',
    file_size BIGINT NOT NULL COMMENT '檔案大小(bytes)',
    mime_type VARCHAR(100) NOT NULL COMMENT 'MIME類型',
    file_hash VARCHAR(64) NOT NULL COMMENT '檔案雜湊值',
    file_type ENUM('avatar', 'attachment', 'document', 'image') NOT NULL COMMENT '檔案類型',
    metadata JSON DEFAULT NULL COMMENT '檔案元數據',
    is_public BOOLEAN DEFAULT FALSE COMMENT '是否公開',
    download_count INT DEFAULT 0 COMMENT '下載次數',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '創建時間',
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_file_type (file_type),
    INDEX idx_file_hash (file_hash),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB COMMENT='檔案表';

-- =====================================
-- 系統管理相關表
-- =====================================

-- 系統配置表
CREATE TABLE system_configs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL UNIQUE COMMENT '配置鍵',
    config_value TEXT DEFAULT NULL COMMENT '配置值',
    config_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string' COMMENT '配置類型',
    description TEXT DEFAULT NULL COMMENT '配置描述',
    is_public BOOLEAN DEFAULT FALSE COMMENT '是否公開',
    updated_by INT DEFAULT NULL COMMENT '更新者ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '創建時間',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新時間',
    
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_config_key (config_key),
    INDEX idx_is_public (is_public)
) ENGINE=InnoDB COMMENT='系統配置表';

-- 操作日誌表
CREATE TABLE audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT DEFAULT NULL COMMENT '操作用戶ID',
    action VARCHAR(100) NOT NULL COMMENT '操作類型',
    resource_type VARCHAR(50) DEFAULT NULL COMMENT '資源類型',
    resource_id INT DEFAULT NULL COMMENT '資源ID',
    details JSON DEFAULT NULL COMMENT '操作詳情',
    ip_address VARCHAR(45) DEFAULT NULL COMMENT 'IP地址',
    user_agent TEXT DEFAULT NULL COMMENT '用戶代理',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '創建時間',
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_action (action),
    INDEX idx_resource (resource_type, resource_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB COMMENT='操作日誌表';

-- =====================================
-- 插入預設數據
-- =====================================

-- 預設管理員用戶 (密碼: admin123)
INSERT INTO users (username, email, password_hash, display_name, role, is_active, email_verified) VALUES
('admin', 'admin@sfda-nexus.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeukPKqRvJFz.HLlS', '系統管理員', 'super_admin', TRUE, TRUE);

-- 預設AI模型配置
INSERT INTO ai_models (name, display_name, description, model_type, model_id, is_active, is_default, max_tokens) VALUES
('gemini-2.0-flash', 'Gemini 2.0 Flash', 'Google最新多模態AI模型', 'gemini', 'gemini-2.0-flash', TRUE, TRUE, 8192),
('qwen3-30b', 'Qwen 3 30B', '阿里巴巴通義千問大模型', 'ollama', 'qwen3:30b', TRUE, FALSE, 32768);

-- 預設智能體
INSERT INTO agents (name, display_name, description, system_prompt, model_id, category, is_active, is_public, created_by) VALUES
('general-assistant', '通用助手', '一個友善的通用AI助手，可以協助處理各種問題', '你是一個專業、友善且樂於助人的AI助手。請用繁體中文回應用戶，提供準確、有用的信息和建議。', 1, 'general', TRUE, TRUE, 1),
('code-helper', '程式開發助手', '專業的程式開發助手，精通多種程式語言', '你是一個專業的程式開發助手，精通各種程式語言和開發框架。請提供準確的程式碼建議、除錯協助和最佳實踐指導。', 1, 'development', TRUE, TRUE, 1);

-- 預設系統配置
INSERT INTO system_configs (config_key, config_value, config_type, description, is_public) VALUES
('site_name', 'sfda_nexus', 'string', '網站名稱', TRUE),
('max_file_size', '10485760', 'number', '最大檔案上傳大小(bytes)', FALSE),
('default_model_id', '1', 'number', '預設AI模型ID', FALSE),
('registration_enabled', 'true', 'boolean', '是否開放註冊', FALSE); 