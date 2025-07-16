import * as fs from "fs/promises";
import * as yaml from "js-yaml";
import { ParentTicketData, ChildTicketData } from "../types";

export class FileWriter {
  /**
   * チケットデータをYAML形式でファイルに書き込みます。
   * @param parentTickets - 親チケットのデータ配列
   * @param childTickets - 子チケットのデータ配列
   * @param outputPath - 出力ファイルパス
   */
  public async writeYamlFile(
    parentTickets: ParentTicketData[],
    childTickets: ChildTicketData[],
    outputPath: string
  ): Promise<void> {
    try {
      const dataToDump = {
        parent_tickets: parentTickets,
        child_tickets: childTickets,
      };

      const yamlString = yaml.dump(dataToDump, {
        indent: 2,
        noRefs: true,
        sortKeys: false,
      });

      await fs.writeFile(outputPath, yamlString, "utf8");
      console.log(`✅ YAMLファイルを ${outputPath} に出力しました。`);
    } catch (error) {
      console.error(
        `❌ ファイルの書き込み中にエラーが発生しました: ${outputPath}`
      );
      throw error;
    }
  }
}
