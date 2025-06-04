-- 添加快速命令詞系統的資料庫表結構
-- 支援智能體關聯和未來的用戶個性化功能

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 快速命令詞主表
CREATE TABLE quick_commands (
    id INT AUTO_INCREMENT PRIMARY KEY,
    command_text VARCHAR(200) NOT NULL COMMENT '命令詞文字',
    description TEXT DEFAULT NULL COMMENT '命令說明',
    category VARCHAR(50) DEFAULT 'general' COMMENT '分類 (general, education, sports, nutrition, finance, travel, reading, business)',
    icon VARCHAR(50) DEFAULT NULL COMMENT '圖標名稱',
    usage_count INT DEFAULT 0 COMMENT '使用次數統計',
    is_active BOOLEAN DEFAULT TRUE COMMENT '是否啟用',
    is_system BOOLEAN DEFAULT TRUE COMMENT '是否為系統預設命令',
    created_by INT DEFAULT NULL COMMENT '創建者ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '創建時間',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新時間',
    
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_category (category),
    INDEX idx_active (is_active),
    INDEX idx_system (is_system),
    INDEX idx_usage_count (usage_count)
) ENGINE=InnoDB COMMENT='快速命令詞主表';

-- 智能體快速命令詞關聯表
CREATE TABLE agent_quick_commands (
    id INT AUTO_INCREMENT PRIMARY KEY,
    agent_id INT NOT NULL COMMENT '智能體ID',
    quick_command_id INT NOT NULL COMMENT '快速命令詞ID',
    display_order INT DEFAULT 0 COMMENT '顯示順序',
    is_enabled BOOLEAN DEFAULT TRUE COMMENT '該智能體是否啟用此命令',
    custom_text VARCHAR(200) DEFAULT NULL COMMENT '智能體自定義文字（可選，覆蓋原始文字）',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '創建時間',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新時間',
    
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
    FOREIGN KEY (quick_command_id) REFERENCES quick_commands(id) ON DELETE CASCADE,
    UNIQUE KEY unique_agent_command (agent_id, quick_command_id),
    INDEX idx_agent_id (agent_id),
    INDEX idx_display_order (display_order),
    INDEX idx_enabled (is_enabled)
) ENGINE=InnoDB COMMENT='智能體快速命令詞關聯表';

-- 用戶快速命令詞表（未來擴展用）
CREATE TABLE user_quick_commands (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL COMMENT '用戶ID',
    agent_id INT DEFAULT NULL COMMENT '特定智能體的個性化（可選）',
    quick_command_id INT DEFAULT NULL COMMENT '基於現有命令的個性化（可選）',
    custom_command_text VARCHAR(200) NOT NULL COMMENT '用戶自定義命令文字',
    description TEXT DEFAULT NULL COMMENT '用戶自定義說明',
    display_order INT DEFAULT 0 COMMENT '顯示順序',
    usage_count INT DEFAULT 0 COMMENT '使用次數',
    is_active BOOLEAN DEFAULT TRUE COMMENT '是否啟用',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '創建時間',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新時間',
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
    FOREIGN KEY (quick_command_id) REFERENCES quick_commands(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_agent_id (agent_id),
    INDEX idx_active (is_active),
    INDEX idx_usage_count (usage_count)
) ENGINE=InnoDB COMMENT='用戶自定義快速命令詞表';

-- 插入系統預設的快速命令詞
INSERT INTO quick_commands (command_text, description, category, is_system) VALUES 
-- 教育類命令
('解釋一個複雜的概念', '請 AI 助手解釋困難的概念和原理', 'education', TRUE),
('幫我學習新知識', '協助學習新的知識點和技能', 'education', TRUE),
('分析這個問題', '深入分析問題的各個方面', 'education', TRUE),

-- 體育類命令
('分析球隊表現', '分析體育球隊的表現和戰術', 'sports', TRUE),
('預測比賽結果', '基於數據預測體育比賽結果', 'sports', TRUE),
('球員數據分析', '分析運動員的表現數據', 'sports', TRUE),

-- 營養類命令
('制定健康飲食計劃', '根據需求制定個性化飲食方案', 'nutrition', TRUE),
('分析營養成分', '分析食物或餐點的營養價值', 'nutrition', TRUE),
('推薦健康食譜', '推薦營養均衡的健康食譜', 'nutrition', TRUE),

-- 金融類命令
('投資建議', '提供投資理財的專業建議', 'finance', TRUE),
('理財規劃', '制定個人或家庭理財計劃', 'finance', TRUE),
('市場分析', '分析金融市場趨勢和機會', 'finance', TRUE),

-- 旅遊類命令
('規劃旅行路線', '設計詳細的旅遊行程安排', 'travel', TRUE),
('推薦旅遊景點', '推薦值得參觀的景點和活動', 'travel', TRUE),
('酒店預訂建議', '提供住宿選擇和預訂建議', 'travel', TRUE),

-- 閱讀類命令
('推薦好書', '根據興趣推薦優質書籍', 'reading', TRUE),
('書籍評論', '分析和評論書籍內容', 'reading', TRUE),
('閱讀計劃', '制定系統性的閱讀計劃', 'reading', TRUE),

-- 商業類命令
('商業策略分析', '分析商業策略和發展方向', 'business', TRUE),
('市場調研', '進行市場調研和競爭分析', 'business', TRUE),
('商業計劃書', '協助撰寫商業計劃書', 'business', TRUE),

-- 通用命令
('幫我解決問題', '協助解決各種疑難問題', 'general', TRUE),
('創意思維', '激發創意和頭腦風暴', 'general', TRUE),
('寫作協助', '協助寫作和文案創作', 'general', TRUE);

-- 為現有智能體配置快速命令詞（基於原有的硬編碼邏輯）
-- Arthur - 教育專家 (假設 ID 為 1)
INSERT INTO agent_quick_commands (agent_id, quick_command_id, display_order) 
SELECT 1, id, 
  CASE 
    WHEN command_text = '解釋一個複雜的概念' THEN 1
    WHEN command_text = '幫我學習新知識' THEN 2
    WHEN command_text = '分析這個問題' THEN 3
  END
FROM quick_commands 
WHERE command_text IN ('解釋一個複雜的概念', '幫我學習新知識', '分析這個問題');

-- Fred - 體育分析師 (假設 ID 為 2)
INSERT INTO agent_quick_commands (agent_id, quick_command_id, display_order)
SELECT 2, id,
  CASE 
    WHEN command_text = '分析球隊表現' THEN 1
    WHEN command_text = '預測比賽結果' THEN 2
    WHEN command_text = '球員數據分析' THEN 3
  END
FROM quick_commands 
WHERE command_text IN ('分析球隊表現', '預測比賽結果', '球員數據分析');

-- Nikki - 營養師 (假設 ID 為 3)
INSERT INTO agent_quick_commands (agent_id, quick_command_id, display_order)
SELECT 3, id,
  CASE 
    WHEN command_text = '制定健康飲食計劃' THEN 1
    WHEN command_text = '分析營養成分' THEN 2
    WHEN command_text = '推薦健康食譜' THEN 3
  END
FROM quick_commands 
WHERE command_text IN ('制定健康飲食計劃', '分析營養成分', '推薦健康食譜');

-- Rich - 金融顧問 (假設 ID 為 4)
INSERT INTO agent_quick_commands (agent_id, quick_command_id, display_order)
SELECT 4, id,
  CASE 
    WHEN command_text = '投資建議' THEN 1
    WHEN command_text = '理財規劃' THEN 2
    WHEN command_text = '市場分析' THEN 3
  END
FROM quick_commands 
WHERE command_text IN ('投資建議', '理財規劃', '市場分析');

-- Travis - 旅遊專家 (假設 ID 為 5)
INSERT INTO agent_quick_commands (agent_id, quick_command_id, display_order)
SELECT 5, id,
  CASE 
    WHEN command_text = '規劃旅行路線' THEN 1
    WHEN command_text = '推薦旅遊景點' THEN 2
    WHEN command_text = '酒店預訂建議' THEN 3
  END
FROM quick_commands 
WHERE command_text IN ('規劃旅行路線', '推薦旅遊景點', '酒店預訂建議');

-- Libby - 閱讀顧問 (假設 ID 為 6)
INSERT INTO agent_quick_commands (agent_id, quick_command_id, display_order)
SELECT 6, id,
  CASE 
    WHEN command_text = '推薦好書' THEN 1
    WHEN command_text = '書籍評論' THEN 2
    WHEN command_text = '閱讀計劃' THEN 3
  END
FROM quick_commands 
WHERE command_text IN ('推薦好書', '書籍評論', '閱讀計劃');

-- Bizzy - 商業顧問 (假設 ID 為 7)
INSERT INTO agent_quick_commands (agent_id, quick_command_id, display_order)
SELECT 7, id,
  CASE 
    WHEN command_text = '商業策略分析' THEN 1
    WHEN command_text = '市場調研' THEN 2
    WHEN command_text = '商業計劃書' THEN 3
  END
FROM quick_commands 
WHERE command_text IN ('商業策略分析', '市場調研', '商業計劃書');

-- 檢查插入結果
SELECT 
  'quick_commands' as table_name,
  COUNT(*) as count
FROM quick_commands
UNION ALL
SELECT 
  'agent_quick_commands' as table_name,
  COUNT(*) as count
FROM agent_quick_commands;

-- 檢查智能體關聯的快速命令詞
SELECT 
  a.display_name as agent_name,
  qc.command_text,
  qc.category,
  aqc.display_order,
  aqc.is_enabled
FROM agent_quick_commands aqc
JOIN agents a ON aqc.agent_id = a.id
JOIN quick_commands qc ON aqc.quick_command_id = qc.id
WHERE aqc.is_enabled = TRUE
ORDER BY a.id, aqc.display_order; 