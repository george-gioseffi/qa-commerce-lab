import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { buildReviewedTraceability, proposeReviewedScenarios } from "./reviewed-traceability.mjs";

test("curated references exist but do not assert execution", () => {
  const root = fileURLToPath(new URL("../../", import.meta.url));
  const results = buildReviewedTraceability(root);
  assert.ok(results.length > 0);
  for (const entry of results) {
    assert.equal(entry.allReferencesFound, true, entry.id);
    assert.equal(entry.executionVerified, false);
    assert.ok(entry.knownGap);
  }
});

test("missing or changed test titles are reported instead of treated as evidence", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "qa-traceability-"));
  try {
    fs.writeFileSync(path.join(root, "test.js"), 'test("real title", () => {});');
    const requirements = [{ id: "R", requirement: "demo", risk: "demo", priority: "alta",
      tests: [{ file: "test.js", title: "changed title" }], gap: { title: "gap" } }];
    const [entry] = buildReviewedTraceability(root, requirements);
    assert.equal(entry.references[0].found, false);
    assert.equal(entry.allReferencesFound, false);
    assert.equal(entry.executionVerified, false);
  } finally {
    fs.unlinkSync(path.join(root, "test.js"));
    fs.rmdirSync(root);
  }
});

test("scenario proposals contain concrete review fields and never modify the official suite", () => {
  const proposals = proposeReviewedScenarios();
  assert.ok(proposals.length > 0);
  for (const proposal of proposals) {
    for (const field of ["requirementId", "title", "objective", "preconditions", "expected", "risk", "priority", "type"]) {
      assert.ok(proposal[field], field);
    }
    assert.ok(proposal.steps.length > 0);
    assert.equal(proposal.status, "PROPOSTA_NAO_REVISADA");
    assert.equal(proposal.origin, "deterministic-curated-gap");
  }
});
