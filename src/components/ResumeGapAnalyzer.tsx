import { useState, useRef, useEffect, useCallback } from "react";
// Important: Use static import with ?url so Vite bundler properly packages the worker file for Vercel
import pdfWorkerUrl from "pdfjs-dist/legacy/build/pdf.worker.mjs?url";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Loader2, ArrowRight, Upload, PlusCircle as PlusCircleIcon, AlertTriangle, CheckCircle2, XCircle, Sparkles, Copy, ShieldCheck, Edit3, Trash2, Plus, Download, BarChart3, Zap, TrendingUp, CloudUpload, MessageSquare, Trophy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { saveApplication, type TrackedApplication } from "@/hooks/useApplications";
import type { Skill, ResumeGapResult, ResumeDeduction } from "@/types/jd";
import { computeDeterministicScore } from "@/lib/deterministicScorer";
import { clearResumeAnalysisCache } from "@/lib/resumeAnalysisCache";
import { MatchHero } from "./gap-analysis/MatchHero";
import { ComparisonMatrix } from "./gap-analysis/ComparisonMatrix";
import { GapRecommendations } from "./gap-analysis/GapRecommendations";
import { GapAnalyzerSkeleton } from "./gap-analysis/GapAnalyzerSkeleton";
import jsPDF from "jspdf";

interface ResumeGapAnalyzerProps {
  skills: Skill[];
  jobTitle?: string;
  jdText?: string;
  onResumeTextChange?: (text: string) => void;
  onResultChange?: (result: ResumeGapResult | null) => void;
  onNavigateToGenerator?: () => void;
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

export const ResumeGapAnalyzer = ({ skills, jobTitle, jdText, onResumeTextChange, onResultChange, onNavigateToGenerator }: ResumeGapAnalyzerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [resumeText, setResumeText] = useState("");
  const [fileName, setFileName] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [result, setResult] = useState<ResumeGapResult | null>(null);
  const [addedToTracker, setAddedToTracker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [generatingFor, setGeneratingFor] = useState<number | null>(null);
  const [generatedBullets, setGeneratedBullets] = useState<Record<number, string>>({});
  const [isAutoRunEnabled, setIsAutoRunEnabled] = useState(true);
  const [lastAnalyzedText, setLastAnalyzedText] = useState("");
  const [showReplaceDialog, setShowReplaceDialog] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  // ── Multi-Resume Battle: upload up to 5, Lumina picks best ATS match ──
  interface ResumeCandidate {
    id: string;
    name: string;
    text: string;
    score: number;
  }
  const MAX_CANDIDATES = 5;
  const [candidates, setCandidates] = useState<ResumeCandidate[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);

  // ── Always start empty: clear any stale cache on mount ──
  useEffect(() => {
    clearResumeAnalysisCache();
    setResumeText("");
    setFileName("");
    setResult(null);
    setLastAnalyzedText("");
    setCandidates([]);
    setSelectedCandidateId(null);
  }, []);

  const handleExportPDF = async () => {
    if (!result) return;
    try {
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 18;
      const maxWidth = pageWidth - margin * 2;
      let y = margin;

      const ensureSpace = (need: number) => {
        if (y + need > pageHeight - margin) {
          pdf.addPage();
          y = margin;
        }
      };

      const writeWrapped = (text: string, size = 10, bold = false, color: [number, number, number] = [30, 42, 58]) => {
        pdf.setFont("helvetica", bold ? "bold" : "normal");
        pdf.setFontSize(size);
        pdf.setTextColor(color[0], color[1], color[2]);
        const lines = pdf.splitTextToSize(text, maxWidth);
        for (const line of lines) {
          ensureSpace(size * 0.45 + 2);
          pdf.text(line, margin, y);
          y += size * 0.45 + 2;
        }
      };

      // ── Header band ──
      pdf.setFillColor(16, 185, 129);
      pdf.rect(0, 0, pageWidth, 4, "F");
      y = margin;
      writeWrapped("Lumina Resume Intelligence Report", 20, true, [16, 185, 129]);
      writeWrapped(
        `${jobTitle || "Target Role"} — Generated ${new Date().toLocaleString()}`,
        9,
        false,
        [120, 120, 120]
      );
      if (fileName) writeWrapped(`Source resume: ${fileName}`, 9, false, [120, 120, 120]);
      y += 4;

      // ── Headline score ──
      pdf.setDrawColor(230, 230, 230);
      pdf.setFillColor(245, 250, 247);
      ensureSpace(28);
      pdf.roundedRect(margin, y, maxWidth, 24, 4, 4, "FD");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(28);
      pdf.setTextColor(16, 185, 129);
      pdf.text(`${result.overall_match}%`, margin + 6, y + 17);
      pdf.setFontSize(10);
      pdf.setTextColor(60, 60, 60);
      pdf.text("Overall ATS / JD Match Score", margin + 40, y + 11);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(110, 110, 110);
      pdf.text(
        `Top-scored resume out of ${candidates.length || 1} uploaded`,
        margin + 40,
        y + 17
      );
      y += 30;

      // ── Executive summary ──
      writeWrapped("Executive Summary", 13, true);
      y += 1;
      writeWrapped(result.summary || "—", 10);
      y += 4;

      // ── Skill signatures ──
      const sm = result.skill_matches || [];
      if (sm.length) {
        writeWrapped("Skill Signature Breakdown", 13, true);
        y += 1;
        sm.forEach((s) => {
          const verdictLabel = s.verdict === "strong" ? "STRONG" : s.verdict === "partial" ? "PARTIAL" : "MISSING";
          const color: [number, number, number] =
            s.verdict === "strong" ? [16, 185, 129] : s.verdict === "partial" ? [217, 119, 6] : [220, 38, 38];
          writeWrapped(`• ${s.skill} — ${s.match_percent}% [${verdictLabel}]`, 10, true, color);
          if (s.note) writeWrapped(`   ${s.note}`, 9, false, [90, 90, 90]);
        });
        y += 4;
      }

      // ── Identified gaps ──
      const ds = result.deductions || [];
      if (ds.length) {
        writeWrapped("Identified Gaps & Score Impact", 13, true);
        y += 1;
        ds.forEach((d) => {
          writeWrapped(`• ${d.reason}  (-${d.percent}%)`, 10, true, [220, 38, 38]);
          if (d.fix_snippet) writeWrapped(`   Suggested rewrite: ${d.fix_snippet}`, 9, false, [60, 60, 60]);
        });
        y += 4;
      }

      // ── Tactical recommendations ──
      const dirs = result.actionable_directives || [];
      if (dirs.length) {
        writeWrapped("Tactical Recommendations", 13, true);
        y += 1;
        dirs.forEach((d, i) => {
          writeWrapped(`${i + 1}. ${d.action}`, 11, true, [16, 185, 129]);
          writeWrapped(`   ${d.description}`, 10);
        });
      }

      // ── Footer on every page ──
      const total = pdf.getNumberOfPages();
      for (let p = 1; p <= total; p++) {
        pdf.setPage(p);
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(
          `Lumina Intelligence • Page ${p}/${total} • Confidential`,
          pageWidth / 2,
          pageHeight - 8,
          { align: "center" }
        );
      }

      pdf.save(`Lumina-Resume-Intelligence-${Date.now()}.pdf`);
      toast.success("Detailed report downloaded");
    } catch (e) {
      console.error(e);
      toast.error("Failed to generate PDF");
    }
  };


  const handleGenerateBullet = async (index: number, reason: string) => {
    setGeneratingFor(index);
    try {
      const { data, error } = await supabase.functions.invoke("generate-bullet", {
        body: { gapReason: reason, resumeContext: resumeText, jobTitle },
      });
      if (error) throw error;
      setGeneratedBullets(prev => ({ ...prev, [index]: data.bullet }));
    } catch (err) {
      setGeneratedBullets(prev => ({ ...prev, [index]: "Focus on project delivery and measurable outcomes in this domain." }));
    } finally {
      setGeneratingFor(null);
    }
  };

  const handleCopyBullet = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const extractFileText = async (file: File): Promise<string> => {
    const ext = file.name.toLowerCase().split(".").pop();
    if (ext === "pdf") return extractPdfText(file);
    if (ext === "docx") return extractDocxText(file);
    return file.text();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    e.target.value = "";

    const availableSlots = MAX_CANDIDATES - candidates.length;
    if (availableSlots <= 0) {
      toast.error(`You can upload up to ${MAX_CANDIDATES} resumes. Remove one to add another.`);
      return;
    }
    const toProcess = files.slice(0, availableSlots);
    if (files.length > availableSlots) {
      toast.info(`Only the first ${availableSlots} of ${files.length} files were added (limit ${MAX_CANDIDATES}).`);
    }

    setIsParsing(true);
    setIsOpen(true);
    const newCandidates: ResumeCandidate[] = [];
    for (const file of toProcess) {
      try {
        const text = await extractFileText(file);
        if (text.trim().length < 20) {
          toast.error(`${file.name}: content too short.`);
          continue;
        }
        const det = computeDeterministicScore(text.trim(), skills);
        newCandidates.push({
          id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          name: file.name,
          text: text.trim(),
          score: det.overall_match,
        });
      } catch {
        toast.error(`Failed to parse ${file.name}`);
      }
    }
    setIsParsing(false);

    if (!newCandidates.length) return;

    const merged = [...candidates, ...newCandidates].sort((a, b) => b.score - a.score);
    setCandidates(merged);
    const winner = merged[0];
    setSelectedCandidateId(winner.id);
    setResumeText(winner.text);
    setFileName(winner.name);
    setResult(null);
    toast.success(
      newCandidates.length === 1
        ? `Added "${newCandidates[0].name}" (${newCandidates[0].score}% ATS)`
        : `Lumina picked "${winner.name}" — top ATS match (${winner.score}%) of ${merged.length} resumes`
    );
  };

  const selectCandidate = (id: string) => {
    if (id !== selectedCandidateId) {
      toast.info("Analysis is locked to the top ATS-scoring resume. Remove it to promote another.");
    }
  };



  const removeCandidate = (id: string) => {
    const remaining = candidates.filter((c) => c.id !== id);
    setCandidates(remaining);
    if (selectedCandidateId === id) {
      const next = remaining[0];
      if (next) {
        setSelectedCandidateId(next.id);
        setResumeText(next.text);
        setFileName(next.name);
      } else {
        setSelectedCandidateId(null);
        setResumeText("");
        setFileName("");
      }
      setResult(null);
    }
  };

  const isComparingRef = useRef(false);

  const handleCompare = useCallback(async () => {
    const trimmedResume = (resumeText || "").trim();
    if (trimmedResume.length < 20) return;
    if (isComparingRef.current) return;

    isComparingRef.current = true;
    setIsAnalyzing(true);
    setResult(null);
    try {
      // 2. Run Deterministic Keyword Base
      const deterministicResult = computeDeterministicScore(trimmedResume, skills);
      const baseResult: ResumeGapResult = {
        overall_match: deterministicResult.overall_match,
        skill_matches: (deterministicResult.skill_matches || []).map(sm => ({
            skill: sm.skill,
            match_percent: sm.match_percent,
            verdict: sm.verdict,
            note: sm.note
        })),
        deductions: (deterministicResult.deductions || []).map(d => ({
            reason: d.reason,
            percent: d.percent
        })),
        summary: `Match identified at ${deterministicResult.overall_match}%. Reviewing specific capability tokens now.`
      };

      setResult(baseResult);
      setIsOpen(true);

      let aiResult: Partial<ResumeGapResult> | null = null;
      try {
        console.log(`Deep Scan: Invoking compare-resume intelligence...`);
        const { data, error: invokeError } = await supabase.functions.invoke("compare-resume", {
          body: { 
            jdSkills: skills, 
            resumeText: trimmedResume,
            jobTitle 
          },
        });

        if (invokeError) throw invokeError;
        
        if (data && !data.error) {
          aiResult = data;
          console.log(`Deep Scan: Intelligence Scored Successfully via Groq.`);
        } else if (data?.error) {
          throw new Error(data.error);
        }
      } catch (err) {
        console.warn("AI Deep Scan encountered a non-critical limit:", err);
        toast.info("AI Analysis limited. Using high-precision deterministic scoring.");
      }
 
      // Scoring Logic: Blend AI score with Deterministic score for a "Live" but grounded result
      // We give AI 70% weight for semantic nuance, and Deterministic 30% for hard keyword matching.
      const aiScore = (aiResult && typeof aiResult.overall_match === 'number') ? aiResult.overall_match : baseResult.overall_match;
      const finalOverallMatch = Math.round((baseResult.overall_match * 0.3) + (aiScore * 0.7));

      const final: ResumeGapResult = aiResult ? {
        ...baseResult,
        overall_match: finalOverallMatch,
        summary: aiResult.summary || baseResult.summary,
        deductions: (baseResult.deductions || []).map(d => {
            const safeAiDeductions = Array.isArray(aiResult?.deductions) ? aiResult.deductions : [];
            const aiD = safeAiDeductions.find((ad: { reason: string; fix_snippet?: string }) => ad.reason?.includes(d.reason));
            return aiD?.fix_snippet ? { ...d, fix_snippet: aiD.fix_snippet } : d;
        }),
        tailored_resume_snippets: Array.isArray(aiResult.tailored_resume_snippets) ? aiResult.tailored_resume_snippets : [],
        actionable_directives: Array.isArray(aiResult.actionable_directives) ? aiResult.actionable_directives : []
      } : baseResult;

      setResult(final);
      setLastAnalyzedText(trimmedResume);
      toast.success("Intelligence Scan Complete");
    } catch (err) {
      toast.error("Analysis failed. Showing static scores.");
    } finally {
      isComparingRef.current = false;
      setIsAnalyzing(false);
    }
  }, [resumeText, skills, jobTitle]);


  const handleCompareRef = useRef(handleCompare);
  handleCompareRef.current = handleCompare;

  useEffect(() => {
    if (isAutoRunEnabled && resumeText && resumeText !== lastAnalyzedText && !isAnalyzing && !isParsing) {
      handleCompareRef.current();
    }
  }, [resumeText, isAutoRunEnabled, lastAnalyzedText, isAnalyzing, isParsing]);

  const handleAddToTracker = async () => {
    if (!result) return;
    const company = prompt("Company?");
    if (!company) return;
    await saveApplication({
        id: crypto.randomUUID(),
        company,
        role: jobTitle || "Unknown",
        matchPercent: result.overall_match,
        currentMatchPercent: result.overall_match,
        status: "Applied",
        addedAt: new Date().toISOString()
    });
    setAddedToTracker(true);
    window.dispatchEvent(new Event("tracker-updated"));
    toast.success("Tracked!");
  };

  const getVerdictIcon = (v: string) => {
    if (v === "strong") return <CheckCircle2 className="w-4 h-4 text-accent-emerald" />;
    return <AlertTriangle className="w-4 h-4 text-accent-amber" />;
  };

  const renderResults = () => {
    if (!result) return null;
    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="grid grid-cols-1 md:grid-cols-[120px,1fr] gap-4">
            <div className="premium-card p-4 flex flex-col items-center justify-center text-center">
                <span className="text-4xl font-black text-foreground">{result.overall_match}%</span>
                <span className="text-[12px] font-black uppercase text-accent-emerald tracking-widest mt-1 block">Match</span>
            </div>
            <div className="premium-card p-4 flex items-center">
                <p className="text-sm font-medium text-foreground/80 leading-relaxed italic pl-4">
                    "{result.summary}"
                </p>
            </div>
        </div>

        {result.deductions && result.deductions.length > 0 && (
          <div className="premium-card p-6 border-red-500/10 bg-red-500/[0.02]">
            <h4 className="text-xs font-bold mb-4 flex items-center gap-2 uppercase tracking-widest text-accent-red">
                <Zap className="w-4 h-4" /> Gap Analysis
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {result.deductions.map((d, i) => (
                    <div key={i} className="p-5 rounded-[2rem] bg-white border border-border/40 flex items-start justify-between gap-4 shadow-sm hover:shadow-md transition-all">
                        <div>
                            <span className="text-xs font-bold text-foreground block mb-1">{d.reason}</span>
                            <span className="text-[9px] text-accent-red font-bold px-2 py-0.5 rounded bg-accent-red/10 border border-accent-red/20">-{d.percent} Impact</span>
                        </div>
                        {d.fix_snippet && <button onClick={() => handleCopyBullet(d.fix_snippet!)} className="p-2 rounded-lg bg-accent-blue/10 text-accent-blue hover:bg-accent-blue/20 transition-all shrink-0"><Copy className="w-3.5 h-3.5" /></button>}
                    </div>
                ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="premium-card p-6 border-zinc-100">
                <h4 className="font-bold mb-4 uppercase tracking-widest text-[9px] text-muted-foreground flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 opacity-50" /> Skill Signatures
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(result.skill_matches || []).slice(0, 10).map((sm, i) => (
                        <div key={i} className="flex items-center justify-between p-3.5 rounded-[1.5rem] bg-slate-50/50 border border-border/20">
                            <div className="flex items-center gap-2 overflow-hidden">
                                {getVerdictIcon(sm.verdict)}
                                <span className="text-xs font-medium truncate">{sm.skill}</span>
                            </div>
                            <span className="text-[10px] font-bold text-muted-foreground">{sm.match_percent}%</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="premium-card p-6 bg-accent-emerald/[0.02] border-accent-emerald/10">
                <h4 className="font-bold mb-4 uppercase tracking-[0.15em] text-[9px] text-accent-emerald flex items-center gap-2">
                    <TrendingUp className="w-3.5 h-3.5" /> Action Roadmap
                </h4>
                <div className="space-y-3">
                    {(result.actionable_directives?.length ? result.actionable_directives : [
                        { action: "Optimize", description: "Quantify your achievements in core skill areas." },
                        { action: "Inject", description: "Integrate JD keyword tokens into your professional summary." }
                    ]).map((d, i) => (
                        <div key={i} className="flex gap-4 items-start p-5 rounded-[2rem] bg-white border border-border/10 shadow-sm">
                            <div className="w-6 h-6 rounded flex-shrink-0 bg-accent-blue/10 flex items-center justify-center text-[10px] font-black text-accent-blue">{i+1}</div>
                            <div>
                                <span className="text-[10px] font-black uppercase text-foreground block mb-0.5">{d.action}</span>
                                <p className="text-xs text-muted-foreground leading-relaxed font-medium">{d.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </div>
    );
  };

  return (
    <div className="glass-panel p-6 lg:p-10 relative overflow-hidden">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-10 mb-16 relative z-10">
        <div className="flex items-center gap-10">
          <div className="w-24 h-24 rounded-[2.5rem] bg-foreground/5 flex items-center justify-center border border-white/10 group-hover:rotate-6 transition-transform duration-700">
            <FileText className="w-12 h-12 text-primary/40" />
          </div>
          <div>
            <h3 className="font-serif italic text-5xl text-foreground tracking-tighter">Resume Intelligence</h3>
            <p className="text-[10px] uppercase tracking-[0.5em] font-black text-muted-foreground/40 mt-3">High-Fidelity Semantic Cross-Reference</p>
          </div>
        </div>
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="px-12 py-6 rounded-full bg-accent-emerald text-white text-[12px] font-black uppercase tracking-[0.3em] hover:scale-110 transition-all active:scale-95 shadow-2xl shadow-accent-emerald/20 group"
          >
            Launch Diagnostic Scan <ArrowRight className="inline-block ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} 
            animate={{ height: "auto", opacity: 1 }} 
            exit={{ height: 0, opacity: 0 }} 
            className="overflow-hidden space-y-12"
          >
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-6">
                <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`md:col-span-8 h-72 border-2 border-dashed rounded-[3rem] flex flex-col items-center justify-center gap-6 transition-all duration-700 cursor-pointer group/upload relative overflow-hidden ${
                        isParsing ? "bg-primary/5 border-primary/40 animate-pulse" : "border-white/10 hover:border-primary/40 hover:bg-primary/[0.02]"
                    }`}
                >
                    <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover/upload:opacity-100 transition-opacity duration-700" />
                    {isParsing ? <Loader2 className="w-16 h-16 text-primary animate-spin" /> : <CloudUpload className="w-16 h-16 text-muted-foreground/20 group-hover/upload:text-primary/40 transition-colors" />}
                    <div className="text-center relative z-10">
                        <p className="text-xl font-display font-bold text-foreground/90">{fileName || "Inject Resume Signal"}</p>
                        <p className="text-xs text-muted-foreground mt-2 font-medium tracking-wide">
                          Upload 1 to {MAX_CANDIDATES} resumes (PDF/DOCX). Lumina ranks ATS fit and locks analysis to the top one.
                        </p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1 font-medium">
                          {candidates.length} / {MAX_CANDIDATES} resumes loaded
                        </p>
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".pdf,.docx" multiple className="hidden" />
                </div>

                {candidates.length > 0 && (
                  <div className="md:col-span-12 -mt-4">
                    <div className="p-6 rounded-[2rem] bg-slate-50/50 border border-border/10 space-y-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Trophy className="w-4 h-4 text-accent-emerald" />
                        <span className="text-[11px] font-black uppercase tracking-widest text-foreground/70">
                          Resume Battle — Lumina's Pick Highlighted
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {candidates.map((c, idx) => {
                          const isWinner = idx === 0;
                          const isSelected = c.id === selectedCandidateId;
                          return (
                            <div
                              key={c.id}
                              onClick={() => selectCandidate(c.id)}
                              className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between gap-2 ${
                                isSelected
                                  ? "border-accent-emerald bg-accent-emerald/5 shadow-sm"
                                  : "border-border/30 bg-white hover:border-accent-emerald/40"
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  {isWinner && <Trophy className="w-3 h-3 text-accent-emerald shrink-0" />}
                                  <span className="text-[11px] font-bold text-foreground truncate">{c.name}</span>
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                  {c.score}% ATS match
                                </span>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeCandidate(c.id);
                                }}
                                className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center shrink-0"
                                title="Remove"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                <div className="md:col-span-4 space-y-6">
                    <div className="p-8 rounded-[2.5rem] bg-slate-50/50 border border-border/10 space-y-4">
                        <div className="flex items-center gap-3">
                            <ShieldCheck className="w-5 h-5 text-accent-emerald" />
                            <span className="text-xs font-black uppercase tracking-widest text-foreground/70">Secure Buffer</span>
                        </div>
                        <p className="text-[13px] text-muted-foreground leading-relaxed font-medium">Intelligence processing is strictly localized and non-custodial.</p>
                    </div>
                    <div className="flex items-center gap-4 px-8 py-5 rounded-[2.5rem] bg-slate-50/50 border border-border/10 hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setIsAutoRunEnabled(!isAutoRunEnabled)}>
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${isAutoRunEnabled ? 'bg-accent-emerald border-accent-emerald' : 'border-border'}`}>
                            {isAutoRunEnabled && <CheckCircle2 className="w-3.5 h-3.5 text-background" />}
                        </div>
                        <span className="text-xs font-black uppercase tracking-widest text-foreground/80">Auto-Run Diagnostic</span>
                    </div>
                </div>
            </div>

            <div className="relative group">
              <div className="absolute inset-0 bg-primary/5 rounded-[3rem] opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
              <textarea
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  placeholder="Paste raw intent here for a deep-tissue semantic scan..."
                  className="w-full h-48 bg-slate-50 border border-border/40 rounded-[3rem] p-10 text-[15px] outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all resize-none relative z-10 font-medium placeholder:text-muted-foreground/30"
              />
            </div>

            {isAnalyzing && (
              <div className="mt-12">
                <GapAnalyzerSkeleton />
              </div>
            )}

            {!isAnalyzing && result && (
              <div className="space-y-16 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                <MatchHero score={result.overall_match} summary={result.summary} />

                <div className="space-y-12">
                  <ComparisonMatrix 
                    items={(result.skill_matches || []).map(sm => ({
                      skill: sm.skill,
                      required: true, // Assuming all skills in result are high-priority
                      present: sm.match_percent > 50,
                      evidence: sm.note
                    }))}
                  />

                  <GapRecommendations 
                    recommendations={(result.actionable_directives || []).map(d => ({
                      title: d.action,
                      description: d.description,
                      type: "strategy" as const
                    }))}
                    onApply={() => {
                      if (onNavigateToGenerator) {
                        onNavigateToGenerator();
                      } else {
                        toast.info("Open the Resume Generator tab to apply this recommendation.");
                      }
                    }}
                  />
                </div>

                {/* ── FINAL ACTIONS ── */}
                <div className="mt-20 flex flex-col items-center gap-6">
                  <button
                    onClick={handleExportPDF}
                    className="px-14 py-6 rounded-full bg-[#10B981] text-white font-black uppercase tracking-[0.3em] text-[13px] hover:scale-105 active:scale-95 transition-all flex items-center gap-4 shadow-2xl shadow-[#10B981]/30"
                  >
                    <Download className="w-5 h-5" />
                    Download Detailed Report (PDF)
                  </button>
                  <p className="text-[11px] text-muted-foreground/70 font-medium tracking-wide text-center max-w-md">
                    Full breakdown: skill signatures, score deductions, and tactical recommendations for the top-scored resume.
                  </p>
                </div>

              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
