import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SessionProvider } from "@/context/SessionContext";
import { ToastProvider } from "@/context/ToastContext";
import { Suspense, useEffect } from "react";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { FeedbackBar } from "@/components/ui/FeedbackBar";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Lazy load new feature pages
const Arsenal = lazyWithRetry(() => import("./pages/Arsenal"));
const Pipeline = lazyWithRetry(() => import("./pages/Pipeline"));
const Scoring = lazyWithRetry(() => import("./pages/Scoring"));
const Interview = lazyWithRetry(() => import("./pages/Interview"));

// Lazy load pages securely with self-healing chunk failure protection
const Index = lazyWithRetry(() => import("./pages/Index"));
const Auth = lazyWithRetry(() => import("./pages/Auth"));
const Dashboard = lazyWithRetry(() => import("./pages/Dashboard"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));

import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Loader2, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-6">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="relative"
        >
          <div className="w-16 h-16 rounded-full border-2 border-primary/20 border-t-primary" />
          <img 
            src="/logo.png" 
            alt="Lumina" 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-auto opacity-80 animate-pulse" 
          />
        </motion.div>
        <div className="space-y-1 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Authenticating</p>
          <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">Securing Identity Signal</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

const App = () => {
  useEffect(() => {
    if (typeof window !== "undefined" && window.sessionStorage) {
      sessionStorage.removeItem("lumina_chunk_fail_refresh");
    }
  }, []);

  return (
  <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
    <ToastProvider>
      <SessionProvider>
        <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <FeedbackBar />
          <BrowserRouter>
            <CommandPalette />
            <Suspense fallback={
              <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-6">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="relative"
                >
                  <div className="w-16 h-16 rounded-full border-2 border-primary/20 border-t-primary" />
                </motion.div>
                <div className="space-y-1 text-center">
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Hydrating Lumina</p>
                  <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">Initializing Total Intelligence</p>
                </div>
              </div>
            }>
              <ErrorBoundary>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                  <Route path="/dashboard/arsenal" element={<ProtectedRoute><Arsenal /></ProtectedRoute>} />
                  <Route path="/dashboard/pipeline" element={<ProtectedRoute><Pipeline /></ProtectedRoute>} />
                  <Route path="/dashboard/scoring" element={<ProtectedRoute><Scoring /></ProtectedRoute>} />
                  <Route path="/dashboard/interview" element={<ProtectedRoute><Interview /></ProtectedRoute>} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </ErrorBoundary>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
        </QueryClientProvider>
      </SessionProvider>
    </ToastProvider>
  </ThemeProvider>
  );
};

export default App;
