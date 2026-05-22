import { useState, useEffect, Suspense } from "react";
import { useLocation } from "react-router-dom";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
const GlobalNavbar = lazyWithRetry(() => import("@/components/GlobalNavbar").then(m => ({ default: m.GlobalNavbar })));
const ScannerView = lazyWithRetry(() => import("@/components/ScannerView").then(m => ({ default: m.ScannerView })));
const WelcomeScreen = lazyWithRetry(() => import("@/components/onboarding/WelcomeScreen").then(m => ({ default: m.WelcomeScreen })));
const TooltipTour = lazyWithRetry(() => import("@/components/onboarding/TooltipTour").then(m => ({ default: m.TooltipTour })));
const HistoryPanel = lazyWithRetry(() => import("@/components/dashboard/HistoryPanel").then(m => ({ default: m.HistoryPanel })));

import type { Tab } from "@/types/tabs";

const Dashboard = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>((location.state?.activeTab as Tab) || "decode");

  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab as Tab);
    }
  }, [location.state]);

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <Suspense fallback={null}>
        <WelcomeScreen />
        <TooltipTour />
        <HistoryPanel />
        <GlobalNavbar activeTab={activeTab} onTabChange={setActiveTab} />
        <section id="scanner" className="relative pt-24 pb-12 bg-background min-h-screen">
          <ScannerView activeTab={activeTab} onTabChange={setActiveTab} />
        </section>
      </Suspense>
    </div>
  );
};

export default Dashboard;
