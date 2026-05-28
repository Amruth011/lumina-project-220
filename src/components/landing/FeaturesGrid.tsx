"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Sparkles, 
  Terminal, 
  ShieldCheck, 
  FileText, 
  Compass, 
  Cpu, 
  Flame, 
  ArrowUpRight, 
  CheckCircle2, 
  CpuIcon 
} from 'lucide-react';

interface FeatureCardProps {
  title: string;
  description: string;
  badge?: string;
  index: number;
  preview: React.ReactNode;
}

const FeatureCard = ({ title, description, badge, index, preview }: FeatureCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.7, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
      className="group relative flex flex-col bg-white border border-slate-100 hover:border-emerald-500/20 rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-[0_30px_70px_rgba(16,185,129,0.06)] transition-all duration-500 h-full"
    >
      {/* ── Visual Top Preview Area (Neutral background sandbox) ── */}
      <div className="relative h-60 w-full bg-slate-50/50 border-b border-slate-100/50 flex items-center justify-center p-6 overflow-hidden">
        {/* Soft decorative glow */}
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-100/20 via-transparent to-emerald-50/10 pointer-events-none" />
        {preview}
      </div>

      {/* ── Text Content Area (Clean distinct white block) ── */}
      <div className="flex-1 p-8 flex flex-col justify-between space-y-4 bg-white relative z-10">
        <div className="space-y-2">
          {badge && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              {badge}
            </span>
          )}
          <h3 className="text-xl font-bold text-slate-800 tracking-tight flex items-center justify-between group-hover:text-emerald-600 transition-colors">
            {title}
            <ArrowUpRight size={16} className="text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300" />
          </h3>
          <p className="text-[13px] font-medium leading-relaxed text-slate-500">
            {description}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export const FeaturesGrid = () => {
  return (
    <section id="features" className="bg-[#F8FAFC] py-32 px-6 relative overflow-hidden">
      {/* Soft ambient backgrounds */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-24 relative z-10">
        
        {/* ── Centralized Section Header ── */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100">
            <Sparkles size={11} className="text-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">Total Intelligence Ecosystem</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-bold text-slate-800 tracking-tight">
            Magic Tools to <span className="text-emerald-500">Beat the System.</span>
          </h2>
          <p className="text-base md:text-lg text-slate-500 font-medium max-w-2xl mx-auto">
            Not just simple keyword stuffing — Lumina maps career intelligence directly to recruiter behavior, helping you bypass the noise and command interviews.
          </p>
        </div>

        {/* ── 3-Column Bento Grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          
          {/* Card 1: Job Description Decoder */}
          <FeatureCard
            title="Job Description Decoder"
            description="Expose hidden recruiter filters, extract core competencies, and reveal secret target keywords instantly."
            badge="Forensic Intelligence"
            index={0}
            preview={
              <div className="relative w-full max-w-[280px] h-[160px] bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-4 font-mono text-[9px] text-slate-300 flex flex-col justify-between overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                  </div>
                  <span className="text-slate-500 text-[8px] uppercase tracking-wider">jd_scanner_main.log</span>
                </div>
                <div className="space-y-1.5 flex-1 select-none pointer-events-none">
                  <p className="text-emerald-400 font-semibold flex items-center gap-1">
                    <Terminal size={9} /> {">"} Scan successfully completed.
                  </p>
                  <p className="text-slate-400">
                    [MATCH_TARGET]: <span className="text-emerald-400 font-bold bg-emerald-500/10 px-1 rounded">System Design (Weight: 92%)</span>
                  </p>
                  <p className="text-slate-400">
                    [ATS_HIDDEN_KEYWORDS]: <span className="text-amber-400 font-bold bg-amber-500/10 px-1 rounded">Kubernetes, gRPC, RAG</span>
                  </p>
                  <p className="text-slate-400">
                    [DESPERATION_INDEX]: <span className="text-rose-400 font-semibold bg-rose-500/10 px-1 rounded">Extreme (Hiring urgently)</span>
                  </p>
                </div>
                <div className="flex items-center justify-between text-[8px] border-t border-slate-800 pt-2 text-slate-500">
                  <span>FORENSIC REPORT GENERATED</span>
                  <span className="animate-pulse text-emerald-400">● SCAN ACTIVE</span>
                </div>
              </div>
            }
          />

          {/* Card 2: Resume Analysis */}
          <FeatureCard
            title="Resume Analysis"
            description="Audit your profile against corporate ATS metrics to pinpoint critical skill gaps instantly."
            badge="Gap Diagnostics"
            index={1}
            preview={
              <div className="relative w-full max-w-[280px] h-[160px] bg-white border border-slate-100 rounded-2xl shadow-xl p-4 flex flex-col justify-between overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-slate-800">ATS Verdict Scan</span>
                  <span className="px-2 py-0.5 bg-rose-50 border border-rose-100 rounded-full text-[8px] font-bold text-rose-500">1 Critical Gap</span>
                </div>
                <div className="flex items-center justify-center gap-6 my-2">
                  {/* Circle score chart */}
                  <div className="relative w-18 h-18 rounded-full border-4 border-slate-100 border-t-emerald-500 flex items-center justify-center animate-pulse">
                    <span className="text-lg font-black text-slate-800">85%</span>
                  </div>
                  {/* Small stats breakdown */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className="text-[9px] font-bold text-slate-400">Keyword Density: 90%</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className="text-[9px] font-bold text-slate-400">Structure Score: 95%</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                      <span className="text-[9px] font-bold text-rose-500">Missing Skill: gRPC</span>
                    </div>
                  </div>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-[85%]" />
                </div>
              </div>
            }
          />

          {/* Card 3: Resume Generation */}
          <FeatureCard
            title="Resume Generation"
            description="Forge a flawless, single-page professional profile optimized structurally to clear corporate gatekeepers."
            badge="Precision Compiler"
            index={2}
            preview={
              <div className="relative w-full max-w-[280px] h-[160px] bg-white border border-slate-100 rounded-2xl shadow-xl p-3 flex gap-3 overflow-hidden select-none pointer-events-none">
                {/* Mini Resume template */}
                <div className="flex-1 border border-slate-100 rounded-lg p-2.5 flex flex-col justify-between bg-slate-50/50">
                  <div className="space-y-1.5">
                    <div className="h-2 w-14 bg-slate-800 rounded" />
                    <div className="h-1 w-20 bg-slate-300 rounded" />
                    <div className="h-px bg-slate-200 my-1" />
                    <div className="space-y-1">
                      <div className="h-1.5 w-full bg-slate-200 rounded" />
                      <div className="h-1.5 w-11/12 bg-slate-200 rounded" />
                      <div className="h-1.5 w-8/12 bg-slate-200 rounded" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="h-2 w-10 bg-slate-300 rounded" />
                    <div className="flex items-center gap-1 text-[8px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded">
                      <CheckCircle2 size={8} /> A4 Fit
                    </div>
                  </div>
                </div>
                
                {/* Visual Settings Side Panel */}
                <div className="w-20 border border-slate-100 rounded-lg p-2 bg-white flex flex-col justify-between">
                  <span className="text-[7px] font-black uppercase text-slate-400">Settings</span>
                  <div className="space-y-1.5">
                    <div className="h-2.5 w-full bg-slate-100 rounded flex items-center px-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                    </div>
                    <div className="h-2.5 w-full bg-emerald-500 rounded flex items-center px-1 justify-between">
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    </div>
                  </div>
                  <div className="h-2.5 w-full bg-slate-900 rounded text-[6px] text-white font-bold flex items-center justify-center">
                    EXPORT
                  </div>
                </div>
              </div>
            }
          />

          {/* Card 4: Cover Letter Generation */}
          <FeatureCard
            title="Cover Letter Generation"
            description="Draft hyper-targeted narrative pitches matching your background perfectly to the employer's tone."
            badge="Narrative Architect"
            index={3}
            preview={
              <div className="relative w-full max-w-[280px] h-[160px] bg-white border border-slate-100 rounded-2xl shadow-xl p-4 flex flex-col justify-between overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-1.5">
                    <FileText size={10} className="text-emerald-500" />
                    <span className="text-[9px] font-bold text-slate-800">Target Cover Letter</span>
                  </div>
                  <span className="text-[8px] font-black text-emerald-600 tracking-wider">TONE: Confident</span>
                </div>
                
                <div className="space-y-1.5 my-2.5 flex-1 select-none pointer-events-none">
                  <div className="h-1.5 w-24 bg-slate-400 rounded" />
                  <p className="text-[8px] text-slate-500 leading-relaxed font-serif italic">
                    "I am writing to express my strong interest in the Software Engineer position. Given my background building scalable, secure gRPC servers..."
                  </p>
                  <div className="h-1 w-full bg-slate-200 rounded" />
                </div>
                
                {/* Tone Calibrator Slider */}
                <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[7px] text-slate-400 font-bold uppercase">
                  <span>Surgical</span>
                  <div className="flex-1 mx-3 h-1 bg-slate-100 rounded-full relative">
                    <div className="absolute top-1/2 left-2/3 -translate-y-1/2 w-2 h-2 bg-emerald-500 rounded-full" />
                  </div>
                  <span>Confident</span>
                </div>
              </div>
            }
          />

          {/* Card 5: Roadmap Generation */}
          <FeatureCard
            title="Roadmap Generation"
            description="Receive a step-by-step technical interview preparation playbook customized to the role's precise requirements."
            badge="Adaptive Upskilling"
            index={4}
            preview={
              <div className="relative w-full max-w-[280px] h-[160px] bg-white border border-slate-100 rounded-2xl shadow-xl p-4 flex flex-col justify-between overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-1.5">
                    <Compass size={11} className="text-emerald-500 animate-spin" style={{ animationDuration: '8s' }} />
                    <span className="text-[9px] font-bold text-slate-800">Upskilling Roadmap</span>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-100 rounded-full text-[8px] font-bold text-emerald-600">4 Weeks</span>
                </div>
                
                {/* Interactive milestone timeline */}
                <div className="space-y-2.5 my-2.5 flex-1 select-none pointer-events-none">
                  <div className="flex items-center gap-3">
                    <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[7px] font-bold">1</span>
                    <div className="space-y-0.5">
                      <div className="h-1.5 w-28 bg-slate-700 rounded" />
                      <div className="h-1 w-20 bg-slate-300 rounded" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-4 h-4 rounded-full border border-slate-200 text-slate-400 flex items-center justify-center text-[7px] font-bold">2</span>
                    <div className="space-y-0.5">
                      <div className="h-1.5 w-20 bg-slate-400 rounded" />
                      <div className="h-1 w-14 bg-slate-300 rounded" />
                    </div>
                  </div>
                </div>
                
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-[50%]" />
                </div>
              </div>
            }
          />

          {/* Card 6: Autonomous Job Agent */}
          <FeatureCard
            title="Autonomous Job Agent"
            description="Deploy a dedicated background worker to discover, match, and submit optimized applications for you while you sleep."
            badge="Auto-pilot Agent"
            index={5}
            preview={
              <div className="relative w-full max-w-[280px] h-[160px] bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-4 flex flex-col justify-between overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-1.5">
                    <Cpu size={10} className="text-emerald-400 animate-pulse" />
                    <span className="text-[9px] font-bold text-white">Lumina Background Agent</span>
                  </div>
                  <span className="animate-pulse flex items-center gap-1 text-[8px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                    <span className="w-1 h-1 rounded-full bg-emerald-400 animate-ping" /> AUTO-PILOT
                  </span>
                </div>
                
                {/* Agent searching animation view */}
                <div className="relative flex-1 my-2.5 flex items-center justify-center select-none pointer-events-none">
                  {/* Pulsing radar lines */}
                  <div className="absolute w-16 h-16 rounded-full border border-emerald-500/25 animate-ping" style={{ animationDuration: '3s' }} />
                  <div className="absolute w-24 h-24 rounded-full border border-emerald-500/15 animate-ping" style={{ animationDuration: '5s' }} />
                  
                  <div className="relative z-10 w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400">
                    <CpuIcon size={16} className="animate-pulse" />
                  </div>
                  
                  {/* Application counts */}
                  <div className="absolute top-2 left-6 text-[8px] bg-slate-800/80 px-1.5 py-0.5 rounded text-slate-400 border border-slate-700/50">
                    Matches Found: 12
                  </div>
                  <div className="absolute bottom-2 right-4 text-[8px] bg-emerald-500/10 px-1.5 py-0.5 rounded text-emerald-400 border border-emerald-500/20">
                    Jobs Applied: 4
                  </div>
                </div>
                
                <div className="text-[8px] text-slate-500 text-center uppercase tracking-widest font-mono">
                  AGENT RUNNING IN BACKGROUND
                </div>
              </div>
            }
          />

        </div>
      </div>
    </section>
  );
};

export default FeaturesGrid;
