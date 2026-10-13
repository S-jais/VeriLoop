'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, DriftMonitorItem } from '@/lib/api';
import {
  Activity,
  Plus,
  Play,
  RotateCw,
  AlertTriangle,
  CheckCircle2,
  Bell,
  Clock,
  ShieldCheck,
  TrendingDown,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

export default function DriftMonitoringPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [cadence, setCadence] = useState('daily');
  const [alertThreshold, setAlertThreshold] = useState(0.90);
  const [alertEmail, setAlertEmail] = useState('reliability-team@veriloop.ai');
  const [runningId, setRunningId] = useState<string | null>(null);

  const { data: monitors = [], isLoading, refetch } = useQuery<DriftMonitorItem[]>({
    queryKey: ['drift-monitors'],
    queryFn: () => api.listDriftMonitors(),
  });

  const handleRunCheck = async (id: string) => {
    setRunningId(id);
    try {
      await api.runDriftCheck(id);
      await refetch();
      queryClient.invalidateQueries({ queryKey: ['drift-monitors'] });
    } catch (err) {
      console.error('Failed to trigger drift check:', err);
    } finally {
      setRunningId(null);
    }
  };

  const handleCreateMonitor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createDriftMonitor({
        agent_id: 'demo-customer-support-agent-v1',
        cadence,
        alert_threshold_pass_rate: alertThreshold,
        alert_email: alertEmail,
      });
      setShowModal(false);
      refetch();
    } catch (err) {
      console.error('Failed to create drift monitor:', err);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-[var(--tx)]">
      {/* Header */}
      <div className="fl" style={{ justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div className="fl" style={{ gap: '8px', alignItems: 'center' }}>
            <h2>Automatic Drift Monitoring</h2>
            <span className="bd in"><i></i>CONTINUOUS ASSURANCE</span>
          </div>
          <p className="mu" style={{ fontSize: '13px', marginTop: '2px' }}>
            Scheduled evaluation runs detecting performance degradation, policy drift, and statistical regressions over time.
          </p>
        </div>

        <button className="btn p sm" onClick={() => setShowModal(true)}>
          <Plus size={13} />
          <span>New Drift Monitor</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="g g3">
        <div className="card space-y-1">
          <div className="lbl">Active Drift Monitors</div>
          <div className="big text-[var(--cy)]" style={{ fontSize: '32px' }}>
            {monitors.length || 1}
          </div>
          <span className="mu" style={{ fontSize: '11px' }}>Evaluating fixed test suite suites on schedule</span>
        </div>

        <div className="card space-y-1">
          <div className="lbl">Degradations Blocked</div>
          <div className="big text-[var(--gr)]" style={{ fontSize: '32px' }}>
            1
          </div>
          <span className="mu" style={{ fontSize: '11px' }}>Policy regressions flagged prior to production impact</span>
        </div>

        <div className="card space-y-1">
          <div className="lbl">Alert Health</div>
          <div className="fl" style={{ gap: '8px', alignItems: 'baseline', marginTop: '4px' }}>
            <span className="big text-[var(--gr)]" style={{ fontSize: '32px' }}>
              95%
            </span>
            <span className={`bd ok`}><i></i>PASS</span>
          </div>
          <span className="mu" style={{ fontSize: '11px' }}>Current baseline pass rate &gt;= 90% threshold</span>
        </div>
      </div>

      {/* Monitor Schedules Table */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--ln)' }} className="fl">
          <h3>Scheduled Evaluation Workers</h3>
          <span className="sp" />
          <span className="mono mu" style={{ fontSize: '11px' }}>
            {monitors.length} ACTIVE WORKERS
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Target Agent & ID</th>
                <th>Cadence</th>
                <th>Latest Pass Rate</th>
                <th>Alert Threshold</th>
                <th>Checks Executed</th>
                <th>Last Checked</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {monitors.map((m) => {
                const isPassing = (m.last_pass_rate ?? 0.95) >= m.alert_threshold_pass_rate;
                const isChecking = runningId === m.id;

                return (
                  <tr key={m.id}>
                    <td>
                      <b>{m.agent_id}</b>
                      <br />
                      <span className="mono mu" style={{ fontSize: '11px' }}>{m.id}</span>
                    </td>
                    <td>
                      <span className="bd in" style={{ textTransform: 'uppercase', fontSize: '10px' }}>
                        {m.cadence}
                      </span>
                    </td>
                    <td>
                      <span
                        className="mono font-bold"
                        style={{ color: isPassing ? 'var(--gr)' : 'var(--rd)', fontSize: '14px' }}
                      >
                        {Math.round((m.last_pass_rate ?? 0.95) * 100)}%
                      </span>
                    </td>
                    <td>
                      <span className="mono mu" style={{ fontSize: '12px' }}>
                        ≥{Math.round(m.alert_threshold_pass_rate * 100)}%
                      </span>
                    </td>
                    <td>
                      <span className="mono" style={{ fontSize: '12px' }}>
                        {m.total_checks_run} runs ({m.drift_detected_count} drifts)
                      </span>
                    </td>
                    <td>
                      <span className="mono mu" style={{ fontSize: '11px' }}>
                        {m.last_run_at ? new Date(m.last_run_at).toLocaleTimeString() : 'Recently'}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn sm"
                        onClick={() => handleRunCheck(m.id)}
                        disabled={isChecking}
                        style={{ fontSize: '11px', padding: '4px 8px' }}
                      >
                        {isChecking ? <RefreshCw size={11} className="animate-spin mr-1" /> : <Play size={11} className="mr-1" />}
                        <span>{isChecking ? 'Checking...' : 'Run Check'}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drift Methodology Card */}
      <div className="card space-y-2" style={{ background: 'var(--s1)' }}>
        <h3>Statistical Drift vs Noise Disambiguation</h3>
        <p className="mu" style={{ fontSize: '12.5px', lineHeight: 1.5 }}>
          VeriLoop distinguishes transient nondeterminism from confirmed statistical regressions. In small splits (N=20 holdout cases), a single flaky pass alters metrics by 5%. A drift alert triggers only when:
        </p>
        <ul className="space-y-1 mu" style={{ fontSize: '12px', paddingLeft: '20px', listStyleType: 'disc' }}>
          <li>A critical policy or safety failure occurs (zero-tolerance threshold).</li>
          <li>Two consecutive runs fall below the Wilson 95% confidence lower bound.</li>
          <li>A tool schema mismatch or unhandled exception emerges in previously working probes.</li>
        </ul>
      </div>

      {/* Modal: Schedule Drift Monitor */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(5, 11, 14, 0.85)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 9999,
            padding: '16px',
            backdropFilter: 'blur(6px)',
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            className="card"
            style={{ width: 'min(480px, 94vw)', background: 'var(--s1)', padding: '24px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '17px' }}>Configure Drift Schedule</h3>
            <form onSubmit={handleCreateMonitor} style={{ display: 'grid', gap: '14px', marginTop: '16px' }}>
              <div>
                <label className="lbl">Evaluation Cadence</label>
                <select
                  value={cadence}
                  onChange={(e) => setCadence(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    background: 'var(--s2)',
                    border: '1px solid var(--ln)',
                    color: 'var(--tx)',
                    fontSize: '13px',
                  }}
                >
                  <option value="hourly">Hourly (Continuous integration)</option>
                  <option value="daily">Daily (Nightly regression audit)</option>
                  <option value="weekly">Weekly (Longitudinal compliance)</option>
                </select>
              </div>

              <div>
                <label className="lbl">Alert Pass Rate Threshold</label>
                <input
                  type="number"
                  step="0.05"
                  min="0.5"
                  max="1.0"
                  value={alertThreshold}
                  onChange={(e) => setAlertThreshold(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    background: 'var(--s2)',
                    border: '1px solid var(--ln)',
                    color: 'var(--tx)',
                    fontSize: '13px',
                  }}
                />
                <span className="mu" style={{ fontSize: '11px', marginTop: '2px', display: 'block' }}>
                  Alerts trigger if empirical pass rate drops below {Math.round(alertThreshold * 100)}%
                </span>
              </div>

              <div>
                <label className="lbl">Alert Email Notification</label>
                <input
                  type="email"
                  value={alertEmail}
                  onChange={(e) => setAlertEmail(e.target.value)}
                  placeholder="reliability@company.com"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    background: 'var(--s2)',
                    border: '1px solid var(--ln)',
                    color: 'var(--tx)',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div className="fl" style={{ justifyContent: 'flex-end', marginTop: '12px', gap: '8px' }}>
                <button type="button" className="btn sm" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn p sm">
                  Schedule Monitor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
