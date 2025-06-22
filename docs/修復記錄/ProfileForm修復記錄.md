# ProfileForm 修復記錄

## 修復日期

2024 年 12 月

## 問題描述

### 1. 手機號碼驗證過於嚴格

- **問題**：原始驗證規則 `/^1[3-9]\d{9}$/` 只接受中國大陸手機號碼格式
- **影響**：台灣、香港、美國等地區的手機號碼無法通過驗證
- **用戶反饋**：「怎麼我輸入了，還是顯示要正確的手機號碼?」

### 2. 個人簡介無法保存

- **問題**：後端 `allowedFields` 數組中缺少 `bio` 欄位
- **影響**：前端提交個人簡介後，後端不會處理該欄位
- **根本原因**：資料庫中也缺少 `bio` 欄位

## 修復方案

### 1. 手機號碼驗證規則優化

#### 修復前

```javascript
phone: [
  {
    pattern: /^1[3-9]\d{9}$/,
    message: "請輸入正確的手機號碼",
    trigger: "blur",
  },
],
```

#### 修復後

```javascript
phone: [
  {
    validator: (rule, value) => {
      if (!value) return Promise.resolve(); // 手機號碼不是必填的

      // 移除所有空格、破折號、括號等常見分隔符
      const cleanPhone = value.replace(/[\s\-\(\)\+]/g, '');

      // 支援多種手機號碼格式
      const patterns = [
        /^09\d{8}$/, // 台灣手機 (09開頭，共10位)
        /^1[3-9]\d{9}$/, // 11位數字，中國大陸
        /^[6-9]\d{7}$/, // 香港手機 (8位數字)
        /^(\+886|886)?9\d{8}$/, // 台灣國際格式 (+886912345678)
        /^(\+86|86)?1[3-9]\d{9}$/, // 中國國際格式
        /^(\+1|1)?[2-9]\d{9}$/, // 美國手機號碼 (不以0或1開頭的10位數字)
      ];

      const isValid = patterns.some(pattern => pattern.test(cleanPhone));

      if (!isValid) {
        return Promise.reject(new Error("請輸入正確的手機號碼格式"));
      }

      return Promise.resolve();
    },
    trigger: "blur",
  },
],
```

#### 支援的手機號碼格式

- ✅ **台灣**：`0912345678`, `09-1234-5678`, `+886912345678`
- ✅ **中國大陸**：`13812345678`, `+86 138 1234 5678`
- ✅ **香港**：`61234567`
- ✅ **美國**：`2345678901`, `+1-234-567-8900`
- ❌ **無效格式**：台灣固話 `0812345678`、過短號碼、包含字母

### 2. 個人簡介功能完整實現

#### 資料庫修改

```sql
-- 添加 bio 欄位到 users 表
ALTER TABLE users
ADD COLUMN bio TEXT DEFAULT NULL COMMENT '個人簡介'
AFTER phone;
```

#### 後端修改

```javascript
// 在 auth.controller.js 中添加 bio 到允許更新的欄位
const allowedFields = [
  "display_name",
  "avatar",
  "department",
  "position",
  "phone",
  "bio", // 新增
  "preferences",
];
```

#### 前端驗證規則

```javascript
bio: [
  { max: 500, message: "個人簡介不能超過500個字符", trigger: "blur" }
],
```

## 測試驗證

### 手機號碼驗證測試

- **測試案例**：13 個不同格式的手機號碼
- **測試結果**：✅ 13/13 通過
- **涵蓋範圍**：台灣、中國、香港、美國手機號碼格式

### 個人簡介功能測試

- **測試案例**：4 個不同長度的簡介內容
- **測試結果**：✅ 4/4 通過
- **驗證內容**：空值、正常內容、邊界值、超出限制

## 修復文件

### 修改的文件

1. `frontend/src/views/user/components/ProfileForm.vue`

   - 更新手機號碼驗證規則
   - 添加個人簡介長度驗證

2. `backend/src/controllers/auth.controller.js`

   - 在 `allowedFields` 中添加 `bio` 欄位

3. `backend/database/scripts/add_bio_field.sql`
   - 新增資料庫腳本，添加 `bio` 欄位

### 新增的文件

1. `frontend/src/test/test_profile_form_fixes.js`

   - 完整的測試驗證腳本

2. `docs/修復記錄/ProfileForm修復記錄.md`
   - 本修復記錄文檔

## 執行步驟

### 資料庫更新

```bash
# 執行 SQL 腳本添加 bio 欄位
docker exec -i mysql-server mysql -u root -pMyPwd@1234 --default-character-set=utf8mb4 sfda_nexus < backend/database/scripts/add_bio_field.sql
```

### 服務重啟

```bash
# 重啟後端服務
cd backend && npm start

# 重啟前端服務
cd frontend && npm run dev
```

### 測試驗證

```bash
# 運行測試腳本
node frontend/src/test/test_profile_form_fixes.js
```

## 修復效果

### 用戶體驗改善

- ✅ 支援多地區手機號碼格式，提升國際化支援
- ✅ 個人簡介功能正常工作，用戶可以保存個人資訊
- ✅ 更友好的錯誤提示和驗證規則
- ✅ 自動移除手機號碼中的分隔符（空格、破折號、括號）

### 技術改進

- ✅ 使用自定義 validator 替代簡單的正則表達式
- ✅ 完整的資料庫欄位支援
- ✅ 前後端一致的資料處理
- ✅ 完善的測試覆蓋

## 注意事項

1. **向後兼容**：修復保持了對原有中國大陸手機號碼格式的支援
2. **資料安全**：個人簡介限制在 500 字符以內，防止濫用
3. **可選欄位**：手機號碼和個人簡介都是可選的，不會強制用戶填寫
4. **國際化**：支援多地區手機號碼格式，提升產品的國際化水準

## 後續建議

1. **考慮添加更多地區**：如需要，可以繼續添加其他國家/地區的手機號碼格式
2. **個人簡介富文本**：未來可考慮支援 Markdown 或富文本格式
3. **手機號碼格式化顯示**：可考慮在顯示時自動格式化手機號碼
4. **國際化文案**：錯誤訊息可以根據用戶語言偏好顯示
