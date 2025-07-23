const ExcelJS = require("exceljs");

async function createTestExcel() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("見積データ");

  // ヘッダー行の設定
  worksheet.getRow(1).values = [
    "画面・機能",
    "タスク名",
    "詳細設計",
    "実装単体",
    "結合試験",
  ];

  // ヘッダー行のスタイリング
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE6F3FF" },
  };

  // テストデータの追加
  const testData = [
    ["ホーム画面", "ログインする", 8, 16, 8],
    ["", "ログアウトする", 8, 16, 8],
    ["", "一覧画面に遷移する", 8, 16, 8],
    ["一覧画面", "一覧表示する", 4, 8, 4],
    ["", "スクロールする", 1, 2, 1],
    ["", "詳細画面に遷移する", 1, 2, 1],
    ["詳細画面", "詳細を表示する", 4, 8, 4],
  ];

  // データ行の追加
  testData.forEach((row, index) => {
    worksheet.getRow(index + 2).values = row;
  });

  // 画面・機能列の結合セル設定（同一画面をグループ化）
  // ホーム画面（行2-4）
  worksheet.mergeCells("A2:A4");
  // 一覧画面（行5-7）
  worksheet.mergeCells("A5:A7");
  // 詳細画面（行8）- 単一行なので結合不要

  // 列幅の自動調整
  worksheet.columns = [
    { width: 15 }, // 画面・機能
    { width: 25 }, // タスク名
    { width: 12 }, // 詳細設計
    { width: 12 }, // 実装単体
    { width: 12 }, // 結合試験
  ];

  // ファイル保存
  await workbook.xlsx.writeFile("test_estimate.xlsx");
  console.log("✅ テスト用Excelファイル test_estimate.xlsx を作成しました。");

  console.log("\n作成されたデータ:");
  console.log(
    "画面・機能 | タスク名           | 詳細設計 | 実装単体 | 結合試験"
  );
  console.log(
    "----------|-------------------|----------|----------|----------"
  );
  testData.forEach((row) => {
    const screenName = row[0] || "(結合セル)";
    console.log(
      `${screenName.padEnd(9)} | ${row[1].padEnd(17)} | ${row[2]
        .toString()
        .padEnd(8)} | ${row[3].toString().padEnd(8)} | ${row[4]}`
    );
  });
}

createTestExcel().catch(console.error);
