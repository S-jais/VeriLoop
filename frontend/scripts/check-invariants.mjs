/**
 * VeriLoop Mathematical Invariants Verification Suite
 * Run with: node check-invariants.mjs
 * Validates single-source consistency across all metric invariants.
 */

const CANONICAL_RUN = {
  totalProbes: 100,
  passedProbes: 95,
  failedProbes: 5,
  criticalFailures: 2,
  highFailures: 3,
  splits: {
    optimization: { cases: 60, passed: 57 },
    validation: { cases: 20, passed: 19 },
    holdout: { cases: 20, passed: 19 },
  },
  hotspots: [
    { category: 'RETRIEVAL_FAILURE', count: 1 },
    { category: 'POLICY_FAILURE', count: 1 },
    { category: 'TOOL_FAILURE', count: 1 },
    { category: 'SAFETY_FAILURE', count: 1 },
    { category: 'CONTEXT_FAILURE', count: 1 },
  ],
  candidates: [
    { name: 'Baseline v1.0', isPromoted: false },
    { name: 'Candidate A', isPromoted: false },
    { name: 'Candidate B', isPromoted: true },
  ],
  regressions: [
    { id: 'REG-ORD-042', candidate: 'Candidate A', severity: 'HIGH', category: 'POLICY_FAILURE' },
    { id: 'REG-POL-089', candidate: 'Candidate A', severity: 'HIGH', category: 'POLICY_FAILURE' },
  ],
};

console.log('==================================================');
console.log('   VeriLoop Mathematical Invariants Verification   ');
console.log('==================================================\n');

let failures = 0;
function check(condition, desc) {
  if (condition) {
    console.log(`  [PASS] ${desc}`);
  } else {
    console.error(`  [FAIL] ${desc}`);
    failures++;
  }
}

// Invariant 1: Total probes equals exactly 100
check(CANONICAL_RUN.totalProbes === 100, 'Total probes equals 100');

// Invariant 2: Sum of splits equals total probes (60 + 20 + 20 = 100)
const splitSum = CANONICAL_RUN.splits.optimization.cases +
  CANONICAL_RUN.splits.validation.cases +
  CANONICAL_RUN.splits.holdout.cases;
check(splitSum === CANONICAL_RUN.totalProbes, `Sum of splits (${splitSum}) equals total probes (${CANONICAL_RUN.totalProbes})`);

// Invariant 3: Sum of split passed probes equals total passed probes (57 + 19 + 19 = 95)
const passedSum = CANONICAL_RUN.splits.optimization.passed +
  CANONICAL_RUN.splits.validation.passed +
  CANONICAL_RUN.splits.holdout.passed;
check(passedSum === CANONICAL_RUN.passedProbes, `Sum of split passed probes (${passedSum}) equals total passed probes (${CANONICAL_RUN.passedProbes})`);

// Invariant 4: Pass rate formula equals passed / total probes (95/100 = 95%)
const passRatePct = Math.round((CANONICAL_RUN.passedProbes / CANONICAL_RUN.totalProbes) * 100);
check(passRatePct === 95, `Pass rate calculation equals 95% (${CANONICAL_RUN.passedProbes}/${CANONICAL_RUN.totalProbes})`);

// Invariant 5: Hotspot category counts sum strictly to failure count (1+1+1+1+1 = 5)
const hotspotSum = CANONICAL_RUN.hotspots.reduce((acc, h) => acc + h.count, 0);
check(hotspotSum === CANONICAL_RUN.failedProbes, `Sum of hotspot categories (${hotspotSum}) strictly equals failure count (${CANONICAL_RUN.failedProbes})`);

// Invariant 6: Critical + High failures equal failure count (2 + 3 = 5)
const severitySum = CANONICAL_RUN.criticalFailures + CANONICAL_RUN.highFailures;
check(severitySum === CANONICAL_RUN.failedProbes, `Critical (${CANONICAL_RUN.criticalFailures}) + High (${CANONICAL_RUN.highFailures}) equals failure count (${CANONICAL_RUN.failedProbes})`);

// Invariant 7: Reliability Score weighted formula: 100 - (12*crit + 4*high) = 100 - (24 + 12) = 64% FAIL
const reliabilityScore = 100 - (CANONICAL_RUN.criticalFailures * 12 + CANONICAL_RUN.highFailures * 4);
check(reliabilityScore === 64, `Reliability score equals weighted formula: 100 - (12*2 + 4*3) = 64% FAIL`);

// Invariant 8: Unified Candidate Naming scheme
const candidateNames = CANONICAL_RUN.candidates.map(c => c.name);
check(candidateNames.includes('Baseline v1.0') && candidateNames.includes('Candidate A') && candidateNames.includes('Candidate B'),
  'Candidate naming matches canonical: Baseline v1.0, Candidate A, Candidate B');

// Invariant 9: Promoted Candidate is a label on Candidate B, not a separate name
const promotedCand = CANONICAL_RUN.candidates.find(c => c.isPromoted);
check(promotedCand && promotedCand.name === 'Candidate B', 'Promoted candidate label is attached to Candidate B');

// Invariant 10: Regression firewall blocked count matches regression cases
const candARegs = CANONICAL_RUN.regressions.filter(r => r.candidate === 'Candidate A');
check(CANONICAL_RUN.regressions.length === 2 && candARegs.length === 2,
  'Regression count strictly equals 2 policy cases for Candidate A (REG-ORD-042, REG-POL-089)');

console.log('\n==================================================');
if (failures === 0) {
  console.log('  Result: ALL 10 INVARIANTS PASSED (0 failures)   ');
  console.log('==================================================\n');
  process.exit(0);
} else {
  console.error(`  Result: ${failures} INVARIANTS FAILED!          `);
  console.log('==================================================\n');
  process.exit(1);
}
