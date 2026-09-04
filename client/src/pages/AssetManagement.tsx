import React, { useState, useMemo, useRef } from "react";
import { Link } from "wouter";
import * as XLSX from "xlsx";
import { sanitizeNumericString } from "@/lib/utils";
import Disclaimer from "@/components/Disclaimer";
import DownloadButtons from "@/components/DownloadButtons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ArrowLeft, 
  TrendingUp, 
  Plus, 
  Trash2, 
  Sparkles, 
  Coins, 
  Landmark, 
  ShieldCheck, 
  Calendar, 
  Percent, 
  DollarSign,
  HelpCircle,
  Briefcase
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as ChartTooltip, 
  Legend,
  PieChart,
  Pie,
  Cell
} from "recharts";

// 資産の型定義
interface Asset {
  id: string;
  name: string;
  assetClass: "risk" | "safe" | "commodity";
  currentValue: number; // 万円
  contributionType: "monthly" | "yearly";
  contributionValue: number; // 万円
  expectedReturn: number; // %
  yearsToContribute: number; // 年
}

export default function AssetManagement() {
  // 画面遷移時にスクロール位置を最上部にリセット
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // 画像ダウンロード時にキャプチャする対象（ページ全体）
  const pageRef = useRef<HTMLDivElement>(null);

  // 共通設定：資産取り崩し開始 (X年後)
  const [yearsToRetire, setYearsToRetire] = useState<number>(30);

  // 複数資産の初期状態
  const [assets, setAssets] = useState<Asset[]>([
    {
      id: "1",
      name: "全世界株式インデックス",
      assetClass: "risk",
      currentValue: 0,
      contributionType: "monthly",
      contributionValue: 5,
      expectedReturn: 7.0,
      yearsToContribute: 30,
    },
    {
      id: "2",
      name: "個人向け国債",
      assetClass: "safe",
      currentValue: 0,
      contributionType: "yearly",
      contributionValue: 12,
      expectedReturn: 2.5,
      yearsToContribute: 30,
    }
  ]);

  // 想定利回り(小数)の入力中テキストを資産IDごとに保持する。
  // 数値stateだけを value に使うと、末尾の"."が確定するたびに消えてしまい
  // 「6.」の後に「5」を打っても「6.5」にならない問題が起きるため、
  // 入力中は生の文字列をそのまま表示し、blur時に数値表示へ戻す。
  const [expectedReturnDrafts, setExpectedReturnDrafts] = useState<Record<string, string>>({});

  // 共通設定が変更されたとき、各資産の積立年数がX年後を超えないように調整
  const handleYearsToRetireChange = (val: number) => {
    setYearsToRetire(val);
    setAssets(prev => prev.map(a => {
      if (a.yearsToContribute > val) {
        return { ...a, yearsToContribute: val };
      }
      return a;
    }));
  };

  // 資産を追加
  const addAsset = () => {
    const newId = Date.now().toString();
    setAssets([
      ...assets,
      {
        id: newId,
        name: `新規資産 ${assets.length + 1}`,
        assetClass: "risk",
        currentValue: 0,
        contributionType: "monthly",
        contributionValue: 0,
        expectedReturn: 7.0,
        yearsToContribute: yearsToRetire,
      }
    ]);
  };

  // 資産を削除
  const removeAsset = (id: string) => {
    if (assets.length <= 1) return; // 最低1つは残す
    setAssets(assets.filter(a => a.id !== id));
  };

  // 資産情報を更新
  const updateAsset = (id: string, fields: Partial<Asset>) => {
    setAssets(assets.map(a => {
      if (a.id === id) {
        const updated = { ...a, ...fields };
        
        // 資産クラスが変更された場合、想定利回りを推奨初期値に自動更新する
        if (fields.assetClass !== undefined && fields.assetClass !== a.assetClass) {
          if (fields.assetClass === "risk") {
            updated.expectedReturn = 7.0;
          } else if (fields.assetClass === "safe") {
            updated.expectedReturn = 2.5;
          } else if (fields.assetClass === "commodity") {
            updated.expectedReturn = 2.0;
          }
        }

        // 積立年数は「取り崩し開始（X年後）」を超えないように制御
        if (updated.yearsToContribute > yearsToRetire) {
          updated.yearsToContribute = yearsToRetire;
        }
        return updated;
      }
      return a;
    }));
  };

  // 1万円単位のフォーマッター
  const formatYen = (value: number) => {
    if (value >= 10000) {
      const oku = Math.floor(value / 10000);
      const man = Math.round(value % 10000);
      return `${oku}億${man > 0 ? `${man}万` : ""}円`;
    }
    return `${Math.round(value)}万円`;
  };

  // 入力値変更ハンドラ (0が残る問題を解消)
  const handleNumberInput = (setter: (val: number) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/^0+/, "");
    if (val === "") {
      setter(0);
    } else {
      const num = parseFloat(val);
      if (!isNaN(num)) setter(num);
    }
  };

  const handleAssetNumberInput = (id: string, field: keyof Asset, maxVal?: number, allowDecimal = false) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = sanitizeNumericString(e.target.value, allowDecimal).replace(/^0+(?=\d)/, "");
    let num = val === "" || val === "." ? 0 : parseFloat(val);
    if (isNaN(num)) num = 0;
    if (maxVal !== undefined && num > maxVal) num = maxVal;
    updateAsset(id, { [field]: num });
  };

  // 想定利回り用：入力中は生の文字列(末尾の"."を含む)をそのまま保持し、
  // blur時にクリアして数値ベースの表示に戻す
  const handleExpectedReturnChange = (id: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = sanitizeNumericString(e.target.value, true);
    setExpectedReturnDrafts(prev => ({ ...prev, [id]: cleaned }));
    const val = cleaned.replace(/^0+(?=\d)/, "");
    let num = val === "" || val === "." ? 0 : parseFloat(val);
    if (isNaN(num)) num = 0;
    updateAsset(id, { expectedReturn: num });
  };

  const handleExpectedReturnBlur = (id: string) => () => {
    setExpectedReturnDrafts(prev => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  // 0年目からX年目までの推移シミュレーション計算
  const yearlyData = useMemo(() => {
    const data = [];
    
    for (let year = 0; year <= yearsToRetire; year++) {
      let riskTotal = 0;
      let safeTotal = 0;
      let commodityTotal = 0;
      let riskInvested = 0;
      let safeInvested = 0;
      let commodityInvested = 0;

      assets.forEach(asset => {
        const r = asset.expectedReturn / 100;
        
        // 1. 初期一括投資額の複利運用
        const initValue = asset.currentValue * Math.pow(1 + r, year);
        const initInvested = asset.currentValue;

        // 2. 積立部分の運用
        let accumValue = 0;
        let accumInvested = 0;

        // この年（year）までに積み立てた実質年数
        const activeContributeYears = Math.min(year, asset.yearsToContribute);
        
        if (asset.contributionType === "monthly") {
          const monthlyRate = r / 12;
          const monthlyContribution = asset.contributionValue;
          
          // 積立期間中の運用額
          if (activeContributeYears > 0) {
            if (r === 0) {
              accumValue = monthlyContribution * 12 * activeContributeYears;
            } else {
              // 毎月の複利計算
              let tempBalance = 0;
              for (let m = 1; m <= activeContributeYears * 12; m++) {
                tempBalance = tempBalance * (1 + monthlyRate) + monthlyContribution;
              }
              accumValue = tempBalance;
            }
            accumInvested = monthlyContribution * 12 * activeContributeYears;
          }

          // 積立終了後、現在（year）までの複利運用（寝かせる期間）
          const sleepingYears = year - activeContributeYears;
          if (sleepingYears > 0 && r > 0) {
            accumValue = accumValue * Math.pow(1 + r, sleepingYears);
          }
        } else {
          // 年額積立
          const yearlyContribution = asset.contributionValue;
          
          if (activeContributeYears > 0) {
            if (r === 0) {
              accumValue = yearlyContribution * activeContributeYears;
            } else {
              // 毎年積立複利（期末積立と仮定）
              accumValue = yearlyContribution * (Math.pow(1 + r, activeContributeYears) - 1) / r;
            }
            accumInvested = yearlyContribution * activeContributeYears;
          }

          // 積立終了後、現在（year）までの複利運用
          const sleepingYears = year - activeContributeYears;
          if (sleepingYears > 0 && r > 0) {
            accumValue = accumValue * Math.pow(1 + r, sleepingYears);
          }
        }

        const totalValueForAsset = initValue + accumValue;
        const totalInvestedForAsset = initInvested + accumInvested;

        if (asset.assetClass === "risk") {
          riskTotal += totalValueForAsset;
          riskInvested += totalInvestedForAsset;
        } else if (asset.assetClass === "safe") {
          safeTotal += totalValueForAsset;
          safeInvested += totalInvestedForAsset;
        } else {
          commodityTotal += totalValueForAsset;
          commodityInvested += totalInvestedForAsset;
        }
      });

      data.push({
        year,
        risk: Math.round(riskTotal),
        safe: Math.round(safeTotal),
        commodity: Math.round(commodityTotal),
        total: Math.round(riskTotal + safeTotal + commodityTotal),
        invested: Math.round(riskInvested + safeInvested + commodityInvested),
      });
    }

    return data;
  }, [assets, yearsToRetire]);

  // 最終結果 (X年後)
  const finalYearData = yearlyData[yearlyData.length - 1];
  const totalFinalValue = finalYearData.total;
  const totalInvested = finalYearData.invested;
  const totalEarnings = Math.max(0, totalFinalValue - totalInvested);

  // 資産クラス別の比率データ (円グラフ用)
  const classData = useMemo(() => {
    return [
      { name: "リスク資産", value: finalYearData.risk, color: "var(--chart-1)", label: "株式・投信など" },
      { name: "安全資産", value: finalYearData.safe, color: "var(--chart-2)", label: "国債・預金など" },
      { name: "コモディティ", value: finalYearData.commodity, color: "var(--chart-3)", label: "金・プラチナなど" },
    ].filter(d => d.value > 0);
  }, [finalYearData]);

  // 各資産クラスの比率算出
  const totalForRatio = finalYearData.risk + finalYearData.safe + finalYearData.commodity;
  const riskRatio = totalForRatio > 0 ? (finalYearData.risk / totalForRatio) * 100 : 0;
  const safeRatio = totalForRatio > 0 ? (finalYearData.safe / totalForRatio) * 100 : 0;
  const commodityRatio = totalForRatio > 0 ? (finalYearData.commodity / totalForRatio) * 100 : 0;

  const assetClassLabel = (c: Asset["assetClass"]) =>
    c === "risk" ? "リスク資産" : c === "safe" ? "安全資産" : "コモディティ";

  // Excelダウンロード（スマホ用/PC用でファイル名のみ変える。
  // データ内容自体は共通で、将来推移は画面表示の年数ピックアップではなく全期間を出力する）
  const handleDownloadExcel = (orientation: "portrait" | "landscape") => {
    const wb = XLSX.utils.book_new();

    const assetHeader = ["資産名", "資産クラス", "現在保有価額(万円)", "積立種別", "想定積立額(万円)", "想定利回り(%)", "積立年数"];
    const assetRows = assets.map(a => [
      a.name,
      assetClassLabel(a.assetClass),
      a.currentValue,
      a.contributionType === "monthly" ? "月額" : "年額",
      a.contributionValue,
      a.expectedReturn,
      a.yearsToContribute,
    ]);

    const summaryRows: (string | number)[][] = [
      ["項目", "値"],
      ["共通設定：資産取り崩し開始（評価時点）", `${yearsToRetire}年後`],
      [`${yearsToRetire}年後の将来予測結果（合計評価額）`, `${totalFinalValue}万円`],
      ["投資元本累計", `${totalInvested}万円`],
      ["運用益累計", `${totalEarnings}万円`],
      ["運用倍率", totalInvested > 0 ? `${(totalFinalValue / totalInvested).toFixed(2)}倍` : "1.00倍"],
      ["リスク資産（最終年）", `${finalYearData.risk}万円（${riskRatio.toFixed(1)}%）`],
      ["安全資産（最終年）", `${finalYearData.safe}万円（${safeRatio.toFixed(1)}%）`],
      ["コモディティ（最終年）", `${finalYearData.commodity}万円（${commodityRatio.toFixed(1)}%）`],
    ];

    const yearlyHeader = ["年", "リスク資産", "安全資産", "コモディティ", "合計評価額", "投資元本累計", "運用益累計"];
    const yearlyRows = yearlyData.map(d => [d.year, d.risk, d.safe, d.commodity, d.total, d.invested, d.total - d.invested]);

    const wsAssets = XLSX.utils.aoa_to_sheet([assetHeader, ...assetRows]);
    wsAssets['!cols'] = assetHeader.map(() => ({ wch: 16 }));
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    wsSummary['!cols'] = [{ wch: 36 }, { wch: 22 }];
    const wsYearly = XLSX.utils.aoa_to_sheet([yearlyHeader, ...yearlyRows]);
    wsYearly['!cols'] = yearlyHeader.map(() => ({ wch: 14 }));

    XLSX.utils.book_append_sheet(wb, wsAssets, "資産一覧");
    XLSX.utils.book_append_sheet(wb, wsSummary, "サマリー");
    XLSX.utils.book_append_sheet(wb, wsYearly, "年次推移（全期間）");

    XLSX.writeFile(wb, `資産運用シミュレーション_${orientation === "portrait" ? "スマホ用" : "PC用"}.xlsx`);
  };

  return (
    <div ref={pageRef} className="min-h-screen bg-[oklch(0.99_0.003_40)] text-[oklch(0.25_0.01_50)] font-sans">
      {/* 装飾用背景パターン */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,oklch(0.95_0.02_45_/_0.4),transparent_45%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,oklch(0.96_0.01_55_/_0.3),transparent_50%)] pointer-events-none" />

      {/* ナビゲーションバー */}
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-xs font-semibold">ポータル</span>
            </Link>
            <div className="h-4 w-[1px] bg-border" />
            <div className="flex items-center gap-2">
              <img src={`${import.meta.env.BASE_URL}assets/logical-fp-logo.jpeg`} alt="LOGICAL FP" className="h-8 object-contain" />
              <div className="h-4 w-[1px] bg-border" />
              <div>
                <h1 className="text-xs font-bold text-foreground">複数資産ポートフォリオ設計</h1>
                <p className="text-[9px] text-muted-foreground">1st-CLASS FP SYSTEM</p>
              </div>
            </div>
          </div>
          <span className="text-xs bg-primary/5 text-primary px-3 py-1 rounded border border-primary/10 font-semibold">
            1級FP運用モデル
          </span>
        </div>
      </header>

      <main className="container py-8 max-w-7xl relative z-10">
        {/* タイトルセクション */}
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground mb-3">
            複数資産ポートフォリオ・シミュレーション
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
            保有中または積立予定の複数アセット（リスク資産、安全資産、コモディティ）を個別登録。
            将来の資産成長推移と目標アセットアロケーション比率を厳密にシミュレーションします。
          </p>
        </div>

        {/* 結果ダウンロード */}
        <div className="max-w-3xl mx-auto mb-8">
          <DownloadButtons captureRef={pageRef} filenameBase="資産運用シミュレーション" onDownloadExcel={handleDownloadExcel} />
        </div>

        {/* 共通設定エリア */}
        <Card className="border-border bg-primary/5 shadow-inner mb-8 rounded-lg">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[oklch(0.25_0.01_40)] flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[oklch(0.45_0.02_40)]" />
                  共通設定：資産取り崩し開始（評価時点）
                </h3>
                <p className="text-xs text-[oklch(0.45_0.01_50)]">
                  追加したすべての資産が、ここで設定した「X年後」にいくらになっているかを一括計算します。
                </p>
              </div>
              <div className="flex items-center gap-4 min-w-[280px] md:min-w-[350px]">
                <Slider
                  value={[yearsToRetire]}
                  onValueChange={(val) => handleYearsToRetireChange(val[0])}
                  min={1}
                  max={50}
                  step={1}
                  className="flex-1"
                />
                <div className="relative w-32 flex-shrink-0">
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={yearsToRetire === 0 ? "" : yearsToRetire}
                    onChange={(e) => {
                      const val = parseInt(sanitizeNumericString(e.target.value)) || 0;
                      handleYearsToRetireChange(Math.min(50, val));
                    }}
                    placeholder="0"
                    className="pr-14 text-right font-bold text-[oklch(0.3_0.02_40)] bg-white"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[oklch(0.45_0.02_40)]">年後</span>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-[oklch(0.5_0.01_50)] leading-relaxed mt-4 pt-3 border-t border-[oklch(0.9_0.005_45)]">
              ※各資産の積立は、月額なら毎月末、年額なら毎年末にまとめて積み立てるものとして複利計算しています（期首の一括投資分を除く）。また、想定利回りは税金を考慮しない税引前の数値としてご入力ください（NISA等の非課税口座か、課税口座（譲渡益に約20.315%課税）かで実際の手取りは異なります）。
            </p>
          </CardContent>
        </Card>

        {/* メイングリッド */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* 左カラム：資産追加・編集リスト */}
          <div className="lg:col-span-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2 text-[oklch(0.25_0.01_40)]">
                <Briefcase className="w-5 h-5 text-[oklch(0.45_0.02_40)]" />
                資産ポートフォリオ構成
              </h2>
            </div>

            <div className="space-y-4">
              {assets.map((asset, index) => (
                <Card key={asset.id} className="border-[oklch(0.92_0.005_50)] shadow-sm bg-white/90 backdrop-blur-md relative overflow-hidden transition-all duration-200 hover:shadow-md">
                  {/* 左端のカラー帯（資産クラス別） */}
                  <div 
                    className="absolute left-0 top-0 bottom-0 w-1.5" 
                    style={{ 
                      backgroundColor: 
                        asset.assetClass === "risk" ? "#cc5a43" : 
                        asset.assetClass === "safe" ? "#5c8a75" : 
                        "#cca15c" 
                    }}
                  />
                  
                  <CardHeader className="p-4 pb-2 flex flex-row items-center justify-start gap-3 space-y-0 pl-6 border-b border-[oklch(0.97_0.002_50)] bg-[oklch(0.98_0.001_45)]">
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs font-bold text-[oklch(0.4_0.02_40)] bg-[oklch(0.92_0.01_45)] px-2 py-0.5 rounded">資産 {index + 1}</span>
                      {assets.length > 1 && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => removeAsset(asset.id)}
                          className="h-7 w-7 text-[oklch(0.6_0.15_20)] hover:text-[oklch(0.5_0.15_20)] hover:bg-[oklch(0.88_0.02_45)] rounded-full"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                    <div className="h-4 w-[1px] bg-[oklch(0.85_0.005_50)] flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <Input
                        value={asset.name}
                        onChange={(e) => updateAsset(asset.id, { name: e.target.value })}
                        className="font-bold text-sm h-8 border-none focus-visible:ring-1 focus-visible:ring-[oklch(0.45_0.02_40)] bg-transparent hover:bg-white/80 px-2 rounded w-full"
                        placeholder="資産名を入力"
                      />
                    </div>
                  </CardHeader>

                  <CardContent className="p-5 pl-6 flex flex-col gap-4 text-xs">
                    {/* 1. 資産クラス (1行) */}
                    <div className="flex items-center justify-between gap-4">
                      <Label className="text-xs font-semibold text-[oklch(0.4_0.01_45)] w-28 flex-shrink-0">資産クラス</Label>
                      <Select
                        value={asset.assetClass}
                        onValueChange={(val: "risk" | "safe" | "commodity") => {
                          updateAsset(asset.id, { assetClass: val });
                          setExpectedReturnDrafts(prev => {
                            if (!(asset.id in prev)) return prev;
                            const next = { ...prev };
                            delete next[asset.id];
                            return next;
                          });
                        }}
                      >
                        <SelectTrigger className="h-9 text-xs bg-white border-[oklch(0.9_0.01_45)] flex-1">
                          <SelectValue placeholder="選択してください" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="risk" className="text-xs">リスク資産 (株式・投信・外貨等)</SelectItem>
                          <SelectItem value="safe" className="text-xs">安全資産 (日本国債・預金等)</SelectItem>
                          <SelectItem value="commodity" className="text-xs">コモディティ (金・プラチナ・原油等)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* 2. 現在保有価額 (1行) */}
                    <div className="flex items-center justify-between gap-4">
                      <Label className="text-xs font-semibold text-[oklch(0.4_0.01_45)] w-28 flex-shrink-0">現在保有価額</Label>
                      <div className="relative flex-1">
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={asset.currentValue === 0 ? "" : asset.currentValue}
                          onChange={handleAssetNumberInput(asset.id, "currentValue")}
                          placeholder="0"
                          className="h-9 pr-16 text-right font-medium bg-white border-[oklch(0.9_0.01_45)] w-full"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[oklch(0.5_0.01_50)] font-medium">万円</span>
                      </div>
                    </div>

                    {/* 3. 想定積立額 (1行) */}
                    <div className="flex items-center justify-between gap-4">
                      <Label className="text-xs font-semibold text-[oklch(0.4_0.01_45)] w-28 flex-shrink-0">想定積立額</Label>
                      <div className="flex gap-2 flex-1">
                        <Select
                          value={asset.contributionType}
                          onValueChange={(val: "monthly" | "yearly") => updateAsset(asset.id, { contributionType: val })}
                        >
                          <SelectTrigger className="h-9 w-24 text-xs bg-white border-[oklch(0.9_0.01_45)] flex-shrink-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="monthly" className="text-xs">月額</SelectItem>
                            <SelectItem value="yearly" className="text-xs">年額</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="flex items-center gap-1 flex-1 min-w-0">
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={asset.contributionValue === 0 ? "" : asset.contributionValue}
                            onChange={handleAssetNumberInput(asset.id, "contributionValue")}
                            placeholder="0"
                            className="h-9 text-right font-medium bg-white border-[oklch(0.9_0.01_45)] w-full min-w-0"
                          />
                          <span className="text-xs text-[oklch(0.5_0.01_50)] font-medium flex-shrink-0">万円</span>
                        </div>
                      </div>
                    </div>

                    {/* 4. 想定利回り (1行) */}
                    <div className="flex items-center justify-between gap-4">
                      <Label className="text-xs font-semibold text-[oklch(0.4_0.01_45)] w-28 flex-shrink-0">想定利回り (年率)</Label>
                      <div className="relative flex-1">
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={expectedReturnDrafts[asset.id] ?? (asset.expectedReturn === 0 ? "" : asset.expectedReturn)}
                          onChange={handleExpectedReturnChange(asset.id)}
                          onBlur={handleExpectedReturnBlur(asset.id)}
                          placeholder="0.0"
                          className="h-9 pr-12 text-right font-medium bg-white border-[oklch(0.9_0.01_45)] w-full"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[oklch(0.5_0.01_50)] font-medium">%</span>
                      </div>
                    </div>

                    {/* 5. 積立年数 (1行 + スライダーは下) */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-4">
                        <Label className="text-xs font-semibold text-[oklch(0.4_0.01_45)] w-28 flex-shrink-0">積立年数</Label>
                        <div className="relative flex-1">
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={asset.yearsToContribute === 0 ? "" : asset.yearsToContribute}
                            onChange={handleAssetNumberInput(asset.id, "yearsToContribute", yearsToRetire)}
                            placeholder="0"
                            className="h-9 pr-16 text-right font-medium bg-white border-[oklch(0.9_0.01_45)] w-full"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[oklch(0.5_0.01_50)] font-medium">年間</span>
                        </div>
                      </div>
                      <div className="flex gap-4 items-center pl-32">
                        <Slider
                          value={[asset.yearsToContribute]}
                          onValueChange={(val) => updateAsset(asset.id, { yearsToContribute: val[0] })}
                          min={0}
                          max={yearsToRetire}
                          step={1}
                          className="flex-1"
                        />
                      </div>
                      <p className="text-[10px] text-[oklch(0.5_0.01_50)] pl-32">※ 積立年数の上限は共通設定の「取り崩し開始（{yearsToRetire}年後）」までに自動制限されます。</p>
                    </div>

                  </CardContent>
                </Card>
              ))}
            </div>

            <Button 
              onClick={addAsset} 
              variant="outline"
              className="w-full border-dashed border-[oklch(0.8_0.01_45)] hover:border-[oklch(0.6_0.01_45)] text-[oklch(0.45_0.02_40)] hover:bg-[oklch(0.97_0.005_45)] py-6 flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              新しい資産を追加する
            </Button>
          </div>

          {/* 右カラム：シミュレーション結果 */}
          <div className="lg:col-span-6 space-y-8">
            
            {/* メインサマリーカード */}
            <Card className="border-border bg-gradient-to-br from-card to-primary/5 shadow-md overflow-hidden relative rounded-lg">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs font-bold text-primary uppercase tracking-wider">
                  {yearsToRetire}年後の将来予測結果
                </CardDescription>
                <CardTitle className="text-3xl font-extrabold text-foreground">
                  {formatYen(totalFinalValue)}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="grid grid-cols-3 gap-4 border-t border-border pt-4 text-xs">
                  <div>
                    <span className="text-muted-foreground block mb-1">投資元本累計</span>
                    <span className="font-bold text-foreground text-sm">{formatYen(totalInvested)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-1">運用益累計</span>
                    <span className="font-bold text-primary text-sm">+{formatYen(totalEarnings)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-1">運用倍率</span>
                    <span className="font-bold text-foreground text-sm">
                      {totalInvested > 0 ? (totalFinalValue / totalInvested).toFixed(2) : "1.00"} 倍
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 資産クラス内訳（円グラフ ＆ テキスト） */}
            <Card className="border-border shadow-sm bg-card rounded-lg">
              <CardHeader className="pb-2 border-b border-border/40">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                  <Coins className="w-5 h-5 text-primary" />
                  {yearsToRetire}年後のポートフォリオ内訳
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  資産クラス別の合計金額と構成比率です。
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {totalFinalValue === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-xs">
                    資産が登録されていないか、すべて0円です。左側で資産を入力してください。
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    
                    {/* ドーナツチャート */}
                    <div className="md:col-span-5 h-48 flex items-center justify-center relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={classData}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={75}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {classData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute text-center">
                        <span className="text-[10px] text-muted-foreground block font-medium">合計資産</span>
                        <span className="text-sm font-extrabold text-foreground block">
                          {totalFinalValue >= 10000 ? `${(totalFinalValue / 10000).toFixed(1)}億円` : `${totalFinalValue}万円`}
                        </span>
                      </div>
                    </div>

                    {/* 各資産クラスの詳細リスト */}
                    <div className="md:col-span-7 space-y-4">
                      {/* リスク資産 */}
                      <div className="flex items-start justify-between gap-4 p-2.5 rounded hover:bg-primary/5 transition-colors">
                        <div className="flex items-start gap-2.5">
                          <div className="w-3 h-3 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: "var(--chart-1)" }} />
                          <div>
                            <span className="font-bold text-xs text-foreground block">リスク資産</span>
                            <span className="text-[10px] text-muted-foreground block">株式・投資信託・外貨・仮想通貨等</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-xs text-foreground block">{formatYen(finalYearData.risk)}</span>
                          <span className="text-[10px] font-bold text-primary bg-primary/5 px-1.5 py-0.5 rounded inline-block mt-0.5">
                            {riskRatio.toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      {/* 安全資産 */}
                      <div className="flex items-start justify-between gap-4 p-2.5 rounded hover:bg-primary/5 transition-colors">
                        <div className="flex items-start gap-2.5">
                          <div className="w-3 h-3 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: "var(--chart-2)" }} />
                          <div>
                            <span className="font-bold text-xs text-foreground block">安全資産</span>
                            <span className="text-[10px] text-muted-foreground block">日本国債・定期預金・現金等</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-xs text-foreground block">{formatYen(finalYearData.safe)}</span>
                          <span className="text-[10px] font-bold text-primary bg-primary/5 px-1.5 py-0.5 rounded inline-block mt-0.5">
                            {safeRatio.toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      {/* コモディティ */}
                      <div className="flex items-start justify-between gap-4 p-2.5 rounded hover:bg-primary/5 transition-colors">
                        <div className="flex items-start gap-2.5">
                          <div className="w-3 h-3 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: "var(--chart-3)" }} />
                          <div>
                            <span className="font-bold text-xs text-foreground block">コモディティ</span>
                            <span className="text-[10px] text-muted-foreground block">金・プラチナ・原油等</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-xs text-foreground block">{formatYen(finalYearData.commodity)}</span>
                          <span className="text-[10px] font-bold text-primary bg-primary/5 px-1.5 py-0.5 rounded inline-block mt-0.5">
                            {commodityRatio.toFixed(1)}%
                          </span>
                        </div>
                      </div>

                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 将来推移グラフ (積み上げエリアチャート) */}
            <Card className="border-border shadow-sm bg-card rounded-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  資産総額の将来推移予測 (積み上げ)
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  0年目から{yearsToRetire}年後までの、各資産クラスの積み上げ推移です。
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-72 w-full text-xs">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={yearlyData}
                      margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.6}/>
                          <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.05}/>
                        </linearGradient>
                        <linearGradient id="colorSafe" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.6}/>
                          <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0.05}/>
                        </linearGradient>
                        <linearGradient id="colorCommodity" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--chart-3)" stopOpacity={0.6}/>
                          <stop offset="95%" stopColor="var(--chart-3)" stopOpacity={0.05}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis 
                        dataKey="year" 
                        tickFormatter={(v) => `${v}年`}
                        stroke="var(--muted-foreground)"
                      />
                      <YAxis 
                        tickFormatter={(v) => v >= 10000 ? `${v/10000}億` : `${v}万`}
                        stroke="var(--muted-foreground)"
                      />
                      <ChartTooltip 
                        formatter={(value: any, name: any) => {
                          const labelMap: any = {
                            risk: "リスク資産",
                            safe: "安全資産",
                            commodity: "コモディティ",
                            total: "合計評価額",
                            invested: "投資元本累計"
                          };
                          return [formatYen(Number(value)), labelMap[name] || name];
                        }}
                        labelFormatter={(label) => `${label}年後`}
                        contentStyle={{ 
                          backgroundColor: "rgba(255, 255, 255, 0.95)", 
                          borderRadius: "8px", 
                          borderColor: "oklch(0.9_0.01_45)",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
                        }}
                      />
                      <Legend 
                        formatter={(value) => {
                          const labelMap: any = {
                            risk: "リスク資産",
                            safe: "安全資産",
                            commodity: "コモディティ"
                          };
                          return labelMap[value] || value;
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="safe" 
                        stackId="1"
                        stroke="var(--chart-2)" 
                        fillOpacity={1} 
                        fill="url(#colorSafe)" 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="risk" 
                        stackId="1"
                        stroke="var(--chart-1)" 
                        fillOpacity={1} 
                        fill="url(#colorRisk)" 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="commodity" 
                        stackId="1"
                        stroke="var(--chart-3)" 
                        fillOpacity={1} 
                        fill="url(#colorCommodity)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

          </div>

        </div>
      </main>

      {/* フッター */}
      <footer className="border-t border-border bg-white/50 py-6 text-center text-xs text-muted-foreground space-y-2">
        <p>© 2026 LOGICAL FP — 1級ファイナンシャルプランナー監修ライフプランシステム</p>
        <Disclaimer />
      </footer>
    </div>
  );
}
