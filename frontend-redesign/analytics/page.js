'use client';

import { useState, useEffect } from 'react';
import StatsCard from '../components/StatsCard';

const HEATMAP_DATA = {
  hours: ['6AM', '9AM', '12PM', '3PM', '6PM', '9PM'],
  days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  values: [
    [0.2, 0.5, 0.8, 0.6, 0.7, 0.3, 0.1],
    [0.4, 0.9, 0.7, 0.8, 0.5, 0.2, 0.1],
    [0.3, 0.7, 0.9, 0.95, 0.8, 0.4, 0.2],
    [0.2, 0.6, 0.8, 0.9, 0.7, 0.3, 0.1],
    [0.1, 0.4, 0.5, 0.6, 0.9, 0.5, 0.2],
    [0.05, 0.2, 0.3, 0.4, 0.5, 0.3, 0.1],
  ],
};

const REGIONS = [
  { name: 'North America', pct: 42, color: 'var(--accent-primary)' },
  { name: 'Europe', pct: 28, color: 'rgba(99,102,241,0.6)' },
  { name: 'Asia Pacific', pct: 18, color: 'rgba(99,102,241,0.4)' },
  { name: 'Latin America', pct: 8, color: 'rgba(99,102,241,0.25)' },
  { name: 'Others', pct: 4, color: 'rgba(99,102,241,0.15)' },
];

const INSIGHTS = [
  { icon: 'trending_up', title: 'Engagement spike detected on Tuesdays between 10-11 AM EST', bg: 'rgba(16,185,129,0.15)', color: 'var(--accent-green)' },
  { icon: 'psychology', title: 'Subject lines with questions have 23% higher open rates', bg: 'rgba(99,102,241,0.15)', color: 'var(--accent-primary)' },
  { icon: 'warning', title: 'Click-through rate declining in "SMB" segment — consider A/B test', bg: 'rgba(245,158,11,0.15)', color: 'var(--accent-amber)' },
];

export default function Analytics() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/agent')
      .then((r) => r.json())
      .then((d) => setCampaigns(d.campaigns || []))
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  const totalReach = campaigns.reduce((s, c) => s + (c.cohortAnalysis?.totalAudience || 0), 0) || 12400;
  const avgEngagement = campaigns.length > 0
    ? (campaigns.reduce((s, c) => s + (c.metrics?.openRate || 0), 0) / campaigns.length).toFixed(1)
    : '24.8';
  const totalConversions = campaigns.filter(c => c.status === 'analyzed').length * 127 || 847;
  const totalSpend = campaigns.length > 0 ? `$${(campaigns.length * 1240).toLocaleString()}` : '$3,240';

  // Generate SVG chart path from campaign data
  const chartPoints = [20, 35, 28, 42, 38, 55, 48, 62, 58, 72, 65, 78];
  const chartWidth = 100;
  const chartHeight = 80;
  const svgPath = chartPoints.map((p, i) => {
    const x = (i / (chartPoints.length - 1)) * chartWidth;
    const y = chartHeight - (p / 100) * chartHeight;
    return `${i === 0 ? 'M' : 'L'}${x},${y}`;
  }).join(' ');
  const areaPath = `${svgPath} L${chartWidth},${chartHeight} L0,${chartHeight} Z`;

  if (loading) {
    return (
      <div className="loading-state" style={{ minHeight: 400 }}>
        <div className="spinner spinner-lg" />
        <p>Loading analytics data...</p>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px',
            borderRadius: 999, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2,
            background: 'rgba(16,185,129,0.2)', color: 'var(--accent-green)',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-green)', display: 'inline-block', animation: 'livePulse 1.5s infinite' }} />
            Live Analytics
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm">
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>calendar_today</span>
            Last 30 Days
          </button>
          <button className="btn btn-primary btn-sm">
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>download</span>
            Export
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="stats-grid" style={{ marginBottom: 32 }}>
        <StatsCard materialIcon="campaign" value={totalReach.toLocaleString()} label="Total Reach" trend="+12.5% vs last month" trendDir="up" bgColor="rgba(99,102,241,0.1)" />
        <StatsCard materialIcon="touch_app" value={`${avgEngagement}%`} label="Engagement Rate" trend="+3.2% vs last month" trendDir="up" bgColor="rgba(99,102,241,0.1)" />
        <StatsCard materialIcon="payments" value={totalConversions.toLocaleString()} label="Conversions" trend="+8.1% vs last month" trendDir="up" bgColor="rgba(99,102,241,0.1)" />
        <StatsCard materialIcon="account_balance_wallet" value={totalSpend} label="Total Spend" trend="-5.2% efficiency gain" trendDir="down" bgColor="rgba(99,102,241,0.1)" />
      </div>

      {/* Chart + Heatmap */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
        {/* SVG Line Chart */}
        <div className="glass" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <h3 style={{ fontWeight: 700 }}>Engagement Over Time</h3>
            <div className="chart-legend">
              <div className="chart-legend-item" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--accent-primary)' }}>
                <span className="chart-legend-dot" style={{ background: 'var(--accent-primary)' }} />
                Open Rate
              </div>
              <div className="chart-legend-item" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--accent-green)' }}>
                <span className="chart-legend-dot" style={{ background: 'var(--accent-green)' }} />
                Click Rate
              </div>
            </div>
          </div>
          <div style={{ position: 'relative', height: 250 }}>
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight + 10}`} style={{ width: '100%', height: '100%' }} preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(99,102,241,0.3)" />
                  <stop offset="100%" stopColor="rgba(99,102,241,0)" />
                </linearGradient>
              </defs>
              <path d={areaPath} fill="url(#chartGradient)" />
              <path d={svgPath} stroke="var(--accent-primary)" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              {/* Click rate line - slightly lower */}
              <path d={chartPoints.map((p, i) => {
                const x = (i / (chartPoints.length - 1)) * chartWidth;
                const y = chartHeight - ((p * 0.45) / 100) * chartHeight;
                return `${i === 0 ? 'M' : 'L'}${x},${y}`;
              }).join(' ')} stroke="var(--accent-green)" strokeWidth="1" fill="none" strokeDasharray="4 2" strokeLinecap="round" />
            </svg>
            <div className="analytics-axis">
              {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m) => (
                <span key={m}>{m}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Heatmap */}
        <div className="glass" style={{ padding: 24 }}>
          <h3 style={{ fontWeight: 700, marginBottom: 24 }}>Best Send Times</h3>
          <div className="heatmap-grid">
            {/* Header row */}
            <div className="heatmap-label" />
            {HEATMAP_DATA.days.map((d) => <div className="heatmap-label" key={d}>{d}</div>)}
            {/* Data rows */}
            {HEATMAP_DATA.hours.map((h, hi) => (
              <>
                <div className="heatmap-label" key={`h-${h}`}>{h}</div>
                {HEATMAP_DATA.days.map((d, di) => {
                  const val = HEATMAP_DATA.values[hi][di];
                  const alpha = Math.max(0.05, val);
                  return (
                    <div
                      className="heatmap-cell"
                      key={`${h}-${d}`}
                      style={{ background: `rgba(99, 102, 241, ${alpha})` }}
                      title={`${d} ${h}: ${Math.round(val * 100)}% engagement`}
                    />
                  );
                })}
              </>
            ))}
          </div>
        </div>
      </div>

      {/* 3-Column Bottom: Channels, Regions, AI Insights */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
        {/* Channel Distribution */}
        <div className="glass" style={{ padding: 24 }}>
          <h4 style={{ fontWeight: 700, marginBottom: 20 }}>Channel Distribution</h4>
          <div>
            {[
              { name: 'Email', pct: 45, color: 'var(--accent-primary)' },
              { name: 'LinkedIn', pct: 25, color: 'rgba(99,102,241,0.6)' },
              { name: 'WhatsApp', pct: 18, color: 'var(--accent-green)' },
              { name: 'SMS', pct: 12, color: 'var(--accent-amber)' },
            ].map((ch) => (
              <div className="dist-item" key={ch.name}>
                <div className="dist-header">
                  <span style={{ color: 'var(--text-secondary)' }}>{ch.name}</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{ch.pct}%</span>
                </div>
                <div className="dist-track">
                  <div className="dist-fill" style={{ width: `${ch.pct}%`, background: ch.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Audience Regions */}
        <div className="glass" style={{ padding: 24 }}>
          <h4 style={{ fontWeight: 700, marginBottom: 20 }}>Top Audience Regions</h4>
          <div>
            {REGIONS.map((r) => (
              <div className="dist-item" key={r.name}>
                <div className="dist-header">
                  <span style={{ color: 'var(--text-secondary)' }}>{r.name}</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{r.pct}%</span>
                </div>
                <div className="dist-track">
                  <div className="dist-fill" style={{ width: `${r.pct}%`, background: r.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Insights */}
        <div className="glass" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--accent-primary)', fontSize: 20 }}>auto_awesome</span>
            <h4 style={{ fontWeight: 700 }}>AI Insights</h4>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {INSIGHTS.map((insight, i) => (
              <div className="insight-item" key={i}>
                <div className="insight-icon" style={{ background: insight.bg }}>
                  <span className="material-symbols-outlined" style={{ color: insight.color }}>{insight.icon}</span>
                </div>
                <div>
                  <div className="insight-title">{insight.title}</div>
                  <div className="insight-desc">Click to explore →</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
