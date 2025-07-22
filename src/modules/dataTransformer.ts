import {
  TaskEstimate,
  ProjectData,
  ProcessType,
  PROCESS_NAMES,
  HierarchicalTicketData,
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
   * 階層構造チケットデータを生成
   */
  public generateHierarchicalTicketData(
    projectData: ProjectData
  ): HierarchicalTicketData[] {
    const tickets: HierarchicalTicketData[] = [];

    // 各工程について階層構造を作成
    const processTypes = [
      ProcessType.DETAIL_DESIGN,
      ProcessType.IMPLEMENTATION,
      ProcessType.UNIT_TEST,
      ProcessType.INTEGRATION_TEST,
    ];

    for (const processType of processTypes) {
      const processHours = this.getProcessHours(projectData, processType);
      if (processHours > 0) {
        const processTicket = this.createProcessTicket(
          processType,
          processHours,
          projectData.tasks
        );
        tickets.push(processTicket);
      }
    }

    return tickets;
  }

  /**
   * 工程別のチケットを作成
   */
  private createProcessTicket(
    processType: ProcessType,
    totalHours: number,
    tasks: TaskEstimate[]
  ): HierarchicalTicketData {
    const processName = PROCESS_NAMES[processType];
    const children: HierarchicalTicketData[] = [];

    // 各タスクの子チケットを作成
    for (const task of tasks) {
      const taskHours = this.getTaskHours(task, processType);
      if (taskHours > 0) {
        children.push({
          subject: `${task.taskName} - ${processName}`,
          description: `${task.taskName}の${processName}を行います。`,
          estimatedHours: taskHours,
          taskName: task.taskName,
          processType: processType,
        });
      }
    }

    const result: HierarchicalTicketData = {
      subject: `プロジェクト全体 - ${processName}`,
      description: `プロジェクト全体の${processName}工程です。\n合計見積工数: ${totalHours}時間`,
      estimatedHours: totalHours,
      processType: processType,
    };

    if (children.length > 0) {
      result.children = children;
    }

    return result;
  }

  /**
   * 指定された工程の総工数を取得
   */
  private getProcessHours(
    projectData: ProjectData,
    processType: ProcessType
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
        return 0;
    }
  }

  /**
   * 指定されたタスクの指定工程の工数を取得
   */
  private getTaskHours(task: TaskEstimate, processType: ProcessType): number {
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
        return 0;
    }
  }

  /**
   * プロジェクト統計情報を生成
   */
  public getProjectStatistics(projectData: ProjectData): ProjectStatistics {
    const totalTasks = projectData.tasks.length;
    const totalHours =
      projectData.totalEstimate.detailDesign +
      projectData.totalEstimate.implementation +
      projectData.totalEstimate.unitTest +
      projectData.totalEstimate.integrationTest;

    const processBreakdown = {
      [ProcessType.DETAIL_DESIGN]: {
        hours: projectData.totalEstimate.detailDesign,
        taskCount: projectData.tasks.filter((t) => t.detailDesign > 0).length,
        percentage:
          totalHours > 0
            ? Math.round(
                (projectData.totalEstimate.detailDesign / totalHours) * 100
              )
            : 0,
      },
      [ProcessType.IMPLEMENTATION]: {
        hours: projectData.totalEstimate.implementation,
        taskCount: projectData.tasks.filter((t) => t.implementation > 0).length,
        percentage:
          totalHours > 0
            ? Math.round(
                (projectData.totalEstimate.implementation / totalHours) * 100
              )
            : 0,
      },
      [ProcessType.UNIT_TEST]: {
        hours: projectData.totalEstimate.unitTest,
        taskCount: projectData.tasks.filter((t) => t.unitTest > 0).length,
        percentage:
          totalHours > 0
            ? Math.round(
                (projectData.totalEstimate.unitTest / totalHours) * 100
              )
            : 0,
      },
      [ProcessType.INTEGRATION_TEST]: {
        hours: projectData.totalEstimate.integrationTest,
        taskCount: projectData.tasks.filter((t) => t.integrationTest > 0)
          .length,
        percentage:
          totalHours > 0
            ? Math.round(
                (projectData.totalEstimate.integrationTest / totalHours) * 100
              )
            : 0,
      },
    };

    return {
      totalTasks,
      totalHours,
      processBreakdown,
    };
  }
}
