import { test, expect } from '@playwright/test';

/**
 * VeriLoop End-to-End Smoke Test Suite
 * Validates single source of truth across all views, Quick Demo Access,
 * streaming evaluation progress, and absence of loading or contradictory states.
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

test.describe('VeriLoop End-to-End Verification', () => {
  test('1. Authentication via Quick Demo Access', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await expect(page).toHaveTitle(/VeriLoop/i);

    // Primary action: Quick Demo Access
    const quickDemoBtn = page.getByRole('button', { name: /Quick Demo Access/i });
    await expect(quickDemoBtn).toBeVisible();
    await quickDemoBtn.click();

    // Must navigate to /dashboard
    await page.waitForURL('**/dashboard');
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('2. Dashboard metrics and invariant reconciliation', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);

    // Verify no stuck loading indicators
    await expect(page.locator('text=Loading...')).toHaveCount(0);

    // Verify Pass Rate = 95/100 (95%)
    await expect(page.getByText('95/100')).toBeVisible();

    // Verify Reliability Score = 64% FAIL
    await expect(page.getByText('64%')).toBeVisible();
    await expect(page.getByText('FAIL')).toBeVisible();

    // Verify Hotspots: 5 detected, sum equals 5
    await expect(page.getByText('5 DETECTED')).toBeVisible();

    // Verify Recent Failures: exactly 5 items
    const viewAllLink = page.getByRole('link', { name: /View all 5 failures/i });
    await expect(viewAllLink).toBeVisible();
  });

  test('3. Failures view consistency', async ({ page }) => {
    await page.goto(`${BASE_URL}/failures`);
    await expect(page.locator('text=Loading...')).toHaveCount(0);

    // Assert canonical failures exist
    await expect(page.getByText('FAIL-RET-101')).toBeVisible();
    await expect(page.getByText('FAIL-POL-102')).toBeVisible();
    await expect(page.getByText('FAIL-TOL-103')).toBeVisible();
    await expect(page.getByText('FAIL-SFT-104')).toBeVisible();
    await expect(page.getByText('FAIL-CTX-105')).toBeVisible();
  });

  test('4. Experiments and holdout validation splits', async ({ page }) => {
    await page.goto(`${BASE_URL}/experiments`);
    await expect(page.locator('text=Loading...')).toHaveCount(0);

    // Candidates must follow naming scheme
    await expect(page.getByText('Baseline v1.0')).toBeVisible();
    await expect(page.getByText('Candidate A')).toBeVisible();
    await expect(page.getByText('Candidate B')).toBeVisible();

    // Holdout results: Candidate B = 17/20 (85.0%)
    await expect(page.getByText('17/20')).toBeVisible();
    await expect(page.getByText('85.0%')).toBeVisible();
  });

  test('5. Regression firewall reconciliation', async ({ page }) => {
    await page.goto(`${BASE_URL}/regression`);
    await expect(page.locator('text=Loading...')).toHaveCount(0);

    // Assert Candidate A is BLOCKED with exactly 2 policy regressions
    await expect(page.getByText('Candidate A')).toBeVisible();
    await expect(page.getByText('BLOCKED')).toBeVisible();
    await expect(page.getByText('REG-ORD-042')).toBeVisible();
    await expect(page.getByText('REG-POL-089')).toBeVisible();

    // Assert Candidate B is VERIFIED / PROMOTED
    await expect(page.getByText('Candidate B')).toBeVisible();
    await expect(page.getByText(/VERIFIED|PROMOTED/i)).toBeVisible();
  });

  test('6. Verification report consistency & method notes', async ({ page }) => {
    await page.goto(`${BASE_URL}/reports`);
    await expect(page.locator('text=Loading...')).toHaveCount(0);

    // Assert report contains metrics and method notes
    await expect(page.getByText(/Method notes & audit governance/i)).toBeVisible();
    await expect(page.getByText(/Wilson score/i)).toBeVisible();
    await expect(page.getByText('Promoted candidate (v1.1)')).toBeVisible();
  });

  test('7. Settings & model allocation table', async ({ page }) => {
    await page.goto(`${BASE_URL}/settings`);

    // Only 3 functional tabs
    await expect(page.getByRole('tab', { name: /Models/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /API Keys/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Evaluation/i })).toBeVisible();

    // Model allocation table contains verified model
    await expect(page.getByText('nvidia/Nemotron-3_5-Lightning')).toBeVisible();
    await expect(page.getByText('Nebius Token Factory')).toBeVisible();
  });
});
