import axios, { AxiosInstance } from "axios";
import {
  RedmineConfig,
  RedmineIssue,
  RedmineIssueResponse,
  RedmineProject,
  RedmineTracker,
  RedmineStatus,
  RedminePriority,
  ProcessType,
  TicketCreationResult,
  ParentTicketData,
  ChildTicketData,
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
  public async getProject(): Promise<RedmineProject> {
    try {
      const response = await this.client.get(
        `/projects/${this.config.projectId}.json`
      );
      return response.data.project;
    } catch (error) {
      throw new Error(
        `プロジェクト情報の取得に失敗しました: ${SecurityUtils.sanitizeErrorMessage(
          error
        )}`
      );
    }
  }

  /**
   * 利用可能なトラッカー一覧を取得
   */
  public async getTrackers(): Promise<RedmineTracker[]> {
    try {
      const response = await this.client.get("/trackers.json");
      return response.data.trackers;
    } catch (error) {
      throw new Error(
        `トラッカー一覧の取得に失敗しました: ${SecurityUtils.sanitizeErrorMessage(
          error
        )}`
      );
    }
  }

  /**
   * 利用可能なステータス一覧を取得
   */
  public async getStatuses(): Promise<RedmineStatus[]> {
    try {
      const response = await this.client.get("/issue_statuses.json");
      return response.data.issue_statuses;
    } catch (error) {
      throw new Error(
        `ステータス一覧の取得に失敗しました: ${SecurityUtils.sanitizeErrorMessage(
          error
        )}`
      );
    }
  }

  /**
   * 利用可能な優先度一覧を取得
   */
  public async getPriorities(): Promise<RedminePriority[]> {
    try {
      const response = await this.client.get(
        "/enumerations/issue_priorities.json"
      );
      return response.data.issue_priorities;
    } catch (error) {
      throw new Error(
        `優先度一覧の取得に失敗しました: ${SecurityUtils.sanitizeErrorMessage(
          error
        )}`
      );
    }
  }

  /**
   * チケットを作成
   */
  public async createIssue(issue: RedmineIssue): Promise<RedmineIssueResponse> {
    try {
      const response = await this.client.post("/issues.json", { issue });
      return response.data;
    } catch (error) {
      throw new Error(
        `チケット作成に失敗しました: ${SecurityUtils.sanitizeErrorMessage(
          error
        )}`
      );
    }
  }

  /**
   * 複数のチケットを作成（親チケットと子チケット）
   */
  public async createTickets(
    parentTicketsData: ParentTicketData[],
    childTicketsData: ChildTicketData[],
    options: TicketCreationOptions
  ): Promise<TicketCreationResult> {
    // 入力データの検証
    this.validateTicketCreationData(
      parentTicketsData,
      childTicketsData,
      options
    );

    const result: TicketCreationResult = {
      parentTickets: {} as Record<ProcessType, { id: number; subject: string }>,
      childTickets: [],
    };

    try {
      // 1. 親チケットを作成
      console.log("親チケットを作成中...");
      for (const parentData of parentTicketsData) {
        const parentIssue: RedmineIssue = {
          subject: parentData.subject,
          description: parentData.description,
          project_id: this.config.projectId,
          tracker_id: options.trackerId,
          status_id: options.statusId,
          priority_id: options.priorityId,
          estimated_hours: parentData.estimatedHours,
        };

        const parentResponse = await this.createIssue(parentIssue);
        result.parentTickets[parentData.processType] = {
          id: parentResponse.issue.id,
          subject: parentResponse.issue.subject,
        };

        console.log(
          `親チケット作成完了: ${parentData.subject} (ID: ${parentResponse.issue.id})`
        );
      }

      // 2. 子チケットを作成
      console.log("子チケットを作成中...");
      for (const childData of childTicketsData) {
        const parentTicket = result.parentTickets[childData.processType];
        if (!parentTicket) {
          console.warn(`親チケットが見つかりません: ${childData.processType}`);
          continue;
        }

        const childIssue: RedmineIssue = {
          subject: childData.subject,
          description: childData.description,
          project_id: this.config.projectId,
          tracker_id: options.trackerId,
          status_id: options.statusId,
          priority_id: options.priorityId,
          parent_issue_id: parentTicket.id,
          estimated_hours: childData.estimatedHours,
        };

        const childResponse = await this.createIssue(childIssue);
        result.childTickets.push({
          taskName: childData.taskName,
          processType: childData.processType,
          id: childResponse.issue.id,
          subject: childResponse.issue.subject,
          parentId: parentTicket.id,
        });

        console.log(
          `子チケット作成完了: ${childData.subject} (ID: ${childResponse.issue.id})`
        );
      }

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
   * チケット作成データの検証
   */
  private validateTicketCreationData(
    parentTicketsData: ParentTicketData[],
    childTicketsData: ChildTicketData[],
    options: TicketCreationOptions
  ): void {
    // 親チケットデータの検証
    if (!parentTicketsData || parentTicketsData.length === 0) {
      throw new Error("親チケットデータが空です");
    }

    for (const parentData of parentTicketsData) {
      if (!parentData.subject || parentData.subject.trim() === "") {
        throw new Error("親チケットの件名が空です");
      }
      if (parentData.estimatedHours < 0) {
        throw new Error("親チケットの見積工数は0以上である必要があります");
      }
    }

    // 子チケットデータの検証
    if (!childTicketsData || childTicketsData.length === 0) {
      throw new Error("子チケットデータが空です");
    }

    for (const childData of childTicketsData) {
      if (!childData.subject || childData.subject.trim() === "") {
        throw new Error("子チケットの件名が空です");
      }
      if (childData.estimatedHours < 0) {
        throw new Error("子チケットの見積工数は0以上である必要があります");
      }
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

    console.log("\n【親チケット】");
    Object.entries(result.parentTickets).forEach(([_processType, ticket]) => {
      console.log(`- ${ticket.subject} (ID: ${ticket.id})`);
    });

    console.log("\n【子チケット】");
    const groupedChildTickets = this.groupChildTicketsByProcess(
      result.childTickets
    );

    Object.entries(groupedChildTickets).forEach(([processType, tickets]) => {
      const parentTicket = result.parentTickets[processType as ProcessType];
      console.log(`\n  [${parentTicket.subject}]`);
      tickets.forEach((ticket) => {
        console.log(`  - ${ticket.subject} (ID: ${ticket.id})`);
      });
    });

    console.log(
      `\n作成されたチケット数: 親チケット ${
        Object.keys(result.parentTickets).length
      }件, 子チケット ${result.childTickets.length}件`
    );
  }

  /**
   * 子チケットを工程別にグループ化
   */
  private groupChildTicketsByProcess(
    childTickets: TicketCreationResult["childTickets"]
  ): Record<ProcessType, TicketCreationResult["childTickets"]> {
    return childTickets.reduce((groups, ticket) => {
      if (!groups[ticket.processType]) {
        groups[ticket.processType] = [];
      }
      groups[ticket.processType].push(ticket);
      return groups;
    }, {} as Record<ProcessType, TicketCreationResult["childTickets"]>);
  }

  /**
   * プロジェクトのチケット一覧を取得
   */
  public async getProjectIssues(
    limit: number = 100
  ): Promise<RedmineIssuesResponse> {
    try {
      const response = await this.client.get(
        `/issues.json?project_id=${this.config.projectId}&limit=${limit}`
      );
      return {
        issues: response.data.issues,
        total_count: response.data.total_count,
        offset: response.data.offset,
        limit: response.data.limit,
      };
    } catch (error) {
      throw new Error(
        `プロジェクトのチケット一覧取得に失敗しました: ${SecurityUtils.sanitizeErrorMessage(
          error
        )}`
      );
    }
  }

  /**
   * 特定のチケットの詳細を取得
   */
  public async getIssue(issueId: number): Promise<RedmineIssueResponse> {
    try {
      const response = await this.client.get(`/issues/${issueId}.json`);
      return response.data;
    } catch (error) {
      throw new Error(
        `チケット詳細の取得に失敗しました: ${SecurityUtils.sanitizeErrorMessage(
          error
        )}`
      );
    }
  }

  /**
   * Redmine設定の妥当性をチェック
   */
  public async validateConfiguration(): Promise<ExtendedValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // 接続テスト
      const connectionTest = await this.testConnection();
      if (!connectionTest) {
        errors.push("Redmineサーバーに接続できません");
        return { isValid: false, errors, warnings, error: errors[0] };
      }

      // プロジェクト存在確認
      try {
        await this.getProject();
      } catch (error) {
        errors.push(
          `指定されたプロジェクト (${this.config.projectId}) が見つかりません`
        );
      }

      // トラッカー確認
      try {
        const trackers = await this.getTrackers();
        if (trackers.length === 0) {
          warnings.push("利用可能なトラッカーがありません");
        }
      } catch (error) {
        warnings.push("トラッカー情報の取得に失敗しました");
      }

      // ステータス確認
      try {
        const statuses = await this.getStatuses();
        if (statuses.length === 0) {
          warnings.push("利用可能なステータスがありません");
        }
      } catch (error) {
        warnings.push("ステータス情報の取得に失敗しました");
      }
    } catch (error) {
      errors.push(
        `設定検証中にエラーが発生しました: ${SecurityUtils.sanitizeErrorMessage(
          error
        )}`
      );
    }

    const result: ExtendedValidationResult = {
      isValid: errors.length === 0,
      errors,
      warnings,
    };

    if (errors.length > 0) {
      result.error = errors[0];
    }

    return result;
  }
}
