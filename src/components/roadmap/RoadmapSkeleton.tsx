import React from "react";
import { Compass } from "lucide-react";

export const RoadmapSkeleton: React.FC = () => {
  return (
    <div className="w-full max-w-5xl mx-auto space-y-12 animate-pulse">
      {/* ── Global Status Bar Overview card ── */}
      <div className="p-6 lg:p-8 rounded-[2.5rem] bg-white border border-slate-100 shadow-[0_8px_30px_rgba(16,185,129,0.02)] flex flex-col md:flex-row justify-between gap-6 relative overflow-hidden">
        <div className="space-y-4 flex-1">
          <div className="flex items-center gap-2.5">
            <div className="h-5 w-24 bg-slate-200 rounded-full" />
            <div className="h-3 w-40 bg-slate-100 rounded-full" />
          </div>
          <div className="h-8 w-3/4 bg-slate-200 rounded-full" />
          <div className="flex gap-2 pt-1">
            <div className="h-6 w-20 bg-slate-100 rounded-md" />
            <div className="h-6 w-24 bg-slate-100 rounded-md" />
            <div className="h-6 w-16 bg-slate-100 rounded-md" />
          </div>
        </div>
        <div className="flex flex-col justify-center min-w-[200px] space-y-3">
          <div className="flex justify-between items-baseline">
            <div className="h-3.5 w-32 bg-slate-200 rounded-full" />
            <div className="h-5 w-8 bg-slate-200 rounded-full" />
          </div>
          <div className="w-full h-2.5 bg-slate-100 rounded-full border border-slate-200 overflow-hidden" />
          <div className="flex justify-between">
            <div className="h-3 w-16 bg-slate-100 rounded-full" />
            <div className="h-3 w-28 bg-slate-100 rounded-full" />
          </div>
        </div>
      </div>

      {/* ── Button Controllers ── */}
      <div className="flex justify-between items-center px-4">
        <div className="h-4 w-36 bg-slate-200 rounded-full" />
        <div className="h-10 w-44 bg-slate-200 rounded-full" />
      </div>

      {/* ── Vertical Stepper Weeks ── */}
      <div className="relative border-l-2 border-slate-100 ml-4 md:ml-8 pl-6 md:pl-10 space-y-12">
        {[1, 2, 3].map((weekNum) => (
          <div key={weekNum} className="relative">
            {/* Dot marker */}
            <div className="absolute top-0 -left-[35px] md:-left-[51px] w-8 h-8 rounded-full border border-slate-200 bg-white flex items-center justify-center">
              <div className="w-3.5 h-3.5 rounded-full bg-slate-200" />
            </div>

            {/* Main week card outline */}
            <div className="bg-white border border-slate-100 p-6 lg:p-8 rounded-[2rem] shadow-[0_8px_30px_rgba(16,185,129,0.02)]">
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-50 pb-5 mb-5">
                <div className="space-y-2">
                  <div className="h-3 w-36 bg-slate-200 rounded-full" />
                  <div className="h-6 w-56 bg-slate-200 rounded-full" />
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="h-3 w-12 bg-slate-100 rounded-full" />
                  <div className="w-16 h-2 bg-slate-100 rounded-full" />
                  <div className="h-4 w-8 bg-slate-200 rounded-full" />
                </div>
              </div>

              {/* Body Columns */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left gaps column (4 cols) */}
                <div className="lg:col-span-4 space-y-4">
                  <div className="p-5 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-2">
                    <div className="h-3 w-28 bg-slate-200 rounded-full" />
                    <div className="h-10 w-full bg-slate-100 rounded-lg" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 w-32 bg-slate-200 rounded-full" />
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-50 bg-slate-50/30">
                        <div className="w-6 h-6 rounded-lg bg-slate-200 shrink-0" />
                        <div className="space-y-1.5 flex-1">
                          <div className="h-3 w-28 bg-slate-200 rounded-full" />
                          <div className="h-2 w-16 bg-slate-100 rounded-full" />
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-50 bg-slate-50/30">
                        <div className="w-6 h-6 rounded-lg bg-slate-200 shrink-0" />
                        <div className="space-y-1.5 flex-1">
                          <div className="h-3 w-24 bg-slate-200 rounded-full" />
                          <div className="h-2 w-16 bg-slate-100 rounded-full" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right task column (8 cols) */}
                <div className="lg:col-span-8 space-y-4">
                  <div className="h-3.5 w-32 bg-slate-200 rounded-full" />
                  <div className="space-y-2.5">
                    {[1, 2, 3].map((taskNum) => (
                      <div key={taskNum} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/30 flex items-start gap-4">
                        <div className="w-5 h-5 rounded-md border border-slate-200 bg-white shrink-0 mt-0.5" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3.5 w-3/4 bg-slate-200 rounded-full" />
                          <div className="h-2.5 w-24 bg-slate-100 rounded-full" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
