import React from "react";

export const TrackerSkeleton: React.FC = () => {
  return (
    <div className="w-full max-w-7xl mx-auto space-y-10 animate-pulse">
      {/* ── Stats Row (3 columns) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-10 rounded-[40px] border border-slate-100 bg-white text-center space-y-4 shadow-sm">
            <div className="h-16 w-20 bg-slate-200 rounded-full mx-auto" />
            <div className="h-3 w-28 bg-slate-100 rounded-full mx-auto" />
          </div>
        ))}
      </div>

      {/* ── Main Board Panel ── */}
      <div className="p-10 rounded-[40px] border border-slate-100 bg-white shadow-2xl space-y-12">
        {/* Header bar */}
        <div className="flex items-center justify-between flex-wrap gap-8">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-3xl bg-slate-100 border border-slate-100 flex items-center justify-center" />
            <div className="space-y-2">
              <div className="h-6 w-44 bg-slate-200 rounded-full" />
              <div className="h-3 w-36 bg-slate-100 rounded-full" />
            </div>
          </div>
          <div className="h-12 w-44 bg-slate-200 rounded-2xl" />
        </div>

        {/* Multi-Column pipeline structure */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {["Interview", "Applied", "Saved"].map((colStatus, colIdx) => (
            <div key={colStatus} className="flex flex-col gap-6">
              {/* Column title header */}
              <div className="flex items-center justify-between px-2">
                <div className="h-6 w-20 bg-slate-200 rounded-xl" />
                <div className="h-5 w-12 bg-slate-100 rounded-full" />
              </div>

              {/* Cards column */}
              <div className="space-y-4">
                {[1, 2].map((cardIdx) => (
                  <div key={cardIdx} className="p-8 rounded-3xl border border-slate-100 bg-white space-y-4 shadow-sm">
                    {/* Header */}
                    <div className="space-y-2 pr-10">
                      <div className="h-5 w-24 bg-slate-200 rounded-full" />
                      <div className="h-3.5 w-32 bg-slate-100 rounded-full" />
                    </div>

                    {/* Bottom metrics info */}
                    <div className="flex items-end justify-between border-t border-slate-50 pt-5 mt-2">
                      <div className="space-y-2">
                        <div className="h-2.5 w-24 bg-slate-100 rounded-full" />
                        <div className="h-5 w-10 bg-slate-200 rounded-full" />
                      </div>
                      <div className="h-4 w-16 bg-slate-100 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
