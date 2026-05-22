import React, { Component, ErrorInfo, ReactNode } from "react";
import { ShieldAlert, RefreshCw, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Lumina Forensic Boundary caught uncaught exception:", error, errorInfo);
    
    // Check if it's a dynamic import or chunk loading failure
    const isChunkLoadFailed = 
      error?.name === "TypeError" ||
      /Failed to fetch dynamically imported module/i.test(error?.message || "") ||
      /Loading chunk/i.test(error?.message || "") ||
      /dynamically imported module/i.test(error?.message || "");

    if (isChunkLoadFailed) {
      console.warn("Lumina Forensic: Dynamic chunk loading failed. Auto-triggering hard page recovery...");
      
      const lastReload = sessionStorage.getItem("lumina_last_chunk_reload");
      const now = Date.now();
      
      // Prevent infinite reload loops by checking if we reloaded less than 10 seconds ago
      if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
        sessionStorage.setItem("lumina_last_chunk_reload", now.toString());
        window.location.reload();
      }
    }
  }

  private handleManualRecovery = () => {
    sessionStorage.setItem("lumina_last_chunk_reload", Date.now().toString());
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isChunkError = 
        this.state.error?.name === "TypeError" ||
        /Failed to fetch dynamically imported module/i.test(this.state.error?.message || "") ||
        /Loading chunk/i.test(this.state.error?.message || "");

      return (
        <div className="flex flex-col items-center justify-center p-8 min-h-[400px] text-center space-y-6 bg-slate-950/20 backdrop-blur-md rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden">
          {/* Subtle grid pattern background */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />
          
          <div className="w-20 h-20 rounded-[2rem] bg-red-500/10 border border-red-500/20 flex items-center justify-center relative z-10">
            <ShieldAlert className="w-10 h-10 text-red-500" />
          </div>

          <div className="space-y-2 max-w-md relative z-10">
            <h3 className="text-2xl font-serif font-bold text-white">
              {isChunkError ? "Application Update Detected" : "Intelligence Signal Interrupted"}
            </h3>
            <p className="text-muted-foreground text-xs font-medium leading-relaxed">
              {isChunkError 
                ? "Lumina has recently received an upgrade. We need to perform a quick synchronization to load the latest high-performance modules." 
                : "An unexpected error occurred within the dashboard intelligence layer. Your session states are protected."}
            </p>
          </div>

          <button
            onClick={this.handleManualRecovery}
            className="flex items-center gap-2 px-8 py-3.5 bg-lumina-teal text-white font-black uppercase tracking-widest text-[10px] rounded-full hover:scale-105 active:scale-95 transition-all shadow-xl shadow-teal-500/10 hover:shadow-teal-500/20 relative z-10"
          >
            <RefreshCw size={12} className="animate-spin" />
            <span>Sync & Refresh</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
