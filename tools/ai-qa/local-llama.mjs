import { execFile as nodeExecFile } from "node:child_process";
import { promisify } from "node:util";

const execFile = promisify(nodeExecFile);
const CATEGORIES = new Set([
  "SELECTOR_DRIFT", "AUTH_FAILURE", "STOCK_OR_BUSINESS_CONFLICT",
  "NETWORK_OR_API_ERROR", "TIMEOUT_OR_SYNC", "DB_OR_ENV_ERROR",
  "ASSERTION_MISMATCH", "UNCLASSIFIED",
]);
const CONFIDENCE = new Set(["low", "medium", "high"]);

// Local, opt-in inference. Only fixed labels go into the prompt; no test logs,
// paths or secrets are handed to the model. This is not an OS sandbox.
export async function queryLocalLlama({ category, confidence, executable, model, libraryDir }, run = execFile) {
  if (process.platform !== "linux" || !CATEGORIES.has(category) || !CONFIDENCE.has(confidence) ||
      ![executable, model].every((v) => typeof v === "string" && v.startsWith("/") && !v.includes("\0")) ||
      (libraryDir !== undefined && (typeof libraryDir !== "string" || !libraryDir.startsWith("/") || libraryDir.includes("\0")))) return null;

  const prompt = `<|im_start|>system\nYou are a QA engineer. Write one short, practical action. Maximum 15 words. No introduction.\n<|im_end|>\n<|im_start|>user\nCategory: ${category}. Confidence: ${confidence}.\n<|im_end|>\n<|im_start|>assistant\n`;
  const args = ["-n", "15", executable, "--model", model, "--threads", "2", "--threads-batch", "2",
    "--ctx-size", "1024", "--batch-size", "128", "--predict", "64", "--temp", "0", "--no-warmup",
    "--no-display-prompt", "--simple-io", "--single-turn", "--prompt", prompt];
  const env = { PATH: "/usr/bin:/bin", HOME: "/tmp", LANG: "C.UTF-8" };
  if (libraryDir) env.LD_LIBRARY_PATH = libraryDir;
  try {
    const { stdout } = await run("/usr/bin/nice", args, {
      cwd: "/tmp", env, timeout: 90_000, maxBuffer: 256 * 1024, encoding: "utf8", windowsHide: true,
    });
    const suggestion = stdout.replace(/\n\s*> EOF by user\s*$/i, "").replace(/\s*\[end of text\]\s*$/i, "").trim();
    if (!suggestion || suggestion.length > 1000 || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(suggestion)) return null;
    return { suggestion, provider: "local-llama" };
  } catch {
    // In particular, do not log subprocess output, which could contain paths.
    return null;
  }
}
