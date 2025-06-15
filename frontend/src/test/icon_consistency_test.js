/**
 * 圖示一致性測試
 * 檢查 AdminLayout 中是否還有混合使用的圖示庫
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("🧪 檢查 AdminLayout 圖示一致性");
console.log("=".repeat(50));

/**
 * 檢查 AdminLayout 文件中的圖示使用
 */
function checkIconConsistency() {
  try {
    // 讀取 AdminLayout.vue 文件
    const adminLayoutPath = path.join(__dirname, "../layouts/AdminLayout.vue");
    const content = fs.readFileSync(adminLayoutPath, "utf-8");

    console.log("\n1️⃣ 檢查 Lucide 圖示導入...");

    // 檢查是否還有 Lucide 導入
    const lucideImportRegex = /from\s+["']lucide-vue-next["']/g;
    const lucideImports = content.match(lucideImportRegex);

    if (lucideImports) {
      console.log("   ❌ 發現 Lucide 導入:", lucideImports.length, "處");
      lucideImports.forEach((match, index) => {
        console.log(`      ${index + 1}. ${match}`);
      });
    } else {
      console.log("   ✅ 沒有發現 Lucide 導入");
    }

    console.log("\n2️⃣ 檢查 Ant Design 圖示導入...");

    // 檢查 Ant Design 圖示導入
    const antdImportRegex = /from\s+["']@ant-design\/icons-vue["']/g;
    const antdImports = content.match(antdImportRegex);

    if (antdImports) {
      console.log("   ✅ 發現 Ant Design 圖示導入:", antdImports.length, "處");
    } else {
      console.log("   ❌ 沒有發現 Ant Design 圖示導入");
    }

    console.log("\n3️⃣ 檢查模板中的圖示使用...");

    // 檢查模板中是否還有不應該的 Lucide 圖示（排除主題切換按鈕）
    const lucideIconRegex =
      /<(Users|Bell|RefreshCw|Maximize|Minimize|User|Settings)[\s>]/g;
    const lucideIconsInTemplate = content.match(lucideIconRegex);

    if (lucideIconsInTemplate) {
      console.log(
        "   ❌ 模板中發現不應該的 Lucide 圖示:",
        lucideIconsInTemplate.length,
        "處"
      );
      lucideIconsInTemplate.forEach((match, index) => {
        console.log(`      ${index + 1}. ${match.trim()}`);
      });
    } else {
      console.log("   ✅ 模板中沒有發現不應該的 Lucide 圖示");
    }

    // 檢查主題切換按鈕的 Lucide 圖示（這是允許的）
    const themeIconRegex = /<(Lightbulb|MoonStar)[\s>]/g;
    const themeIcons = content.match(themeIconRegex);

    if (themeIcons) {
      console.log(
        "   ✅ 主題切換按鈕使用 Lucide 圖示:",
        themeIcons.length,
        "處"
      );
      themeIcons.forEach((match, index) => {
        console.log(`      ${index + 1}. ${match.trim()}`);
      });
    }

    // 檢查 Ant Design 圖示使用
    const antdIconRegex = /<[A-Z][a-zA-Z]*Outlined|<[A-Z][a-zA-Z]*Filled/g;
    const antdIconsInTemplate = content.match(antdIconRegex);

    if (antdIconsInTemplate) {
      console.log(
        "   ✅ 模板中發現 Ant Design 圖示:",
        antdIconsInTemplate.length,
        "處"
      );

      // 統計不同類型的圖示
      const iconTypes = {};
      antdIconsInTemplate.forEach((icon) => {
        const iconName = icon.replace("<", "").split(/[\s>]/)[0];
        iconTypes[iconName] = (iconTypes[iconName] || 0) + 1;
      });

      console.log("   📊 圖示使用統計:");
      Object.entries(iconTypes).forEach(([icon, count]) => {
        console.log(`      - ${icon}: ${count} 次`);
      });
    } else {
      console.log("   ❌ 模板中沒有發現 Ant Design 圖示");
    }

    console.log("\n4️⃣ 檢查 header 右側快速操作區域...");

    // 提取 quick-actions 區域的內容
    const quickActionsRegex = /<div class="quick-actions">([\s\S]*?)<\/div>/;
    const quickActionsMatch = content.match(quickActionsRegex);

    if (quickActionsMatch) {
      const quickActionsContent = quickActionsMatch[1];
      console.log("   ✅ 找到快速操作區域");

      // 檢查快速操作區域中的圖示
      const iconsInQuickActions = quickActionsContent.match(
        /<[A-Z][a-zA-Z]*(?:Outlined|Filled)/g
      );

      if (iconsInQuickActions) {
        console.log("   📋 快速操作區域圖示:");
        iconsInQuickActions.forEach((icon, index) => {
          const iconName = icon.replace("<", "");
          console.log(`      ${index + 1}. ${iconName}`);
        });

        // 檢查是否都是 Ant Design 圖示
        const allAntdIcons = iconsInQuickActions.every(
          (icon) => icon.includes("Outlined") || icon.includes("Filled")
        );

        if (allAntdIcons) {
          console.log("   ✅ 快速操作區域圖示統一使用 Ant Design");
        } else {
          console.log("   ❌ 快速操作區域圖示不統一");
        }
      } else {
        console.log("   ❌ 快速操作區域沒有找到圖示");
      }
    } else {
      console.log("   ❌ 沒有找到快速操作區域");
    }

    console.log("\n5️⃣ 總結...");

    const hasUnwantedLucideInTemplate = !!lucideIconsInTemplate;
    const hasAntdImports = !!antdImports;
    const hasAntdInTemplate = !!antdIconsInTemplate;
    const hasThemeIcons = !!themeIcons;

    if (
      !hasUnwantedLucideInTemplate &&
      hasAntdImports &&
      hasAntdInTemplate &&
      hasThemeIcons
    ) {
      console.log("   ✅ 圖示一致性檢查通過！");
      console.log(
        "   ✅ 除了主題切換按鈕使用 Lucide 圖示外，其他都統一使用 Ant Design Icons"
      );
      console.log("   ✅ 主題切換按鈕正確使用 Lucide 圖示（符合設計要求）");
      return true;
    } else {
      console.log("   ❌ 圖示一致性檢查失敗！");
      if (hasUnwantedLucideInTemplate)
        console.log("   - 模板中仍有不應該的 Lucide 圖示");
      if (!hasAntdImports) console.log("   - 缺少 Ant Design 圖示導入");
      if (!hasAntdInTemplate) console.log("   - 模板中沒有 Ant Design 圖示");
      if (!hasThemeIcons) console.log("   - 主題切換按鈕沒有使用 Lucide 圖示");
      return false;
    }
  } catch (error) {
    console.error("❌ 檢查失敗:", error.message);
    return false;
  }
}

/**
 * 主函數
 */
function main() {
  console.log("\n🚀 開始圖示一致性檢查...");

  const success = checkIconConsistency();

  if (success) {
    console.log("\n🎉 圖示統一性修復完成！");
    console.log(
      "   AdminLayout header 右邊的圖示現在統一使用 Ant Design Icons"
    );
  } else {
    console.log("\n💥 圖示統一性檢查失敗，需要進一步修復");
  }

  console.log("\n🏁 檢查結束");
}

// 執行檢查
main();
