"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  ChevronDown,
  Trash2,
  Link2,
  AlertCircle,
  Rocket,
  Clock,
  FileText,
  Cpu,
  RefreshCw,
  ShieldCheck,
  Zap,
  Info,
  Wifi,
  WifiOff,
  Settings2,
  Sparkles,
  ClipboardCheck,
  Copy,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

import { getAgentResumes, deleteAgentResume } from "@/lib/agentStorage";
import { runAgentJob, getAutomationServiceUrl, setAutomationServiceUrl } from "@/lib/agentWorker";
import { AgentExecutionLog } from "./AgentExecutionLog";
import { buildAnswerPack, logApplication, deriveCompanyFromUrl, type AnswerPack } from "@/lib/smartApply";
import { buildBookmarkletUrl } from "@/lib/luminaBookmarklet";

import type { SavedAgentResume } from "@/types/agent";
import type { AgentLogEntry, AgentRunResult } from "@/types/agent";

// ── URL Validation ─────────────────────────────────────────────────────────

function isValidUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

// ── Component ──────────────────────────────────────────────────────────────

export const JobAgentDashboard: React.FC = () => {
  const [savedResumes, setSavedResumes] = useState<SavedAgentResume[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [portalUrl, setPortalUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<AgentLogEntry[]>([]);
  const [result, setResult] = useState<AgentRunResult | null>(null);
  const [backendStatus, setBackendStatus] = useState<"checking" | "connected" | "disconnected">("checking");
  const [showSettings, setShowSettings] = useState(false);
  const [backendUrl, setBackendUrl] = useState(getAutomationServiceUrl());
  const [answerPack, setAnswerPack] = useState<AnswerPack | null>(null);
  const [smartApplying, setSmartApplying] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── Load vault ─────────────────────────────────────────────────────────
  const loadVault = useCallback((forceId?: string) => {
    const resumes = getAgentResumes();
    setSavedResumes(resumes);
    if (forceId) {
      setSelectedId(forceId);
    } else if (resumes.length > 0 && !selectedId) {
      setSelectedId(resumes[0].id);
    }
  }, [selectedId]);

  useEffect(() => {
    loadVault();
    const handle = (e: Event) => {
      const customEvent = e as CustomEvent;
      loadVault(customEvent.detail?.id);
    };
    window.addEventListener("lumina_agent_vault_updated", handle);
    return () => window.removeEventListener("lumina_agent_vault_updated", handle);
  }, [loadVault]);

  // ── Test backend connection ─────────────────────────────────────────
  const testConnection = useCallback(async () => {
    setBackendStatus("checking");
    try {
      const ws = new WebSocket(backendUrl);
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => { ws.close(); reject(new Error("timeout")); }, 3000);
        ws.onopen = () => { clearTimeout(timer); ws.close(); resolve(); };
        ws.onerror = () => { clearTimeout(timer); reject(new Error("error")); };
      });
      setBackendStatus("connected");
    } catch {
      setBackendStatus("disconnected");
    }
  }, [backendUrl]);

  useEffect(() => { testConnection(); }, [testConnection]);

  // ── Close dropdown on outside click ───────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = savedResumes.find((r) => r.id === selectedId) ?? null;

  // ── Delete resume ──────────────────────────────────────────────────────
  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteAgentResume(id);
    if (selectedId === id) setSelectedId("");
    loadVault();
    toast.success("Resume removed from Agent Vault.");
  };

  // ── URL validation ─────────────────────────────────────────────────────
  const handleUrlChange = (v: string) => {
    setPortalUrl(v);
    if (v && !isValidUrl(v)) {
      setUrlError("Please enter a valid URL starting with https://");
    } else {
      setUrlError("");
    }
  };

  // ── Launch Agent ───────────────────────────────────────────────────────
  const handleLaunch = async () => {
    if (!selected) {
      toast.error("No resume selected. Please generate a resume first.");
      return;
    }
    if (!portalUrl.trim()) {
      setUrlError("Job Portal URL is required to launch the agent.");
      return;
    }
    if (!isValidUrl(portalUrl)) {
      setUrlError("Please enter a valid URL starting with https://");
      return;
    }

    if (backendStatus === "disconnected") {
      toast.warning("Automation backend is offline — running in simulation mode", {
        description: "Start the automation service for real browser automation: cd automation-service && npm start",
      });
    }

    setUrlError("");
    setLogs([]);
    setResult(null);
    setIsRunning(true);

    try {
      let agentWindow: Window | null = null;
      // Only open popup if backend is connected (real automation)
      if (backendStatus === "connected") {
        agentWindow = window.open(
          portalUrl,
          "LuminaAgentPortal",
          "width=1024,height=800,left=100,top=100"
        );
      }

      const finalResult = await runAgentJob(selected, portalUrl, (entry) => {
        setLogs((prev) => [...prev, entry]);
      }, agentWindow);
      setResult(finalResult);

      if (finalResult.status === "applied") {
        toast.success("Application submitted successfully!", {
          description: `Ref: ${finalResult.applicationRef}`,
        });
      } else {
        toast.warning("Agent halted — manual action required.", {
          description: finalResult.haltReason,
        });
      }
    } catch (err) {
      console.error("Agent worker error:", err);
      toast.error("Agent encountered an unexpected error.");
    } finally {
      setIsRunning(false);
    }
  };

  // ── Smart Apply (reliable, no backend needed) ─────────────────────────
  const handleSmartApply = async () => {
    if (!selected) {
      toast.error("Select a saved resume first.");
      return;
    }
    if (!portalUrl.trim() || !isValidUrl(portalUrl)) {
      setUrlError("Enter a valid application URL.");
      return;
    }
    setSmartApplying(true);
    try {
      const pack = buildAnswerPack(selected);
      setAnswerPack(pack);

      // 1. Copy answer pack to clipboard
      try {
        await navigator.clipboard.writeText(pack.combined);
      } catch {
        // clipboard may be blocked; UI fallback shows the pack
      }

      // 2. Open the application URL in a new tab
      const win = window.open(portalUrl, "_blank", "noopener,noreferrer");
      if (!win) {
        toast.warning("Popup blocked — please allow popups and click Smart Apply again.");
      }

      // 3. Log to Pipeline (best-effort)
      const company = deriveCompanyFromUrl(portalUrl);
      const logRes = await logApplication({
        company,
        role: selected.jdTitle,
        url: portalUrl,
      });

      if (logRes.ok) {
        toast.success("Smart Apply ready — your details are on your clipboard", {
          description: `Form is open in a new tab. Click any field → Ctrl/Cmd+V. Logged "${selected.jdTitle}" at ${company} to Pipeline.`,
          duration: 6000,
        });
      } else {
        toast.success("Answer pack copied — paste with Ctrl/Cmd+V on the form", {
          description: `Pipeline log skipped: ${logRes.error}`,
          duration: 6000,
        });
      }
      // Scroll the answer pack panel into view so the user sees the value immediately.
      setTimeout(() => {
        document.getElementById("smart-apply-pack")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
    } catch (err) {
      console.error(err);
      toast.error("Smart Apply failed unexpectedly.");
    } finally {
      setSmartApplying(false);
    }
  };

  const copyField = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Clipboard blocked by browser.");
    }
  };

  // ── Empty vault state ──────────────────────────────────────────────────
  const isEmpty = savedResumes.length === 0;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-10 py-8">

      {/* ── Header ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
            <Bot size={18} className="text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
              Autonomous Job Agent
            </h1>
            <p className="text-[12px] font-medium text-slate-500">
              AI-powered form injection & passive application submission
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {/* Connection Status */}
            <button
              onClick={testConnection}
              title={`Backend: ${backendStatus === "connected" ? "Connected" : backendStatus === "checking" ? "Checking..." : "Disconnected"} — Click to retest`}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-colors ${
                backendStatus === "connected"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                  : backendStatus === "checking"
                  ? "bg-amber-50 border-amber-200 text-amber-600"
                  : "bg-red-50 border-red-200 text-red-600"
              }`}
            >
              {backendStatus === "connected" ? <Wifi size={9} /> : <WifiOff size={9} />}
              {backendStatus === "connected" ? "Live" : backendStatus === "checking" ? "..." : "Offline"}
            </button>

            {/* Settings */}
            <div className="relative">
              <button
                onClick={() => setShowSettings((o) => !o)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-700 transition-colors"
              >
                <Settings2 size={9} />
                Config
              </button>

              <AnimatePresence>
                {showSettings && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full right-0 mt-1.5 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-4 space-y-3"
                  >
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Automation Backend</p>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      For real browser automation, run the backend service and set the WebSocket URL below.
                    </p>
                    <input
                      type="text"
                      value={backendUrl}
                      onChange={(e) => setBackendUrl(e.target.value)}
                      placeholder="ws://localhost:3001"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-[11px] font-medium text-slate-800 outline-none focus:border-emerald-400"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setAutomationServiceUrl(backendUrl);
                          testConnection();
                          toast.success("Backend URL updated");
                        }}
                        className="flex-1 py-2 rounded-xl bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-400 transition-colors"
                      >
                        Save & Test
                      </button>
                      <button
                        onClick={() => { setBackendUrl("ws://localhost:3001"); setAutomationServiceUrl("ws://localhost:3001"); testConnection(); }}
                        className="px-3 py-2 rounded-xl border border-slate-200 text-[10px] font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                      >
                        Reset
                      </button>
                    </div>
                    <p className="text-[9px] text-slate-400">
                      Start with: <code className="bg-slate-100 px-1 rounded">cd automation-service && npm start</code>
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-[10px] font-black uppercase tracking-widest text-blue-600">
              <Zap size={10} className="animate-pulse" />
              Llama-3.1-8B
            </div>
          </div>
        </div>

        {/* Info banner */}
        <div className="flex items-start gap-2.5 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3">
          <Info size={13} className="text-slate-400 mt-0.5 shrink-0" />
          <p className="text-[11px] font-medium text-slate-500 leading-relaxed">
            The Job Agent navigates to your target URL, detects form fields, injects your resume data,
            and submits the application. Connect the automation backend (wss://) for real browser automation,
            or run in simulation mode to preview the flow.
          </p>
        </div>
      </div>

      {/* ── 3-Panel Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ══ Panel A: Resume Selector ══ */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-slate-100 rounded-[2rem] p-6 space-y-5 shadow-sm">
            <div className="flex items-center gap-2">
              <FileText size={14} className="text-emerald-600" />
              <span className="text-[11px] font-black uppercase tracking-widest text-slate-600">
                Saved Resume Profile
              </span>
            </div>

            {/* Dropdown */}
            {isEmpty ? (
              <div className="space-y-3 py-2">
                <div className="text-center py-6 space-y-2">
                  <FileText size={28} className="mx-auto text-slate-200" />
                  <p className="text-[12px] font-bold text-slate-400">No resumes saved yet</p>
                  <p className="text-[11px] text-slate-400 max-w-[200px] mx-auto">
                    Generate a resume in the Generator tab to populate the Agent Vault.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Custom dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen((o) => !o)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-slate-50 border border-slate-200 hover:border-emerald-400 rounded-2xl text-left transition-all duration-200 group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText size={12} className="text-emerald-500 shrink-0" />
                      <span className="text-[12px] font-bold text-slate-800 truncate">
                        {selected?.label ?? "Select a saved resume"}
                      </span>
                    </div>
                    <ChevronDown
                      size={14}
                      className={`text-slate-400 shrink-0 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  <AnimatePresence>
                    {dropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.97 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden max-h-60 overflow-y-auto"
                      >
                        {savedResumes.map((r) => (
                          <div
                            key={r.id}
                            onClick={() => {
                              setSelectedId(r.id);
                              setDropdownOpen(false);
                            }}
                            className={`flex items-center justify-between gap-2 px-4 py-3 cursor-pointer hover:bg-emerald-50 transition-colors border-b border-slate-100 last:border-0 ${
                              r.id === selectedId ? "bg-emerald-50" : ""
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {r.id === selectedId && (
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                              )}
                              <div className="min-w-0">
                                <p className="text-[11px] font-bold text-slate-800 truncate">
                                  {r.jdTitle}
                                </p>
                                <p className="text-[9px] text-slate-400 font-medium">
                                  {new Date(r.savedAt).toLocaleDateString("en-IN", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  })}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={(e) => handleDelete(r.id, e)}
                              className="w-6 h-6 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors shrink-0"
                            >
                              <Trash2 size={9} className="text-red-400" />
                            </button>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Refresh button */}
                <button
                  onClick={() => loadVault()}
                  className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 hover:text-emerald-600 transition-colors"
                >
                  <RefreshCw size={10} />
                  Refresh Vault
                </button>
              </div>
            )}

            {/* Selected resume metadata */}
            <AnimatePresence>
              {selected && (
                <motion.div
                  key={selected.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-3 border-t border-slate-100 pt-4"
                >
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                    Linked JD Context
                  </p>
                  <div className="bg-slate-50 rounded-xl p-3 space-y-2">
                    <div className="flex items-center gap-1.5">
                      <FileText size={9} className="text-emerald-500" />
                      <span className="text-[10px] font-bold text-slate-700 truncate">
                        {selected.jdTitle}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock size={9} className="text-slate-400" />
                      <span className="text-[9px] text-slate-500">
                        {new Date(selected.savedAt).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck size={9} className="text-emerald-500" />
                      <span className="text-[9px] text-slate-500">
                        {selected.jdSkills.length} skills · {selected.resume.experience?.length ?? 0} experience entries
                      </span>
                    </div>
                  </div>

                  {/* Top skills pills */}
                  <div className="flex flex-wrap gap-1.5">
                    {selected.jdSkills.slice(0, 6).map((s) => (
                      <span
                        key={s.skill}
                        className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-[9px] font-bold text-emerald-700"
                      >
                        {s.skill}
                      </span>
                    ))}
                    {selected.jdSkills.length > 6 && (
                      <span className="text-[9px] text-slate-400 font-bold">
                        +{selected.jdSkills.length - 6} more
                      </span>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ══ Panel B: URL Input + Launch ══ */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white border border-slate-100 rounded-[2rem] p-6 space-y-6 shadow-sm">
            <div className="flex items-center gap-2">
              <Link2 size={14} className="text-emerald-600" />
              <span className="text-[11px] font-black uppercase tracking-widest text-slate-600">
                Target Job Portal
              </span>
              <span className="ml-1 text-[9px] font-black uppercase tracking-widest text-red-500 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">
                Required
              </span>
            </div>

            {/* URL Input */}
            <div className="space-y-2">
              <div
                className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border transition-all duration-200 ${
                  urlError
                    ? "border-red-300 bg-red-50"
                    : portalUrl && isValidUrl(portalUrl)
                    ? "border-emerald-300 bg-emerald-50"
                    : "border-slate-200 bg-slate-50 focus-within:border-emerald-400 focus-within:bg-white"
                }`}
              >
                <Link2
                  size={14}
                  className={urlError ? "text-red-400" : "text-slate-400"}
                />
                <input
                  type="url"
                  value={portalUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder="https://jobs.company.com/apply/senior-engineer"
                  className="flex-1 bg-transparent text-[13px] font-medium text-slate-800 placeholder:text-slate-400 outline-none"
                />
                {portalUrl && isValidUrl(portalUrl) && !urlError && (
                  <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
                )}
              </div>

              <AnimatePresence>
                {urlError && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-1.5 text-[11px] font-bold text-red-500"
                  >
                    <AlertCircle size={11} />
                    {urlError}
                  </motion.div>
                )}
              </AnimatePresence>

              <p className="text-[10px] text-slate-400 font-medium px-1">
                Paste the direct application URL. The agent will navigate, parse form fields, and inject your data automatically.
              </p>
            </div>

            {/* Agent configuration summary */}
            {selected && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: "Agent Model", value: "Llama-3.1-8B", icon: <Cpu size={10} /> },
                  { label: "Contact Info", value: selected.contactInfo.fullName || "Loaded", icon: <ShieldCheck size={10} /> },
                  { label: "Email", value: selected.contactInfo.email || "—", icon: <ShieldCheck size={10} /> },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-1"
                  >
                    <div className="flex items-center gap-1 text-slate-400">
                      {item.icon}
                      <span className="text-[8px] font-black uppercase tracking-widest">
                        {item.label}
                      </span>
                    </div>
                    <p className="text-[11px] font-bold text-slate-700 truncate" title={item.value}>
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Smart Apply (primary - reliable) */}
            <motion.button
              onClick={handleSmartApply}
              disabled={smartApplying || isEmpty || !selected || !portalUrl || !!urlError}
              whileHover={!smartApplying && !isEmpty ? { scale: 1.02 } : {}}
              whileTap={!smartApplying && !isEmpty ? { scale: 0.98 } : {}}
              className={`w-full py-4 px-6 rounded-2xl font-black text-[13px] uppercase tracking-widest flex items-center justify-center gap-3 transition-all duration-300 ${
                smartApplying
                  ? "bg-emerald-400 text-white cursor-wait"
                  : isEmpty || !selected || !portalUrl || !!urlError
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                  : "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-lg shadow-emerald-500/20"
              }`}
            >
              {smartApplying ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                  Preparing…
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Smart Apply
                </>
              )}
            </motion.button>
            <p className="text-[10px] text-slate-400 font-medium text-center -mt-2">
              Opens the application, copies a tailored answer pack to your clipboard, and logs the application to your Pipeline.
            </p>

            {/* Launch Button (advanced - requires backend) */}
            <motion.button
              onClick={handleLaunch}
              disabled={isRunning || isEmpty || !selected}
              whileHover={!isRunning && !isEmpty ? { scale: 1.02 } : {}}
              whileTap={!isRunning && !isEmpty ? { scale: 0.98 } : {}}
              className={`w-full py-3 px-6 rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 transition-all duration-300 border ${
                isRunning
                  ? "bg-blue-500 text-white cursor-not-allowed border-transparent"
                  : isEmpty
                  ? "bg-slate-50 text-slate-300 cursor-not-allowed border-slate-200"
                  : "bg-white text-slate-600 hover:text-emerald-600 border-slate-200 hover:border-emerald-300"
              }`}
            >
              {isRunning ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                  Agent Running...
                </>
              ) : (
                <>
                  <Rocket size={12} />
                  Launch Autonomous Agent (requires backend)
                </>
              )}
            </motion.button>
          </div>

          {/* ══ Smart Apply Answer Pack Panel ══ */}
          <AnimatePresence>
            {answerPack && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                id="smart-apply-pack"
                className="bg-white border border-emerald-100 rounded-[2rem] p-6 shadow-sm space-y-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ClipboardCheck size={14} className="text-emerald-600" />
                    <span className="text-[11px] font-black uppercase tracking-widest text-slate-600">
                      Smart Apply Answer Pack
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => window.open(portalUrl, "_blank", "noopener,noreferrer")}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[10px] font-bold text-slate-600 hover:text-emerald-600 hover:border-emerald-300 transition-colors"
                    >
                      <ExternalLink size={10} /> Reopen Portal
                    </button>
                    <button
                      onClick={() => copyField("Full pack", answerPack.combined)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-[10px] font-bold hover:bg-emerald-400 transition-colors"
                    >
                      <Copy size={10} /> Copy All
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Click any field below to copy it individually. Paste directly into the application form fields.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { label: "Full Name", value: answerPack.fullName },
                    { label: "First Name", value: answerPack.firstName },
                    { label: "Last Name", value: answerPack.lastName },
                    { label: "Email", value: answerPack.email },
                    { label: "Phone", value: answerPack.phone },
                    { label: "Location", value: answerPack.location },
                    { label: "LinkedIn", value: answerPack.linkedin },
                    { label: "GitHub", value: answerPack.github },
                    { label: "Website", value: answerPack.website },
                    { label: "Top Skills", value: answerPack.topSkills },
                  ]
                    .filter((f) => f.value)
                    .map((f) => (
                      <button
                        key={f.label}
                        onClick={() => copyField(f.label, f.value)}
                        className="group flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-100 hover:border-emerald-200 text-left transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">{f.label}</p>
                          <p className="text-[11px] font-bold text-slate-700 truncate">{f.value}</p>
                        </div>
                        <Copy size={11} className="text-slate-300 group-hover:text-emerald-500 shrink-0" />
                      </button>
                    ))}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Summary</p>
                    <button
                      onClick={() => copyField("Summary", answerPack.summary)}
                      className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 hover:text-emerald-500"
                    >
                      <Copy size={9} /> Copy
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed bg-slate-50 rounded-xl p-3 border border-slate-100">
                    {answerPack.summary}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Why This Role</p>
                    <button
                      onClick={() => copyField("Why this role", answerPack.whyThisRole)}
                      className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 hover:text-emerald-500"
                    >
                      <Copy size={9} /> Copy
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed bg-slate-50 rounded-xl p-3 border border-slate-100">
                    {answerPack.whyThisRole}
                  </p>
                </div>

                {/* ── One-click Autofill Bookmarklet ── */}
                <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Sparkles size={12} className="text-emerald-600" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">
                      Lumina Autofill bookmarklet
                    </p>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Drag the button below to your bookmarks bar <strong>once</strong>. On any application form, click the bookmark to auto-fill name, email, phone, LinkedIn, GitHub, summary and cover-letter fields. Works on Greenhouse, Lever, Ashby, Workable, and most generic HTML forms.
                  </p>
                  <div className="flex items-center gap-3 flex-wrap pt-1">
                    <a
                      href={buildBookmarkletUrl(answerPack)}
                      onClick={(e) => {
                        e.preventDefault();
                        toast.info("Drag this button to your bookmarks bar — don't click it here.");
                      }}
                      draggable
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 text-white text-[11px] font-black uppercase tracking-widest hover:bg-emerald-400 transition-colors cursor-grab active:cursor-grabbing select-none shadow-sm shadow-emerald-500/20"
                    >
                      <Sparkles size={11} /> Lumina Autofill
                    </a>
                    <span className="text-[10px] text-slate-400 font-medium">
                      ↑ Drag me to your bookmarks bar
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>


          {/* ══ Panel C: Execution Log ══ */}
          <AnimatePresence>
            {(logs.length > 0 || isRunning) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm"
              >
                <div className="flex items-center gap-2 mb-5">
                  <Cpu size={14} className="text-emerald-600" />
                  <span className="text-[11px] font-black uppercase tracking-widest text-slate-600">
                    Real-time Execution Log
                  </span>
                </div>
                <AgentExecutionLog
                  logs={logs}
                  result={result}
                  isRunning={isRunning}
                  portalUrl={portalUrl}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default JobAgentDashboard;
