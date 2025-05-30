-- 添加令牌黑名單表
-- 用於管理被撤銷的 JWT 令牌

CREATE TABLE IF NOT EXISTS token_blacklist (
    id INT AUTO_INCREMENT PRIMARY KEY,
    token VARCHAR(500) NOT NULL COMMENT '被列入黑名單的令牌',
    user_id INT DEFAULT NULL COMMENT '用戶ID',
    reason VARCHAR(100) DEFAULT NULL COMMENT '列入黑名單的原因',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '創建時間',
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token(255)),
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB COMMENT='令牌黑名單表';

-- 檢查表是否創建成功
SELECT 'token_blacklist 表創建成功' as result; 