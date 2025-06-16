# Dashboard 對話跳轉問題修復

## 問題描述

用戶從 dashboard 點擊最近對話進入聊天頁面後遇到以下問題：

1. **對話歷史限制 5 筆**：這是正常的 dashboard 設計，只顯示最近 5 筆對話
2. **進入後顯示智能體列表，而不是對話內容**：這是主要問題

## 問題根因

聊天頁面 `/chat/index.vue` 沒有處理 URL 查詢參數 `id`，導致：

- Dashboard 使用 `router.push('/chat?id=${conversation.id}')` 跳轉
- 聊天頁面沒有檢查 `route.query.id`
- 結果顯示默認狀態（智能體選擇界面）而不是指定的對話

## 修復方案

### 1. 添加路由參數處理

在 `chat/index.vue` 中：

```javascript
// 添加 useRoute 導入
import { useRouter, useRoute } from "vue-router";
import api from "@/api/index.js";

// 在 setup 中添加
const router = useRouter();
const route = useRoute();
```

### 2. 在 onMounted 中處理 URL 參數

```javascript
// 檢查 URL 查詢參數中是否有對話 ID
const conversationId = route.query.id;
if (conversationId) {
  console.log("🔗 檢測到 URL 中的對話 ID:", conversationId);

  try {
    // 先查找對話是否在已載入的列表中
    let conversation = chatStore.conversations.find(
      (c) => c.id === parseInt(conversationId)
    );

    if (!conversation) {
      // 如果對話不在列表中，嘗試從 API 載入
      const response = await api.get(
        `/api/chat/conversations/${conversationId}`
      );
      conversation = response.data.data;
    }

    if (conversation) {
      // 選擇並載入該對話
      await chatStore.handleSelectConversation(conversation);
      // 清除 URL 中的查詢參數，避免重複處理
      router.replace({ path: route.path });
    }
  } catch (error) {
    console.error("❌ 載入指定對話失敗:", error);
    router.replace({ path: route.path });
  }
}
```

## 修復效果

修復後，用戶從 dashboard 點擊對話項目將：

1. ✅ 正確跳轉到聊天頁面
2. ✅ 自動載入指定的對話
3. ✅ 顯示對話的完整消息歷史（50 筆分頁）
4. ✅ URL 參數處理完成後自動清理

## 測試場景

1. **從 dashboard 點擊對話**
   - 應該直接進入該對話，顯示消息內容
2. **直接訪問 /chat**
   - 應該顯示智能體選擇界面（默認行為）
3. **對話不存在的情況**
   - 應該顯示錯誤信息並回到默認狀態
4. **網絡錯誤的情況**
   - 應該優雅處理錯誤並清理 URL 參數

## 相關文件

- `frontend/src/views/chat/index.vue` - 聊天頁面主文件
- `frontend/src/views/dashboard/index.vue` - Dashboard 頁面
- `frontend/src/stores/chat.js` - 聊天狀態管理

## 注意事項

- Dashboard 中的 5 筆限制是正常的設計，用於概覽顯示
- 聊天頁面的消息分頁是 50 筆，符合預期
- URL 參數處理後會自動清理，避免頁面刷新時重複載入
