import React, { useState, useMemo, useEffect } from "react";
import { sanitizeNumericString } from "@/lib/utils";
import {
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import Disclaimer from "@/components/Disclaimer";
import {
  TrendingUp,
  HelpCircle,
  Coins,
  Home as HomeIcon,
  Sparkles,
  Info,
  LineChart,
  Percent,
  AlertCircle,
  Wallet,
  Calculator,
  UserCheck,
  Users,
  ArrowLeft
} from "lucide-react";
import { Link } from "wouter";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as ChartTooltip, 
  ResponsiveContainer,
  Legend
} from "recharts";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// 入力データの型定義
interface CalculationInputs {
  livingCost: number;     // A. 生活費 (月額, 万)
  housingCost: number;    // B. 住宅費 (月額, 万)
  leisureCost: number;    // C. ゆとり費 (年額, 万)
  inflationRate: number;  // D. 想定インフレ率 (%)
  currentAge: number;     // E. 現在の年齢
  retirementAge: number;  // F. セカンドライフスタート年齢
  deathAge: number;       // G. 逝去年齢
  pensionIncome: number;  // H. 年金受給額 (月額, 万) ※ご本人分
  hasSpouse: boolean;      // 配偶者の有無
  spousePensionIncome: number; // 配偶者の年金受給額 (月額, 万)

  // 年金概算用の追加入力
  initialSalary: number;  // 社会人最初の年収 (万)
  peakSalary: number;     // ピーク時の年収 (万)
  workingYears: number;   // 厚生年金加入期間 (年, デフォルト40年)
}

// 配偶者が基礎年金（国民年金）のみを受給する場合の月額目安
// （40年間満額納付した場合の満額年額80万円 ÷ 12ヶ月、四捨五入）
const SPOUSE_BASIC_PENSION_ONLY_MONTHLY = Math.round(80 / 12);

// グラフ用データの型定義
interface ChartDataPoint {
  age: number;
  year: number;
  livingCostYearly: number;
  housingCostYearly: number;
  leisureCostYearly: number;
  totalCostYearly: number;
  
  // 1. 運用しない（現金）場合の累計支出
  cumulativeCost: number;
  // 2. 運用する場合（引退時価値ベース）の累計支出
  investedCumulativeCost: number;
  
  // 年金（インフレで増えない＝名目額固定）
  pensionYearly: number;
  pensionCumulative: number;
  
  // 3. 運用なし（現金）で、年金を差し引いた後の純自己準備累計
  netCashCumulative: number;
  // 4. 運用ありで、年金を差し引いた後の純自己準備累計
  netInvestedCumulative: number;
}

export default function Home() {
  // 画面遷移時にスクロール位置を最上部にリセット
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // デフォルト入力値（「標準的な夫婦」プリセットと同じ値にしておく。
  // ここがプリセットの値とズレていると、初期表示でプリセットボタンが
  // 選択中に見えるのに実際の値が違う、という食い違いが起きるため）
  const [inputs, setInputs] = useState<CalculationInputs>({
    livingCost: 22,      // 22万円
    housingCost: 7,      // 7万円
    leisureCost: 50,     // 50万円
    inflationRate: 1.5,  // 1.5%
    currentAge: 35,      // 35歳
    retirementAge: 65,   // 65歳
    deathAge: 95,        // 95歳
    pensionIncome: 16,   // 年金16万円/月（年収から概算する場合の初任給300万/ピーク700万/40年の概算値と一致）
    hasSpouse: true,          // 「標準的な夫婦」なので配偶者ありを初期状態に
    spousePensionIncome: SPOUSE_BASIC_PENSION_ONLY_MONTHLY,   // 配偶者は基礎年金のみ（専業主婦等）を想定した概算値

    // 年金概算用の初期値
    initialSalary: 300,  // 社会人最初の年収 300万
    peakSalary: 700,     // ピーク時の年収 700万
    workingYears: 40,    // 40年間勤務
  });

  const [showEstimator, setShowEstimator] = useState(false);

  // 想定インフレ率(小数)の入力中テキスト。数値stateだけをvalueに使うと
  // 末尾の"."が確定するたびに消えてしまい「1.」の後に「5」を打っても
  // 「1.5」にならないため、入力中は生の文字列を表示し、blur時に数値表示へ戻す。
  const [inflationRateDraft, setInflationRateDraft] = useState<string | null>(null);

  // 数値のフォーマット用
  const formatManen = (value: number) => {
    if (value >= 10000) {
      const oku = Math.floor(value / 10000);
      const man = Math.round(value % 10000);
      return `${oku}億${man > 0 ? `${man}万` : ""}円`;
    }
    return `${Math.round(value).toLocaleString()}万円`;
  };

  // 完全に独立したシンプルな入力ハンドラ
  const handleInputChange = (field: keyof CalculationInputs, rawValue: string | number) => {
    let value = typeof rawValue === "string" ? parseFloat(sanitizeNumericString(rawValue, true)) : rawValue;

    // 空文字やNaNの場合は0とする
    if (isNaN(value)) {
      value = 0;
    }

    setInputs(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 年金概算ロジック
  const estimatedPension = useMemo(() => {
    const MAX_PENSIONABLE_SALARY = 1230; // 標準報酬の年収換算上限（概算値）

    // 標準報酬の上限は本来「年ごと」に適用されるものなので、初任給とピーク時年収の
    // 単純平均にまとめて上限をかけるのではなく、直線的に上昇する各年の年収を
    // 1年ずつ上限でカットしてから平均する（年収の伸びが急な設定でも過大評価しないため）。
    const years = Math.max(1, Math.round(inputs.workingYears));
    let cappedSalarySum = 0;
    let rawSalarySum = 0;
    for (let i = 0; i < years; i++) {
      const t = years === 1 ? 1 : i / (years - 1);
      const salaryThisYear = inputs.initialSalary + (inputs.peakSalary - inputs.initialSalary) * t;
      rawSalarySum += salaryThisYear;
      cappedSalarySum += Math.min(salaryThisYear, MAX_PENSIONABLE_SALARY);
    }
    const avgSalary = cappedSalarySum / years;
    const avgSalaryRaw = rawSalarySum / years;

    // 基礎年金（国民年金）は、40年間の保険料を全て納付したものとして満額（年額80万円）で計算する。
    const BASIC_PENSION_FULL_YEARLY = 80;
    const basicPensionYearly = BASIC_PENSION_FULL_YEARLY;
    const welfarePensionYearly = avgSalary * 0.005481 * inputs.workingYears;

    const totalPensionYearly = basicPensionYearly + welfarePensionYearly;
    const totalPensionMonthly = totalPensionYearly / 12;

    return {
      monthly: Math.round(totalPensionMonthly),
      yearly: Math.round(totalPensionYearly),
      avgSalary: Math.round(avgSalary),
      isCapped: avgSalary < avgSalaryRaw - 0.01
    };
  }, [inputs.initialSalary, inputs.peakSalary, inputs.workingYears]);

  // 概算結果を適用
  const applyEstimatedPension = () => {
    setInputs(prev => ({
      ...prev,
      pensionIncome: estimatedPension.monthly
    }));
    setShowEstimator(false);
  };

  // プリセット設定
  const applyPreset = (type: 'standard' | 'frugal' | 'luxurious') => {
    setInflationRateDraft(null);
    switch (type) {
      // 各プリセットの pensionIncome は、同じ initialSalary/peakSalary/workingYears を
      // 「年収から概算する」機能に通したときの計算結果（Math.round後）と一致させている。
      // ここがズレていると、プリセット適用直後の年金額と、概算ツールを開いたときに
      // 表示される概算額が食い違って見えてしまうため。
      case 'standard':
        setInputs({
          livingCost: 22,
          housingCost: 7,
          leisureCost: 50,
          inflationRate: 1.5,
          currentAge: 35,
          retirementAge: 65,
          deathAge: 95,
          pensionIncome: 16,
          hasSpouse: true,
          spousePensionIncome: SPOUSE_BASIC_PENSION_ONLY_MONTHLY, // 配偶者は基礎年金のみ（専業主婦等）を想定
          initialSalary: 300,
          peakSalary: 700,
          workingYears: 40
        });
        break;
      case 'frugal':
        setInputs({
          livingCost: 15,
          housingCost: 5,
          leisureCost: 20,
          inflationRate: 1.0,
          currentAge: 35,
          retirementAge: 60,
          deathAge: 90,
          pensionIncome: 13,
          hasSpouse: false,
          spousePensionIncome: 0,
          initialSalary: 250,
          peakSalary: 500,
          workingYears: 38
        });
        break;
      case 'luxurious':
        setInputs({
          livingCost: 35,
          housingCost: 15,
          leisureCost: 120,
          inflationRate: 2.0,
          currentAge: 40,
          retirementAge: 65,
          deathAge: 100,
          pensionIncome: 19,
          hasSpouse: true,
          spousePensionIncome: SPOUSE_BASIC_PENSION_ONLY_MONTHLY, // 配偶者は基礎年金のみ（専業主婦等）を想定
          initialSalary: 350,
          peakSalary: 1000,
          workingYears: 40
        });
        break;
    }
  };

  // 入力値の整合性チェック
  const ageValidationWarning = useMemo(() => {
    if (inputs.currentAge >= inputs.retirementAge) {
      return "【警告】現在の年齢が退職年齢以上になっています。正しい計算を行うために、退職年齢を現在の年齢より高く設定してください。";
    }
    if (inputs.retirementAge >= inputs.deathAge) {
      return "【警告】退職年齢が逝去年齢以上になっています。正しい計算を行うために、逝去年齢を退職年齢より高く設定してください。";
    }
    return null;
  }, [inputs.currentAge, inputs.retirementAge, inputs.deathAge]);

  // 計算ロジック
  const results = useMemo(() => {
    const {
      livingCost,
      housingCost,
      leisureCost,
      inflationRate,
      currentAge,
      retirementAge,
      deathAge,
      pensionIncome,
      hasSpouse,
      spousePensionIncome
    } = inputs;

    const r = inflationRate / 100; // インフレ率(小数)

    const safeRetirementAge = Math.max(currentAge + 1, retirementAge);
    const safeDeathAge = Math.max(safeRetirementAge + 1, deathAge);

    const yearsToRetire = safeRetirementAge - currentAge;
    // 別スレッドのFPドクターと一致させるため、老後期間は「逝去年齢 - 退職年齢」とする（逝去年齢に達した年に逝去するため、その年の生活費は含めない＝30年間）
    const retirementDuration = safeDeathAge - safeRetirementAge;

    // H欄は「65歳受給の場合」の金額として入力してもらい、退職年齢(F)に合わせて
    // 繰上げ受給（早く受け取る分、減額）・繰下げ受給（遅く受け取る分、増額）を補正する。
    // 実際の年金請求は退職と同時に行うものとして計算する（65歳より前でも待たずに請求）。
    // 率は現行の国民年金・厚生年金の繰上げ／繰下げ制度の標準率。
    const PENSION_BASE_CLAIM_AGE = 65;
    const PENSION_MIN_CLAIM_AGE = 60;   // 繰上げ受給できる最も早い年齢
    const PENSION_MAX_CLAIM_AGE = 75;   // 繰下げ受給できる最も遅い年齢
    const EARLY_REDUCTION_RATE_PER_MONTH = 0.004;   // 繰上げ: 1ヶ月あたり0.4%減額
    const DEFERRED_INCREASE_RATE_PER_MONTH = 0.007; // 繰下げ: 1ヶ月あたり0.7%増額

    const pensionClaimAge = Math.min(PENSION_MAX_CLAIM_AGE, Math.max(PENSION_MIN_CLAIM_AGE, safeRetirementAge));
    const pensionClaimMonthsFromBase = (pensionClaimAge - PENSION_BASE_CLAIM_AGE) * 12;
    const pensionAdjustmentFactor = pensionClaimMonthsFromBase < 0
      ? 1 + pensionClaimMonthsFromBase * EARLY_REDUCTION_RATE_PER_MONTH
      : 1 + pensionClaimMonthsFromBase * DEFERRED_INCREASE_RATE_PER_MONTH;

    // 退職年齢が60歳未満の場合のみ、60歳になるまで年金なしの空白期間が発生する
    const pensionStartAge = Math.max(safeRetirementAge, pensionClaimAge);

    const inflationFactorAtRetirement = Math.pow(1 + r, yearsToRetire);

    const startLivingCostYearly = (livingCost * 12) * inflationFactorAtRetirement;
    const startHousingCostYearly = (housingCost * 12) * inflationFactorAtRetirement;
    const startLeisureCostYearly = leisureCost * inflationFactorAtRetirement;
    const startYearlyTotal = startLivingCostYearly + startHousingCostYearly + startLeisureCostYearly;

    // 補正はご本人分（H）のみに適用し、配偶者分は入力値をそのまま使う
    const adjustedSelfPensionMonthly = pensionIncome * pensionAdjustmentFactor;
    const totalMonthlyPension = adjustedSelfPensionMonthly + (hasSpouse ? spousePensionIncome : 0);
    const pensionYearlyNominal = totalMonthlyPension * 12;

    const chartData: ChartDataPoint[] = [];
    let cumulativeCost = 0;
    let investedCumulativeCost = 0;
    let pensionCumulative = 0;

    // age < safeDeathAge にすることで、95歳を含まない30年間のループにする
    for (let age = safeRetirementAge; age < safeDeathAge; age++) {
      const t = age - safeRetirementAge;
      const inflationFactorDuringRetirement = Math.pow(1 + r, t);

      const livingCostYearly = startLivingCostYearly * inflationFactorDuringRetirement;
      const housingCostYearly = startHousingCostYearly * inflationFactorDuringRetirement;
      const leisureCostYearly = startLeisureCostYearly * inflationFactorDuringRetirement;
      const totalCostYearly = livingCostYearly + housingCostYearly + leisureCostYearly;

      const pensionYearlyThisYear = age >= pensionStartAge ? pensionYearlyNominal : 0;

      cumulativeCost += totalCostYearly;
      investedCumulativeCost += startYearlyTotal;
      pensionCumulative += pensionYearlyThisYear;

      const netCashCumulative = Math.max(0, cumulativeCost - pensionCumulative);
      const netInvestedCumulative = Math.max(0, investedCumulativeCost - pensionCumulative);

      chartData.push({
        age,
        year: t + 1,
        livingCostYearly: Math.round(livingCostYearly),
        housingCostYearly: Math.round(housingCostYearly),
        leisureCostYearly: Math.round(leisureCostYearly),
        totalCostYearly: Math.round(totalCostYearly),
        cumulativeCost: Math.round(cumulativeCost),
        investedCumulativeCost: Math.round(investedCumulativeCost),
        pensionYearly: Math.round(pensionYearlyThisYear),
        pensionCumulative: Math.round(pensionCumulative),
        netCashCumulative: Math.round(netCashCumulative),
        netInvestedCumulative: Math.round(netInvestedCumulative)
      });
    }

    const totalCostNoInvestment = cumulativeCost;
    const pensionYears = Math.max(0, safeDeathAge - pensionStartAge);
    const totalPensionNominal = pensionYearlyNominal * pensionYears;
    const netRequiredNoInvestment = Math.max(0, totalCostNoInvestment - totalPensionNominal);

    const totalCostWithInvestment = startYearlyTotal * retirementDuration;
    const netRequiredWithInvestment = Math.max(0, totalCostWithInvestment - totalPensionNominal);

    const netInvestmentBenefit = netRequiredNoInvestment - netRequiredWithInvestment;

    return {
      chartData,
      totalCostNoInvestment: Math.round(totalCostNoInvestment),
      totalCostWithInvestment: Math.round(totalCostWithInvestment),
      totalPensionNominal: Math.round(totalPensionNominal),
      netRequiredNoInvestment: Math.round(netRequiredNoInvestment),
      netRequiredWithInvestment: Math.round(netRequiredWithInvestment),
      netInvestmentBenefit: Math.round(netInvestmentBenefit),
      retirementDuration,
      safeRetirementAge,
      safeDeathAge,
      pensionStartAge,
      totalMonthlyPension,
      pensionClaimAge,
      pensionAdjustmentFactor,
      pensionClaimMonthsFromBase,
      adjustedSelfPensionMonthly: Math.round(adjustedSelfPensionMonthly * 10) / 10
    };
  }, [inputs]);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans-jp flex flex-col selection:bg-accent selection:text-accent-foreground">
      {/* ヘッダー */}
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50 transition-all duration-200">
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
                <h1 className="text-xs font-bold text-foreground">老後必要資金計算システム</h1>
                <p className="text-[9px] text-muted-foreground">1st-CLASS FP SYSTEM</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-primary/5 text-primary px-2.5 py-1 rounded border border-primary/10 font-semibold">
              1級FP推計モデル
            </span>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 container py-6 md:py-8">
        {/* イントロダクション */}
        <div className="max-w-3xl mx-auto text-center mb-6 md:mb-8 space-y-2">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground leading-tight">
            老後必要資金シミュレーション
          </h2>
          <p className="text-muted-foreground text-xs md:text-sm max-w-2xl mx-auto leading-relaxed">
            将来の期待インフレ（物価上昇）と、<strong className="text-foreground">インフレに連動しない公的年金（実質価値目減り）</strong>の影響を厳密に考慮し、必要資金を算出します。
          </p>

          {/* プリセット選択 */}
          <div className="flex flex-wrap justify-center gap-1.5 pt-1">
            <span className="text-[11px] text-muted-foreground flex items-center mr-1">モデルケース:</span>
            <Button
              variant={inputs.livingCost === 22 && inputs.housingCost === 7 && inputs.leisureCost === 50 ? "default" : "outline"}
              size="sm"
              onClick={() => applyPreset('standard')}
              className="text-[10px] h-7 px-3 rounded-full transition-all"
            >
              標準的な夫婦 (月30万+ゆとり)
            </Button>
            <Button 
              variant={inputs.livingCost === 15 && inputs.leisureCost === 20 ? "default" : "outline"} 
              size="sm" 
              onClick={() => applyPreset('frugal')}
              className="text-[10px] h-7 px-3 rounded-full transition-all"
            >
              シンプルライフ (月20万+ミニマム)
            </Button>
            <Button 
              variant={inputs.livingCost === 35 && inputs.leisureCost === 120 ? "default" : "outline"} 
              size="sm" 
              onClick={() => applyPreset('luxurious')}
              className="text-[10px] h-7 px-3 rounded-full transition-all"
            >
              ゆとり充実 (月50万+旅・趣味)
            </Button>
          </div>
        </div>

        {/* 警告表示 */}
        {ageValidationWarning && (
          <div className="max-w-6xl mx-auto mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-2 text-amber-800 dark:text-amber-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="font-medium">{ageValidationWarning}</div>
          </div>
        )}

        {/* 2カラムレイアウト */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* 左カラム: 入力フォーム (5/12) - Sticky（追従）にして縦伸び余白を排除 */}
          <div className="lg:col-span-5 lg:sticky lg:top-[70px] transition-all duration-200">
            <Card className="shadow-sm border-border bg-card overflow-hidden rounded-lg">
              <CardHeader className="bg-primary/5 border-b border-border/40 py-3 px-4">
                <div className="flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-primary" />
                  <CardTitle className="text-sm font-bold text-foreground">シミュレーション条件設定</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                
                {/* A. 希望の生活費 */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="livingCost" className="text-xs font-semibold text-foreground/90 flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5 text-primary" />
                      A. 希望の生活費 (月額)
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="w-3 h-3 text-muted-foreground cursor-pointer" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs text-xs">
                            最低限ではなくこれくらいあったら良いという月額（分からなければ今の生活費を入力）
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Label>
                    <span className="text-xs font-bold text-primary">{inputs.livingCost} 万円/月</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Slider
                      id="livingCost-slider"
                      min={5}
                      max={100}
                      step={1}
                      value={[inputs.livingCost]}
                      onValueChange={([val]) => handleInputChange('livingCost', val)}
                      className="flex-1"
                    />
                    <Input
                      id="livingCost"
                      type="text"
                      inputMode="numeric"
                      value={inputs.livingCost === 0 ? "" : inputs.livingCost}
                      placeholder="0"
                      onChange={(e) => handleInputChange('livingCost', e.target.value)}
                      className="w-16 h-8 text-xs text-right font-semibold"
                    />
                  </div>
                </div>

                {/* B. 住宅費 */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="housingCost" className="text-xs font-semibold text-foreground/90 flex items-center gap-1">
                      <HomeIcon className="w-3.5 h-3.5 text-primary" />
                      B. 住宅費 (月額)
                    </Label>
                    <span className="text-xs font-bold text-primary">{inputs.housingCost} 万円/月</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Slider
                      id="housingCost-slider"
                      min={0}
                      max={50}
                      step={1}
                      value={[inputs.housingCost]}
                      onValueChange={([val]) => handleInputChange('housingCost', val)}
                      className="flex-1"
                    />
                    <Input
                      id="housingCost"
                      type="text"
                      inputMode="numeric"
                      value={inputs.housingCost === 0 ? "" : inputs.housingCost}
                      placeholder="0"
                      onChange={(e) => handleInputChange('housingCost', e.target.value)}
                      className="w-16 h-8 text-xs text-right font-semibold"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-none">
                    これくらいなら不満のないと思う家賃（持ち家なら管理費や修繕積立金）
                  </p>
                </div>

                {/* C. ゆとり費 */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="leisureCost" className="text-xs font-semibold text-foreground/90 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                      C. ゆとり費 (年額)
                    </Label>
                    <span className="text-xs font-bold text-primary">{inputs.leisureCost} 万円/年</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Slider
                      id="leisureCost-slider"
                      min={0}
                      max={500}
                      step={10}
                      value={[inputs.leisureCost]}
                      onValueChange={([val]) => handleInputChange('leisureCost', val)}
                      className="flex-1"
                    />
                    <Input
                      id="leisureCost"
                      type="text"
                      inputMode="numeric"
                      value={inputs.leisureCost === 0 ? "" : inputs.leisureCost}
                      placeholder="0"
                      onChange={(e) => handleInputChange('leisureCost', e.target.value)}
                      className="w-16 h-8 text-xs text-right font-semibold"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-none">
                    旅行・家電買い替え・特別支出など（年間の合計額）
                  </p>
                </div>

                {/* D. 想定インフレ率 */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="inflationRate" className="text-xs font-semibold text-foreground/90 flex items-center gap-1">
                      <Percent className="w-3.5 h-3.5 text-primary" />
                      D. 想定インフレ率 (年率)
                    </Label>
                    <span className="text-xs font-bold text-primary">{inputs.inflationRate} %</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Slider
                      id="inflationRate-slider"
                      min={0}
                      max={5}
                      step={0.1}
                      value={[inputs.inflationRate]}
                      onValueChange={([val]) => {
                        setInflationRateDraft(null);
                        handleInputChange('inflationRate', val);
                      }}
                      className="flex-1"
                    />
                    <Input
                      id="inflationRate"
                      type="text"
                      inputMode="decimal"
                      value={inflationRateDraft ?? (inputs.inflationRate === 0 ? "" : inputs.inflationRate)}
                      placeholder="0"
                      onChange={(e) => {
                        const cleaned = sanitizeNumericString(e.target.value, true);
                        setInflationRateDraft(cleaned);
                        handleInputChange('inflationRate', cleaned);
                      }}
                      onBlur={() => setInflationRateDraft(null)}
                      className="w-16 h-8 text-xs text-right font-semibold"
                    />
                  </div>
                </div>

                {/* E〜G. ライフステージの期間設定 */}
                <div className="space-y-2 pt-2 border-t border-border/40">
                  <Label className="text-xs font-bold text-foreground/90">E〜G. ライフステージの期間設定</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="currentAge" className="text-[10px] text-muted-foreground">E. 現在年齢</Label>
                      <Input
                        id="currentAge"
                        type="text"
                        inputMode="numeric"
                        value={inputs.currentAge === 0 ? "" : inputs.currentAge}
                        placeholder="0"
                        onChange={(e) => handleInputChange('currentAge', e.target.value)}
                        className="h-8 text-xs text-center font-semibold"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="retirementAge" className="text-[10px] text-muted-foreground">F. 退職年齢</Label>
                      <Input
                        id="retirementAge"
                        type="text"
                        inputMode="numeric"
                        value={inputs.retirementAge === 0 ? "" : inputs.retirementAge}
                        placeholder="0"
                        onChange={(e) => handleInputChange('retirementAge', e.target.value)}
                        className="h-8 text-xs text-center font-semibold"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="deathAge" className="text-[10px] text-muted-foreground">G. 逝去年齢</Label>
                      <Input
                        id="deathAge"
                        type="text"
                        inputMode="numeric"
                        value={inputs.deathAge === 0 ? "" : inputs.deathAge}
                        placeholder="0"
                        onChange={(e) => handleInputChange('deathAge', e.target.value)}
                        className="h-8 text-xs text-center font-semibold"
                      />
                    </div>
                  </div>
                  <div className="bg-muted/50 p-2 rounded text-[10px] text-muted-foreground flex items-center gap-1.5 leading-none">
                    <Info className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>
                      現在 <strong className="text-foreground">{inputs.currentAge}歳</strong>。老後生活は <strong className="text-foreground">{results.retirementDuration}年間</strong>（{results.safeRetirementAge}歳〜{results.safeDeathAge}歳）続く想定です。
                      {results.pensionStartAge > results.safeRetirementAge && (
                        <>
                          {" "}公的年金は60歳より前には受給開始できないため、<strong className="text-foreground">{results.safeRetirementAge}〜{results.pensionStartAge - 1}歳の{results.pensionStartAge - results.safeRetirementAge}年間は年金なし</strong>として計算しています。
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {/* H. 想定年金受給額（月額） */}
                <div className="space-y-1.5 pt-2 border-t border-border/40">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="pensionIncome" className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                      <Wallet className="w-3.5 h-3.5" />
                      H. 65歳受給の場合の想定年金受給額 (月額)
                    </Label>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{inputs.pensionIncome} 万円/月</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Slider
                      id="pensionIncome-slider"
                      min={0}
                      max={40}
                      step={1}
                      value={[inputs.pensionIncome]}
                      onValueChange={([val]) => handleInputChange('pensionIncome', val)}
                      className="flex-1"
                    />
                    <Input
                      id="pensionIncome"
                      type="text"
                      inputMode="numeric"
                      value={inputs.pensionIncome === 0 ? "" : inputs.pensionIncome}
                      placeholder="0"
                      onChange={(e) => handleInputChange('pensionIncome', e.target.value)}
                      className="w-16 h-8 text-xs text-right font-semibold border-emerald-200 focus-visible:ring-emerald-500"
                    />
                  </div>

                  {/* F. 退職年齢に合わせた繰上げ・繰下げ補正 */}
                  <div className="p-2 bg-amber-500/5 border border-amber-500/10 rounded text-[10px] text-amber-800 dark:text-amber-300 leading-relaxed">
                    {results.pensionAdjustmentFactor === 1 ? (
                      <span>F. 退職年齢は65歳のため、補正なしでそのまま月額 <strong>{inputs.pensionIncome}万円</strong> を適用します。</span>
                    ) : (
                      <span>
                        → F. 退職年齢（{results.safeRetirementAge}歳）で受給を開始すると、65歳基準から
                        <strong>{Math.abs(results.pensionClaimMonthsFromBase)}ヶ月{results.pensionClaimMonthsFromBase < 0 ? "早い繰上げ受給" : "遅い繰下げ受給"}</strong>
                        となり、{results.pensionClaimMonthsFromBase < 0 ? "0.4" : "0.7"}%×{Math.abs(results.pensionClaimMonthsFromBase)}ヶ月＝
                        <strong>{(Math.abs(results.pensionAdjustmentFactor - 1) * 100).toFixed(1)}%{results.pensionClaimMonthsFromBase < 0 ? "減額" : "増額"}</strong>
                        されます。補正後のご本人受給額：<strong className="text-xs">{results.adjustedSelfPensionMonthly}万円/月</strong>
                        {results.pensionClaimAge !== results.safeRetirementAge && (
                          <>
                            （{results.pensionClaimAge}歳で請求したものとして計算。
                            {results.safeRetirementAge < 60
                              ? "年金は60歳より前に請求できないため"
                              : "年金は75歳より後に繰り下げられないため"}
                            ）
                          </>
                        )}
                      </span>
                    )}
                  </div>

                  {/* 配偶者の年金 */}
                  <div className="pt-2 flex items-center justify-between">
                    <Label htmlFor="hasSpouse" className="text-[11px] font-semibold text-foreground/80 flex items-center gap-1.5 cursor-pointer">
                      <Users className="w-3.5 h-3.5 text-emerald-600" />
                      配偶者の年金も合算する
                    </Label>
                    <Switch
                      id="hasSpouse"
                      checked={inputs.hasSpouse}
                      onCheckedChange={(checked) => setInputs(prev => ({ ...prev, hasSpouse: checked }))}
                    />
                  </div>

                  {inputs.hasSpouse && (
                    <div className="p-2.5 bg-emerald-500/5 border border-emerald-500/10 rounded-lg space-y-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="spousePensionIncome" className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                          配偶者の想定年金受給額 (月額)
                        </Label>
                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">{inputs.spousePensionIncome} 万円/月</span>
                      </div>
                      <Input
                        id="spousePensionIncome"
                        type="text"
                        inputMode="numeric"
                        value={inputs.spousePensionIncome === 0 ? "" : inputs.spousePensionIncome}
                        placeholder="0"
                        onChange={(e) => handleInputChange('spousePensionIncome', e.target.value)}
                        className="h-8 text-xs text-right font-semibold border-emerald-200 focus-visible:ring-emerald-500"
                      />
                      <div className="flex gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setInputs(prev => ({ ...prev, spousePensionIncome: prev.pensionIncome }))}
                          className="text-[9px] h-6 px-2 flex-1 border-emerald-200 hover:bg-emerald-50/50 text-emerald-700"
                        >
                          本人と同額を入力
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setInputs(prev => ({ ...prev, spousePensionIncome: SPOUSE_BASIC_PENSION_ONLY_MONTHLY }))}
                          className="text-[9px] h-6 px-2 flex-1 border-emerald-200 hover:bg-emerald-50/50 text-emerald-700"
                        >
                          基礎年金のみ(専業主婦)を入力
                        </Button>
                      </div>
                      <p className="text-[8px] text-muted-foreground leading-tight">
                        ※「基礎年金のみ」は、40年間満額納付した場合の国民年金満額（年額80万円 ≒ 月額{SPOUSE_BASIC_PENSION_ONLY_MONTHLY}万円）です。ボタンは初期値の入力補助なので、金額はご自由に修正してください。
                      </p>
                    </div>
                  )}

                  {/* 年金概算アコーディオントリガー */}
                  <div className="pt-1 flex justify-end">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setShowEstimator(!showEstimator)}
                      className="text-[10px] h-7 gap-1 px-2.5 border-emerald-200 hover:bg-emerald-50/50 text-emerald-700 hover:text-emerald-800"
                    >
                      <Calculator className="w-3 h-3" />
                      {showEstimator ? "年収入力を閉じる" : "年収から概算する"}
                    </Button>
                  </div>

                  {/* 年金概算ツール本体 */}
                  {showEstimator && (
                    <div className="mt-2 p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-lg space-y-2.5 transition-all duration-200">
                      <h4 className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1 leading-none">
                        <UserCheck className="w-3.5 h-3.5" />
                        公的年金（国民＋厚生年金）の簡易シミュレーター
                      </h4>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label htmlFor="initialSalary" className="text-[9px] text-muted-foreground">社会人最初の年収</Label>
                          <div className="relative">
                            <Input
                              id="initialSalary"
                              type="text"
                              inputMode="numeric"
                              value={inputs.initialSalary === 0 ? "" : inputs.initialSalary}
                              placeholder="0"
                              onChange={(e) => handleInputChange('initialSalary', e.target.value)}
                              className="h-7 text-[11px] pr-5 text-right font-semibold border-emerald-100"
                            />
                            <span className="absolute right-1.5 top-1.5 text-[9px] text-muted-foreground">万円</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="peakSalary" className="text-[9px] text-muted-foreground">ピーク時の想定年収</Label>
                          <div className="relative">
                            <Input
                              id="peakSalary"
                              type="text"
                              inputMode="numeric"
                              value={inputs.peakSalary === 0 ? "" : inputs.peakSalary}
                              placeholder="0"
                              onChange={(e) => handleInputChange('peakSalary', e.target.value)}
                              className="h-7 text-[11px] pr-5 text-right font-semibold border-emerald-100"
                            />
                            <span className="absolute right-1.5 top-1.5 text-[9px] text-muted-foreground">万円</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[9px] text-muted-foreground">
                          <Label htmlFor="workingYears">厚生年金加入期間（働く年数）</Label>
                          <span className="font-bold text-emerald-700">{inputs.workingYears} 年</span>
                        </div>
                        <Slider
                          id="workingYears-slider"
                          min={10}
                          max={50}
                          step={1}
                          value={[inputs.workingYears]}
                          onValueChange={([val]) => handleInputChange('workingYears', val)}
                          className="py-1"
                        />
                      </div>

                      {/* 概算結果プレビュー */}
                      <div className="bg-card p-2 rounded border border-emerald-100 flex items-center justify-between text-[10px]">
                        <div>
                          <p className="text-muted-foreground text-[9px] leading-none">想定される年金受給額（概算）</p>
                          <p className="text-emerald-700 font-bold mt-1">
                            月額 約 <strong className="text-xs">{estimatedPension.monthly}</strong> 万円 
                            <span className="text-[9px] text-muted-foreground font-normal ml-1">（年額 約 {estimatedPension.yearly}万円）</span>
                          </p>
                          {estimatedPension.isCapped && (
                            <p className="text-[8px] text-amber-600 font-medium mt-0.5 leading-tight">
                              ※平均年収が標準報酬上限（1,230万円）を超えたため、上限が適用されています。
                            </p>
                          )}
                        </div>
                        <Button 
                          size="sm" 
                          onClick={applyEstimatedPension}
                          className="h-6 text-[9px] bg-emerald-600 hover:bg-emerald-700 text-white px-2 rounded"
                        >
                          結果を適用
                        </Button>
                      </div>
                      <p className="text-[8px] text-muted-foreground leading-tight">
                        ※社会人最初の年収からピーク時年収まで直線的に年収が上がると仮定し、国民年金（40年間満額納付を前提に年額80万円の満額で一律計算）と厚生年金（平均標準報酬から算出）の合計を簡易的に算出しています。この概算はご本人お一人分の年金額です。配偶者がいる場合は、上の「配偶者の年金も合算する」をオンにして、配偶者の年金額を別途入力してください。
                      </p>
                    </div>
                  )}
                </div>

              </CardContent>
            </Card>
          </div>

          {/* 右カラム: シミュレーション結果 (7/12) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* メイン結果カード：現金 vs 運用の対比 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* 左：現金（運用なし）での自己準備額 */}
              <Card className="border-border/60 shadow-sm relative overflow-hidden bg-card">
                <div className="absolute top-0 left-0 w-full h-1 bg-muted" />
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                        <Coins className="w-3.5 h-3.5" />
                        ① 運用せず現金取り崩し
                      </CardTitle>
                      <CardDescription className="text-[10px] mt-0.5">老後期間の現金単純取り崩しでの自己準備額</CardDescription>
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-pointer" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs text-xs">
                          インフレにより支出が毎年増大していく一方で、手元の現金資産を一切運用せずにただ取り崩していく場合の、年金を差し引いた実質的な必要資金額です。
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="space-y-1">
                    <span className="text-2xl md:text-3xl font-black tracking-tight text-foreground">
                      {formatManen(results.netRequiredNoInvestment)}
                    </span>
                    <p className="text-[10px] text-muted-foreground">
                      引退時（{results.safeRetirementAge}歳）に必要な自己準備額（差額）
                    </p>
                  </div>
                  <div className="mt-3 pt-3 border-t border-border/40 text-[10px] text-muted-foreground space-y-1 bg-muted/20 p-2 rounded">
                    <div className="flex justify-between">
                      <span>支出累計:</span>
                      <span className="font-semibold text-foreground">{formatManen(results.totalCostNoInvestment)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                      <span>年金受給総額（名目固定）:</span>
                      <span>- {formatManen(results.totalPensionNominal)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 右：運用しながら取り崩す場合の自己準備額 */}
              <Card className="border-primary/20 shadow-sm relative overflow-hidden bg-primary/[0.02]">
                <div className="absolute top-0 left-0 w-full h-1 bg-primary" />
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xs font-bold text-primary flex items-center gap-1">
                        <Percent className="w-3.5 h-3.5" />
                        ② 運用しながら取り崩す
                      </CardTitle>
                      <CardDescription className="text-[10px] mt-0.5">引退時（{results.safeRetirementAge}歳）に必要な自己準備額（差額）</CardDescription>
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="w-3.5 h-3.5 text-primary cursor-pointer" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs text-xs">
                          引退後も残った資産をインフレ率と同等の利回りで運用し続ける想定。インフレによる物価上昇と運用益が相殺されるため、引退初年度の必要額（インフレ調整済）× 老後年数で算出されます。
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <p className="text-[9px] text-primary/70 font-medium mt-1">
                    ※老後の運用利回り＝想定インフレ率（年率 {inputs.inflationRate}%）と仮定した場合の金額です。
                  </p>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="space-y-1">
                    <span className="text-2xl md:text-3xl font-black tracking-tight text-primary">
                      {formatManen(results.netRequiredWithInvestment)}
                    </span>
                    <p className="text-[10px] text-primary/80 font-medium">
                      運用なしと比べ <strong className="text-xs underline">{formatManen(results.netInvestmentBenefit)}</strong> 少なく済みます（運用効果）。
                    </p>
                  </div>
                  <div className="mt-3 pt-3 border-t border-primary/10 text-[10px] text-muted-foreground space-y-1 bg-primary/[0.04] p-2 rounded">
                    <div className="flex justify-between">
                      <span>運用調整支出額:</span>
                      <span className="font-semibold text-foreground">{formatManen(results.totalCostWithInvestment)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                      <span>年金受給総額（名目固定）:</span>
                      <span>- {formatManen(results.totalPensionNominal)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

            </div>

            {/* シミュレーション内訳比較（老後合計） */}
            <Card className="border-border/60 shadow-sm bg-card overflow-hidden">
              <CardHeader className="py-3 px-4 border-b border-border/40">
                <CardTitle className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-primary" />
                  シミュレーション内訳比較（老後 {results.retirementDuration}年間 合計）
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 左：運用なし（現金）の内訳 */}
                  <div className="space-y-2 p-3 bg-muted/20 rounded-lg border border-border/40">
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      ● 運用なし（現金）の内訳
                    </h4>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between py-1 border-b border-border/20 text-muted-foreground">
                        <span>① インフレ支出総額:</span>
                        <span className="font-semibold text-foreground">{formatManen(results.totalCostNoInvestment)}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-border/20 text-emerald-700 dark:text-emerald-400">
                        <span>② 年金受給総額 (名目固定):</span>
                        <span>- {formatManen(results.totalPensionNominal)}</span>
                      </div>
                      <div className="flex justify-between py-1.5 font-bold text-primary">
                        <span>③ 自己準備必要額 (差額):</span>
                        <span>{formatManen(results.netRequiredNoInvestment)}</span>
                      </div>
                    </div>
                  </div>

                  {/* 右：運用あり（インフレ相当）の内訳 */}
                  <div className="space-y-2 p-3 bg-primary/[0.02] rounded-lg border border-primary/10">
                    <h4 className="text-xs font-bold text-primary flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                      ● 運用あり（インフレ相当）の内訳
                    </h4>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between py-1 border-b border-primary/5 text-muted-foreground">
                        <span>① 運用調整支出額:</span>
                        <span className="font-semibold text-foreground">{formatManen(results.totalCostWithInvestment)}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-primary/5 text-emerald-700 dark:text-emerald-400">
                        <span>② 年金受給総額 (名目固定):</span>
                        <span>- {formatManen(results.totalPensionNominal)}</span>
                      </div>
                      <div className="flex justify-between py-1.5 font-bold text-primary">
                        <span>③ 自己準備必要額 (差額):</span>
                        <span>{formatManen(results.netRequiredWithInvestment)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-muted-foreground leading-relaxed bg-muted/40 p-2.5 rounded-lg border border-border/30">
                  <Info className="w-3.5 h-3.5 text-primary inline-block mr-1 -mt-0.5 shrink-0" />
                  年金（月額 {Math.round(results.totalMonthlyPension * 10) / 10}万円{inputs.hasSpouse ? "、ご本人+配偶者" : ""}）はインフレで増えない（名目額固定）ため、実質価値が目減りします。手元資金をインフレ相当（年率 {inputs.inflationRate}%）で運用しながら取り崩すことで、物価上昇分をカバーし、自己準備額を<strong className="text-foreground"> {formatManen(results.netInvestmentBenefit)} </strong>削減できます。
                </div>
              </CardContent>
            </Card>

            {/* 自己準備必要額（差額）の累計推移比較（グラフ） */}
            <Card className="border-border/60 shadow-sm bg-card overflow-hidden">
              <CardHeader className="py-3 px-4 border-b border-border/40">
                <CardTitle className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <LineChart className="w-4 h-4 text-primary" />
                  自己準備必要額（差額）の累計推移比較
                </CardTitle>
                <CardDescription className="text-[10px]">
                  年金（名目固定）を差し引いた後、実際に自分で用意すべき資金が老後期間中にどう累積していくかを比較しています
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={results.chartData}
                      margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorCash" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.02}/>
                        </linearGradient>
                        <linearGradient id="colorInvested" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#2563EB" stopOpacity={0.02}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis 
                        dataKey="age" 
                        tickFormatter={(value) => `${value}歳`} 
                        tick={{ fontSize: 9 }}
                        stroke="#9CA3AF"
                      />
                      <YAxis 
                        tickFormatter={(value) => `${value}万`} 
                        tick={{ fontSize: 9 }}
                        stroke="#9CA3AF"
                      />
                      <ChartTooltip 
                        formatter={(value: any) => [`${Math.round(value).toLocaleString()}万円`]}
                        labelFormatter={(label) => `${label}歳時点`}
                        contentStyle={{ fontSize: '11px', borderRadius: '6px' }}
                      />
                      <Legend 
                        verticalAlign="top" 
                        height={36} 
                        iconSize={8}
                        wrapperStyle={{ fontSize: '10px' }}
                      />
                      <Area 
                        name="① 運用なし（現金単純取り崩し）の自己準備額" 
                        type="monotone" 
                        dataKey="netCashCumulative" 
                        stroke="#F59E0B" 
                        strokeWidth={1.5}
                        fillOpacity={1} 
                        fill="url(#colorCash)" 
                      />
                      <Area 
                        name="② 運用あり（インフレ相当運用）の自己準備額" 
                        type="monotone" 
                        dataKey="netInvestedCumulative" 
                        stroke="#2563EB" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorInvested)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* 詳細内訳比較テーブル */}
            <Card className="border-border/60 shadow-sm bg-card overflow-hidden">
              <CardHeader className="py-3 px-4 border-b border-border/40">
                <CardTitle className="text-xs font-bold text-foreground">
                  老後期間の具体的な数値推移（節目ピックアップ）
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-muted/40 border-b border-border/60 text-muted-foreground font-semibold">
                      <th className="p-2.5">年齢</th>
                      <th className="p-2.5">経過年</th>
                      <th className="p-2.5 text-right">年間支出（インフレ後）</th>
                      <th className="p-2.5 text-right">① 運用なし累計自己準備</th>
                      <th className="p-2.5 text-right">② 運用あり累計自己準備</th>
                      <th className="p-2.5 text-right text-primary">運用効果（削減額）</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {/* 初年度 */}
                    {results.chartData.length > 0 && (
                      <tr className="hover:bg-muted/10 transition-colors">
                        <td className="p-2.5 font-medium">{results.chartData[0].age}歳</td>
                        <td className="p-2.5 text-muted-foreground">引退初年度</td>
                        <td className="p-2.5 text-right">{results.chartData[0].totalCostYearly.toLocaleString()} 万円</td>
                        <td className="p-2.5 text-right font-semibold">{results.chartData[0].netCashCumulative.toLocaleString()} 万円</td>
                        <td className="p-2.5 text-right font-semibold">{results.chartData[0].netInvestedCumulative.toLocaleString()} 万円</td>
                        <td className="p-2.5 text-right font-bold text-primary">
                          {(results.chartData[0].netCashCumulative - results.chartData[0].netInvestedCumulative).toLocaleString()} 万円
                        </td>
                      </tr>
                    )}

                    {/* 5年後 */}
                    {results.chartData.length > 5 && (
                      <tr className="hover:bg-muted/10 transition-colors">
                        <td className="p-2.5 font-medium">{results.chartData[4].age}歳</td>
                        <td className="p-2.5 text-muted-foreground">5年後</td>
                        <td className="p-2.5 text-right">{results.chartData[4].totalCostYearly.toLocaleString()} 万円</td>
                        <td className="p-2.5 text-right font-semibold">{results.chartData[4].netCashCumulative.toLocaleString()} 万円</td>
                        <td className="p-2.5 text-right font-semibold">{results.chartData[4].netInvestedCumulative.toLocaleString()} 万円</td>
                        <td className="p-2.5 text-right font-bold text-primary">
                          {(results.chartData[4].netCashCumulative - results.chartData[4].netInvestedCumulative).toLocaleString()} 万円
                        </td>
                      </tr>
                    )}

                    {/* 15年後 */}
                    {results.chartData.length > 15 && (
                      <tr className="hover:bg-muted/10 transition-colors">
                        <td className="p-2.5 font-medium">{results.chartData[14].age}歳</td>
                        <td className="p-2.5 text-muted-foreground">15年後</td>
                        <td className="p-2.5 text-right">{results.chartData[14].totalCostYearly.toLocaleString()} 万円</td>
                        <td className="p-2.5 text-right font-semibold">{results.chartData[14].netCashCumulative.toLocaleString()} 万円</td>
                        <td className="p-2.5 text-right font-semibold">{results.chartData[14].netInvestedCumulative.toLocaleString()} 万円</td>
                        <td className="p-2.5 text-right font-bold text-primary">
                          {(results.chartData[14].netCashCumulative - results.chartData[14].netInvestedCumulative).toLocaleString()} 万円
                        </td>
                      </tr>
                    )}

                    {/* 最終年 */}
                    {results.chartData.length > 0 && (
                      <tr className="bg-primary/[0.01] hover:bg-primary/[0.03] font-semibold border-t border-border/80">
                        <td className="p-2.5 text-primary">{results.chartData[results.chartData.length - 1].age}歳</td>
                        <td className="p-2.5 text-primary">最終年</td>
                        <td className="p-2.5 text-right">{results.chartData[results.chartData.length - 1].totalCostYearly.toLocaleString()} 万円</td>
                        <td className="p-2.5 text-right text-foreground font-bold">{formatManen(results.netRequiredNoInvestment)}</td>
                        <td className="p-2.5 text-right text-primary font-bold">{formatManen(results.netRequiredWithInvestment)}</td>
                        <td className="p-2.5 text-right font-black text-primary text-xs">
                          {formatManen(results.netInvestmentBenefit)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>

          </div>

        </div>
      </main>

      {/* フッター */}
      <footer className="border-t border-border bg-card py-6 mt-12">
        <div className="container text-center space-y-2">
          <p className="text-xs text-muted-foreground">
            © 2026 LOGICAL FP - 1級ファイナンシャルプランナー監修ライフプランシステム. All rights reserved.
          </p>
          <Disclaimer />
        </div>
      </footer>
    </div>
  );
}
