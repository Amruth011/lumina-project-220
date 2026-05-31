import React from "react";
import { motion } from "framer-motion";
import { Check, Zap, ArrowRight, Coins } from "lucide-react";

const plans = [
  {
    id: "starter",
    tier: "Starter",
    name: "Sovereign Free",
    price: "$0",
    period: "/ forever",
    description:
      "Perfect for final year students and active job seekers looking to clear baseline corporate ATS filters.",
    cta: "Get Started Free",
    ctaHref: "/auth",
    popular: false,
    features: [
      "Unlimited Job Description Decoding",
      "Instant Resume Analysis & Skill Gap Mapping",
      "Elite Single-Page Resume Generation",
      "Custom Tailored Cover Letters",
      "Step-by-Step Technical Interview Roadmaps",
      "Powered entirely by Antigravity Free-Tier Mesh",
    ],
  },
  {
    id: "pro",
    tier: "Pro",
    name: "Agentic Pro",
    price: "$15",
    period: "/ month",
    description:
      "Designed for hyper-active candidates demanding continuous, automated workflow execution.",
    cta: "Upgrade to Pro",
    ctaHref: "/auth",
    popular: true,
    features: [
      "Everything in Sovereign Free Tier",
      "Autonomous Job Agent Background Deployment",
      "Continuous Multi-Board Scraping (LinkedIn, Indeed)",
      "Automatic Custom Matching (Score > 85%)",
      "Hands-free Form Completion and Submission",
      "Priority Processing on Dedicated Server Clusters",
    ],
  },
  {
    id: "enterprise",
    tier: "Enterprise",
    name: "Custom Agency",
    price: "Let's Talk",
    period: "",
    description:
      "For training institutes and recruitment platforms scaling multi-user pipelines.",
    cta: "Contact Team",
    ctaHref: "mailto:team@lumina.ai",
    popular: false,
    features: [
      "Everything in Agentic Pro Tier",
      "Bulk Resume & Asset Processing API Access",
      "White-labeled Generation Dashboards",
      "Dedicated Model Finetuning Layers",
      "Custom Integration via Webhooks & Supabase Edge",
      "99.9% Uptime SLA Guarantee",
    ],
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.65,
      delay: i * 0.12,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  }),
};

export const PricingSection = () => {
  return (
    <section
      id="pricing"
      className="relative py-32 px-6 bg-white border-t border-black/[0.03] overflow-hidden"
    >
      {/* Ambient glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-emerald-500/[0.04] rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-slate-200/40 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10 space-y-16">
        {/* ── Header ── */}
        <div className="text-center space-y-5 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100/60">
            <Coins size={11} className="text-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-600">
              Pricing
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-800 tracking-tight leading-tight">
            Transparent Plans for
            <br />
            <span className="text-emerald-500">Ambitious Builders</span>
          </h2>
          <p className="text-base md:text-lg text-slate-500 font-medium leading-relaxed">
            Deploy elite career automation tools instantly. Start scaling your
            applications for free.
          </p>
        </div>

        {/* ── 3-Card Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-stretch max-w-6xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.id}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={cardVariants}
              className={`relative flex flex-col rounded-[2rem] transition-all duration-500 ${
                plan.popular
                  ? "bg-[#0F1E1A] text-white shadow-[0_40px_100px_-15px_rgba(16,185,129,0.25)] z-10 lg:scale-[1.04] border border-emerald-900/40"
                  : "bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 text-slate-800"
              }`}
            >
              {/* Most Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                  <div className="flex items-center gap-1.5 bg-emerald-500 text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg shadow-emerald-500/25">
                    <Zap size={10} className="fill-white" />
                    Most Popular
                  </div>
                </div>
              )}

              {/* Card Inner Content */}
              <div className="flex flex-col flex-1 p-8 md:p-10 space-y-8">
                {/* Tier + Name */}
                <div className="space-y-1">
                  <span
                    className={`text-[10px] font-black uppercase tracking-[0.3em] ${
                      plan.popular ? "text-emerald-400" : "text-slate-400"
                    }`}
                  >
                    {plan.tier}
                  </span>
                  <h3
                    className={`text-xl font-bold tracking-tight ${
                      plan.popular ? "text-white" : "text-slate-800"
                    }`}
                  >
                    {plan.name}
                  </h3>
                </div>

                {/* Price */}
                <div
                  className={`pb-8 border-b ${
                    plan.popular ? "border-white/10" : "border-slate-100"
                  }`}
                >
                  <div className="flex items-baseline gap-1.5">
                    <span
                      className={`text-4xl md:text-5xl font-bold tracking-tight ${
                        plan.popular ? "text-white" : "text-slate-800"
                      }`}
                    >
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span
                        className={`text-sm font-medium ${
                          plan.popular ? "text-emerald-400/80" : "text-slate-400"
                        }`}
                      >
                        {plan.period}
                      </span>
                    )}
                  </div>
                  <p
                    className={`mt-3 text-sm leading-relaxed ${
                      plan.popular ? "text-white/60" : "text-slate-500"
                    }`}
                  >
                    {plan.description}
                  </p>
                </div>

                {/* Features */}
                <div className="flex-1 space-y-4">
                  <p
                    className={`text-[10px] font-black uppercase tracking-[0.25em] ${
                      plan.popular ? "text-white/40" : "text-slate-400"
                    }`}
                  >
                    What's included
                  </p>
                  <ul className="space-y-3.5">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <div
                          className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 ${
                            plan.popular
                              ? "bg-emerald-500/20 border border-emerald-500/30"
                              : "bg-emerald-50 border border-emerald-100"
                          }`}
                        >
                          <Check
                            size={10}
                            className={
                              plan.popular ? "text-emerald-400" : "text-emerald-600"
                            }
                            strokeWidth={3}
                          />
                        </div>
                        <span
                          className={`text-[13px] font-medium leading-snug ${
                            plan.popular ? "text-white/75" : "text-slate-600"
                          }`}
                        >
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CTA Button */}
                <a href={plan.ctaHref} className="block mt-auto pt-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full py-4 px-6 rounded-2xl font-bold text-sm tracking-wide flex items-center justify-center gap-2 transition-all duration-300 ${
                      plan.popular
                        ? "bg-emerald-500 text-white hover:bg-emerald-400 shadow-lg shadow-emerald-500/20"
                        : plan.id === "enterprise"
                        ? "bg-slate-800 text-white hover:bg-slate-700"
                        : "bg-slate-900 text-white hover:bg-slate-700"
                    }`}
                  >
                    {plan.cta}
                    <ArrowRight size={14} />
                  </motion.button>
                </a>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── Footer Note ── */}
        <div className="text-center pt-4">
          <p className="text-xs text-slate-400 font-medium">
            No credit card required to get started.{" "}
            <span className="text-emerald-600 font-semibold">
              Cancel or upgrade anytime.
            </span>
          </p>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
