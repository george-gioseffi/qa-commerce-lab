import { execFile as nodeExecFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

// This adapter sends only one of these fixed, non-sensitive labels. Never add
// test names, paths, logs, error messages, credentials or arbitrary input here.
const CATEGORIES = new Set([
  "SELECTOR_DRIFT", "AUTH_FAILURE", "STOCK_OR_BUSINESS_CONFLICT",
  "NETWORK_OR_API_ERROR", "TIMEOUT_OR_SYNC", "DB_OR_ENV_ERROR",
  "ASSERTION_MISMATCH", "UNCLASSIFIED",
]);
const CONFIDENCE = new Set(["low", "medium", "high"]);
const MODEL = "opencode/deepseek-v4.1-flash-free";
const execFile = promisify(nodeExecFile);

function safeEnvironment(env) {
  const allowed = ["HOME", "USERPROFILE", "PATH", "PATHEXT", "SYSTEMROOT", "WINDIR",
    "APPDATA", "LOCALAPPDATA", "TMPDIR", "TMP", "TEMP", "LANG", "LC_ALL", "USER", "LOGNAME",
    "XDG_CONFIG_HOME", "XDG_DATA_HOME", "XDG_CACHE_HOME"];
  return Object.fromEntries(allowed.filter((key) => env[key] !== undefined).map((key) => [key, env[key]]));
}

/**
 * Optional OpenCode-only free-model experiment. Returns null on any failure.
 * Opt in by calling explicitly; no raw failure data is ever accepted. Explicit
 * free model selection must fail rather than switch to another model. The
 * external provider may rate-limit or discontinue the free model.
 */
export async function queryFreeOpenCode({ category, confidence, executable = "opencode" }, run = execFile) {
  if (!CATEGORIES.has(category) || !CONFIDENCE.has(confidence) ||
      typeof executable !== "string" || !executable || executable.includes("\0")) return null;
  let workdir;
  try {
    workdir = await mkdtemp(path.join(tmpdir(), "qa-opencode-"));
    const config = { policies: [{ action: "tool.use", resource: "*", effect: "deny" }] };
    await writeFile(path.join(workdir, "opencode.json"), JSON.stringify(config), { mode: 0o600 });
    const prompt = `Give one short generic QA investigation suggestion for category ${category} and confidence ${confidence}. Do not use tools.`;
    const args = ["--standalone", "run", "--agent", "summary", "--model", MODEL,
      "--archived", "--format", "json", prompt];
    const { stdout } = await run(executable, args, {
      cwd: workdir, env: safeEnvironment(process.env), timeout: 60_000,
      maxBuffer: 256 * 1024, encoding: "utf8", windowsHide: true,
    });
    let text = "";
    let finished = 0;
    for (const line of stdout.split(/\r?\n/).filter(Boolean)) {
      const event = JSON.parse(line);
      if (event.type === "error" || event.type === "tool_use" || event.part?.type === "tool") return null;
      if (event.type === "text") text += event.part?.text ?? "";
      if (event.type === "step_finish") {
        if (event.part?.reason !== "stop" || event.part?.cost !== 0) return null;
        finished += 1;
      }
    }
    text = text.trim();
    if (finished !== 1 || !text || text.length > 1000) return null;
    return { suggestion: text, provider: "opencode", model: MODEL, reportedCost: 0 };
  } catch {
    // Do not log subprocess output: it could contain user configuration.
    return null;
  } finally {
    if (workdir) {
      const resolved = path.resolve(workdir);
      const parent = path.resolve(tmpdir());
      if (path.dirname(resolved) === parent && path.basename(resolved).startsWith("qa-opencode-")) {
        await rm(resolved, { recursive: true, force: true }).catch(() => {});
      }
    }
  }
}
