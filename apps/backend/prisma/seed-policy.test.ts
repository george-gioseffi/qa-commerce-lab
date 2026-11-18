import { test } from "node:test";
import assert from "node:assert/strict";
import { validateTestReset } from "./seed-policy.js";

test("seed reset rejects an unconfirmed, non-test or remote target before connecting", () => {
  const testUrl = "postgresql://user:pass@localhost:5432/qa_commerce_lab_test";
  assert.doesNotThrow(() => validateTestReset(testUrl, "qa_commerce_lab_test"));
  assert.throws(() => validateTestReset(testUrl, undefined));
  assert.throws(() => validateTestReset("postgresql://user:pass@localhost/prod", "prod"));
  assert.throws(() => validateTestReset("postgresql://user:pass@remote/qa_commerce_lab_test", "qa_commerce_lab_test"));
  assert.throws(() => validateTestReset("https://localhost/qa_commerce_lab_test", "qa_commerce_lab_test"));
});
