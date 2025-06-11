import bcryptjs from "bcryptjs";

const hash = "$2a$12$GD4QkxUpXAqISbHvdYtZJu.i3kzbFMtVAf4QrzZy7R0SBU/KBMnr.";
const testPasswords = [
  "admin123",
  "Aa123456",
  "password",
  "admin",
  "123456",
  "password123",
];

console.log("🔐 測試密碼...");

for (const password of testPasswords) {
  const match = await bcryptjs.compare(password, hash);
  console.log(`${password}: ${match ? "✅ 匹配" : "❌ 不匹配"}`);
}

console.log("完成測試");
