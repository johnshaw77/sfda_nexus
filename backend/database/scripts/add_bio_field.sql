-- 為 users 表添加 bio（個人簡介）欄位
-- 執行命令：docker exec -i mysql-server mysql -u root -pMyPwd@1234 --default-character-set=utf8mb4 sfda_nexus < backend/database/scripts/add_bio_field.sql

USE sfda_nexus;

-- 添加 bio 欄位到 users 表
ALTER TABLE users 
ADD COLUMN bio TEXT DEFAULT NULL COMMENT '個人簡介' 
AFTER phone;

-- 驗證欄位已添加
DESCRIBE users;

-- 顯示成功訊息
SELECT 'bio 欄位已成功添加到 users 表' AS result; 