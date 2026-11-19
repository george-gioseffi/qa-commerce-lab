import { execFile as nodeExecFile } from "node:child_process";
import { lstat, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
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

function isolatedEnvironment(env, workdir) {
  const allowed = ["PATH", "PATHEXT", "SYSTEMROOT", "WINDIR", "LANG", "LC_ALL"];
  return {
    ...Object.fromEntries(allowed.filter((key) => env[key] !== undefined).map((key) => [key, env[key]])),
    HOME: workdir, USERPROFILE: workdir,
    XDG_CONFIG_HOME: path.join(workdir, "config"), XDG_DATA_HOME: path.join(workdir, "data"),
    XDG_CACHE_HOME: path.join(workdir, "cache"), APPDATA: path.join(workdir, "appdata"),
    LOCALAPPDATA: path.join(workdir, "localappdata"), OPENCODE_DISABLE_CLAUDE_CODE: "1",
  };
}

async function absent(candidate) {
  try { await lstat(candidate); return false; }
  catch (error) { if (error?.code === "ENOENT") return true; throw error; }
}

// Broader OpenCode policy can override a project policy. Refuse to run if an
// ancestor or machine-wide configuration is present rather than guessing.
export async function noBroaderConfig(workdir) {
  const machine = process.platform === "win32"
    ? [path.join(process.env.ProgramData || process.env.PROGRAMDATA || "C:\\ProgramData", "opencode")]
    : process.platform === "darwin"
      ? ["/Library/Application Support/opencode", "/Library/Managed Preferences/ai.opencode.managed.plist"]
      : ["/etc/opencode"];
  for (const item of machine) if (!await absent(item)) return false;
  let parent = path.dirname(workdir);
  for (;;) {
    for (const rel of ["opencode.json", "opencode.jsonc", ".opencode", "AGENTS.md", "CLAUDE.md", ".git"]) {
      if (!await absent(path.join(parent, rel))) return false;
    }
    const next = path.dirname(parent);
    if (next === parent) break;
    parent = next;
  }
  return true;
}

function supportedVersion(value) {
  const match = /^(?:opencode v)?(\d+)\.(\d+)\.(\d+)$/.exec(value.trim());
  if (!match) return false;
  const [major, minor, patch] = match.slice(1).map(Number);
  return major === 2 && (minor > 2 || (minor === 2 && patch >= 6));
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
  // Windows/macOS temp paths can identify the local account. No external
  // request is made there until a privacy-preserving location is supported.
  if (process.platform !== "linux") return null;
  let workdir;
  try {
    if (await realpath("/tmp") !== "/tmp") return null;
    workdir = await mkdtemp("/tmp/qa-opencode-");
    if (!await noBroaderConfig(workdir)) return null;
    const env = isolatedEnvironment(process.env, workdir);
    const version = await run(executable, ["--version"], {
      cwd: workdir, env, timeout: 5_000, maxBuffer: 1024, encoding: "utf8", windowsHide: true,
    });
    if (!supportedVersion(version.stdout)) return null;
    const config = { policies: [
      ...["tool.use", "mcp.use", "plugin.use", "skill.use", "websearch.use"]
        .map((action) => ({ action, resource: "*", effect: "deny" })),
      { action: "provider.use", resource: "*", effect: "deny" },
      { action: "provider.use", resource: "opencode", effect: "allow" },
    ] };
    await writeFile(path.join(workdir, "opencode.json"), JSON.stringify(config), { mode: 0o600 });
    const prompt = `Give one short generic QA investigation suggestion for category ${category} and confidence ${confidence}. Do not use tools.`;
    const args = ["--standalone", "run", "--agent", "summary", "--model", MODEL,
      "--archived", "--format", "json", prompt];
    const { stdout } = await run(executable, args, {
      cwd: workdir, env, timeout: 60_000,
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
      const parent = "/tmp";
      if (path.dirname(resolved) === parent && path.basename(resolved).startsWith("qa-opencode-")) {
        await rm(resolved, { recursive: true, force: true }).catch(() => {});
      }
    }
  }
}
