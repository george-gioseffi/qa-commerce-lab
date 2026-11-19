// Counts are example-level; they are not per-class precision or recall.
export function summarizeBenchmark(results) {
  const totalSamples = results.length;
  const correct = results.filter((result) => result.predicted === result.expected).length;
  const unclassified = results.filter((result) => result.predicted === "UNCLASSIFIED");
  const falsePositives = results
    .filter((result) => result.predicted !== "UNCLASSIFIED" && result.predicted !== result.expected)
    .map(({ id, expected, predicted }) => ({ id, expected, predicted }));

  return {
    totalSamples,
    correct,
    accuracy: totalSamples === 0 ? null : Number((correct / totalSamples).toFixed(4)),
    incorrectCount: totalSamples - correct,
    falsePositiveCount: falsePositives.length,
    unclassifiedCount: unclassified.length,
    missedClassificationCount: unclassified.filter((result) => result.expected !== "UNCLASSIFIED").length,
    falsePositives,
    results,
  };
}
