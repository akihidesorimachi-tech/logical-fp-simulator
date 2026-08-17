import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Router as WouterRouter, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Portal from "./pages/Portal";
import Home from "./pages/Home";
import AssetManagement from "./pages/AssetManagement";

// GitHub Pagesのプロジェクトページ配下 (例: /logical-fp-simulator/) にデプロイされるため、
// Viteのbase設定と揃えてルーティングの基準パスをずらす。
const routerBase = import.meta.env.BASE_URL.replace(/\/$/, "");

function Router() {
  return (
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
