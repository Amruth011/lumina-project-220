import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Brain, Filter, LayoutDashboard, Search, LogOut, LogIn, Loader2, Save, BookmarkCheck, CheckCircle2, RefreshCw, ArrowRight, Shield, Zap, BarChart3, Briefcase, BrainCircuit, ShieldCheck, Info, Download } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDecodeJD } from "@/hooks/useDecodeJD";
import { GlassTextArea } from "@/components/GlassTextArea";
import { DecodeButton } from "@/components/DecodeButton";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const TabLoader = ({ message = "Calibrating Career Intelligence..." }: { message?: string }) => (
  <div className="flex flex-col items-center justify-center p-12 min-h-[400px] text-center space-y-6 bg-slate-900/10 backdrop-blur-sm rounded-[3rem] border border-white/5 shadow-inner">
    <div className="relative">
      <div className="w-16 h-16 rounded-full border-2 border-lumina-teal/10 border-t-lumina-teal animate-spin" />
      <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 text-lumina-teal animate-pulse" />
    </div>
    <div className="space-y-1 text-center">
      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-lumina-teal animate-pulse">{message}</p>
      <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/60">Securing Forensic Node</p>
    </div>
  </div>
);

const LuminaUltraDashboard = lazyWithRetry(() => import("./LuminaUltraDashboard").then(m => ({ default: m.LuminaUltraDashboard })));
const JdActionCta = lazyWithRetry(() => import("./JdActionCta").then(m => ({ default: m.JdActionCta })));
const ResumeGapAnalyzer = lazyWithRetry(() => import("@/components/ResumeGapAnalyzer").then(m => ({ default: m.ResumeGapAnalyzer })));
const ATSScoreSimulator = lazyWithRetry(() => import("@/components/ATSScoreSimulator").then(m => ({ default: m.ATSScoreSimulator })));
const ResumeEnhancer = lazyWithRetry(() => import("@/components/ResumeEnhancer").then(m => ({ default: m.ResumeEnhancer })));
const MasterVault = lazyWithRetry(() => import("@/components/MasterVault").then(m => ({ default: m.MasterVault })));
const ResumeGenerator = lazyWithRetry(() => import("@/components/ResumeGenerator").then(m => ({ default: m.ResumeGenerator })));
const ApplicationTracker = lazyWithRetry(() => import("@/components/ApplicationTracker").then(m => ({ default: m.ApplicationTracker })));
const RoadmapView = lazyWithRetry(() => import("./roadmap/RoadmapView").then(m => ({ default: m.RoadmapView })));

import { scavengeSkills } from "@/lib/skillScavenger";
import { generateUnifiedReport } from "@/lib/pdfExporter";
import { HowItWorksSection } from "@/components/HowItWorksSection";
import { EmptyState } from "./dashboard/EmptyState";
import { ATSScoreWidget } from "./dashboard/ATSScoreWidget";
import { LoadingSequence } from "./jd-decoder/LoadingSequence";
import { StructuredOutput } from "./jd-decoder/StructuredOutput";
import type { DecodeResult, ResumeGapResult } from "@/types/jd";



import type { Tab } from "@/types/tabs";

interface ScannerViewProps {
  activeTab?: Tab;
  onTabChange?: (tab: Tab) => void;
}

/**
 * ScannerView: Main Dashboard Orchestrator
 * ======================================
 * Manages the transition between JD Decoding, Analysis, Resume Generation,
 * and the Master Vault. Handles global history and state synchronization.
 */
export const ScannerView = ({ activeTab = "decode", onTabChange }: ScannerViewProps) => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { isScanning, results, decodeJD, wasCached, resetResults } = useDecodeJD();
  const [jdText, setJdText] = useState(() => localStorage.getItem("lumina_last_jd") || "");
  const [priorityFilter, setPriorityFilter] = useState(false);
  const [savingJd, setSavingJd] = useState(false);
  const [savedJdId, setSavedJdId] = useState<string | null>(null);
  const [userResumeText, setUserResumeText] = useState("");
  const [gapResult, setGapResult] = useState<ResumeGapResult | null>(null);
  const [inputMode, setInputMode] = useState<"text" | "url">("text");
  const [jdUrl, setJdUrl] = useState("");

  // ── Engine Configuration States ──
  const [engineMode, setEngineMode] = useState(() => localStorage.getItem("lumina_engine_mode") || "default");
  const [customProvider, setCustomProvider] = useState(() => localStorage.getItem("lumina_custom_provider") || "groq");

  // Keep engineMode and customProvider updated when tab is active
  useEffect(() => {
    if (activeTab === "decode") {
      setEngineMode(localStorage.getItem("lumina_engine_mode") || "default");
      setCustomProvider(localStorage.getItem("lumina_custom_provider") || "groq");
    }
  }, [activeTab]);

  // Listen for scan crash event to auto-guide user to profile settings
  useEffect(() => {
    const handleCrash = () => {
      toast.error("Scanning encountered an engine connection issue.", {
        description: "Please check your engine settings in your Profile/Master Vault tab.",
        action: {
          label: "Configure",
          onClick: () => handleTabSwitch("profile")
        }
      });
    };
    window.addEventListener("lumina_scan_crashed", handleCrash);
    return () => window.removeEventListener("lumina_scan_crashed", handleCrash);
  }, [handleTabSwitch]);

  useEffect(() => { setSavedJdId(null); }, [results]);
  
  const restorationStarted = useRef(false);

  const handleSaveJd = async () => {
    if (!user) { toast.info("Sign in to save your decoded JDs."); navigate("/auth"); return; }
    if (!results) return;
    setSavingJd(true);
    try {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const { data, error } = await supabase.from("jd_vault").insert({
        user_id: user.id, title: results.title, raw_text: jdText, skills_json: results.skills as any,
      } as any).select("id").single();
      /* eslint-enable @typescript-eslint/no-explicit-any */
      if (error) throw error;
      setSavedJdId(data.id);
      toast.success("JD saved to your history!");
    } catch (err) { console.error(err); toast.error("Failed to save JD."); }
    finally { setSavingJd(false); }
  };

  const handleTabSwitch = useCallback((tab: Tab) => {
    console.log("ScannerView: Switching to tab", tab);
    if (tab === "profile" && !user) {
      toast.info(`Sign in to access your Tactical Profile.`);
      navigate("/auth");
      return;
    }
    if (onTabChange) onTabChange(tab);
  }, [user, navigate, onTabChange]);

  const handleDecode = useCallback(async () => { 
    if (!user) {
      toast.error("Authentication required to decode JD intelligence.", {
        description: "Please sign in to access our total career intelligence engine.",
      });
      navigate("/auth");
      return;
    }
    console.log("Decoding started for Lumina 2.0...");
    await decodeJD(jdText);
  }, [user, navigate, decodeJD, jdText]);

  const handleReset = useCallback(() => {
    resetResults();
    localStorage.removeItem("lumina_last_jd");
    setJdText("");
    setSavedJdId(null);
    setGapResult(null);
    toast.success("Forensic workspace reset successfully.");
  }, [resetResults]);

  const saveToHistory = (title: string, text: string) => {
    const historyJson = localStorage.getItem("lumina_history");
    let history = [];
    try {
      history = historyJson ? JSON.parse(historyJson) : [];
    } catch (e) {
      console.warn("Lumina Intelligence: History buffer cleared due to corruption.");
      history = [];
    }
    
    if (Array.isArray(history)) {
      history = history.filter((item: { jdText: string }) => item.jdText !== text);
    } else {
      history = [];
    }

    const newItem = {
      id: Math.random().toString(36).substring(2, 9),
      title,
      jdText: text,
      timestamp: Date.now()
    };
    
    history = [newItem, ...history].slice(0, 10);
    localStorage.setItem("lumina_history", JSON.stringify(history));
    window.dispatchEvent(new Event("lumina_history_updated"));
  };

  // v2.9 Persistence: Restore results on mount if jdText exists
  useEffect(() => {
    if (!loading && user && jdText.trim().length >= 20 && !results && !isScanning && !restorationStarted.current) {
      restorationStarted.current = true;
      const timer = setTimeout(() => {
        handleDecode();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loading, user, results, isScanning, handleDecode, jdText]);

  // v2.9 Persistence: Save jdText to localStorage
  useEffect(() => {
    localStorage.setItem("lumina_last_jd", jdText);
  }, [jdText]);
  
  // v2.8 State Sync: Listener for cross-component tab switching
  useEffect(() => {
    const handleSwitch = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) handleTabSwitch(customEvent.detail as Tab);
    };
    window.addEventListener('switch-tab', handleSwitch);
    return () => window.removeEventListener('switch-tab', handleSwitch);
  }, [handleTabSwitch]);

  return (
    <div className={`w-full ${(activeTab === 'generator' || activeTab === 'cover-letter') ? 'max-w-[98%] xl:px-12' : 'max-w-7xl'} mx-auto px-4 md:px-8 pb-24`}>
      <ErrorBoundary>
        <Suspense fallback={<TabLoader message={`Calibrating ${activeTab === 'decode' ? 'Decoder Workspace' : activeTab === 'analysis' ? 'Analysis Panel' : activeTab === 'generator' ? 'Resume Generator' : activeTab === 'cover-letter' ? 'Cover Letter Builder' : activeTab === 'roadmap' ? 'Adaptive Roadmap' : 'Tactical Profile'}...`} />}>
          <AnimatePresence mode="wait">
            {activeTab === "decode" ? (
              <motion.div
                key="decode"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              >
                {/* ── Input Section ── */}
                {isScanning ? (
                  <LoadingSequence />
                ) : (
                  <div className="space-y-6">
                    {/* ── Empty State Input View ── */}
                    {!results && (
                      <div className="space-y-4">
                        <GlassTextArea value={jdText} onChange={setJdText} isScanning={isScanning} />
                        <div className="flex justify-between items-center px-4">
                          <span className={`text-[10px] font-black uppercase tracking-widest ${jdText.length > 15000 ? 'text-red-500' : 'text-muted-foreground/40'}`}>
                            {jdText.length.toLocaleString()} / 15,000 Characters
                          </span>
                          {jdText.length > 15000 && (
                            <span className="text-[10px] font-black uppercase tracking-widest text-red-500 animate-pulse">
                              Limit Crossed
                            </span>
                          )}
                        </div>

                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.2 }}
                          className="flex justify-center mt-8"
                        >
                          <DecodeButton
                            onClick={handleDecode}
                            isLoading={isScanning}
                            disabled={(inputMode === "text" ? jdText.trim().length < 20 : jdUrl.trim().length < 10) || jdText.length > 15000}
                            isDecoded={!!results}
                          />
                        </motion.div>
                      </div>
                    )}

                    {/* ── Results View ── */}
                    {results && (
                      <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                        className="w-full mx-auto space-y-8"
                      >
                        {/* Branded Control Bar */}
                        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between p-4 rounded-[2rem] border border-white/10 bg-slate-900/40 backdrop-blur-md shadow-lg">
                          {/* Engine Indicator */}
                          <div className="flex items-center gap-3 pl-3">
                            <div className="w-8 h-8 rounded-xl bg-lumina-teal/10 border border-lumina-teal/20 flex items-center justify-center">
                              <Shield size={16} className={engineMode === "heuristic" ? "text-amber-500 animate-pulse" : "text-lumina-teal"} />
                            </div>
                            <div className="text-left">
                              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 block">Forensic Engine Active</span>
                              <span className="text-[11px] font-bold text-foreground">
                                {engineMode === "default" ? "Total Server Cloud" : engineMode === "custom" ? `Direct Browser (${customProvider})` : "Sandbox Heuristic (Offline)"}
                              </span>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                            <button
                              onClick={() => {
                                generateUnifiedReport(results, gapResult);
                                toast.success("Intelligence Report Exported");
                              }}
                              className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-lumina-teal/20 bg-lumina-teal/10 hover:bg-lumina-teal/20 text-[10px] font-black uppercase tracking-widest text-lumina-teal hover:text-emerald-400 transition-all shadow-sm"
                            >
                              <Download size={10} />
                              <span>Export Report</span>
                            </button>

                            <button
                              onClick={handleReset}
                              className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-white text-black hover:bg-white/90 text-[10px] font-black uppercase tracking-widest transition-all shadow-md"
                            >
                              <span>Scan New JD</span>
                              <ArrowRight size={10} className="stroke-[3px]" />
                            </button>
                          </div>
                        </div>

                        <LuminaUltraDashboard results={results} resumeResults={gapResult} jdText={jdText} />
                        
                        <JdActionCta 
                          onCheckResume={() => handleTabSwitch("analysis")} 
                          onGenerateResume={() => handleTabSwitch("generator")}
                          onGenerateCoverLetter={() => handleTabSwitch("cover-letter")}
                          onGenerateRoadmap={() => handleTabSwitch("roadmap")}
                        />
                      </motion.div>
                    )}
                  </div>
                )}
              </motion.div>
            ) : activeTab === "analysis" ? (
              <motion.div
                key="analysis"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="space-y-16"
              >
                {results ? (
                  <div className="space-y-12">
                    <ResumeGapAnalyzer
                      skills={scavengeSkills(results.skills, results, jdText)}
                      jobTitle={results.title}
                      jdText={jdText}
                      onResultChange={setGapResult}
                    />
                    {gapResult && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">
                        <ATSScoreSimulator result={gapResult} />
                        <div className="flex justify-center mt-12">
                          <button 
                            onClick={() => handleTabSwitch("generator")}
                            className="group flex items-center gap-4 px-12 py-6 rounded-full bg-lumina-teal text-white text-[13px] font-black uppercase tracking-widest hover:scale-110 active:scale-95 transition-all shadow-xl shadow-teal-500/20"
                          >
                            Generate Tailored Resume <Zap size={18} className="animate-pulse" />
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </div>
                ) : (
                  <EmptyState 
                    icon="analysis"
                    title="Intelligence Required"
                    description="You must decode a Job Description before activating the Resume Intelligence engine."
                    actionLabel="Return to Decoder"
                    onAction={() => handleTabSwitch("decode")}
                  />
                )}
              </motion.div>
            ) : activeTab === "generator" ? (
              <motion.div
                key="generator"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="space-y-16"
              >
                {results ? (
                  <div className="space-y-12">
                    <ResumeGenerator
                      jdTitle={results.title}
                      jdSkills={results.skills}
                    />
                    {gapResult && (
                      <ResumeEnhancer
                        resumeText={userResumeText}
                        skills={results.skills}
                        deductions={gapResult.deductions}
                        jobTitle={results.title}
                        gapResult={gapResult}
                      />
                    )}
                  </div>
                ) : (
                  <EmptyState 
                    icon="generator"
                    title="Signal Lost"
                    description="The Resume Generator requires a Job Description signal to structure its outputs."
                    actionLabel="Return to Decoder"
                    onAction={() => handleTabSwitch("decode")}
                  />
                )}
              </motion.div>
            ) : activeTab === "cover-letter" ? (
              <motion.div
                key="cover-letter"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="space-y-16"
              >
                {results ? (
                  <div className="space-y-12">
                    <ResumeGenerator
                      jdTitle={results.title}
                      jdSkills={results.skills}
                      forceTab="cover-letter"
                    />
                  </div>
                ) : (
                  <EmptyState 
                    icon="generator"
                    title="Signal Lost"
                    description="The Cover Letter Generator requires a Job Description signal to structure its outputs."
                    actionLabel="Return to Decoder"
                    onAction={() => handleTabSwitch("decode")}
                  />
                )}
              </motion.div>
            ) : activeTab === "roadmap" ? (
              <motion.div
                key="roadmap"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
              >
                {results ? (
                  <RoadmapView results={results} jdText={jdText} />
                ) : (
                  <EmptyState 
                    icon="generator"
                    title="Roadmap Signal Required"
                    description="The Adaptive Roadmap Generator requires a Job Description signal to identify skill gaps."
                    actionLabel="Return to Decoder"
                    onAction={() => handleTabSwitch("decode")}
                  />
                )}
              </motion.div>
            ) : (activeTab === "profile" || (activeTab as string) === "vault") ? (
              <motion.div
                key="profile"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
              >
                <MasterVault />
              </motion.div>
            ) : activeTab === "guide" ? (
              <motion.div
                key="guide"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
              >
                <div className="glass-panel p-6 lg:p-10 rounded-[4rem] border-foreground/10 bg-white/[0.02]">
                  <HowItWorksSection />
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </Suspense>
      </ErrorBoundary>
    </div>
  );
};
