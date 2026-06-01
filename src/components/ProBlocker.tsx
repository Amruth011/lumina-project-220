import { Lock, Sparkles } from "lucide-react";
import type { Feature } from "@/lib/featureFlags";
import { isFeatureAvailable, getFeatureBlocker } from "@/lib/featureFlags";

interface Props {
  feature: Feature;
  children: React.ReactNode;
}

export function ProBlocker({ feature, children }: Props) {
  const isPro = localStorage.getItem("lumina_pro") === "true";
  if (isFeatureAvailable(feature, isPro)) return <>{children}</>;

  const message = getFeatureBlocker(feature, isPro);

  return (
    <div className="relative">
      <div className="absolute inset-0 backdrop-blur-sm bg-background/60 z-10 rounded-2xl flex flex-col items-center justify-center min-h-[300px]">
        <div className="flex flex-col items-center gap-3 p-8 text-center max-w-sm">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center">
            <Lock size={24} className="text-amber-400" />
          </div>
          <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Pro Feature</h3>
          <p className="text-[10px] text-muted-foreground leading-relaxed">{message}</p>
          <button
            onClick={() => localStorage.setItem("lumina_pro", "true")}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-amber-500/20"
          >
            <Sparkles size={12} />
            Upgrade to Pro (Dev Mode)
          </button>
        </div>
      </div>
      <div className="opacity-30 pointer-events-none">{children}</div>
    </div>
  );
}
