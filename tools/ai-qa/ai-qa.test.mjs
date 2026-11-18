import assert from "node:assert/strict";
import test from "node:test";
import { analyzeFailure, classifyFailureDeterministic, FAILURE_CATEGORIES } from "./classifier.mjs";
import { sanitizeText } from "./sanitizer.mjs";

test("sanitizeText redacts JWTs, DB passwords, and API keys", () => {
  const raw =
    "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.sig12345 " +
    "postgresql://postgres:mysecretpass@127.0.0.1:5432/db " +
    "gho_supersecrettoken12345";
  const cleaned = sanitizeText(raw);

  assert.equal(cleaned.includes("sig12345"), false);
  assert.equal(cleaned.includes("mysecretpass"), false);
  assert.equal(cleaned.includes("supersecrettoken12345"), false);
  assert.equal(cleaned.includes("[REDACTED_JWT]"), true);
  assert.equal(cleaned.includes("[REDACTED_PASSWORD]"), true);
  assert.equal(cleaned.includes("[REDACTED_KEY]"), true);
});

test("redacts common credentials in logs and failure metadata", () => {
  const result = classifyFailureDeterministic({
    name: "password=name-secret",
    file: "tests/token=file-secret",
    error: "Authorization: Bearer opaque-secret\nCookie: session=cookie-secret\npassword=plain-secret",
    attachments: [{ name: "api_key=attachment-secret", contentType: "text/plain", path: "token=path-secret" }],
    recentChangedFiles: ["secret=changed-secret"],
  });
  const serialized = JSON.stringify(result);
  for (const secret of ["name-secret", "file-secret", "opaque-secret", "cookie-secret", "plain-secret", "attachment-secret", "path-secret", "changed-secret"]) {
    assert.equal(serialized.includes(secret), false);
  }
});

test("external adapter sends only allowlisted classification fields and rejects insecure endpoints", async () => {
  const previousFetch = globalThis.fetch;
  const previousKey = process.env.AI_QA_API_KEY;
  const previousEndpoint = process.env.AI_QA_ENDPOINT;
  let captured;
  try {
    process.env.AI_QA_API_KEY = "fake-test-key";
    process.env.AI_QA_ENDPOINT = "https://example.com/analyze";
    globalThis.fetch = async (url, options) => {
      captured = { url: String(url), options };
      return { ok: true, json: async () => ({ hypothesis: "Review authentication." }) };
    };
    const result = await analyzeFailure({
      name: "private-test-title",
      file: "private-file-path",
      error: "401 password=private-secret opaque-private-content",
      attachments: [{ name: "private-attachment-name", path: "private-attachment-path" }],
      recentChangedFiles: ["private-changed-file"],
    });
    assert.equal(result.adapter, "external-llm-with-deterministic-fallback");
    assert.equal(captured.url, "https://example.com/analyze");
    assert.equal(captured.options.redirect, "error");
    const payload = JSON.parse(captured.options.body);
    assert.deepEqual(Object.keys(payload).sort(), ["max_tokens", "prompt"]);
    assert.match(payload.prompt, /AUTH_FAILURE/);
    assert.doesNotMatch(captured.options.body, /private-/);

    captured = undefined;
    process.env.AI_QA_ENDPOINT = "http://example.com/analyze";
    const fallback = await analyzeFailure({ error: "401" });
    assert.equal(fallback.adapter, "deterministic-heuristic-v1");
    assert.equal(captured, undefined);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.AI_QA_API_KEY; else process.env.AI_QA_API_KEY = previousKey;
    if (previousEndpoint === undefined) delete process.env.AI_QA_ENDPOINT; else process.env.AI_QA_ENDPOINT = previousEndpoint;
  }
});

test("classifyFailureDeterministic separates evidence from hypothesis and never marks verifiedAfterFix", () => {
  const result = classifyFailureDeterministic({
    name: "checkout prevents oversell",
    file: "tests/cart-checkout.spec.ts",
    durationMs: 1200,
    error: "409 Conflict: Insufficient stock for Mechanical Keyboard",
  });

  assert.equal(result.category, FAILURE_CATEGORIES.STOCK_OR_BUSINESS_CONFLICT);
  assert.equal(result.confidence, "high");
  assert.equal(result.verifiedAfterFix, false);
  assert.ok(result.evidence.sanitizedError.includes("409 Conflict"));
  assert.ok(result.hypothesis.length > 0);
});
