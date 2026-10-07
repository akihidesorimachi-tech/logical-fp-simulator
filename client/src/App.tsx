import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Router as WouterRouter, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Portal from "./pages/Portal";

// Home/AssetManagementはrecharts・html2canvas・exceljs等を含み重いため、
// 初回表示(ポータル)のバンドルから切り離して遅延読み込みする。
const Home = lazy(() => import("./pages/Home"));
const AssetManagement = lazy(() => import("./pages/AssetManagement"));

// GitHub Pagesのプロジェクトページ配下 (例: /logical-fp-simulator/) にデプロイされるため、
// Viteのbase設定と揃えてルーティングの基準パスをずらす。
const routerBase = import.meta.env.BASE_URL.replace(/\/$/, "");

function PageLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
      読み込み中...
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Switch>
        {/* 親ポータルページ */}
        <Route path="/" component={Portal} />

        {/* ① 老後の必要資金を計算するページ */}
        <Route path="/calculator" component={Home} />

        {/* ② 資産運用シミュレーションページ */}
        <Route path="/asset-management" component={AssetManagement} />

        {/* 404ページ */}
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <WouterRouter base={routerBase}>
            <Router />
          </WouterRouter>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
