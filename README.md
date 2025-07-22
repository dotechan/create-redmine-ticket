# Redmine チケット作成ツール

Excel で作成された見積情報から Redmine のチケットを自動作成する TypeScript 製の CLI ツールです。

## 機能概要

- Excel ファイルから行単位でタスクと工程別見積工数を読み取り
- 詳細設計、実装、単体試験、結合試験の 4 工程に対応
- 各工程の親チケットと、タスク別の子チケットを自動作成
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
  - タスク名の列
  - 詳細設計工数の列
  - 実装工数の列
  - 単体試験工数の列
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

| 列名例   | 内容                       | 必須 |
| -------- | -------------------------- | ---- |
| タスク名 | 作業項目の名称             | ✓    |
| 詳細設計 | 詳細設計の見積工数（人日） | ✓    |
| 実装     | 実装の見積工数（人日）     | ✓    |
| 単体試験 | 単体試験の見積工数（人日） | ✓    |
| 結合試験 | 結合試験の見積工数（人日） | ✓    |

#### サンプルデータ

```
| タスク名 | 詳細設計 | 実装 | 単体試験 | 結合試験 |
|----------|----------|------|----------|----------|
| ユーザー認証機能 | 2.0 | 5.0 | 2.0 | 1.0 |
| データ検索機能 | 1.5 | 3.0 | 1.5 | 0.5 |
| レポート出力機能 | 3.0 | 8.0 | 3.0 | 2.0 |
```

### YAML 中間ファイルの形式

階層構造でチケットの親子関係を直感的に表現します：

```yaml
tickets:
  - subject: プロジェクト全体 - 詳細設計
    description: プロジェクト全体の詳細設計工程です。
    estimatedHours: 6.5
    processType: detail_design
    children:
      - subject: ユーザー認証機能 - 詳細設計
        description: ユーザー認証機能の詳細設計を行います。
        estimatedHours: 2.0
        taskName: ユーザー認証機能
        processType: detail_design
      - subject: データ検索機能 - 詳細設計
        description: データ検索機能の詳細設計を行います。
        estimatedHours: 1.5
        taskName: データ検索機能
        processType: detail_design
      - subject: レポート出力機能 - 詳細設計
        description: レポート出力機能の詳細設計を行います。
        estimatedHours: 3.0
        taskName: レポート出力機能
        processType: detail_design

  - subject: プロジェクト全体 - 実装
    description: プロジェクト全体の実装工程です。
    estimatedHours: 16.0
    processType: implementation
    children:
      - subject: ユーザー認証機能 - 実装
        description: ユーザー認証機能の実装を行います。
        estimatedHours: 5.0
        taskName: ユーザー認証機能
        processType: implementation
      - subject: データ検索機能 - 実装
        description: データ検索機能の実装を行います。
        estimatedHours: 3.0
        taskName: データ検索機能
        processType: implementation
      - subject: レポート出力機能 - 実装
        description: レポート出力機能の実装を行います。
        estimatedHours: 8.0
        taskName: レポート出力機能
        processType: implementation

  - subject: プロジェクト全体 - 単体試験
    description: プロジェクト全体の単体試験工程です。
    estimatedHours: 6.5
    processType: unit_test
    children:
      - subject: ユーザー認証機能 - 単体試験
        description: ユーザー認証機能の単体試験を行います。
        estimatedHours: 2.0
        taskName: ユーザー認証機能
        processType: unit_test
      - subject: データ検索機能 - 単体試験
        description: データ検索機能の単体試験を行います。
        estimatedHours: 1.5
        taskName: データ検索機能
        processType: unit_test
      - subject: レポート出力機能 - 単体試験
        description: レポート出力機能の単体試験を行います。
        estimatedHours: 3.0
        taskName: レポート出力機能
        processType: unit_test

  - subject: プロジェクト全体 - 結合試験
    description: プロジェクト全体の結合試験工程です。
    estimatedHours: 3.5
    processType: integration_test
    children:
      - subject: ユーザー認証機能 - 結合試験
        description: ユーザー認証機能の結合試験を行います。
        estimatedHours: 1.0
        taskName: ユーザー認証機能
        processType: integration_test
      - subject: データ検索機能 - 結合試験
        description: データ検索機能の結合試験を行います。
        estimatedHours: 0.5
        taskName: データ検索機能
        processType: integration_test
      - subject: レポート出力機能 - 結合試験
        description: レポート出力機能の結合試験を行います。
        estimatedHours: 2.0
        taskName: レポート出力機能
        processType: integration_test
```

#### 階層構造の特徴

- **直感的な親子関係**: YAML のネスト構造で親子関係が一目で理解できます
- **3 段階以上の階層対応**: 必要に応じてさらに深い階層も作成可能
- **柔軟な編集**: YAML 形式で手動編集が容易
- **processType**: 工程を識別するフィールド（detail_design, implementation, unit_test, integration_test）

### HTML プレビューファイル

- 表形式でチケット情報を表示
- 親チケット・子チケットを視覚的に区別
- 工程別の色分け表示
- ブラウザで開いて内容を確認可能

## 作成されるチケット構造

### 階層構造チケット

チケットは階層構造で作成され、親子関係が自動的に設定されます：

#### 工程別の親チケット（レベル 0）

- **プロジェクト全体 - 詳細設計**: 全タスクの詳細設計工程をまとめた親チケット
- **プロジェクト全体 - 実装**: 全タスクの実装工程をまとめた親チケット
- **プロジェクト全体 - 単体試験**: 全タスクの単体試験工程をまとめた親チケット
- **プロジェクト全体 - 結合試験**: 全タスクの結合試験工程をまとめた親チケット

#### タスク別の子チケット（レベル 1）

- 各タスクの各工程に対応する子チケット
- 親チケットとの関連付け
- 見積工数の設定

#### 階層構造の例

```
プロジェクト全体 - 詳細設計（レベル0：親）
├── ユーザー認証機能 - 詳細設計（レベル1：子）
├── データ検索機能 - 詳細設計（レベル1：子）
└── レポート出力機能 - 詳細設計（レベル1：子）

プロジェクト全体 - 実装（レベル0：親）
├── ユーザー認証機能 - 実装（レベル1：子）
├── データ検索機能 - 実装（レベル1：子）
└── レポート出力機能 - 実装（レベル1：子）

プロジェクト全体 - 単体試験（レベル0：親）
├── ユーザー認証機能 - 単体試験（レベル1：子）
├── データ検索機能 - 単体試験（レベル1：子）
└── レポート出力機能 - 単体試験（レベル1：子）

プロジェクト全体 - 結合試験（レベル0：親）
├── ユーザー認証機能 - 結合試験（レベル1：子）
├── データ検索機能 - 結合試験（レベル1：子）
└── レポート出力機能 - 結合試験（レベル1：子）
```

#### 拡張可能な階層構造

必要に応じて、さらに深い階層（レベル 2、レベル 3...）も作成可能です：

```
プロジェクト全体 - 実装（レベル0）
└── ユーザー管理機能 - 実装（レベル1）
    ├── 認証API実装（レベル2）
    │   ├── ログインAPI実装（レベル3）
    │   └── ログアウトAPI実装（レベル3）
    └── ユーザー情報API実装（レベル2）
```

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
