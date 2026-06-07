export type Feature = "arsenal" | "pipeline" | "scoring" | "interview";

const PRO_FEATURES: Feature[] = ["arsenal", "pipeline", "scoring", "interview"];

export function isFeatureAvailable(feature: Feature, isPro = false): boolean {
  return true; // Completely open source, no pro paywall
}

export function getFeatureBlocker(feature: Feature, isPro = false): string | null {
  return null;
}
