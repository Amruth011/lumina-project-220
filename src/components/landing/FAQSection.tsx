"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus, ArrowRight } from "lucide-react";

const faqs = [
  {
    question: "How does the Job Description Decoder actually work?",
    answer:
      "Lumina runs your targeted job text through a specialized Llama 3.3 70B layer. It instantly cross-references standard recruiter templates to isolate hidden target keywords, critical technical competencies, and strict algorithmic ATS filtering logic.",
  },
  {
    question: "Is Lumina truly free to use?",
    answer:
      "Yes. Our entire core toolkit—including job description decoding, resume analysis, single-page profile generation, cover letter drafting, and interview roadmaps—runs 100% free on the sovereign Antigravity edge tier.",
  },
  {
    question: "Will my generated resume clear strict corporate ATS filters?",
    answer:
      "Absolutely. Lumina intentionally formats all output documents into single-column, high-scannability structured layouts explicitly optimized for corporate applicant tracking systems, completely eliminating parser formatting errors.",
  },
  {
    question: "When will the Autonomous Job Application Agent be fully deployed?",
    answer:
      "The background application agent layer is actively in development. Once launched, it will process bulk matches in your browser environment to submit highly optimized, tailored applications completely on autopilot while you sleep.",
  },
];

export const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (i: number) => setOpenIndex(openIndex === i ? null : i);

  return (
    <section
      id="faq"
      className="bg-white py-32 px-6 border-t border-black/[0.03] relative overflow-hidden"
    >
      {/* Ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-emerald-500/[0.035] rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-3xl mx-auto relative z-10 space-y-16">

        {/* ── Header ── */}
        <div className="text-center space-y-4">
          <span className="text-lumina-teal font-display font-bold text-[10px] uppercase tracking-[0.3em]">
            FAQ
          </span>
          <h2 className="text-4xl md:text-5xl font-helvetica font-bold text-lumina-navy leading-tight">
            Got Questions?{" "}
            <span className="italic text-lumina-teal">We've Got Answers.</span>
          </h2>
          <p className="text-lumina-navy/50 font-body text-base max-w-xl mx-auto leading-relaxed">
            Everything you need to know about navigating your career automation
            pipeline with Lumina.
          </p>
        </div>

        {/* ── Accordion ── */}
        <div className="space-y-3">
          {faqs.map((faq, i) => {
            const isOpen = openIndex === i;
            return (
              <motion.div
                key={i}
                layout
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                  isOpen
                    ? "border-emerald-500/30 bg-emerald-50/40 shadow-[0_8px_30px_rgba(16,185,129,0.08)]"
                    : "border-slate-100 bg-white hover:border-slate-200 shadow-sm hover:shadow-md"
                }`}
              >
                {/* Row trigger */}
                <button
                  onClick={() => toggle(i)}
                  className="w-full flex items-center justify-between gap-6 px-7 py-6 text-left group"
                  aria-expanded={isOpen}
                >
                  <span
                    className={`text-[15px] font-bold leading-snug tracking-tight transition-colors duration-200 ${
                      isOpen ? "text-emerald-700" : "text-slate-800 group-hover:text-slate-900"
                    }`}
                  >
                    {faq.question}
                  </span>

                  <motion.div
                    animate={{ rotate: isOpen ? 0 : 0 }}
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-300 ${
                      isOpen
                        ? "bg-emerald-500 border-emerald-500 text-white"
                        : "bg-transparent border-slate-200 text-slate-400 group-hover:border-slate-300"
                    }`}
                  >
                    {isOpen ? (
                      <Minus size={14} strokeWidth={2.5} />
                    ) : (
                      <Plus size={14} strokeWidth={2.5} />
                    )}
                  </motion.div>
                </button>

                {/* Animated answer panel */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="answer"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="px-7 pb-6">
                        <div className="w-full h-px bg-emerald-500/15 mb-5" />
                        <p className="text-[14px] font-body text-slate-600 leading-[1.75]">
                          {faq.answer}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {/* ── Still Have Questions callout ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-slate-50 border border-slate-100 rounded-2xl px-8 py-6"
        >
          <div className="space-y-1 text-center sm:text-left">
            <p className="text-[15px] font-bold text-slate-800">
              Still have questions?
            </p>
            <p className="text-[13px] text-slate-500 font-body">
              We are always here to help.
            </p>
          </div>

          <a
            href="mailto:support@lumina.ai"
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-emerald-600 text-white text-[13px] font-bold px-5 py-3 rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/15 group whitespace-nowrap"
          >
            Contact Support
            <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
          </a>
        </motion.div>

      </div>
    </section>
  );
};

export default FAQSection;
