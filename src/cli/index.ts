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
      .option("dry-run", {
        alias: "d",
        type: "boolean",
        description:
          "Redmineにチケットを作成せず、処理結果をファイルに出力します。",
        default: false,
      })
      .option("output", {
        alias: "o",
        type: "string",
        description: "dry-run時の出力ファイルパスを指定します。",
      })
      .help()
      .alias("help", "h")
      .version(false)
      .parse();

    console.log("=== Redmineチケット作成ツール ===\n");

    // 1. Excelファイルの設定
    const excelConfig = await this.configureExcel();

    // 2. Redmineの設定
    const redmineConfig = await this.configureRedmine();

    // 3. チケット作成オプション
    const ticketOptions = await this.configureTicketOptions(redmineConfig);

    return {
      excelConfig,
      redmineConfig,
      ticketOptions,
      dryRun: argv.dryRun,
      outputFile: argv.output,
    };
  }

  /**
   * Excelファイルの設定
   */
  private async configureExcel(): Promise<ExcelConfig> {
    console.log("--- Excelファイルの設定 ---");

    // ファイルパスの入力
    const { filePath } = await inquirer.prompt<{ filePath: string }>([
      {
        type: "input",
        name: "filePath",
        message: "Excelファイルのパスを入力してください:",
        validate: (input: string) => {
          const validation = SecurityUtils.validateFilePath(input);
          return validation.isValid ? true : validation.error!;
        },
      },
    ]);

    // Excelファイルを読み込み
    await this.excelReader.loadFile(filePath);

    // シート選択
    const sheetNames = this.excelReader.getSheetNames();
    const { sheetName } = await inquirer.prompt<{ sheetName: string }>([
      {
        type: "list",
        name: "sheetName",
        message: "シートを選択してください:",
        choices: sheetNames,
      },
    ]);

    // ヘッダー行の設定
    const { headerRow } = await inquirer.prompt<{ headerRow: number }>([
      {
        type: "number",
        name: "headerRow",
        message: "ヘッダー行の番号を入力してください:",
        default: 1,
        validate: (input: number) => {
          if (input < 1) {
            return "1以上の値を入力してください";
          }
          return true;
        },
      },
    ]);

    // 列の設定
    const columns = this.excelReader.getColumnNames(sheetName, headerRow);
    console.log("\n利用可能な列:");
    columns.forEach((col, index) => {
      console.log(`${index + 1}. ${col}`);
    });

    const columnQuestions = [
      {
        type: "list" as const,
        name: "taskNameColumn",
        message: "タスク名の列を選択してください:",
        choices: columns.map((col) => ({
          name: col,
          value: col.split(" ")[0],
        })),
      },
      {
        type: "list" as const,
        name: "detailDesignColumn",
        message: "詳細設計の列を選択してください:",
        choices: columns.map((col) => ({
          name: col,
          value: col.split(" ")[0],
        })),
      },
      {
        type: "list" as const,
        name: "implementationColumn",
        message: "実装の列を選択してください:",
        choices: columns.map((col) => ({
          name: col,
          value: col.split(" ")[0],
        })),
      },
      {
        type: "list" as const,
        name: "unitTestColumn",
        message: "単体試験の列を選択してください:",
        choices: columns.map((col) => ({
          name: col,
          value: col.split(" ")[0],
        })),
      },
      {
        type: "list" as const,
        name: "integrationTestColumn",
        message: "結合試験の列を選択してください:",
        choices: columns.map((col) => ({
          name: col,
          value: col.split(" ")[0],
        })),
      },
    ];

    const columnConfig = await inquirer.prompt<{
      taskNameColumn: string;
      detailDesignColumn: string;
      implementationColumn: string;
      unitTestColumn: string;
      integrationTestColumn: string;
    }>(columnQuestions);

    // データ範囲の設定
    const dataRange = this.excelReader.getDataRange(sheetName);
    const { startRow, endRow } = await inquirer.prompt<{
      startRow: number;
      endRow?: number;
    }>([
      {
        type: "number",
        name: "startRow",
        message: `データ開始行を入力してください (推奨: ${
          dataRange.startRow + 1
        }):`,
        default: dataRange.startRow + 1,
        validate: (input: number) => {
          if (input <= headerRow) {
            return `ヘッダー行(${headerRow})より大きい値を入力してください`;
          }
          return true;
        },
      },
      {
        type: "number",
        name: "endRow",
        message: `データ終了行を入力してください (推奨: ${dataRange.endRow}, 空欄で最終行まで):`,
        default: dataRange.endRow,
        validate: (input: number) => {
          if (input && input < dataRange.startRow) {
            return `開始行以上の値を入力してください`;
          }
          return true;
        },
      },
    ]);

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

    const redmineConfig = await inquirer.prompt<RedmineConfig>([
      {
        type: "input",
        name: "baseUrl",
        message: "RedmineのベースURL (例: https://redmine.example.com):",
        validate: (input: string) => {
          const validation = SecurityUtils.validateUrl(input);
          return validation.isValid ? true : validation.error!;
        },
        filter: (input: string) => input.replace(/\/$/, ""), // 末尾のスラッシュを削除
      },
      {
        type: "input",
        name: "apiKey",
        message: "APIキーを入力してください:",
        validate: (input: string) => {
          const validation = SecurityUtils.validateApiKey(input);
          return validation.isValid ? true : validation.error!;
        },
      },
      {
        type: "input",
        name: "projectId",
        message: "プロジェクトID (数値またはプロジェクト識別子):",
        validate: (input: string) => {
          const validation = SecurityUtils.validateProjectId(input);
          return validation.isValid ? true : validation.error!;
        },
      },
    ]);

    // 接続テスト
    console.log("\nRedmine接続テスト中...");
    const redmineClient = new RedmineClient(redmineConfig);
    const validation = await redmineClient.validateConfiguration();

    if (!validation.isValid) {
      console.error("❌ Redmine設定エラー:");
      if (validation.errors) {
        validation.errors.forEach((error) => console.error(`  - ${error}`));
      }
      throw new Error("Redmine設定が無効です");
    }

    if (validation.warnings && validation.warnings.length > 0) {
      console.warn("⚠️  警告:");
      validation.warnings.forEach((warning) => console.warn(`  - ${warning}`));
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
    const { trackerId } = await inquirer.prompt<{ trackerId: number }>([
      {
        type: "list",
        name: "trackerId",
        message: "トラッカーを選択してください:",
        choices: trackers.map((tracker) => ({
          name: tracker.name,
          value: tracker.id,
        })),
      },
    ]);

    // ステータス選択
    const statuses = await redmineClient.getStatuses();
    const { statusId } = await inquirer.prompt<{ statusId: number }>([
      {
        type: "list",
        name: "statusId",
        message: "ステータスを選択してください:",
        choices: statuses.map((status) => ({
          name: status.name,
          value: status.id,
        })),
      },
    ]);

    // 優先度選択
    const priorities = await redmineClient.getPriorities();
    const { priorityId } = await inquirer.prompt<{ priorityId: number }>([
      {
        type: "list",
        name: "priorityId",
        message: "優先度を選択してください:",
        choices: priorities.map((priority) => ({
          name: priority.name,
          value: priority.id,
        })),
      },
    ]);

    return {
      trackerId,
      statusId,
      priorityId,
    };
  }

  /**
   * 設定確認
   */
  public async confirmConfiguration(
    excelConfig: ExcelConfig,
    redmineConfig: RedmineConfig,
    _ticketOptions: TicketCreationOptions,
    dryRun: boolean,
    outputFile?: string
  ): Promise<boolean> {
    console.log("\n=== 設定確認 ===");
    console.log(`Excelファイル: ${excelConfig.filePath}`);
    console.log(`シート: ${excelConfig.sheetName}`);
    console.log(
      `データ範囲: ${excelConfig.startRow}行目〜${
        excelConfig.endRow || "最終行"
      }`
    );
    if (dryRun) {
      console.log("モード: Dry Run (チケットは作成されません)");
      if (outputFile) {
        console.log(`出力ファイル: ${outputFile}`);
      }
    } else {
      console.log(`RedmineURL: ${redmineConfig.baseUrl}`);
      console.log(`プロジェクトID: ${redmineConfig.projectId}`);
      console.log(
        `APIキー: ${SecurityUtils.maskSensitiveInfo(redmineConfig.apiKey)}`
      );
    }

    const { confirmed } = await inquirer.prompt<{ confirmed: boolean }>([
      {
        type: "confirm",
        name: "confirmed",
        message: dryRun
          ? "この設定でファイルを出力しますか？"
          : "この設定でチケットを作成しますか？",
        default: false,
      },
    ]);

    return confirmed;
  }

  /**
   * 処理完了メッセージ
   */
  public displayCompletionMessage(ticketCount: number): void {
    console.log("\n🎉 チケット作成が完了しました！");
    console.log(`作成されたチケット数: ${ticketCount}件`);
    console.log("\nRedmineでチケットを確認してください。");
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
