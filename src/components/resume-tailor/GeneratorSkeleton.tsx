import React from "react";

export const GeneratorSkeleton: React.FC = () => {
  return (
    <div className="w-full mx-auto space-y-12 animate-pulse">
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

      {/* ── Settings Controls Dashboard ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Left Card: Document Blueprint Settings */}
        <div className="p-10 rounded-[4rem] border border-slate-100 bg-white space-y-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0" />
            <div className="space-y-1.5 flex-1">
              <div className="h-5 w-44 bg-slate-200 rounded-full" />
              <div className="h-3 w-56 bg-slate-100 rounded-full" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2.5">
              <div className="h-3 w-20 bg-slate-200 rounded-full" />
              <div className="h-10 w-full bg-slate-50 border border-slate-100 rounded-xl" />
            </div>
            <div className="space-y-2.5">
              <div className="h-3 w-16 bg-slate-200 rounded-full" />
              <div className="h-10 w-full bg-slate-50 border border-slate-100 rounded-xl" />
            </div>
          </div>

          <div className="space-y-4">
            <div className="h-3 w-32 bg-slate-200 rounded-full" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-10 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center">
                  <div className="h-3 w-8 bg-slate-200 rounded-full" />
                </div>
              ))}
            </div>
          </div>

          <div className="h-14 w-full bg-slate-200 rounded-full" />
        </div>

        {/* Right Card: Cover Letter Builder */}
        <div className="p-10 rounded-[4rem] border border-slate-100 bg-white space-y-8">
          <div className="flex items-center justify-between">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0" />
            <div className="h-6 w-24 bg-slate-100 rounded-full" />
          </div>

          <div className="space-y-4">
            <div className="h-5 w-48 bg-slate-200 rounded-full" />
            <div className="h-3 w-72 bg-slate-100 rounded-full" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="h-3 w-16 bg-slate-200 rounded-full" />
              <div className="h-10 w-full bg-slate-50 border border-slate-100 rounded-xl" />
            </div>
            <div className="space-y-2">
              <div className="h-3 w-20 bg-slate-200 rounded-full" />
              <div className="h-10 w-full bg-slate-50 border border-slate-100 rounded-xl" />
            </div>
          </div>

          <div className="h-14 w-full bg-slate-200 rounded-full" />
        </div>
      </div>

      {/* ── A4 Sheet Document Blueprint Preview Placeholder (Divider & Sheet layout) ── */}
      <div className="pt-10 border-t border-slate-100 mt-16 space-y-8">
        <div className="flex justify-center">
          <div className="h-4 w-48 bg-slate-200 rounded-full" />
        </div>

        {/* Mock A4 document container */}
        <div className="max-w-3xl mx-auto p-12 bg-white border border-slate-200 rounded-2xl shadow-xl min-h-[800px] flex flex-col space-y-8 relative overflow-hidden">
          {/* Header section */}
          <div className="space-y-4 flex flex-col items-center border-b border-slate-100 pb-8">
            <div className="h-7 w-48 bg-slate-200 rounded-full" />
            <div className="flex gap-4 flex-wrap justify-center">
              <div className="h-3 w-28 bg-slate-100 rounded-full" />
              <div className="h-3 w-20 bg-slate-100 rounded-full" />
              <div className="h-3 w-24 bg-slate-100 rounded-full" />
            </div>
          </div>

          {/* Professional Summary */}
          <div className="space-y-3">
            <div className="h-4 w-36 bg-slate-200 rounded-full" />
            <div className="space-y-2">
              <div className="h-3.5 w-full bg-slate-100 rounded-full" />
              <div className="h-3.5 w-full bg-slate-100 rounded-full" />
              <div className="h-3.5 w-5/6 bg-slate-100 rounded-full" />
            </div>
          </div>

          {/* Education Block */}
          <div className="space-y-4">
            <div className="h-4 w-28 bg-slate-200 rounded-full" />
            <div className="flex justify-between items-center">
              <div className="h-3.5 w-52 bg-slate-100 rounded-full" />
              <div className="h-3 w-16 bg-slate-100 rounded-full" />
            </div>
          </div>

          {/* Professional Experience */}
          <div className="space-y-6">
            <div className="h-4 w-44 bg-slate-200 rounded-full" />
            
            {[1, 2].map((i) => (
              <div key={i} className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="h-3.5 w-64 bg-slate-200 rounded-full" />
                  <div className="h-3 w-24 bg-slate-100 rounded-full" />
                </div>
                <div className="space-y-2 pl-4">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-200 shrink-0" />
                    <div className="h-3.5 w-11/12 bg-slate-100 rounded-full" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-200 shrink-0" />
                    <div className="h-3.5 w-5/6 bg-slate-100 rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Skills Block */}
          <div className="space-y-4">
            <div className="h-4 w-20 bg-slate-200 rounded-full" />
            <div className="flex flex-wrap gap-2.5">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="h-6 w-20 bg-slate-100 rounded-md" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
