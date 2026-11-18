import { execFileSync } from "node:child_process";
import fs from "node:fs";

const rules = [
  { match: /auth/i, suites: ["apps/backend/src/test/api.spec.ts", "tests/e2e/tests/auth.spec.ts", "tests/e2e/tests/smoke.spec.ts"] },
  { match: /cart|checkout|orders/i, suites: ["apps/backend/src/test/unit.spec.ts", "apps/backend/src/test/api.spec.ts", "tests/e2e/tests/cart-checkout.spec.ts"] },
  { match: /products/i, suites: ["apps/backend/src/test/api.spec.ts", "tests/e2e/tests/catalog.spec.ts"] },
  { match: /frontend\/src/i, suites: ["tests/e2e/tests/smoke.spec.ts", "tests/e2e/tests/accessibility.spec.ts"] },
  { match: /tools\/ai-qa\//i, suites: ["tools/ai-qa/ai-qa.test.mjs", "tools/ai-qa/reviewed-traceability.test.mjs"] },
];

/** Determine changes without treating a clean checkout as an unchanged PR. */
export function changedFiles({ cwd = process.cwd(), env = process.env, base, head } = {}) {
  let source = "working-tree";
  if (base || head) {
    if (!base || !head) throw new Error("Both --base and --head are required.");
    source = "explicit-commit-range";
  } else if (env.GITHUB_EVENT_NAME === "pull_request") {
    if (!env.GITHUB_EVENT_PATH) throw new Error("Pull request event path is missing.");
    let event;
    try { event = JSON.parse(fs.readFileSync(env.GITHUB_EVENT_PATH, "utf8")); }
    catch { throw new Error("Pull request event could not be read."); }
    base = event?.pull_request?.base?.sha;
    head = event?.pull_request?.head?.sha;
    if (!/^[0-9a-f]{40}$/i.test(base ?? "") || !/^[0-9a-f]{40}$/i.test(head ?? "")) {
      throw new Error("Pull request base/head SHA is unavailable.");
    }
    source = "pull-request";
  }

  // Arguments are passed as separate values; never invoke a shell with refs.
  if (base && (base.startsWith("-") || head.startsWith("-"))) {
    throw new Error("Invalid commit reference.");
  }
  const args = base
    ? ["diff", "--name-only", "--no-renames", "-z", `${base}...${head}`, "--"]
    : ["diff", "--name-only", "--no-renames", "-z", "HEAD", "--"];
  let output;
  try { output = execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); }
  catch { throw new Error("Cannot compare Git revisions. Fetch the base and head history first."); }
  return { changedFiles: output.split("\0").filter(Boolean), source, ...(base ? { base, head } : {}) };
}

export function prioritizeFiles(files) {
  const suites = new Set();
  for (const file of files) {
    for (const rule of rules) {
      if (rule.match.test(file)) rule.suites.forEach((suite) => suites.add(suite));
    }
  }
  return [...suites];
}

export function prioritize(args = [], options = {}) {
  let base;
  let head;
  const files = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--base" || arg === "--head") {
      if (!args[i + 1] || args[i + 1].startsWith("--")) throw new Error(`${arg} requires a value.`);
      if (arg === "--base") base = args[++i]; else head = args[++i];
    } else if (arg.startsWith("--")) {
      throw new Error(`Unknown option: ${arg}`);
    } else {
      files.push(arg);
    }
  }
  if (files.length && (base || head)) throw new Error("Specify file paths or a commit range, not both.");
  const changes = files.length ? { changedFiles: files, source: "explicit-files" } : changedFiles({ ...options, base, head });
  const unmappedFiles = changes.changedFiles.filter((file) => !rules.some((rule) => rule.match.test(file)));
  return { ...changes, prioritizedSuites: prioritizeFiles(changes.changedFiles), unmappedFiles, note: "Full CI pipeline remains mandatory before merge. Unmapped files require manual review." };
}
