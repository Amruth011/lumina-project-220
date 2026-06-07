export type Feature = "arsenal" | "pipeline" | "scoring" | "interview";

const PRO_FEATURES: Feature[] = ["arsenal", "pipeline", "scoring", "interview"];

export function isFeatureAvailable(feature: Feature, isPro = false): boolean {
  if (feature === "scoring") return true;
  return isPro || !PRO_FEATURES.includes(feature);
}

export function getFeatureBlocker(feature: Feature, isPro = false): string | null {
  if (isFeatureAvailable(feature, isPro)) return null;
  return "Upgrade to Pro to unlock this feature.";
}
