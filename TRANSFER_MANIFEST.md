# Claude Code 移管パッケージ内容

| 区分 | 同梱内容 | 備考 |
| --- | --- | --- |
| アプリケーション | React / TypeScript / Vite の全ソース | `client/`、`server/`、`shared/` |
| 依存関係 | `package.json`、`pnpm-lock.yaml`、パッチ定義 | `pnpm install --frozen-lockfile` で再現可能 |
| 静的画像 | `client/public/assets/logical-fp-logo.jpeg` | ユーザー提供のLOGICAL FPロゴ |
| 開発設定 | TypeScript、Vite、Tailwind、Prettier設定 | Manus固有の実行設定は除去済み |
| 引き継ぎ資料 | `README.md`、`CLAUDE.md`、`.env.example` | 起動手順・ルート・計算上の注意を記載 |

> このパッケージには、`node_modules`、ビルド成果物、ローカルログ、Git履歴、外部サービスの認証情報を含めていません。依存関係はロックファイルから再取得してください。
