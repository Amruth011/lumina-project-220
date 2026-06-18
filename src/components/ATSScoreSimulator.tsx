import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShieldCheck, 
  ShieldX, 
  ChevronRight, 
  AlertTriangle, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Wrench, 
  Mail, 
  Phone, 
  Table, 
  Layers, 
  AlertOctagon, 
  ArrowRight,
  BookOpen,
  HelpCircle
} from "lucide-react";
import type { ResumeGapResult } from "@/types/jd";
import { validateResumeForATS } from "@/lib/atsValidator";
import type { ATSValidationReport, ATSParsingRisk, ATSFormattingIssue } from "@/types/atsValidator";

interface ATSScoreSimulatorProps {
  result: ResumeGapResult;
  resumeText?: string;
  jdText?: string;
}

export const ATSScoreSimulator = ({ result, resumeText, jdText }: ATSScoreSimulatorProps) => {
  const [report, setReport] = useState<ATSValidationReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "risks" | "repairs">("overview");
  const [expandedFixIndex, setExpandedFixIndex] = useState<number | null>(null);

  // Fallback / Initial Calculation from legacy result object
  const legacyReport = useMemo(() => {
    const strongCount = (result.skill_matches ?? []).filter(s => s.verdict === "strong").length;
    const totalCount = (result.skill_matches ?? []).length;
    const keywordRate = totalCount > 0 ? Math.round((strongCount / totalCount) * 100) : 0;

    const hasSnippets = !!result.tailored_resume_snippets;
    const hasDirectives = !!result.actionable_directives?.length;
    const sectionScore = Math.round(
      (result.overall_match * 0.5) + (keywordRate * 0.3) + ((hasSnippets ? 10 : 0) + (hasDirectives ? 10 : 0))
    );

    const formattingScore = 100;
    const overallScore = Math.round(
      (result.overall_match * 0.7) + (keywordRate * 0.3)
    );

    const pass = overallScore >= 65;

    const reasons: string[] = [];
    const tips: string[] = [];

    if (keywordRate < 60) {
      reasons.push("Low keyword match rate — ATS likely won't surface this resume");
      tips.push("Add missing technical keywords from the JD to your Skills section");
    }
    if (result.overall_match < 60) {
      reasons.push("Overall match score below ATS threshold");
      tips.push("Use the Actionable Directives to rewrite experience bullets with JD language");
    }
    if (result.deductions?.length > 3) {
      reasons.push(`${result.deductions.length} skill gaps detected — too many for most ATS filters`);
      tips.push("Focus on the top 3 highest-percentage deductions first");
    }
    if (pass && reasons.length === 0) {
      reasons.push("Resume meets minimum ATS screening criteria");
    }
    if (!pass) {
      tips.push("Use 'Generate ATS Resume' to auto-rewrite your resume with exact JD keywords");
    }

    return {
      pass,
      score: overallScore,
      keyword_match_rate: keywordRate,
      section_completeness: sectionScore,
      formatting_score: formattingScore,
      reasons,
      tips,
      parsing_risks: [] as ATSParsingRisk[],
      formatting_issues: [] as ATSFormattingIssue[],
      actionable_fixes: (result.actionable_directives || []).map(ad => ({
        area: "General Optimization",
        suggestion: ad.description
      }))
    } as ATSValidationReport;
  }, [result]);

  const handleScan = async (forceRefresh = false) => {
    if (!resumeText || !jdText) return;
    setLoading(true);
    try {
      const skills = (result.skill_matches || []).map(sm => ({
        skill: sm.skill,
        category: "Technical",
        importance: sm.match_percent > 0 ? 85 : 45
      }));
      const res = await validateResumeForATS(resumeText, jdText, skills, { forceRefresh });
      setReport(res);
    } catch (err) {
      console.error("ATS Audit call failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleScan(false);
  }, [resumeText, jdText, result.skill_matches]);

  const activeReport = report || legacyReport;
  const isEnhancedScan = !!report;

  const getSeverityBadgeColor = (severity: string) => {
    switch (severity) {
      case "critical":
      case "high":
        return "bg-accent-red/10 text-accent-red border-accent-red/20";
      case "warning":
      case "medium":
        return "bg-accent-amber/10 text-accent-amber border-accent-amber/20";
      default:
        return "bg-accent-blue/10 text-accent-blue border-accent-blue/20";
    }
  };

  const getFormatIcon = (category: string) => {
    switch (category) {
      case "tables":
        return <Table className="w-4 h-4 text-accent-red" />;
      case "layout":
        return <Layers className="w-4 h-4 text-accent-amber" />;
      default:
        return <HelpCircle className="w-4 h-4 text-accent-blue" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className={`rounded-[40px] p-8 md:p-10 premium-card relative overflow-hidden transition-all duration-700 ${
        activeReport.pass
          ? "border-accent-emerald/20 hover:border-accent-emerald/40"
          : "border-accent-red/20 hover:border-accent-red/40"
      }`}
    >
      <div className={`absolute top-0 right-0 p-12 opacity-5 pointer-events-none`}>
        {activeReport.pass ? <ShieldCheck className="w-64 h-64 -rotate-12 text-accent-emerald" /> : <ShieldX className="w-64 h-64 rotate-12 text-accent-red" />}
      </div>

      {/* Header Info */}
      <div className="flex flex-col md:flex-row items-center md:items-end justify-between gap-8 mb-10 relative z-10">
        <div className="flex items-center gap-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, delay: 0.3 }}
            className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-2xl ${
              activeReport.pass ? "bg-accent-emerald/10 border-accent-emerald/20" : "bg-accent-red/10 border-accent-red/20"
            }`}
          >
            {activeReport.pass ? (
              <ShieldCheck className="w-7 h-7 text-accent-emerald" />
            ) : (
              <ShieldX className="w-7 h-7 text-accent-red" />
            )}
          </motion.div>
          <div>
            <h4 className={`text-4xl font-display font-black tracking-tighter leading-none mb-2 ${
              activeReport.pass ? "text-accent-emerald" : "text-accent-red"
            }`}>
              ATS Verdict: {activeReport.pass ? "PASS" : "RISKY"}
            </h4>
            <p className="text-[10px] uppercase tracking-[0.3em] font-black text-muted-foreground/40 flex items-center gap-2">
              Lumina ATS Core Validation 
              {isEnhancedScan && (
                <span className="bg-lumina-teal/10 text-lumina-teal px-2 py-0.5 rounded-full text-[8px] tracking-normal font-bold">
                  Deep Scan Active
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {resumeText && jdText && (
            <button
              onClick={() => handleScan(true)}
              disabled={loading}
              className="p-3.5 rounded-2xl bg-white/5 border border-white/5 text-muted-foreground hover:text-foreground hover:bg-white/10 active:scale-95 transition-all duration-300 disabled:opacity-40"
              title="Force Recalculate Scan"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-lumina-teal" : ""}`} />
            </button>
          )}

          <div className="text-center md:text-right">
            <span className={`text-6xl md:text-8xl font-display font-black tracking-tighter block leading-none mb-1 ${
              activeReport.pass ? "text-accent-emerald" : "text-accent-red"
            }`}>
              {activeReport.score}%
            </span>
            <span className="text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/40 block">Compatibility Match</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5 mb-8 relative z-10 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("overview")}
          className={`pb-4 px-3 text-[13px] font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "overview" 
              ? "border-lumina-teal text-foreground font-black" 
              : "border-transparent text-muted-foreground/50 hover:text-muted-foreground"
          }`}
        >
          Compliance Overview
        </button>
        <button
          onClick={() => setActiveTab("risks")}
          className={`pb-4 px-3 text-[13px] font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            activeTab === "risks" 
              ? "border-lumina-teal text-foreground font-black" 
              : "border-transparent text-muted-foreground/50 hover:text-muted-foreground"
          }`}
        >
          Parsing Risks
          {activeReport.parsing_risks.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-accent-red/15 text-accent-red text-[10px] font-black">
              {activeReport.parsing_risks.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("repairs")}
          className={`pb-4 px-3 text-[13px] font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            activeTab === "repairs" 
              ? "border-lumina-teal text-foreground font-black" 
              : "border-transparent text-muted-foreground/50 hover:text-muted-foreground"
          }`}
        >
          Interactive Repairs
          {activeReport.actionable_fixes.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-lumina-teal/15 text-lumina-teal text-[10px] font-black">
              {activeReport.actionable_fixes.length}
            </span>
          )}
        </button>
      </div>

      {/* Content Area */}
      <div className="relative z-10 min-h-[200px]">
        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4">
            <div className="w-10 h-10 rounded-full border-2 border-lumina-teal/20 border-t-lumina-teal animate-spin" />
            <p className="text-xs uppercase tracking-widest text-muted-foreground/50 font-bold">Auditing Document Safety...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {activeTab === "overview" && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                {/* Score Breakdown Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {[
                    { label: "Keyword Match", value: activeReport.keyword_match_rate },
                    { label: "Section Completeness", value: activeReport.section_completeness },
                    { label: "Formatting Safety", value: activeReport.formatting_score },
                  ].map((metric, i) => (
                    <div key={metric.label} className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/5 text-center shadow-inner group hover:bg-white/10 transition-all duration-500">
                      <motion.span
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 + i * 0.1 }}
                        className={`text-4xl font-display font-black block tracking-tighter leading-none mb-3 ${
                          metric.value >= 75 ? "text-accent-emerald" :
                          metric.value >= 55 ? "text-accent-amber" : "text-accent-red"
                        }`}
                      >
                        {metric.value}%
                      </motion.span>
                      <span className="text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/30 block group-hover:text-muted-foreground/60 transition-colors">
                        {metric.label}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Reasons & Tips */}
                <div className="space-y-4 pl-1">
                  <div className="flex flex-col gap-3">
                    {activeReport.reasons.map((r, i) => (
                      <div key={i} className="flex items-start gap-4 text-sm md:text-base text-foreground/80 font-medium leading-relaxed">
                        <ChevronRight className="w-4 h-4 mt-1.5 text-muted-foreground/40 shrink-0" />
                        <span>{r}</span>
                      </div>
                    ))}
                  </div>
                  {activeReport.tips.map((tip, i) => (
                    <div key={`tip-${i}`} className="flex items-start gap-4 p-5 rounded-2xl bg-accent-amber/5 border border-accent-amber/10 text-sm text-accent-amber/90 font-bold leading-relaxed shadow-sm shadow-accent-amber/5">
                      <AlertTriangle className="w-4 h-4 mt-1 shrink-0 text-accent-amber/60" />
                      <span>{tip}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === "risks" && (
              <motion.div
                key="risks"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {activeReport.parsing_risks.length === 0 && activeReport.formatting_issues.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 bg-accent-emerald/5 border border-accent-emerald/10 rounded-3xl text-center space-y-3">
                    <ShieldCheck className="w-12 h-12 text-accent-emerald" />
                    <h5 className="font-display font-black text-lg text-accent-emerald">Zero ATS Parsing Risks Found</h5>
                    <p className="text-xs text-muted-foreground max-w-sm">Your document layout adheres cleanly to automated applicant screening guidelines.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Critical Risks list */}
                    {activeReport.parsing_risks.length > 0 && (
                      <div className="space-y-3">
                        <h5 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/40">Critical Compliance Audits</h5>
                        {activeReport.parsing_risks.map((risk, idx) => (
                          <div key={idx} className="bg-white/5 border border-white/5 rounded-2xl p-5 flex flex-col md:flex-row md:items-start gap-4">
                            <div className="shrink-0 mt-0.5">
                              <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase border tracking-widest ${getSeverityBadgeColor(risk.severity)}`}>
                                {risk.severity}
                              </span>
                            </div>
                            <div className="space-y-1.5 flex-1">
                              <h6 className="font-display font-black text-base text-foreground leading-none">{risk.risk}</h6>
                              <p className="text-xs text-muted-foreground/80 leading-relaxed font-medium">{risk.description}</p>
                              <div className="pt-2 text-xs font-bold text-lumina-teal flex items-center gap-1">
                                <Wrench className="w-3.5 h-3.5" /> Resolution: {risk.resolution}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Formatting Issues */}
                    {activeReport.formatting_issues.length > 0 && (
                      <div className="space-y-3">
                        <h5 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/40">Layout & Formatting Concerns</h5>
                        {activeReport.formatting_issues.map((issue, idx) => (
                          <div key={idx} className="bg-white/5 border border-white/5 rounded-2xl p-5 flex items-start gap-4">
                            <div className="shrink-0 p-2.5 bg-white/5 rounded-xl border border-white/5">
                              {getFormatIcon(issue.category)}
                            </div>
                            <div className="space-y-1.5 flex-1">
                              <div className="flex items-center justify-between">
                                <h6 className="font-display font-black text-sm text-foreground uppercase tracking-tight capitalize">{issue.category} issue</h6>
                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border tracking-wider ${getSeverityBadgeColor(issue.severity)}`}>
                                  {issue.severity} severity
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground/85 leading-relaxed font-medium">{issue.description}</p>
                              <div className="text-[11px] font-bold text-accent-amber/90 flex items-center gap-1 pt-1">
                                <AlertTriangle className="w-3.5 h-3.5" /> Action: {issue.fix}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "repairs" && (
              <motion.div
                key="repairs"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {activeReport.actionable_fixes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 bg-accent-emerald/5 border border-accent-emerald/10 rounded-3xl text-center space-y-3">
                    <ShieldCheck className="w-12 h-12 text-accent-emerald" />
                    <h5 className="font-display font-black text-lg text-accent-emerald">No Immediate Repairs Required</h5>
                    <p className="text-xs text-muted-foreground">Your content elements and descriptions align beautifully with the job requirement guidelines.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-xs text-muted-foreground/60 font-medium pb-2">
                      Review these targeted modifications. Click any card to preview standard before/after recommendations.
                    </p>
                    {activeReport.actionable_fixes.map((fix, idx) => {
                      const isExpanded = expandedFixIndex === idx;
                      const hasExamples = fix.example_before || fix.example_after;
                      return (
                        <div 
                          key={idx} 
                          className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden hover:bg-white/10 hover:border-white/10 transition-all duration-300"
                        >
                          <button
                            onClick={() => hasExamples && setExpandedFixIndex(isExpanded ? null : idx)}
                            className={`w-full p-5 text-left flex items-start justify-between gap-4 cursor-pointer focus:outline-none`}
                          >
                            <div className="space-y-1.5 flex-1">
                              <span className="px-2 py-0.5 rounded bg-lumina-teal/10 text-lumina-teal text-[8px] uppercase tracking-widest font-black">
                                {fix.area}
                              </span>
                              <h6 className="font-display font-black text-sm text-foreground leading-snug">{fix.suggestion}</h6>
                            </div>
                            {hasExamples && (
                              <span className="text-xs font-black uppercase text-lumina-teal shrink-0 mt-1 hover:underline">
                                {isExpanded ? "Collapse Details" : "Expand Details"}
                              </span>
                            )}
                          </button>

                          <AnimatePresence>
                            {isExpanded && hasExamples && (
                              <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: "auto" }}
                                exit={{ height: 0 }}
                                className="overflow-hidden border-t border-white/5 bg-black/25"
                              >
                                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {fix.example_before && (
                                    <div className="space-y-2">
                                      <span className="text-[9px] font-black uppercase tracking-wider text-accent-red/70 flex items-center gap-1">
                                        <XCircle className="w-3 h-3 text-accent-red/50" /> Current / Before
                                      </span>
                                      <pre className="p-3 bg-accent-red/5 border border-accent-red/10 rounded-xl text-xs font-mono text-muted-foreground/80 overflow-x-auto whitespace-pre-wrap">
                                        {fix.example_before}
                                      </pre>
                                    </div>
                                  )}
                                  {fix.example_after && (
                                    <div className="space-y-2">
                                      <span className="text-[9px] font-black uppercase tracking-wider text-accent-emerald/70 flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3 text-accent-emerald/50" /> Suggested / After
                                      </span>
                                      <pre className="p-3 bg-accent-emerald/5 border border-accent-emerald/10 rounded-xl text-xs font-mono text-foreground overflow-x-auto whitespace-pre-wrap">
                                        {fix.example_after}
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
};
