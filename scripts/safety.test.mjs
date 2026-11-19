import { test } from "node:test";
import assert from "node:assert/strict";
import { assertSafeTestDb } from "./shared.mjs";
import { isolatedComposeArgs } from "./compose-isolation.mjs";

test("a test reset requires a local test database and exact confirmation", () => {
  const valid = "postgresql://user:pass@127.0.0.1:55432/qa_commerce_lab_test";
  assert.doesNotThrow(() => assertSafeTestDb(valid, "qa_commerce_lab_test"));
  for (const [url, confirmation] of [
    [valid, undefined],
    [valid, "another_test"],
    ["postgresql://user:pass@127.0.0.1:5432/production", "production"],
    ["postgresql://user:pass@example.com:5432/qa_commerce_lab_test", "qa_commerce_lab_test"],
    ["https://localhost/qa_commerce_lab_test", "qa_commerce_lab_test"],
    ["not a url", "qa_commerce_lab_test"],
  ]) assert.throws(() => assertSafeTestDb(url, confirmation));
});

test("each Docker run receives a unique project scoped to its compose file", () => {
  const first = isolatedComposeArgs("docker-compose.test.yml");
  const second = isolatedComposeArgs("docker-compose.test.yml");
  assert.deepEqual(first.slice(0, 2), ["compose", "--project-name"]);
  assert.match(first[2], /^qalab-test-[0-9a-f-]{36}$/);
  assert.notEqual(first[2], second[2]);
  assert.deepEqual(first.slice(3), ["-f", "docker-compose.test.yml"]);
});
