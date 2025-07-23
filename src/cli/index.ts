import inquirer from "inquirer";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import {
  ExcelConfig,
  RedmineConfig,
  TicketCreationOptions,
  CLIRunResult,
} from "../types";
import { ExcelReader } from "../modules/excelReader";
import { RedmineClient } from "../modules/redmineClient";
import { SecurityUtils } from "../utils/security";

export class CLI {
  private excelReader: ExcelReader;

  constructor() {
    this.excelReader = new ExcelReader();
  }

  /**
   * メインCLI処理
   */
  public async run(): Promise<CLIRunResult> {
    const argv = await yargs(hideBin(process.argv))
      .command(
        "convert <excel-file>",
        "ExcelファイルからYAMLとHTMLを生成します",
        (yargs) => {
          return yargs.positional("excel-file", {
            describe: "変換するExcelファイルのパス",
            type: "string",
            demandOption: true,
          });
        }
      )
      .command(
        "preview <yaml-file>",
        "YAMLファイルからHTMLプレビューを生成します",
        (yargs) => {
          return yargs.positional("yaml-file", {
            describe: "プレビューするYAMLファイルのパス",
            type: "string",
            demandOption: true,
          });
        }
      )
      .command(
        "create <yaml-file>",
        "YAMLファイルからRedmineチケットを作成します",
        (yargs) => {
          return yargs.positional("yaml-file", {
            describe: "チケット作成に使用するYAMLファイルのパス",
            type: "string",
            demandOption: true,
          });
        }
      )
      .demandCommand(1, "コマンドを指定してください")
      .help()
      .alias("help", "h")
      .version(false)
      .parse();

    const command = argv._[0] as string;
    const filePath =
      (argv as any)["excel-file"] ||
      (argv as any)["yaml-file"] ||
      (argv._[1] as string);

    return {
      command,
      filePath,
    };
  }

  /**
   * convertコマンド: ExcelファイルからYAML/HTMLを生成
   */
  public async runConvert(excelFilePath: string): Promise<{
    excelConfig: ExcelConfig;
    outputBaseName: string;
  }> {
    console.log("=== Excel → YAML/HTML変換 ===\n");

    // Excelファイルの設定
    const excelConfig = await this.configureExcel(excelFilePath);

    // 出力ファイル名の生成
    const outputBaseName = this.generateOutputBaseName(excelFilePath);

    return {
      excelConfig,
      outputBaseName,
    };
  }

  /**
   * createコマンド: YAMLファイルからRedmineチケットを作成
   */
  public async runCreate(): Promise<{
    redmineConfig: RedmineConfig;
    ticketOptions: TicketCreationOptions;
  }> {
    console.log("=== YAML → Redmineチケット作成 ===\n");

    // Redmineの設定
    const redmineConfig = await this.configureRedmine();

    // チケット作成オプション
    const ticketOptions = await this.configureTicketOptions(redmineConfig);

    return {
      redmineConfig,
      ticketOptions,
    };
  }

  /**
   * Excelファイルの設定
   */
  private async configureExcel(filePath: string): Promise<ExcelConfig> {
    console.log("--- Excelファイルの設定 ---");

    // ファイルパスの検証
    const validation = SecurityUtils.validateFilePath(filePath);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    // Excelファイルを読み込み
    await this.excelReader.loadFile(filePath);

    // シート選択
    const sheetNames = this.excelReader.getSheetNames();
    const { sheetName } = await inquirer.prompt({
      type: "list",
      name: "sheetName",
      message: "シートを選択してください:",
      choices: sheetNames,
    });

    // ヘッダー行の設定
    const { headerRow } = await inquirer.prompt({
      type: "number",
      name: "headerRow",
      message: "ヘッダー行の番号を入力してください:",
      default: 1,
      validate: (input?: number) => {
        if (!input || input < 1) {
          return "1以上の値を入力してください";
        }
        return true;
      },
    });

    // 列の設定
    const columns = this.excelReader.getColumnNames(sheetName, headerRow);
    console.log("\n利用可能な列:");
    columns.forEach((col, index) => {
      console.log(`${index + 1}. ${col}`);
    });

    // 画面・機能名の列を選択
    const { screenNameColumn } = await inquirer.prompt({
      type: "list",
      name: "screenNameColumn",
      message: "画面・機能名の列を選択してください:",
      choices: columns.map((col) => ({
        name: col,
        value: col.split(" ")[0],
      })),
    });

    // タスク名の列を選択
    const { taskNameColumn } = await inquirer.prompt({
      type: "list",
      name: "taskNameColumn",
      message: "タスク名の列を選択してください:",
      choices: columns.map((col) => ({
        name: col,
        value: col.split(" ")[0],
      })),
    });

    // 詳細設計の列を選択
    const { detailDesignColumn } = await inquirer.prompt({
      type: "list",
      name: "detailDesignColumn",
      message: "詳細設計の列を選択してください:",
      choices: columns.map((col) => ({
        name: col,
        value: col.split(" ")[0],
      })),
    });

    // 実装単体の列を選択
    const { implementationUnitColumn } = await inquirer.prompt({
      type: "list",
      name: "implementationUnitColumn",
      message: "実装単体の列を選択してください:",
      choices: columns.map((col) => ({
        name: col,
        value: col.split(" ")[0],
      })),
    });

    // 結合試験の列を選択
    const { integrationTestColumn } = await inquirer.prompt({
      type: "list",
      name: "integrationTestColumn",
      message: "結合試験の列を選択してください:",
      choices: columns.map((col) => ({
        name: col,
        value: col.split(" ")[0],
      })),
    });

    const columnConfig = {
      screenNameColumn,
      taskNameColumn,
      detailDesignColumn,
      implementationUnitColumn,
      integrationTestColumn,
    };

    // データ範囲の設定
    const dataRange = this.excelReader.getDataRange(sheetName);

    // 開始行の入力
    const { startRow } = await inquirer.prompt({
      type: "number",
      name: "startRow",
      message: `データ開始行を入力してください (推奨: ${
        dataRange.startRow + 1
      }):`,
      default: dataRange.startRow + 1,
      validate: (input?: number) => {
        if (!input || input <= headerRow) {
          return `ヘッダー行(${headerRow})より大きい値を入力してください`;
        }
        return true;
      },
    });

    // 終了行の入力
    const { endRow } = await inquirer.prompt({
      type: "number",
      name: "endRow",
      message: `データ終了行を入力してください (推奨: ${dataRange.endRow}, 空欄で最終行まで):`,
      default: dataRange.endRow,
      validate: (input?: number) => {
        if (input && input < startRow) {
          return `開始行以上の値を入力してください`;
        }
        return true;
      },
    });

    const config: ExcelConfig = {
      filePath,
      sheetName,
      headerRow,
      ...columnConfig,
      startRow,
    };

    if (endRow !== undefined) {
      config.endRow = endRow;
    }

    return config;
  }

  /**
   * Redmineの設定
   */
  private async configureRedmine(): Promise<RedmineConfig> {
    console.log("\n--- Redmineの設定 ---");

    // ベースURLの入力
    const { baseUrl } = await inquirer.prompt({
      type: "input",
      name: "baseUrl",
      message: "RedmineのベースURL (例: https://redmine.example.com):",
      validate: (input?: string) => {
        if (!input) return "URLを入力してください";
        const validation = SecurityUtils.validateUrl(input);
        return validation.isValid ? true : validation.error!;
      },
      filter: (input: string) => input.replace(/\/$/, ""), // 末尾のスラッシュを削除
    });

    // APIキーの入力
    const { apiKey } = await inquirer.prompt({
      type: "input",
      name: "apiKey",
      message: "APIキーを入力してください:",
      validate: (input?: string) => {
        if (!input) return "APIキーを入力してください";
        const validation = SecurityUtils.validateApiKey(input);
        return validation.isValid ? true : validation.error!;
      },
    });

    // プロジェクトIDの入力
    const { projectId } = await inquirer.prompt({
      type: "input",
      name: "projectId",
      message: "プロジェクトID (数値またはプロジェクト識別子):",
      validate: (input?: string) => {
        if (!input) return "プロジェクトIDを入力してください";
        const validation = SecurityUtils.validateProjectId(input);
        return validation.isValid ? true : validation.error!;
      },
    });

    const redmineConfig: RedmineConfig = {
      baseUrl,
      apiKey,
      projectId,
    };

    // 接続テスト
    console.log("\nRedmine接続テスト中...");
    const redmineClient = new RedmineClient(redmineConfig);
    const validation = redmineClient.validateConfig();

    if (!validation.isValid) {
      console.error("❌ Redmine設定に問題があります:");
      if (validation.errors) {
        validation.errors.forEach((error: string) =>
          console.error(`  - ${error}`)
        );
      }
      throw new Error("Redmine設定を確認してください");
    }

    if (validation.warnings && validation.warnings.length > 0) {
      console.warn("⚠️  警告:");
      validation.warnings.forEach((warning: string) =>
        console.warn(`  - ${warning}`)
      );
    }

    console.log("✅ Redmine接続成功");
    return redmineConfig;
  }

  /**
   * チケット作成オプションの設定
   */
  private async configureTicketOptions(
    redmineConfig: RedmineConfig
  ): Promise<TicketCreationOptions> {
    console.log("\n--- チケット作成オプション ---");

    const redmineClient = new RedmineClient(redmineConfig);

    // トラッカー選択
    const trackers = await redmineClient.getTrackers();
    const { trackerId } = await inquirer.prompt({
      type: "list",
      name: "trackerId",
      message: "トラッカーを選択してください:",
      choices: trackers.map((tracker) => ({
        name: tracker.name,
        value: tracker.id,
      })),
    });

    // ステータス選択
    const statuses = await redmineClient.getStatuses();
    const { statusId } = await inquirer.prompt({
      type: "list",
      name: "statusId",
      message: "ステータスを選択してください:",
      choices: statuses.map((status) => ({
        name: status.name,
        value: status.id,
      })),
    });

    // 優先度選択
    const priorities = await redmineClient.getPriorities();
    const { priorityId } = await inquirer.prompt({
      type: "list",
      name: "priorityId",
      message: "優先度を選択してください:",
      choices: priorities.map((priority) => ({
        name: priority.name,
        value: priority.id,
      })),
    });

    return {
      trackerId,
      statusId,
      priorityId,
    };
  }

  /**
   * 出力ファイル名の生成
   */
  private generateOutputBaseName(excelFilePath: string): string {
    const path = require("path");
    const baseName = path.basename(excelFilePath, path.extname(excelFilePath));
    return baseName;
  }

  /**
   * 設定確認
   */
  public async confirmConfiguration(
    message: string,
    details: string[]
  ): Promise<boolean> {
    console.log("\n=== 設定確認 ===");
    details.forEach((detail) => console.log(detail));

    const { confirmed } = await inquirer.prompt({
      type: "confirm",
      name: "confirmed",
      message,
      default: false,
    });

    return confirmed;
  }

  /**
   * 処理完了メッセージ
   */
  public displayCompletionMessage(message: string): void {
    console.log(`\n🎉 ${message}`);
  }

  /**
   * エラーメッセージの表示
   */
  public displayError(error: Error): void {
    console.error("\n❌ エラーが発生しました:");
    console.error(SecurityUtils.sanitizeErrorMessage(error));
    console.error("\n処理を中断します。");
  }
}
