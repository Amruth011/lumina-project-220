import { useState } from "react";
import { motion } from "framer-motion";
import { LogOut, User, Search, ShieldCheck, Zap, Mail, Compass, Bot, Mic, ChevronRight, ChevronLeft } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { Tab } from "@/types/tabs";
import luminaIcon from "@/assets/lumina-icon.png.asset.json";

interface GlobalNavbarProps {
  activeTab?: Tab;
  onTabChange?: (tab: Tab) => void;
}

const ROUTE_TABS: Set<Tab> = new Set(["arsenal", "pipeline", "scoring", "interview"]);

export const GlobalNavbar = ({ activeTab, onTabChange }: GlobalNavbarProps) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const isHomePage = location.pathname === "/";
  const pathTab = location.pathname.replace("/dashboard/", "") as Tab;
  const effectiveActiveTab = ROUTE_TABS.has(pathTab) ? pathTab : activeTab;

  const handleTabClick = (tabKey: Tab) => {
    if (!user) {
      toast.info("Please sign in to access Lumina services.");
      navigate("/auth");
      return;
    }

    if (ROUTE_TABS.has(tabKey)) {
      navigate(`/dashboard/${tabKey}`);
    } else if (isHomePage) {
      navigate("/dashboard", { state: { activeTab: tabKey } });
    } else if (onTabChange) {
      onTabChange(tabKey);
    }
    setIsOpen(false);
  };

  const tabs = [
    { key: "profile" as Tab, icon: User, label: "Profile" },
    { key: "decode" as Tab, icon: Search, label: "JD Decode" },
    { key: "analysis" as Tab, icon: ShieldCheck, label: "Analysis" },
    { key: "generator" as Tab, icon: Zap, label: "Generator" },
    { key: "cover-letter" as Tab, icon: Mail, label: "Cover Letter" },
    { key: "roadmap" as Tab, icon: Compass, label: "Roadmap" },
    { key: "agent" as Tab, icon: Bot, label: "Job Agent", badge: true },
    { key: "interview" as Tab, icon: Mic, label: "Interview" },
  ] as { key: Tab; icon: React.ElementType; label: string; badge?: boolean }[];

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-[99] bg-black/20 backdrop-blur-sm md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      <motion.nav
        animate={{ width: isOpen ? 224 : 56 }}
        transition={{ type: "spring", stiffness: 260, damping: 28 }}
        className="fixed top-3 bottom-3 left-3 z-[100]"
      >
        <div className="relative h-full w-full rounded-2xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-border/10 flex flex-col py-3 overflow-hidden">
          {/* Toggle Arrow */}
          <button
            onClick={() => setIsOpen((v) => !v)}
            className="absolute -right-3 top-8 z-20 w-6 h-6 rounded-full bg-white border border-border/30 shadow-md flex items-center justify-center hover:bg-lumina-teal hover:text-white hover:border-lumina-teal transition-all"
            aria-label={isOpen ? "Close sidebar" : "Open sidebar"}
          >
            {isOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
          </button>

          {/* Brand */}
          <Link to="/" className="flex items-center gap-3 px-3 mb-3" title="Lumina">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0 shadow-md border border-border/20 overflow-hidden">
              <img src={luminaIcon.url} alt="Lumina" className="w-6 h-6 object-contain" />
            </div>
            {isOpen && (
              <span className="text-[14px] font-display font-bold tracking-tight whitespace-nowrap">
                Lumina
              </span>
            )}
          </Link>

          {/* Profile */}
          {user ? (
            <div className="px-2 mb-2">
              <button
                onClick={() => handleTabClick("profile")}
                className={`relative w-full flex items-center gap-3 px-2 py-2 rounded-xl transition-all ${
                  effectiveActiveTab === "profile" ? "bg-lumina-teal/10" : "hover:bg-foreground/5"
                }`}
                title={user.email ?? "Profile"}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-lumina-teal to-emerald-400 flex items-center justify-center flex-shrink-0 text-white font-bold text-xs">
                  {(user.email?.[0] ?? "U").toUpperCase()}
                </div>
                {isOpen && (
                  <div className="flex flex-col items-start min-w-0">
                    <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest leading-none">Strategist</span>
                    <span className="text-[12px] text-foreground font-semibold truncate max-w-[140px]">
                      {user.email?.split("@")[0]}
                    </span>
                  </div>
                )}
              </button>
            </div>
          ) : (
            <div className="px-2 mb-2">
              <Link
                to="/auth"
                className="w-full flex items-center gap-3 px-2 py-2 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-all"
                title="Sign In"
              >
                <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
                  <User size={16} />
                </div>
                {isOpen && (
                  <span className="text-[12px] font-bold uppercase tracking-wide whitespace-nowrap">
                    Sign In
                  </span>
                )}
              </Link>
            </div>
          )}

          <div className="mx-3 h-px bg-border/40 mb-2" />

          {isOpen && (
            <div className="px-2 mb-1">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest pl-2">Menu</span>
            </div>
          )}

          {/* Features */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar px-2 space-y-1">
            {tabs.filter((t) => t.key !== "profile").map((tab) => {
              const isActive = effectiveActiveTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => handleTabClick(tab.key)}
                  className={`relative w-full flex items-center gap-3 px-2 py-2 rounded-xl text-[12px] font-display font-semibold transition-all ${
                    isActive ? "text-white" : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
                  }`}
                  title={tab.label}
                >
                  {isActive && (
                    <motion.div
                      layoutId="globalActiveTab"
                      className="absolute inset-0 bg-lumina-teal rounded-xl shadow-lg shadow-teal-500/20"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <span className="relative z-10 w-8 h-8 flex items-center justify-center flex-shrink-0">
                    <tab.icon size={16} />
                  </span>
                  {isOpen && (
                    <span className="relative z-10 tracking-tight whitespace-nowrap">
                      {tab.label}
                    </span>
                  )}
                  {tab.badge && !isActive && (
                    <span className={`relative z-10 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse ${isOpen ? "ml-auto mr-2" : "absolute top-1.5 right-1.5"}`} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Sign Out */}
          {user && (
            <>
              <div className="mx-3 h-px bg-border/40 my-2" />
              <div className="px-2">
                <button
                  onClick={signOut}
                  className="w-full flex items-center gap-3 px-2 py-2 rounded-xl text-red-500 hover:bg-red-50 transition-all"
                  title="Sign Out"
                >
                  <span className="w-8 h-8 flex items-center justify-center flex-shrink-0">
                    <LogOut size={16} />
                  </span>
                  {isOpen && (
                    <span className="text-[12px] font-display font-semibold whitespace-nowrap">
                      Sign Out
                    </span>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </motion.nav>
    </>
  );
};
