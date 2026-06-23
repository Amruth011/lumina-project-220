import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LogOut, LogIn, User, Search, ShieldCheck, Zap, Mail, Compass, Bot, 
  LayoutDashboard, ChevronDown, Menu, X, Settings, Sparkles, Briefcase, Target
} from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { Tab } from "@/types/tabs";

interface GlobalNavbarProps {
  activeTab?: Tab;
  onTabChange?: (tab: Tab) => void;
}

export const GlobalNavbar = ({ activeTab: propActiveTab, onTabChange }: GlobalNavbarProps) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Local state for active tab to handle real-time events
  const [localActiveTab, setLocalActiveTab] = useState<Tab>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<"analytics" | "documents" | "profile" | null>(null);

  // Sync tab with route path
  const pathTab = location.pathname.replace("/dashboard/", "") as Tab;
  const isRouteTab = ["arsenal", "pipeline", "scoring", "interview"].includes(pathTab);
  const effectiveActiveTab = isRouteTab ? pathTab : (propActiveTab || localActiveTab);

  // Sync with prop changes
  useEffect(() => {
    if (propActiveTab) {
      setLocalActiveTab(propActiveTab);
    }
  }, [propActiveTab]);

  // Sync with cross-component switch-tab events
  useEffect(() => {
    const handleSwitch = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setLocalActiveTab(customEvent.detail as Tab);
        if (onTabChange) onTabChange(customEvent.detail as Tab);
      }
    };
    window.addEventListener("switch-tab", handleSwitch);
    return () => window.removeEventListener("switch-tab", handleSwitch);
  }, [onTabChange]);

  const handleTabClick = (tabKey: Tab) => {
    if (!user) {
      toast.info("Please sign in to access Lumina services.");
      navigate("/auth");
      return;
    }

    if (["arsenal", "pipeline", "scoring", "interview"].includes(tabKey)) {
      navigate(`/dashboard/${tabKey}`);
    } else {
      if (location.pathname !== "/dashboard") {
        navigate("/dashboard", { state: { activeTab: tabKey } });
      } else {
        setLocalActiveTab(tabKey);
        if (onTabChange) onTabChange(tabKey);
        window.dispatchEvent(new CustomEvent("switch-tab", { detail: tabKey }));
      }
    }
    setMobileMenuOpen(false);
    setActiveDropdown(null);
  };

  const isPro = localStorage.getItem("lumina_pro") === "true";

  // Dropdown options mapping
  const analyticsOptions = [
    { key: "decode" as Tab, label: "JD Decoder", icon: Search, desc: "Extract job intelligence" },
    { key: "analysis" as Tab, label: "Resume Analysis", icon: ShieldCheck, desc: "Find skills and keywords gap" },
    { key: "roadmap" as Tab, label: "Adaptive Roadmap", icon: Compass, desc: "Step-by-step career path" },
  ];

  const documentsOptions = [
    { key: "generator" as Tab, label: "Resume Tailor", icon: Zap, desc: "Structure your resume" },
    { key: "cover-letter" as Tab, label: "Cover Letters", icon: Mail, desc: "AI cover letter builder" },
    { key: "outreach" as Tab, label: "Cold Mail & Outreach", icon: Bot, desc: "LinkedIn & email messages" },
    { key: "arsenal" as Tab, label: "Resume Arsenal", icon: Briefcase, desc: "Manage upload slots" },
  ];

  const isAnalyticsActive = ["decode", "analysis", "roadmap"].includes(effectiveActiveTab);
  const isDocumentsActive = ["generator", "cover-letter", "outreach", "arsenal"].includes(effectiveActiveTab);

  return (
    <header className="fixed top-0 left-0 right-0 z-[100] h-16 border-b border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md transition-all">
      <div className="max-w-7xl mx-auto h-full px-6 flex items-center justify-between">
        
        {/* Left Side: Logo & Main Navigation */}
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center hover:opacity-90 transition-opacity" title="Lumina Home">
            <img src="/logo.png" alt="Lumina" className="h-6 w-auto object-contain" />
          </Link>

          {/* Desktop Navigation Links */}
          {user && (
            <nav className="hidden md:flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
              
              {/* Dashboard */}
              <button
                onClick={() => handleTabClick("dashboard")}
                className={`px-4 py-2 rounded-xl transition-all ${
                  effectiveActiveTab === "dashboard"
                    ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                    : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                }`}
              >
                Dashboard
              </button>

              {/* Analytics Dropdown */}
              <div 
                className="relative"
                onMouseEnter={() => setActiveDropdown("analytics")}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <button
                  className={`px-4 py-2 rounded-xl flex items-center gap-1 transition-all ${
                    isAnalyticsActive
                      ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  }`}
                >
                  Analytics <ChevronDown size={14} className={`transition-transform duration-200 ${activeDropdown === "analytics" ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence>
                  {activeDropdown === "analytics" && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute left-0 mt-1 w-64 rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-950 p-2.5 shadow-xl"
                    >
                      {analyticsOptions.map((opt) => (
                        <button
                          key={opt.key}
                          onClick={() => handleTabClick(opt.key)}
                          className={`w-full flex items-start gap-3 p-2.5 rounded-xl text-left transition-all ${
                            effectiveActiveTab === opt.key 
                              ? "bg-lumina-teal/10 text-lumina-teal" 
                              : "hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          <opt.icon size={16} className="mt-0.5 flex-shrink-0 text-lumina-teal" />
                          <div>
                            <p className="font-bold text-[12px]">{opt.label}</p>
                            <p className="text-[10px] text-slate-400 font-normal leading-normal">{opt.desc}</p>
                          </div>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Documents Dropdown */}
              <div 
                className="relative"
                onMouseEnter={() => setActiveDropdown("documents")}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <button
                  className={`px-4 py-2 rounded-xl flex items-center gap-1 transition-all ${
                    isDocumentsActive
                      ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  }`}
                >
                  Documents <ChevronDown size={14} className={`transition-transform duration-200 ${activeDropdown === "documents" ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence>
                  {activeDropdown === "documents" && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute left-0 mt-1 w-72 rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-950 p-2.5 shadow-xl"
                    >
                      {documentsOptions.map((opt) => (
                        <button
                          key={opt.key}
                          onClick={() => handleTabClick(opt.key)}
                          className={`w-full flex items-start gap-3 p-2.5 rounded-xl text-left transition-all ${
                            effectiveActiveTab === opt.key 
                              ? "bg-lumina-teal/10 text-lumina-teal" 
                              : "hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          <opt.icon size={16} className="mt-0.5 flex-shrink-0 text-lumina-teal" />
                          <div>
                            <p className="font-bold text-[12px]">{opt.label}</p>
                            <p className="text-[10px] text-slate-400 font-normal leading-normal">{opt.desc}</p>
                          </div>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Job Tracker */}
              <button
                onClick={() => handleTabClick("pipeline")}
                className={`px-4 py-2 rounded-xl transition-all ${
                  effectiveActiveTab === "pipeline"
                    ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                    : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                }`}
              >
                Job Tracker
              </button>

              {/* Job Agent */}
              <button
                onClick={() => handleTabClick("agent")}
                className={`px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all ${
                  effectiveActiveTab === "agent"
                    ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                    : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                }`}
              >
                Job Agent
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </button>

              {/* AI Interview */}
              <button
                onClick={() => handleTabClick("interview")}
                className={`px-4 py-2 rounded-xl transition-all ${
                  effectiveActiveTab === "interview"
                    ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                    : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                }`}
              >
                AI Interview
              </button>

            </nav>
          )}
        </div>

        {/* Right Side: Settings, Profile & Pro Badge */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              {/* Upgrade Button */}
              {!isPro && (
                <button
                  onClick={() => {
                    localStorage.setItem("lumina_pro", "true");
                    toast.success("Upgraded to Pro (Dev Mode)!");
                    window.location.reload();
                  }}
                  className="hidden md:flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-black uppercase tracking-wider shadow-md hover:opacity-90 transition-all"
                >
                  <Sparkles size={12} /> Upgrade
                </button>
              )}

              {isPro && (
                <span className="hidden md:inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[9px] font-black uppercase tracking-widest">
                  <Sparkles size={10} className="fill-amber-500" /> Pro
                </span>
              )}

              {/* Profile Dropdown */}
              <div 
                className="relative"
                onMouseEnter={() => setActiveDropdown("profile")}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <button
                  className="w-9 h-9 rounded-xl bg-gradient-to-br from-lumina-teal to-emerald-400 flex items-center justify-center text-white font-bold text-sm shadow-md cursor-pointer"
                  aria-label="Profile options"
                >
                  {(user.email?.[0] ?? "U").toUpperCase()}
                </button>
                
                <AnimatePresence>
                  {activeDropdown === "profile" && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-1 w-56 rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-950 p-2 shadow-xl"
                    >
                      <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1.5">
                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block leading-none mb-1">Signed in as</span>
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate block">
                          {user.email}
                        </span>
                      </div>
                      
                      <button
                        onClick={() => handleTabClick("profile")}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 text-xs font-semibold text-left"
                      >
                        <User size={14} /> Profile & Vault
                      </button>

                      <button
                        onClick={signOut}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 text-xs font-semibold text-left mt-1"
                      >
                        <LogOut size={14} /> Sign Out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <Link
              to="/auth"
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-lumina-teal hover:bg-lumina-teal/95 text-white text-xs font-bold transition-all shadow-md"
            >
              <LogIn size={14} /> Sign In
            </Link>
          )}

          {/* Mobile Menu Toggle */}
          {user && (
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile Drawer menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-b border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden shadow-lg"
          >
            <div className="px-6 py-4 flex flex-col gap-2.5 text-xs font-bold text-slate-700 dark:text-slate-300">
              <button
                onClick={() => handleTabClick("dashboard")}
                className="w-full py-2.5 text-left border-b border-slate-50 dark:border-slate-900"
              >
                Dashboard
              </button>
              
              <div className="py-1">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block mb-1">Analytics</span>
                <div className="pl-3 flex flex-col gap-2 border-l border-slate-100 dark:border-slate-800">
                  {analyticsOptions.map((opt) => (
                    <button key={opt.key} onClick={() => handleTabClick(opt.key)} className="py-1.5 text-left text-[11px]">
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="py-1">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block mb-1">Documents</span>
                <div className="pl-3 flex flex-col gap-2 border-l border-slate-100 dark:border-slate-800">
                  {documentsOptions.map((opt) => (
                    <button key={opt.key} onClick={() => handleTabClick(opt.key)} className="py-1.5 text-left text-[11px]">
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => handleTabClick("pipeline")}
                className="w-full py-2.5 text-left border-b border-slate-50 dark:border-slate-900"
              >
                Job Tracker
              </button>

              <button
                onClick={() => handleTabClick("agent")}
                className="w-full py-2.5 text-left border-b border-slate-50 dark:border-slate-900"
              >
                Job Agent
              </button>

              <button
                onClick={() => handleTabClick("interview")}
                className="w-full py-2.5 text-left border-b border-slate-50 dark:border-slate-900"
              >
                AI Interview
              </button>

              <button
                onClick={() => handleTabClick("profile")}
                className="w-full py-2.5 text-left border-b border-slate-50 dark:border-slate-900 flex items-center gap-2"
              >
                <User size={14} /> Profile & Vault
              </button>

              <button
                onClick={signOut}
                className="w-full py-2.5 text-left text-red-500 flex items-center gap-2"
              >
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
