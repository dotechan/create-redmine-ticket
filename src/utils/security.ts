import * as path from "path";
import * as fs from "fs";

/**
 * セキュリティ強化のためのユーティリティクラス
 */
export class SecurityUtils {
  /**
   * ファイルパスの安全性を検証
   */
  public static validateFilePath(filePath: string): {
    isValid: boolean;
    error?: string;
  } {
    try {
      // 空文字チェック
      if (!filePath || !filePath.trim()) {
        return { isValid: false, error: "ファイルパスが空です" };
      }

      // 正規化
      const normalizedPath = path.normalize(filePath);

      // パストラバーサル攻撃のチェック
      if (normalizedPath.includes("..")) {
        return { isValid: false, error: "不正なパスが含まれています" };
      }

      // 絶対パスの検証
      const resolvedPath = path.resolve(normalizedPath);

      // ファイル存在確認
      if (!fs.existsSync(resolvedPath)) {
        return { isValid: false, error: "ファイルが存在しません" };
      }

      // ファイルタイプの検証
      const stats = fs.statSync(resolvedPath);
      if (!stats.isFile()) {
        return {
          isValid: false,
          error: "指定されたパスはファイルではありません",
        };
      }

      // シンボリックリンクの検証
      if (stats.isSymbolicLink()) {
        return {
          isValid: false,
          error: "シンボリックリンクは許可されていません",
        };
      }

      // 拡張子の検証
      const ext = path.extname(resolvedPath).toLowerCase();
      if (![".xlsx", ".xls"].includes(ext)) {
        return {
          isValid: false,
          error: "サポートされていないファイル形式です",
        };
      }

      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        error: "ファイルパスの検証中にエラーが発生しました",
      };
    }
  }

  /**
   * URLの安全性を検証
   */
  public static validateUrl(url: string): {
    isValid: boolean;
    error?: string;
  } {
    try {
      if (!url || !url.trim()) {
        return { isValid: false, error: "URLが空です" };
      }

      const urlObj = new URL(url);

      // プロトコルの検証
      if (!["http:", "https:"].includes(urlObj.protocol)) {
        return {
          isValid: false,
          error: "HTTPまたはHTTPSプロトコルのみ許可されています",
        };
      }

      // ローカルホストの検証（本番環境では制限）
      if (urlObj.hostname === "localhost" || urlObj.hostname === "127.0.0.1") {
        console.warn("⚠️ ローカルホストへの接続が検出されました");
      }

      // ポート番号の検証
      if (urlObj.port && !this.isValidPort(urlObj.port)) {
        return { isValid: false, error: "無効なポート番号です" };
      }

      return { isValid: true };
    } catch (error) {
      return { isValid: false, error: "無効なURL形式です" };
    }
  }

  /**
   * APIキーの形式検証
   */
  public static validateApiKey(apiKey: string): {
    isValid: boolean;
    error?: string;
  } {
    if (!apiKey || !apiKey.trim()) {
      return { isValid: false, error: "APIキーが空です" };
    }

    const trimmedKey = apiKey.trim();

    // 長さの検証
    if (trimmedKey.length < 16) {
      return { isValid: false, error: "APIキーが短すぎます（最低16文字）" };
    }

    if (trimmedKey.length > 128) {
      return { isValid: false, error: "APIキーが長すぎます（最大128文字）" };
    }

    // 文字種の検証（英数字とハイフンのみ許可）
    if (!/^[a-zA-Z0-9\-_]+$/.test(trimmedKey)) {
      return { isValid: false, error: "APIキーに無効な文字が含まれています" };
    }

    return { isValid: true };
  }

  /**
   * プロジェクトIDの検証
   */
  public static validateProjectId(projectId: string): {
    isValid: boolean;
    error?: string;
  } {
    if (!projectId || !projectId.trim()) {
      return { isValid: false, error: "プロジェクトIDが空です" };
    }

    const trimmedId = projectId.trim();

    // 数値の場合の検証
    if (/^\d+$/.test(trimmedId)) {
      const numId = parseInt(trimmedId, 10);
      if (numId <= 0 || numId > 999999) {
        return { isValid: false, error: "プロジェクトIDの範囲が無効です" };
      }
    } else {
      // 文字列識別子の場合の検証
      if (trimmedId.length < 1 || trimmedId.length > 100) {
        return { isValid: false, error: "プロジェクト識別子の長さが無効です" };
      }

      if (!/^[a-zA-Z0-9\-_]+$/.test(trimmedId)) {
        return {
          isValid: false,
          error: "プロジェクト識別子に無効な文字が含まれています",
        };
      }
    }

    return { isValid: true };
  }

  /**
   * 数値入力の範囲検証
   */
  public static validateNumberRange(
    value: number,
    min: number,
    max: number,
    fieldName: string
  ): {
    isValid: boolean;
    error?: string;
  } {
    if (typeof value !== "number" || isNaN(value)) {
      return {
        isValid: false,
        error: `${fieldName}は数値である必要があります`,
      };
    }

    if (value < min || value > max) {
      return {
        isValid: false,
        error: `${fieldName}は${min}から${max}の範囲で入力してください`,
      };
    }

    return { isValid: true };
  }

  /**
   * 機密情報をマスクする
   */
  public static maskSensitiveInfo(
    value: string,
    showLength: number = 4
  ): string {
    if (!value || value.length <= showLength * 2) {
      return "*".repeat(8);
    }

    const start = value.substring(0, showLength);
    const end = value.substring(value.length - showLength);
    const middle = "*".repeat(Math.max(4, value.length - showLength * 2));

    return `${start}${middle}${end}`;
  }

  /**
   * エラーメッセージのサニタイズ
   */
  public static sanitizeErrorMessage(error: unknown): string {
    if (!error) return "不明なエラーが発生しました";

    let message: string;
    if (error instanceof Error) {
      message = error.message;
    } else if (typeof error === "string") {
      message = error;
    } else if (
      typeof error === "object" &&
      error !== null &&
      "message" in error
    ) {
      message = String((error as { message: unknown }).message);
    } else {
      message = String(error);
    }

    // 機密情報の可能性があるパターンを除去
    message = message.replace(
      /api[_-]?key[:\s]*[a-zA-Z0-9\-_]+/gi,
      "api_key: [MASKED]"
    );
    message = message.replace(/password[:\s]*[^\s]+/gi, "password: [MASKED]");
    message = message.replace(
      /token[:\s]*[a-zA-Z0-9\-_]+/gi,
      "token: [MASKED]"
    );
    message = message.replace(
      /authorization[:\s]*[^\s]+/gi,
      "authorization: [MASKED]"
    );

    // ファイルパスの一部をマスク
    message = message.replace(
      /\/[^\/\s]+\/[^\/\s]+\/[^\/\s]+/g,
      "/***/***/***"
    );

    return message;
  }

  /**
   * ポート番号の検証
   */
  private static isValidPort(port: string): boolean {
    const portNum = parseInt(port, 10);
    return portNum >= 1 && portNum <= 65535;
  }
}
