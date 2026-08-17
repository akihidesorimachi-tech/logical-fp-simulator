# LOGICAL FP

LOGICAL FP は、インフレと名目固定の公的年金を考慮して老後必要資金を計算し、複数資産の将来価値とアセットアロケーションを可視化する、ブラウザ完結型のシミュレーションツールです。

**公開URL:** https://akihidesorimachi-tech.github.io/logical-fp-simulator/

## 起動方法

Node.js 20 以降と pnpm を用意し、プロジェクト直下で次のコマンドを実行してください。

```bash
pnpm install --frozen-lockfile
pnpm dev
```

ブラウザで `http://localhost:3000` を開くと確認できます。本番用の静的ファイルを作成する場合は、次のコマンドを実行します。

```bash
pnpm check
pnpm build
```

ビルド結果は `dist/public/` に出力されます。`pnpm start` を実行すると、Express がSPA用フォールバックを含めて配信します。

## 公開(GitHub Pages)

`main` ブランチへの push で `.github/workflows/deploy.yml` が自動的に `pnpm build` を実行し、GitHub Pages（プロジェクトページ `/logical-fp-simulator/` 配下）に公開します。ベースパスは `VITE_BASE_PATH` 環境変数(`vite.config.ts`)で切り替えており、深いパス(`/calculator` など)への直接アクセスは `404.html`（`index.html` の複製）でSPAにフォールバックします。初回のみ、リポジトリの Settings → Pages → Build and deployment → Source を「GitHub Actions」に設定してください。

## ファイル構成

| パス | 内容 |
| --- | --- |
| `client/src/pages/Portal.tsx` | ポータル画面 |
| `client/src/pages/Home.tsx` | 老後必要資金シミュレーター |
| `client/src/pages/AssetManagement.tsx` | 資産運用シミュレーター |
| `client/src/index.css` | LOGICAL FPの色・表示トークン |
| `client/public/assets/logical-fp-logo.jpeg` | ユーザー提供ロゴ |
| `CLAUDE.md` | Claude Codeでの作業ルールと計算上の注意点 |

## 移管に関する注意

この移管版では、ロゴ参照をローカルの静的ファイルに置き換え、外部ストレージ依存を除去しています。また、Manus環境固有の解析スクリプトと開発プラグインも利用しません。アプリケーションはデータベースやログイン機能を持たず、入力値はブラウザ上の状態としてのみ扱います。

現在の公開先は `https://simulator.logicalfp.pro` です。ホスティングやDNSの設定そのものはこのZIPに含まれないため、移管先のホスティングサービスに合わせて別途設定してください。
