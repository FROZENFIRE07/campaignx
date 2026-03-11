'use client';

export default function StatsCard({ icon, value, label, trend, trendDir, bgColor }) {
  return (
    <div className="stat-card hover-lift">
      <div
        className="stat-card-icon"
        style={{ background: bgColor || 'rgba(99, 102, 241, 0.1)' }}
      >
        {icon}
      </div>
      <div className="stat-card-value">{value}</div>
      <div className="stat-card-label">{label}</div>
      {trend && (
        <div className={`stat-card-trend ${trendDir || 'up'}`}>
          {trendDir === 'down' ? '↓' : '↑'} {trend}
        </div>
      )}
    </div>
  );
}
