import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Compass, 
  BookOpen, 
  Video, 
  GraduationCap, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  Download, 
  AlertCircle, 
  ArrowRight, 
  Check, 
  TrendingUp, 
  RefreshCw, 
  Trophy, 
  Info,
  ChevronRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { RoadmapData, RoadmapItem, RoadmapTask } from "@/types/roadmap";
import type { DecodeResult } from "@/types/jd";
import confetti from "canvas-confetti";

interface RoadmapViewProps {
  results: DecodeResult | null;
  jdText: string;
}

const loadingSteps = [
  "Initializing upskilling analysis...",
  "Retrieving Master Vault credentials...",
  "Scanning Job Description requirements...",
  "Detecting experience & skill gaps...",
  "Synthesizing actionable learning syllabus...",
  "Drafting personalized timeline phases...",
  "Compiling deep-dive resources...",
  "Finalizing customized roadmap payload..."
];

export const RoadmapView = ({ results, jdText }: RoadmapViewProps) => {
  const { user } = useAuth();
  const [duration, setDuration] = useState("4 Weeks");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null);
  const [roadmapId, setRoadmapId] = useState<string | null>(null);
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(new Set());

  const durationOptions = [
    "1 Week",
    "2 Weeks",
    "3 Weeks",
    "4 Weeks",
    "2 Months",
    "3 Months",
    "6 Months",
    "1 Year"
  ];

  const fetchExistingRoadmap = useCallback(async () => {
    try {
      if (!user?.id) return;
      // Find latest roadmap saved by user
      const { data, error } = await supabase
        .from("roadmaps")
        .select("id, roadmap_data")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        // Try to find if one matches current JD results title, otherwise load the latest
        const matched = data.find((r: { id: string; roadmap_data: unknown }) => {
          const rData = r.roadmap_data as RoadmapData;
          return rData.target_role?.toLowerCase() === results?.title?.toLowerCase();
        }) || data[0];

        const rData = matched.roadmap_data as RoadmapData;
        setRoadmap(rData);
        setRoadmapId(matched.id);

        // Populate completed task IDs from DB state
        const completed = new Set<string>();
        rData.timeline.forEach((phase) => {
          phase.actionable_tasks.forEach((task) => {
            if (task.is_completed) {
              completed.add(task.id);
            }
          });
        });
        setCompletedTaskIds(completed);
      }
    } catch (err) {
      console.error("Error fetching roadmap:", err);
    }
  }, [user?.id, results?.title]);

  // Fetch existing roadmap on mount / JD change
  useEffect(() => {
    if (user && results) {
      fetchExistingRoadmap();
    }
  }, [user, results, fetchExistingRoadmap]);

  // Increment loading steps to keep user engaged
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev < loadingSteps.length - 1 ? prev + 1 : prev));
      }, 3500);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleGenerate = async () => {
    if (!user) {
      toast.error("Authentication required.", { description: "Please sign in to generate upskilling roadmaps." });
      return;
    }

    setLoading(true);
    setLoadingStep(0);
    const toastId = toast.loading("Analyzing gaps and constructing your custom roadmap...");

    try {
      // 1. Fetch user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      // 2. Fetch master vault entries
      const { data: items } = await supabase
        .from("master_vault")
        .select("*")
        .eq("user_id", user.id);

      const vault_data = {
        profile,
        items: items || []
      };

      const jd_data = {
        title: results?.title || "Scanned Target Role",
        skills: results?.skills || [],
        description: jdText
      };

      // Get user session JWT token from Supabase client
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error("Unable to retrieve valid session credentials.");
      }

      // 3. Trigger API Call
      const response = await fetch("/api/generate-roadmap", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          jd_data,
          vault_data,
          duration,
          jd_id: null // optional field
        })
      });

      if (!response.ok) {
        let errMsg = `HTTP Error ${response.status}: Failed to compile roadmap.`;
        try {
          const text = await response.text();
          try {
            const errDetails = JSON.parse(text);
            errMsg = errDetails.error || errDetails.message || errMsg;
          } catch {
            if (text && text.trim().length > 0) {
              if (text.length < 500) {
                errMsg = text;
              } else if (text.includes("<title>")) {
                const matches = text.match(/<title>([^<]+)<\/title>/i);
                if (matches && matches[1]) {
                  errMsg = `Server Error: ${matches[1]}`;
                } else {
                  errMsg = `Serverless Function error (HTTP ${response.status}).`;
                }
              } else {
                errMsg = `Serverless Function error (HTTP ${response.status}).`;
              }
            }
          }
        } catch (readErr) {
          console.error("Error reading error response:", readErr);
        }
        throw new Error(errMsg);
      }

      const dbRow = await response.json();
      const rData = dbRow.roadmap_data as RoadmapData;

      setRoadmap(rData);
      setRoadmapId(dbRow.id);

      // Reset completed checklist
      setCompletedTaskIds(new Set());
      
      toast.success("AI Upskilling Roadmap successfully deployed!", { id: toastId });
      
      // Fire confetti celebration
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.8 }
      });

    } catch (err) {
      console.error(err);
      const errMsg = err instanceof Error ? err.message : "Please make sure your Vault profile contains enough information.";
      toast.error("Roadmap compilation failed.", { 
        description: errMsg,
        id: toastId 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTask = async (phaseIdx: number, taskIdx: number, taskId: string) => {
    if (!roadmap || !roadmapId) return;

    // 1. Toggle local state Set
    const nextCompleted = new Set(completedTaskIds);
    const isCompleted = !completedTaskIds.has(taskId);

    if (isCompleted) {
      nextCompleted.add(taskId);
      // Trigger subtle task check confetti
      confetti({
        particleCount: 15,
        spread: 30,
        origin: { y: 0.85 }
      });
    } else {
      nextCompleted.delete(taskId);
    }
    setCompletedTaskIds(nextCompleted);

    // 2. Map new completed state into local state RoadmapData
    const updatedTimeline = roadmap.timeline.map((phase, pIdx) => {
      if (pIdx !== phaseIdx) return phase;
      return {
        ...phase,
        actionable_tasks: phase.actionable_tasks.map((task, tIdx) => {
          if (tIdx !== taskIdx) return task;
          return { ...task, is_completed: isCompleted };
        })
      };
    });

    const updatedRoadmap = {
      ...roadmap,
      timeline: updatedTimeline
    };
    setRoadmap(updatedRoadmap);

    // Check if the user has completed all tasks globally!
    const totalTasks = updatedRoadmap.timeline.reduce((sum, p) => sum + p.actionable_tasks.length, 0);
    if (nextCompleted.size === totalTasks && totalTasks > 0) {
      // Big graduation celebration
      setTimeout(() => {
        confetti({
          particleCount: 150,
          spread: 80,
          colors: ['#10B981', '#34D399', '#6EE7B7', '#ffffff']
        });
        toast.success("Flawless Execution! You have completed 100% of your Adaptive Upskilling Syllabus!", {
          description: "You are fully optimized for this role.",
          icon: <Trophy className="text-yellow-500 w-5 h-5" />
        });
      }, 300);
    }

    // 3. Write modified roadmap_data back to Supabase in background
    try {
      await supabase
        .from("roadmaps")
        .update({ roadmap_data: updatedRoadmap })
        .eq("id", roadmapId);
    } catch (dbErr) {
      console.warn("Unable to synchronize task checklist state in background database:", dbErr);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Metric Calculators
  const getTotalTasks = () => {
    if (!roadmap) return 0;
    return roadmap.timeline.reduce((acc, phase) => acc + phase.actionable_tasks.length, 0);
  };

  const getCompletedTasksCount = () => {
    return completedTaskIds.size;
  };

  const getGlobalPercentage = () => {
    const total = getTotalTasks();
    if (total === 0) return 0;
    return Math.round((getCompletedTasksCount() / total) * 100);
  };

  const getPhaseProgress = (phase: RoadmapItem) => {
    const total = phase.actionable_tasks.length;
    if (total === 0) return 0;
    const completed = phase.actionable_tasks.filter(t => completedTaskIds.has(t.id)).length;
    return Math.round((completed / total) * 100);
  };

  const getResourceIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "video":
        return <Video size={14} className="text-rose-500" />;
      case "course":
        return <GraduationCap size={14} className="text-indigo-500" />;
      default:
        return <BookOpen size={14} className="text-lumina-teal" />;
    }
  };

  // Loading Screen
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] space-y-8 p-12 bg-white border border-slate-100 rounded-[3rem] shadow-xl shadow-slate-100/50">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="relative w-24 h-24"
        >
          {/* Inner ring */}
          <div className="absolute inset-2 rounded-full border-2 border-dashed border-lumina-teal/30 border-t-lumina-teal animate-spin" style={{ animationDuration: '6s' }} />
          {/* Outer ring */}
          <div className="absolute inset-0 rounded-full border-4 border-slate-100 border-t-lumina-teal animate-spin" />
          <Compass className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-lumina-teal animate-pulse" />
        </motion.div>
        
        <div className="space-y-3 text-center max-w-md">
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-lumina-teal">Tactical AI Engine Working</p>
          <AnimatePresence mode="wait">
            <motion.h4
              key={loadingStep}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4 }}
              className="text-base font-bold text-slate-800 tracking-tight h-6"
            >
              {loadingSteps[loadingStep]}
            </motion.h4>
          </AnimatePresence>
          <p className="text-[10px] text-slate-400 leading-normal">
            Synthesizing master vault analytics against Job requirements to formulate a customized training regimen. This can take up to 45 seconds.
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-64 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
          <motion.div 
            className="h-full bg-lumina-teal shadow-[0_0_8px_#10B981]"
            initial={{ width: "0%" }}
            animate={{ width: `${((loadingStep + 1) / loadingSteps.length) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>
    );
  }

  // Initial Configuration Screen (No Roadmap compiled yet)
  if (!roadmap) {
    return (
      <div className="max-w-3xl mx-auto p-8 lg:p-12 bg-white border border-slate-100 rounded-[3rem] shadow-[0_20px_50px_rgba(16,185,129,0.04)] relative">
        {/* Glow circles container to prevent layout spill while allowing absolute dropdown overlay */}
        <div className="absolute inset-0 rounded-[3rem] overflow-hidden pointer-events-none z-0">
          <div className="absolute -top-32 -right-32 w-64 h-64 bg-lumina-teal/5 rounded-full blur-[100px]" />
          <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-indigo-500/5 rounded-full blur-[100px]" />
        </div>

        <div className="flex items-center gap-4 mb-6 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-lumina-teal/5 border border-lumina-teal/20 flex items-center justify-center text-lumina-teal">
            <Compass size={24} className="animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-800">Adaptive Upskilling Roadmap</h2>
            <p className="text-[11px] font-semibold text-slate-500 tracking-tight">Synthesize a custom learning timeline to crush specific role requirements</p>
          </div>
        </div>

        <div className="space-y-8 mt-10 relative z-10">
          <div className="p-5 rounded-2xl border border-lumina-teal/10 bg-lumina-teal/5 flex gap-4 items-start">
            <Info size={16} className="text-lumina-teal mt-1 shrink-0" />
            <div className="space-y-1">
              <p className="text-[12px] font-bold text-slate-800">Target Role Detected</p>
              <p className="text-[13px] text-lumina-teal font-black uppercase tracking-wider">{results?.title || "Professional Developer"}</p>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Lumina's AI will parse all assets inside your **Master Vault**, compare them against this target role, identify exact architectural & technical gaps, and deploy a precise training syllabus to guarantee your readiness.
              </p>
            </div>
          </div>

          <div className="space-y-4 relative">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Select Learning Duration</label>
            
            <div className="relative max-w-md">
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-full flex items-center justify-between px-6 py-4.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50/50 hover:border-lumina-teal/30 text-[13px] font-bold text-slate-700 transition-all duration-300 focus:outline-none focus:border-lumina-teal/50 shadow-md shadow-slate-100"
              >
                <div className="flex items-center gap-3">
                  <Clock size={16} className="text-lumina-teal" />
                  <span className="tracking-tight uppercase tracking-wider">{duration}</span>
                </div>
                <motion.div
                  animate={{ rotate: dropdownOpen ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ChevronRight size={16} className="text-slate-400 rotate-90" />
                </motion.div>
              </button>

              <AnimatePresence>
                {dropdownOpen && (
                  <>
                    {/* Click outside overlay */}
                    <div 
                      className="fixed inset-0 z-30" 
                      onClick={() => setDropdownOpen(false)} 
                    />
                    
                    {/* Rolling dropdown body */}
                    <motion.div
                      initial={{ opacity: 0, y: -15, scaleY: 0.8 }}
                      animate={{ opacity: 1, y: 4, scaleY: 1 }}
                      exit={{ opacity: 0, y: -15, scaleY: 0.8 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      style={{ originY: 0 }}
                      className="absolute top-full left-0 right-0 z-40 mt-1.5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/80"
                    >
                      <div className="py-2 max-h-[300px] overflow-y-auto">
                        {durationOptions.map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => {
                              setDuration(opt);
                              setDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-6 py-3.5 text-left text-[12px] font-black uppercase tracking-wider transition-all duration-200 ${
                              duration === opt
                                ? "bg-lumina-teal/10 text-lumina-teal font-bold border-l-4 border-lumina-teal"
                                : "text-slate-500 hover:text-slate-800 hover:bg-slate-50 border-l-4 border-transparent"
                            }`}
                          >
                            <span>{opt}</span>
                            {duration === opt && <Check size={14} className="text-lumina-teal" />}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
            
            <p className="text-[10px] text-slate-400 italic leading-relaxed">
              Choose shorter timelines for rapid adjustments, or longer pathways for intensive role upskilling.
            </p>
          </div>

          <div className="flex justify-center pt-4">
            <button
              onClick={handleGenerate}
              className="group flex items-center gap-3 px-12 py-5 rounded-full bg-lumina-teal text-white text-[11px] font-black uppercase tracking-widest hover:bg-lumina-teal/90 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-emerald-500/20"
            >
              Generate Syllabus <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active Roadmap timeline workspace
  return (
    <div className="max-w-5xl mx-auto print-container space-y-12">
      {/* Stylesheet specifically injected for printing optimization */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body {
            background: white !important;
            color: #1e293b !important;
            font-family: system-ui, -apple-system, sans-serif !important;
          }
          /* Hide non-essential layout details */
          nav, footer, header, button, .no-print, [role="button"], .toaster {
            display: none !important;
          }
          .print-container {
            max-width: 100% !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .print-header {
            margin-bottom: 2rem !important;
            border-bottom: 2px solid #e2e8f0 !important;
            padding-bottom: 1.5rem !important;
          }
          .print-title {
            color: #0f172a !important;
            font-size: 24px !important;
            font-weight: 800 !important;
            text-transform: uppercase !important;
            letter-spacing: 0.05em !important;
          }
          .print-card {
            border: 1px solid #cbd5e1 !important;
            background: #ffffff !important;
            color: #1e293b !important;
            page-break-inside: avoid !important;
            margin-bottom: 2rem !important;
            padding: 1.5rem !important;
            border-radius: 8px !important;
            box-shadow: none !important;
          }
          .print-badge {
            border: 1px solid #94a3b8 !important;
            color: #334155 !important;
            font-weight: bold !important;
            padding: 0.25rem 0.5rem !important;
            border-radius: 4px !important;
          }
          .print-task-checked {
            text-decoration: line-through !important;
            color: #94a3b8 !important;
          }
          .print-resource-link {
            text-decoration: underline !important;
            color: #10B981 !important;
          }
        }
      `}} />

      {/* Global Status Bar (Overview Panel) */}
      <div className="p-6 lg:p-8 rounded-[2.5rem] bg-white border border-slate-100 shadow-[0_8px_30px_rgba(16,185,129,0.02)] relative overflow-hidden flex flex-col md:flex-row justify-between gap-6 print-header print-card">
        {/* Glow */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-lumina-teal/5 rounded-full blur-[60px] pointer-events-none" />

        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <span className="px-3.5 py-1 text-[9px] font-black uppercase tracking-wider bg-lumina-teal/5 border border-lumina-teal/20 text-lumina-teal rounded-full print-badge">
              {roadmap.duration} Plan
            </span>
            <span className="text-[10px] font-bold text-slate-400">Targeting Syllabus Completion</span>
          </div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight text-slate-800 print-title">
            Roadmap: {roadmap.target_role}
          </h2>
          <div className="flex flex-wrap gap-2 pt-1 no-print">
            {roadmap.skill_gaps_identified.slice(0, 5).map((gap, i) => (
              <span key={i} className="text-[10px] font-medium px-3 py-1 rounded-md bg-lumina-teal/5 text-lumina-teal border border-lumina-teal/10">
                {gap}
              </span>
            ))}
          </div>
        </div>

        {/* Global Progress Radial / Bar */}
        <div className="flex flex-col justify-center min-w-[200px] space-y-2">
          <div className="flex justify-between items-baseline">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Overall Mastery Progress</span>
            <span className="text-lg font-black tracking-tight text-lumina-teal">{getGlobalPercentage()}%</span>
          </div>
          
          <div className="w-full h-2.5 bg-slate-100 rounded-full border border-slate-200 overflow-hidden relative">
            <motion.div 
              className="h-full bg-lumina-teal rounded-full shadow-[0_0_10px_rgba(16,185,129,0.2)]"
              initial={{ width: "0%" }}
              animate={{ width: `${getGlobalPercentage()}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>

          <div className="flex justify-between text-[9px] font-semibold text-slate-400 tracking-tight pt-1">
            <span>{getCompletedTasksCount()} Tasks Done</span>
            <span>{getTotalTasks()} Total Syllabus Requirements</span>
          </div>
        </div>
      </div>

      {/* Controller Buttons */}
      <div className="flex justify-between items-center no-print px-4">
        <button
          onClick={() => setRoadmap(null)}
          className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-lumina-teal transition-colors"
        >
          <RefreshCw size={12} className="group-hover:rotate-180 transition-transform" /> Reconfigure Roadmap
        </button>

        <button
          onClick={handlePrint}
          className="flex items-center gap-3 px-8 py-3.5 rounded-full bg-lumina-teal text-white hover:bg-lumina-teal/90 hover:scale-102 active:scale-97 text-[10px] font-black uppercase tracking-widest transition-all shadow-md shadow-emerald-500/10"
        >
          <Download size={14} className="text-white animate-pulse" /> Download Off-line Syllabus
        </button>
      </div>

      {/* Vertical Stepper Workspace */}
      <div className="relative border-l-2 border-lumina-teal/20 ml-4 md:ml-8 pl-6 md:pl-10 space-y-12 pb-6">
        
        {roadmap.timeline.map((phase, phaseIdx) => {
          const isPhaseDone = getPhaseProgress(phase) === 100;
          return (
            <motion.div
              key={phase.phase_number}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: phaseIdx * 0.1 }}
              className="relative group/phase print-card"
            >
              {/* Stepper Dot */}
              <div className={`absolute top-0 -left-[35px] md:-left-[51px] w-8 h-8 rounded-full border-2 bg-white flex items-center justify-center transition-all duration-500 z-10 ${
                isPhaseDone 
                  ? "border-lumina-teal text-lumina-teal bg-lumina-teal/5 shadow-md shadow-emerald-500/20" 
                  : "border-slate-200 text-slate-400 group-hover/phase:border-lumina-teal/40"
              }`}>
                {isPhaseDone ? (
                  <Check size={14} className="stroke-[3px]" />
                ) : (
                  <span className="text-[10px] font-black tracking-tighter">{phase.phase_number}</span>
                )}
              </div>

              {/* Glass Phase Card */}
              <div className="bg-white border border-slate-100 p-6 lg:p-8 rounded-[2rem] shadow-[0_8px_30px_rgba(16,185,129,0.02)] hover:border-lumina-teal/25 transition-all duration-300 relative group/card">
                
                {/* Phase header info */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-5">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-lumina-teal">
                      Module {phase.phase_number} • {phase.focus_area}
                    </span>
                    <h3 className="text-base font-black tracking-tight text-slate-800 transition-colors print-title">
                      {phase.phase_title}
                    </h3>
                  </div>

                  {/* Phase completion meter */}
                  <div className="flex items-center gap-3 shrink-0 print-badge">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Progress</span>
                    <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50 no-print">
                      <div 
                        className={`h-full rounded-full transition-all duration-700 ${isPhaseDone ? "bg-lumina-teal" : "bg-lumina-teal/60"}`}
                        style={{ width: `${getPhaseProgress(phase)}%` }}
                      />
                    </div>
                    <span className={`text-[11px] font-black tracking-tight ${isPhaseDone ? "text-lumina-teal" : "text-slate-500"}`}>
                      {getPhaseProgress(phase)}%
                    </span>
                  </div>
                </div>

                {/* Sub-grid of Gaps and Checklist */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Left column: Gaps addressed callout (4 cols) */}
                  <div className="lg:col-span-4 space-y-4">
                    <div className="p-5 rounded-2xl border border-lumina-teal/10 bg-lumina-teal/5 relative">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp size={14} className="text-lumina-teal" />
                        <span className="text-[10px] font-black uppercase tracking-wider text-lumina-teal">Gaps Addressed</span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-slate-600">
                        {phase.gap_addressed}
                      </p>
                    </div>
                    
                    {/* Phase study resources */}
                    {phase.deep_dive_resources && phase.deep_dive_resources.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 pl-1 block">Deep Dive Curations</span>
                        <div className="space-y-2">
                          {phase.deep_dive_resources.map((res, rIdx) => (
                            <a
                              key={rIdx}
                              href={res.url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-2.5 p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-lumina-teal/5 hover:border-lumina-teal/20 transition-all text-left no-print"
                            >
                              <div className="w-6 h-6 rounded-lg bg-white border border-slate-100 flex items-center justify-center shrink-0">
                                {getResourceIcon(res.source_type)}
                              </div>
                              <div className="space-y-0.5 truncate">
                                <p className="text-[11px] font-bold text-slate-700 truncate group-hover/phase:text-lumina-teal">{res.title}</p>
                                <p className="text-[9px] font-semibold text-slate-400 capitalize tracking-tight leading-none">{res.source_type}</p>
                              </div>
                            </a>
                          ))}
                          
                          {/* Print-visible resources */}
                          <ul className="hidden print:block list-disc pl-4 space-y-1">
                            {phase.deep_dive_resources.map((res, rIdx) => (
                              <li key={rIdx} className="text-[10px] text-slate-500">
                                <strong className="print-text">{res.title}</strong> ({res.source_type}): <span className="print-resource-link">{res.url}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right column: Actionable Checklist (8 cols) */}
                  <div className="lg:col-span-8 space-y-4">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 pl-1 block">Actionable Checklist</span>
                    <div className="space-y-2.5">
                      {phase.actionable_tasks.map((task, taskIdx) => {
                        const isTaskDone = completedTaskIds.has(task.id);
                        return (
                          <div
                            key={task.id}
                            role="button"
                            onClick={() => handleToggleTask(phaseIdx, taskIdx, task.id)}
                            className={`flex items-start gap-4 p-4 rounded-2xl border transition-all duration-300 text-left w-full ${
                              isTaskDone
                                ? "bg-lumina-teal/5 border-lumina-teal/20 hover:bg-lumina-teal/10"
                                : "bg-slate-50/30 border-slate-100 hover:border-lumina-teal/20 hover:bg-lumina-teal/5"
                            }`}
                          >
                            {/* Toggle Box */}
                            <div className={`w-5.5 h-5.5 rounded-md border flex items-center justify-center shrink-0 transition-all duration-300 no-print ${
                              isTaskDone 
                                ? "bg-lumina-teal border-lumina-teal text-white shadow-lg shadow-emerald-500/10 scale-102" 
                                : "border-slate-200 hover:border-lumina-teal/40 bg-white"
                            }`}>
                              {isTaskDone && <Check size={11} className="stroke-[3.5px]" />}
                            </div>

                            {/* Print-visible native checkbox representation */}
                            <span className="hidden print:inline-block border border-slate-400 w-3 h-3 text-[8px] leading-none text-center mr-2 shrink-0">
                              {isTaskDone ? "X" : " "}
                            </span>

                            <div className="space-y-1">
                              <p className={`text-[12px] font-bold leading-normal transition-all duration-500 print-text ${
                                isTaskDone 
                                  ? "line-through text-slate-400 print-task-checked" 
                                  : "text-slate-700"
                              }`}>
                                {task.title}
                              </p>
                              
                              <div className="flex items-center gap-1.5 text-[9px] font-semibold text-slate-400 tracking-tight pl-0.5">
                                <Clock size={10} />
                                <span>{task.estimated_hours} Hours Allocated</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

              </div>
            </motion.div>
          );
        })}
      </div>
      
      {/* Footer Encouragement */}
      <div className="no-print p-8 text-center bg-white border border-slate-100 shadow-[0_8px_30px_rgba(16,185,129,0.02)] rounded-[2.5rem] flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 bg-lumina-teal/5 border border-lumina-teal/10 text-lumina-teal rounded-full flex items-center justify-center">
          <Sparkles size={16} />
        </div>
        <h4 className="text-[12px] font-black uppercase tracking-widest text-slate-800">Continuous Mastery Loop</h4>
        <p className="text-[10px] text-slate-500 max-w-md mx-auto leading-normal">
          Toggle each requirement as you finish building its matching projects in the real world. As you check off items, your overall tactical status is synchronized across all active resume tailors and coaches automatically.
        </p>
      </div>
    </div>
  );
};
