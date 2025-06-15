import dayjs from "dayjs";
import "dayjs/locale/zh-tw"; // 載入繁體中文語系
import relativeTime from "dayjs/plugin/relativeTime"; // 載入相對時間插件
import calendar from "dayjs/plugin/calendar"; // 載入日曆插件
import isSameOrBefore from "dayjs/plugin/isSameOrBefore"; // 載入比較插件
import isSameOrAfter from "dayjs/plugin/isSameOrAfter"; // 載入比較插件
import timezone from "dayjs/plugin/timezone"; // 載入時區插件
import utc from "dayjs/plugin/utc"; // 載入 UTC 插件

// 設定 dayjs
dayjs.locale("zh-tw"); // 使用繁體中文
dayjs.extend(relativeTime); // 啟用相對時間插件
dayjs.extend(calendar); // 啟用日曆插件
dayjs.extend(isSameOrBefore); // 啟用比較插件
dayjs.extend(isSameOrAfter); // 啟用比較插件
dayjs.extend(timezone); // 啟用時區插件
dayjs.extend(utc); // 啟用 UTC 插件

// 獲取用戶本地時區，默認為台北時區
const getUserTimezone = () => {
  return dayjs.tz.guess() || "Asia/Taipei";
};

// 將 UTC 時間轉換為本地時間
const toLocalTime = (timestamp) => {
  if (!timestamp) return null;
  return dayjs.utc(timestamp).tz(getUserTimezone());
};

/**
 * 格式化時間戳為相對時間（例如：剛剛、5分鐘前）
 * @param {string|number|Date} timestamp - 時間戳
 * @returns {string} 格式化後的時間字符串
 */
export const formatRelativeTime = (timestamp) => {
  if (!timestamp) return "剛剛";
  const localTime = toLocalTime(timestamp);
  return localTime ? localTime.fromNow() : "剛剛";
};

/**
 * 格式化時間戳為聊天時間格式
 * @param {string|number|Date} timestamp - 時間戳
 * @returns {string} 格式化後的時間字符串
 */
export const formatChatTime = (timestamp) => {
  if (!timestamp) return "";

  const localTime = toLocalTime(timestamp);
  if (!localTime) return "";

  const now = dayjs().tz(getUserTimezone());

  // 今天
  if (localTime.isSame(now, "day")) {
    return localTime.format("HH:mm");
  }

  // 昨天
  if (localTime.isSame(now.subtract(1, "day"), "day")) {
    return "昨天";
  }

  // 本週
  if (localTime.isAfter(now.subtract(7, "day"))) {
    return localTime.format("dddd"); // 星期幾
  }

  // 更早
  return localTime.format("M月D日");
};

/**
 * 格式化時間戳為消息時間格式
 * @param {string|number|Date} timestamp - 時間戳
 * @returns {string} 格式化後的時間字符串
 */
export const formatMessageTime = (timestamp) => {
  if (!timestamp) return "";

  const localTime = toLocalTime(timestamp);
  if (!localTime) return "";

  const now = dayjs().tz(getUserTimezone());

  // 今天
  if (localTime.isSame(now, "day")) {
    return localTime.format("HH:mm");
  }

  // 昨天
  if (localTime.isSame(now.subtract(1, "day"), "day")) {
    return `昨天 ${localTime.format("HH:mm")}`;
  }

  // 更早
  return localTime.format("YYYY/MM/DD HH:mm");
};

/**
 * 格式化時間戳
 * @param {string} timestamp - ISO 格式的時間戳
 * @param {Object} options - 格式化選項
 * @param {boolean} options.showRelative - 是否顯示相對時間（預設：true）
 * @param {string} options.yearFormat - 年份格式（預設：YYYY/MM/DD HH:mm:ss）
 * @param {string} options.monthFormat - 月份格式（預設：MM/DD HH:mm:ss）
 * @returns {string} 格式化後的時間字串
 */
export const formatTimestamp = (timestamp, options = {}) => {
  if (!timestamp) return "-";

  const {
    showRelative = true,
    yearFormat = "YYYY/MM/DD HH:mm:ss",
    monthFormat = "MM/DD HH:mm:ss",
  } = options;

  const localTime = toLocalTime(timestamp);
  if (!localTime) return "-";

  const now = dayjs().tz(getUserTimezone());

  // 如果是今天的時間且需要顯示相對時間
  if (showRelative && localTime.isSame(now, "day")) {
    return localTime.fromNow();
  }

  // 如果是今年的時間
  if (localTime.isSame(now, "year")) {
    return localTime.format(monthFormat);
  }

  // 其他情況顯示完整日期時間
  return localTime.format(yearFormat);
};

/**
 * 格式化日期
 * @param {string|Date} date - 日期或時間戳
 * @param {string} format - 格式字串
 * @returns {string} 格式化後的日期字串
 */
export const formatDate = (date, format = "YYYY/MM/DD") => {
  const localTime = toLocalTime(date);
  return localTime ? localTime.format(format) : dayjs(date).format(format);
};

/**
 * 檢查日期是否在指定範圍內
 * @param {string} date - 要檢查的日期
 * @param {string} start - 開始日期
 * @param {string} end - 結束日期
 * @returns {boolean} 是否在範圍內
 */
export const isDateInRange = (date, start, end) => {
  const checkDate = dayjs(date);
  return (
    checkDate.isSameOrAfter(start, "day") &&
    checkDate.isSameOrBefore(end, "day")
  );
};

/**
 * 獲取兩個日期之間的差異
 * @param {string} date1 - 第一個日期
 * @param {string} date2 - 第二個日期
 * @param {string} unit - 單位（day, month, year 等）
 * @returns {number} 差異值
 */
export const getDateDiff = (date1, date2, unit = "day") => {
  return dayjs(date1).diff(dayjs(date2), unit);
};

// 等待n秒，預設3秒
export const wait = (seconds = 3) => {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
};

export default {
  formatRelativeTime,
  formatChatTime,
  formatMessageTime,
  formatTimestamp,
  formatDate,
  isDateInRange,
  getDateDiff,
  wait,
};
