import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Copy, Check, Sparkles, Zap, Target, MousePointer2, 
  Upload, Loader2, AlertCircle, FileText, ChevronDown, 
  ChevronUp, CheckCircle2, AlertTriangle, RefreshCw, Info, HelpCircle
} from "lucide-react";
import { toast } from "sonner";
import type { 
  GeneratedBulletItem, 
  MultiPassBulletResult, 
  PipelineProgress 
} from "@/types/bulletGenerator";
import type { DecodeResult, StructuredJdData } from "@/types/jd";
import { generateMultiPassBullets } from "@/lib/multiPassBulletGenerator";
import { extractResumeSchema } from "@/lib/resumeSchemaExtractor";
import { MultiPassProgress } from "./ui/MultiPassProgress";
import pdfWorkerUrl from "pdfjs-dist/legacy/build/pdf.worker.mjs?url";

interface ResumeBulletGeneratorProps {
  bullets?: string[];
  resumeText?: string;
  jdResults?: DecodeResult;
}

async function extractPdfText(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item: any) => item.str || "").join(" ");
    fullText += pageText + "\n";
  }
  return fullText.trim();
}

async function extractDocxText(file: File): Promise<string> {
  const mammoth = await import("mammoth");
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

export const ResumeBulletGenerator = ({ bullets, resumeText: initialResumeText, jdResults }: ResumeBulletGeneratorProps) => {
  const [localResumeText, setLocalResumeText] = useState(initialResumeText || "");
  const [isParsingResume, setIsParsingResume] = useState(false);
  const [isTextInputOpen, setIsTextInputOpen] = useState(false);
  const [pipelineProgress, setPipelineProgress] = useState<PipelineProgress>({
    stage: "idle",
    percent: 0,
    message: ""
  });
  const [pipelineResult, setPipelineResult] = useState<MultiPassBulletResult | null>(null);
  const [activeTabMap, setActiveTabMap] = useState<Record<number, "metric_heavy" | "impact_heavy" | "technical_heavy">>({});
  const [expandedCardIdx, setExpandedCardIdx] = useState<number | null>(0);
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null); // e.g. "cardIndex-variant"
  const [showFidelityLogs, setShowFidelityLogs] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Synchronize when parent updates resumeText (e.g. from Gap Analyzer)
  useEffect(() => {
    if (initialResumeText) {
      setLocalResumeText(initialResumeText);
    }
  }, [initialResumeText]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsingResume(true);
    const toastId = toast.loading(`Parsing ${file.name}...`);
    try {
      let extractedText = "";
      if (file.name.endsWith(".pdf")) {
        extractedText = await extractPdfText(file);
      } else if (file.name.endsWith(".docx")) {
        extractedText = await extractDocxText(file);
      } else {
        throw new Error("Unsupported file format. Please upload PDF or DOCX.");
      }

      if (extractedText.trim().length < 50) {
        throw new Error("Could not extract sufficient text from resume.");
      }

      setLocalResumeText(extractedText);
      toast.success("Resume text parsed successfully!", { id: toastId });
    } catch (err: any) {
      toast.error(err.message || "Failed to parse resume file.", { id: toastId });
    } finally {
      setIsParsingResume(false);
    }
  };

  const handleCalibrate = async () => {
    if (!localResumeText.trim()) {
      toast.error("Please paste or upload a resume first.");
      return;
    }

    setPipelineProgress({
      stage: "mapping",
      percent: 10,
      message: "Initializing multi-pass pipeline..."
    });

    try {
      // 1. Extract structured schema from raw resume text
      setPipelineProgress({
        stage: "mapping",
        percent: 20,
        message: "Pass 1/3: Extracting structured resume facts..."
      });
      const structuredResume = await extractResumeSchema(localResumeText);

      // 2. Build structured JD data from decoded results
      const structuredJd: StructuredJdData = jdResults?.structured_data || {
        role_title: jdResults?.title || "Target Position",
        company_name: jdResults?.overview?.company || "Target Company",
        employment_type: jdResults?.overview?.employment_type || "full-time",
        location: jdResults?.overview?.location || "Not specified",
        hard_requirements: (jdResults?.skills || []).map(s => ({
          category: s.category || "Technical",
          priority: s.importance > 70 ? "must-have" : "nice-to-have",
          specific_technologies: [s.skill]
        })),
        soft_requirements: [],
        responsibilities: [],
        culture_signals: [],
        company_context: {
          work_style: jdResults?.deep_dive?.culture_radar?.collaboration && jdResults.deep_dive.culture_radar.collaboration > 60 ? "collaborative" : "professional"
        },
        keywords_for_ats: [],
        red_flags: { vague_requirements: [], unrealistic_expectations: [] }
      };

      // 3. Call multi-pass bullet generator
      const result = await generateMultiPassBullets(
        structuredResume, 
        structuredJd,
        (progress) => setPipelineProgress(progress)
      );

      setPipelineResult(result);
      
      // Initialize active tabs for all items
      const initialTabs: Record<number, "metric_heavy" | "impact_heavy" | "technical_heavy"> = {};
      result.generated_bullets.forEach((_, idx) => {
        initialTabs[idx] = "metric_heavy";
      });
      setActiveTabMap(initialTabs);
      toast.success("Content calibration complete!");
    } catch (err: any) {
      console.error("[ResumeBulletGenerator] calibration failed:", err);
      toast.error("Calibration failed. Please verify your inputs and try again.");
      setPipelineProgress({
        stage: "idle",
        percent: 0,
        message: ""
      });
    }
  };

  const copyToClipboard = (text: string, cardIdx: number, variant: string) => {
    const cleanedText = text.replace(/\*\*/g, "");
    navigator.clipboard.writeText(cleanedText);
    const key = `${cardIdx}-${variant}`;
    setCopiedIndex(key);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const toggleFidelityLogs = (cardIdx: number, variant: string) => {
    const key = `${cardIdx}-${variant}`;
    setShowFidelityLogs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getValidationBadge = (rb: GeneratedBulletItem, variant: "metric_heavy" | "impact_heavy" | "technical_heavy") => {
    const result = rb.validation_results[variant];
    const bulletText = rb.variants[variant];

    if (!result.is_safe) {
      return {
        label: "Auto-Corrected",
        color: "bg-rose-500/10 text-rose-500 border-rose-500/20",
        icon: AlertTriangle,
        desc: result.issue || "Hallucinated claim detected and auto-sanitized."
      };
    }

    if (bulletText.includes("[METRIC:")) {
      return {
        label: "Requires Input",
        color: "bg-amber-500/10 text-amber-500 border-amber-500/20",
        icon: AlertCircle,
        desc: "Contains metric placeholders. Swap with your actual metrics."
      };
    }

    if (result.score < 85) {
      return {
        label: "Inferred Match",
        color: "bg-blue-500/10 text-accent-blue border-accent-blue/20",
        icon: Info,
        desc: result.issue || "Semantic alignment. Ground truth may have minor variance."
      };
    }

    return {
      label: "Verified Fidelity",
      color: "bg-emerald-500/10 text-accent-emerald border-accent-emerald/20",
      icon: CheckCircle2,
      desc: "All claims verified against resume ground truth."
    };
  };

  const isCalibrating = pipelineProgress.stage !== "idle" && pipelineProgress.stage !== "complete" && pipelineProgress.percent < 100;

  return (
    <div className="glass-panel bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 rounded-[2.5rem] border border-white/20 space-y-8 relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity pointer-events-none">
        <Sparkles size={160} />
      </div>

      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-lumina-teal/10 border border-lumina-teal/20 text-lumina-teal">
            <Zap size={20} className="animate-pulse" />
          </div>
          <div>
            <h3 className="text-2xl font-serif italic text-foreground">Content Calibration</h3>
            <p className="text-[10px] uppercase font-black tracking-[0.2em] text-muted-foreground opacity-50 mt-1">
              Advanced Multi-Pass Achievement synthesis
            </p>
          </div>
        </div>

        {pipelineResult && (
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <span className="text-[9px] font-black uppercase text-muted-foreground/60 tracking-wider block">Fidelity Matrix</span>
              <span className="text-sm font-black text-accent-emerald">{pipelineResult.overall_quality_score}% Calibrated</span>
            </div>
            <button 
              onClick={() => {
                setPipelineResult(null);
                setPipelineProgress({ stage: "idle", percent: 0, message: "" });
              }}
              className="p-2.5 rounded-xl bg-muted border hover:bg-black/5 hover:border-black/10 active:scale-95 transition-all text-muted-foreground"
              title="Recalibrate"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        )}
      </div>

      {/* ── LOADER DISPLAY ── */}
      <AnimatePresence mode="wait">
        {isCalibrating && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="py-6 z-10 relative"
          >
            <MultiPassProgress progress={pipelineProgress} />
          </motion.div>
        )}

        {/* ── MAPPED CALIBRATION RESULTS ── */}
        {!isCalibrating && pipelineResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6 relative z-10"
          >
            <div className="space-y-4">
              {pipelineResult.generated_bullets.map((rb, idx) => {
                const isExpanded = expandedCardIdx === idx;
                const activeTab = activeTabMap[idx] || "metric_heavy";
                const badgeInfo = getValidationBadge(rb, activeTab);
                const activeBullet = rb.variants[activeTab];
                const BadgeIcon = badgeInfo.icon;
                const logKey = `${idx}-${activeTab}`;
                const isLogOpen = !!showFidelityLogs[logKey];

                const strengthColors = {
                  strong: "bg-emerald-500/10 text-accent-emerald border-emerald-500/20",
                  moderate: "bg-blue-500/10 text-accent-blue border-blue-500/20",
                  weak: "bg-amber-500/10 text-amber-500 border-amber-500/20",
                  none: "bg-rose-500/10 text-rose-500 border-rose-500/20"
                };

                return (
                  <div 
                    key={idx}
                    className={`rounded-3xl border transition-all duration-300 overflow-hidden ${
                      isExpanded 
                        ? "bg-slate-50/50 border-black/10 shadow-md" 
                        : "bg-white border-black/[0.04] hover:border-black/10 hover:bg-slate-50/30"
                    }`}
                  >
                    {/* Header trigger */}
                    <div 
                      onClick={() => setExpandedCardIdx(isExpanded ? null : idx)}
                      className="p-5 flex items-center justify-between cursor-pointer select-none"
                    >
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${strengthColors[rb.matching_experience ? "strong" : "none"]}`}>
                            Requirement {idx + 1}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-semibold truncate max-w-xs">
                            Matches {rb.matching_experience}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-foreground truncate uppercase tracking-wider">
                          {rb.jd_requirement}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2">
                        {isExpanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                      </div>
                    </div>

                    {/* Expandable Tabs & Bullet Content */}
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div 
                          initial={{ height: 0 }}
                          animate={{ height: "auto" }}
                          exit={{ height: 0 }}
                          className="border-t border-black/5"
                        >
                          <div className="p-5 space-y-4">
                            {/* Tab Switcher */}
                            <div className="flex border-b border-black/5 pb-2">
                              {(["metric_heavy", "impact_heavy", "technical_heavy"] as const).map(variant => (
                                <button
                                  key={variant}
                                  onClick={() => setActiveTabMap(prev => ({ ...prev, [idx]: variant }))}
                                  className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-colors border-b-2 -mb-[10px] ${
                                    activeTab === variant 
                                      ? "border-lumina-teal text-lumina-teal font-black" 
                                      : "border-transparent text-muted-foreground hover:text-foreground"
                                  }`}
                                >
                                  {variant === "metric_heavy" ? "Metric-Heavy" : variant === "impact_heavy" ? "Impact-Heavy" : "Technical-Heavy"}
                                </button>
                              ))}
                            </div>

                            {/* Active Content Block */}
                            <div className="p-5 rounded-2xl bg-white border border-black/5 space-y-4 hover:border-black/10 transition-colors">
                              <p className="text-xs font-semibold text-foreground/80 leading-relaxed">
                                {activeBullet.split('**').map((part, pIdx) => 
                                  pIdx % 2 === 1 
                                    ? <strong key={pIdx} className="text-lumina-teal font-black">{part}</strong> 
                                    : part
                                )}
                              </p>

                              {/* Action Row */}
                              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-black/5">
                                <div className="flex items-center gap-2">
                                  {/* Color Coded Badge */}
                                  <div 
                                    onClick={() => toggleFidelityLogs(idx, activeTab)}
                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border cursor-pointer hover:opacity-90 select-none ${badgeInfo.color}`}
                                  >
                                    <BadgeIcon size={12} />
                                    <span className="text-[9px] font-black uppercase tracking-wider">{badgeInfo.label}</span>
                                    <HelpCircle size={10} className="opacity-60" />
                                  </div>
                                </div>

                                <button
                                  onClick={() => copyToClipboard(activeBullet, idx, activeTab)}
                                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted border hover:bg-black/5 hover:border-black/10 active:scale-95 transition-all"
                                >
                                  {copiedIndex === logKey ? (
                                    <>
                                      <Check size={12} className="text-accent-emerald" />
                                      <span className="text-[9px] font-black uppercase text-accent-emerald tracking-wider">Copied</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy size={12} className="text-muted-foreground/60" />
                                      <span className="text-[9px] font-black uppercase text-muted-foreground/80 tracking-wider">Copy Bullet</span>
                                    </>
                                  )}
                                </button>
                              </div>

                              {/* Expanded Fidelity Logs */}
                              <AnimatePresence>
                                {isLogOpen && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="p-4 rounded-xl bg-slate-50 border border-black/5 space-y-2 mt-2"
                                  >
                                    <h5 className="text-[10px] font-black uppercase tracking-wider text-foreground/70">
                                      Guardrail Audit Logs
                                    </h5>
                                    <div className="space-y-1">
                                      <div className="text-[10px] font-semibold text-muted-foreground">
                                        Fidelity Score: <span className="font-black text-foreground">{rb.validation_results[activeTab].score}%</span>
                                      </div>
                                      <p className="text-[11px] text-muted-foreground">
                                        {badgeInfo.desc}
                                      </p>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

            {/* Unmapped requirements */}
            {pipelineResult.unmapped_requirements.length > 0 && (
              <div className="p-6 rounded-3xl bg-amber-500/[0.02] border border-amber-500/10 space-y-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="text-amber-500" size={18} />
                  <h4 className="text-xs font-black uppercase tracking-widest text-[#1E2A3A]">
                    Gap Mitigation Suggestions
                  </h4>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {pipelineResult.unmapped_requirements.map((ur, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-white border border-amber-500/10 space-y-1">
                      <span className="text-[9px] font-black uppercase tracking-wider text-amber-500">
                        Unmapped Requirement: {ur.requirement}
                      </span>
                      <p className="text-xs text-muted-foreground leading-normal font-semibold">
                        {ur.suggestion}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ── INITIAL OR FALLBACK DISPLAY ── */}
        {!isCalibrating && !pipelineResult && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* Calibration Banner */}
            <div className="p-6 rounded-3xl bg-lumina-teal/[0.03] border border-lumina-teal/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1 max-w-md">
                <h4 className="text-xs font-black uppercase tracking-widest text-[#1E2A3A]">
                  Align with STAR Framework
                </h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Extract resume facts and map them to job requirements in three consecutive stages: ingest mapping, synthesize variants, and audit hallucinations.
                </p>
              </div>
              <button
                onClick={handleCalibrate}
                disabled={isParsingResume}
                className="group flex items-center justify-center gap-3 px-6 py-3.5 rounded-2xl bg-lumina-teal text-white text-[11px] font-black uppercase tracking-wider hover:scale-105 active:scale-95 transition-all shadow-lg shadow-teal-500/20 shrink-0"
              >
                {isParsingResume ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Sparkles size={14} className="animate-pulse" />
                )}
                Calibrate Achievements
              </button>
            </div>

            {/* Resume Upload Panel */}
            <div className="glass-panel p-6 rounded-3xl bg-slate-50/50 border border-black/[0.04] space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#1E2A3A]">
                  Candidate Data Ground Truth
                </span>
                {localResumeText ? (
                  <span className="text-[9px] font-black uppercase tracking-wider text-accent-emerald bg-accent-emerald/10 px-2 py-0.5 rounded border border-accent-emerald/20 flex items-center gap-1">
                    <CheckCircle2 size={10} /> Active Resume Loaded
                  </span>
                ) : (
                  <span className="text-[9px] font-black uppercase tracking-wider text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                    No Resume Loaded
                  </span>
                )}
              </div>

              {localResumeText ? (
                <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-black/5">
                  <div className="flex items-center gap-3">
                    <FileText className="text-lumina-teal" size={18} />
                    <div>
                      <p className="text-xs font-bold text-foreground">Active Resume</p>
                      <p className="text-[10px] text-muted-foreground">{localResumeText.length} characters loaded</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsTextInputOpen(!isTextInputOpen)}
                      className="px-3 py-1.5 rounded-xl bg-muted border text-[9px] font-black uppercase text-muted-foreground hover:bg-black/5 active:scale-95 transition-all"
                    >
                      {isTextInputOpen ? "Hide Text Editor" : "View/Edit Resume"}
                    </button>
                    <button
                      onClick={() => {
                        setLocalResumeText("");
                        setIsTextInputOpen(false);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[9px] font-black uppercase text-rose-500 hover:bg-rose-500/20 active:scale-95 transition-all"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              ) : (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-black/10 hover:border-lumina-teal/40 rounded-2xl p-8 text-center bg-white cursor-pointer hover:bg-lumina-teal/[0.01] transition-all group/upload"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".pdf,.docx"
                    className="hidden"
                  />
                  <CloudUpload className="mx-auto text-muted-foreground group-hover/upload:text-lumina-teal group-hover/upload:scale-110 transition-all mb-3" size={32} />
                  <p className="text-xs font-bold text-foreground">Upload your resume to synchronize facts</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Supports PDF and DOCX files. Parses text on-device.</p>
                  <div className="mt-4 flex justify-center">
                    <span className="text-[9px] font-black uppercase tracking-wider text-lumina-teal bg-lumina-teal/10 px-3 py-1.5 rounded-xl border border-lumina-teal/20 group-hover/upload:bg-lumina-teal group-hover/upload:text-white transition-all">
                      Browse Files
                    </span>
                  </div>
                </div>
              )}

              {/* Text Input Panel */}
              <AnimatePresence>
                {(isTextInputOpen || !localResumeText) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2"
                  >
                    <textarea
                      placeholder="Paste your raw resume text here to analyze and calibrate against role requirements..."
                      value={localResumeText}
                      onChange={(e) => setLocalResumeText(e.target.value)}
                      rows={8}
                      className="w-full text-xs font-semibold p-4 rounded-2xl border border-black/10 focus:border-lumina-teal focus:ring-1 focus:ring-lumina-teal bg-white"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Static Initial Bullets list */}
            {bullets && bullets.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-black/5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                    Initial Draft Suggestions (Uncalibrated)
                  </span>
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border text-[9px] font-black uppercase text-muted-foreground tracking-widest">
                    <MousePointer2 size={10} className="text-primary/40" />
                    <span>Click to Copy</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {bullets.map((bullet, i) => (
                    <motion.div 
                      key={i}
                      whileHover={{ x: 6 }}
                      onClick={() => copyToClipboard(bullet, i, "static")}
                      className="group/item relative p-5 rounded-2xl bg-slate-50 border border-black/[0.04] hover:border-lumina-teal/30 hover:bg-slate-50/80 transition-all cursor-pointer overflow-hidden"
                    >
                      <div className="flex gap-4 items-start">
                        <div className="flex-shrink-0 w-6 h-6 rounded-lg bg-lumina-teal/10 flex items-center justify-center text-lumina-teal text-[10px] font-black group-hover/item:bg-lumina-teal group-hover/item:text-white transition-all">
                          {i + 1}
                        </div>
                        <p className="text-[13px] font-medium text-foreground/80 leading-relaxed group-hover/item:text-foreground transition-colors flex-1">
                          {bullet.split('**').map((part, idx) => idx % 2 === 1 ? <strong key={idx} className="text-lumina-teal font-black">{part}</strong> : part)}
                        </p>
                        <div className="ml-4 opacity-0 group-hover/item:opacity-100 transition-opacity">
                          {copiedIndex === `${i}-static` ? (
                            <Check size={14} className="text-accent-emerald" />
                          ) : (
                            <Copy size={14} className="text-muted-foreground/40 hover:text-lumina-teal transition-colors" />
                          )}
                        </div>
                      </div>
                      {/* Copy indicator */}
                      <AnimatePresence>
                        {copiedIndex === `${i}-static` && (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-accent-emerald/[0.04] flex items-center justify-center backdrop-blur-[1px]"
                          >
                            <span className="text-[9px] font-black uppercase tracking-widest text-accent-emerald bg-white px-3 py-1 rounded-full border border-accent-emerald/20 shadow-sm">
                              Copied to Clipboard
                            </span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tip footer */}
      <div className="flex items-center gap-4 p-5 rounded-2xl bg-white border border-black/5 relative z-10">
        <div className="p-2 rounded-lg bg-lumina-teal/10 text-lumina-teal">
          <Target size={14} />
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          <span className="font-black uppercase text-[9px] tracking-widest mr-2 text-lumina-teal">Pro Tip:</span>
          Calibrating achievements produces three hyper-customized variants targeting different aspects of the requirement. Always choose the one that aligns best with your actual work details.
        </p>
      </div>
    </div>
  );
};

// Simple cloud upload icon since lucide-react doesn't always have it
const CloudUpload = (props: React.SVGProps<SVGSVGElement>) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={props.size || "24"} 
    height={props.size || "24"} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={props.className}
  >
    <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
    <path d="M12 12v9" />
    <path d="m16 16-4-4-4 4" />
  </svg>
);
