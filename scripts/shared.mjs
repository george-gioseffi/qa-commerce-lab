import { spawnSync } from "node:child_process";
import net from "node:net";

export const rootDir = new URL("../", import.meta.url);

export function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    ...options,
  });

  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(" ")}`);
  }
}

export function canReachPort(host, port, timeoutMs = 1000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();

    const finish = (value) => {
      socket.destroy();
      resolve(value);
    };

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
    socket.connect(port, host);
  });
}

export async function waitForPort(host, port, label, retries = 30, delayMs = 1000) {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    if (await canReachPort(host, port, delayMs)) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw new Error(`${label} did not become reachable on ${host}:${port}.`);
}

export function dockerAvailable() {
  const result = spawnSync("docker", ["info"], {
    stdio: "ignore",
    shell: process.platform === "win32",
  });

  return result.status === 0;
}

export const DEFAULT_TEST_DATABASE_URL =
  "postgresql://postgres:postgres@127.0.0.1:55432/qa_commerce_lab_test?schema=public";

export function assertSafeTestDb(databaseUrl, confirmation) {
  let parsed;
  try { parsed = new URL(databaseUrl); } catch { throw new Error("Test database URL is invalid."); }
  const name = decodeURIComponent(parsed.pathname.slice(1));
  if (!["postgres:", "postgresql:"].includes(parsed.protocol) ||
      !["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname) ||
      !/^[a-zA-Z0-9_]+_test$/.test(name) || confirmation !== name) {
    throw new Error("Test database refused: use a local *_test database and set QA_CONFIRM_TEST_DB to its exact name.");
  }
}

export function parseDatabaseHostPort(databaseUrl) {
  try {
    const parsed = new URL(databaseUrl);
    return {
      host: parsed.hostname || "127.0.0.1",
      port: Number(parsed.port || 5432),
    };
  } catch {
    return { host: "127.0.0.1", port: 55432 };
  }
}
