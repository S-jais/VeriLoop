/**
 * Mathematical Invariants Validator
 * This module asserts all mathematical invariants on the canonical EvaluationRun.
 * If any invariant breaks, it throws an error immediately, failing the Next.js build.
 */

import {
  CANONICAL_EVALUATION_RUN,
  selectMetrics,
  selectHotspots,
  selectSplits,
  selectRecentFailures,
} from './selectors';

export function assertInvariants(): void {
  const run = CANONICAL_EVALUATION_RUN;

  // 1. Total probes must be exactly 100
  if (run.probes.length !== 100) {
    throw new Error(`[INVARIANT FAILURE] Expected 100 total probes, found ${run.probes.length}`);
  }

  // 2. Sum of splits must equal total probes (60 + 20 + 20 = 100)
  const splits = selectSplits(run, 'Baseline v1.0');
  const splitSum = splits.optimization.cases + splits.validation.cases + splits.holdout.cases;
  if (splitSum !== run.probes.length) {
    throw new Error(
      `[INVARIANT FAILURE] Sum of splits (${splitSum}) does not equal total probes (${run.probes.length})`
    );
  }

  // 3. Sum of split passed probes must equal total passed probes (57 + 19 + 19 = 95)
  const metrics = selectMetrics(run);
  const passedSplitSum = splits.optimization.passed + splits.validation.passed + splits.holdout.passed;
  if (passedSplitSum !== metrics.passedProbes) {
    throw new Error(
      `[INVARIANT FAILURE] Sum of passed split probes (${passedSplitSum}) does not equal metrics.passedProbes (${metrics.passedProbes})`
    );
  }

  // 4. Pass rate must equal passed / total (95 / 100)
  const expectedPassRateStr = `${metrics.passedProbes}/${metrics.totalProbes}`;
  if (metrics.passRate !== expectedPassRateStr) {
    throw new Error(
      `[INVARIANT FAILURE] Pass rate string mismatch: '${metrics.passRate}' !== '${expectedPassRateStr}'`
    );
  }

  // 5. Hotspot category totals must strictly equal failure count (5 == 5)
  const hotspots = selectHotspots(run);
  const hotspotSum = hotspots.reduce((acc, h) => acc + h.count, 0);
  if (hotspotSum !== run.failures.length) {
    throw new Error(
      `[INVARIANT FAILURE] Hotspot totals (${hotspotSum}) do not equal failure count (${run.failures.length})`
    );
  }

  // 6. Recent failures table rows must equal failure count (5 == 5)
  const recentFailures = selectRecentFailures(run, 50);
  if (recentFailures.length !== run.failures.length) {
    throw new Error(
      `[INVARIANT FAILURE] Failure table rows (${recentFailures.length}) do not equal failure count (${run.failures.length})`
    );
  }

  // 7. Critical + High failures must equal failure count (2 + 3 = 5)
  if (metrics.criticalFailures + metrics.highFailures !== run.failures.length) {
    throw new Error(
      `[INVARIANT FAILURE] Critical (${metrics.criticalFailures}) + High (${metrics.highFailures}) !== total failures (${run.failures.length})`
    );
  }

  // 8. Reliability score must equal 100 - (12*crit + 4*high) = 100 - (24 + 12) = 64
  const expectedReliability = 100 - (metrics.criticalFailures * 12 + metrics.highFailures * 4);
  if (metrics.reliabilityScore !== expectedReliability) {
    throw new Error(
      `[INVARIANT FAILURE] Reliability score (${metrics.reliabilityScore}) !== expected weighted formula (${expectedReliability})`
    );
  }

  // 9. Naming scheme check
  const candidateNames = run.candidates.map((c) => c.name);
  if (!candidateNames.includes('Candidate A') || !candidateNames.includes('Candidate B')) {
    throw new Error(
      `[INVARIANT FAILURE] Candidate names must follow standard scheme: 'Candidate A', 'Candidate B'`
    );
  }

  const promoted = run.candidates.find((c) => c.isPromoted);
  if (!promoted || promoted.name !== 'Candidate B') {
    throw new Error(
      `[INVARIANT FAILURE] Promoted candidate label must be on Candidate B`
    );
  }

  // 10. Exactly 2 blocked regressions on Candidate A
  if (run.regressions.length !== 2) {
    throw new Error(
      `[INVARIANT FAILURE] Expected exactly 2 blocked regressions, found ${run.regressions.length}`
    );
  }
}

// Execute assertion on module import to guarantee build fails if broken
assertInvariants();
