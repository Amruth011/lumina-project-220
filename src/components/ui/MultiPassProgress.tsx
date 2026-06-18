import React from "react";
import { motion } from "framer-motion";
import { BrainCircuit, Cpu, Sparkles, CheckCircle2 } from "lucide-react";
import type { PipelineProgress } from "@/types/bulletGenerator";

interface MultiPassProgressProps {
  progress: PipelineProgress;
}

export const MultiPassProgress = ({ progress }: MultiPassProgressProps) => {
  const steps = [
    { key: "mapping", label: "Pass 1: Ingestion & Mapping", icon: BrainCircuit, desc: "Comparing JD constraints against resume facts" },
    { key: "generating", label: "Pass 2: STAR Synthesis", icon: Sparkles, desc: "Drafting Metric, Impact, and Tech variants" },
    { key: "polishing", label: "Pass 3: Guardrail Audit", icon: Cpu, desc: "Validating claims and filtering hallucinations" }
  ];

  const getStepStatus = (stepKey: string) => {
    if (progress.stage === "complete") return "complete";
    if (progress.stage === stepKey) return "active";
    
    const stageIndex = steps.findIndex(s => s.key === progress.stage);
    const stepIndex = steps.findIndex(s => s.key === stepKey);
    
    if (stageIndex > stepIndex) return "complete";
    return "pending";
  };

  return (
    <div className="glass-panel p-8 rounded-[2.5rem] bg-white border border-white/20 shadow-xl space-y-6 max-w-xl mx-auto">
      <div className="flex flex-col items-center justify-center text-center space-y-2">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-lumina-teal/20 border-t-lumina-teal animate-spin" />
          <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-lumina-teal animate-pulse" />
        </div>
        <h3 className="text-lg font-serif italic text-foreground mt-4">Calibrating Tailoring Matrix</h3>
        <p className="text-[10px] font-black uppercase tracking-widest text-[#1E2A3A]/40">
          {progress.percent}% Completed
        </p>
      </div>

      <div className="space-y-4">
        {steps.map((step, idx) => {
          const status = getStepStatus(step.key);
          const StepIcon = step.icon;

          return (
            <div 
              key={step.key} 
              className={`flex items-start gap-4 p-4 rounded-2xl border transition-all ${
                status === "active" 
                  ? "bg-lumina-teal/5 border-lumina-teal/30 shadow-md" 
                  : status === "complete" 
                  ? "bg-black/[0.01] border-black/5 opacity-80" 
                  : "border-transparent opacity-40"
              }`}
            >
              <div className="mt-0.5">
                {status === "complete" ? (
                  <div className="w-6 h-6 rounded-full bg-accent-emerald/15 border border-accent-emerald/30 flex items-center justify-center text-accent-emerald">
                    <CheckCircle2 size={14} />
                  </div>
                ) : (
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${
                    status === "active" 
                      ? "bg-lumina-teal/15 border-lumina-teal/30 text-lumina-teal animate-pulse" 
                      : "bg-muted border-muted-foreground/15 text-muted-foreground/40"
                  }`}>
                    <StepIcon size={12} />
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-0.5">
                <h4 className={`text-xs font-semibold ${status === "active" ? "text-lumina-teal" : "text-foreground/80"}`}>
                  {step.label}
                </h4>
                <p className="text-[10px] text-muted-foreground leading-normal">
                  {step.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
        <motion.div 
          className="bg-lumina-teal h-1.5 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress.percent}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <p className="text-center text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">
        {progress.message}
      </p>
    </div>
  );
};
