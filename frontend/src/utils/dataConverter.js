/**
 * 資料轉換工具
 * 處理資料庫數值和前端顯示之間的轉換
 */

/**
 * 將資料庫的 TINYINT(1) 轉換為 JavaScript 布林值
 * @param {number|boolean} value - 資料庫返回的值 (0/1 或 true/false)
 * @returns {boolean} - JavaScript 布林值
 */
export const dbBoolToJsBool = (value) => {
  if (typeof value === "boolean") {
    return value;
  }
  return value === 1 || value === "1" || value === true;
};

/**
 * 將 JavaScript 布林值轉換為資料庫的 TINYINT(1)
 * @param {boolean} value - JavaScript 布林值
 * @returns {number} - 資料庫數值 (0 或 1)
 */
export const jsBoolToDbBool = (value) => {
  return value ? 1 : 0;
};

/**
 * 批量轉換物件中的布林欄位從資料庫格式到 JavaScript 格式
 * @param {Object} obj - 要轉換的物件
 * @param {Array<string>} boolFields - 需要轉換的布林欄位名稱陣列
 * @returns {Object} - 轉換後的物件
 */
export const convertDbBoolFields = (obj, boolFields = []) => {
  if (!obj || typeof obj !== "object") {
    return obj;
  }

  const converted = { ...obj };
  boolFields.forEach((field) => {
    if (field in converted) {
      converted[field] = dbBoolToJsBool(converted[field]);
    }
  });

  return converted;
};

/**
 * 批量轉換陣列中每個物件的布林欄位
 * @param {Array<Object>} array - 要轉換的物件陣列
 * @param {Array<string>} boolFields - 需要轉換的布林欄位名稱陣列
 * @returns {Array<Object>} - 轉換後的物件陣列
 */
export const convertDbBoolArrayFields = (array, boolFields = []) => {
  if (!Array.isArray(array)) {
    return array;
  }

  return array.map((item) => convertDbBoolFields(item, boolFields));
};

/**
 * 模型相關的常用布林欄位
 */
export const MODEL_BOOL_FIELDS = [
  "is_active",
  "is_default",
  "is_multimodal",
  "can_call_tools",
];

/**
 * 用戶相關的常用布林欄位
 */
export const USER_BOOL_FIELDS = ["is_active", "is_admin", "email_verified"];

/**
 * 轉換模型資料的布林欄位
 * @param {Object|Array} data - 模型資料
 * @returns {Object|Array} - 轉換後的資料
 */
export const convertModelBoolFields = (data) => {
  if (Array.isArray(data)) {
    return convertDbBoolArrayFields(data, MODEL_BOOL_FIELDS);
  }
  return convertDbBoolFields(data, MODEL_BOOL_FIELDS);
};

/**
 * 轉換用戶資料的布林欄位
 * @param {Object|Array} data - 用戶資料
 * @returns {Object|Array} - 轉換後的資料
 */
export const convertUserBoolFields = (data) => {
  if (Array.isArray(data)) {
    return convertDbBoolArrayFields(data, USER_BOOL_FIELDS);
  }
  return convertDbBoolFields(data, USER_BOOL_FIELDS);
};

/**
 * 為提交到後端準備資料，將布林值轉換為數字
 * @param {Object} data - 要提交的資料
 * @param {Array<string>} boolFields - 需要轉換的布林欄位
 * @returns {Object} - 準備好的資料
 */
export const prepareDataForSubmit = (data, boolFields = []) => {
  if (!data || typeof data !== "object") {
    return data;
  }

  const prepared = { ...data };
  boolFields.forEach((field) => {
    if (field in prepared && typeof prepared[field] === "boolean") {
      prepared[field] = jsBoolToDbBool(prepared[field]);
    }
  });

  return prepared;
};

export default {
  dbBoolToJsBool,
  jsBoolToDbBool,
  convertDbBoolFields,
  convertDbBoolArrayFields,
  convertModelBoolFields,
  convertUserBoolFields,
  prepareDataForSubmit,
  MODEL_BOOL_FIELDS,
  USER_BOOL_FIELDS,
};
