'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';

const TABS = ['Overview', 'Performance', 'A/B Tests', 'Cohort Insights'];
const colors = ['#8b5cf6', '#3b82f6', '#06b6d4', '#ec4899', '#f59e0b', '#10b981', '#ef4444'];

export default function Analytics() {
  const [tab, setTab] = useState('Overview');
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/agent')
      .then((r) => r.json())
      .then((d) => setCampaigns(d.campaigns || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const metrics = useMemo(() => {
    const total = campaigns.length;
    const sent = campaigns.filter((c) => ['sent', 'analyzed', 'completed', 'optimizing'].includes(c.status));
    const withMetrics = campaigns.filter((c) => c.metrics?.openRate != null);
    const avgOpen = withMetrics.length > 0 ? (withMetrics.reduce((s, c) => s + (c.metrics?.openRate || 0), 0) / withMetrics.length).toFixed(1) : 0;
    const avgClick = withMetrics.length > 0 ? (withMetrics.reduce((s, c) => s + (c.metrics?.clickRate || 0), 0) / withMetrics.length).toFixed(1) : 0;
    let totalRecipients = 0;
    campaigns.forEach((c) => (c.contentVariants || []).forEach((v) => { totalRecipients += v.customerIds?.length || 0; }));
    const totalVariants = campaigns.reduce((s, c) => s + (c.contentVariants?.length || 0), 0);
    const totalSegments = campaigns.reduce((s, c) => s + (c.strategy?.segments?.length || 0), 0);
    const optimizations = campaigns.reduce((s, c) => s + (c.optimizationHistory?.length || 0), 0);
    return { total, sent: sent.length, avgOpen, avgClick, totalRecipients, totalVariants, totalSegments, optimizations, withMetrics };
  }, [campaigns]);

  // Sort campaigns by metrics for leaderboard
  const leaderboard = useMemo(() => {
    return [...campaigns]
      .filter((c) => c.metrics?.openRate != null)
      .sort((a, b) => (b.metrics?.openRate || 0) - (a.metrics?.openRate || 0));
  }, [campaigns]);

  // A/B test insights from variants
  const abTests = useMemo(() => {
    return campaigns
      .filter((c) => (c.contentVariants?.length || 0) > 1)
      .map((c) => ({
        campaign: c,
        variants: c.contentVariants || [],
        hasMetrics: c.metrics?.openRate != null,
      }));
  }, [campaigns]);

  // Segment cross-campaign performance
  const segmentPerf = useMemo(() => {
    const segs = {};
    campaigns.forEach((c) => {
      (c.strategy?.segments || []).forEach((seg) => {
        if (!segs[seg.name]) segs[seg.name] = { count: 0, campaigns: 0, customers: 0 };
        segs[seg.name].count++;
        segs[seg.name].campaigns++;
        segs[seg.name].customers += seg.count || seg.customerIds?.length || 0;
      });
    });
    return Object.entries(segs).sort((a, b) => b[1].campaigns - a[1].campaigns);
  }, [campaigns]);

  if (loading) {
    return (
      <>
        <div className="g4" style={{ marginBottom: 24 }}>
          {[1, 2, 3, 4].map((i) => <div key={i} className="stat-card"><div className="skeleton skeleton-text" style={{ width: '50%', height: 30 }} /></div>)}
        </div>
        <div className="card"><div className="skeleton skeleton-text" style={{ width: '100%', height: 300 }} /></div>
      </>
    );
  }

  return (
    <>
      {/* Tabs */}
      <div className="tabs tabs-underline" style={{ marginBottom: 24 }}>
        {TABS.map((t) => (
          <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {/* ─── Overview ─── */}
      {tab === 'Overview' && (
        <>
          <div className="g4" style={{ marginBottom: 24 }}>
            <div className="stat-card">
              <div className="stat-icon">📧</div>
              <div className="stat-value">{metrics.total}</div>
              <div className="stat-label">Total Campaigns</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">👥</div>
              <div className="stat-value">{metrics.totalRecipients.toLocaleString()}</div>
              <div className="stat-label">Recipients Reached</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">📬</div>
              <div className="stat-value">{metrics.avgOpen}%</div>
              <div className="stat-label">Avg Open Rate</div>
              {Number(metrics.avgOpen) > 0 && <div className={`stat-trend ${Number(metrics.avgOpen) > 20 ? 'up' : 'down'}`}>{Number(metrics.avgOpen) > 20 ? '↑' : '↓'} vs baseline</div>}
            </div>
            <div className="stat-card">
              <div className="stat-icon">🖱️</div>
              <div className="stat-value">{metrics.avgClick}%</div>
              <div className="stat-label">Avg Click Rate</div>
              {Number(metrics.avgClick) > 0 && <div className={`stat-trend ${Number(metrics.avgClick) > 5 ? 'up' : 'down'}`}>{Number(metrics.avgClick) > 5 ? '↑' : '↓'} vs baseline</div>}
            </div>
          </div>

          {/* Secondary metrics */}
          <div className="g4" style={{ marginBottom: 24 }}>
            <div className="mtile"><div className="mtile-val">{metrics.sent}</div><div className="mtile-label">Sent Campaigns</div></div>
            <div className="mtile"><div className="mtile-val">{metrics.totalVariants}</div><div className="mtile-label">Email Variants</div></div>
            <div className="mtile"><div className="mtile-val">{metrics.totalSegments}</div><div className="mtile-label">Segments</div></div>
            <div className="mtile"><div className="mtile-val">{metrics.optimizations}</div><div className="mtile-label">Optimizations</div></div>
          </div>

          {/* Campaign Performance Leaderboard */}
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>🏆 Campaign Performance Leaderboard</h3>
            {leaderboard.length > 0 ? (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Campaign</th>
                      <th>Open Rate</th>
                      <th>Click Rate</th>
                      <th>Recipients</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.slice(0, 10).map((c, i) => (
                      <tr key={c._id}>
                        <td style={{ fontWeight: 700, color: i < 3 ? 'var(--accent-yellow)' : 'var(--text-muted)' }}>{i + 1}</td>
                        <td>
                          <Link href={`/campaigns/${c._id}`} style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: 12 }}>
                            {c.brief?.substring(0, 50) || 'Untitled'}
                          </Link>
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, color: 'var(--accent-green)' }}>{c.metrics?.openRate}%</span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, color: 'var(--accent-blue)' }}>{c.metrics?.clickRate}%</span>
                        </td>
                        <td>{c.contentVariants?.reduce((s, v) => s + (v.customerIds?.length || 0), 0) || 0}</td>
                        <td><span className={`status-badge ${c.status === 'analyzed' ? 'info' : 'success'}`}>{c.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No analyzed campaigns yet. Analyze a sent campaign to see results.</p>
            )}
          </div>

          {/* Segment Performance Comparison */}
          <div className="card">
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Segment Performance Comparison</h3>
            {segmentPerf.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {segmentPerf.slice(0, 10).map(([name, data], i) => (
                  <div key={name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{name}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{data.customers} customers · {data.campaigns} campaigns</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${Math.min(100, (data.customers / (segmentPerf[0]?.[1]?.customers || 1)) * 100)}%`, background: colors[i % colors.length] }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No segment data available.</p>
            )}
          </div>
        </>
      )}

      {/* ─── Performance ─── */}
      {tab === 'Performance' && (
        <>
          {metrics.withMetrics.length > 0 ? (
            <>
              <div className="g2" style={{ marginBottom: 24 }}>
                {/* Open Rate Bar Chart */}
                <div className="card">
                  <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Open Rates by Campaign</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {metrics.withMetrics.slice(0, 8).map((c, i) => (
                      <div key={c._id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {c.brief?.substring(0, 30) || 'Campaign'}
                          </span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-green)' }}>{c.metrics.openRate}%</span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${c.metrics.openRate}%`, background: colors[i % colors.length] }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Click Rate Bar Chart */}
                <div className="card">
                  <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Click Rates by Campaign</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {metrics.withMetrics.slice(0, 8).map((c, i) => (
                      <div key={c._id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {c.brief?.substring(0, 30) || 'Campaign'}
                          </span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-blue)' }}>{c.metrics.clickRate}%</span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${c.metrics.clickRate}%`, background: colors[i % colors.length] }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Engagement Funnel */}
              <div className="card">
                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>📈 Engagement Funnel (Aggregated)</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 500 }}>
                  {[
                    { label: 'Total Sent', val: metrics.totalRecipients, pct: 100, color: '#8b5cf6' },
                    { label: 'Estimated Delivered', val: Math.round(metrics.totalRecipients * 0.95), pct: 95, color: '#3b82f6' },
                    { label: 'Estimated Opened', val: Math.round(metrics.totalRecipients * (Number(metrics.avgOpen) / 100)), pct: Number(metrics.avgOpen), color: '#10b981' },
                    { label: 'Estimated Clicked', val: Math.round(metrics.totalRecipients * (Number(metrics.avgClick) / 100)), pct: Number(metrics.avgClick), color: '#f59e0b' },
                  ].map((step, i) => (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{step.label}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: step.color }}>{step.val.toLocaleString()} ({step.pct}%)</span>
                      </div>
                      <div className="progress-bar" style={{ height: 10 }}>
                        <div className="progress-fill" style={{ width: `${step.pct}%`, background: step.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📊</div>
              <h3 className="empty-title">No performance data</h3>
              <p className="empty-desc">Analyze sent campaigns to see performance breakdowns.</p>
            </div>
          )}
        </>
      )}

      {/* ─── A/B Tests ─── */}
      {tab === 'A/B Tests' && (
        <>
          {abTests.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {abTests.map(({ campaign: c, variants }, ti) => (
                <div key={c._id} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div>
                      <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                        {c.brief?.substring(0, 80) || 'Untitled Campaign'}
                      </h4>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {variants.length} variants · {c.contentVariants?.reduce((s, v) => s + (v.customerIds?.length || 0), 0)} recipients
                      </span>
                    </div>
                    <span className={`status-badge ${c.metrics ? 'info' : 'draft'}`}>{c.metrics ? 'Analyzed' : 'Pending'}</span>
                  </div>

                  <div className="g2">
                    {variants.map((v, i) => (
                      <div key={i} style={{ padding: 12, background: 'var(--bg-primary)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: colors[i % colors.length] }}>
                            {v.variantName} ({v.targetSegment})
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{v.customerIds?.length || 0} recipients</span>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>
                          <strong>Subject:</strong> {v.subject}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', maxHeight: 40, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {v.body?.substring(0, 100)}...
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                    <Link href={`/campaigns/${c._id}?tab=Variants`} className="btn btn-sm btn-outline">View Variants</Link>
                    <Link href={`/campaigns/${c._id}?tab=Analytics`} className="btn btn-sm btn-ghost">📊 Full Analytics</Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">🔬</div>
              <h3 className="empty-title">No A/B tests</h3>
              <p className="empty-desc">Campaigns with multiple variants will appear here for comparison.</p>
            </div>
          )}
        </>
      )}

      {/* ─── Cohort Insights ─── */}
      {tab === 'Cohort Insights' && (
        <>
          {segmentPerf.length > 0 ? (
            <>
              {/* Segment performance matrix */}
              <div className="card" style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Segment Utilization Matrix</h3>
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Segment</th>
                        <th>Campaigns</th>
                        <th>Customers</th>
                        <th>Usage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {segmentPerf.map(([name, data], i) => (
                        <tr key={name}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 8, height: 8, borderRadius: '50%', background: colors[i % colors.length] }} />
                              <span style={{ fontSize: 12 }}>{name}</span>
                            </div>
                          </td>
                          <td>{data.campaigns}</td>
                          <td>{data.customers.toLocaleString()}</td>
                          <td>
                            <div className="progress-bar" style={{ width: 100 }}>
                              <div className="progress-fill" style={{ width: `${(data.campaigns / metrics.total) * 100}%`, background: colors[i % colors.length] }} />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* AI Recommendations */}
              <div className="card">
                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>💡 AI Recommendations</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {segmentPerf.slice(0, 3).map(([name, data], i) => (
                    <div key={name} style={{ padding: 12, background: 'var(--bg-primary)', borderRadius: 8, borderLeft: `3px solid ${colors[i]}` }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                        Target "{name}" segment more frequently
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        This segment has {data.customers} customers and has been used in {data.campaigns} campaigns.
                        Consider creating more targeted content for higher engagement.
                      </div>
                    </div>
                  ))}
                  {metrics.optimizations > 0 && (
                    <div style={{ padding: 12, background: 'var(--bg-primary)', borderRadius: 8, borderLeft: '3px solid var(--accent-green)' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                        Continue optimization cycles
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        {metrics.optimizations} optimization(s) have been run. Each cycle improves targeting accuracy by learning from performance data.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">🧬</div>
              <h3 className="empty-title">No cohort insights</h3>
              <p className="empty-desc">Create campaigns with customer segments to generate cohort insights.</p>
            </div>
          )}
        </>
      )}
    </>
  );
}
