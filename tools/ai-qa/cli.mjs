import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { summarizeBenchmark } from "./benchmark-summary.mjs";
import { analyzeFailure, classifyFailureDeterministic } from "./classifier.mjs";
import { sanitizeText } from "./sanitizer.mjs";
import { changedFiles, prioritize } from "./prioritize.mjs";
import { buildReviewedTraceability, proposeReviewedScenarios } from "./reviewed-traceability.mjs";

const rootDir = process.cwd();
const reportsDir = path.join(rootDir, "reports");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function getGitMeta() {
  let sha = "unknown";
  let branch = "unknown";
  try {
    sha = execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
    branch = execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf8" }).trim();
  } catch {
    // Git metadata is optional for local reports.
  }
  try {
    const result = changedFiles();
    return { sha, branch, changed: result.changedFiles, changeSource: result.source, changeError: null };
  } catch (error) {
    return { sha, branch, changed: [], changeSource: "unavailable", changeError: error.message };
  }
}

function walkPlaywrightSuites(suites, collected = []) {
  for (const suite of suites ?? []) {
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        for (const result of test.results ?? []) {
          collected.push({
            title: spec.title,
            file: spec.file || suite.file || "",
            status: result.status,
            durationMs: result.duration ?? 0,
            error: result.error?.message || result.errors?.map((e) => e.message).join("\n") || "",
            attachments: (result.attachments ?? []).map((a) => ({
              name: a.name,
              contentType: a.contentType,
              path: a.path,
            })),
          });
        }
      }
    }
    walkPlaywrightSuites(suite.suites, collected);
  }
  return collected;
}

async function runAnalyzeFailures({ resultsPath, outputName = "ai-failure-analysis.json", offline = false } = {}) {
  ensureDir(reportsDir);
  if (!/^[a-z0-9][a-z0-9._-]*\.json$/i.test(outputName)) throw new Error("Output must be a simple JSON filename.");
  const git = getGitMeta();
  const pwResultsPath = resultsPath ? path.resolve(rootDir, resultsPath) : path.join(rootDir, "tests/e2e/test-results/results.json");
  const outputPath = path.join(reportsDir, outputName);

  if (!fs.existsSync(pwResultsPath)) {
    const output = {
      generatedAt: new Date().toISOString(),
      commit: git.sha,
      status: "NO_PLAYWRIGHT_RESULTS_FOUND",
      analyzedCount: 0,
      analyses: [],
      changeSource: git.changeSource,
      changeError: git.changeError,
    };
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    console.log("No Playwright results.json found. Wrote empty analysis report.");
    return output;
  }

  const raw = JSON.parse(fs.readFileSync(pwResultsPath, "utf8"));
  const runs = walkPlaywrightSuites(raw.suites);
  const failed = runs.filter((r) => r.status === "failed" || r.status === "timedOut");

  const analyses = [];
  for (const item of failed) {
    analyses.push(
      await (offline ? classifyFailureDeterministic : analyzeFailure)({
        name: item.title,
        file: item.file,
        durationMs: item.durationMs,
        error: item.error,
        attachments: item.attachments,
        recentChangedFiles: git.changed,
      })
    );
  }

  const output = {
    generatedAt: new Date().toISOString(),
    commit: git.sha,
    totalRunsObserved: runs.length,
    failedCount: failed.length,
    analyses,
    changeSource: git.changeSource,
    changeError: git.changeError,
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`Analyzed ${failed.length} failure(s) out of ${runs.length} E2E result(s).`);
  return output;
}

function runEvaluateAi() {
  ensureDir(reportsDir);
  const benchmarkPath = path.join(rootDir, "tools/ai-qa/benchmark/known-failures.json");
  const dataset = JSON.parse(fs.readFileSync(benchmarkPath, "utf8"));

  const results = [];

  for (const sample of dataset) {
    const prediction = classifyFailureDeterministic(sample);
    const isCorrect = prediction.category === sample.expectedCategory;
    results.push({
      id: sample.id,
      expected: sample.expectedCategory,
      predicted: prediction.category,
      confidence: prediction.confidence,
      correct: isCorrect,
    });
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    ...summarizeBenchmark(results),
  };

  fs.writeFileSync(path.join(reportsDir, "ai-benchmark.json"), JSON.stringify(summary, null, 2));
  console.log(
    `AI Benchmark: ${summary.correct}/${summary.totalSamples} correct (accuracy ${summary.accuracy === null ? "n/a" : `${(summary.accuracy * 100).toFixed(1)}%`}), unclassified=${summary.unclassifiedCount}`
  );
  return summary;
}

function scanTestTitles(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, "utf8");
  const matches = [...content.matchAll(/(?:it|test)\(\s*["'`]([^"'`]+)["'`]/g)];
  return matches.map((m) => m[1]);
}

function runCoverageMatrix() {
  ensureDir(reportsDir);
  const testFiles = [
    "apps/backend/src/test/unit.spec.ts",
    "apps/backend/src/test/api.spec.ts",
    "tests/e2e/tests/smoke.spec.ts",
    "tests/e2e/tests/auth.spec.ts",
    "tests/e2e/tests/catalog.spec.ts",
    "tests/e2e/tests/cart-checkout.spec.ts",
    "tests/e2e/tests/accessibility.spec.ts",
  ];

  const indexed = testFiles.map((rel) => ({
    file: rel,
    tests: scanTestTitles(path.join(rootDir, rel)),
  }));

  const requirements = [
    { id: "REQ-AUTH-01", area: "Authentication", keywords: ["register", "login", "credentials", "jwt", "session"] },
    { id: "REQ-CAT-01", area: "Catalog & Search", keywords: ["product", "search", "category", "filter", "empty"] },
    { id: "REQ-CART-01", area: "Shopping Cart", keywords: ["cart", "quantity", "remove", "stock"] },
    { id: "REQ-CHK-01", area: "Checkout & Concurrency", keywords: ["checkout", "oversell", "concurrent", "duplicate"] },
    { id: "REQ-ORD-01", area: "Orders & Isolation", keywords: ["order", "isolates"] },
    { id: "REQ-A11Y-01", area: "Accessibility", keywords: ["accessibility", "keyboard", "axe"] },
  ];

  const matrix = requirements.map((req) => {
    const matchedTests = [];
    for (const entry of indexed) {
      for (const title of entry.tests) {
        if (req.keywords.some((kw) => title.toLowerCase().includes(kw))) {
          matchedTests.push(`${entry.file}: ${title}`);
        }
      }
    }
    return {
      requirementId: req.id,
      area: req.area,
      covered: null,
      reviewRequired: true,
      testCount: matchedTests.length,
      matchedTests,
    };
  });

  const output = {
    generatedAt: new Date().toISOString(),
    method: "Keyword matches in test titles are candidates only; manual review is required to establish coverage.",
    totalTestFilesScanned: indexed.length,
    totalTestCasesFound: indexed.reduce((sum, f) => sum + f.tests.length, 0),
    matrix,
  };

  fs.writeFileSync(path.join(reportsDir, "traceability-matrix.json"), JSON.stringify(output, null, 2));
  console.log(`Traceability candidates: ${output.totalTestCasesFound} test titles scanned for ${matrix.length} requirement areas; review required.`);
  return output;
}

function runReviewedTraceability() {
  ensureDir(reportsDir);
  const git = getGitMeta();
  const references = buildReviewedTraceability(rootDir);
  const output = {
    generatedAt: new Date().toISOString(),
    commit: git.sha,
    note: "Curated references are checked for existence only, not execution or success; inspect CI artifacts for this commit.",
    references,
  };
  fs.writeFileSync(path.join(reportsDir, "reviewed-traceability.json"), JSON.stringify(output, null, 2));
  const missing = references.filter((entry) => !entry.allReferencesFound);
  console.log(`Reviewed traceability: ${references.length} requirements, ${missing.length} with missing references; execution not verified.`);
  if (missing.length) process.exitCode = 1;
  return output;
}

function runScenarioProposals() {
  ensureDir(reportsDir);
  const proposals = proposeReviewedScenarios();
  const output = {
    generatedAt: new Date().toISOString(),
    note: "Deterministic suggestions from manually curated gaps, not model output. Human review is required before implementation.",
    proposals,
  };
  fs.writeFileSync(path.join(reportsDir, "scenario-proposals.json"), JSON.stringify(output, null, 2));
  console.log(`Generated ${proposals.length} scenario proposals for review; no tests were added.`);
  return output;
}

function runPrioritize(args) {
  try {
    const result = prioritize(args);
    console.log(JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error(`Cannot prioritize: ${error.message}`);
    process.exitCode = 1;
    return null;
  }
}

async function runExecutiveReport() {
  ensureDir(reportsDir);
  const git = getGitMeta();
  const pwPath = path.join(rootDir, "tests/e2e/test-results/results.json");
  const benchmark = runEvaluateAi();
  const matrix = runCoverageMatrix();
  const failures = await runAnalyzeFailures();

  let pwStats = { expected: 0, unexpected: 0, skipped: 0, durationMs: 0, observed: false };
  if (fs.existsSync(pwPath)) {
    const raw = JSON.parse(fs.readFileSync(pwPath, "utf8"));
    const stats = raw.stats ?? {};
    pwStats = {
      expected: stats.expected ?? 0,
      unexpected: stats.unexpected ?? 0,
      skipped: stats.skipped ?? 0,
      durationMs: Math.round(stats.duration ?? 0),
      observed: true,
    };
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    commit: git.sha,
    branch: git.branch,
    nodeVersion: process.version,
    playwright: pwStats,
    aiBenchmarkAccuracy: benchmark.accuracy,
    traceabilityTestCases: matrix.totalTestCasesFound,
    openFailuresAnalyzed: failures.failedCount ?? 0,
  };

  const md = [
    "# Executive QA Summary",
    "",
    `- **Generated At**: ${summary.generatedAt}`,
    `- **Commit**: \`${summary.commit}\` (branch \`${summary.branch}\`)`,
    `- **Runtime**: Node ${summary.nodeVersion}`,
    "",
    "## Observed Execution Metrics",
    "",
    pwStats.observed
      ? `- **Playwright E2E**: ${pwStats.expected} passed, ${pwStats.unexpected} failed, ${pwStats.skipped} skipped (${pwStats.durationMs}ms)`
      : "- **Playwright E2E**: Not executed yet (`tests/e2e/test-results/results.json` not found)",
    `- **Traceability candidates**: ${matrix.totalTestCasesFound} test titles scanned for ${matrix.matrix.length} requirement areas; keyword matches require manual review and do not prove coverage.`,
    `- **AI Failure Classifier Benchmark**: ${benchmark.accuracy === null ? "n/a" : `${(benchmark.accuracy * 100).toFixed(1)}%`} accuracy (${benchmark.correct}/${benchmark.totalSamples} known failures)`,
    "",
    "## Evidence Artifacts",
    "",
    "- `tests/e2e/playwright-report/index.html`",
    "- `tests/e2e/test-results/junit.xml`",
    "- `reports/ai-failure-analysis.json`",
    "- `reports/ai-benchmark.json`",
    "- `reports/traceability-matrix.json`",
    "",
  ].join("\n");

  fs.writeFileSync(path.join(reportsDir, "executive-summary.json"), JSON.stringify(summary, null, 2));
  fs.writeFileSync(path.join(reportsDir, "executive-summary.md"), sanitizeText(md));
  console.log("Generated reports/executive-summary.md and reports/executive-summary.json");
}

const [command, ...rest] = process.argv.slice(2);

switch (command) {
  case "analyze-failures":
    {
      let resultsPath;
      let outputName;
      let offline = false;
      for (let i = 0; i < rest.length; i++) {
        if (rest[i] === "--offline") {
          offline = true;
        } else if ((rest[i] === "--results" || rest[i] === "--output") && rest[i + 1] && !rest[i + 1].startsWith("--")) {
          if (rest[i] === "--results") resultsPath = rest[++i]; else outputName = rest[++i];
        } else {
          throw new Error("Use --results <Playwright JSON>, --output <JSON filename>, and/or --offline.");
        }
      }
      await runAnalyzeFailures({ resultsPath, outputName, offline });
    }
    break;
  case "evaluate-ai":
    runEvaluateAi();
    break;
  case "coverage-matrix":
    runCoverageMatrix();
    break;
  case "reviewed-traceability":
    runReviewedTraceability();
    break;
  case "scenario-proposals":
    runScenarioProposals();
    break;
  case "prioritize":
    runPrioritize(rest);
    break;
  case "executive-report":
    await runExecutiveReport();
    break;
  default:
    console.error("Usage: node tools/ai-qa/cli.mjs <analyze-failures|evaluate-ai|coverage-matrix|reviewed-traceability|scenario-proposals|prioritize|executive-report>");
    process.exit(1);
}
