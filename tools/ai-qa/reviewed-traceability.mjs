import fs from "node:fs";
import path from "node:path";
import { reviewedRequirements } from "./reviewed-requirements.mjs";

/** Verify curated references, without claiming that a test ran or passed. */
export function buildReviewedTraceability(rootDir, requirements = reviewedRequirements) {
  const root = path.resolve(rootDir);
  return requirements.map((requirement) => {
    const references = requirement.tests.map(({ file, title }) => {
      const target = path.resolve(root, file);
      const relative = path.relative(root, target);
      let found = false;
      if (relative && !relative.startsWith("..") && !path.isAbsolute(relative)) {
        try {
          const source = fs.readFileSync(target, "utf8");
          // Exact quoted title, not keyword matching; assertions still require review.
          found = source.includes(JSON.stringify(title));
        } catch (error) {
          if (error.code !== "ENOENT") throw error;
        }
      }
      return { file, title, found };
    });
    return {
      id: requirement.id,
      requirement: requirement.requirement,
      risk: requirement.risk,
      priority: requirement.priority,
      references,
      allReferencesFound: references.length > 0 && references.every((ref) => ref.found),
      executionVerified: false,
      knownGap: requirement.gap.title,
    };
  });
}

/** Suggestions are review items, never tests added to the official suite. */
export function proposeReviewedScenarios(requirements = reviewedRequirements) {
  return requirements.filter((requirement) => requirement.gap).map((requirement) => ({
    requirementId: requirement.id,
    ...requirement.gap,
    risk: requirement.risk,
    priority: requirement.priority,
    status: "PROPOSTA_NAO_REVISADA",
    origin: "deterministic-curated-gap",
  }));
}
