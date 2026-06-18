import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShieldAlert, Target, Building2, MapPin, Briefcase, Zap, Info, 
  GraduationCap, Clock, Award, Users, Scale, FileText, Globe, 
  Flag, Heart, ChevronDown, Sparkles
} from "lucide-react";
import type { StructuredJdData, HardRequirement, SoftRequirement, JdResponsibility, CultureSignal, AtsKeyword } from "@/types/jd";

interface StructuredJdDetailsProps {
  data?: StructuredJdData;
}

export const StructuredJdDetails = ({ data }: StructuredJdDetailsProps) => {
  if (!data) {
    return (
      <div className="glass-panel p-6 rounded-[2rem] text-center bg-white/50 border border-slate-100">
        <p className="text-sm text-muted-foreground">No structured extraction data available for this job description.</p>
      </div>
    );
  }

  const hardReqs = data.hard_requirements || [];
  const softReqs = data.soft_requirements || [];
  const responsibilities = data.responsibilities || [];
  const cultureSignals = data.culture_signals || [];
  const context = data.company_context || {};
  const atsKeywords = data.keywords_for_ats || [];
  const redFlags = data.red_flags || { vague_requirements: [], unrealistic_expectations: [] };

  // Determine if each section has valid results
  const hasMandates = hardReqs.length > 0 || softReqs.length > 0;
  const hasResponsibilities = responsibilities.length > 0;
  const hasCulture = cultureSignals.length > 0 || 
    (redFlags.vague_requirements && redFlags.vague_requirements.length > 0) || 
    (redFlags.unrealistic_expectations && redFlags.unrealistic_expectations.length > 0);
  const hasContext = atsKeywords.length > 0 || 
    Object.values(context).some(v => v && v !== "Not specified" && v !== "");

  // Compile active tabs
  const availableTabs = [
    hasMandates && { id: "mandates" as const, label: "mandates" },
    hasResponsibilities && { id: "responsibilities" as const, label: "responsibilities" },
    hasCulture && { id: "culture" as const, label: "culture" },
    hasContext && { id: "context" as const, label: "context" }
  ].filter((t): t is { id: "mandates" | "responsibilities" | "culture" | "context"; label: string } => !!t);

  // If no tabs have results, remove Structured JD Intelligence completely
  if (availableTabs.length === 0) {
    return null;
  }

  // Handle active tab state safely
  const [activeSection, setActiveSection] = useState<"mandates" | "culture" | "responsibilities" | "context" | null>(null);
  const currentTab = activeSection && availableTabs.some(t => t.id === activeSection)
    ? activeSection
    : (availableTabs[0]?.id || null);

  return (
    <div className="glass-panel bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-slate-200/60 p-6 md:p-8 rounded-[3rem] space-y-8 relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-accent-emerald/5 opacity-40 pointer-events-none" />
      
      {/* Title / Section Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
        <div className="space-y-1">
          <span className="text-[10px] font-black uppercase text-accent-emerald tracking-[0.3em] bg-accent-emerald/10 px-3 py-1 rounded-full border border-accent-emerald/20">
            Forensic Deep Dive
          </span>
          <h3 className="text-3xl font-serif italic text-foreground">Structured JD Intelligence</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {availableTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                currentTab === tab.id 
                  ? "bg-slate-900 text-white shadow-md shadow-slate-950/15" 
                  : "bg-slate-50 border border-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 min-h-[300px]">
        <AnimatePresence mode="wait">
          {currentTab === "mandates" && (
            <motion.div
              key="mandates"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              {/* Hard Requirements */}
              <div className="space-y-4 bg-slate-50/50 border border-slate-100 p-6 rounded-[2rem]">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                  <GraduationCap className="w-5 h-5 text-accent-blue" />
                  <h4 className="text-sm font-black uppercase tracking-widest text-slate-800">Hard Requirements</h4>
                </div>
                <div className="space-y-4 overflow-y-auto max-h-[300px] pr-2">
                  {hardReqs.length > 0 ? (
                    hardReqs.map((hr, idx) => (
                      <div key={idx} className="bg-white border border-slate-100 p-4 rounded-2xl space-y-2.5 hover:border-accent-blue/30 transition-colors">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                            {hr.category || "General"}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                            hr.priority === "must-have"
                              ? "bg-red-50 text-red-500 border-red-100"
                              : "bg-slate-50 text-slate-500 border-slate-150"
                          }`}>
                            {hr.priority}
                          </span>
                        </div>
                        {hr.minimum_years !== undefined && (
                          <div className="flex items-center gap-1 text-[11px] font-black text-slate-800 bg-slate-50 px-2.5 py-1 rounded-lg w-fit">
                            <Clock size={10} className="text-slate-500" />
                            <span>Min {hr.minimum_years} years</span>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {hr.specific_technologies.map((tech, tIdx) => (
                            <span key={tIdx} className="px-2.5 py-1 bg-slate-50 border border-slate-100 text-slate-700 text-[10px] font-bold rounded-lg">
                              {tech}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground italic">No hard requirements explicitly stated.</p>
                  )}
                </div>
              </div>

              {/* Soft Requirements */}
              <div className="space-y-4 bg-slate-50/50 border border-slate-100 p-6 rounded-[2rem]">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                  <Users className="w-5 h-5 text-accent-emerald" />
                  <h4 className="text-sm font-black uppercase tracking-widest text-slate-800">Soft Requirements</h4>
                </div>
                <div className="space-y-4 overflow-y-auto max-h-[300px] pr-2">
                  {softReqs.length > 0 ? (
                    softReqs.map((sr, idx) => (
                      <div key={idx} className="bg-white border border-slate-100 p-4 rounded-2xl space-y-2.5 hover:border-accent-emerald/30 transition-colors">
                        <div className="flex flex-wrap gap-1">
                          {sr.traits.map((trait, tIdx) => (
                            <span key={tIdx} className="px-2 py-0.5 bg-accent-emerald/5 text-accent-emerald text-[9px] font-black uppercase tracking-widest rounded-full">
                              {trait}
                            </span>
                          ))}
                        </div>
                        <p className="text-[12px] text-slate-700 font-medium leading-relaxed">{sr.context}</p>
                        {sr.evidence_type && (
                          <div className="text-[10px] text-slate-400 bg-slate-50 p-2 rounded-xl border border-slate-100 flex items-start gap-1.5">
                            <Info size={11} className="mt-0.5 text-slate-400 shrink-0" />
                            <span><strong>Verification:</strong> {sr.evidence_type}</span>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground italic">No soft requirements explicitly stated.</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {currentTab === "responsibilities" && (
            <motion.div
              key="responsibilities"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-4 bg-slate-50/50 border border-slate-100 p-6 rounded-[2rem]"
            >
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <Briefcase className="w-5 h-5 text-accent-blue" />
                <h4 className="text-sm font-black uppercase tracking-widest text-slate-800">Role Responsibilities</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[350px] overflow-y-auto pr-2">
                {responsibilities.length > 0 ? (
                  responsibilities.map((resp, idx) => (
                    <div key={idx} className="bg-white border border-slate-100 p-5 rounded-2xl space-y-3 hover:border-slate-300 transition-colors">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-accent-blue" />
                        <span className="text-[10px] font-black uppercase text-accent-blue tracking-widest">{resp.impact_area || "General Impact"}</span>
                      </div>
                      <p className="text-[13px] font-medium text-slate-700 leading-relaxed">{resp.scope}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground italic col-span-2">No responsibilities extracted.</p>
                )}
              </div>
            </motion.div>
          )}

          {currentTab === "culture" && (
            <motion.div
              key="culture"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              {/* Culture Signals */}
              <div className="space-y-4 bg-slate-50/50 border border-slate-100 p-6 rounded-[2rem]">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                  <Heart className="w-5 h-5 text-accent-red" />
                  <h4 className="text-sm font-black uppercase tracking-widest text-slate-800">Culture & Tone Signals</h4>
                </div>
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                  {cultureSignals.length > 0 ? (
                    cultureSignals.map((cs, idx) => (
                      <div key={idx} className="bg-white border border-slate-100 p-4 rounded-2xl space-y-2 hover:border-accent-red/30 transition-colors">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Signal {idx + 1}</span>
                          <span className="px-2 py-0.5 bg-accent-red/5 border border-accent-red/10 text-accent-red text-[8px] font-black uppercase tracking-widest rounded-full">
                            {cs.tone}
                          </span>
                        </div>
                        <p className="text-[12px] text-slate-700 font-medium leading-relaxed italic">&ldquo;{cs.evidence}&rdquo;</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground italic">No culture signals extracted.</p>
                  )}
                </div>
              </div>

              {/* Red Flags & Expectations */}
              <div className="space-y-4 bg-slate-50/50 border border-slate-100 p-6 rounded-[2rem]">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                  <Flag className="w-5 h-5 text-red-500" />
                  <h4 className="text-sm font-black uppercase tracking-widest text-slate-800">Forensic Red Flags</h4>
                </div>
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                  {/* Vague Requirements */}
                  {redFlags.vague_requirements && redFlags.vague_requirements.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-black uppercase text-red-500/70 tracking-widest block">Vague Requirements</span>
                      <div className="space-y-1.5">
                        {redFlags.vague_requirements.map((vr, i) => (
                          <div key={i} className="bg-red-50/30 border border-red-100/50 p-3 rounded-xl text-xs text-slate-700 font-medium leading-relaxed flex items-start gap-2">
                            <span className="text-red-400 shrink-0 font-bold">•</span>
                            <span>{vr}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Unrealistic Expectations */}
                  {redFlags.unrealistic_expectations && redFlags.unrealistic_expectations.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <span className="text-[10px] font-black uppercase text-red-500/70 tracking-widest block">Unrealistic Expectations</span>
                      <div className="space-y-1.5">
                        {redFlags.unrealistic_expectations.map((ue, i) => (
                          <div key={i} className="bg-red-50/30 border border-red-100/50 p-3 rounded-xl text-xs text-slate-700 font-medium leading-relaxed flex items-start gap-2">
                            <span className="text-red-400 shrink-0 font-bold">•</span>
                            <span>{ue}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(!redFlags.vague_requirements?.length && !redFlags.unrealistic_expectations?.length) && (
                    <p className="text-xs text-muted-foreground italic">No forensic flags or unrealistic expectations identified.</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {currentTab === "context" && (
            <motion.div
              key="context"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              {/* Company Context details */}
              <div className="space-y-4 bg-slate-50/50 border border-slate-100 p-6 rounded-[2rem] flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                    <Building2 className="w-5 h-5 text-slate-800" />
                    <h4 className="text-sm font-black uppercase tracking-widest text-slate-800">Company Context</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-3.5 border border-slate-100 rounded-2xl">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Company Stage</span>
                      <span className="text-xs font-bold text-slate-800">{context.stage || "Not specified"}</span>
                    </div>
                    <div className="bg-white p-3.5 border border-slate-100 rounded-2xl">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Company Size</span>
                      <span className="text-xs font-bold text-slate-800">{context.size || "Not specified"}</span>
                    </div>
                    <div className="bg-white p-3.5 border border-slate-100 rounded-2xl">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Industry / Domain</span>
                      <span className="text-xs font-bold text-slate-800">{context.industry || "Technology"}</span>
                    </div>
                    <div className="bg-white p-3.5 border border-slate-100 rounded-2xl">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Work Style</span>
                      <span className="text-xs font-bold text-slate-800">{context.work_style || "Collaborative"}</span>
                    </div>
                  </div>
                </div>
                {context.communication_style && (
                  <div className="bg-slate-900 text-white p-4 rounded-2xl mt-4">
                    <span className="text-[8px] font-black text-white/50 uppercase tracking-[0.2em] block mb-1">Communication Style</span>
                    <p className="text-xs font-medium leading-relaxed text-white/95">{context.communication_style}</p>
                  </div>
                )}
              </div>

              {/* ATS Keywords & Acronyms */}
              <div className="space-y-4 bg-slate-50/50 border border-slate-100 p-6 rounded-[2rem]">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                  <Target className="w-5 h-5 text-accent-blue" />
                  <h4 className="text-sm font-black uppercase tracking-widest text-slate-800">Keywords for ATS</h4>
                </div>
                <div className="flex flex-wrap gap-2 max-h-[300px] overflow-y-auto pr-2">
                  {atsKeywords.length > 0 ? (
                    atsKeywords.map((kw, idx) => (
                      <div key={idx} className="bg-white border border-slate-100 px-3.5 py-2 rounded-xl flex items-center gap-2 hover:border-accent-blue/30 transition-all cursor-default">
                        <span className="text-[12px] font-bold text-slate-800">{kw.spelled_out}</span>
                        {kw.acronym && (
                          <span className="bg-slate-100 text-slate-500 font-mono text-[9px] px-1.5 py-0.5 rounded uppercase font-black">
                            {kw.acronym}
                          </span>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground italic">No ATS keywords extracted.</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
