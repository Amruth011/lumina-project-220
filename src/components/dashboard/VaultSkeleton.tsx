import React from "react";

export const VaultSkeleton: React.FC = () => {
  return (
    <div className="w-full max-w-7xl mx-auto space-y-12 animate-pulse">
      {/* ── Header Banner ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-slate-100">
        <div className="space-y-3">
          <div className="h-9 w-52 bg-slate-200 rounded-full" />
          <div className="h-3.5 w-80 bg-slate-100 rounded-full" />
        </div>
        <div className="flex gap-3">
          <div className="h-10 w-24 bg-slate-100 rounded-full" />
          <div className="h-10 w-36 bg-slate-200 rounded-full" />
        </div>
      </div>

      {/* ── Category Folder Tabs ── */}
      <div className="flex flex-wrap gap-3 pb-2 border-b border-slate-50">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-10 w-28 bg-slate-100 rounded-2xl" />
        ))}
      </div>

      {/* ── Content Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side: Category specific instructions (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="p-8 rounded-[2.5rem] border border-slate-100 bg-white space-y-4">
            <div className="w-12 h-12 bg-slate-200 rounded-2xl" />
            <div className="space-y-2">
              <div className="h-5 w-32 bg-slate-200 rounded-full" />
              <div className="h-3 w-48 bg-slate-100 rounded-full" />
            </div>
            <div className="space-y-2 pt-2 border-t border-slate-50">
              <div className="h-3 w-full bg-slate-50 rounded-full" />
              <div className="h-3 w-5/6 bg-slate-50 rounded-full" />
            </div>
          </div>
          <div className="h-12 w-full bg-slate-100 rounded-2xl" />
        </div>

        {/* Right Side: List of library credentials (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Search bar */}
          <div className="h-14 w-full bg-slate-50 border border-slate-150 rounded-3xl" />

          {/* List items */}
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-6 rounded-[2rem] border border-slate-100 bg-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-sm">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-3">
                    <div className="h-5 w-44 bg-slate-200 rounded-full" />
                    <div className="h-4.5 w-16 bg-slate-100 rounded-full" />
                  </div>
                  <div className="h-3 w-32 bg-slate-100 rounded-full" />
                  <div className="space-y-1.5 pt-2">
                    <div className="h-3 w-11/12 bg-slate-50 rounded-full" />
                    <div className="h-3 w-4/5 bg-slate-50 rounded-full" />
                  </div>
                </div>
                <div className="flex gap-2.5 shrink-0 self-end md:self-center">
                  <div className="w-9 h-9 rounded-lg bg-slate-100" />
                  <div className="w-9 h-9 rounded-lg bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
