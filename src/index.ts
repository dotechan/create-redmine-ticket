#!/usr/bin/env node

import { CLI } from "./cli";
import { ExcelReader } from "./modules/excelReader";
import { DataTransformer } from "./modules/dataTransformer";
import { FileWriter } from "./modules/fileWriter";
import { RedmineClient } from "./modules/redmineClient";

/**
 * convertコマンドの処理
 */
async function handleConvertCommand(
  cli: CLI,
  excelFilePath: string
): Promise<void> {
  console.log("=== Excel → YAML/HTML変換 ===\n");

  // 1. Excel設定の取得
  const { excelConfig, outputBaseName } = await cli.runConvert(excelFilePath);

  // 2. Excelファイルの読み込み
  console.log("Excelファイルを読み込み中...");
  const excelReader = new ExcelReader();
  await excelReader.loadFile(excelConfig.filePath);
  const tasks = excelReader.readTaskEstimates(excelConfig);
  console.log(`✅ ${tasks.length}件のタスクを読み込みました。`);

  // 3. データ変換
  console.log("データを変換中...");
  const dataTransformer = new DataTransformer();
  const projectData = dataTransformer.transformToProjectData(tasks);
  const hierarchicalTickets =
    dataTransformer.generateHierarchicalTicketData(projectData);
  console.log(
    `✅ ${hierarchicalTickets.length}件の階層構造チケットを生成しました。`
  );

  // 4. ファイル出力
  const fileWriter = new FileWriter();
  const yamlPath = `${outputBaseName}.yml`;
  const htmlPath = `${outputBaseName}.html`;

  await fileWriter.writeYamlFile(hierarchicalTickets, yamlPath);
  await fileWriter.writeHtmlFile(hierarchicalTickets, htmlPath);

  cli.displayCompletionMessage(
    `変換が完了しました！\n` +
      `📄 YAML: ${yamlPath}\n` +
      `🌐 HTML: ${htmlPath}\n` +
      `\nHTMLファイルをブラウザで開いて内容を確認してください。`
  );
}

/**
 * previewコマンドの処理
 */
async function handlePreviewCommand(
  cli: CLI,
  yamlFilePath: string
): Promise<void> {
  console.log("=== YAML → HTMLプレビュー生成 ===\n");

  const fileWriter = new FileWriter();
  const hierarchicalTickets = await fileWriter.readYamlFile(yamlFilePath);
  const htmlPath = yamlFilePath.replace(/\.ya?ml$/i, ".html");
  await fileWriter.writeHtmlFile(hierarchicalTickets, htmlPath);

  cli.displayCompletionMessage(
    `プレビューが完了しました！\n` +
      `🌐 HTML: ${htmlPath}\n` +
      `\nHTMLファイルをブラウザで開いて内容を確認してください。`
  );
}

/**
 * createコマンドの処理
 */
async function handleCreateCommand(
  cli: CLI,
  yamlFilePath: string
): Promise<void> {
  console.log("=== YAML → Redmineチケット作成 ===\n");

  const fileWriter = new FileWriter();
  const hierarchicalTickets = await fileWriter.readYamlFile(yamlFilePath);
  const { redmineConfig, ticketOptions } = await cli.runCreate();

  const confirmed = await cli.confirmConfiguration(
    "この設定でRedmineにチケットを作成しますか？",
    [
      `YAMLファイル: ${yamlFilePath}`,
      `総チケット数: ${countTicketsRecursively(hierarchicalTickets)}件`,
      `RedmineURL: ${redmineConfig.baseUrl}`,
      `プロジェクトID: ${redmineConfig.projectId}`,
    ]
  );

  if (!confirmed) {
    console.log("処理をキャンセルしました。");
    return;
  }

  const redmineClient = new RedmineClient(redmineConfig);
  const result = await redmineClient.createTickets(
    hierarchicalTickets,
    ticketOptions
  );
  redmineClient.displayCreationSummary(result);

  const totalTickets = result.createdTickets.length;
  cli.displayCompletionMessage(
    `チケット作成が完了しました！\n` +
      `作成されたチケット数: ${totalTickets}件\n` +
      `\nRedmineでチケットを確認してください。`
  );
}

/**
 * チケット数を再帰的にカウント
 */
function countTicketsRecursively(tickets: any[]): number {
  let count = tickets.length;
  tickets.forEach((ticket) => {
    if (ticket.children) {
      count += countTicketsRecursively(ticket.children);
    }
  });
  return count;
}

/**
 * メイン処理
 */
async function main(): Promise<void> {
  const cli = new CLI();

  try {
    // 1. コマンドライン引数の解析
    const { command, filePath } = await cli.run();

    switch (command) {
      case "convert":
        await handleConvertCommand(cli, filePath);
        break;
      case "preview":
        await handlePreviewCommand(cli, filePath);
        break;
      case "create":
        await handleCreateCommand(cli, filePath);
        break;
      default:
        console.error(`未知のコマンド: ${command}`);
        process.exit(1);
    }
  } catch (error) {
    cli.displayError(error as Error);
    process.exit(1);
  }
}

// メイン処理を実行
main();
