import { useState, useEffect } from "react";
import { toast } from "sonner";
import type { DecodeResult } from "@/types/jd";
import { getCachedDecode, clearDecodeCache } from "@/lib/jdCache";
import { parseJobDescription } from "@/lib/structuredJdParser";

export const useDecodeJD = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [results, setResults] = useState<DecodeResult | null>(() => {
    try {
      const stored = localStorage.getItem("lumina_last_results");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [wasCached, setWasCached] = useState(false);

  useEffect(() => {
    if (results) {
      localStorage.setItem("lumina_last_results", JSON.stringify(results));
    } else {
      localStorage.removeItem("lumina_last_results");
    }
  }, [results]);

  const resetResults = () => setResults(null);

  const decodeJD = async (jdText: string, forceRefresh = false) => {
    if (jdText.trim().length < 20) {
      toast.error("Please paste a job description (min 20 characters).");
      return;
    }

    if (jdText.length > 15000) {
      toast.error("Character Limit Crossed", {
        description: `Max 15,000 characters allowed. Your JD is ${jdText.length.toLocaleString()} characters.`,
        duration: 5000
      });
      return;
    }

    setIsScanning(true);
    setResults(null);
    setWasCached(false);

    try {
      // Check cache first for custom toast feedback
      if (!forceRefresh) {
        const cached = await getCachedDecode(jdText);
        if (cached) {
          setResults(cached);
          setWasCached(true);
          setIsScanning(false);
          toast.success(`Forensic Intelligence Active: ${cached.title} (Loaded from cache)`, {
            duration: 3000
          });
          return;
        }
      }

      const result = await parseJobDescription(jdText, { forceRefresh });

      // Proactively clear cached roadmap values for the new job description
      if (typeof window !== "undefined" && window.sessionStorage) {
        sessionStorage.removeItem("current_roadmap_id");
        sessionStorage.removeItem("current_roadmap_jd_title");
      }

      setResults(result);
      setWasCached(false);
      toast.success(`Forensic Intelligence Active: ${result.title}`, { duration: 4000 });
    } catch (err: unknown) {
      console.error("Lumina decodeJD hook error:", err);
      toast.error("Lumina Forensic Crash: " + ((err as Error).message || "Failed to decode JD"));
    } finally {
      setIsScanning(false);
    }
  };

  return { isScanning, results, setResults, resetResults, decodeJD, wasCached, clearCache: clearDecodeCache };
};
