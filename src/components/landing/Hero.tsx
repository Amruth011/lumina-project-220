"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Search, FileText, Compass, Bot } from 'lucide-react';

const MagneticButton = ({ children }: { children: React.ReactNode }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const [position, setPosition] = React.useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    const { left, top, width, height } = ref.current?.getBoundingClientRect() || { left: 0, top: 0, width: 0, height: 0 };
    setPosition({ x: (clientX - (left + width / 2)) * 0.15, y: (clientY - (top + height / 2)) * 0.15 });
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setPosition({ x: 0, y: 0 })}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: "spring", stiffness: 150, damping: 15, mass: 0.1 }}
    >
      {children}
    </motion.div>
  );
};

/* ── Company names for the background watermark marquee ── */
const companies = [
  "Google", "Amazon", "Meta", "McKinsey", "Deloitte", "OpenAI",
  "Microsoft", "Stripe", "Netflix", "Apple", "Uber", "Airbnb", "Goldman Sachs",
];

const features = [
  {
    title: "JD Decoding & Resume Analysis",
    description: "Instantly scan any job description to uncover hidden keywords and map your precise skills gap.",
    icon: <Search className="w-5 h-5" />,
    comingSoon: false
  },
  {
    title: "Resume & Cover Letter Generation",
    description: "Automatically generate an elite, single-page resume and a tailored cover letter optimized to clear corporate filters.",
    icon: <FileText className="w-5 h-5" />,
    comingSoon: false
  },
  {
    title: "Career Roadmap Generation",
    description: "Get a step-by-step technical preparation playbook customized exactly to the role's requirements.",
    icon: <Compass className="w-5 h-5" />,
    comingSoon: false
  },
  {
    title: "Autonomous Job Application",
    description: "An AI Agent layer designed to automatically discover and submit optimized applications on your behalf.",
    icon: <Bot className="w-5 h-5" />,
    comingSoon: false
  }
];

export const Hero = () => {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-between bg-gradient-to-b from-[#10b981] to-[#F4F5F7] overflow-hidden pt-[18vh] pb-[12vh] text-white">
      {/* Emerald/Cyan ambient glows for extra wow factor */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-emerald-300/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/4 translate-x-1/2 translate-y-1/2 w-[500px] h-[500px] rounded-full bg-teal-300/10 blur-[120px] pointer-events-none" />

      {/* Main centered stacked content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 text-center flex-1 flex flex-col justify-center items-center gap-12 w-full">

        {/* Shunted down by 5% of viewport height using translate-y-[5vh] to place around center */}
        <div className="flex flex-col items-center gap-12 w-full translate-y-[5vh]">
          {/* Primary Headline & Subheadline block */}
          <div className="space-y-6 max-w-5xl">
            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, type: "spring", stiffness: 80 }}
              className="tracking-tight leading-[1.05] max-w-5xl mx-auto"
            >
              <span 
                className="block font-bold text-[52.4px] md:text-[78.6px] lg:text-[83.0px] text-white lg:whitespace-nowrap"
                style={{ fontFamily: 'Helvetica, "Helvetica Neue", Arial, sans-serif', letterSpacing: '0.02em' }}
              >
                The Job Market is Brutal
              </span>
              <span className="block font-serif italic font-light text-[49px] md:text-[73.4px] lg:text-[85.7px] text-white mt-4 tracking-normal drop-shadow-[0_2px_15px_rgba(16,185,129,0.25)]">
                We Built the Cheat Code.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="text-[14.7px] md:text-[16.6px] text-white/80 font-body max-w-3xl mx-auto leading-relaxed"
            >
              Stop begging corporate black holes for a chance. Lumina cracks recruiter algorithms instantly, forging a flawless, ATS-crushing weapon engineered to command interviews.
            </motion.p>
          </div>

          {/* Center CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="flex flex-col items-center gap-4 w-full"
          >
            <Link to="/dashboard">
              <MagneticButton>
                <motion.button
                  whileHover={{ scale: 1.05, translateY: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-10 py-5 bg-slate-900 hover:bg-slate-800 text-white font-bold font-display rounded-full text-xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] transition-all flex items-center gap-3 group border border-white/10"
                >
                  Decode Your First JD
                  <span className="group-hover:translate-x-1.5 transition-transform duration-200">→</span>
                </motion.button>
              </MagneticButton>
            </Link>
            <span className="text-[11px] font-display font-semibold uppercase tracking-[0.25em] text-white/50">
              Get Started Free · No Credit Card Required
            </span>
          </motion.div>
        </div>

        {/* Feature Showcase Grid Section */}
        <div className="w-full pt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
            {features.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.1, duration: 0.8 }}
                className="group relative bg-white/5 border border-white/10 hover:border-emerald-500/30 rounded-[2rem] p-8 backdrop-blur-md hover:bg-white/10 transition-all duration-300 flex flex-col gap-4 text-left h-full shadow-[0_8px_30px_rgb(0,0,0,0.05)]"
              >
                {/* Glow outline hover effect */}
                <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white group-hover:scale-110 group-hover:bg-white/20 transition-all duration-300 z-10">
                  {feature.icon}
                </div>
                <div className="space-y-2 flex-1 z-10">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-display font-bold text-[#10B981] group-hover:text-[#10B981] transition-colors tracking-tight leading-snug">
                      {feature.title}
                    </h3>
                    {feature.comingSoon && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-[9px] font-display font-bold text-emerald-300 uppercase tracking-wider">
                        Soon
                      </span>
                    )}
                  </div>
                  <p className="text-xs md:text-sm text-[#10B981] font-body leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

      </div>

      {/* ── Background company watermark marquee (absolute, bottom of hero) ── */}
      <div className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)] z-0">
        <div className="flex items-center h-full gap-16 whitespace-nowrap" style={{ animation: "hero-marquee 35s linear infinite" }}>
          {[...companies, ...companies].map((c, i) => (
            <span key={i} className="text-[20px] font-serif font-medium text-white/[0.045] select-none">
              {c}
            </span>
          ))}
        </div>
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes hero-marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
        `}} />
      </div>
    </section>
  );
};

export default Hero;
