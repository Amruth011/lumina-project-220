import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check, Zap, Target, MousePointer2, Sparkles } from "lucide-react";
import type { DecodeResult } from "@/types/jd";

interface ResumeBulletGeneratorProps {
  bullets?: string[];
  resumeText?: string;
  jdResults?: DecodeResult;
}

export const ResumeBulletGenerator = ({ bullets }: ResumeBulletGeneratorProps) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyToClipboard = (text: string, index: number) => {
    const cleanedText = text.replace(/\*\*/g, "");
    navigator.clipboard.writeText(cleanedText);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="glass-panel bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 rounded-[2.5rem] border border-white/20 space-y-8 relative overflow-hidden group h-full flex flex-col justify-between">
      <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity pointer-events-none">
        <Sparkles size={160} />
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-lumina-teal/10 border border-lumina-teal/20 text-lumina-teal">
              <Zap size={20} className="animate-pulse" />
            </div>
            <div>
              <h3 className="text-2xl font-serif italic text-foreground">Content Calibration</h3>
              <p className="text-[10px] uppercase font-black tracking-[0.2em] text-muted-foreground opacity-50 mt-1">
                Calibrated to Job Description Requirements
              </p>
            </div>
          </div>
        </div>

        {/* Static Bullets list */}
        {bullets && bullets.length > 0 ? (
          <div className="space-y-4 relative z-10">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                Calibrated Suggestions
              </span>
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border text-[9px] font-black uppercase text-muted-foreground tracking-widest">
                <MousePointer2 size={10} className="text-primary/40" />
                <span>Click to Copy</span>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {bullets.map((bullet, i) => (
                <motion.div 
                  key={i}
                  whileHover={{ x: 6 }}
                  onClick={() => copyToClipboard(bullet, i)}
                  className="group/item relative p-5 rounded-2xl bg-slate-50 border border-black/[0.04] hover:border-lumina-teal/30 hover:bg-slate-50/80 transition-all cursor-pointer overflow-hidden"
                >
                  <div className="flex gap-4 items-start">
                    <div className="flex-shrink-0 w-6 h-6 rounded-lg bg-lumina-teal/10 flex items-center justify-center text-lumina-teal text-[10px] font-black group-hover/item:bg-lumina-teal group-hover/item:text-white transition-all">
                      {i + 1}
                    </div>
                    <p className="text-[13px] font-medium text-foreground/80 leading-relaxed group-hover/item:text-foreground transition-colors flex-1">
                      {bullet.split('**').map((part, idx) => idx % 2 === 1 ? <strong key={idx} className="text-lumina-teal font-black">{part}</strong> : part)}
                    </p>
                    <div className="ml-4 opacity-0 group-hover/item:opacity-100 transition-opacity">
                      {copiedIndex === i ? (
                        <Check size={14} className="text-accent-emerald" />
                      ) : (
                        <Copy size={14} className="text-muted-foreground/40 hover:text-lumina-teal transition-colors" />
                      )}
                    </div>
                  </div>
                  {/* Copy indicator */}
                  <AnimatePresence>
                    {copiedIndex === i && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-accent-emerald/[0.04] flex items-center justify-center backdrop-blur-[1px]"
                      >
                        <span className="text-[9px] font-black uppercase tracking-widest text-accent-emerald bg-white px-3 py-1 rounded-full border border-accent-emerald/20 shadow-sm">
                          Copied to Clipboard
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-muted-foreground relative z-10">
            No suggestions generated. Please decode a job description first.
          </div>
        )}
      </div>

      {/* Tip footer */}
      <div className="flex items-center gap-4 p-5 rounded-2xl bg-white border border-black/5 relative z-10 mt-6">
        <div className="p-2 rounded-lg bg-lumina-teal/10 text-lumina-teal">
          <Target size={14} />
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          <span className="font-black uppercase text-[9px] tracking-widest mr-2 text-lumina-teal">Pro Tip:</span>
          Copy and adapt these calibrated bullet suggestions directly into your resume to match the core key result areas of the JD.
        </p>
      </div>
    </div>
  );
};
