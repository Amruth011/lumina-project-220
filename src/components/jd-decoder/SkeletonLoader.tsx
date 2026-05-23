import React from "react";
import { motion } from "framer-motion";

export const SkeletonLoader: React.FC = () => {
  return (
    <div className="w-full mx-auto space-y-8 animate-pulse">
      {/* ── Branded Control Bar Skeleton ── */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between p-4 rounded-[2rem] border border-white/5 bg-slate-950/20 backdrop-blur-md">
        <div className="flex items-center gap-3 pl-3 w-full sm:w-auto">
          <div className="w-8 h-8 rounded-xl bg-white/5" />
          <div className="space-y-1.5 flex-1 sm:flex-initial">
            <div className="h-2 w-28 bg-white/5 rounded-full" />
            <div className="h-3 w-36 bg-white/10 rounded-full" />
          </div>
        </div>
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <div className="h-8 w-24 bg-white/5 rounded-full" />
          <div className="h-8 w-28 bg-white/10 rounded-full" />
        </div>
      </div>

      {/* ── HERO INTELLIGENCE GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Gauge & Verdict Skeletons */}
        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {/* Gauge Skeleton */}
          <div className="glass-panel border-white/5 p-8 rounded-[3rem] flex flex-col items-center justify-center min-h-[400px] bg-slate-950/10">
            <div className="relative w-52 h-52 rounded-full border-4 border-white/5 flex items-center justify-center">
              <div className="absolute w-44 h-44 rounded-full border-4 border-dashed border-white/5 animate-[spin_20s_linear_infinite]" />
              <div className="flex flex-col items-center space-y-2">
                <div className="h-8 w-16 bg-white/15 rounded-full" />
                <div className="h-3 w-20 bg-white/5 rounded-full" />
              </div>
            </div>
            <div className="mt-8 space-y-2 w-full flex flex-col items-center">
              <div className="h-3 w-28 bg-white/10 rounded-full" />
              <div className="h-2 w-48 bg-white/5 rounded-full" />
            </div>
          </div>

          {/* Verdict Skeleton */}
          <div className="glass-panel border-white/5 p-8 rounded-[3rem] flex flex-col justify-between min-h-[400px] bg-slate-950/10 space-y-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="h-3 w-24 bg-white/10 rounded-full" />
                <div className="h-6 w-16 bg-white/15 rounded-full" />
              </div>
              <div className="h-4 w-3/4 bg-white/15 rounded-full" />
              <div className="space-y-2 pt-2">
                <div className="h-2 w-full bg-white/5 rounded-full" />
                <div className="h-2 w-full bg-white/5 rounded-full" />
                <div className="h-2 w-5/6 bg-white/5 rounded-full" />
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-white/5">
              <div className="flex justify-between items-center">
                <div className="h-2.5 w-32 bg-white/10 rounded-full" />
                <div className="h-2 w-12 bg-white/5 rounded-full" />
              </div>
              <div className="flex gap-2">
                <div className="h-6 w-20 bg-white/5 rounded-md" />
                <div className="h-6 w-24 bg-white/5 rounded-md" />
                <div className="h-6 w-16 bg-white/5 rounded-md" />
              </div>
            </div>
          </div>
        </div>

        {/* Salary Estimation Skeleton */}
        <div className="lg:col-span-4 glass-panel border-white/5 p-10 rounded-[3.5rem] flex flex-col justify-center min-h-[400px] bg-slate-950/10 space-y-8">
          <div className="space-y-2">
            <div className="h-2.5 w-32 bg-white/10 rounded-full" />
            <div className="h-5 w-24 bg-white/5 rounded-full" />
          </div>

          <div className="space-y-3">
            <div className="h-2 w-28 bg-white/5 rounded-full" />
            <div className="flex items-baseline gap-2">
              <div className="h-10 w-24 bg-white/15 rounded-full" />
              <div className="h-2 w-4 bg-white/5 rounded-full" />
              <div className="h-10 w-28 bg-white/15 rounded-full" />
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <div className="h-4 w-full bg-white/5 rounded-full relative overflow-hidden">
              <div className="absolute top-0 left-1/4 w-1/2 h-full bg-white/10 rounded-full" />
            </div>
            <div className="flex justify-between items-center">
              <div className="space-y-1.5">
                <div className="h-2 w-16 bg-white/5 rounded-full" />
                <div className="h-3 w-12 bg-white/10 rounded-full" />
              </div>
              <div className="space-y-1.5 flex flex-col items-end">
                <div className="h-2 w-16 bg-white/5 rounded-full" />
                <div className="h-3 w-12 bg-white/10 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── LOWER DETAIL PANELS GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Skills Taxonomy Panel Skeleton */}
        <div className="lg:col-span-12 xl:col-span-7 glass-panel border-white/5 p-8 rounded-[3rem] bg-slate-950/10 space-y-6">
          <div className="flex justify-between items-center border-b border-white/5 pb-4">
            <div className="space-y-2">
              <div className="h-3 w-28 bg-white/15 rounded-full" />
              <div className="h-2 w-44 bg-white/5 rounded-full" />
            </div>
            <div className="h-8 w-24 bg-white/5 rounded-full" />
          </div>

          <div className="flex flex-wrap gap-2.5 pt-2">
            {/* Pulsing Skills Badges */}
            {[
              "w-28", "w-20", "w-32", "w-24", "w-36", "w-16", 
              "w-24", "w-28", "w-20", "w-32", "w-16", "w-36", 
              "w-20", "w-28", "w-24", "w-32"
            ].map((width, i) => (
              <div
                key={i}
                className={`h-7 ${width} rounded-full bg-white/5 border border-white/5`}
              />
            ))}
          </div>
        </div>

        {/* Strategic Risks & Summary Skeleton */}
        <div className="lg:col-span-12 xl:col-span-5 glass-panel border-white/5 p-8 rounded-[3rem] bg-slate-950/10 space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="h-3.5 w-36 bg-white/15 rounded-full" />
            <div className="space-y-2">
              <div className="h-2 w-full bg-white/5 rounded-full" />
              <div className="h-2 w-full bg-white/5 rounded-full" />
              <div className="h-2 w-3/4 bg-white/5 rounded-full" />
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-white/5">
            <div className="flex justify-between items-center">
              <div className="h-3 w-28 bg-white/10 rounded-full" />
              <div className="h-3.5 w-16 bg-white/15 rounded-full" />
            </div>
            <div className="space-y-2">
              <div className="h-2 w-full bg-white/5 rounded-full" />
              <div className="h-2 w-5/6 bg-white/5 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
