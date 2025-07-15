import * as Excel from "exceljs";
import { ExcelConfig, TaskEstimate, ValidationResult } from "../types";

export class ExcelReader {
  private workbook: Excel.Workbook | null = null;

  /**
   * Excelファイルを読み込む
   */
  public async loadFile(filePath: string): Promise<void> {
    try {
      this.workbook = new Excel.Workbook();
      await this.workbook.xlsx.readFile(filePath);
    } catch (error) {
      throw new Error(`Excelファイルの読み込みに失敗しました: ${error}`);
    }
  }

  /**
   * 利用可能なシート名一覧を取得
   */
  public getSheetNames(): string[] {
    if (!this.workbook) {
      throw new Error("Excelファイルが読み込まれていません");
    }
    return this.workbook.worksheets.map((sheet) => sheet.name);
  }

  /**
   * 指定されたシートの列名一覧を取得（A, B, C...形式）
   */
  public getColumnNames(sheetName: string, headerRow: number): string[] {
    if (!this.workbook) {
      throw new Error("Excelファイルが読み込まれていません");
    }

    const worksheet = this.workbook.getWorksheet(sheetName);
    if (!worksheet) {
      throw new Error(`シート "${sheetName}" が見つかりません`);
    }

    const columns: string[] = [];
    const headerRowData = worksheet.getRow(headerRow);

    // 最大列数を取得
    const maxColumn = worksheet.columnCount || 26;

    for (let col = 1; col <= maxColumn; col++) {
      const cell = headerRowData.getCell(col);
      const columnLetter = this.numberToColumn(col);
      const columnValue = cell.value ? cell.value.toString() : "";

      if (columnValue.trim() !== "") {
        columns.push(`${columnLetter} (${columnValue})`);
      }
    }

    return columns;
  }

  /**
   * 指定されたシートのデータ範囲を取得
   */
  public getDataRange(sheetName: string): { startRow: number; endRow: number } {
    if (!this.workbook) {
      throw new Error("Excelファイルが読み込まれていません");
    }

    const worksheet = this.workbook.getWorksheet(sheetName);
    if (!worksheet) {
      throw new Error(`シート "${sheetName}" が見つかりません`);
    }

    return {
      startRow: 1,
      endRow: worksheet.rowCount || 1,
    };
  }

  /**
   * 設定に基づいてタスク見積データを読み取る
   */
  public readTaskEstimates(config: ExcelConfig): TaskEstimate[] {
    if (!this.workbook) {
      throw new Error("Excelファイルが読み込まれていません");
    }

    const worksheet = this.workbook.getWorksheet(config.sheetName);
    if (!worksheet) {
      throw new Error(`シート "${config.sheetName}" が見つかりません`);
    }

    const tasks: TaskEstimate[] = [];
    const endRow = config.endRow || this.getDataRange(config.sheetName).endRow;

    for (let row = config.startRow; row <= endRow; row++) {
      const taskName = this.getCellValue(worksheet, config.taskNameColumn, row);

      // タスク名が空の場合はスキップ
      if (!taskName || this.convertToString(taskName).trim() === "") {
        continue;
      }

      const detailDesign = this.getNumericValue(
        worksheet,
        config.detailDesignColumn,
        row
      );
      const implementation = this.getNumericValue(
        worksheet,
        config.implementationColumn,
        row
      );
      const unitTest = this.getNumericValue(
        worksheet,
        config.unitTestColumn,
        row
      );
      const integrationTest = this.getNumericValue(
        worksheet,
        config.integrationTestColumn,
        row
      );

      // タスクデータの検証
      const taskData: TaskEstimate = {
        taskName: this.convertToString(taskName).trim(),
        detailDesign,
        implementation,
        unitTest,
        integrationTest,
      };

      const validation = this.validateTaskEstimate(taskData);
      if (validation.isValid) {
        tasks.push(taskData);
      } else {
        console.warn(`行 ${row} のタスクデータが無効です: ${validation.error}`);
      }
    }

    return tasks;
  }

  /**
   * セルの値を取得
   */
  private getCellValue(
    worksheet: Excel.Worksheet,
    column: string,
    row: number
  ): Excel.CellValue {
    const columnNumber = this.columnToNumber(column);
    const cell = worksheet.getCell(row, columnNumber);
    return cell.value;
  }

  /**
   * セルの数値を取得（数値でない場合は0を返す）
   */
  private getNumericValue(
    worksheet: Excel.Worksheet,
    column: string,
    row: number
  ): number {
    const value = this.getCellValue(worksheet, column, row);
    return this.convertToNumber(value);
  }

  /**
   * Excel セル値を文字列に変換
   */
  private convertToString(value: Excel.CellValue): string {
    if (value === null || value === undefined) {
      return "";
    }

    if (typeof value === "string") {
      return value;
    }

    if (typeof value === "number") {
      return value.toString();
    }

    if (typeof value === "boolean") {
      return value.toString();
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    // エラー値の場合
    if (typeof value === "object" && value !== null && "error" in value) {
      return `#ERROR: ${value.error}`;
    }

    // 計算結果の場合
    if (typeof value === "object" && value !== null && "result" in value) {
      return String(value.result);
    }

    // その他の型（オブジェクトなど）
    return String(value);
  }

  /**
   * Excel セル値を数値に変換
   */
  private convertToNumber(value: Excel.CellValue): number {
    if (value === null || value === undefined) {
      return 0;
    }

    // 数値型の場合
    if (typeof value === "number") {
      return isNaN(value) ? 0 : value;
    }

    // 文字列型の場合、数値に変換を試みる
    if (typeof value === "string") {
      const numericValue = parseFloat(value.trim());
      return isNaN(numericValue) ? 0 : numericValue;
    }

    // ブール値の場合
    if (typeof value === "boolean") {
      return value ? 1 : 0;
    }

    // 日付の場合（通常は数値として扱われる）
    if (value instanceof Date) {
      return value.getTime();
    }

    // その他の型の場合
    const numericValue = parseFloat(String(value));
    return isNaN(numericValue) ? 0 : numericValue;
  }

  /**
   * タスク見積データの検証
   */
  private validateTaskEstimate(task: TaskEstimate): ValidationResult {
    // タスク名の検証
    if (!task.taskName || task.taskName.trim() === "") {
      return { isValid: false, error: "タスク名が空です" };
    }

    // 見積工数の検証
    const hours = [
      task.detailDesign,
      task.implementation,
      task.unitTest,
      task.integrationTest,
    ];
    for (const hour of hours) {
      if (hour < 0) {
        return { isValid: false, error: "見積工数は0以上である必要があります" };
      }
      if (hour > 1000) {
        return {
          isValid: false,
          error: "見積工数が異常に大きいです（1000人日以上）",
        };
      }
    }

    // 全工程の工数が0の場合
    const totalHours = hours.reduce((sum, hour) => sum + hour, 0);
    if (totalHours === 0) {
      return { isValid: false, error: "全工程の見積工数が0です" };
    }

    return { isValid: true };
  }

  /**
   * 列文字（A, B, C...）から列番号（1, 2, 3...）に変換
   */
  public columnToNumber(column: string): number {
    if (!column || column.trim() === "") {
      throw new Error("列名が空です");
    }

    const upperColumn = column.toUpperCase().trim();
    let result = 0;

    for (let i = 0; i < upperColumn.length; i++) {
      const charCode = upperColumn.charCodeAt(i);
      if (charCode < 65 || charCode > 90) {
        // A-Z の範囲外
        throw new Error(`無効な列名です: ${column}`);
      }
      result = result * 26 + (charCode - 64); // A=1, B=2, ...
    }

    return result;
  }

  /**
   * 列番号（1, 2, 3...）から列文字（A, B, C...）に変換
   */
  public numberToColumn(number: number): string {
    if (number < 1) {
      throw new Error("列番号は1以上である必要があります");
    }

    let result = "";
    let num = number;

    while (num > 0) {
      num--;
      result = String.fromCharCode(65 + (num % 26)) + result; // A=65
      num = Math.floor(num / 26);
    }

    return result;
  }
}
