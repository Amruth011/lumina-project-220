import { JobScoreCard } from "@/components/scoring/JobScoreCard";
import { useState } from "react";
import { Loader2, Target } from "lucide-react";
import type { JobScore } from "@/types/applications";

export default function Scoring() {
  const [score, setScore] = useState<JobScore | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-8 animate-in fade-in duration-300">
      <div className="space-y-6">
        <div className="space-y-0.5">
          <h2 className="text-sm font-black uppercase tracking-widest text-foreground flex items-center gap-2">
            <Target size={14} /> Job Scoring
          </h2>
          <p className="text-[10px] text-muted-foreground">AI-powered A-F fit analysis for every application</p>
        </div>
        {!score && !loading && (
          <div className="rounded-2xl border border-dashed border-slate-200 dark:border-white/10 p-8 text-center bg-white dark:bg-slate-950">
            <Target size={32} className="mx-auto text-muted-foreground mb-3 opacity-30" />
            <p className="text-xs text-muted-foreground">Score a resume against a job description to see fit analysis.</p>
          </div>
        )}
        {loading && (
          <div className="flex items-center justify-center min-h-[200px]">
            <Loader2 size={20} className="animate-spin text-muted-foreground" />
          </div>
        )}
        {score && <JobScoreCard score={score} />}
      </div>
    </div>
  );
}
