import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Sidebar } from "./components/layout/Sidebar";
import { TopBar } from "./components/layout/TopBar";
import { Disclosure } from "./components/ui/Status";
import { ToastContainer } from "./components/ui/Toast";
import { useSystemBootstrap } from "./hooks/useBackend";
import { useAppStore } from "./store/appStore";
import { cn } from "./utils/format";

import Overview from "./pages/Overview";
import Markets from "./pages/Markets";
import Orders from "./pages/Orders";
import Executions from "./pages/Executions";
import Positions from "./pages/Positions";
import Portfolio from "./pages/Portfolio";
import Strategy from "./pages/Strategy";
import Performance from "./pages/Performance";
import RiskSecurity from "./pages/RiskSecurity";
import SystemHealth from "./pages/SystemHealth";
import Backtests from "./pages/Backtests";
import ModelAnalytics from "./pages/ModelAnalytics";
import Settings from "./pages/Settings";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);
  return null;
}

function TerminalLayout() {
  const sidebarCollapsed = useAppStore((state) => state.sidebarCollapsed);
  useSystemBootstrap();

  return (
    <div className="min-h-screen bg-ink-900 text-fog-200">
      <Sidebar />
      <div
        className={cn(
          "flex min-h-screen flex-col transition-[padding] duration-200",
          sidebarCollapsed ? "lg:pl-[72px]" : "lg:pl-[248px]",
        )}
      >
        <TopBar />
        <main className="flex-1 px-4 pb-2 pt-5 sm:px-6 lg:px-7">
          <div className="mx-auto w-full max-w-[1560px]">
            <Routes>
              <Route path="/" element={<Overview />} />
              <Route path="/markets" element={<Markets />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/executions" element={<Executions />} />
              <Route path="/positions" element={<Positions />} />
              <Route path="/portfolio" element={<Portfolio />} />
              <Route path="/strategy" element={<Strategy />} />
              <Route path="/performance" element={<Performance />} />
              <Route path="/risk" element={<RiskSecurity />} />
              <Route path="/system" element={<SystemHealth />} />
              <Route path="/backtests" element={<Backtests />} />
              <Route path="/model" element={<ModelAnalytics />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <Disclosure className="mt-8" />
          </div>
        </main>
      </div>
      <ToastContainer />
      <ScrollToTop />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <TerminalLayout />
    </BrowserRouter>
  );
}
