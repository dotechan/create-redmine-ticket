// Excel読み取り用の型定義
export interface ExcelConfig {
  filePath: string;
  sheetName: string;
  headerRow: number;
  screenNameColumn: string; // 画面・機能列
  taskNameColumn: string;
  detailDesignColumn: string;
  implementationUnitColumn: string; // 実装単体列（実装+単体試験）
  integrationTestColumn: string;
  startRow: number;
  endRow?: number;
}

// 基本的なチケットデータ
interface BaseTicketData {
  subject: string;
  description: string;
  estimatedHours: number;
  children?: HierarchicalTicketData[];
}

// 工程チケット（親チケット）
export interface ProcessTicketData extends BaseTicketData {
  type: "process";
  processType: ProcessType;
}

// 画面チケット（中間チケット）
export interface ScreenTicketData extends BaseTicketData {
  type: "screen";
  screenName: string;
}

// タスクチケット（子チケット）
export interface TaskTicketData extends BaseTicketData {
  type: "task";
  processType: ProcessType;
  taskName: string;
}

// Union型で型安全性を確保
export type HierarchicalTicketData =
  | ProcessTicketData
  | ScreenTicketData
  | TaskTicketData;

// 階層構造YAML用の型定義
export interface HierarchicalTicketFile {
  tickets: HierarchicalTicketData[];
}

// 中間表現の型定義
export interface TaskEstimate {
  screenName: string; // 画面・機能名（ホーム画面、一覧画面等）
  taskName: string; // タスク名
  detailDesign: number;
  implementationUnit: number; // 実装+単体試験
  integrationTest: number;
}

// 画面別タスクグループ
export interface ScreenTaskGroup {
  screenName: string;
  tasks: TaskEstimate[];
}

export interface ProjectData {
  screenGroups: ScreenTaskGroup[]; // 画面別にグループ化
  totalEstimate: {
    detailDesign: number;
    implementationUnit: number; // 実装+単体試験
    integrationTest: number;
  };
}

// Redmine API用の型定義
export interface RedmineConfig {
  baseUrl: string;
  apiKey: string;
  projectId: string;
}

export interface RedmineIssue {
  subject: string;
  description?: string;
  project_id: string;
  tracker_id: number;
  status_id: number;
  priority_id: number;
  assigned_to_id?: number;
  parent_issue_id?: number;
  estimated_hours?: number;
  custom_fields?: Array<{
    id: number;
    value: string;
  }>;
}

export interface RedmineIssueResponse {
  issue: {
    id: number;
    subject: string;
    description: string;
    project: {
      id: number;
      name: string;
    };
    tracker: {
      id: number;
      name: string;
    };
    status: {
      id: number;
      name: string;
    };
    priority: {
      id: number;
      name: string;
    };
    assigned_to?: {
      id: number;
      name: string;
    };
    parent?: {
      id: number;
    };
    estimated_hours?: number;
    created_on: string;
    updated_on: string;
  };
}

export interface RedmineProject {
  id: number;
  name: string;
  identifier: string;
  description: string;
  status: number;
  created_on: string;
  updated_on: string;
}

export interface RedmineTracker {
  id: number;
  name: string;
}

export interface RedmineStatus {
  id: number;
  name: string;
}

export interface RedminePriority {
  id: number;
  name: string;
}

// 工程の種類
export enum ProcessType {
  DETAIL_DESIGN = "detail_design",
  IMPLEMENTATION_UNIT = "implementation_unit", // 実装+単体試験
  INTEGRATION_TEST = "integration_test",
}

// 工程名の日本語マッピング
export const PROCESS_NAMES = {
  [ProcessType.DETAIL_DESIGN]: "詳細設計",
  [ProcessType.IMPLEMENTATION_UNIT]: "実装単体", // 実装+単体試験
  [ProcessType.INTEGRATION_TEST]: "結合試験",
} as const;

// チケット作成結果（階層構造対応）
export interface TicketCreationResult {
  createdTickets: Array<{
    id: number;
    subject: string;
    level: number;
    parentId?: number;
  }>;
}

// チケット作成オプション
export interface TicketCreationOptions {
  trackerId: number;
  statusId: number;
  priorityId: number;
}

// Excel セル値の型定義（ExcelJSのCellValueに対応）
export type ExcelCellValue =
  | string
  | number
  | Date
  | boolean
  | null
  | undefined
  | { error: string }
  | { result: any };

// バリデーション結果の型定義
export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

// 拡張バリデーション結果の型定義
export interface ExtendedValidationResult extends ValidationResult {
  errors?: string[];
  warnings?: string[];
}

// 数値範囲バリデーション用の型定義
export interface NumberRangeValidation {
  value: number;
  min: number;
  max: number;
  fieldName: string;
}

// プロジェクト統計情報の型定義
export interface ProjectStatistics {
  totalTasks: number;
  totalHours: number;
  processBreakdown: {
    [key in ProcessType]: {
      hours: number;
      taskCount: number;
      percentage: number;
    };
  };
}

// エラーハンドリング用の型定義
export interface AppError extends Error {
  code?: string;
  context?: Record<string, unknown>;
}

// Redmine API レスポンスの型定義
export interface RedmineApiResponse<T> {
  data: T;
  status: number;
  statusText: string;
}

// Redmine プロジェクトの問題一覧レスポンス
export interface RedmineIssuesResponse {
  issues: RedmineIssue[];
  total_count: number;
  offset: number;
  limit: number;
}

// CLI 実行結果の型定義
export interface CLIRunResult {
  command: string;
  filePath: string;
}
