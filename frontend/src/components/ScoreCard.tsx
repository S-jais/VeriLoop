'use client';

interface Props {
  label: string;
  value: number | string;
  icon?: React.ReactNode;
  valueColor?: string;
  suffix?: string;
}

export function ScoreCard({ label, value, icon, valueColor, suffix }: Props) {
  return (
    <div className="card space-y-1">
      <div className="fl" style={{ justifyContent: 'space-between' }}>
        <div className="lbl">{label}</div>
        {icon && <div className="mu">{icon}</div>}
      </div>
      <div
        className="big mono"
        style={{ color: valueColor || 'var(--tx)', fontSize: '24px', fontWeight: 700 }}
      >
        {value}{suffix}
      </div>
    </div>
  );
}

