'use client';

import { MotionCard } from './MotionComponents';

export default function StatsCard({ icon, materialIcon, value, label, trend, trendDir, bgColor }) {
  return (
    <MotionCard className="glass glass-hover stat-card-new">
      <div className="stat-card-new-top">
        <span className="stat-card-new-label">{label}</span>
        <div className="stat-card-new-icon" style={{ background: bgColor || 'rgba(163, 230, 53, 0.1)' }}>
          {materialIcon ? (
            <span className="material-symbols-outlined">{materialIcon}</span>
          ) : (
            <span style={{ fontSize: 18 }}>{icon}</span>
          )}
        </div>
      </div>
      <div className="stat-card-new-bottom">
        <div>
          <h3 className="stat-card-new-value">{value}</h3>
          {trend && (
            <p className={`stat-card-new-trend ${trendDir || 'up'}`}>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                {trendDir === 'down' ? 'trending_down' : 'trending_up'}
              </span>
              {trend}
            </p>
          )}
        </div>
      </div>
    </MotionCard>
  );
}
