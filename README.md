# LOGICAL FP

LOGICAL FP は、インフレと名目固定の公的年金を考慮して老後必要資金を計算し、複数資産の将来価値とアセットアロケーションを可視化する、ブラウザ完結型のシミュレーションツールです。

**公開URL:** https://simulator.logicalfp.pro/

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

## 公開(GitHub Pages + カスタムドメイン)

`main` ブランチへの push で `.github/workflows/deploy.yml` が自動的に `pnpm build` を実行し、GitHub Pagesに公開します。カスタムドメイン `simulator.logicalfp.pro` のルート配下で配信するため、ベースパスは `VITE_BASE_PATH=/`(`vite.config.ts`)に固定しています。深いパス(`/calculator` など)への直接アクセスは `404.html`(`index.html` の複製)でSPAにフォールバックします。`client/public/CNAME` にドメイン名を記載しており、ビルド成果物に含まれてデプロイされます。

初回のみ、以下の設定が必要です:

1. リポジトリの Settings → Pages → Build and deployment → Source を「GitHub Actions」に設定
2. DNSプロバイダ側で `simulator` サブドメインのCNAMEレコードを `akihidesorimachi-tech.github.io` に向ける
3. Settings → Pages → Custom domain に `simulator.logicalfp.pro` を入力して保存(DNS反映後、GitHubがドメイン所有を検証すると「Enforce HTTPS」が選択可能になります)

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
