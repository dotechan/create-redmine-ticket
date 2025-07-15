import {
  TaskEstimate,
  ProjectData,
  ProcessType,
  PROCESS_NAMES,
  ParentTicketData,
  ChildTicketData,
  ProjectStatistics,
} from "../types";

export class DataTransformer {
  /**
   * タスク見積データをプロジェクトデータに変換
   */
  public transformToProjectData(tasks: TaskEstimate[]): ProjectData {
    const totalEstimate = this.calculateTotalEstimate(tasks);

    return {
      tasks,
      totalEstimate,
    };
  }

  /**
   * 総見積工数を計算
   */
  private calculateTotalEstimate(
    tasks: TaskEstimate[]
  ): ProjectData["totalEstimate"] {
    return tasks.reduce(
      (total, task) => ({
        detailDesign: total.detailDesign + task.detailDesign,
        implementation: total.implementation + task.implementation,
        unitTest: total.unitTest + task.unitTest,
        integrationTest: total.integrationTest + task.integrationTest,
      }),
      {
        detailDesign: 0,
        implementation: 0,
        unitTest: 0,
        integrationTest: 0,
      }
    );
  }

  /**
   * 各工程の親チケット用データを生成
   */
  public generateParentTicketData(
    projectData: ProjectData
  ): ParentTicketData[] {
    const parentTickets: ParentTicketData[] = [
      {
        processType: ProcessType.DETAIL_DESIGN,
        subject: PROCESS_NAMES[ProcessType.DETAIL_DESIGN],
        description: this.generateParentTicketDescription(
          ProcessType.DETAIL_DESIGN,
          projectData
        ),
        estimatedHours: projectData.totalEstimate.detailDesign,
      },
      {
        processType: ProcessType.IMPLEMENTATION,
        subject: PROCESS_NAMES[ProcessType.IMPLEMENTATION],
        description: this.generateParentTicketDescription(
          ProcessType.IMPLEMENTATION,
          projectData
        ),
        estimatedHours: projectData.totalEstimate.implementation,
      },
      {
        processType: ProcessType.UNIT_TEST,
        subject: PROCESS_NAMES[ProcessType.UNIT_TEST],
        description: this.generateParentTicketDescription(
          ProcessType.UNIT_TEST,
          projectData
        ),
        estimatedHours: projectData.totalEstimate.unitTest,
      },
      {
        processType: ProcessType.INTEGRATION_TEST,
        subject: PROCESS_NAMES[ProcessType.INTEGRATION_TEST],
        description: this.generateParentTicketDescription(
          ProcessType.INTEGRATION_TEST,
          projectData
        ),
        estimatedHours: projectData.totalEstimate.integrationTest,
      },
    ];

    // 見積工数が0の工程は除外
    return parentTickets.filter((ticket) => ticket.estimatedHours > 0);
  }

  /**
   * 親チケットの説明文を生成
   */
  private generateParentTicketDescription(
    processType: ProcessType,
    projectData: ProjectData
  ): string {
    const processName = PROCESS_NAMES[processType];
    const totalHours = this.getTotalHoursByProcess(processType, projectData);
    const taskCount = this.getTaskCountByProcess(processType, projectData);

    let description = `${processName}の工程チケットです。\n\n`;
    description += `## 概要\n`;
    description += `- 総見積工数: ${totalHours}人日\n`;
    description += `- 対象タスク数: ${taskCount}件\n\n`;
    description += `## 対象タスク一覧\n`;

    projectData.tasks.forEach((task, index) => {
      const hours = this.getHoursByProcess(processType, task);
      if (hours > 0) {
        description += `${index + 1}. ${task.taskName} (${hours}人日)\n`;
      }
    });

    return description;
  }

  /**
   * 各タスクの子チケット用データを生成
   */
  public generateChildTicketData(projectData: ProjectData): ChildTicketData[] {
    const childTickets: ChildTicketData[] = [];

    projectData.tasks.forEach((task) => {
      Object.values(ProcessType).forEach((processType) => {
        const hours = this.getHoursByProcess(processType, task);
        if (hours > 0) {
          childTickets.push({
            taskName: task.taskName,
            processType,
            subject: `${task.taskName} - ${PROCESS_NAMES[processType]}`,
            description: this.generateChildTicketDescription(task, processType),
            estimatedHours: hours,
          });
        }
      });
    });

    return childTickets;
  }

  /**
   * 子チケットの説明文を生成
   */
  private generateChildTicketDescription(
    task: TaskEstimate,
    processType: ProcessType
  ): string {
    const processName = PROCESS_NAMES[processType];
    const hours = this.getHoursByProcess(processType, task);

    let description = `${task.taskName}の${processName}タスクです。\n\n`;
    description += `## タスク詳細\n`;
    description += `- タスク名: ${task.taskName}\n`;
    description += `- 工程: ${processName}\n`;
    description += `- 見積工数: ${hours}人日\n\n`;
    description += `## 全工程の見積内訳\n`;
    description += `- 詳細設計: ${task.detailDesign}人日\n`;
    description += `- 実装: ${task.implementation}人日\n`;
    description += `- 単体試験: ${task.unitTest}人日\n`;
    description += `- 結合試験: ${task.integrationTest}人日\n`;

    return description;
  }

  /**
   * 工程別の総工数を取得
   */
  private getTotalHoursByProcess(
    processType: ProcessType,
    projectData: ProjectData
  ): number {
    switch (processType) {
      case ProcessType.DETAIL_DESIGN:
        return projectData.totalEstimate.detailDesign;
      case ProcessType.IMPLEMENTATION:
        return projectData.totalEstimate.implementation;
      case ProcessType.UNIT_TEST:
        return projectData.totalEstimate.unitTest;
      case ProcessType.INTEGRATION_TEST:
        return projectData.totalEstimate.integrationTest;
      default:
        // TypeScriptの exhaustive check
        const _exhaustiveCheck: never = processType;
        return _exhaustiveCheck;
    }
  }

  /**
   * 工程別のタスク数を取得
   */
  private getTaskCountByProcess(
    processType: ProcessType,
    projectData: ProjectData
  ): number {
    return projectData.tasks.filter(
      (task) => this.getHoursByProcess(processType, task) > 0
    ).length;
  }

  /**
   * タスクの特定工程の工数を取得
   */
  private getHoursByProcess(
    processType: ProcessType,
    task: TaskEstimate
  ): number {
    switch (processType) {
      case ProcessType.DETAIL_DESIGN:
        return task.detailDesign;
      case ProcessType.IMPLEMENTATION:
        return task.implementation;
      case ProcessType.UNIT_TEST:
        return task.unitTest;
      case ProcessType.INTEGRATION_TEST:
        return task.integrationTest;
      default:
        // TypeScriptの exhaustive check
        const _exhaustiveCheck: never = processType;
        return _exhaustiveCheck;
    }
  }

  /**
   * プロジェクトデータの統計情報を取得
   */
  public getProjectStatistics(projectData: ProjectData): ProjectStatistics {
    const totalTasks = projectData.tasks.length;
    const totalHours = Object.values(projectData.totalEstimate).reduce(
      (sum, hours) => sum + hours,
      0
    );

    const processBreakdown = Object.values(ProcessType).reduce(
      (breakdown, processType) => {
        const hours = this.getTotalHoursByProcess(processType, projectData);
        const taskCount = this.getTaskCountByProcess(processType, projectData);
        const percentage =
          totalHours > 0 ? Math.round((hours / totalHours) * 100) : 0;

        breakdown[processType] = {
          hours,
          taskCount,
          percentage,
        };

        return breakdown;
      },
      {} as ProjectStatistics["processBreakdown"]
    );

    return {
      totalTasks,
      totalHours,
      processBreakdown,
    };
  }

  /**
   * プロジェクトデータの検証
   */
  public validateProjectData(projectData: ProjectData): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // タスク数の検証
    if (projectData.tasks.length === 0) {
      errors.push("タスクが存在しません");
    }

    // 各タスクの検証
    projectData.tasks.forEach((task, index) => {
      if (!task.taskName || task.taskName.trim() === "") {
        errors.push(`タスク ${index + 1}: タスク名が空です`);
      }

      const totalHours =
        task.detailDesign +
        task.implementation +
        task.unitTest +
        task.integrationTest;
      if (totalHours === 0) {
        warnings.push(
          `タスク ${index + 1} (${task.taskName}): 全工程の見積工数が0です`
        );
      }

      if (totalHours > 100) {
        warnings.push(
          `タスク ${index + 1} (${
            task.taskName
          }): 見積工数が非常に大きいです (${totalHours}人日)`
        );
      }
    });

    // 総工数の検証
    const totalProjectHours = Object.values(projectData.totalEstimate).reduce(
      (sum, hours) => sum + hours,
      0
    );

    if (totalProjectHours === 0) {
      errors.push("プロジェクト全体の見積工数が0です");
    }

    if (totalProjectHours > 10000) {
      warnings.push(
        `プロジェクト全体の見積工数が非常に大きいです (${totalProjectHours}人日)`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
