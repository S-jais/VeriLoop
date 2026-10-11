/**
 * Invariants assertion suite for VeriLoop.
 * Asserts mathematical integrity across all metrics.
 * Exits with code 1 if any invariant fails, breaking build.
 */

import {
  CANONICAL_EVALUATION_RUN,
  selectMetrics,
  selectHotspots,
  selectSplits,
  selectRecentFailures,
  selectExperimentTable,
} from '../src/lib/selectors.ts';

console.log('--- VeriLoop Mathematical Invariants Verification ---');

const run = CANONICAL_EVALUATION_RUN;
let failures = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ INVARIANT VIOLATION: ${message}`);
    failures++;
  } else {
    console.log(`✅ ${message}`);
  }
}

// Invariant 1: Total probes equals 100
assert(run.probes.length === 100, `Total probes must be exactly 100 (got ${run.probes.length})`);

// Invariant 2: Sum of splits equals total probes (60 + 20 + 20 = 100)
const baselineSplits = selectSplits(run, 'Baseline v1.0');
const splitSum = baselineSplits.optimization.cases + baselineSplits.validation.cases + baselineSplits.holdout.cases;
assert(
  splitSum === run.probes.length,
  `Sum of splits (${splitSum}) must equal total probes (${run.probes.length})`
);

// Invariant 3: Sum of split passed probes equals total passed probes (57 + 19 + 19 = 95)
const passedSplitSum = baselineSplits.optimization.passed + baselineSplits.validation.passed + baselineSplits.holdout.passed;
const metrics = selectMetrics(run);
assert(
  passedSplitSum === metrics.passedProbes,
  `Sum of passed split probes (${passedSplitSum}) must equal total passed probes (${metrics.passedProbes})`
);

// Invariant 4: Pass rate equals passed / total probes (95/100 = 95%)
assert(
  metrics.passRate === `${metrics.passedProbes}/${metrics.totalProbes}`,
  `Pass rate string '${metrics.passRate}' must equal '${metrics.passedProbes}/${metrics.totalProbes}'`
);
assert(
  metrics.passRatePct === Math.round((metrics.passedProbes / metrics.totalProbes) * 100),
  `Pass rate percentage (${metrics.passRatePct}%) must match calculation`
);

// Invariant 5: Hotspot category totals strictly equal failure count (5 == 5)
const hotspots = selectHotspots(run);
const hotspotSum = hotspots.reduce((acc, h) => acc + h.count, 0);
assert(
  hotspotSum === run.failures.length,
  `Sum of hotspot category counts (${hotspotSum}) must equal failure count (${run.failures.length})`
);

// Invariant 6: Failure table rows strictly equal failure count (5 == 5)
const recentFailures = selectRecentFailures(run, 50);
assert(
  recentFailures.length === run.failures.length,
  `Recent failures count (${recentFailures.length}) must equal total failure count (${run.failures.length})`
);

// Invariant 7: Critical + High failures equal failure count (2 + 3 = 5)
assert(
  metrics.criticalFailures + metrics.highFailures === run.failures.length,
  `Critical (${metrics.criticalFailures}) + High (${metrics.highFailures}) must equal total failures (${run.failures.length})`
);

// Invariant 8: Reliability Score matches documented weighted formula: 100 - (12*crit + 4*high)
const expectedReliability = 100 - (metrics.criticalFailures * 12 + metrics.highFailures * 4);
assert(
  metrics.reliabilityScore === expectedReliability,
  `Reliability score (${metrics.reliabilityScore}%) must equal weighted formula (${expectedReliability}%)`
);

// Invariant 9: Candidate naming scheme: 'Baseline v1.0', 'Candidate A', 'Candidate B'
const candidateNames = run.candidates.map((c) => c.name);
assert(
  candidateNames.includes('Candidate A') && candidateNames.includes('Candidate B'),
  `Candidates must follow standard naming scheme: 'Candidate A', 'Candidate B' (got ${candidateNames.join(', ')})`
);
const promoted = run.candidates.find((c) => c.isPromoted);
assert(
  promoted && promoted.name === 'Candidate B',
  `Promoted candidate label must be attached to Candidate B (got ${promoted ? promoted.name : 'none'})`
);

// Invariant 10: Regression firewall blocked count matches regression cases
assert(
  run.regressions.length === 2,
  `Regressions list must contain exactly 2 blocked regression cases (got ${run.regressions.length})`
);
const candARegressions = run.regressions.filter((r) => r.candidate === 'Candidate A');
assert(
  candARegressions.length === 2,
  `Candidate A must be attributable for 2 regressions (got ${candARegressions.length})`
);

if (failures > 0) {
  console.error(`\nFAILED: ${failures} invariant checks failed.`);
  process.exit(1);
} else {
  console.log('\nSUCCESS: All 10 VeriLoop mathematical invariants verified.');
}
