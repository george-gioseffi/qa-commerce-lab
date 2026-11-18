import assert from "node:assert/strict";
import fs from "node:fs";

// Verify the intentional assertion failed for the intended reason and made a real trace.
const report = JSON.parse(fs.readFileSync("tests/e2e/demo-test-results/results.json", "utf8"));
assert.equal(report.stats.unexpected, 1);
assert.equal(report.stats.expected, 0);
assert.equal(report.stats.skipped, 0);
const specs = (report.suites ?? []).flatMap((suite) => suite.specs ?? []);
assert.equal(specs.length, 1);
assert.equal(specs[0].title, "DEMO: capture a trace for a controlled catalog outage");
const results = specs[0].tests.flatMap((test) => test.results);
assert.equal(results.length, 1);
assert.equal(results[0].status, "failed");
assert.match(results[0].error?.message ?? "", /toHaveCount/);
assert.match(results[0].error?.message ?? "", /catalog-error/);
const trace = results[0].attachments.find((attachment) => attachment.name === "trace");
assert.ok(trace?.path && fs.statSync(trace.path).size > 0, "Trace missing or empty");
console.log("Controlled failure confirmed; non-empty Playwright trace exists.");
