## 🐳 Docker 部署配置

### **Dockerfile**

```dockerfile
# 多階段構建
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --only=production

COPY frontend/ ./
RUN npm run build

FROM node:18-alpine AS backend

WORKDIR /app

# 安裝後端依賴
COPY backend/package*.json ./
RUN npm ci --only=production

# 複製後端代碼
COPY backend/ ./

# 複製前端構建結果
COPY --from=frontend-builder /app/backend/public ./public

# 創建必要目錄
RUN mkdir -p uploads logs

# 設置權限
RUN chown -R node:node /app
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["npm", "start"]
```

### **docker-compose.yml**

```yaml
version: "3.8"

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DB_HOST=mysql
      - DB_NAME=sfda_nexus
      - DB_USER=sfda_user
      - DB_PASSWORD=${DB_PASSWORD}
      - JWT_SECRET=${JWT_SECRET}
      - OLLAMA_BASE_URL=http://ollama:11434
      - GEMINI_API_KEY=${GEMINI_API_KEY}
    depends_on:
      mysql:
        condition: service_healthy
      ollama:
        condition: service_started
    volumes:
      - app_uploads:/app/uploads
      - app_logs:/app/logs
    networks:
      - sfda_network
    restart: unless-stopped

  mysql:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD}
      - MYSQL_DATABASE=sfda_nexus
      - MYSQL_USER=sfda_user
      - MYSQL_PASSWORD=${DB_PASSWORD}
    volumes:
      - mysql_data:/var/lib/mysql
      - ./database/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql
      - ./database/seeds:/docker-entrypoint-initdb.d/seeds
    ports:
      - "3306:3306"
    networks:
      - sfda_network
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      timeout: 20s
      retries: 10
    restart: unless-stopped

  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    networks:
      - sfda_network
    environment:
      - OLLAMA_ORIGINS=*
    restart: unless-stopped

  # 第二期新增：向量資料庫
  qdrant:
    image: qdrant/qdrant:latest
    ports:
      - "6333:6333"
    volumes:
      - qdrant_data:/qdrant/storage
    networks:
      - sfda_network
    restart: unless-stopped
    profiles:
      - stage2

  # 監控服務 (可選)
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    networks:
      - sfda_network
    restart: unless-stopped
    profiles:
      - production

volumes:
  mysql_data:
  ollama_data:
  qdrant_data:
  app_uploads:
  app_logs:

networks:
  sfda_network:
    driver: bridge
```

### **部署腳本**

```bash
#!/bin/bash
# deploy.sh

set -e

echo "🚀 開始部署 sfda_nexus..."

# 檢查環境變量
if [ ! -f .env ]; then
    echo "❌ 請先創建 .env 文件"
    exit 1
fi

# 載入環境變量
source .env

# 停止現有服務
echo "⏹️  停止現有服務..."
docker-compose down

# 拉取最新鏡像
echo "📥 拉取最新鏡像..."
docker-compose pull

# 構建應用鏡像
echo "🔨 構建應用鏡像..."
docker-compose build app

# 啟動服務
echo "▶️  啟動服務..."
docker-compose up -d

# 等待服務啟動
echo "⏳ 等待服務啟動..."
sleep 30

# 執行資料庫遷移
echo "🗄️  執行資料庫遷移..."
docker-compose exec app npm run migrate

# 執行資料庫種子
echo "🌱 執行資料庫種子..."
docker-compose exec app npm run seed

# 檢查服務狀態
echo "✅ 檢查服務狀態..."
docker-compose ps

echo "🎉 部署完成！"
echo "📊 管理界面: http://localhost:3000"
echo "📚 API文檔: http://localhost:3000/api-docs"
```
