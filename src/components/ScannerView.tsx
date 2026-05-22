import { useState, useEffect, useCallback, lazy, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Brain, Filter, LayoutDashboard, Search, LogOut, LogIn, Loader2, Save, BookmarkCheck, CheckCircle2, RefreshCw, ArrowRight, Shield, Zap, BarChart3, Briefcase, BrainCircuit, ShieldCheck, Info, Download } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDecodeJD } from "@/hooks/useDecodeJD";
import { GlassTextArea } from "@/components/GlassTextArea";
import { DecodeButton } from "@/components/DecodeButton";
const LuminaUltraDashboard = lazy(() => import("./LuminaUltraDashboard").then(m => ({ default: m.LuminaUltraDashboard })));
const JdActionCta = lazy(() => import("./JdActionCta").then(m => ({ default: m.JdActionCta })));
const ResumeGapAnalyzer = lazy(() => import("@/components/ResumeGapAnalyzer").then(m => ({ default: m.ResumeGapAnalyzer })));
const ATSScoreSimulator = lazy(() => import("@/components/ATSScoreSimulator").then(m => ({ default: m.ATSScoreSimulator })));
const ResumeEnhancer = lazy(() => import("@/components/ResumeEnhancer").then(m => ({ default: m.ResumeEnhancer })));
const MasterVault = lazy(() => import("@/components/MasterVault").then(m => ({ default: m.MasterVault })));
const ResumeGenerator = lazy(() => import("@/components/ResumeGenerator").then(m => ({ default: m.ResumeGenerator })));
const ApplicationTracker = lazy(() => import("@/components/ApplicationTracker").then(m => ({ default: m.ApplicationTracker })));
const RoadmapView = lazy(() => import("./roadmap/RoadmapView").then(m => ({ default: m.RoadmapView })));

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
  const [showSettings, setShowSettings] = useState(false);
  const [engineMode, setEngineMode] = useState(() => localStorage.getItem("lumina_engine_mode") || "default");
  const [customProvider, setCustomProvider] = useState(() => localStorage.getItem("lumina_custom_provider") || "groq");
  const [customKey, setCustomKey] = useState(() => localStorage.getItem("lumina_custom_key") || "");
  const [testingDiagnostics, setTestingDiagnostics] = useState(false);
  const [diagnosticStatus, setDiagnosticStatus] = useState({
    supabase: "idle",
    vercel: "idle",
    groq: "idle"
  });

  const handleEngineModeChange = (mode: string) => {
    localStorage.setItem("lumina_engine_mode", mode);
    setEngineMode(mode);
    toast.success(`Engine changed: ${mode === "default" ? "Server Cloud" : mode === "custom" ? "Browser Custom Key" : "Sandbox Heuristic"}`);
  };

  const handleCustomProviderChange = (provider: string) => {
    localStorage.setItem("lumina_custom_provider", provider);
    setCustomProvider(provider);
  };

  const handleCustomKeyChange = (key: string) => {
    localStorage.setItem("lumina_custom_key", key);
    setCustomKey(key);
  };

  const runDiagnosticsTest = async () => {
    setTestingDiagnostics(true);
    setDiagnosticStatus({ supabase: "checking", vercel: "checking", groq: "checking" });
    
    // 1. Supabase Check
    let sbStatus = "ERROR";
    try {
      const { error } = await supabase.from('profiles').select('id').limit(1);
      sbStatus = error ? "OFFLINE" : "OK";
    } catch (e) {
      sbStatus = "CRASHED";
    }

    // 2. Vercel & Groq via api/diagnose check
    let vercelStatus = "OFFLINE";
    let groqStatus = "MISSING_KEY";
    try {
      const res = await fetch("/api/diagnose");
      if (res.ok) {
        const dData = await res.json();
        vercelStatus = "OK";
        if (dData?.groq_test) {
          groqStatus = dData.groq_test.includes("OK") ? "OK" : dData.groq_test;
        } else if (dData?.diagnostics?.groq_key_set) {
          groqStatus = "KEY_SET";
        }
      } else {
        vercelStatus = `HTTP ${res.status}`;
      }
    } catch (e) {
      vercelStatus = "UNREACHABLE";
    }

    setDiagnosticStatus({
      supabase: sbStatus,
      vercel: vercelStatus,
      groq: groqStatus
    });
    setTestingDiagnostics(false);
  };

  // Run diagnostics when settings open
  useEffect(() => {
    if (showSettings) {
      runDiagnosticsTest();
    }
  }, [showSettings]);

  // Listen for scan crash event to auto-open settings
  useEffect(() => {
    const handleCrash = () => {
      setShowSettings(true);
    };
    window.addEventListener("lumina_scan_crashed", handleCrash);
    return () => window.removeEventListener("lumina_scan_crashed", handleCrash);
  }, []);

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
    setShowSettings(false);
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
                    {/* Sleek Engine Pill Indicator */}
                    <div className="flex justify-end mb-2">
                      <button
                        onClick={() => setShowSettings(prev => !prev)}
                        className="group flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-[11px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all duration-300 shadow-md"
                      >
                        <Shield size={12} className={engineMode === "heuristic" ? "text-amber-500 animate-pulse" : "text-lumina-teal"} />
                        <span>Engine: <span className="text-foreground">{engineMode === "default" ? "Total Server Cloud" : engineMode === "custom" ? "Direct Browser Key" : "Sandbox Heuristic"}</span></span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-white/60 group-hover:bg-lumina-teal group-hover:text-white transition-all">Configure</span>
                      </button>
                    </div>

                    {/* API Diagnostics & Configuration Dashboard */}
                    {showSettings && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="p-6 rounded-[2rem] border border-white/10 bg-slate-950/60 backdrop-blur-md space-y-6 text-left shadow-2xl overflow-hidden mb-6"
                      >
                        {/* Header */}
                        <div className="flex justify-between items-center pb-3 border-b border-white/5">
                          <div className="flex items-center gap-2.5">
                            <BrainCircuit className="text-lumina-teal w-5 h-5" />
                            <div>
                              <h3 className="text-[13px] font-black uppercase tracking-widest text-white leading-none">Lumina Engine Configurations</h3>
                              <span className="text-[10px] text-muted-foreground">Diagnostics & Credential Management Matrix</span>
                            </div>
                          </div>
                          <button 
                            onClick={() => setShowSettings(false)}
                            className="text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-white px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 transition-all border border-white/5"
                          >
                            Close Matrix
                          </button>
                        </div>

                        {/* Content grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 flex items-center gap-1.5">
                              <Zap size={11} className="text-lumina-teal" /> Active Intelligence Mode
                            </h4>
                            
                            <div className="space-y-3">
                              {/* Mode: Default */}
                              <button
                                onClick={() => handleEngineModeChange("default")}
                                className={`w-full p-4 rounded-2xl border text-left transition-all ${
                                  engineMode === "default" 
                                    ? "border-lumina-teal/40 bg-teal-950/20 text-white shadow-lg shadow-teal-500/5" 
                                    : "border-white/5 bg-white/[0.01] hover:bg-white/5 text-muted-foreground"
                                }`}
                              >
                                <div className="flex justify-between items-center">
                                  <span className="text-[11px] font-bold text-white">Default Server-Side Engine</span>
                                  <span className="text-[9px] uppercase tracking-widest px-2 py-0.5 rounded bg-white/10 font-bold">Standard</span>
                                </div>
                                <p className="text-[10px] mt-1 text-muted-foreground/80 leading-relaxed font-medium">
                                  Invokes cloud-based Supabase Edge Functions with a secondary Vercel proxy. Relies on developer backend environment variables.
                                </p>
                              </button>

                              {/* Mode: Custom */}
                              <button
                                onClick={() => handleEngineModeChange("custom")}
                                className={`w-full p-4 rounded-2xl border text-left transition-all ${
                                  engineMode === "custom" 
                                    ? "border-cyan-500/40 bg-cyan-950/20 text-white shadow-lg shadow-cyan-500/5" 
                                    : "border-white/5 bg-white/[0.01] hover:bg-white/5 text-muted-foreground"
                                }`}
                              >
                                <div className="flex justify-between items-center">
                                  <span className="text-[11px] font-bold text-white">Direct Browser Engine (User Key)</span>
                                  <span className="text-[9px] uppercase tracking-widest px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-bold">Developer</span>
                                </div>
                                <p className="text-[10px] mt-1 text-muted-foreground/80 leading-relaxed font-medium">
                                  Executes LLM completions directly from your browser. Input your custom key below. Saved strictly local in your browser memory.
                                </p>
                              </button>

                              {/* Mode: Heuristic */}
                              <button
                                onClick={() => handleEngineModeChange("heuristic")}
                                className={`w-full p-4 rounded-2xl border text-left transition-all ${
                                  engineMode === "heuristic" 
                                    ? "border-amber-500/40 bg-amber-950/20 text-white shadow-lg shadow-amber-500/5" 
                                    : "border-white/5 bg-white/[0.01] hover:bg-white/5 text-muted-foreground"
                                }`}
                              >
                                <div className="flex justify-between items-center">
                                  <span className="text-[11px] font-bold text-white">Sandbox Heuristic Engine (Offline)</span>
                                  <span className="text-[9px] uppercase tracking-widest px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">Fail-Safe</span>
                                </div>
                                <p className="text-[10px] mt-1 text-muted-foreground/80 leading-relaxed font-medium">
                                  Runs a sophisticated local semantic pattern matching parser in native JavaScript. 100% offline, keyless, and guaranteed to work forever.
                                </p>
                              </button>
                            </div>
                          </div>

                          {/* Right Column: Connection Diagnostics and API Inputs */}
                          <div className="space-y-6">
                            {engineMode === "custom" && (
                              <div className="space-y-3 p-4 rounded-2xl border border-white/5 bg-white/[0.01]">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80">
                                  Browser Key Configuration
                                </h4>
                                
                                <div className="space-y-3">
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleCustomProviderChange("groq")}
                                      className={`flex-1 py-2 rounded-xl text-[10px] font-bold border transition-all ${
                                        customProvider === "groq"
                                          ? "border-lumina-teal/40 bg-lumina-teal/10 text-white"
                                          : "border-white/5 bg-transparent text-muted-foreground hover:bg-white/5"
                                      }`}
                                    >
                                      Groq (Llama 3.3)
                                    </button>
                                    <button
                                      onClick={() => handleCustomProviderChange("openai")}
                                      className={`flex-1 py-2 rounded-xl text-[10px] font-bold border transition-all ${
                                        customProvider === "openai"
                                          ? "border-cyan-500/40 bg-cyan-500/10 text-white"
                                          : "border-white/5 bg-transparent text-muted-foreground hover:bg-white/5"
                                      }`}
                                    >
                                      OpenAI (GPT-4o)
                                    </button>
                                  </div>

                                  <div className="space-y-1">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 block">
                                      {customProvider === "groq" ? "GROQ API Key" : "OpenAI API Key"}
                                    </label>
                                    <input
                                      type="password"
                                      value={customKey}
                                      onChange={(e) => handleCustomKeyChange(e.target.value)}
                                      placeholder={customProvider === "groq" ? "gsk_..." : "sk-proj-..."}
                                      className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-black/40 text-[11px] font-mono text-white focus:outline-none focus:border-lumina-teal/50 transition-all placeholder:text-white/20"
                                    />
                                    <span className="text-[8px] text-muted-foreground/50 block leading-tight font-medium">
                                      Keys are stored in your `localStorage` and never sent to any server other than the direct API completion endpoints.
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}

                            <div className="space-y-3">
                              <div className="flex justify-between items-center">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 flex items-center gap-1.5">
                                  <ShieldCheck size={12} className="text-lumina-teal" /> Cloud Connection Diagnostics
                                </h4>
                                <button
                                  onClick={runDiagnosticsTest}
                                  disabled={testingDiagnostics}
                                  className="text-[9px] font-black uppercase tracking-widest text-lumina-teal hover:text-teal-400 disabled:text-muted-foreground transition-all flex items-center gap-1"
                                >
                                  {testingDiagnostics ? (
                                    <>
                                      <Loader2 size={10} className="animate-spin" /> Checking...
                                    </>
                                  ) : (
                                    <>
                                      <RefreshCw size={10} /> Run Diagnostics
                                    </>
                                  )}
                                </button>
                              </div>

                              <div className="space-y-2">
                                {/* Supabase status row */}
                                <div className="flex justify-between items-center p-3 rounded-xl bg-white/[0.02] border border-white/5 text-[11px]">
                                  <span className="text-white font-medium flex items-center gap-2">
                                    <span className={`w-1.5 h-1.5 rounded-full ${diagnosticStatus.supabase === "OK" ? "bg-emerald-500 shadow-md shadow-emerald-500/20" : diagnosticStatus.supabase === "checking" ? "bg-amber-500 animate-pulse" : diagnosticStatus.supabase === "idle" ? "bg-white/20" : "bg-red-500 shadow-md shadow-red-500/20"}`} />
                                    Supabase Client Endpoint
                                  </span>
                                  <span className="font-mono text-[9px] font-bold text-muted-foreground">
                                    {diagnosticStatus.supabase}
                                  </span>
                                </div>

                                {/* Vercel status row */}
                                <div className="flex justify-between items-center p-3 rounded-xl bg-white/[0.02] border border-white/5 text-[11px]">
                                  <span className="text-white font-medium flex items-center gap-2">
                                    <span className={`w-1.5 h-1.5 rounded-full ${diagnosticStatus.vercel === "OK" ? "bg-emerald-500 shadow-md shadow-emerald-500/20" : diagnosticStatus.vercel === "checking" ? "bg-amber-500 animate-pulse" : diagnosticStatus.vercel === "idle" ? "bg-white/20" : "bg-red-500 shadow-md shadow-red-500/20"}`} />
                                    Vercel Serverless Gateway
                                  </span>
                                  <span className="font-mono text-[9px] font-bold text-muted-foreground">
                                    {diagnosticStatus.vercel}
                                  </span>
                                </div>

                                {/* Groq credential status row */}
                                <div className="flex justify-between items-center p-3 rounded-xl bg-white/[0.02] border border-white/5 text-[11px]">
                                  <span className="text-white font-medium flex items-center gap-2">
                                    <span className={`w-1.5 h-1.5 rounded-full ${diagnosticStatus.groq === "OK" || diagnosticStatus.groq === "KEY_SET" ? "bg-emerald-500 shadow-md shadow-emerald-500/20" : diagnosticStatus.groq === "checking" ? "bg-amber-500 animate-pulse" : diagnosticStatus.groq === "idle" ? "bg-white/20" : "bg-red-500 shadow-md shadow-red-500/20"}`} />
                                    Server-Side API Authentication
                                  </span>
                                  <span className="font-mono text-[9px] font-bold text-muted-foreground truncate max-w-[120px]">
                                    {diagnosticStatus.groq}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

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
                          onClick={() => setShowSettings(prev => !prev)}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-white/5 bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-white transition-all shadow-sm"
                        >
                          <RefreshCw size={10} className={showSettings ? "rotate-180 transition-transform duration-500" : ""} />
                          <span>Settings</span>
                        </button>

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

                    {/* Diagnostics and Configurations Panel */}
                    {showSettings && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="p-6 rounded-[2rem] border border-white/10 bg-slate-950/60 backdrop-blur-md space-y-6 text-left shadow-2xl overflow-hidden mb-6"
                      >
                        {/* Header */}
                        <div className="flex justify-between items-center pb-3 border-b border-white/5">
                          <div className="flex items-center gap-2.5">
                            <BrainCircuit className="text-lumina-teal w-5 h-5" />
                            <div>
                              <h3 className="text-[13px] font-black uppercase tracking-widest text-white leading-none">Lumina Engine Configurations</h3>
                              <span className="text-[10px] text-muted-foreground">Diagnostics & Credential Management Matrix</span>
                            </div>
                          </div>
                          <button 
                            onClick={() => setShowSettings(false)}
                            className="text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-white px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 transition-all border border-white/5"
                          >
                            Close Matrix
                          </button>
                        </div>

                        {/* Content grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 flex items-center gap-1.5">
                              <Zap size={11} className="text-lumina-teal" /> Active Intelligence Mode
                            </h4>
                            
                            <div className="space-y-3">
                              {/* Mode: Default */}
                              <button
                                onClick={() => handleEngineModeChange("default")}
                                className={`w-full p-4 rounded-2xl border text-left transition-all ${
                                  engineMode === "default" 
                                    ? "border-lumina-teal/40 bg-teal-950/20 text-white shadow-lg shadow-teal-500/5" 
                                    : "border-white/5 bg-white/[0.01] hover:bg-white/5 text-muted-foreground"
                                }`}
                              >
                                <div className="flex justify-between items-center">
                                  <span className="text-[11px] font-bold text-white">Default Server-Side Engine</span>
                                  <span className="text-[9px] uppercase tracking-widest px-2 py-0.5 rounded bg-white/10 font-bold">Standard</span>
                                </div>
                                <p className="text-[10px] mt-1 text-muted-foreground/80 leading-relaxed font-medium">
                                  Invokes cloud-based Supabase Edge Functions with a secondary Vercel proxy. Relies on developer backend environment variables.
                                </p>
                              </button>

                              {/* Mode: Custom */}
                              <button
                                onClick={() => handleEngineModeChange("custom")}
                                className={`w-full p-4 rounded-2xl border text-left transition-all ${
                                  engineMode === "custom" 
                                    ? "border-cyan-500/40 bg-cyan-950/20 text-white shadow-lg shadow-cyan-500/5" 
                                    : "border-white/5 bg-white/[0.01] hover:bg-white/5 text-muted-foreground"
                                }`}
                              >
                                <div className="flex justify-between items-center">
                                  <span className="text-[11px] font-bold text-white">Direct Browser Engine (User Key)</span>
                                  <span className="text-[9px] uppercase tracking-widest px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-bold">Developer</span>
                                </div>
                                <p className="text-[10px] mt-1 text-muted-foreground/80 leading-relaxed font-medium">
                                  Executes LLM completions directly from your browser. Input your custom key below. Saved strictly local in your browser memory.
                                </p>
                              </button>

                              {/* Mode: Heuristic */}
                              <button
                                onClick={() => handleEngineModeChange("heuristic")}
                                className={`w-full p-4 rounded-2xl border text-left transition-all ${
                                  engineMode === "heuristic" 
                                    ? "border-amber-500/40 bg-amber-950/20 text-white shadow-lg shadow-amber-500/5" 
                                    : "border-white/5 bg-white/[0.01] hover:bg-white/5 text-muted-foreground"
                                }`}
                              >
                                <div className="flex justify-between items-center">
                                  <span className="text-[11px] font-bold text-white">Sandbox Heuristic Engine (Offline)</span>
                                  <span className="text-[9px] uppercase tracking-widest px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">Fail-Safe</span>
                                </div>
                                <p className="text-[10px] mt-1 text-muted-foreground/80 leading-relaxed font-medium">
                                  Runs a sophisticated local semantic pattern matching parser in native JavaScript. 100% offline, keyless, and guaranteed to work forever.
                                </p>
                              </button>
                            </div>
                          </div>

                          {/* Right Column: Connection Diagnostics and API Inputs */}
                          <div className="space-y-6">
                            {engineMode === "custom" && (
                              <div className="space-y-3 p-4 rounded-2xl border border-white/5 bg-white/[0.01]">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80">
                                  Browser Key Configuration
                                </h4>
                                
                                <div className="space-y-3">
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleCustomProviderChange("groq")}
                                      className={`flex-1 py-2 rounded-xl text-[10px] font-bold border transition-all ${
                                        customProvider === "groq"
                                          ? "border-lumina-teal/40 bg-lumina-teal/10 text-white"
                                          : "border-white/5 bg-transparent text-muted-foreground hover:bg-white/5"
                                      }`}
                                    >
                                      Groq (Llama 3.3)
                                    </button>
                                    <button
                                      onClick={() => handleCustomProviderChange("openai")}
                                      className={`flex-1 py-2 rounded-xl text-[10px] font-bold border transition-all ${
                                        customProvider === "openai"
                                          ? "border-cyan-500/40 bg-cyan-500/10 text-white"
                                          : "border-white/5 bg-transparent text-muted-foreground hover:bg-white/5"
                                      }`}
                                    >
                                      OpenAI (GPT-4o)
                                    </button>
                                  </div>

                                  <div className="space-y-1">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 block">
                                      {customProvider === "groq" ? "GROQ API Key" : "OpenAI API Key"}
                                    </label>
                                    <input
                                      type="password"
                                      value={customKey}
                                      onChange={(e) => handleCustomKeyChange(e.target.value)}
                                      placeholder={customProvider === "groq" ? "gsk_..." : "sk-proj-..."}
                                      className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-black/40 text-[11px] font-mono text-white focus:outline-none focus:border-lumina-teal/50 transition-all placeholder:text-white/20"
                                    />
                                    <span className="text-[8px] text-muted-foreground/50 block leading-tight font-medium">
                                      Keys are stored in your `localStorage` and never sent to any server other than the direct API completion endpoints.
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}

                            <div className="space-y-3">
                              <div className="flex justify-between items-center">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 flex items-center gap-1.5">
                                  <ShieldCheck size={12} className="text-lumina-teal" /> Cloud Connection Diagnostics
                                </h4>
                                <button
                                  onClick={runDiagnosticsTest}
                                  disabled={testingDiagnostics}
                                  className="text-[9px] font-black uppercase tracking-widest text-lumina-teal hover:text-teal-400 disabled:text-muted-foreground transition-all flex items-center gap-1"
                                >
                                  {testingDiagnostics ? (
                                    <>
                                      <Loader2 size={10} className="animate-spin" /> Checking...
                                    </>
                                  ) : (
                                    <>
                                      <RefreshCw size={10} /> Run Diagnostics
                                    </>
                                  )}
                                </button>
                              </div>

                              <div className="space-y-2">
                                {/* Supabase status row */}
                                <div className="flex justify-between items-center p-3 rounded-xl bg-white/[0.02] border border-white/5 text-[11px]">
                                  <span className="text-white font-medium flex items-center gap-2">
                                    <span className={`w-1.5 h-1.5 rounded-full ${diagnosticStatus.supabase === "OK" ? "bg-emerald-500 shadow-md shadow-emerald-500/20" : diagnosticStatus.supabase === "checking" ? "bg-amber-500 animate-pulse" : diagnosticStatus.supabase === "idle" ? "bg-white/20" : "bg-red-500 shadow-md shadow-red-500/20"}`} />
                                    Supabase Client Endpoint
                                  </span>
                                  <span className="font-mono text-[9px] font-bold text-muted-foreground">
                                    {diagnosticStatus.supabase}
                                  </span>
                                </div>

                                {/* Vercel status row */}
                                <div className="flex justify-between items-center p-3 rounded-xl bg-white/[0.02] border border-white/5 text-[11px]">
                                  <span className="text-white font-medium flex items-center gap-2">
                                    <span className={`w-1.5 h-1.5 rounded-full ${diagnosticStatus.vercel === "OK" ? "bg-emerald-500 shadow-md shadow-emerald-500/20" : diagnosticStatus.vercel === "checking" ? "bg-amber-500 animate-pulse" : diagnosticStatus.vercel === "idle" ? "bg-white/20" : "bg-red-500 shadow-md shadow-red-500/20"}`} />
                                    Vercel Serverless Gateway
                                  </span>
                                  <span className="font-mono text-[9px] font-bold text-muted-foreground">
                                    {diagnosticStatus.vercel}
                                  </span>
                                </div>

                                {/* Groq credential status row */}
                                <div className="flex justify-between items-center p-3 rounded-xl bg-white/[0.02] border border-white/5 text-[11px]">
                                  <span className="text-white font-medium flex items-center gap-2">
                                    <span className={`w-1.5 h-1.5 rounded-full ${diagnosticStatus.groq === "OK" || diagnosticStatus.groq === "KEY_SET" ? "bg-emerald-500 shadow-md shadow-emerald-500/20" : diagnosticStatus.groq === "checking" ? "bg-amber-500 animate-pulse" : diagnosticStatus.groq === "idle" ? "bg-white/20" : "bg-red-500 shadow-md shadow-red-500/20"}`} />
                                    Server-Side API Authentication
                                  </span>
                                  <span className="font-mono text-[9px] font-bold text-muted-foreground truncate max-w-[120px]">
                                    {diagnosticStatus.groq}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

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
    </div>
  );
};
