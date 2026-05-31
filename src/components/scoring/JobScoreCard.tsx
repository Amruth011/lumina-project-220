import { Award, TrendingUp, Lightbulb } from "lucide-react";
import type { JobScore, RubricDimension } from "@/types/applications";

const DIMENSION_LABELS: Record<RubricDimension, string> = {
  relevance: "Relevance",
  impact: "Impact",
  skills_match: "Skills Match",
  experience_depth: "Experience Depth",
  education_fit: "Education Fit",
  cultural_signals: "Cultural Signals",
};

const GRADE_COLORS: Record<string, string> = {
  A: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  B: "text-blue-400 border-blue-500/30 bg-blue-500/10",
  C: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  D: "text-orange-400 border-orange-500/30 bg-orange-500/10",
  F: "text-red-400 border-red-500/30 bg-red-500/10",
};

interface Props {
  score: JobScore;
}

export function JobScoreCard({ score }: Props) {
  return (
    <div className="rounded-2xl border border-border/40 bg-background/40 p-5 space-y-5">
      <div className="flex items-center gap-4">
        <div className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center ${GRADE_COLORS[score.overall] || GRADE_COLORS.F}`}>
          <span className="text-2xl font-black">{score.overall}</span>
        </div>
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Award size={14} className="text-primary" />
            <span className="text-xs font-bold text-foreground">Overall Fit Score</span>
          </div>
          <p className="text-[10px] text-muted-foreground">Based on 6-dimension rubric analysis</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {(Object.entries(score.dimensions) as [RubricDimension, number][]).map(([dim, val]) => (
          <div key={dim} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">
                {DIMENSION_LABELS[dim]}
              </span>
              <span className="text-[9px] font-bold text-foreground">{val}/100</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${val}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {score.reasoning && (
        <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <TrendingUp size={10} className="text-primary" />
            <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Reasoning</span>
          </div>
          <p className="text-[10px] text-foreground/80 leading-relaxed">{score.reasoning}</p>
        </div>
      )}

      {score.suggestions.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Lightbulb size={10} className="text-amber-400" />
            <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Improvements</span>
          </div>
          <ul className="space-y-1">
            {score.suggestions.map((s, i) => (
              <li key={i} className="text-[10px] text-foreground/70 flex items-start gap-2">
                <span className="text-amber-400 mt-0.5">•</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
