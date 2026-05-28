"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  ArrowRight,
  CloudUpload,
  Cpu,
  Award,
  Search,
  Filter,
  FileText,
  BookOpen,
  Bot,
  BarChart3,
} from "lucide-react";

// ── 3-Step linear progression ─────────────────────────────────────────────────

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
    description: "Paste any corporate job description text or URL directly into the intake dashboard.",
    subtext:
      "Semantic Ingest: Smart JD Scraping & Recruiter Filter Decoding — surfaces hidden ATS keyword layers and implicit skill weightings in seconds.",
    icon: <CloudUpload size={22} className="text-emerald-500" />,
    badge: "Semantic Ingest",
  },
  {
    number: "02",
    title: "Generate Your Arsenal",
    description: "Review your automated skill-gap analysis and export your tailored career assets.",
    subtext:
      "Tactical Synthesis: Dynamic Resume Tailoring & Interview Prep Roadmap — architects an ATS-optimized profile and a role-specific preparation playbook.",
    icon: <Award size={22} className="text-emerald-500" />,
    badge: "Tactical Synthesis",
  },
  {
    number: "03",
    title: "Deploy the Agent",
    description: "Toggle on the automation switch to launch your background application helper.",
    subtext:
      "Auto-Pilot Apply: Passive Submission Agent & Real-time Ledger Tracking — continuously matches roles and submits hands-free while you sleep.",
    icon: <Cpu size={22} className="text-emerald-500" />,
    badge: "Auto-Pilot Apply",
  },
];

// ── Capability Deep Dive — 6 subsystems ───────────────────────────────────────

interface Capability {
  step: "01" | "02" | "03";
  stepLabel: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  accentClass: string;
  badgeClass: string;
}

const capabilities: Capability[] = [
  {
    step: "01",
    stepLabel: "Semantic Ingest",
    title: "Smart JD Scraping",
    description:
      "Auto-extract structured role requirements and company-specific intelligence from any job posting URL in under 30 seconds.",
    icon: <Search size={17} className="text-emerald-400" />,
    accentClass: "border-l-emerald-500/60",
    badgeClass: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  },
  {
    step: "01",
    stepLabel: "Semantic Ingest",
    title: "Recruiter Filter Decoding",
    description:
      "Surface the hidden ATS keyword layers, implicit skill weightings, and behavioral preference signals recruiters embed in every JD.",
    icon: <Filter size={17} className="text-emerald-400" />,
    accentClass: "border-l-emerald-500/60",
    badgeClass: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  },
  {
    step: "02",
    stepLabel: "Tactical Synthesis",
    title: "Dynamic Resume Tailoring",
    description:
      "Algorithmically restructure your profile to align with target JD skill weights, section priorities, and ATS parsing logic.",
    icon: <FileText size={17} className="text-teal-400" />,
    accentClass: "border-l-teal-500/60",
    badgeClass: "bg-teal-500/10 text-teal-600 border-teal-500/20",
  },
  {
    step: "02",
    stepLabel: "Tactical Synthesis",
    title: "Interview Prep Roadmap",
    description:
      "Generate a role-specific technical preparation playbook covering every tool, framework, and system the interviewer will probe.",
    icon: <BookOpen size={17} className="text-teal-400" />,
    accentClass: "border-l-teal-500/60",
    badgeClass: "bg-teal-500/10 text-teal-600 border-teal-500/20",
  },
  {
    step: "03",
    stepLabel: "Auto-Pilot Apply",
    title: "Passive Submission Agent",
    description:
      "Continuously discovers matching open roles (score ≥ 85%) across LinkedIn, Indeed, and 30+ boards — submitting hands-free while you sleep.",
    icon: <Bot size={17} className="text-blue-400" />,
    accentClass: "border-l-blue-500/60",
    badgeClass: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  },
  {
    step: "03",
    stepLabel: "Auto-Pilot Apply",
    title: "Real-time Ledger Tracking",
    description:
      "Maintains an intelligent live dashboard of every application, follow-up signal, and offer progression across your entire pipeline.",
    icon: <BarChart3 size={17} className="text-blue-400" />,
    accentClass: "border-l-blue-500/60",
    badgeClass: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export const HowItWorks = () => {
  return (
    <section
      id="how-it-works"
      className="bg-white py-32 px-6 relative overflow-hidden border-t border-black/[0.02]"
    >
      {/* Ambient glows */}
      <div className="absolute top-1/4 right-0 w-96 h-96 rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-0 w-80 h-80 rounded-full bg-teal-500/5 blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-24 relative z-10">

        {/* ── Section Header ── */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100/50">
            <Sparkles size={11} className="text-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">
              Precision Blueprint
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-800 tracking-tight">
            How It Works Step-by-Step
          </h2>
          <p className="text-base md:text-lg text-slate-500 font-medium max-w-2xl mx-auto">
            Our three-phase executive pipeline automates target decoding, resume
            architecture, and passive corporate submissions.
          </p>
        </div>

        {/* ── 3-Step Linear Progress Grid ── */}
        <div className="relative grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-8 max-w-6xl mx-auto">

          {/* Connecting line — desktop only */}
          <div className="hidden lg:block absolute top-[68px] left-[15%] right-[15%] h-[2px] bg-slate-100 z-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 via-emerald-500/40 to-slate-200" />
          </div>

          {steps.map((step, idx) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.7, delay: idx * 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="group relative flex flex-col bg-white border border-slate-100 hover:border-emerald-500/20 rounded-[2.5rem] p-8 space-y-6 shadow-sm hover:shadow-[0_20px_50px_rgba(16,185,129,0.04)] transition-all duration-500"
            >
              {/* Icon + step number */}
              <div className="flex items-center justify-between relative z-10">
                <div className="w-[56px] h-[56px] rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300">
                  {step.icon}
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2.5 py-0.5 rounded-full`}>
                    {step.badge}
                  </span>
                  <span className="font-mono text-3xl font-black text-slate-200 group-hover:text-emerald-500/20 transition-colors">
                    {step.number}
                  </span>
                </div>
              </div>

              {/* Text */}
              <div className="space-y-3 flex-1">
                <h3 className="text-xl font-bold text-slate-800 tracking-tight group-hover:text-emerald-600 transition-colors">
                  Step {idx + 1}: {step.title}
                </h3>
                <p className="text-[13px] font-medium leading-relaxed text-slate-500">
                  {step.description}
                </p>
              </div>

              {/* Subtext code block */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-emerald-500" />
                <div className="flex gap-2">
                  <span className="text-[9.5px] font-mono font-black text-emerald-600 uppercase tracking-widest leading-none pt-0.5 shrink-0">
                    SYS:
                  </span>
                  <p className="text-[11px] font-medium leading-relaxed text-slate-500">
                    {step.subtext}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* ── Capability Deep Dive ── */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="bg-slate-50/80 border border-slate-100 rounded-[2.5rem] p-10 md:p-14 space-y-12 max-w-6xl mx-auto"
        >
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200/80">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                Capability Deep Dive
              </span>
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">
              Six Core Systems Behind Every Application
            </h3>
            <p className="text-sm text-slate-500 max-w-xl mx-auto font-medium leading-relaxed">
              Each phase of the executive pipeline maps to two precision-engineered
              subsystems running in tandem across your career strategy.
            </p>
          </div>

          {/* 3×2 Capability Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {capabilities.map((cap, i) => (
              <motion.div
                key={cap.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                className={`group relative flex flex-col gap-4 bg-white border border-slate-100 border-l-[3px] ${cap.accentClass} rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-slate-200 transition-all duration-300`}
              >
                {/* Icon + step badge */}
                <div className="flex items-start justify-between">
                  <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    {cap.icon}
                  </div>
                  <span className={`text-[8px] font-black uppercase tracking-[0.25em] px-2 py-0.5 rounded-full border ${cap.badgeClass}`}>
                    Step {cap.step}
                  </span>
                </div>

                {/* Text */}
                <div className="space-y-1.5">
                  <h4 className="text-[14px] font-bold text-slate-800 tracking-tight leading-tight group-hover:text-emerald-700 transition-colors">
                    {cap.title}
                  </h4>
                  <p className="text-[12px] font-medium leading-relaxed text-slate-500">
                    {cap.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ── Bottom CTA Strip ── */}
        <div className="flex items-center justify-center">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="flex flex-wrap items-center gap-4 bg-slate-50 border border-slate-100 py-4 px-8 rounded-full text-center justify-center max-w-2xl"
          >
            <span className="text-xs font-bold text-slate-600">
              Ready to audit your active profile instantly?
            </span>
            <a
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              Launch Tactical Dashboard <ArrowRight size={13} className="animate-pulse" />
            </a>
          </motion.div>
        </div>

      </div>
    </section>
  );
};

export default HowItWorks;
