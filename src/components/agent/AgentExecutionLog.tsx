"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  AlertTriangle,
  Terminal,
  Cpu,
  Globe,
  Paperclip,
  ArrowDownToLine,
  FileText,
  Zap,
  ExternalLink,
} from "lucide-react";
import type { AgentLogEntry, AgentRunResult } from "@/types/agent";

// ── Icon map per log type ───────────────────────────────────────────────────

function LogIcon({ type }: { type: AgentLogEntry["type"] }) {
  const cls = "w-3 h-3 flex-shrink-0 mt-0.5";
  switch (type) {
    case "success":
      return <CheckCircle2 className={`${cls} text-emerald-500`} />;
    case "error":
      return <AlertTriangle className={`${cls} text-red-500`} />;
    case "warning":
      return <AlertTriangle className={`${cls} text-amber-500`} />;
    case "navigation":
      return <Globe className={`${cls} text-blue-400`} />;
    case "field":
      return <Zap className={`${cls} text-teal-400`} />;
    default:
      return <Terminal className={`${cls} text-slate-400`} />;
  }
}

function logTextClass(type: AgentLogEntry["type"]): string {
  switch (type) {
    case "success":
      return "text-emerald-400";
    case "error":
      return "text-red-400";
    case "warning":
      return "text-amber-400";
    case "navigation":
      return "text-blue-300";
    case "field":
      return "text-teal-300";
    default:
      return "text-slate-300";
  }
}

// ── Props ───────────────────────────────────────────────────────────────────

interface AgentExecutionLogProps {
  logs: AgentLogEntry[];
  result: AgentRunResult | null;
  isRunning: boolean;
  portalUrl?: string;
}

// ── Main Component ──────────────────────────────────────────────────────────

export const AgentExecutionLog: React.FC<AgentExecutionLogProps> = ({
  logs,
  result,
  isRunning,
  portalUrl,
}) => {
  const logsEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs.length]);

  const applied = result?.status === "applied";

  return (
    <div className="space-y-6">
      {/* ── Status Badge ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
              isRunning
                ? "bg-blue-50 border-blue-200 text-blue-600"
                : applied
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-amber-50 border-amber-200 text-amber-700"
            }`}
          >
            {isRunning ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
                Agent Running
              </>
            ) : applied ? (
              <>
                <CheckCircle2 className="w-3 h-3" />
                ✓ Applied
              </>
            ) : (
              <>
                <AlertTriangle className="w-3 h-3" />
                ⚠ Action Required / Halted
              </>
            )}
          </div>

          {result && !isRunning && (
            <span className="text-[11px] font-bold text-slate-500">
              {result.successFields}/{result.totalFields} fields injected
            </span>
          )}
        </div>

        {result && !isRunning && (
          <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
            <Cpu className="w-3 h-3 text-emerald-500" />
            Ref: {result.applicationRef}
          </div>
        )}
      </div>

      {/* ── Live Log Console ── */}
      <div className="bg-[#0D1117] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {/* Console Header */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-800">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
          <span className="ml-3 text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest">
            lumina_agent.log — Real-time Execution Stream
          </span>
          {isRunning && (
            <span className="ml-auto flex items-center gap-1.5 text-[8px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              <span className="w-1 h-1 rounded-full bg-emerald-400 animate-ping" />
              LIVE
            </span>
          )}
        </div>

        {/* Log Lines */}
        <div className="h-72 overflow-y-auto p-4 font-mono text-[11px] space-y-1.5 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-700">
          <AnimatePresence initial={false}>
            {logs.map((entry) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-start gap-2"
              >
                <span className="text-slate-600 shrink-0 w-[78px] text-[9px]">
                  {new Date(entry.timestamp).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: false,
                  })}
                </span>
                <LogIcon type={entry.type} />
                <span className={logTextClass(entry.type)}>{entry.message}</span>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Blinking cursor when running */}
          {isRunning && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-slate-600 text-[9px] w-[78px]" />
              <span className="text-emerald-500 animate-pulse">█</span>
            </div>
          )}

          <div ref={logsEndRef} />
        </div>
      </div>

      {/* ── Proof of Application Card ── */}
      <AnimatePresence>
        {result && !isRunning && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className={`rounded-2xl border p-6 space-y-5 ${
              applied
                ? "border-emerald-200 bg-emerald-50/60"
                : "border-amber-200 bg-amber-50/60"
            }`}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {applied ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                  )}
                  <span
                    className={`text-[11px] font-black uppercase tracking-widest ${
                      applied ? "text-emerald-700" : "text-amber-700"
                    }`}
                  >
                    {applied ? "Proof of Application" : "Submission Halted"}
                  </span>
                </div>
                <p className={`text-xs font-medium ${applied ? "text-emerald-600" : "text-amber-600"}`}>
                  {applied
                    ? "Lumina Agent successfully submitted your application."
                    : result.haltReason ?? "Agent stopped — manual action required."}
                </p>
              </div>
              <span className="font-mono text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-3 py-1 rounded-full">
                {result.confirmationSnapshot.referenceId}
              </span>
            </div>

            {/* Snapshot Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                {
                  icon: <FileText className="w-3 h-3" />,
                  label: "Role Applied",
                  value: result.confirmationSnapshot.title,
                },
                {
                  icon: <Globe className="w-3 h-3" />,
                  label: "Portal",
                  value: result.confirmationSnapshot.portalDomain,
                },
                {
                  icon: <Zap className="w-3 h-3" />,
                  label: "Fields Injected",
                  value: `${result.confirmationSnapshot.fieldsInjected} / ${result.totalFields}`,
                },
                {
                  icon: <Paperclip className="w-3 h-3" />,
                  label: "Resume Attached",
                  value: applied ? "Yes" : "Partial",
                },
                {
                  icon: <Cpu className="w-3 h-3" />,
                  label: "Engine",
                  value: "Llama-3.1-8B",
                },
                {
                  icon: <ArrowDownToLine className="w-3 h-3" />,
                  label: "Submitted At",
                  value: new Date(result.confirmationSnapshot.submittedAt).toLocaleString("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }),
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="bg-white border border-slate-100 rounded-xl p-3 space-y-1"
                >
                  <div className="flex items-center gap-1.5 text-slate-400">
                    {item.icon}
                    <span className="text-[9px] font-black uppercase tracking-widest">
                      {item.label}
                    </span>
                  </div>
                  <p className="text-[12px] font-bold text-slate-800 truncate" title={item.value}>
                    {item.value}
                  </p>
                </div>
              ))}
            </div>

            {/* DOM Snapshot Simulation */}
            <div className="rounded-xl overflow-hidden border border-slate-200">
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 border-b border-slate-200">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                  Confirmation DOM Snapshot — {result.confirmationSnapshot.portalDomain}
                </span>
              </div>
              <div className="bg-white p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      applied ? "bg-emerald-100" : "bg-amber-100"
                    }`}
                  >
                    {applied ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      {applied
                        ? "Application Submitted Successfully"
                        : "Application Incomplete — Action Required"}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {applied
                        ? `Your application for "${result.confirmationSnapshot.title}" has been received.`
                        : `Some fields could not be completed. Please finish your application manually.`}
                    </p>
                  </div>
                </div>
                <div className="h-px bg-slate-100" />
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div>
                    <span className="text-slate-400 uppercase tracking-wider font-bold">Reference ID</span>
                    <p className="font-mono font-bold text-slate-800 mt-0.5">
                      {result.confirmationSnapshot.referenceId}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase tracking-wider font-bold">Timestamp</span>
                    <p className="font-mono font-bold text-slate-800 mt-0.5">
                      {new Date(result.confirmationSnapshot.submittedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                {/* Simulated progress bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[9px] text-slate-400">
                    <span>Application Completeness</span>
                    <span>{Math.round((result.successFields / Math.max(result.totalFields, 1)) * 100)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${Math.round((result.successFields / Math.max(result.totalFields, 1)) * 100)}%`,
                      }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className={`h-full rounded-full ${applied ? "bg-emerald-500" : "bg-amber-400"}`}
                    />
                  </div>
                </div>
                {portalUrl && !applied && (
                  <a
                    href={portalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[#1E2A3A] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#2a3a4a] transition-all"
                  >
                    <ExternalLink size={14} />
                    Open Application Page & Apply Manually
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AgentExecutionLog;
