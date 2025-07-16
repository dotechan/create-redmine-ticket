#!/usr/bin/env node

import { CLI } from "./cli";
import { ExcelReader } from "./modules/excelReader";
import { DataTransformer } from "./modules/dataTransformer";
import { RedmineClient } from "./modules/redmineClient";
import { FileWriter } from "./modules/fileWriter";

/**
 * メインアプリケーション
 */
async function main(): Promise<void> {
  const cli = new CLI();

  try {
    // 1. CLI設定の取得
    const { excelConfig, redmineConfig, ticketOptions, dryRun, outputFile } =
      await cli.run();

    // 2. 設定確認
    const confirmed = await cli.confirmConfiguration(
      excelConfig,
      redmineConfig,
      ticketOptions,
      dryRun,
      outputFile
    );
    if (!confirmed) {
      console.log("処理をキャンセルしました。");
      return;
    }

    // 3. Excelデータの読み取り
    console.log("\n--- Excelデータの読み取り ---");
    const excelReader = new ExcelReader();
    await excelReader.loadFile(excelConfig.filePath);
    const tasks = excelReader.readTaskEstimates(excelConfig);

    if (tasks.length === 0) {
      console.log("❌ 読み取り可能なタスクデータがありません。");
      return;
    }

    console.log(`✅ ${tasks.length}件のタスクを読み取りました`);

    // 4. データ変換
    console.log("\n--- データ変換 ---");
    const dataTransformer = new DataTransformer();
    const projectData = dataTransformer.transformToProjectData(tasks);

    // 統計情報の表示
    const stats = dataTransformer.getProjectStatistics(projectData);
    console.log(`総タスク数: ${stats.totalTasks}件`);
    console.log(`総見積工数: ${stats.totalHours}人日`);
    console.log("工程別内訳:");
    Object.entries(stats.processBreakdown).forEach(
      ([processType, breakdown]) => {
        if (breakdown.hours > 0) {
          console.log(
            `  - ${processType}: ${breakdown.hours}人日 (${breakdown.taskCount}件, ${breakdown.percentage}%)`
          );
        }
      }
    );

    // 5. チケットデータの生成
    const parentTicketsData =
      dataTransformer.generateParentTicketData(projectData);
    const childTicketsData =
      dataTransformer.generateChildTicketData(projectData);

    console.log(
      `\n作成予定チケット数: 親チケット ${parentTicketsData.length}件, 子チケット ${childTicketsData.length}件`
    );

    // 6. Redmineチケットの作成またはファイル出力
    if (dryRun) {
      if (!outputFile) {
        console.error(
          "❌ Dry Runモードでは --output <filepath> オプションで出力ファイルを指定する必要があります。"
        );
        process.exit(1);
      }
      console.log("\n--- Dry Runモード ---");
      const fileWriter = new FileWriter();
      await fileWriter.writeYamlFile(
        parentTicketsData,
        childTicketsData,
        outputFile
      );
    } else {
      console.log("\n--- Redmineチケットの作成 ---");
      const redmineClient = new RedmineClient(redmineConfig);

      const result = await redmineClient.createTickets(
        parentTicketsData,
        childTicketsData,
        ticketOptions
      );

      // 7. 結果の表示
      redmineClient.displayCreationSummary(result);

      const totalTickets =
        Object.keys(result.parentTickets).length + result.childTickets.length;
      cli.displayCompletionMessage(totalTickets);
    }
  } catch (error) {
    cli.displayError(error as Error);
    process.exit(1);
  }
}

// プログラムの実行
if (require.main === module) {
  main().catch((error) => {
    console.error("予期しないエラーが発生しました:", error);
    process.exit(1);
  });
}
