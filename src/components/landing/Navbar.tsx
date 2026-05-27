import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { LuminaLogo } from "../LuminaLogo";

export const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Feature",     href: "#features" },
    { name: "Pricing",     href: "#pricing" },
    { name: "Guide",       href: "#how-it-works" },
  ];

  return (
    <nav className="absolute top-0 left-0 right-0 z-50 px-6 pt-0 pb-0 w-full pointer-events-none">
      <div
        className="max-w-7xl mx-auto flex items-center justify-between pointer-events-auto py-0"
      >
        {/* Logo (inverted to white for transparent teal background integration) */}
        <Link to="/" className="flex items-center group transition-transform hover:scale-105">
          <LuminaLogo size={120} className="object-contain brightness-0 invert" />
        </Link>

        {/* Desktop nav links (no background bar, floating white options) */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) =>
            link.href.startsWith("#") ? (
              <a
                key={link.name}
                href={link.href}
                className="text-[13px] font-display font-semibold text-white/95 hover:text-white transition-all duration-200 whitespace-nowrap"
              >
                {link.name}
              </a>
            ) : (
              <Link
                key={link.name}
                to={link.href}
                className="text-[13px] font-display font-semibold text-white/95 hover:text-white transition-all duration-200 whitespace-nowrap"
              >
                {link.name}
              </Link>
            )
          )}
        </div>

        {/* Desktop CTA (Balloon style outline white button) */}
        <div className="hidden md:block">
          <Link to="/auth">
            <motion.button
              whileHover={{ scale: 1.05, backgroundColor: "rgba(255, 255, 255, 1)", color: "#10B981" }}
              whileTap={{ scale: 0.97 }}
              className="rounded-full px-6 py-2.5 border border-white text-white text-[11px] font-bold uppercase tracking-widest transition-all duration-200 bg-transparent"
            >
              Get Started
            </motion.button>
          </Link>
        </div>

        {/* Mobile toggle (white icons) */}
        <button
          className="md:hidden w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-40 bg-slate-900 pointer-events-auto md:hidden"
          >
            <div className="flex flex-col h-full p-8 pt-24 gap-6 text-white bg-gradient-to-b from-lumina-teal-dark to-slate-950">
              <button 
                className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X className="w-5 h-5" />
              </button>
              {navLinks.map((link) =>
                link.href.startsWith("#") ? (
                  <a
                    key={link.name}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-2xl font-serif font-bold text-white hover:text-emerald-300 transition-colors"
                  >
                    {link.name}
                  </a>
                ) : (
                  <Link
                    key={link.name}
                    to={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-2xl font-serif font-bold text-white hover:text-emerald-300 transition-colors"
                  >
                    {link.name}
                  </Link>
                )
              )}
              <Link
                to="/auth"
                onClick={() => setMobileMenuOpen(false)}
                className="mt-4 px-8 py-4 border border-white text-white hover:bg-white hover:text-emerald-600 font-bold rounded-full text-center text-lg transition-all"
              >
                Get Started
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
