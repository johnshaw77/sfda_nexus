// TODO: 還沒使用到這個檔案

import { message } from "ant-design-vue";

export const handleApiError = (error) => {
  if (error.response) {
    const { status, data } = error.response;

    switch (status) {
      case 400:
        message.error(data.message || "請求參數錯誤");
        break;
      case 401:
        message.error("登入已過期，請重新登入");
        handleLogout();
        break;
      case 403:
        message.error("沒有權限執行此操作");
        break;
      case 404:
        message.error("請求的資源不存在");
        break;
      case 500:
        message.error("伺服器內部錯誤");
        break;
      default:
        message.error("請求失敗");
    }
  } else if (error.request) {
    message.error("網路連接失敗");
  } else {
    message.error("請求配置錯誤");
  }
};
