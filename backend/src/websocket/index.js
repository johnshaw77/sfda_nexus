/**
 * WebSocket 服務初始化文件
 * 處理實時通信功能，包括聊天消息、通知等
 */

import { WebSocketServer } from "ws";
import { createServer } from "http";
import logger from "../utils/logger.util.js";
import {
  verifyWebSocketToken,
  handleRealtimeChat,
  handleConversationStatus,
  handleTypingStatus,
} from "./chat.handler.js";

// 存儲所有WebSocket連接
const clients = new Map();
const rooms = new Map(); // 房間管理（用於群組聊天）

/**
 * 生成客戶端ID
 * @returns {string} 唯一的客戶端ID
 */
const generateClientId = () => {
  return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * 發送消息到指定客戶端
 * @param {string} clientId - 客戶端ID
 * @param {Object} message - 要發送的消息
 */
const sendToClient = (clientId, message) => {
  const client = clients.get(clientId);
  if (client && client.ws.readyState === 1) {
    // WebSocket.OPEN
    try {
      client.ws.send(JSON.stringify(message));
    } catch (error) {
      logger.error("發送WebSocket消息失敗", {
        clientId,
        error: error.message,
      });
    }
  }
};

/**
 * 廣播消息到房間
 * @param {string} roomId - 房間ID
 * @param {Object} message - 要廣播的消息
 * @param {string} excludeClientId - 排除的客戶端ID（可選）
 */
const broadcastToRoom = (roomId, message, excludeClientId = null) => {
  const room = rooms.get(roomId);
  if (!room) return;

  room.forEach((clientId) => {
    if (clientId !== excludeClientId) {
      sendToClient(clientId, message);
    }
  });
};

/**
 * 將客戶端加入房間
 * @param {string} clientId - 客戶端ID
 * @param {string} roomId - 房間ID
 */
const joinRoom = (clientId, roomId) => {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Set());
  }

  rooms.get(roomId).add(clientId);

  const client = clients.get(clientId);
  if (client) {
    client.rooms.add(roomId);
  }

  logger.debug("客戶端加入房間", { clientId, roomId });
};

/**
 * 將客戶端從房間移除
 * @param {string} clientId - 客戶端ID
 * @param {string} roomId - 房間ID
 */
const leaveRoom = (clientId, roomId) => {
  const room = rooms.get(roomId);
  if (room) {
    room.delete(clientId);
    if (room.size === 0) {
      rooms.delete(roomId);
    }
  }

  const client = clients.get(clientId);
  if (client) {
    client.rooms.delete(roomId);
  }

  logger.debug("客戶端離開房間", { clientId, roomId });
};

/**
 * 初始化WebSocket服務
 * @param {Object} httpServer - HTTP服務器實例
 * @param {number} wsPort - WebSocket端口
 */
export const initializeWebSocket = (httpServer, wsPort = 3001) => {
  // 創建WebSocket服務器
  const wss = new WebSocketServer({
    port: wsPort,
    perMessageDeflate: false, // 關閉消息壓縮以提高性能
  });

  logger.info(`WebSocket服務器已啟動，監聽端口: ${wsPort}`);

  // 處理新的WebSocket連接
  wss.on("connection", (ws, request) => {
    const clientId = generateClientId();
    const clientInfo = {
      id: clientId,
      ws: ws,
      userId: null, // 待認證後填入
      user: null, // 用戶完整信息
      rooms: new Set(), // 用戶加入的房間
      lastPing: Date.now(),
      connectedAt: new Date().toISOString(),
    };

    clients.set(clientId, clientInfo);

    logger.info("新的WebSocket連接", {
      clientId,
      ip: request.socket.remoteAddress,
      userAgent: request.headers["user-agent"],
    });

    // 發送歡迎消息
    ws.send(
      JSON.stringify({
        type: "connection",
        data: {
          clientId,
          message: "連接成功",
          timestamp: new Date().toISOString(),
        },
      })
    );

    // 處理接收到的消息
    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());
        handleMessage(clientId, message);
      } catch (error) {
        logger.error("WebSocket消息解析失敗", {
          clientId,
          error: error.message,
          data: data.toString(),
        });

        sendToClient(clientId, {
          type: "error",
          data: {
            message: "消息格式錯誤",
            code: "INVALID_MESSAGE_FORMAT",
          },
        });
      }
    });

    // 處理連接關閉
    ws.on("close", (code, reason) => {
      handleDisconnection(clientId, code, reason);
    });

    // 處理連接錯誤
    ws.on("error", (error) => {
      logger.error("WebSocket連接錯誤", {
        clientId,
        error: error.message,
      });
    });

    // 設置心跳檢測
    ws.isAlive = true;
    ws.on("pong", () => {
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
  wss.on("close", () => {
    clearInterval(heartbeatInterval);
  });

  return wss;
};

/**
 * 處理WebSocket消息
 * @param {string} clientId - 客戶端ID
 * @param {Object} message - 消息對象
 */
const handleMessage = async (clientId, message) => {
  const client = clients.get(clientId);
  if (!client) return;

  logger.debug("收到WebSocket消息", {
    clientId,
    type: message.type,
    userId: client.userId,
  });

  switch (message.type) {
    case "auth":
      await handleAuthentication(clientId, message.data);
      break;

    case "join_room":
      handleJoinRoom(clientId, message.data);
      break;

    case "leave_room":
      handleLeaveRoom(clientId, message.data);
      break;

    case "realtime_chat":
      await handleRealtimeChat(
        clientId,
        message.data,
        clients,
        sendToClient,
        broadcastToRoom
      );
      break;

    case "conversation_status":
      await handleConversationStatus(
        clientId,
        message.data,
        clients,
        sendToClient,
        broadcastToRoom
      );
      break;

    case "typing_status":
      await handleTypingStatus(
        clientId,
        message.data,
        clients,
        broadcastToRoom
      );
      break;

    case "ping":
      handlePing(clientId);
      break;

    default:
      logger.warn("未知的WebSocket消息類型", {
        clientId,
        type: message.type,
      });

      sendToClient(clientId, {
        type: "error",
        data: {
          message: "未知的消息類型",
          code: "UNKNOWN_MESSAGE_TYPE",
        },
      });
  }
};

/**
 * 處理用戶認證
 * @param {string} clientId - 客戶端ID
 * @param {Object} data - 認證數據
 */
const handleAuthentication = async (clientId, data) => {
  const client = clients.get(clientId);
  if (!client) return;

  try {
    if (!data.token) {
      sendToClient(clientId, {
        type: "auth_error",
        data: {
          message: "缺少認證token",
          code: "MISSING_TOKEN",
        },
      });
      return;
    }

    // 驗證JWT token
    const user = await verifyWebSocketToken(data.token);

    if (!user) {
      sendToClient(clientId, {
        type: "auth_error",
        data: {
          message: "認證失敗",
          code: "INVALID_TOKEN",
        },
      });
      return;
    }

    // 更新客戶端信息
    client.userId = user.id;
    client.user = user;

    sendToClient(clientId, {
      type: "auth_success",
      data: {
        message: "認證成功",
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
      },
    });

    logger.info("WebSocket用戶認證成功", {
      clientId,
      userId: user.id,
      username: user.username,
    });
  } catch (error) {
    logger.error("WebSocket認證處理失敗", {
      clientId,
      error: error.message,
    });

    sendToClient(clientId, {
      type: "auth_error",
      data: {
        message: "認證處理失敗",
        code: "AUTH_ERROR",
      },
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
      type: "error",
      data: { message: "未認證的連接", code: "UNAUTHORIZED" },
    });
    return;
  }

  const { roomId } = data;
  if (!roomId) {
    sendToClient(clientId, {
      type: "error",
      data: { message: "缺少房間ID", code: "MISSING_ROOM_ID" },
    });
    return;
  }

  joinRoom(clientId, roomId);

  sendToClient(clientId, {
    type: "room_joined",
    data: {
      roomId: roomId,
      message: "成功加入房間",
    },
  });

  // 通知房間其他成員
  broadcastToRoom(
    roomId,
    {
      type: "user_joined",
      data: {
        roomId: roomId,
        user: {
          id: client.userId,
          username: client.user.username,
        },
        timestamp: new Date().toISOString(),
      },
    },
    clientId
  );
};

/**
 * 處理離開房間
 * @param {string} clientId - 客戶端ID
 * @param {Object} data - 房間數據
 */
const handleLeaveRoom = (clientId, data) => {
  const client = clients.get(clientId);
  if (!client) return;

  const { roomId } = data;
  if (!roomId) return;

  // 通知房間其他成員
  if (client.userId) {
    broadcastToRoom(
      roomId,
      {
        type: "user_left",
        data: {
          roomId: roomId,
          user: {
            id: client.userId,
            username: client.user?.username,
          },
          timestamp: new Date().toISOString(),
        },
      },
      clientId
    );
  }

  leaveRoom(clientId, roomId);

  sendToClient(clientId, {
    type: "room_left",
    data: {
      roomId: roomId,
      message: "已離開房間",
    },
  });
};

/**
 * 處理ping消息
 * @param {string} clientId - 客戶端ID
 */
const handlePing = (clientId) => {
  sendToClient(clientId, {
    type: "pong",
    data: {
      timestamp: new Date().toISOString(),
    },
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
    // 從所有房間中移除客戶端
    client.rooms.forEach((roomId) => {
      // 通知房間其他成員
      if (client.userId) {
        broadcastToRoom(
          roomId,
          {
            type: "user_disconnected",
            data: {
              roomId: roomId,
              user: {
                id: client.userId,
                username: client.user?.username,
              },
              timestamp: new Date().toISOString(),
            },
          },
          clientId
        );
      }

      leaveRoom(clientId, roomId);
    });

    logger.info("WebSocket連接關閉", {
      clientId,
      userId: client.userId,
      code,
      reason: reason?.toString(),
      duration: Date.now() - new Date(client.connectedAt).getTime(),
    });
  }

  clients.delete(clientId);
};

/**
 * 獲取WebSocket統計信息
 * @returns {Object} 統計信息
 */
export const getWebSocketStats = () => {
  const stats = {
    totalConnections: clients.size,
    authenticatedConnections: 0,
    totalRooms: rooms.size,
    roomDetails: {},
  };

  // 統計認證連接數
  clients.forEach((client) => {
    if (client.userId) {
      stats.authenticatedConnections++;
    }
  });

  // 統計房間詳情
  rooms.forEach((clientSet, roomId) => {
    stats.roomDetails[roomId] = clientSet.size;
  });

  return stats;
};

/**
 * 向所有客戶端廣播消息
 * @param {Object} message - 要廣播的消息
 * @param {Function} filter - 過濾函數（可選）
 */
export const broadcastToAll = (message, filter = null) => {
  clients.forEach((client, clientId) => {
    if (!filter || filter(client)) {
      sendToClient(clientId, message);
    }
  });
};

/**
 * 向特定用戶發送消息
 * @param {number} userId - 用戶ID
 * @param {Object} message - 要發送的消息
 */
export const sendToUser = (userId, message) => {
  clients.forEach((client, clientId) => {
    if (client.userId === userId) {
      sendToClient(clientId, message);
    }
  });
};

export default {
  initializeWebSocket,
  getWebSocketStats,
  broadcastToAll,
  sendToUser,
  sendToClient,
  broadcastToRoom,
};
