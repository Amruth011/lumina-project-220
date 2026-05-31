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

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  saved: "border-white/10 bg-white/5",
  applied: "border-blue-500/30 bg-blue-500/10",
  interviewing: "border-amber-500/30 bg-amber-500/10",
  offered: "border-emerald-500/30 bg-emerald-500/10",
  rejected: "border-red-500/30 bg-red-500/10",
  ghosted: "border-gray-500/30 bg-gray-500/10",
};

export function PipelineDashboard() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

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
        <Loader2 size={20} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  const columns: ApplicationStatus[] = ["saved", "applied", "interviewing", "offered", "rejected", "ghosted"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h2 className="text-sm font-black uppercase tracking-widest text-foreground flex items-center gap-2">
            <Briefcase size={14} /> Pipeline Dashboard
          </h2>
          <p className="text-[10px] text-muted-foreground">Track every application from discovery to offer</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest hover:bg-emerald-400 transition-all flex items-center gap-1.5"
        >
          <Plus size={12} /> Add Application
        </button>
      </div>

      <div className="grid grid-cols-6 gap-3">
        {columns.map((status) => {
          const items = applications.filter((a) => a.status === status);
          return (
            <div key={status} className={`rounded-2xl border p-3 space-y-2 ${STATUS_COLORS[status]}`}>
              <div className="flex items-center justify-between">
                <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">
                  {STATUS_LABELS[status]}
                </span>
                <span className="text-[9px] font-bold text-muted-foreground">{items.length}</span>
              </div>
              <div className="space-y-1.5">
                {items.map((app) => (
                  <motion.div
                    key={app.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-2 rounded-xl bg-background/80 border border-border/40 cursor-pointer hover:border-emerald-500/30 transition-all"
                  >
                    <p className="text-[9px] font-bold text-foreground truncate">{app.role}</p>
                    <p className="text-[8px] text-muted-foreground truncate">{app.company}</p>
                    {app.score && (
                      <span className="text-[8px] font-bold text-emerald-400">{app.score}/100</span>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
