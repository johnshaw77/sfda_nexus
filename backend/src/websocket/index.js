/**
 * WebSocket 服務初始化文件
 * 處理實時通信功能，包括聊天消息、通知等
 */

import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import logger from '../utils/logger.util.js';

// 存儲所有WebSocket連接
const clients = new Map();
const rooms = new Map(); // 房間管理（用於群組聊天）

/**
 * 初始化WebSocket服務
 * @param {Object} httpServer - HTTP服務器實例
 * @param {number} wsPort - WebSocket端口
 */
export const initializeWebSocket = (httpServer, wsPort = 3001) => {
  // 創建WebSocket服務器
  const wss = new WebSocketServer({ 
    port: wsPort,
    perMessageDeflate: false // 關閉消息壓縮以提高性能
  });

  logger.info(`WebSocket服務器已啟動，監聽端口: ${wsPort}`);

  // 處理新的WebSocket連接
  wss.on('connection', (ws, request) => {
    const clientId = generateClientId();
    const clientInfo = {
      id: clientId,
      ws: ws,
      userId: null, // 待認證後填入
      rooms: new Set(), // 用戶加入的房間
      lastPing: Date.now(),
      connectedAt: new Date().toISOString()
    };

    clients.set(clientId, clientInfo);
    
    logger.info('新的WebSocket連接', {
      clientId,
      ip: request.socket.remoteAddress,
      userAgent: request.headers['user-agent']
    });

    // 發送歡迎消息
    ws.send(JSON.stringify({
      type: 'connection',
      data: {
        clientId,
        message: '連接成功',
        timestamp: new Date().toISOString()
      }
    }));

    // 處理接收到的消息
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        handleMessage(clientId, message);
      } catch (error) {
        logger.error('WebSocket消息解析失敗', {
          clientId,
          error: error.message,
          data: data.toString()
        });
        
        sendToClient(clientId, {
          type: 'error',
          data: {
            message: '消息格式錯誤',
            code: 'INVALID_MESSAGE_FORMAT'
          }
        });
      }
    });

    // 處理連接關閉
    ws.on('close', (code, reason) => {
      handleDisconnection(clientId, code, reason);
    });

    // 處理連接錯誤
    ws.on('error', (error) => {
      logger.error('WebSocket連接錯誤', {
        clientId,
        error: error.message
      });
    });

    // 設置心跳檢測
    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
      if (clients.has(clientId)) {
        clients.get(clientId).lastPing = Date.now();
      }
    });
  });

  // 心跳檢測定時器
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) {
        ws.terminate();
        return;
      }
      
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000); // 每30秒檢測一次

  // 清理定時器
  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  return wss;
};

/**
 * 處理WebSocket消息
 * @param {string} clientId - 客戶端ID
 * @param {Object} message - 消息對象
 */
const handleMessage = (clientId, message) => {
  const client = clients.get(clientId);
  if (!client) return;

  logger.debug('收到WebSocket消息', {
    clientId,
    type: message.type,
    userId: client.userId
  });

  switch (message.type) {
    case 'auth':
      handleAuthentication(clientId, message.data);
      break;
      
    case 'join_room':
      handleJoinRoom(clientId, message.data);
      break;
      
    case 'leave_room':
      handleLeaveRoom(clientId, message.data);
      break;
      
    case 'chat_message':
      handleChatMessage(clientId, message.data);
      break;
      
    case 'ping':
      handlePing(clientId);
      break;
      
    default:
      logger.warn('未知的WebSocket消息類型', {
        clientId,
        type: message.type
      });
      
      sendToClient(clientId, {
        type: 'error',
        data: {
          message: '未知的消息類型',
          code: 'UNKNOWN_MESSAGE_TYPE'
        }
      });
  }
};

/**
 * 處理用戶認證
 * @param {string} clientId - 客戶端ID
 * @param {Object} data - 認證數據
 */
const handleAuthentication = (clientId, data) => {
  // TODO: 實現JWT token驗證
  // 這裡先簡單實現，後續需要整合JWT驗證邏輯
  
  const client = clients.get(clientId);
  if (!client) return;

  if (data.token) {
    // 驗證token並獲取用戶信息
    // const user = verifyJwtToken(data.token);
    // client.userId = user.id;
    
    // 臨時實現
    client.userId = data.userId || 'anonymous';
    
    sendToClient(clientId, {
      type: 'auth_success',
      data: {
        message: '認證成功',
        userId: client.userId
      }
    });
    
    logger.info('WebSocket用戶認證成功', {
      clientId,
      userId: client.userId
    });
  } else {
    sendToClient(clientId, {
      type: 'auth_error',
      data: {
        message: '認證失敗，缺少token',
        code: 'MISSING_TOKEN'
      }
    });
  }
};

/**
 * 處理加入房間
 * @param {string} clientId - 客戶端ID  
 * @param {Object} data - 房間數據
 */
const handleJoinRoom = (clientId, data) => {
  const client = clients.get(clientId);
  if (!client || !client.userId) {
    sendToClient(clientId, {
      type: 'error',
      data: { message: '請先進行認證' }
    });
    return;
  }

  const roomId = data.roomId;
  if (!roomId) {
    sendToClient(clientId, {
      type: 'error', 
      data: { message: '缺少房間ID' }
    });
    return;
  }

  // 加入房間
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Set());
  }
  
  rooms.get(roomId).add(clientId);
  client.rooms.add(roomId);

  // 通知用戶加入成功
  sendToClient(clientId, {
    type: 'room_joined',
    data: {
      roomId,
      message: '成功加入房間'
    }
  });

  // 通知房間內其他用戶
  broadcastToRoom(roomId, {
    type: 'user_joined',
    data: {
      userId: client.userId,
      roomId,
      timestamp: new Date().toISOString()
    }
  }, [clientId]); // 排除自己

  logger.info('用戶加入WebSocket房間', {
    clientId,
    userId: client.userId,
    roomId
  });
};

/**
 * 處理離開房間
 * @param {string} clientId - 客戶端ID
 * @param {Object} data - 房間數據
 */
const handleLeaveRoom = (clientId, data) => {
  const client = clients.get(clientId);
  const roomId = data.roomId;
  
  if (client && roomId && client.rooms.has(roomId)) {
    // 從房間移除
    rooms.get(roomId)?.delete(clientId);
    client.rooms.delete(roomId);
    
    // 如果房間為空，刪除房間
    if (rooms.get(roomId)?.size === 0) {
      rooms.delete(roomId);
    }
    
    // 通知房間內其他用戶
    broadcastToRoom(roomId, {
      type: 'user_left',
      data: {
        userId: client.userId,
        roomId,
        timestamp: new Date().toISOString()
      }
    });
    
    sendToClient(clientId, {
      type: 'room_left',
      data: { roomId, message: '已離開房間' }
    });
  }
};

/**
 * 處理聊天消息
 * @param {string} clientId - 客戶端ID
 * @param {Object} data - 消息數據
 */
const handleChatMessage = (clientId, data) => {
  const client = clients.get(clientId);
  if (!client || !client.userId) return;

  // TODO: 這裡應該保存消息到資料庫
  
  // 廣播消息到相關房間或用戶
  if (data.roomId) {
    broadcastToRoom(data.roomId, {
      type: 'chat_message',
      data: {
        ...data,
        senderId: client.userId,
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * 處理Ping消息
 * @param {string} clientId - 客戶端ID
 */
const handlePing = (clientId) => {
  sendToClient(clientId, {
    type: 'pong',
    data: { timestamp: new Date().toISOString() }
  });
};

/**
 * 處理連接斷開
 * @param {string} clientId - 客戶端ID
 * @param {number} code - 關閉代碼
 * @param {string} reason - 關閉原因
 */
const handleDisconnection = (clientId, code, reason) => {
  const client = clients.get(clientId);
  
  if (client) {
    // 從所有房間移除
    client.rooms.forEach(roomId => {
      rooms.get(roomId)?.delete(clientId);
      if (rooms.get(roomId)?.size === 0) {
        rooms.delete(roomId);
      }
      
      // 通知房間內其他用戶
      broadcastToRoom(roomId, {
        type: 'user_disconnected',
        data: {
          userId: client.userId,
          roomId,
          timestamp: new Date().toISOString()
        }
      });
    });
    
    clients.delete(clientId);
    
    logger.info('WebSocket連接關閉', {
      clientId,
      userId: client.userId,
      code,
      reason: reason?.toString()
    });
  }
};

/**
 * 發送消息給指定客戶端
 * @param {string} clientId - 客戶端ID
 * @param {Object} message - 消息對象
 */
const sendToClient = (clientId, message) => {
  const client = clients.get(clientId);
  if (client && client.ws.readyState === 1) { // WebSocket.OPEN
    try {
      client.ws.send(JSON.stringify(message));
    } catch (error) {
      logger.error('發送WebSocket消息失敗', {
        clientId,
        error: error.message
      });
    }
  }
};

/**
 * 廣播消息到房間
 * @param {string} roomId - 房間ID
 * @param {Object} message - 消息對象
 * @param {Array} excludeClients - 排除的客戶端ID列表
 */
const broadcastToRoom = (roomId, message, excludeClients = []) => {
  const roomClients = rooms.get(roomId);
  if (!roomClients) return;

  roomClients.forEach(clientId => {
    if (!excludeClients.includes(clientId)) {
      sendToClient(clientId, message);
    }
  });
};

/**
 * 生成客戶端ID
 * @returns {string} 客戶端ID
 */
const generateClientId = () => {
  return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * 獲取在線用戶統計
 * @returns {Object} 統計信息
 */
export const getOnlineStats = () => {
  const stats = {
    totalConnections: clients.size,
    authenticatedUsers: 0,
    totalRooms: rooms.size,
    roomStats: {}
  };

  clients.forEach(client => {
    if (client.userId && client.userId !== 'anonymous') {
      stats.authenticatedUsers++;
    }
  });

  rooms.forEach((clientSet, roomId) => {
    stats.roomStats[roomId] = clientSet.size;
  });

  return stats;
};

export default {
  initializeWebSocket,
  getOnlineStats,
  sendToClient,
  broadcastToRoom
}; 