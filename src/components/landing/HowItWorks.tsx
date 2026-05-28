"use client";

import React from "react";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, CloudUpload, ShieldAlert, Cpu, Award } from "lucide-react";

interface StepItem {
  number: string;
  title: string;
  description: string;
  subtext: string;
  icon: React.ReactNode;
  badge: string;
}

const steps: StepItem[] = [
  {
    number: "01",
    title: "Drop the Role",
    description: "Paste any corporate job description text or link directly into the intake dashboard.",
    subtext: "Instantly activates deep semantic analysis to decode hidden recruiter filters.",
    icon: <CloudUpload size={22} className="text-emerald-500" />,
    badge: "Semantic Ingest"
  },
  {
    number: "02",
    title: "Generate Your Arsenal",
    description: "Review your automated skill-gap analysis and export your tailored career assets.",
    subtext: "Instantly architects an ATS-optimized single-page resume, tailored cover letter, and interview prep roadmap.",
    icon: <Award size={22} className="text-emerald-500" />,
    badge: "Tactical Synthesis"
  },
  {
    number: "03",
    title: "Deploy the Agent",
    description: "Toggle on the automation switch to launch your background application helper.",
    subtext: "Unleashes an autonomous worker to continuously match profiles and submit applications for you while you sleep.",
    icon: <Cpu size={22} className="text-emerald-500" />,
    badge: "Auto-Pilot Apply"
  }
];

export const HowItWorks = () => {
  return (
    <section id="how-it-works" className="bg-white py-32 px-6 relative overflow-hidden border-t border-black/[0.02]">
      {/* Subtle ambient glows for visual wow */}
      <div className="absolute top-1/4 right-0 w-96 h-96 rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-0 w-80 h-80 rounded-full bg-teal-500/5 blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-20 relative z-10">
        
        {/* ── Centralized Section Header ── */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100/50">
            <Sparkles size={11} className="text-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">Precision Blueprint</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-800 tracking-tight">
            How It Works Step-by-Step
          </h2>
          <p className="text-base md:text-lg text-slate-500 font-medium max-w-2xl mx-auto">
            Our three-phase executive pipeline automates target decoding, profiles architecture, and passive corporate submissions.
          </p>
        </div>

        {/* ── 3-Step Linear Progress Grid ── */}
        <div className="relative grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-8 max-w-6xl mx-auto pt-6">
          
          {/* Horizontal Connecting Progress Line (Desktop Only) */}
          <div className="hidden lg:block absolute top-[68px] left-[15%] right-[15%] h-[2px] bg-slate-100 z-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 via-emerald-500/40 to-slate-200" />
          </div>

          {steps.map((step, idx) => {
            return (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.7, delay: idx * 0.15, ease: [0.16, 1, 0.3, 1] }}
                className="group relative flex flex-col bg-slate-50/50 border border-slate-100 hover:border-emerald-500/20 rounded-[2.5rem] p-8 space-y-6 shadow-sm hover:shadow-[0_20px_50px_rgba(16,185,129,0.04)] transition-all duration-500 bg-white"
              >
                {/* Visual Step Header (Icon + Number Pill) */}
                <div className="flex items-center justify-between relative z-10">
                  <div className="w-[56px] h-[56px] rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300">
                    {step.icon}
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                      {step.badge}
                    </span>
                    <span className="font-mono text-3xl font-black text-slate-200 group-hover:text-emerald-500/20 transition-colors">
                      {step.number}
                    </span>
                  </div>
                </div>

                {/* Text Content */}
                <div className="space-y-3 flex-1">
                  <h3 className="text-xl font-bold text-slate-800 tracking-tight group-hover:text-emerald-600 transition-colors flex items-center gap-2">
                    Step {idx + 1}: {step.title}
                  </h3>
                  <p className="text-[13px] font-medium leading-relaxed text-slate-500">
                    {step.description}
                  </p>
                </div>

                {/* Tactical System Subtext (Executive code highlight box) */}
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-emerald-500" />
                  <div className="flex gap-2">
                    <span className="text-[9.5px] font-mono font-black text-emerald-600 uppercase tracking-widest leading-none pt-0.5">SUBTEXT:</span>
                    <p className="text-[11px] font-medium leading-relaxed text-slate-500 font-body">
                      {step.subtext}
                    </p>
                  </div>
                </div>

              </motion.div>
            );
          })}

        </div>

        {/* ── Dynamic Bottom Call to Action Strip ── */}
        <div className="flex items-center justify-center pt-8">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="flex flex-wrap items-center gap-4 bg-slate-50 border border-slate-100 p-4.5 rounded-full text-center justify-center max-w-2xl px-8"
          >
            <span className="text-xs font-bold text-slate-600">Ready to audit your active profile instantly?</span>
            <a href="/dashboard" className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-600 hover:text-emerald-700 transition-colors">
              Launch Tactical Dashboard <ArrowRight size={13} className="animate-pulse" />
            </a>
          </motion.div>
        </div>

      </div>
    </section>
  );
};

export default HowItWorks;
