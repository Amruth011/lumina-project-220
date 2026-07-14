import { describe, it, expect } from "vitest";
import { groundBulletMetrics } from "../lib/resumeHelpers";
import type { VaultItem } from "../types/resume";

describe("groundBulletMetrics", () => {
  const mockVaultItem: VaultItem = {
    id: "test-id",
    user_id: "test-user",
    type: "professional",
    title: "Data Scientist",
    organization: "iStudio",
    period: "2026-02 to 2026-05",
    description: "Optimized pipelines using SQL and Pandas, reducing manual review time by 40%. Managed a dataset of 10,000 items.",
    bullets: [
      "Optimized data preprocessing pipelines using SQL and Pandas, reducing manual data review time by 40%."
    ],
    skills: ["SQL", "Pandas"],
    created_at: ""
  };

  it("should preserve original valid numbers/percentages", () => {
    const bullet = "Optimized preprocessing pipelines, reducing manual review by 40% and processing 10,000 items.";
    const grounded = groundBulletMetrics(bullet, mockVaultItem);
    expect(grounded).toContain("40%");
    expect(grounded).toContain("10,000");
  });

  it("should ignore years (19xx/20xx)", () => {
    const bullet = "Led projects in 2024 and 2025.";
    const grounded = groundBulletMetrics(bullet, mockVaultItem);
    expect(grounded).toContain("2024");
    expect(grounded).toContain("2025");
  });

  it("should sanitize and remove hallucinated raw metrics", () => {
    const bullet = "Scaled databases to support 500,000 requests.";
    const grounded = groundBulletMetrics(bullet, mockVaultItem);
    // 500,000 is not in mockVaultItem description/bullets, so it should be stripped
    expect(grounded).not.toContain("500,000");
    expect(grounded).toBe("Scaled databases to support requests.");
  });

  it("should sanitize and replace hallucinated percentages", () => {
    const bullet = "Increased data reliability by 95% with unit tests.";
    const grounded = groundBulletMetrics(bullet, mockVaultItem);
    // 95% is not in mockVaultItem, so it should be replaced with "substantial"
    expect(grounded).not.toContain("95%");
    expect(grounded).toContain("substantial");
    expect(grounded).toBe("Increased data reliability by substantial with unit tests.");
  });
});
