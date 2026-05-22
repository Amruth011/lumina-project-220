import { useState, useEffect, Suspense } from "react";
import { useLocation } from "react-router-dom";
import { GlobalNavbar } from "@/components/GlobalNavbar";
import { ScannerView } from "@/components/ScannerView";
import { WelcomeScreen } from "@/components/onboarding/WelcomeScreen";
import { TooltipTour } from "@/components/onboarding/TooltipTour";
import { HistoryPanel } from "@/components/dashboard/HistoryPanel";

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
