# Redmine チケット作成ツール

Excel で作成された見積情報から Redmine のチケットを自動作成する TypeScript 製の CLI ツールです。

## 機能概要

- Excel ファイルから画面・機能別にタスクと工程別見積工数を読み取り
- 詳細設計、実装単体、結合試験の 3 工程に対応
- **3 階層構造**: 工程 → 画面 → タスクの階層でチケットを自動作成
- 親子関係の設定と見積工数の反映
- **3 段階のワークフロー**: Excel→YAML/HTML→ 確認 → 登録
- YAML 形式の中間ファイルによる内容確認・編集機能
- HTML 形式のプレビューによる視覚的な確認

## 前提条件

- Node.js 18.0 以上
- TypeScript 5.0 以上
- Redmine 3.0 以上（REST API 有効）
- Excel 形式のファイル（.xlsx, .xls）

## インストール

```bash
# 依存関係のインストール
npm install

# TypeScriptのビルド
npm run build
```

## 使用方法

### 基本的なワークフロー

このツールは 3 つのコマンドからなる段階的なワークフローを提供します：

#### 1. convert: Excel → YAML/HTML 変換

```bash
# Excelファイルから中間ファイル（YAML + HTML）を生成
npm run convert estimate.xlsx
```

- Excel ファイルを読み取り、チケット情報を YAML 形式で出力
- 同時に HTML プレビューファイルも生成
- 出力ファイル: `estimate.yml`, `estimate.html`

#### 2. preview: YAML → HTML プレビュー再生成

```bash
# YAMLファイルからHTMLプレビューを更新
npm run preview estimate.yml
```

- YAML ファイルを編集した後、HTML プレビューを更新
- ブラウザでチケット作成内容を視覚的に確認

#### 3. create: YAML → Redmine チケット作成

```bash
# YAMLファイルからRedmineにチケットを作成
npm run create estimate.yml
```

- YAML ファイルの内容に基づいて Redmine にチケットを作成
- 作成前に設定確認を行い、安全にチケット登録

### コマンドヘルプ

```bash
# 利用可能なコマンドを確認
npm run help
```

### 利用可能なコマンド一覧

```bash
# 基本コマンド
npm run convert <excel-file>    # Excel → YAML/HTML 変換
npm run preview <yaml-file>     # YAML → HTML プレビュー生成
npm run create <yaml-file>      # YAML → Redmine チケット作成
npm run help                    # ヘルプ表示

# 開発・ビルドコマンド
npm run build                   # TypeScript ビルド
npm run clean                   # ビルドファイル削除
npm run dev                     # 開発モード実行
npm start                       # ビルド後実行
```

### 推奨ワークフロー

1. **Excel 変換**: `npm run convert` コマンドで Excel から YAML/HTML を生成
2. **内容確認**: HTML ファイルをブラウザで開いて内容を確認
3. **必要に応じて編集**: YAML ファイルを編集して内容を調整
4. **プレビュー更新**: `npm run preview` コマンドで編集内容を HTML 確認
5. **チケット作成**: `npm run create` コマンドで Redmine に登録

## 設定項目

### convert コマンドの設定フロー

#### Step 1: Excel ファイルの設定

- **シート選択**: 対象となるワークシートを選択
- **ヘッダー行**: 列名が記載されている行番号を指定
- **列の設定**: 各項目に対応する列を選択
  - 画面・機能名の列
  - タスク名の列
  - 詳細設計工数の列
  - 実装単体工数の列
  - 結合試験工数の列
- **データ範囲**: 読み取り対象の開始行・終了行を指定

### create コマンドの設定フロー

#### Step 1: Redmine の設定

- **ベース URL**: Redmine サーバーの URL（例：https://redmine.example.com）
- **API キー**: Redmine API キー（アカウントページで確認）
- **プロジェクト ID**: 対象プロジェクトの ID または識別子

#### Step 2: チケット作成オプション

- **トラッカー**: 作成するチケットのトラッカーを選択
- **ステータス**: 作成するチケットの初期ステータスを選択
- **優先度**: 作成するチケットの優先度を選択

#### Step 3: 設定確認とチケット作成

- 設定内容を確認し、実行を承認
- 親チケット（工程別）と子チケット（タスク別）を自動作成

## ファイル形式

### Excel ファイルの形式

#### 必要な列

| 列名例     | 内容                            | 必須 | 備考                                 |
| ---------- | ------------------------------- | ---- | ------------------------------------ |
| 画面・機能 | 画面や機能の分類名              | ✓    | 結合セル対応（同一画面をグループ化） |
| タスク名   | 作業項目の名称                  | ✓    |                                      |
| 詳細設計   | 詳細設計の見積工数（人日）      | ✓    |                                      |
| 実装単体   | 実装+単体試験の見積工数（人日） | ✓    |                                      |
| 結合試験   | 結合試験の見積工数（人日）      | ✓    |                                      |

#### サンプルデータ

```
| 画面・機能 | タスク名           | 詳細設計 | 実装単体 | 結合試験 |
|------------|-------------------|----------|----------|----------|
| ホーム画面 | ログインする       | 8        | 16       | 8        |
|            | ログアウトする     | 8        | 16       | 8        |
|            | 一覧画面に遷移する | 8        | 16       | 8        |
| 一覧画面   | 一覧表示する       | 4        | 8        | 4        |
|            | スクロールする     | 1        | 2        | 1        |
|            | 詳細画面に遷移する | 1        | 2        | 1        |
| 詳細画面   | 詳細を表示する     | 4        | 8        | 4        |
```

**注意**: 画面・機能列は結合セルを使用して同一画面のタスクをグループ化できます。

### YAML 中間ファイルの形式

3 階層構造（工程 → 画面 → タスク）でチケットの親子関係を直感的に表現します：

```yaml
tickets:
  - subject: 詳細設計
    description: プロジェクト全体の詳細設計工程です。
    estimatedHours: 34
    processType: detail_design
    children:
      - subject: ホーム画面
        description: ホーム画面の詳細設計関連タスクです。
        estimatedHours: 24
        children:
          - subject: ログインする
            description: ログインするの詳細設計を行います。
            estimatedHours: 8
            taskName: ログインする
            processType: detail_design
          - subject: ログアウトする
            description: ログアウトするの詳細設計を行います。
            estimatedHours: 8
            taskName: ログアウトする
            processType: detail_design
          - subject: 一覧画面に遷移する
            description: 一覧画面に遷移するの詳細設計を行います。
            estimatedHours: 8
            taskName: 一覧画面に遷移する
            processType: detail_design
      - subject: 一覧画面
        description: 一覧画面の詳細設計関連タスクです。
        estimatedHours: 6
        children:
          - subject: 一覧表示する
            description: 一覧表示するの詳細設計を行います。
            estimatedHours: 4
            taskName: 一覧表示する
            processType: detail_design
          - subject: スクロールする
            description: スクロールするの詳細設計を行います。
            estimatedHours: 1
            taskName: スクロールする
            processType: detail_design
          - subject: 詳細画面に遷移する
            description: 詳細画面に遷移するの詳細設計を行います。
            estimatedHours: 1
            taskName: 詳細画面に遷移する
            processType: detail_design
      - subject: 詳細画面
        description: 詳細画面の詳細設計関連タスクです。
        estimatedHours: 4
        children:
          - subject: 詳細を表示する
            description: 詳細を表示するの詳細設計を行います。
            estimatedHours: 4
            taskName: 詳細を表示する
            processType: detail_design

  - subject: 実装単体
    description: プロジェクト全体の実装単体工程です。
    estimatedHours: 68
    processType: implementation_unit
    children:
      - subject: ホーム画面
        description: ホーム画面の実装単体関連タスクです。
        estimatedHours: 48
        children:
          - subject: ログインする
            description: ログインするの実装単体を行います。
            estimatedHours: 16
            taskName: ログインする
            processType: implementation_unit
          - subject: ログアウトする
            description: ログアウトするの実装単体を行います。
            estimatedHours: 16
            taskName: ログアウトする
            processType: implementation_unit
          - subject: 一覧画面に遷移する
            description: 一覧画面に遷移するの実装単体を行います。
            estimatedHours: 16
            taskName: 一覧画面に遷移する
            processType: implementation_unit
      - subject: 一覧画面
        description: 一覧画面の実装単体関連タスクです。
        estimatedHours: 12
        children:
          - subject: 一覧表示する
            description: 一覧表示するの実装単体を行います。
            estimatedHours: 8
            taskName: 一覧表示する
            processType: implementation_unit
          - subject: スクロールする
            description: スクロールするの実装単体を行います。
            estimatedHours: 2
            taskName: スクロールする
            processType: implementation_unit
          - subject: 詳細画面に遷移する
            description: 詳細画面に遷移するの実装単体を行います。
            estimatedHours: 2
            taskName: 詳細画面に遷移する
            processType: implementation_unit
      - subject: 詳細画面
        description: 詳細画面の実装単体関連タスクです。
        estimatedHours: 8
        children:
          - subject: 詳細を表示する
            description: 詳細を表示するの実装単体を行います。
            estimatedHours: 8
            taskName: 詳細を表示する
            processType: implementation_unit

  - subject: 結合試験
    description: プロジェクト全体の結合試験工程です。
    estimatedHours: 34
    processType: integration_test
    children:
      - subject: ホーム画面
        description: ホーム画面の結合試験関連タスクです。
        estimatedHours: 24
        children:
          - subject: ログインする
            description: ログインするの結合試験を行います。
            estimatedHours: 8
            taskName: ログインする
            processType: integration_test
          - subject: ログアウトする
            description: ログアウトするの結合試験を行います。
            estimatedHours: 8
            taskName: ログアウトする
            processType: integration_test
          - subject: 一覧画面に遷移する
            description: 一覧画面に遷移するの結合試験を行います。
            estimatedHours: 8
            taskName: 一覧画面に遷移する
            processType: integration_test
      - subject: 一覧画面
        description: 一覧画面の結合試験関連タスクです。
        estimatedHours: 6
        children:
          - subject: 一覧表示する
            description: 一覧表示するの結合試験を行います。
            estimatedHours: 4
            taskName: 一覧表示する
            processType: integration_test
          - subject: スクロールする
            description: スクロールするの結合試験を行います。
            estimatedHours: 1
            taskName: スクロールする
            processType: integration_test
          - subject: 詳細画面に遷移する
            description: 詳細画面に遷移するの結合試験を行います。
            estimatedHours: 1
            taskName: 詳細画面に遷移する
            processType: integration_test
      - subject: 詳細画面
        description: 詳細画面の結合試験関連タスクです。
        estimatedHours: 4
        children:
          - subject: 詳細を表示する
            description: 詳細を表示するの結合試験を行います。
            estimatedHours: 4
            taskName: 詳細を表示する
            processType: integration_test
```

#### 階層構造の特徴

- **3 階層構造**: 工程（レベル 0）→ 画面（レベル 1）→ タスク（レベル 2）の明確な階層
- **直感的な親子関係**: YAML のネスト構造で親子関係が一目で理解できます
- **画面別グループ化**: 同一画面のタスクが自動的にグループ化されます
- **柔軟な編集**: YAML 形式で手動編集が容易
- **processType**: 工程を識別するフィールド（detail_design, implementation_unit, integration_test）

### HTML プレビューファイル

- 表形式でチケット情報を表示
- 親チケット・子チケットを視覚的に区別
- 工程別の色分け表示
- ブラウザで開いて内容を確認可能

## 作成されるチケット構造

### 3 階層構造チケット

チケットは 3 階層構造で作成され、親子関係が自動的に設定されます：

#### 工程別の親チケット（レベル 0）

- **詳細設計**: 全画面・全タスクの詳細設計工程をまとめた最上位親チケット
- **実装単体**: 全画面・全タスクの実装単体工程をまとめた最上位親チケット
- **結合試験**: 全画面・全タスクの結合試験工程をまとめた最上位親チケット

#### 画面別の子チケット（レベル 1）

- 各工程の配下に画面・機能別の子チケットを作成
- 同一画面のタスクをグループ化
- 画面単位での工数集計

#### タスク別の孫チケット（レベル 2）

- 各画面の配下に個別タスクの孫チケットを作成
- 実際の作業単位でのチケット
- 見積工数の設定

#### 3 階層構造の例

```
詳細設計（レベル0：工程）
├── ホーム画面（レベル1：画面）
│   ├── ログインする（レベル2：タスク）
│   ├── ログアウトする（レベル2：タスク）
│   └── 一覧画面に遷移する（レベル2：タスク）
├── 一覧画面（レベル1：画面）
│   ├── 一覧表示する（レベル2：タスク）
│   ├── スクロールする（レベル2：タスク）
│   └── 詳細画面に遷移する（レベル2：タスク）
└── 詳細画面（レベル1：画面）
    └── 詳細を表示する（レベル2：タスク）

実装単体（レベル0：工程）
├── ホーム画面（レベル1：画面）
│   ├── ログインする（レベル2：タスク）
│   ├── ログアウトする（レベル2：タスク）
│   └── 一覧画面に遷移する（レベル2：タスク）
├── 一覧画面（レベル1：画面）
│   ├── 一覧表示する（レベル2：タスク）
│   ├── スクロールする（レベル2：タスク）
│   └── 詳細画面に遷移する（レベル2：タスク）
└── 詳細画面（レベル1：画面）
    └── 詳細を表示する（レベル2：タスク）

結合試験（レベル0：工程）
├── ホーム画面（レベル1：画面）
│   ├── ログインする（レベル2：タスク）
│   ├── ログアウトする（レベル2：タスク）
│   └── 一覧画面に遷移する（レベル2：タスク）
├── 一覧画面（レベル1：画面）
│   ├── 一覧表示する（レベル2：タスク）
│   ├── スクロールする（レベル2：タスク）
│   └── 詳細画面に遷移する（レベル2：タスク）
└── 詳細画面（レベル1：画面）
    └── 詳細を表示する（レベル2：タスク）
```

#### 3 階層構造の利点

- **明確な責任分離**: 工程・画面・タスクの責任が明確
- **効率的な管理**: 画面単位でのタスク管理が可能
- **柔軟な拡張**: さらに深い階層（レベル 3 以降）も作成可能
- **直感的な理解**: 実際の開発フローに沿った構造

## Redmine API 設定

### API キーの取得方法

1. Redmine にログイン
2. 「個人設定」→「API アクセスキー」を確認
3. キーが表示されていない場合は「表示」をクリック

### 必要な権限

- プロジェクトへのアクセス権限
- チケットの作成権限
- REST API の使用権限

### API 設定の確認

Redmine 管理者による以下の設定が必要です：

- 「管理」→「設定」→「API」→「REST API を有効にする」にチェック

## エラー対処

### よくあるエラーと対処法

#### Excel ファイル関連

- **ファイルが見つからない**: パスが正しいか確認
- **シートが見つからない**: シート名が正しいか確認
- **データが読み取れない**: 列の指定や数値形式を確認
- **画面・機能名が空**: 結合セルの設定や画面名の入力を確認

#### YAML ファイル関連

- **ファイルが見つからない**: YAML ファイルのパスが正しいか確認
- **YAML 形式エラー**: YAML 構文が正しいか確認（インデント等）
- **必須フィールド不足**: `tickets`配列が存在するか確認
- **階層構造エラー**: `children`配列の構造が正しいか確認

#### Redmine 接続関連

- **接続エラー**: URL と API キーが正しいか確認
- **プロジェクトが見つからない**: プロジェクト ID が正しいか確認
- **権限エラー**: API キーのユーザーに適切な権限があるか確認

#### チケット作成関連

- **トラッカーエラー**: 指定したトラッカーが存在するか確認
- **ステータスエラー**: 指定したステータスが有効か確認

## 開発情報

### プロジェクト構造

```
src/
├── index.ts              # メインアプリケーション
├── types/
│   └── index.ts          # 型定義
├── modules/
│   ├── excelReader.ts    # Excel読み取りモジュール
│   ├── dataTransformer.ts # データ変換モジュール
│   ├── redmineClient.ts  # Redmine API連携モジュール
│   └── fileWriter.ts     # ファイル出力モジュール（YAML/HTML）
└── cli/
    └── index.ts          # CLIインターフェース
```

### 利用技術

- **TypeScript**: 型安全な JavaScript
- **exceljs**: Excel ファイル操作（セキュリティ強化版）
- **axios**: HTTP クライアント
- **inquirer**: 対話式 CLI
- **yargs**: コマンドライン引数解析
- **js-yaml**: YAML ファイル操作

### スクリプト

- `npm run build`: TypeScript をビルド
- `npm run dev`: 開発モードで実行
- `npm start`: ビルド後のファイルを実行
- `npm run clean`: ビルドファイルを削除

## ライセンス

MIT License

## セキュリティ対策

### 実装済みの対策

- **ファイルパス検証**: パストラバーサル攻撃対策
- **入力値検証**: URL、API キー、プロジェクト ID の厳格な検証
- **機密情報マスキング**: API キーの表示時マスキング
- **エラーメッセージサニタイズ**: 機密情報の漏洩防止
- **安全なライブラリ使用**: 脆弱性のない exceljs ライブラリを採用
- **HTML エスケープ**: XSS 攻撃対策のための HTML 出力時エスケープ処理

### 利用者への注意事項

- **API キー管理**:

  - API キーは秘密情報として適切に管理してください
  - 共有フォルダやバージョン管理システムに API キーを保存しないでください
  - 使用後は適切に削除してください

- **ファイルアクセス**:

  - 信頼できる Excel ファイルのみを使用してください
  - ファイルパスは相対パスまたは絶対パスで指定してください
  - シンボリックリンクは使用できません

- **中間ファイル管理**:

  - YAML ファイルには機密情報が含まれる可能性があります
  - 不要になった中間ファイルは適切に削除してください
  - HTML ファイルを Web サーバーに配置する際は注意してください

- **ネットワーク**:
  - 可能な限り HTTPS を使用してください
  - 信頼できる Redmine サーバーのみに接続してください
  - プロキシ環境では適切な設定を行ってください

## 注意事項

- 大量のチケットを作成する場合は、Redmine サーバーの負荷にご注意ください
- 作成されたチケットの削除は手動で行う必要があります
- 実行前に必ずテスト環境で動作確認を行ってください
- 依存関係の脆弱性を定期的にチェックしてください (`npm audit`)
- YAML ファイルを手動編集する際は、構文エラーにご注意ください
- HTML プレビューは確認用途のみで、実際のチケット作成は YAML ファイルに基づいて行われます
- 階層構造は最大 10 階層まで対応していますが、深すぎる階層は避けることを推奨します
- 階層構造の YAML ファイルでは、`children`プロパティのインデントに特に注意してください
- **3 階層構造**: 工程 → 画面 → タスクの構造で、同一画面のタスクは自動的にグループ化されます
- **画面・機能列**: Excel の結合セルを使用して同一画面のタスクをグループ化できます
