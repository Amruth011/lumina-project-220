/* eslint-disable @typescript-eslint/no-explicit-any */
import { lazy } from "react";

/**
 * A robust wrapper around React.lazy that catches "Failed to fetch dynamically imported module" errors,
 * which typically occur when a new deployment is pushed to production (deleting old chunk hashes)
 * and the user still has an older cached session.
 * 
 * If a chunk load fails, it attempts a single hard page reload to fetch the latest asset manifest.
 */
export function lazyWithRetry<T extends React.ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    try {
      const component = await componentImport();
      // Reset chunk fail reload flag on successful hydration
      if (typeof window !== "undefined" && window.sessionStorage) {
        sessionStorage.removeItem("lumina_chunk_fail_refresh");
      }
      return component;
    } catch (error: any) {
      // Check if the error is a dynamic import / chunk load failure
      const isChunkLoadFailed = 
        error?.name === "TypeError" ||
        /Failed to fetch dynamically imported module/i.test(error?.message || "") ||
        /Loading chunk/i.test(error?.message || "") ||
        /dynamically imported module/i.test(error?.message || "");

      if (isChunkLoadFailed) {
        console.warn("Lumina Intelligence: Chunk load failed. Attempting hard reload to sync production assets...", error);
        
        // Use sessionStorage to prevent infinite reload loops if there is a persistent network or server issue
        const pageHasRefreshed = sessionStorage.getItem("lumina_chunk_fail_refresh");
        if (!pageHasRefreshed) {
          sessionStorage.setItem("lumina_chunk_fail_refresh", "true");
          window.location.reload();
          // Return a promise that never resolves to block the crash render while reloading
          return new Promise<{ default: T }>(() => {});
        }
      }
      
      // If already refreshed or not a chunk fail, propagate the error to error boundaries
      throw error;
    }
  });
}
