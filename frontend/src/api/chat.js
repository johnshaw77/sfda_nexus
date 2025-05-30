/**
 * 聊天相關 API
 */

import api from "./index.js";

// 獲取聊天記錄
export const getChatHistory = async (params = {}) => {
  const response = await api.get("/api/chat/history", { params });
  return response.data;
};

// 發送消息
export const sendMessage = async (messageData) => {
  const response = await api.post("/api/chat/send", messageData);
  return response.data;
};

// 創建新對話
export const createConversation = async (conversationData) => {
  const response = await api.post("/api/chat/conversations", conversationData);
  return response.data;
};

// 獲取對話列表
export const getConversations = async (params = {}) => {
  const response = await api.get("/api/chat/conversations", { params });
  return response.data;
};

// 獲取對話詳情
export const getConversation = async (conversationId) => {
  const response = await api.get(`/api/chat/conversations/${conversationId}`);
  return response.data;
};

// 更新對話
export const updateConversation = async (conversationId, updateData) => {
  const response = await api.put(
    `/api/chat/conversations/${conversationId}`,
    updateData
  );
  return response.data;
};

// 刪除對話
export const deleteConversation = async (conversationId) => {
  const response = await api.delete(
    `/api/chat/conversations/${conversationId}`
  );
  return response.data;
};

// 獲取可用的AI模型
export const getAvailableModels = async () => {
  const response = await api.get("/api/chat/models");
  return response.data;
};

// 獲取智能體列表
export const getAgents = async (params = {}) => {
  const response = await api.get("/api/chat/agents", { params });
  return response.data;
};
