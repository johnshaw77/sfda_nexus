當然可以！以下是**Markdown 格式**的資料表設計說明與建表語法，方便你直接存成 `.md` 檔案使用。

---

# MCP 資料表結構設計（MySQL）

## mcp_services（主表）

| 欄位名稱     | 資料型態                       | 說明           |
| ------------ | ------------------------------ | -------------- |
| id           | INT PRIMARY KEY AUTO_INCREMENT | 主鍵，自動編號 |
| name         | VARCHAR(100)                   | 服務名稱       |
| endpoint_url | VARCHAR(255)                   | 服務 API 入口  |
| description  | VARCHAR(255)                   | 服務描述       |
| is_active    | TINYINT(1)                     | 是否啟用       |
| version      | INT                            | 版本號         |
| owner        | VARCHAR(100)                   | 擁有者         |
| icon         | VARCHAR(255) (可 null)         | 圖示           |
| is_deleted   | TINYINT(1)                     | 軟刪除         |
| created_at   | DATETIME                       | 建立時間       |
| updated_at   | DATETIME                       | 更新時間       |

```sql
CREATE TABLE mcp_services (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    endpoint_url VARCHAR(255),
    description VARCHAR(255),
    is_active TINYINT(1) DEFAULT 1,
    version INT DEFAULT 1,
    owner VARCHAR(100),
    is_deleted TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

---

## mcp_tools（子表）

| 欄位名稱       | 資料型態                       | 說明                 |
| -------------- | ------------------------------ | -------------------- |
| id             | INT PRIMARY KEY AUTO_INCREMENT | 主鍵，自動編號       |
| mcp_service_id | INT                            | 對應 mcp_services.id |
| name           | VARCHAR(100)                   | 工具名稱             |
| description    | VARCHAR(255)                   | 工具描述             |
| input_schema   | JSON                           | 工具輸入參數結構     |
| is_enabled     | TINYINT(1)                     | 是否啟用             |
| is_deleted     | TINYINT(1)                     | 軟刪除               |
| created_at     | DATETIME                       | 建立時間             |
| updated_at     | DATETIME                       | 更新時間             |

```sql
CREATE TABLE mcp_tools (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mcp_service_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    input_schema JSON,
    is_enabled TINYINT(1) DEFAULT 1,
    is_deleted TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (mcp_service_id) REFERENCES mcp_services(id)
);
```

---
