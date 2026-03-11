'use client';

import { useState, useEffect, useMemo } from 'react';

const colors = ['#8b5cf6', '#3b82f6', '#06b6d4', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#a855f7', '#14b8a6', '#f97316'];

export default function CustomerCohort() {
  const [cohortData, setCohortData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [filterOpen, setFilterOpen] = useState(false);
  const perPage = 25;

  useEffect(() => {
    // Fetch cohort from the first campaign's data or via discover API
    fetch('/api/agent')
      .then((r) => r.json())
      .then((d) => {
        const campaigns = d.campaigns || [];
        // Try to get cohort data from a campaign that has strategy with cohortData
        for (const c of campaigns) {
          // The cohort data is typically passed through the workflow
          // For the cohort page, we'll look at campaign segments
        }
        setCohortData(campaigns);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Compute aggregate stats from all campaigns
  const stats = useMemo(() => {
    const totalCampaigns = cohortData.length;
    const activeCampaigns = cohortData.filter((c) => ['active', 'sent', 'optimizing'].includes(c.status)).length;
    const allSegments = cohortData.flatMap((c) => c.strategy?.segments || []);
    let totalRecipients = 0;
    cohortData.forEach((c) => {
      (c.contentVariants || []).forEach((v) => {
        totalRecipients += v.customerIds?.length || 0;
      });
    });
    return { totalCampaigns, activeCampaigns, segmentCount: allSegments.length, totalRecipients };
  }, [cohortData]);

  // Flatten all segments from all campaigns for demographic analysis
  const allSegments = useMemo(() => {
    return cohortData.flatMap((c) =>
      (c.strategy?.segments || []).map((seg) => ({ ...seg, campaignBrief: c.brief, campaignStatus: c.status }))
    );
  }, [cohortData]);

  // Get unique segment names + counts
  const segmentDistribution = useMemo(() => {
    const counts = {};
    allSegments.forEach((s) => { counts[s.name] = (counts[s.name] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [allSegments]);

  if (loading) {
    return (
      <>
        <div className="g4" style={{ marginBottom: 24 }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="stat-card">
              <div className="skeleton skeleton-text" style={{ width: '50%', height: 32 }} />
              <div className="skeleton skeleton-text" style={{ width: '70%', height: 14, marginTop: 8 }} />
            </div>
          ))}
        </div>
        <div className="g2">
          <div className="card"><div className="skeleton skeleton-text" style={{ width: '100%', height: 200 }} /></div>
          <div className="card"><div className="skeleton skeleton-text" style={{ width: '100%', height: 200 }} /></div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Stats */}
      <div className="g4" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-value">{stats.totalRecipients.toLocaleString()}</div>
          <div className="stat-label">Total Recipients</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-value">{stats.totalCampaigns}</div>
          <div className="stat-label">Total Campaigns</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🧩</div>
          <div className="stat-value">{stats.segmentCount}</div>
          <div className="stat-label">Segments Created</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🚀</div>
          <div className="stat-value">{stats.activeCampaigns}</div>
          <div className="stat-label">Active Campaigns</div>
        </div>
      </div>

      {/* Demographics / Segments */}
      <div className="g2" style={{ marginBottom: 24 }}>
        {/* Segment Distribution */}
        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Segment Distribution</h3>
          {segmentDistribution.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {segmentDistribution.slice(0, 10).map(([name, count], i) => {
                const maxCount = segmentDistribution[0]?.[1] || 1;
                return (
                  <div key={name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{name}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: colors[i % colors.length] }}>{count}</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${(count / maxCount) * 100}%`, background: colors[i % colors.length] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No segments created yet.</p>
          )}
        </div>

        {/* Behavioral Insights */}
        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Campaign Performance by Segment</h3>
          {allSegments.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {allSegments.slice(0, 8).map((seg, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--bg-primary)', borderRadius: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: colors[i % colors.length], flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{seg.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{seg.count || seg.customerIds?.length || 0} customers · {seg.recommendedTone}</div>
                  </div>
                  <span className={`status-badge ${seg.campaignStatus === 'sent' ? 'success' : seg.campaignStatus === 'analyzed' ? 'info' : 'default'}`} style={{ fontSize: 9 }}>
                    {seg.campaignStatus}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No segment data available.</p>
          )}
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600 }}>Campaign Cohort Data</h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div className="search-box" style={{ width: 240 }}>
              <span className="search-icon">🔍</span>
              <input
                type="text"
                className="search-input"
                placeholder="Search campaigns..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
          </div>
        </div>

        {cohortData.length > 0 ? (
          <>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Campaign</th>
                    <th>Status</th>
                    <th>Segments</th>
                    <th>Recipients</th>
                    <th>Variants</th>
                    <th>Open Rate</th>
                    <th>Click Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {cohortData
                    .filter((c) => !search || (c.brief || '').toLowerCase().includes(search.toLowerCase()))
                    .slice((page - 1) * perPage, page * perPage)
                    .map((c) => (
                      <tr key={c._id}>
                        <td style={{ maxWidth: 200 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {c.brief?.substring(0, 60) || 'Untitled'}
                          </div>
                        </td>
                        <td><span className={`status-badge ${c.status === 'sent' ? 'success' : c.status === 'analyzed' ? 'info' : 'default'}`}>{c.status}</span></td>
                        <td>{c.strategy?.segments?.length || 0}</td>
                        <td>{c.contentVariants?.reduce((s, v) => s + (v.customerIds?.length || 0), 0) || 0}</td>
                        <td>{c.contentVariants?.length || 0}</td>
                        <td>{c.metrics?.openRate != null ? `${c.metrics.openRate}%` : '—'}</td>
                        <td>{c.metrics?.clickRate != null ? `${c.metrics.clickRate}%` : '—'}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {cohortData.length > perPage && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
                <button className="btn btn-sm btn-outline" disabled={page === 1} onClick={() => setPage(page - 1)}>← Prev</button>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: '32px' }}>
                  Page {page} of {Math.ceil(cohortData.length / perPage)}
                </span>
                <button className="btn btn-sm btn-outline" disabled={page >= Math.ceil(cohortData.length / perPage)} onClick={() => setPage(page + 1)}>Next →</button>
              </div>
            )}
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <h3 className="empty-title">No cohort data</h3>
            <p className="empty-desc">Create campaigns to start building customer cohort insights.</p>
          </div>
        )}
      </div>
    </>
  );
}
