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
