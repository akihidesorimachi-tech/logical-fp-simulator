# LOGICAL FP — Claude Code 作業ガイド

このリポジトリは、老後必要資金と複数資産ポートフォリオを試算する**静的 React アプリケーション**です。変更時は、計算式の意味と数値表示の整合性を最優先してください。

| 項目 | 内容 |
| --- | --- |
| フレームワーク | React 19 + TypeScript + Vite |
| UI | Tailwind CSS v4 + shadcn/ui |
| ルーティング | Wouter |
| チャート | Recharts |
| パッケージマネージャー | pnpm |
| ローカル起動 | `pnpm install --frozen-lockfile && pnpm dev` |
| 型検証 | `pnpm check` |
| 本番ビルド | `pnpm build` |

## 主要ルート

| URL | コンポーネント | 役割 |
| --- | --- | --- |
| `/` | `client/src/pages/Portal.tsx` | 2つの試算ツールへのポータル |
| `/calculator` | `client/src/pages/Home.tsx` | インフレ・年金を考慮した老後必要資金試算 |
| `/asset-management` | `client/src/pages/AssetManagement.tsx` | 複数資産の将来価値・配分試算 |

## 実装上の重要事項

老後必要資金の期間は、**逝去年齢 − 退職年齢**で計算します。公的年金は名目額固定として扱い、インフレ率には連動させません。資産運用シミュレーターでは、リスク資産・安全資産・コモディティを別クラスとして扱い、初期利回りは順に **7.0%・2.5%・2.0%** です。

ブランドは **LOGICAL FP** です。ユーザー提供ロゴは `client/public/assets/logical-fp-logo.jpeg` に置いており、各画面では `/assets/logical-fp-logo.jpeg` を参照します。デザインはディープネイビー、クールグレー、ホワイトを基調とした実務的な金融ツールとして維持してください。

## 変更時の確認手順

画面修正後は `pnpm check` と `pnpm build` を必ず実行してください。ロゴや画像を追加する場合は `client/public/assets/` に格納し、外部環境固有のストレージ URL をソースコードへ直接埋め込まないでください。
