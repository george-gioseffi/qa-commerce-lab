import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { queryFreeOpenCode } from "./opencode-free.mjs";

const good = [
  JSON.stringify({ type: "text", part: { text: "Check the server error log locally." } }),
  JSON.stringify({ type: "step_finish", part: { reason: "stop", cost: 0 } }),
].join("\n");

test("sends only fixed labels, pins the free model and denies tools", async () => {
  let called = false;
  const run = async (binary, args, options) => {
    called = true;
    assert.equal(binary, "example-opencode");
    assert.deepEqual(args.slice(0, 7), ["--standalone", "run", "--agent", "summary", "--model", "opencode/deepseek-v4.1-flash-free", "--archived"]);
    assert.equal(args.at(-1), "Give one short generic QA investigation suggestion for category NETWORK_OR_API_ERROR and confidence medium. Do not use tools.");
    assert.ok(!("AI_QA_API_KEY" in options.env));
    assert.equal(options.timeout, 60_000);
    assert.equal(options.maxBuffer, 256 * 1024);
    assert.deepEqual(JSON.parse(await readFile(`${options.cwd}/opencode.json`, "utf8")).policies,
      [{ action: "tool.use", resource: "*", effect: "deny" }]);
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

test("fails closed for rate limits, tool events, unknown cost and malformed output", async () => {
  for (const stdout of [
    JSON.stringify({ type: "error", error: { type: "provider.free-limit" } }),
    `${JSON.stringify({ type: "tool_use" })}\n${good}`,
    JSON.stringify({ type: "step_finish", part: { reason: "stop", cost: 1 } }),
    JSON.stringify({ type: "step_finish", part: { reason: "stop" } }),
    "not json",
    `${good}\n${JSON.stringify({ type: "step_finish", part: { reason: "stop", cost: 0 } })}`,
  ]) {
    assert.equal(await queryFreeOpenCode({ category: "AUTH_FAILURE", confidence: "high" }, async () => ({ stdout })), null);
  }
  assert.equal(await queryFreeOpenCode({ category: "AUTH_FAILURE", confidence: "high" }, async () => { throw new Error("private error"); }), null);
});
