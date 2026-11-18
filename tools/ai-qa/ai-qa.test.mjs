import assert from "node:assert/strict";
import test from "node:test";
import { classifyFailureDeterministic, FAILURE_CATEGORIES } from "./classifier.mjs";
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
