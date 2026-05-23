import React from "react";

export const GapAnalyzerSkeleton: React.FC = () => {
  return (
    <div className="w-full mx-auto space-y-10 animate-pulse">
      {/* ── Heading ── */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-10 mb-10">
        <div className="flex items-center gap-10">
          <div className="w-24 h-24 rounded-[2.5rem] bg-slate-100 border border-slate-100 flex items-center justify-center" />
          <div className="space-y-3">
            <div className="h-10 w-64 bg-slate-200 rounded-full" />
            <div className="h-4 w-96 bg-slate-100 rounded-full" />
          </div>
        </div>
        <div className="h-12 w-48 bg-slate-200 rounded-full" />
      </div>

      {/* ── Input Panel Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Large upload card (8 cols) */}
        <div className="md:col-span-8 p-12 rounded-[3rem] border border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-slate-200" />
          <div className="space-y-2 text-center w-full flex flex-col items-center">
            <div className="h-4 w-44 bg-slate-200 rounded-full" />
            <div className="h-3 w-56 bg-slate-100 rounded-full" />
          </div>
        </div>

        {/* Sidebar widgets (4 cols) */}
        <div className="md:col-span-4 space-y-6">
          <div className="p-8 rounded-[2.5rem] bg-slate-50/50 border border-slate-100 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 bg-slate-200 rounded-md" />
              <div className="h-3 w-24 bg-slate-200 rounded-full" />
            </div>
            <div className="h-10 w-full bg-slate-100 rounded-lg" />
          </div>
          <div className="flex items-center gap-4 px-8 py-5 rounded-[2.5rem] bg-slate-50/50 border border-slate-100">
            <div className="w-5 h-5 rounded-md bg-slate-200" />
            <div className="h-3 w-36 bg-slate-200 rounded-full" />
          </div>
        </div>
      </div>

      {/* ── Textarea Pasting ── */}
      <div className="w-full h-48 bg-slate-50 border border-slate-200 rounded-[3rem] p-10" />

      {/* ── Result Placeholders (Simulating Active Score Scanning) ── */}
      <div className="space-y-10 pt-10 border-t border-slate-100">
        <div className="grid grid-cols-1 md:grid-cols-[120px,1fr] gap-4">
          <div className="p-4 rounded-3xl border border-slate-100 bg-white flex flex-col items-center justify-center space-y-2 h-24">
            <div className="h-8 w-12 bg-slate-200 rounded-full" />
            <div className="h-3 w-10 bg-slate-100 rounded-full" />
          </div>
          <div className="p-4 rounded-3xl border border-slate-100 bg-white flex items-center h-24">
            <div className="h-4 w-3/4 bg-slate-100 rounded-full ml-4" />
          </div>
        </div>

        {/* Gap Analysis Box */}
        <div className="p-6 rounded-3xl border border-slate-100 bg-slate-50/50 space-y-4">
          <div className="h-4 w-32 bg-slate-200 rounded-full" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="p-5 rounded-[2rem] bg-white border border-slate-100 flex justify-between items-start gap-4">
                <div className="space-y-2 flex-1">
                  <div className="h-3.5 w-3/4 bg-slate-200 rounded-full" />
                  <div className="h-2.5 w-20 bg-slate-100 rounded-full" />
                </div>
                <div className="w-8 h-8 rounded-lg bg-slate-200 shrink-0" />
              </div>
            ))}
          </div>
        </div>

        {/* Side-by-side Skill signatures and recommendations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-6 rounded-3xl border border-slate-100 bg-white space-y-4">
            <div className="h-4 w-36 bg-slate-200 rounded-full" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[1, 2, 4, 5].map((i) => (
                <div key={i} className="flex justify-between items-center p-3.5 rounded-[1.5rem] bg-slate-50/50 border border-slate-50">
                  <div className="h-3.5 w-24 bg-slate-200 rounded-full" />
                  <div className="h-3.5 w-8 bg-slate-100 rounded-full" />
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 rounded-3xl border border-slate-100 bg-white space-y-4">
            <div className="h-4 w-36 bg-slate-200 rounded-full" />
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="flex gap-4 items-start p-5 rounded-[2rem] bg-white border border-slate-50">
                  <div className="w-6 h-6 rounded bg-slate-200 shrink-0" />
                  <div className="space-y-2 flex-1">
                    <div className="h-3.5 w-20 bg-slate-200 rounded-full" />
                    <div className="h-3 w-full bg-slate-100 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
