'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';

const TABS = ['Overview', 'Analytics', 'Variants', 'History'];
const statusColor = (s) => ({ draft: 'draft', active: 'active', sent: 'success', completed: 'success', analyzed: 'info', optimizing: 'ai', pending_approval: 'warning', error: 'danger' }[s] || 'default');

export default function CampaignDetail() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('tab') || 'Overview');
  const [campaign, setCampaign] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [refreshingReport, setRefreshingReport] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [approving, setApproving] = useState(false);
  const [autoFetched, setAutoFetched] = useState(false);

  useEffect(() => {
    fetch(`/api/campaigns/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setCampaign(d.campaign);
        setLogs(d.logs || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    // Auto-fetch report once if it's sent but doesn't have a report yet.
    if (campaign && !campaign.reportData && ['sent', 'completed'].includes(campaign.status) && !autoFetched && !refreshingReport) {
      setAutoFetched(true);
      handleFetchLatestReport();
    }
  }, [campaign?.status, campaign?.reportData, autoFetched, refreshingReport]);

  const handleApprove = async () => {
    setApproving(true);
    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', campaignId: id }),
      });
      const data = await res.json();
      if (data.success) {
        setCampaign((prev) => ({ ...prev, status: 'sent', campaignId: data.externalCampaignIds?.[0] || data.campaignId || prev.campaignId }));
      }
    } catch { /* ignore */ }
    setApproving(false);
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'analyze', campaignId: campaign.campaignId, dbCampaignId: id }),
      });
      const data = await res.json();
      if (data.success) {
        setCampaign((prev) => ({
          ...prev,
          campaignId: prev?.campaignId || data.campaignId,
          metrics: data.analysis?.overallPerformance,
          reportData: data.report?.data,
          status: 'analyzed',
          optimizationHistory: [...(prev?.optimizationHistory || []), data.optimization].filter(Boolean),
        }));
        if (data.logs) setLogs((prev) => [...prev, ...data.logs]);
      }
    } catch { /* ignore */ }
    setAnalyzing(false);
  };

  const handleFetchLatestReport = async () => {
    setRefreshingReport(true);
    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'report', dbCampaignId: id, campaignId: campaign?.campaignId }),
      });
      const data = await res.json();
      if (data.success) {
        setCampaign((prev) => ({ ...prev, reportData: data.report?.data || [], campaignId: prev?.campaignId || data.campaignId }));
      }
    } catch { /* ignore */ }
    setRefreshingReport(false);
  };

  const toOptimizedVariants = (optimization) => {
    const segs = optimization?.newSegments || [];
    return segs
      .filter((seg) => Array.isArray(seg.customerIds) && seg.customerIds.length > 0)
      .map((seg, idx) => ({
        variantName: seg.name || `Optimized Variant ${idx + 1}`,
        targetSegment: seg.name || 'Optimized Segment',
        subject: seg.newSubject || 'SuperBFSI - Updated Offer',
        body: seg.newBody || 'Discover our updated offer tailored for you.',
        sendTime: seg.recommendedSendTime || null,
        customerIds: seg.customerIds,
      }));
  };

  const handleOptimize = async () => {
    const latestOptimization = campaign?.optimizationHistory?.[campaign.optimizationHistory.length - 1];
    const optimizedVariants = toOptimizedVariants(latestOptimization);
    if (optimizedVariants.length === 0) return;

    setOptimizing(true);
    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'optimize', dbCampaignId: id, optimizedVariants }),
      });
      const data = await res.json();
      if (data.success) {
        setCampaign((prev) => ({ ...prev, status: 'optimizing', iteration: (prev?.iteration || 1) + 1 }));
      }
    } catch { /* ignore */ }
    setOptimizing(false);
  };

  if (loading) {
    return (
      <div className="card">
        <div className="skeleton skeleton-text" style={{ width: '40%', height: 28 }} />
        <div className="skeleton skeleton-text" style={{ width: '100%', height: 80, marginTop: 16 }} />
        <div className="skeleton skeleton-text" style={{ width: '60%', height: 20, marginTop: 12 }} />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🚫</div>
        <h3 className="empty-title">Campaign not found</h3>
        <p className="empty-desc">This campaign may have been deleted or the URL is incorrect.</p>
        <Link href="/campaigns" className="btn btn-primary" style={{ marginTop: 12 }}>← Back to Campaigns</Link>
      </div>
    );
  }

  const totalRecipients = campaign.contentVariants?.reduce((s, v) => s + (v.customerIds?.length || 0), 0) || 0;

  return (
    <>
      {/* Breadcrumb */}
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
        <Link href="/campaigns" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Campaigns</Link>
        <span style={{ margin: '0 8px' }}>/</span>
        <span>{campaign.campaignId || campaign._id?.toString().slice(-8)}</span>
      </div>

      {/* Campaign Header */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                {campaign.brief?.substring(0, 100) || 'Campaign'}
              </h2>
              <span className={`status-badge ${statusColor(campaign.status)}`}>{campaign.status}</span>
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-muted)' }}>
              <span>ID: {campaign.campaignId || '—'}</span>
              <span>Created: {campaign.createdAt ? new Date(campaign.createdAt).toLocaleDateString() : '—'}</span>
              <span>Iteration: {campaign.iteration || 0}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {campaign.status === 'pending_approval' && (
              <button className="btn btn-primary" onClick={handleApprove} disabled={approving}>
                {approving ? '⏳ Launching...' : '🚀 Launch Campaign'}
              </button>
            )}
            {['sent', 'completed'].includes(campaign.status) && (
              <button className="btn btn-primary" onClick={handleAnalyze} disabled={analyzing}>
                {analyzing ? '⏳ Analyzing...' : '📊 Analyze Performance'}
              </button>
            )}
            {['sent', 'analyzed', 'optimizing', 'completed'].includes(campaign.status) && campaign.reportData && (
              <button className="btn btn-outline" onClick={handleFetchLatestReport} disabled={refreshingReport}>
                {refreshingReport ? '⏳ Fetching report...' : '🔄 Fetch Latest Report'}
              </button>
            )}
            {['sent', 'analyzed', 'optimizing', 'completed'].includes(campaign.status) && !campaign.reportData && (
               <div style={{ display: 'flex', alignItems: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
                 {refreshingReport ? '⏳ Auto-fetching report...' : 'Waiting for report...'}
               </div>
            )}
            <Link href="/campaigns/new" className="btn btn-outline">Duplicate</Link>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tabs tabs-underline" style={{ marginBottom: 24 }}>
        {TABS.map((t) => (
          <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {/* ─── TAB: Overview ─── */}
      {tab === 'Overview' && (
        <>
          {/* Performance Summary */}
          <div className="g4" style={{ marginBottom: 24 }}>
            <div className="stat-card">
              <div className="stat-icon">👥</div>
              <div className="stat-value">{totalRecipients.toLocaleString()}</div>
              <div className="stat-label">Total Recipients</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">📬</div>
              <div className="stat-value">{campaign.metrics?.openRate ?? '—'}{campaign.metrics?.openRate != null ? '%' : ''}</div>
              <div className="stat-label">Open Rate</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🖱️</div>
              <div className="stat-value">{campaign.metrics?.clickRate ?? '—'}{campaign.metrics?.clickRate != null ? '%' : ''}</div>
              <div className="stat-label">Click Rate</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">⚖️</div>
              <div className="stat-value">{campaign.metrics?.matrixScore != null ? campaign.metrics.matrixScore.toFixed(2) : '—'}</div>
              <div className="stat-label">Matrix Score</div>
            </div>
          </div>

          {/* Brief */}
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Campaign Brief</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{campaign.brief}</p>
          </div>

          {/* Strategy / Segments */}
          {campaign.strategy?.segments?.length > 0 && (
            <div className="card" style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
                Segments ({campaign.strategy.segments.length})
              </h3>
              {campaign.strategy.segments.map((seg, i) => (
                <div key={i} className="seg-card">
                  <div className="seg-head">
                    <span className="seg-name">{seg.name}</span>
                    <span className="seg-count">{seg.count || seg.customerIds?.length} customers</span>
                  </div>
                  <div className="seg-desc">{seg.description}</div>
                  <div className="seg-meta">
                    <span>🎯 {seg.recommendedTone}</span>
                    <span>🕐 {seg.recommendedSendTime}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick Actions */}
          <div className="card">
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Quick Actions</h3>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {campaign.status === 'pending_approval' && (
                <button className="btn btn-primary btn-sm" onClick={handleApprove} disabled={approving}>
                  {approving ? '⏳ Launching...' : '🚀 Launch Campaign'}
                </button>
              )}
              {['sent', 'completed'].includes(campaign.status) && (
                <button className="btn btn-primary btn-sm" onClick={handleAnalyze} disabled={analyzing}>📊 Analyze</button>
              )}
              {['sent', 'analyzed', 'optimizing', 'completed'].includes(campaign.status) && campaign.reportData && (
                <button className="btn btn-outline btn-sm" onClick={handleFetchLatestReport} disabled={refreshingReport}>
                  {refreshingReport ? '⏳ Fetching...' : '🔄 Fetch Latest Report'}
                </button>
              )}
              {(campaign.optimizationHistory?.length > 0) && (
                <button className="btn btn-primary btn-sm" onClick={handleOptimize} disabled={optimizing}>
                  {optimizing ? '⏳ Applying...' : '🚀 Apply AI Optimization'}
                </button>
              )}
              <button className="btn btn-outline btn-sm" onClick={() => setTab('Variants')}>👁️ View Variants</button>
              <button className="btn btn-outline btn-sm" onClick={() => setTab('History')}>📜 View History</button>
              <Link href="/campaigns/new" className="btn btn-ghost btn-sm">✨ Duplicate</Link>
            </div>
          </div>
        </>
      )}

      {/* ─── TAB: Analytics ─── */}
      {tab === 'Analytics' && (
        <>
          {campaign.metrics ? (
            <>
              {/* Performance Metrics */}
              <div className="g3" style={{ marginBottom: 24 }}>
                <div className="card glass">
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Open Rate</div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--accent-green)' }}>{campaign.metrics.openRate}%</div>
                  <div className="progress-bar" style={{ marginTop: 10 }}>
                    <div className="progress-fill" style={{ width: `${campaign.metrics.openRate}%`, background: 'var(--accent-green)' }} />
                  </div>
                </div>
                <div className="card glass">
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Click Rate</div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--accent-blue)' }}>{campaign.metrics.clickRate}%</div>
                  <div className="progress-bar" style={{ marginTop: 10 }}>
                    <div className="progress-fill" style={{ width: `${campaign.metrics.clickRate}%`, background: 'var(--accent-blue)' }} />
                  </div>
                </div>
                <div className="card glass">
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Matrix Score (70/30)</div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: campaign.metrics.matrixQualified ? 'var(--accent-green)' : 'var(--accent-yellow)' }}>
                    {campaign.metrics.matrixScore != null ? campaign.metrics.matrixScore.toFixed(2) : '—'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    Threshold: {campaign.metrics.matrixThreshold ?? 8} · {campaign.metrics.matrixQualified ? 'Qualified' : 'Needs optimization'}
                  </div>
                  <div className="progress-bar" style={{ marginTop: 10 }}>
                    <div className="progress-fill" style={{ width: `${Math.min((campaign.metrics.matrixScore || 0) * 10, 100)}%`, background: campaign.metrics.matrixQualified ? 'var(--accent-green)' : 'var(--accent-yellow)' }} />
                  </div>
                </div>
              </div>

              {/* Report Data */}
              {campaign.reportData && (
                <div className="card" style={{ marginBottom: 20 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>📊 Performance Report</h3>
                  <pre style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: 1.6, background: 'var(--bg-primary)', padding: 16, borderRadius: 8 }}>
                    {typeof campaign.reportData === 'string' ? campaign.reportData : JSON.stringify(campaign.reportData, null, 2)}
                  </pre>
                </div>
              )}

              {/* AI Insights */}
              {campaign.optimizationHistory?.length > 0 && (
                <div className="card">
                  <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>💡 AI Insights</h3>
                  {campaign.optimizationHistory.map((opt, i) => (
                    <div key={i} style={{ padding: '12px 0', borderBottom: i < campaign.optimizationHistory.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', marginBottom: 6 }}>
                        Optimization #{i + 1}
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        {opt.reasoning || opt.reason || JSON.stringify(opt)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📊</div>
              <h3 className="empty-title">No analytics data yet</h3>
              <p className="empty-desc">Analyze campaign performance to see detailed analytics here.</p>
              {['sent', 'completed'].includes(campaign.status) && (
                <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={handleAnalyze} disabled={analyzing}>
                  {analyzing ? '⏳ Analyzing...' : '📊 Analyze Performance'}
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* ─── TAB: Variants ─── */}
      {tab === 'Variants' && (
        <>
          {campaign.contentVariants?.length > 0 ? (
            <div className="g2">
              {campaign.contentVariants.map((v, i) => (
                <div key={i} className="email-card">
                  <div className="email-variant-label">
                    <span className="email-variant-tag">{v.targetSegment} — {v.variantName}</span>
                    <span className="email-rcpt">{v.customerIds?.length || 0} recipients</span>
                  </div>
                  <div className="email-preview-box">
                    <div className="email-subj">{v.subject}</div>
                    <div className="email-body-text">{v.body}</div>
                  </div>
                  {v.sendTime && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>📅 Send Time: {v.sendTime}</div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">✉️</div>
              <h3 className="empty-title">No content variants</h3>
              <p className="empty-desc">No email variants have been generated for this campaign.</p>
            </div>
          )}
        </>
      )}

      {/* ─── TAB: History ─── */}
      {tab === 'History' && (
        <>
          {/* Campaign Timeline */}
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Campaign Timeline</h3>
            <div className="timeline">
              <div className="timeline-item">
                <div className="timeline-dot done" />
                <div className="timeline-content">
                  <div className="timeline-title">Created</div>
                  <div className="timeline-time">{campaign.createdAt ? new Date(campaign.createdAt).toLocaleString() : '—'}</div>
                </div>
              </div>
              {campaign.status !== 'draft' && campaign.status !== 'pending_approval' && (
                <div className="timeline-item">
                  <div className="timeline-dot done" />
                  <div className="timeline-content">
                    <div className="timeline-title">Approved & Sent</div>
                    <div className="timeline-time">{campaign.updatedAt ? new Date(campaign.updatedAt).toLocaleString() : '—'}</div>
                  </div>
                </div>
              )}
              {campaign.status === 'analyzed' && (
                <div className="timeline-item">
                  <div className="timeline-dot done" />
                  <div className="timeline-content">
                    <div className="timeline-title">Analyzed</div>
                    <div className="timeline-time">Performance report generated</div>
                  </div>
                </div>
              )}
              {campaign.optimizationHistory?.length > 0 && campaign.optimizationHistory.map((_, i) => (
                <div key={i} className="timeline-item">
                  <div className="timeline-dot done" />
                  <div className="timeline-content">
                    <div className="timeline-title">Optimization #{i + 1}</div>
                    <div className="timeline-time">Iteration {i + 1} executed</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Agent Activity Log */}
          {logs.length > 0 ? (
            <div className="card">
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Agent Activity Log</h3>
              <div className="agent-log">
                {logs.map((l, i) => (
                  <div key={i} className={`log-item ${l.agent}`}>
                    <span className="log-agent">{l.agent}</span>
                    <span className="log-msg">
                      {l.step && <strong>[{l.step}] </strong>}
                      {l.reasoning || l.output?.substring?.(0, 200) || '—'}
                    </span>
                    {l.duration && <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto', flexShrink: 0 }}>{l.duration}ms</span>}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📜</div>
              <h3 className="empty-title">No agent logs</h3>
              <p className="empty-desc">Agent activity will appear here as AI agents process this campaign.</p>
            </div>
          )}
        </>
      )}
    </>
  );
}
