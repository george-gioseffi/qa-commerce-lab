import assert from "node:assert/strict";
import test from "node:test";
import { queryLocalLlama } from "./local-llama.mjs";
import { analyzeFailure } from "./classifier.mjs";

test("local adapter only sends fixed labels and limits resources", { skip: process.platform !== "linux" }, async () => {
  let captured;
  const result = await queryLocalLlama({ category: "TIMEOUT_OR_SYNC", confidence: "medium", executable: "/opt/llama", model: "/opt/model", libraryDir: "/opt/lib" }, async (bin, args, options) => {
    captured = { bin, args, options };
    return { stdout: "Inspect the trace for the slow request. [end of text]\n" };
  });
  assert.equal(result.suggestion, "Inspect the trace for the slow request.");
  assert.equal(captured.bin, "/usr/bin/nice");
  assert.equal(captured.options.timeout, 90_000);
  assert.equal(captured.options.env.HOME, "/tmp");
  assert.equal(captured.options.env.LD_LIBRARY_PATH, "/opt/lib");
  assert.equal(captured.args[captured.args.indexOf("--threads") + 1], "2");
  assert.match(captured.args.at(-1), /TIMEOUT_OR_SYNC/);
  assert.equal(await queryLocalLlama({ category: "secret=abc", confidence: "medium", executable: "/x", model: "/m" }, () => { throw new Error("not allowed"); }), null);
  assert.equal(await queryLocalLlama({ category: "AUTH_FAILURE", confidence: "high", executable: "relative", model: "/m" }), null);
  assert.equal(await queryLocalLlama({ category: "AUTH_FAILURE", confidence: "high", executable: "/x", model: "/m" }, async () => { throw new Error("error"); }), null);
  assert.equal(await queryLocalLlama({ category: "AUTH_FAILURE", confidence: "high", executable: "/x", model: "/m" }, async () => ({stdout: ""})), null);
});

test("classifier uses local suggestion once, then stays deterministic", async () => {
  const previous = process.env.AI_QA_LOCAL_LLAMA;
  process.env.AI_QA_LOCAL_LLAMA = "1";
  try {
    let calls = 0;
    const queryLocal = async ({ category, confidence }) => {
      calls++;
      assert.equal(category, "AUTH_FAILURE");
      assert.equal(confidence, "high");
      return { suggestion: "Inspect the login fixture." };
    };
    const first = await analyzeFailure({ error: "401 private secret" }, { queryLocal });
    assert.equal(first.adapter, "local-llama-with-deterministic-fallback");
    assert.equal(first.hypothesis, "Inspect the login fixture.");
    const second = await analyzeFailure({ error: "401" }, { queryLocal });
    assert.equal(second.adapter, "deterministic-heuristic-v1");
    assert.equal(calls, 1);
  } finally {
    if (previous === undefined) delete process.env.AI_QA_LOCAL_LLAMA;
    else process.env.AI_QA_LOCAL_LLAMA = previous;
  }
});
