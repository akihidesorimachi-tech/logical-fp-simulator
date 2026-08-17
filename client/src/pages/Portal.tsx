import React from "react";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calculator, TrendingUp, Landmark, Sparkles, ArrowRight, ShieldCheck } from "lucide-react";

export default function Portal() {
  return (
    <div className="min-h-screen bg-[oklch(0.99_0.003_40)] text-[oklch(0.25_0.01_50)] font-sans flex flex-col relative overflow-hidden">
      
      {/* 装飾用背景パターン */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,oklch(0.95_0.02_45_/_0.4),transparent_45%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,oklch(0.96_0.01_55_/_0.3),transparent_50%)] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[radial-gradient(circle_at_center,oklch(0.97_0.01_50_/_0.2),transparent_60%)] pointer-events-none" />

      {/* ヘッダー */}
      <header className="border-b border-border bg-white/80 backdrop-blur-md py-3 relative z-10">
        <div className="container flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={`${import.meta.env.BASE_URL}assets/logical-fp-logo.jpeg`} alt="LOGICAL FP" className="h-10 object-contain" />
            <div className="h-6 w-[1px] bg-border" />
            <span className="text-xs font-bold text-muted-foreground tracking-wider">1st-CLASS FP SYSTEM</span>
          </div>
          <span className="text-xs bg-primary/5 text-primary px-3 py-1 rounded border border-primary/10 font-semibold">
            プロフェッショナル・ライフプラン設計
          </span>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="container py-12 md:py-16 max-w-5xl flex-1 flex flex-col justify-start gap-12 relative z-10">
        
        {/* メインヒーローセクション */}
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 bg-primary/5 border border-primary/10 text-primary px-3 py-1 rounded text-xs font-bold mb-4">
            インフレ・ライフプランシミュレーター
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground mb-4 leading-tight">
            論理的かつ実用的な、老後資金・資産運用設計ツール
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
            インフレ（物価上昇）と名目固定年金の影響を、1級ファイナンシャル・プランナー（FP）監修のロジックで厳密にシミュレーション。
            必要資金の精緻な算出と、それを実現するためのアセットアロケーション計画を一元的にサポートします。
          </p>
        </div>

        {/* ツール選択カード */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* ツール1: 老後資金シミュレーター */}
          <Card className="border-border bg-white hover:bg-white transition-all duration-300 shadow-sm hover:shadow-md group flex flex-col justify-between rounded-lg">
            <CardHeader className="p-6 pb-4">
              <div className="w-12 h-12 rounded bg-primary/5 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-300">
                <Calculator className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-lg font-bold text-foreground flex items-center justify-between">
                ① 老後必要資金計算システム
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground leading-relaxed pt-2">
                希望する生活費、住居費、インフレ率、公的年金（名目額固定）を厳密にモデル化。引退後から逝去までに「自己準備すべき正味の総額」を精緻に算出します。
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0 mt-4">
              <Link href="/calculator">
                <Button className="w-full bg-primary hover:bg-primary/90 text-white font-semibold transition-all py-5 rounded">
                  必要資金の計算を開始する
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* ツール2: 資産運用シミュレーター */}
          <Card className="border-border bg-white hover:bg-white transition-all duration-300 shadow-sm hover:shadow-md group flex flex-col justify-between rounded-lg">
            <CardHeader className="p-6 pb-4">
              <div className="w-12 h-12 rounded bg-primary/5 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-300">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-lg font-bold text-foreground flex items-center justify-between">
                ② 複数資産ポートフォリオ設計
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground leading-relaxed pt-2">
                保有中または今後積立予定の複数資産（リスク資産、安全資産、コモディティ）を個別登録し、将来の総資産推移とアセットアロケーション構成比率を試算します。
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0 mt-4">
              <Link href="/asset-management">
                <Button className="w-full bg-primary hover:bg-primary/90 text-white font-semibold transition-all py-5 rounded">
                  資産運用シミュレーションを起動
                </Button>
              </Link>
            </CardContent>
          </Card>

        </div>

        {/* ガイドライン/コラム的な安心エリア */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 border-t border-border">
          <div className="flex gap-3 items-start">
            <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-foreground">インフレ考慮の厳密設計</h4>
              <p className="text-xs text-muted-foreground leading-relaxed mt-1">将来のインフレ率を反映し、資産の「実質購買力」をベースに計算。物価上昇リスクを無視しない真の必要額を算出します。</p>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <Landmark className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-foreground">公的年金の報酬比例上限連携</h4>
              <p className="text-xs text-muted-foreground leading-relaxed mt-1">日本の厚生年金・国民年金の報酬比例部分の上限やインフレ不連動（名目固定）を考慮した、現実的かつ高精度な年金推計ロジックを搭載。</p>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <TrendingUp className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-foreground">複数アセット運用の最適化</h4>
              <p className="text-xs text-muted-foreground leading-relaxed mt-1">リスク資産・安全資産・コモディティの比率を設定し、複利効果とインフレ調整後の実質資産推移をシームレスに視覚化します。</p>
            </div>
          </div>
        </div>

      </main>

      {/* フッター */}
      <footer className="border-t border-border bg-white/50 py-6 text-center text-xs text-muted-foreground relative z-10 mt-auto">
        <p>© 2026 LOGICAL FP — 1級ファイナンシャルプランナー監修ライフプランシステム</p>
      </footer>

    </div>
  );
}
