import {
  TaskEstimate,
  ProjectData,
  ProcessType,
  PROCESS_NAMES,
  HierarchicalTicketData,
  ProjectStatistics,
  ScreenTaskGroup,
} from "../types";

export class DataTransformer {
  /**
   * タスク見積データをプロジェクトデータに変換
   */
  public transformToProjectData(tasks: TaskEstimate[]): ProjectData {
    // 画面別にタスクをグループ化
    const screenGroups = this.groupTasksByScreen(tasks);
    const totalEstimate = this.calculateTotalEstimate(tasks);

    return {
      screenGroups,
      totalEstimate,
    };
  }

  /**
   * タスクを画面別にグループ化
   */
  private groupTasksByScreen(tasks: TaskEstimate[]): ScreenTaskGroup[] {
    const screenMap = new Map<string, TaskEstimate[]>();

    tasks.forEach((task) => {
      if (!screenMap.has(task.screenName)) {
        screenMap.set(task.screenName, []);
      }
      screenMap.get(task.screenName)!.push(task);
    });

    return Array.from(screenMap.entries()).map(([screenName, tasks]) => ({
      screenName,
      tasks,
    }));
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
        implementationUnit: total.implementationUnit + task.implementationUnit,
        integrationTest: total.integrationTest + task.integrationTest,
      }),
      {
        detailDesign: 0,
        implementationUnit: 0,
        integrationTest: 0,
      }
    );
  }

  /**
   * 階層構造チケットデータを生成（3階層：工程→画面→タスク）
   */
  public generateHierarchicalTicketData(
    projectData: ProjectData
  ): HierarchicalTicketData[] {
    const tickets: HierarchicalTicketData[] = [];

    // 各工程について階層構造を作成
    const processTypes = [
      ProcessType.DETAIL_DESIGN,
      ProcessType.IMPLEMENTATION_UNIT,
      ProcessType.INTEGRATION_TEST,
    ];

    for (const processType of processTypes) {
      const processHours = this.getProcessHours(projectData, processType);
      if (processHours > 0) {
        const processTicket = this.createProcessTicket(
          processType,
          processHours,
          projectData.screenGroups
        );
        tickets.push(processTicket);
      }
    }

    return tickets;
  }

  /**
   * 工程別のチケットを作成（3階層構造）
   */
  private createProcessTicket(
    processType: ProcessType,
    totalHours: number,
    screenGroups: ScreenTaskGroup[]
  ): HierarchicalTicketData {
    const processName = PROCESS_NAMES[processType];
    const screenChildren: HierarchicalTicketData[] = [];

    // 各画面について子チケットを作成
    for (const screenGroup of screenGroups) {
      const screenHours = this.getScreenHours(screenGroup, processType);
      if (screenHours > 0) {
        const screenTicket = this.createScreenTicket(
          screenGroup,
          processType,
          screenHours
        );
        screenChildren.push(screenTicket);
      }
    }

    const result: HierarchicalTicketData = {
      subject: processName,
      description: `プロジェクト全体の${processName}工程です。\n合計見積工数: ${totalHours}時間`,
      estimatedHours: 0, // 親チケットには予定工数を設定しない
      processType: processType,
    };

    if (screenChildren.length > 0) {
      result.children = screenChildren;
    }

    return result;
  }

  /**
   * 画面別のチケットを作成
   */
  private createScreenTicket(
    screenGroup: ScreenTaskGroup,
    processType: ProcessType,
    screenHours: number
  ): HierarchicalTicketData {
    const taskChildren: HierarchicalTicketData[] = [];

    // 各タスクについて子チケットを作成
    for (const task of screenGroup.tasks) {
      const taskHours = this.getTaskHours(task, processType);
      if (taskHours > 0) {
        taskChildren.push({
          subject: task.taskName,
          description: `${task.taskName}の${PROCESS_NAMES[processType]}を行います。`,
          estimatedHours: taskHours,
          taskName: task.taskName,
          processType: processType,
        });
      }
    }

    const result: HierarchicalTicketData = {
      subject: screenGroup.screenName,
      description: `${screenGroup.screenName}の${PROCESS_NAMES[processType]}関連タスクです。\n合計見積工数: ${screenHours}時間`,
      estimatedHours: 0, // 親チケットには予定工数を設定しない
    };

    if (taskChildren.length > 0) {
      result.children = taskChildren;
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
      case ProcessType.IMPLEMENTATION_UNIT:
        return projectData.totalEstimate.implementationUnit;
      case ProcessType.INTEGRATION_TEST:
        return projectData.totalEstimate.integrationTest;
      default:
        return 0;
    }
  }

  /**
   * 指定された画面の指定工程の工数を取得
   */
  private getScreenHours(
    screenGroup: ScreenTaskGroup,
    processType: ProcessType
  ): number {
    return screenGroup.tasks.reduce((total, task) => {
      return total + this.getTaskHours(task, processType);
    }, 0);
  }

  /**
   * 指定されたタスクの指定工程の工数を取得
   */
  private getTaskHours(task: TaskEstimate, processType: ProcessType): number {
    switch (processType) {
      case ProcessType.DETAIL_DESIGN:
        return task.detailDesign;
      case ProcessType.IMPLEMENTATION_UNIT:
        return task.implementationUnit;
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
    const totalTasks = projectData.screenGroups.reduce(
      (sum, group) => sum + group.tasks.length,
      0
    );
    const totalHours =
      projectData.totalEstimate.detailDesign +
      projectData.totalEstimate.implementationUnit +
      projectData.totalEstimate.integrationTest;

    // 全タスクを平坦化
    const allTasks = projectData.screenGroups.flatMap((group) => group.tasks);

    const processBreakdown = {
      [ProcessType.DETAIL_DESIGN]: {
        hours: projectData.totalEstimate.detailDesign,
        taskCount: allTasks.filter((t) => t.detailDesign > 0).length,
        percentage:
          totalHours > 0
            ? Math.round(
                (projectData.totalEstimate.detailDesign / totalHours) * 100
              )
            : 0,
      },
      [ProcessType.IMPLEMENTATION_UNIT]: {
        hours: projectData.totalEstimate.implementationUnit,
        taskCount: allTasks.filter((t) => t.implementationUnit > 0).length,
        percentage:
          totalHours > 0
            ? Math.round(
                (projectData.totalEstimate.implementationUnit / totalHours) *
                  100
              )
            : 0,
      },
      [ProcessType.INTEGRATION_TEST]: {
        hours: projectData.totalEstimate.integrationTest,
        taskCount: allTasks.filter((t) => t.integrationTest > 0).length,
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
