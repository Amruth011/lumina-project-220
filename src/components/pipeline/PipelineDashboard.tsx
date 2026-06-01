import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Briefcase, Loader2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Application, ApplicationStatus } from "@/types/applications";

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  saved: "Saved",
  applied: "Applied",
  interviewing: "Interviewing",
  offered: "Offered",
  rejected: "Rejected",
  ghosted: "Ghosted",
};

const STATUS_STYLES: Record<ApplicationStatus, { header: string; ring: string; dot: string }> = {
  saved:        { header: "text-slate-600",   ring: "border-slate-200 bg-slate-50/70",        dot: "bg-slate-400" },
  applied:      { header: "text-blue-600",    ring: "border-blue-100 bg-blue-50/60",          dot: "bg-blue-500" },
  interviewing: { header: "text-amber-600",   ring: "border-amber-100 bg-amber-50/60",        dot: "bg-amber-500" },
  offered:      { header: "text-emerald-600", ring: "border-emerald-100 bg-emerald-50/60",    dot: "bg-emerald-500" },
  rejected:     { header: "text-red-600",     ring: "border-red-100 bg-red-50/60",            dot: "bg-red-500" },
  ghosted:      { header: "text-slate-500",   ring: "border-slate-200 bg-slate-100/60",       dot: "bg-slate-400" },
};

export function PipelineDashboard() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("applications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setApplications(data as Application[]);
        setLoading(false);
      });
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 size={20} className="animate-spin text-emerald-500" />
      </div>
    );
  }

  const columns: ApplicationStatus[] = ["saved", "applied", "interviewing", "offered", "rejected", "ghosted"];

  return (
    <div className="w-full max-w-7xl mx-auto space-y-10 py-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
          <Briefcase size={18} className="text-emerald-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Application Pipeline</h1>
          <p className="text-[12px] font-medium text-slate-500">
            Track every application from discovery to offer in a single Kanban view.
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500">
            {applications.length} total
          </div>
          <button
            onClick={() => {/* form modal handled elsewhere */}}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-400 transition-colors"
          >
            <Plus size={10} /> Add application
          </button>
        </div>
      </div>

      {/* Kanban */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {columns.map((status) => {
          const items = applications.filter((a) => a.status === status);
          const style = STATUS_STYLES[status];
          return (
            <div
              key={status}
              className={`rounded-2xl border ${style.ring} p-4 space-y-3 min-h-[160px]`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                  <span className={`text-[10px] font-black uppercase tracking-widest ${style.header}`}>
                    {STATUS_LABELS[status]}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-slate-400">{items.length}</span>
              </div>

              <div className="space-y-2">
                {items.length === 0 ? (
                  <p className="text-[10px] text-slate-300 italic">No applications</p>
                ) : (
                  items.map((app) => (
                    <motion.div
                      key={app.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 rounded-xl bg-white border border-slate-100 cursor-pointer hover:border-emerald-300 hover:shadow-sm transition-all"
                    >
                      <p className="text-[11px] font-bold text-slate-800 truncate">{app.role}</p>
                      <p className="text-[10px] text-slate-500 truncate">{app.company}</p>
                      {app.score != null && (
                        <span className="inline-block mt-1.5 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                          {app.score}/100
                        </span>
                      )}
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
