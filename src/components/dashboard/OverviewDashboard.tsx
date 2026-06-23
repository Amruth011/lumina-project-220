import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  FileText, Briefcase, Search, Compass, Sparkles, Plus, 
  ArrowRight, CheckCircle2, TrendingUp, Clock, AlertCircle, Bot
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface DashboardStats {
  resumesGenerated: number;
  jobsApplied: number;
  jdsDecoded: number;
  resumeAnalyses: number;
}

export function OverviewDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    resumesGenerated: 0,
    jobsApplied: 0,
    jdsDecoded: 0,
    resumeAnalyses: 0
  });
  const [loading, setLoading] = useState(true);
  const [recentJds, setRecentJds] = useState<{ id: string; title: string; created_at: string }[]>([]);
  const [recentApps, setRecentApps] = useState<{ id: string; company: string; role: string; status: string; match_percent: number }[]>([]);

  useEffect(() => {
    if (!user) return;

    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // 1. Fetch counts
        const [resumesRes, appsRes, jdsRes, roadmapsRes] = await Promise.all([
          supabase.from("generated_resumes").select("id", { count: "exact", head: true }).eq("user_id", user.id),
          supabase.from("user_applications").select("id", { count: "exact", head: true }).eq("user_id", user.id),
          supabase.from("jd_vault").select("id", { count: "exact", head: true }).eq("user_id", user.id),
          supabase.from("roadmaps").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        ]);

        const resumesCount = resumesRes.count || 0;
        const appsCount = appsRes.count || 0;
        const jdsCount = jdsRes.count || 0;
        const roadmapsCount = roadmapsRes.count || 0;

        setStats({
          resumesGenerated: resumesCount,
          jobsApplied: appsCount,
          jdsDecoded: jdsCount,
          resumeAnalyses: roadmapsCount > 0 ? roadmapsCount : jdsCount // Use roadmaps or JDs as fallback for analyses
        });

        // 2. Fetch recent JDs
        const { data: recentJdsData } = await supabase
          .from("jd_vault")
          .select("id, title, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(3);

        if (recentJdsData) {
          setRecentJds(recentJdsData);
        }

        // 3. Fetch recent applications
        const { data: recentAppsData } = await supabase
          .from("user_applications")
          .select("id, company, role, status, match_percent")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(3);

        if (recentAppsData) {
          setRecentApps(recentAppsData);
        }

      } catch (err) {
        console.error("Error loading dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  const handleTabSwitch = (tab: string) => {
    window.dispatchEvent(new CustomEvent("switch-tab", { detail: tab }));
  };

  const statCards = [
    { label: "Resumes Generated", value: stats.resumesGenerated, icon: FileText, color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30" },
    { label: "Jobs Applied", value: stats.jobsApplied, icon: Briefcase, color: "text-blue-500 bg-blue-50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/30" },
    { label: "JDs Decoded", value: stats.jdsDecoded, icon: Search, color: "text-amber-500 bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30" },
    { label: "Resume Analyses", value: stats.resumeAnalyses, icon: Compass, color: "text-violet-500 bg-violet-50 dark:bg-violet-950/20 border-violet-100 dark:border-violet-900/30" }
  ];

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto space-y-8 animate-pulse px-4 md:px-8 py-10">
        <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-slate-100 dark:bg-slate-800 rounded-[2rem] border border-slate-200/40" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="h-96 bg-slate-100 dark:bg-slate-800 rounded-[2.5rem] lg:col-span-2" />
          <div className="h-96 bg-slate-100 dark:bg-slate-800 rounded-[2.5rem]" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-10 px-4 md:px-8 py-10">
      
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif italic text-slate-900 dark:text-white leading-tight">
            Welcome Back, <span className="font-sans font-black text-slate-800 dark:text-slate-100 not-italic uppercase tracking-tight">{user?.email?.split("@")[0]}</span>
          </h1>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-1">
            Lumina intelligence signal is stable and active.
          </p>
        </div>
        
        <button
          onClick={() => handleTabSwitch("decode")}
          className="flex items-center gap-2 px-5 py-3 rounded-full bg-lumina-teal hover:bg-lumina-teal/90 text-white text-[11px] font-black uppercase tracking-widest transition-all shadow-md shadow-teal-500/20"
        >
          <Plus size={14} className="stroke-[3px]" />
          <span>Decode New JD</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, idx) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.08 }}
            className={`p-6 rounded-[2rem] border bg-white dark:bg-slate-950 shadow-sm hover:shadow-md transition-all flex items-center justify-between group ${card.color}`}
          >
            <div className="space-y-1">
              <span className="text-3xl md:text-4xl font-display font-black tracking-tight block">
                {card.value}
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-slate-500 transition-colors">
                {card.label}
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-800">
              <card.icon size={20} className="stroke-[2px]" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Grid: Activity & Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Quick Actions Shortcuts */}
        <div className="lg:col-span-2 space-y-6">
          <div className="premium-card rounded-[2.5rem] p-8 border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-950/50 shadow-sm">
            <h3 className="text-lg font-serif italic text-slate-900 dark:text-white mb-6">Strategic Workspaces</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <div 
                onClick={() => handleTabSwitch("decode")}
                className="p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80 hover:border-lumina-teal/30 bg-slate-50/50 dark:bg-slate-900/30 hover:bg-lumina-teal/5 dark:hover:bg-lumina-teal/10 cursor-pointer transition-all flex items-start gap-4 group"
              >
                <div className="w-10 h-10 rounded-xl bg-lumina-teal/10 flex items-center justify-center text-lumina-teal flex-shrink-0">
                  <Search size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1 group-hover:text-lumina-teal transition-colors">
                    JD Decoder <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-1 leading-normal">Decode skills, culture, and key keywords directly from a JD post.</p>
                </div>
              </div>

              <div 
                onClick={() => handleTabSwitch("generator")}
                className="p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80 hover:border-emerald-500/30 bg-slate-50/50 dark:bg-slate-900/30 hover:bg-emerald-500/5 dark:hover:bg-emerald-500/10 cursor-pointer transition-all flex items-start gap-4 group"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 flex-shrink-0">
                  <FileText size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1 group-hover:text-emerald-500 transition-colors">
                    Resume Tailor <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-1 leading-normal">Improve and align your resume bullets with targeted JD expectations.</p>
                </div>
              </div>

              <div 
                onClick={() => handleTabSwitch("outreach")}
                className="p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80 hover:border-violet-500/30 bg-slate-50/50 dark:bg-slate-900/30 hover:bg-violet-500/5 dark:hover:bg-violet-500/10 cursor-pointer transition-all flex items-start gap-4 group"
              >
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500 flex-shrink-0">
                  <Bot size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1 group-hover:text-violet-500 transition-colors">
                    Cold Outreach Creator <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-1 leading-normal">Generate cold emails, outreach asks, or LinkedIn networking notes.</p>
                </div>
              </div>

              <div 
                onClick={() => handleTabSwitch("interview")}
                className="p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80 hover:border-blue-500/30 bg-slate-50/50 dark:bg-slate-900/30 hover:bg-blue-500/5 dark:hover:bg-blue-500/10 cursor-pointer transition-all flex items-start gap-4 group"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 flex-shrink-0">
                  <Target size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1 group-hover:text-blue-500 transition-colors">
                    AI Interview Prep <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-1 leading-normal">Prepare for interviews with tailored mock sessions and STAR responses.</p>
                </div>
              </div>

            </div>
          </div>

          {/* Recent Applications List */}
          <div className="premium-card rounded-[2.5rem] p-8 border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-950/50 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-serif italic text-slate-900 dark:text-white">Active Applications</h3>
              <button 
                onClick={() => handleTabSwitch("pipeline")}
                className="text-[10px] font-black uppercase tracking-widest text-lumina-teal hover:underline flex items-center gap-1"
              >
                View Pipeline <ChevronDown size={12} className="-rotate-90" />
              </button>
            </div>
            
            <div className="space-y-3">
              {recentApps.length === 0 ? (
                <div className="p-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center">
                  <p className="text-xs text-slate-400 italic">No opportunities tracked yet.</p>
                </div>
              ) : (
                recentApps.map((app) => (
                  <div 
                    key={app.id}
                    className="p-4 rounded-2xl border border-slate-100 dark:border-slate-900 bg-white dark:bg-slate-950 flex items-center justify-between hover:border-slate-200 dark:hover:border-slate-800 transition-all shadow-sm"
                  >
                    <div>
                      <p className="font-bold text-xs text-slate-800 dark:text-slate-200">{app.role}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{app.company}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {app.match_percent > 0 && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                          {app.match_percent}% match
                        </span>
                      )}
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-500">
                        {app.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Sidebar: Recent Decoded JDs */}
        <div className="space-y-6">
          <div className="premium-card rounded-[2.5rem] p-8 border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-950/50 shadow-sm h-full flex flex-col">
            <h3 className="text-lg font-serif italic text-slate-900 dark:text-white mb-6">Recent Decodes</h3>
            
            <div className="space-y-4 flex-1">
              {recentJds.length === 0 ? (
                <div className="p-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center">
                  <p className="text-xs text-slate-400 italic">No job descriptions scanned yet.</p>
                </div>
              ) : (
                recentJds.map((jd) => (
                  <div 
                    key={jd.id}
                    className="p-4 rounded-2xl border border-slate-100 dark:border-slate-900 bg-white dark:bg-slate-950 space-y-2 hover:border-lumina-teal/20 transition-all cursor-pointer shadow-sm group"
                    onClick={() => handleTabSwitch("decode")}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <p className="font-bold text-[11px] text-slate-800 dark:text-slate-200 truncate flex-1 group-hover:text-lumina-teal transition-colors">
                        {jd.title || "Untitled Job Description"}
                      </p>
                      <Clock size={10} className="text-slate-300 mt-1 flex-shrink-0" />
                    </div>
                    <div className="flex items-center justify-between text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                      <span>Decoded Jd</span>
                      <span>{new Date(jd.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {recentJds.length > 0 && (
              <button 
                onClick={() => handleTabSwitch("decode")}
                className="w-full mt-6 py-3 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-900/80 border border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 transition-all flex items-center justify-center gap-1.5"
              >
                Go to Workspace <ArrowRight size={10} />
              </button>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
