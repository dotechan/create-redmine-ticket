import axios, { AxiosInstance } from "axios";
import {
  RedmineConfig,
  RedmineIssue,
  RedmineIssueResponse,
  RedmineProject,
  RedmineTracker,
  RedmineStatus,
  RedminePriority,
  TicketCreationResult,
  HierarchicalTicketData,
  TicketCreationOptions,
  RedmineIssuesResponse,
  ExtendedValidationResult,
} from "../types";
import { SecurityUtils } from "../utils/security";

export class RedmineClient {
  private client: AxiosInstance;
  private config: RedmineConfig;

  constructor(config: RedmineConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseUrl,
      headers: {
        "Content-Type": "application/json",
        "X-Redmine-API-Key": config.apiKey,
      },
    });
  }

  /**
   * 接続テスト
   */
  public async testConnection(): Promise<boolean> {
    try {
      await this.client.get("/projects.json?limit=1");
      return true;
    } catch (error) {
      console.error(
        "Redmine接続テストに失敗しました:",
        SecurityUtils.sanitizeErrorMessage(error)
      );
      return false;
    }
  }

  /**
   * プロジェクト情報を取得
   */
  public async getProject(projectId: string): Promise<RedmineProject> {
    try {
      const response = await this.client.get(`/projects/${projectId}.json`);
      return response.data.project;
    } catch (error) {
      throw new Error(
        `プロジェクト取得に失敗しました: ${SecurityUtils.sanitizeErrorMessage(
          error
        )}`
      );
    }
  }

  /**
   * トラッカー一覧を取得
   */
  public async getTrackers(): Promise<RedmineTracker[]> {
    try {
      const response = await this.client.get("/trackers.json");
      return response.data.trackers;
    } catch (error) {
      throw new Error(
        `トラッカー取得に失敗しました: ${SecurityUtils.sanitizeErrorMessage(
          error
        )}`
      );
    }
  }

  /**
   * ステータス一覧を取得
   */
  public async getStatuses(): Promise<RedmineStatus[]> {
    try {
      const response = await this.client.get("/issue_statuses.json");
      return response.data.issue_statuses;
    } catch (error) {
      throw new Error(
        `ステータス取得に失敗しました: ${SecurityUtils.sanitizeErrorMessage(
          error
        )}`
      );
    }
  }

  /**
   * 優先度一覧を取得
   */
  public async getPriorities(): Promise<RedminePriority[]> {
    try {
      const response = await this.client.get(
        "/enumerations/issue_priorities.json"
      );
      return response.data.issue_priorities;
    } catch (error) {
      throw new Error(
        `優先度取得に失敗しました: ${SecurityUtils.sanitizeErrorMessage(error)}`
      );
    }
  }

  /**
   * 階層構造チケットを作成
   */
  public async createTickets(
    hierarchicalTickets: HierarchicalTicketData[],
    options: TicketCreationOptions
  ): Promise<TicketCreationResult> {
    this.validateHierarchicalTicketData(hierarchicalTickets, options);

    const result: TicketCreationResult = {
      createdTickets: [],
    };

    try {
      console.log("\n=== 階層構造チケット作成開始 ===");

      for (const ticket of hierarchicalTickets) {
        await this.createHierarchicalTicket(ticket, options, result, 0);
      }

      console.log("\n=== チケット作成完了 ===");
      return result;
    } catch (error) {
      throw new Error(
        `チケット作成処理中にエラーが発生しました: ${SecurityUtils.sanitizeErrorMessage(
          error
        )}`
      );
    }
  }

  /**
   * 階層構造チケットを再帰的に作成
   */
  private async createHierarchicalTicket(
    ticketData: HierarchicalTicketData,
    options: TicketCreationOptions,
    result: TicketCreationResult,
    level: number,
    parentId?: number
  ): Promise<number> {
    // チケット作成
    const issue: RedmineIssue = {
      subject: ticketData.subject,
      description: ticketData.description,
      project_id: this.config.projectId,
      tracker_id: options.trackerId,
      status_id: options.statusId,
      priority_id: options.priorityId,
      estimated_hours: ticketData.estimatedHours,
    };

    if (parentId) {
      issue.parent_issue_id = parentId;
    }

    console.log(`${"  ".repeat(level)}チケット作成中: ${ticketData.subject}`);
    const response = await this.createIssue(issue);
    const createdTicketId = response.issue.id;

    // 結果に追加
    const createdTicket: {
      id: number;
      subject: string;
      level: number;
      parentId?: number;
    } = {
      id: createdTicketId,
      subject: response.issue.subject,
      level: level,
    };

    if (parentId) {
      createdTicket.parentId = parentId;
    }

    result.createdTickets.push(createdTicket);

    console.log(
      `${"  ".repeat(level)}チケット作成完了: ${
        ticketData.subject
      } (ID: ${createdTicketId})`
    );

    // 子チケットを再帰的に作成
    if (ticketData.children && ticketData.children.length > 0) {
      for (const childTicket of ticketData.children) {
        await this.createHierarchicalTicket(
          childTicket,
          options,
          result,
          level + 1,
          createdTicketId
        );
      }
    }

    return createdTicketId;
  }

  /**
   * 単一のチケットを作成
   */
  private async createIssue(
    issue: RedmineIssue
  ): Promise<RedmineIssueResponse> {
    try {
      const response = await this.client.post("/issues.json", { issue });
      return response.data;
    } catch (error) {
      throw new Error(
        `チケット作成APIの呼び出しに失敗しました: ${SecurityUtils.sanitizeErrorMessage(
          error
        )}`
      );
    }
  }

  /**
   * 階層構造チケットデータの検証
   */
  private validateHierarchicalTicketData(
    tickets: HierarchicalTicketData[],
    options: TicketCreationOptions
  ): void {
    if (!tickets || tickets.length === 0) {
      throw new Error("チケットデータが空です");
    }

    // 再帰的にチケットデータを検証
    const validateTicket = (
      ticket: HierarchicalTicketData,
      level: number = 0
    ) => {
      if (!ticket.subject || ticket.subject.trim() === "") {
        throw new Error(`レベル${level}のチケットの件名が空です`);
      }
      if (ticket.estimatedHours < 0) {
        throw new Error(
          `レベル${level}のチケットの見積工数は0以上である必要があります`
        );
      }
      if (level > 10) {
        throw new Error("チケットの階層が深すぎます（最大10階層）");
      }

      if (ticket.children) {
        for (const child of ticket.children) {
          validateTicket(child, level + 1);
        }
      }
    };

    for (const ticket of tickets) {
      validateTicket(ticket);
    }

    // オプションの検証
    if (options.trackerId <= 0) {
      throw new Error("無効なトラッカーIDです");
    }
    if (options.statusId <= 0) {
      throw new Error("無効なステータスIDです");
    }
    if (options.priorityId <= 0) {
      throw new Error("無効な優先度IDです");
    }
  }

  /**
   * チケット作成結果のサマリーを表示
   */
  public displayCreationSummary(result: TicketCreationResult): void {
    console.log("\n=== チケット作成結果 ===");

    // 階層レベル別に整理
    const ticketsByLevel: { [level: number]: typeof result.createdTickets } =
      {};
    result.createdTickets.forEach((ticket) => {
      if (!ticketsByLevel[ticket.level]) {
        ticketsByLevel[ticket.level] = [];
      }
      ticketsByLevel[ticket.level].push(ticket);
    });

    // レベル順に表示
    Object.keys(ticketsByLevel)
      .map((level) => parseInt(level))
      .sort((a, b) => a - b)
      .forEach((level) => {
        console.log(`\n【レベル${level}】`);
        ticketsByLevel[level].forEach((ticket) => {
          const indent = "  ".repeat(level);
          const parentInfo = ticket.parentId ? ` (親: ${ticket.parentId})` : "";
          console.log(
            `${indent}- ${ticket.subject} (ID: ${ticket.id})${parentInfo}`
          );
        });
      });

    console.log(`\n総作成チケット数: ${result.createdTickets.length}件`);
  }

  /**
   * 設定の検証
   */
  public validateConfig(): ExtendedValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 必須フィールドの検証
    if (!this.config.baseUrl) {
      errors.push("RedmineのベースURLが設定されていません");
    } else {
      try {
        new URL(this.config.baseUrl);
      } catch {
        errors.push("RedmineのベースURLが無効な形式です");
      }
    }

    if (!this.config.apiKey) {
      errors.push("RedmineのAPIキーが設定されていません");
    } else if (this.config.apiKey.length < 10) {
      warnings.push("APIキーが短すぎる可能性があります");
    }

    if (!this.config.projectId) {
      errors.push("プロジェクトIDが設定されていません");
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * プロジェクトの問題一覧を取得
   */
  public async getProjectIssues(
    limit: number = 25,
    offset: number = 0
  ): Promise<RedmineIssuesResponse> {
    try {
      const response = await this.client.get(
        `/issues.json?project_id=${this.config.projectId}&limit=${limit}&offset=${offset}`
      );
      return response.data;
    } catch (error) {
      throw new Error(
        `問題一覧の取得に失敗しました: ${SecurityUtils.sanitizeErrorMessage(
          error
        )}`
      );
    }
  }
}
