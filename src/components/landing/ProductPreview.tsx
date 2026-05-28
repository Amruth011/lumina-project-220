import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, FileText, CheckCircle2, Terminal, ArrowRight, User, Mail, Globe } from "lucide-react";

interface RolePreset {
  id: string;
  name: string;
  score: number;
  skills: string[];
  performance: {
    label: string;
    value: string;
  }[];
  experience: {
    role: string;
    company: string;
    duration: string;
    bullets: string[];
  }[];
}

const rolePresets: RolePreset[] = [
  {
    id: "data-analyst",
    name: "Data Analyst",
    score: 94,
    skills: ["SQL Queries", "Tableau", "A/B Testing", "Python", "Amplitude", "Statistical Modeling", "PowerBI"],
    performance: [
      { label: "Conversion Rate", value: "+32%" },
      { label: "Data Fidelity", value: "99.8%" },
      { label: "Reporting Velocity", value: "-24hr" }
    ],
    experience: [
      {
        role: "Lead Data Analyst",
        company: "Alpha Analytics Corp",
        duration: "2024 - Present",
        bullets: [
          "Developed advanced **statistical modeling** frameworks and complex **SQL queries** to analyze 10M+ monthly events, driving a **+32%** increase in conversion metrics.",
          "Designed dynamic **Tableau** and **Amplitude** dashboards for executive cohorts, reducing weekly report turnaround by **-24hr** while ensuring **99.8% data fidelity**."
        ]
      }
    ]
  },
  {
    id: "ai-ml-engineer",
    name: "AI & ML Engineer",
    score: 98,
    skills: ["LangChain", "HuggingFace", "RAG Pipeline", "PyTorch", "LLM Fine-Tuning", "Vector Databases", "Deep Learning"],
    performance: [
      { label: "Inference Latency", value: "-45%" },
      { label: "Model Accuracy", value: "96.4%" },
      { label: "API Spend Redux", value: "$14k/mo" }
    ],
    experience: [
      {
        role: "Senior AI Engineer",
        company: "Neural Systems Lab",
        duration: "2023 - Present",
        bullets: [
          "Engineered a production-scale **RAG pipeline** utilizing **LangChain** and high-throughput **Vector Databases**, increasing customer intent accuracy to **96.4%**.",
          "Designed and optimized custom **LLM fine-tuning** scripts inside a distributed **PyTorch** environment, reducing hosted model inference latency by **-45%** and saving **$14k/mo** in API costs."
        ]
      }
    ]
  },
  {
    id: "data-engineer",
    name: "Data Engineer",
    score: 96,
    skills: ["Data Pipelines", "Apache Spark", "Airflow DAGs", "dbt (data build tool)", "AWS Redshift", "Snowflake", "ETL Architectures"],
    performance: [
      { label: "Data Volume Scaled", value: "100TB+" },
      { label: "Pipeline SLA Time", value: "99.99%" },
      { label: "Query Latency Redux", value: "-60%" }
    ],
    experience: [
      {
        role: "Senior Data Architect",
        company: "InfraScale Data Labs",
        duration: "2024 - Present",
        bullets: [
          "Re-architected enterprise-level **ETL architectures** and distributed **Data Pipelines** utilizing **Apache Spark** and **dbt**, scaling daily processing ingestion to **100TB+**.",
          "Engineered custom scheduling operators and **Airflow DAGs** mapped to **AWS Redshift** and **Snowflake**, accelerating query speeds by **-60%** while maintaining a strict **99.99% pipeline SLA**."
        ]
      }
    ]
  }
];

export const ProductPreview = () => {
  const [selectedRole, setSelectedRole] = useState<RolePreset>(rolePresets[1]); // Default to AI & ML Engineer
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(100);

  // Trigger analysis animation when changing roles
  const handleRoleSelect = (role: RolePreset) => {
    if (role.id === selectedRole.id) return;
    setIsAnalyzing(true);
    setProgress(0);
    
    // Simulate loading progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setSelectedRole(role);
          setIsAnalyzing(false);
          return 100;
        }
        return prev + 10;
      });
    }, 40);
  };

  // Helper to parse and bold markdown-like double stars (**text**) and render as JSX
  const renderBulletText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        const cleanText = part.slice(2, -2);
        return (
          <motion.strong 
            key={index}
            initial={{ backgroundColor: "rgba(16,185,129,0.15)", color: "#10B981" }}
            animate={{ backgroundColor: "rgba(16,185,129,0)", color: "#0F172A" }}
            transition={{ delay: 0.1, duration: 1.5 }}
            className="font-bold px-0.5 rounded transition-all inline"
          >
            {cleanText}
          </motion.strong>
        );
      }
      return part;
    });
  };

  return (
    <section className="bg-gradient-to-b from-[#F8FAFC] to-[#F4F5F7] py-32 px-6 relative overflow-hidden border-t border-black/[0.02]">
      {/* Decorative ambient glowing grids */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none" />
      
      <div className="max-w-7xl mx-auto space-y-16 relative z-10">
        
        {/* ── Centralized Section Header ── */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100/50">
            <Sparkles size={11} className="text-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">The ATS Morphing Engine</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-800 tracking-tight">
            Interactive Live Preview
          </h2>
          <p className="text-base md:text-lg text-slate-500 font-medium max-w-2xl mx-auto">
            Click any role preset below to watch how our neural engine instantly reformulates and structuralizes your resume template to align directly with corporate applicant filters.
          </p>
        </div>

        {/* ── Split 2-Column Container ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch max-w-6xl mx-auto">
          
          {/* ── Left Column: Interactive Controls ── */}
          <div className="lg:col-span-5 flex flex-col justify-center space-y-8 bg-white/60 backdrop-blur-xl border border-slate-100 p-8 md:p-10 rounded-[2.5rem] shadow-sm">
            <div className="space-y-4">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Target Role Presets</span>
              <h3 className="text-2xl font-bold text-slate-800 tracking-tight">Choose Job Archetype</h3>
              <p className="text-[13px] font-medium text-slate-500 leading-relaxed">
                Toggle between different highly technical requirements to see the resume dynamically align itself and unlock specific corporate keywords.
              </p>
            </div>

            {/* Toggle Preset Tabs */}
            <div className="flex flex-col gap-3">
              {rolePresets.map((role) => {
                const isActive = selectedRole.id === role.id;
                return (
                  <motion.button
                    key={role.id}
                    onClick={() => handleRoleSelect(role)}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className={`relative flex items-center justify-between px-6 py-4.5 rounded-2xl border text-left transition-all duration-300 ${
                      isActive 
                        ? "bg-slate-900 border-slate-900 text-white shadow-[0_15px_30px_rgba(0,0,0,0.1)]" 
                        : "bg-white border-slate-100 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <FileText size={16} className={isActive ? "text-emerald-400" : "text-slate-400"} />
                      <span className="text-sm font-bold tracking-tight">{role.name}</span>
                    </div>
                    {isActive ? (
                      <div className="flex items-center gap-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-widest border border-emerald-400/20">
                        Active
                      </div>
                    ) : (
                      <ArrowRight size={14} className="text-slate-300 group-hover:text-slate-400 transition-all" />
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Animated 'Analyzing Job Description' Status Bar */}
            <div className="space-y-3 bg-slate-50 border border-slate-100 p-5 rounded-2xl">
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
                <span className="flex items-center gap-2">
                  <Terminal size={11} className="text-emerald-500 animate-pulse" />
                  {isAnalyzing ? "Analyzing Job Description..." : "System Calibrated"}
                </span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden relative">
                <motion.div
                  initial={{ width: "100%" }}
                  animate={{ width: `${progress}%` }}
                  transition={{ ease: "easeOut", duration: 0.2 }}
                  className="h-full bg-emerald-500 rounded-full"
                />
              </div>
            </div>
          </div>

          {/* ── Right Column: Dynamic Resume Mockup ── */}
          <div className="lg:col-span-7 flex flex-col justify-between bg-white border border-slate-200/80 rounded-[2.5rem] shadow-[0_30px_70px_rgba(0,0,0,0.04)] overflow-hidden min-h-[550px] relative">
            
            {/* Dynamic floating Match score indicator */}
            <div className="absolute top-6 right-6 z-20">
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedRole.id}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-full shadow-sm"
                >
                  <CheckCircle2 size={13} className="text-emerald-600" />
                  <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider">
                    ATS Match: {selectedRole.score}%
                  </span>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Professional Elite Single-Column Layout (modeled after image_70bda1.png) */}
            <div className="p-8 md:p-10 space-y-6 flex-1 text-[#0F172A] relative">
              <div className="absolute inset-0 bg-noise opacity-[0.015] pointer-events-none" />

              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedRole.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-6"
                >
                  {/* Candidates Top Header Block */}
                  <div className="text-center space-y-1.5 pb-4 border-b border-slate-100">
                    <h4 className="text-xl md:text-2xl font-bold tracking-[0.1em] text-slate-800 uppercase font-helvetica">
                      SARAH JENKINS
                    </h4>
                    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                      <span className="flex items-center gap-1"><User size={9} /> San Francisco, CA</span>
                      <span>•</span>
                      <span className="flex items-center gap-1"><Mail size={9} /> sarah.jenkins@email.com</span>
                      <span>•</span>
                      <span className="flex items-center gap-1"><Globe size={9} /> linkedin.com/in/sjenkins</span>
                    </div>
                  </div>

                  {/* Dynamic Summary section */}
                  <div className="space-y-1.5">
                    <h5 className="text-[9px] font-black uppercase tracking-[0.25em] text-emerald-600">
                      Professional Profile
                    </h5>
                    <p className="text-[11px] leading-relaxed text-slate-500 font-medium font-body">
                      Results-oriented technology specialist with a proven record architectures of deploying highly efficient, scalable data solutions. Adept at leveraging advanced analytical frameworks to uncover key operational performance pipelines.
                    </p>
                  </div>

                  {/* Professional Experience Section */}
                  <div className="space-y-4">
                    <h5 className="text-[9px] font-black uppercase tracking-[0.25em] text-emerald-600">
                      Professional Experience
                    </h5>

                    {selectedRole.experience.map((exp, index) => (
                      <div key={index} className="space-y-2.5">
                        <div className="flex justify-between items-baseline">
                          <div>
                            <span className="text-xs font-bold text-slate-800">{exp.role}</span>
                            <span className="text-slate-400 mx-2 text-[10px]">•</span>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{exp.company}</span>
                          </div>
                          <span className="text-[9px] font-bold text-slate-400 font-mono uppercase tracking-wider">
                            {exp.duration}
                          </span>
                        </div>
                        <ul className="list-disc pl-4 space-y-1.5">
                          {exp.bullets.map((bullet, bulletIdx) => (
                            <li key={bulletIdx} className="text-[10.5px] leading-relaxed text-slate-500 font-medium">
                              {renderBulletText(bullet)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>

                  {/* Core Tactical Performance Metrics (Flashed from presets) */}
                  <div className="space-y-2">
                    <h5 className="text-[9px] font-black uppercase tracking-[0.25em] text-emerald-600">
                      Performance Metrics
                    </h5>
                    <div className="grid grid-cols-3 gap-4">
                      {selectedRole.performance.map((metric, i) => (
                        <div key={i} className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center space-y-1">
                          <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">{metric.label}</p>
                          <motion.p 
                            initial={{ scale: 0.8, color: "#10B981" }}
                            animate={{ scale: 1, color: "#1E2A3A" }}
                            transition={{ duration: 1 }}
                            className="text-lg font-black tracking-tight"
                          >
                            {metric.value}
                          </motion.p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Skills Grid */}
                  <div className="space-y-2">
                    <h5 className="text-[9px] font-black uppercase tracking-[0.25em] text-emerald-600">
                      Target Core Competencies
                    </h5>
                    <div className="flex flex-wrap gap-2">
                      {selectedRole.skills.map((skill, i) => (
                        <motion.span
                          key={skill}
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: i * 0.05 }}
                          className="px-2.5 py-1 rounded bg-slate-900/[0.03] border border-slate-900/[0.05] text-slate-700 font-mono text-[9px] font-bold"
                        >
                          {skill}
                        </motion.span>
                      ))}
                    </div>
                  </div>

                </motion.div>
              </AnimatePresence>
            </div>
            
          </div>

        </div>

      </div>
    </section>
  );
};

export default ProductPreview;
