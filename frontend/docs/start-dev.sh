#!/bin/bash

# SFDA Nexus 開發環境啟動腳本
# 同時啟動 frontend 和 backend 的開發模式

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 獲取腳本所在目錄
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 專案路徑
FRONTEND_DIR="$SCRIPT_DIR/frontend"
BACKEND_DIR="$SCRIPT_DIR/backend"

# 進程 PID 存儲
BACKEND_PID=""
FRONTEND_PID=""

# 清理函式
cleanup() {
    echo -e "\n${YELLOW}正在停止所有開發服務...${NC}"
    
    if [ ! -z "$BACKEND_PID" ]; then
        echo -e "${YELLOW}停止 Backend 服務...${NC}"
        kill -TERM $BACKEND_PID 2>/dev/null
    fi
    
    if [ ! -z "$FRONTEND_PID" ]; then
        echo -e "${YELLOW}停止 Frontend 服務...${NC}"
        kill -TERM $FRONTEND_PID 2>/dev/null
    fi
    
    # 等待進程結束
    sleep 2
    
    # 強制終止如果還在運行
    if [ ! -z "$BACKEND_PID" ]; then
        kill -KILL $BACKEND_PID 2>/dev/null
    fi
    
    if [ ! -z "$FRONTEND_PID" ]; then
        kill -KILL $FRONTEND_PID 2>/dev/null
    fi
    
    echo -e "${GREEN}所有服務已停止${NC}"
    exit 0
}

# 設置信號處理
trap cleanup SIGINT SIGTERM

# 檢查目錄是否存在
check_directories() {
    if [ ! -d "$FRONTEND_DIR" ]; then
        echo -e "${RED}錯誤: Frontend 目錄不存在 ($FRONTEND_DIR)${NC}"
        exit 1
    fi
    
    if [ ! -d "$BACKEND_DIR" ]; then
        echo -e "${RED}錯誤: Backend 目錄不存在 ($BACKEND_DIR)${NC}"
        exit 1
    fi
    
    if [ ! -f "$FRONTEND_DIR/package.json" ]; then
        echo -e "${RED}錯誤: Frontend package.json 不存在${NC}"
        exit 1
    fi
    
    if [ ! -f "$BACKEND_DIR/package.json" ]; then
        echo -e "${RED}錯誤: Backend package.json 不存在${NC}"
        exit 1
    fi
}

# 啟動服務
start_services() {
    echo -e "${CYAN}=== SFDA Nexus 開發環境啟動 ===${NC}"
    echo -e "${CYAN}時間: $(date '+%Y-%m-%d %H:%M:%S')${NC}"
    echo ""
    
    # 啟動 Backend
    echo -e "${BLUE}啟動 Backend 服務...${NC}"
    cd "$BACKEND_DIR"
    npm run dev > /tmp/backend.log 2>&1 &
    BACKEND_PID=$!
    
    # 等待一下讓 Backend 先啟動
    sleep 3
    
    # 啟動 Frontend
    echo -e "${MAGENTA}啟動 Frontend 服務...${NC}"
    cd "$FRONTEND_DIR"
    npm run dev > /tmp/frontend.log 2>&1 &
    FRONTEND_PID=$!
    
    # 等待服務啟動
    sleep 5
    
    echo ""
    echo -e "${GREEN}=== 所有開發服務已啟動 ===${NC}"
    echo ""
    echo -e "${CYAN}服務地址:${NC}"
    echo -e "  ${MAGENTA}- Frontend: http://localhost:5173${NC}"
    echo -e "  ${BLUE}- Backend:  http://localhost:3000${NC}"
    echo ""
    echo -e "${YELLOW}按 Ctrl+C 停止所有服務${NC}"
    echo ""
    
    # 顯示日誌
    echo -e "${CYAN}=== 服務日誌 (即時顯示) ===${NC}"
    tail -f /tmp/backend.log /tmp/frontend.log &
    TAIL_PID=$!
    
    # 等待用戶中斷
    wait
}

# 主要執行流程
main() {
    # 檢查目錄
    check_directories
    
    # 啟動服務
    start_services
}

# 執行主函式
main "$@"
