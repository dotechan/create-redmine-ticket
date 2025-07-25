import * as fs from "fs/promises";
import * as yaml from "js-yaml";
import {
  PROCESS_NAMES,
  HierarchicalTicketData,
  HierarchicalTicketFile,
} from "../types";

export class FileWriter {
  /**
   * 階層構造YAMLファイルからチケットデータを読み込みます。
   * @param yamlPath - YAMLファイルのパス
   * @returns 階層構造のチケットデータ
   */
  public async readYamlFile(
    yamlPath: string
  ): Promise<HierarchicalTicketData[]> {
    try {
      const yamlContent = await fs.readFile(yamlPath, "utf8");
      const data = yaml.load(yamlContent) as HierarchicalTicketFile;

      if (!data || typeof data !== "object" || !data.tickets) {
        throw new Error(
          "無効なYAMLファイル形式です。'tickets'配列が必要です。"
        );
      }

      console.log(`✅ 階層構造YAMLファイル ${yamlPath} を読み込みました。`);
      console.log(`ルートチケット数: ${data.tickets.length}件`);

      // 総チケット数をカウント
      const totalCount = this.countTicketsRecursively(data.tickets);
      console.log(`総チケット数: ${totalCount}件`);

      return data.tickets;
    } catch (error) {
      console.error(
        `❌ YAMLファイルの読み込み中にエラーが発生しました: ${yamlPath}`
      );
      throw error;
    }
  }

  /**
   * 階層構造チケットデータをYAML形式でファイルに書き込みます。
   * @param tickets - 階層構造のチケットデータ配列
   * @param outputPath - 出力ファイルパス
   */
  public async writeYamlFile(
    tickets: HierarchicalTicketData[],
    outputPath: string
  ): Promise<void> {
    try {
      const dataToWrite: HierarchicalTicketFile = {
        tickets: tickets,
      };

      const yamlString = yaml.dump(dataToWrite, {
        indent: 2,
        noRefs: true,
        sortKeys: false,
      });

      await fs.writeFile(outputPath, yamlString, "utf8");
      console.log(`✅ 階層構造YAMLファイルを ${outputPath} に出力しました。`);
    } catch (error) {
      console.error(
        `❌ ファイルの書き込み中にエラーが発生しました: ${outputPath}`
      );
      throw error;
    }
  }

  /**
   * 階層構造チケットデータをHTML形式でファイルに書き込みます。
   * @param tickets - 階層構造のチケットデータ配列
   * @param outputPath - 出力ファイルパス
   */
  public async writeHtmlFile(
    tickets: HierarchicalTicketData[],
    outputPath: string
  ): Promise<void> {
    try {
      const htmlContent = this.generateHtmlContent(tickets);
      await fs.writeFile(outputPath, htmlContent, "utf8");
      console.log(`✅ 階層構造HTMLファイルを ${outputPath} に出力しました。`);
    } catch (error) {
      console.error(
        `❌ ファイルの書き込み中にエラーが発生しました: ${outputPath}`
      );
      throw error;
    }
  }

  /**
   * チケット数を再帰的にカウントします。
   * @param tickets - チケットデータ配列
   * @returns 総チケット数
   */
  private countTicketsRecursively(tickets: HierarchicalTicketData[]): number {
    let count = tickets.length;
    tickets.forEach((ticket) => {
      if (ticket.children) {
        count += this.countTicketsRecursively(ticket.children);
      }
    });
    return count;
  }

  /**
   * 階層構造HTML形式のコンテンツを生成します。
   * @param tickets - 階層構造のチケットデータ配列
   * @returns HTML文字列
   */
  private generateHtmlContent(tickets: HierarchicalTicketData[]): string {
    const totalTickets = this.countTicketsRecursively(tickets);
    const totalHours = this.calculateTotalHours(tickets);

    const tableRows = this.generateTableRows(tickets, 0);

    return `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Redmineチケット作成予定一覧（階層構造）</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 20px;
            line-height: 1.6;
            color: #333;
        }
        .header {
            margin-bottom: 30px;
            padding: 20px;
            background-color: #f8f9fa;
            border-radius: 8px;
            border-left: 4px solid #007bff;
        }
        .header h1 {
            margin: 0 0 10px 0;
            color: #007bff;
        }
        .summary {
            display: flex;
            gap: 20px;
            margin-top: 15px;
        }
        .summary-item {
            padding: 10px 15px;
            background-color: white;
            border-radius: 6px;
            border: 1px solid #dee2e6;
        }
        .summary-item strong {
            display: block;
            font-size: 1.2em;
            color: #007bff;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            background-color: white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        th {
            background-color: #495057;
            color: white;
            padding: 12px 8px;
            text-align: left;
            font-weight: 600;
            border-bottom: 2px solid #dee2e6;
        }
        td {
            padding: 10px 8px;
            border-bottom: 1px solid #dee2e6;
            vertical-align: top;
        }
        tr:hover {
            background-color: #f8f9fa;
        }
        .ticket-level {
            font-weight: 600;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.85em;
            text-align: center;
            min-width: 60px;
        }
        .level-0 {
            background-color: #dc3545;
            color: white;
        }
        .level-1 {
            background-color: #28a745;
            color: white;
        }
        .level-2 {
            background-color: #ffc107;
            color: #212529;
        }
        .level-3 {
            background-color: #17a2b8;
            color: white;
        }
        .level-4-plus {
            background-color: #6c757d;
            color: white;
        }
        .task-name {
            font-weight: 500;
        }
        .task-indent {
            position: relative;
        }
        .task-indent::before {
            content: "";
            position: absolute;
            left: 0;
            color: #6c757d;
        }
        .indent-1::before { content: "└─"; left: 0; }
        .indent-2::before { content: "　└─"; left: 0; }
        .indent-3::before { content: "　　└─"; left: 0; }
        .indent-4-plus::before { content: "　　　└─"; left: 0; }
        .indent-1 { padding-left: 20px; }
        .indent-2 { padding-left: 40px; }
        .indent-3 { padding-left: 60px; }
        .indent-4-plus { padding-left: 80px; }
        .process-badge {
            padding: 3px 8px;
            border-radius: 12px;
            font-size: 0.8em;
            font-weight: 500;
            text-align: center;
        }
        .detail_design {
            background-color: #e3f2fd;
            color: #1976d2;
            border: 1px solid #bbdefb;
        }
        .implementation {
            background-color: #f3e5f5;
            color: #7b1fa2;
            border: 1px solid #ce93d8;
        }
        .unit_test {
            background-color: #e8f5e8;
            color: #388e3c;
            border: 1px solid #a5d6a7;
        }
        .integration_test {
            background-color: #fff3e0;
            color: #f57c00;
            border: 1px solid #ffcc02;
        }
        .hours {
            text-align: right;
            font-weight: 600;
            color: #495057;
        }
        .description {
            max-width: 300px;
            word-wrap: break-word;
            line-height: 1.4;
        }
        .description-content {
            white-space: pre-line;
        }
        @media (max-width: 768px) {
            .summary {
                flex-direction: column;
            }
            table {
                font-size: 0.9em;
            }
            .description {
                max-width: 200px;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Redmineチケット作成予定一覧（階層構造）</h1>
        <p>以下のチケットがRedmineに作成される予定です。階層関係を確認してください。</p>
        <div class="summary">
            <div class="summary-item">
                <strong>${tickets.length}</strong>
                <span>ルートチケット</span>
            </div>
            <div class="summary-item">
                <strong>${totalTickets}</strong>
                <span>総チケット数</span>
            </div>
            <div class="summary-item">
                <strong>${totalHours}</strong>
                <span>合計見積時間</span>
            </div>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th>階層</th>
                <th>タスク名</th>
                <th>件名</th>
                <th>工程</th>
                <th>見積時間</th>
                <th>説明</th>
            </tr>
        </thead>
        <tbody>
            ${tableRows}
        </tbody>
    </table>

    <div style="margin-top: 30px; padding: 15px; background-color: #f8f9fa; border-radius: 8px; font-size: 0.9em; color: #6c757d;">
        <p><strong>注意事項:</strong></p>
        <ul>
            <li>階層構造に従って親子関係が設定されます。</li>
            <li>見積時間は人日単位で表示されています。</li>
            <li>実際のチケット作成前に、内容と階層関係に問題がないか確認してください。</li>
        </ul>
    </div>
</body>
</html>`;
  }

  /**
   * 階層構造テーブル行を生成します。
   * @param tickets - チケットデータ配列
   * @param level - 現在の階層レベル
   * @returns HTML文字列
   */
  private generateTableRows(
    tickets: HierarchicalTicketData[],
    level: number
  ): string {
    const rows: string[] = [];

    for (const ticket of tickets) {
      rows.push(this.generateTicketRow(ticket, level));

      if (ticket.children && ticket.children.length > 0) {
        rows.push(this.generateTableRows(ticket.children, level + 1));
      }
    }

    return rows.join("\n");
  }

  /**
   * 階層構造チケットの行を生成します。
   * @param ticket - チケットデータ
   * @param level - 階層レベル
   * @returns HTML文字列
   */
  private generateTicketRow(
    ticket: HierarchicalTicketData,
    level: number
  ): string {
    const escapedDescription = this.escapeHtml(ticket.description);
    const levelClass = level <= 3 ? `level-${level}` : "level-4-plus";
    const indentClass =
      level > 0 ? (level <= 3 ? `indent-${level}` : "indent-4-plus") : "";

    const taskNameDisplay = this.getTaskNameDisplay(ticket);
    const processDisplay = this.getProcessDisplay(ticket);

    return `
            <tr>
                <td><span class="ticket-level ${levelClass}">L${level}</span></td>
                <td class="task-name task-indent ${indentClass}">${this.escapeHtml(
      taskNameDisplay
    )}</td>
                <td><strong>${this.escapeHtml(ticket.subject)}</strong></td>
                <td>${processDisplay}</td>
                <td class="hours">${ticket.estimatedHours}h</td>
                <td class="description"><div class="description-content">${escapedDescription}</div></td>
            </tr>`;
  }

  /**
   * プロセス表示を取得（型安全）
   */
  private getProcessDisplay(ticket: HierarchicalTicketData): string {
    if (ticket.type === "process" || ticket.type === "task") {
      return `<span class="process-badge ${ticket.processType}">${
        PROCESS_NAMES[ticket.processType]
      }</span>`;
    }
    return "-";
  }

  /**
   * タスク名表示を取得（型安全）
   */
  private getTaskNameDisplay(ticket: HierarchicalTicketData): string {
    if (ticket.type === "task") {
      return ticket.taskName;
    }
    if (ticket.type === "screen") {
      return ticket.screenName;
    }
    return "-";
  }

  /**
   * 総見積時間を計算します。
   * @param tickets - チケットデータ配列
   * @returns 総見積時間
   */
  private calculateTotalHours(tickets: HierarchicalTicketData[]): number {
    let total = 0;
    tickets.forEach((ticket) => {
      total += ticket.estimatedHours;
      if (ticket.children) {
        total += this.calculateTotalHours(ticket.children);
      }
    });
    return total;
  }

  /**
   * HTMLエスケープ処理
   * @param text - エスケープ対象のテキスト
   * @returns エスケープされたテキスト
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
}
