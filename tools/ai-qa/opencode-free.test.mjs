import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { noBroaderConfig, queryFreeOpenCode } from "./opencode-free.mjs";
import { analyzeFailure } from "./classifier.mjs";

const good = [
  JSON.stringify({ type: "text", part: { text: "Check the server error log locally." } }),
  JSON.stringify({ type: "step_finish", part: { reason: "stop", cost: 0 } }),
].join("\n");

test("sends only fixed labels, pins the free model and denies tools", { skip: process.platform !== "linux" }, async () => {
  let called = false;
  const run = async (binary, args, options) => {
    if (args[0] === "--version") return { stdout: "opencode v2.3.0\n" };
    called = true;
    assert.equal(binary, "example-opencode");
    assert.deepEqual(args.slice(0, 7), ["--standalone", "run", "--agent", "summary", "--model", "opencode/deepseek-v4.1-flash-free", "--archived"]);
    assert.equal(args.at(-1), "Give one short generic QA investigation suggestion for category NETWORK_OR_API_ERROR and confidence medium. Do not use tools.");
    assert.ok(!("AI_QA_API_KEY" in options.env));
    assert.equal(options.env.HOME, options.cwd);
    assert.equal(options.env.USERPROFILE, options.cwd);
    assert.ok(options.env.XDG_CONFIG_HOME.startsWith(options.cwd));
    assert.ok(options.env.APPDATA.startsWith(options.cwd));
    assert.equal(options.timeout, 60_000);
    assert.equal(options.maxBuffer, 256 * 1024);
    const policies = JSON.parse(await readFile(`${options.cwd}/opencode.json`, "utf8")).policies;
    for (const action of ["tool.use", "mcp.use", "plugin.use", "skill.use", "websearch.use"]) {
      assert.ok(policies.some((p) => p.action === action && p.resource === "*" && p.effect === "deny"));
    }
    assert.ok(policies.some((p) => p.action === "provider.use" && p.resource === "*" && p.effect === "deny"));
    assert.ok(policies.some((p) => p.action === "provider.use" && p.resource === "opencode" && p.effect === "allow"));
    return { stdout: good };
  };
  const result = await queryFreeOpenCode({ category: "NETWORK_OR_API_ERROR", confidence: "medium", executable: "example-opencode" }, run);
  assert.equal(called, true);
  assert.equal(result?.reportedCost, 0);
  assert.equal(result?.suggestion, "Check the server error log locally.");
});

test("rejects arbitrary input without spawning a command", async () => {
  const run = () => { throw new Error("must not run"); };
  assert.equal(await queryFreeOpenCode({ category: "secret=123", confidence: "high" }, run), null);
  assert.equal(await queryFreeOpenCode({ category: "AUTH_FAILURE", confidence: "high; injected" }, run), null);
});

test("fails closed for rate limits, tool events, unknown cost and malformed output", { skip: process.platform !== "linux" }, async () => {
  for (const stdout of [
    JSON.stringify({ type: "error", error: { type: "provider.free-limit" } }),
    `${JSON.stringify({ type: "tool_use" })}\n${good}`,
    JSON.stringify({ type: "step_finish", part: { reason: "stop", cost: 1 } }),
    JSON.stringify({ type: "step_finish", part: { reason: "stop" } }),
    "not json",
    `${good}\n${JSON.stringify({ type: "step_finish", part: { reason: "stop", cost: 0 } })}`,
  ]) {
    assert.equal(await queryFreeOpenCode({ category: "AUTH_FAILURE", confidence: "high" }, async (_, args) => ({ stdout: args[0] === "--version" ? "2.3.0" : stdout })), null);
  }
  assert.equal(await queryFreeOpenCode({ category: "AUTH_FAILURE", confidence: "high" }, async () => { throw new Error("private error"); }), null);
});

test("rejects old, prerelease or malformed CLI versions before any inference", { skip: process.platform !== "linux" }, async () => {
  for (const version of ["2.2.5", "1.99.99", "2.3.0-beta", "3.0.0", "unavailable"]) {
    let calls = 0;
    const result = await queryFreeOpenCode({ category: "AUTH_FAILURE", confidence: "high" }, async () => {
      calls += 1;
      return { stdout: version };
    });
    assert.equal(result, null);
    assert.equal(calls, 1);
  }
});

test("refuses to launch when a broader project configuration exists", async () => {
  const parent = await mkdtemp(path.join(tmpdir(), "qa-config-test-"));
  try {
    await writeFile(path.join(parent, "AGENTS.md"), "private ancestor instruction");
    const workdir = path.join(parent, "workspace");
    await mkdir(workdir);
    assert.equal(await noBroaderConfig(workdir), false);
  } finally {
    const resolved = path.resolve(parent);
    if (path.dirname(resolved) === path.resolve(tmpdir()) && path.basename(resolved).startsWith("qa-config-test-")) {
      await rm(resolved, { recursive: true, force: true });
    }
  }
});

test("subprocess refuses an ancestor plugin directory before launching OpenCode", async () => {
  const parent = await mkdtemp(path.join(tmpdir(), "qa-plugin-test-"));
  try {
    await mkdir(path.join(parent, ".opencode", "plugins"), { recursive: true });
    const workdir = path.join(parent, "workspace");
    await mkdir(workdir);
    const moduleUrl = pathToFileURL(path.resolve("tools/ai-qa/opencode-free.mjs")).href;
    const source = `import {noBroaderConfig} from ${JSON.stringify(moduleUrl)}; console.log(JSON.stringify({safe:await noBroaderConfig(${JSON.stringify(workdir)})}));`;
    const { stdout } = await promisify(execFile)(process.execPath, ["--input-type=module", "-e", source], {
      env: { ...process.env, TMPDIR: parent, TEMP: parent, TMP: parent }, timeout: 5_000,
    });
    assert.deepEqual(JSON.parse(stdout), { safe: false });
  } finally {
    const resolved = path.resolve(parent);
    if (path.dirname(resolved) === path.resolve(tmpdir()) && path.basename(resolved).startsWith("qa-plugin-test-")) {
      await rm(resolved, { recursive: true, force: true });
    }
  }
});

test("non-Linux systems do not invoke a provider from a user-specific temp path", { skip: process.platform === "linux" }, async () => {
  let calls = 0;
  const result = await queryFreeOpenCode({ category: "AUTH_FAILURE", confidence: "high" }, async () => { calls++; return {stdout: "opencode v2.3.0"}; });
  assert.equal(result, null);
  assert.equal(calls, 0);
});

test("the classifier makes at most one free-provider attempt and keeps private input local", async () => {
  const old = process.env.AI_QA_OPENCODE_FREE;
  process.env.AI_QA_OPENCODE_FREE = "1";
  try {
    const sent = [];
    const queryOpenCode = async (data) => { sent.push(data); return null; };
    const a = await analyzeFailure({ error: "HTTP 500 PRIVATE-SECRET", name: "PRIVATE-NAME" }, { queryOpenCode });
    const b = await analyzeFailure({ error: "HTTP 500 OTHER-SECRET" }, { queryOpenCode });
    assert.equal(sent.length, 1);
    assert.equal(sent[0].category, "NETWORK_OR_API_ERROR");
    assert.ok(!JSON.stringify(sent).includes("PRIVATE"));
    assert.equal(a.adapter, "deterministic-heuristic-v1");
    assert.equal(b.adapter, "deterministic-heuristic-v1");
  } finally {
    if (old === undefined) delete process.env.AI_QA_OPENCODE_FREE;
    else process.env.AI_QA_OPENCODE_FREE = old;
  }
});
