'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import StatsCard from './components/StatsCard';
import EmptyState from './components/EmptyState';

export default function Dashboard() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/agent')
      .then((r) => r.json())
      .then((d) => setCampaigns(d.campaigns || []))
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  const activeCampaigns = campaigns.filter((c) => c.status === 'sent' || c.status === 'approved');
  const analyzedCampaigns = campaigns.filter((c) => c.status === 'analyzed');

  const avgOpenRate = campaigns.length > 0
    ? (campaigns.reduce((sum, c) => sum + (c.metrics?.openRate || 0), 0) / campaigns.length).toFixed(1)
    : '--';

  const avgClickRate = campaigns.length > 0
    ? (campaigns.reduce((sum, c) => sum + (c.metrics?.clickRate || 0), 0) / campaigns.length).toFixed(1)
    : '--';

  const statusLabel = (status) => {
    const map = {
      draft: 'Draft', pending_approval: 'Pending', approved: 'Approved',
      sent: 'Sent', analyzed: 'Analyzed', optimizing: 'Optimizing',
    };
    return map[status] || status;
  };
  const statusClass = (status) => {
    const map = {
      draft: 'badge-draft', pending_approval: 'badge-pending', approved: 'badge-success',
      sent: 'badge-sent', analyzed: 'badge-analyzed', optimizing: 'badge-optimizing',
    };
    return map[status] || 'badge-draft';
  };

  return (
    <>
      {/* Stats Grid */}
      <div className="stats-grid" style={{ marginBottom: 32 }}>
        <StatsCard
          materialIcon="mail"
          value={avgOpenRate !== '--' ? `${avgOpenRate}%` : '--'}
          label="Open Rate"
          trend={avgOpenRate !== '--' ? '+2.1% from last week' : null}
          trendDir="up"
          bgColor="rgba(163, 230, 53, 0.1)"
        />
        <StatsCard
          materialIcon="ads_click"
          value={avgClickRate !== '--' ? `${avgClickRate}%` : '--'}
          label="CTR"
          trend={avgClickRate !== '--' ? 'vs last week' : null}
          trendDir={Number(avgClickRate) > 5 ? 'up' : 'down'}
          bgColor="rgba(163, 230, 53, 0.1)"
        />
        <StatsCard
          materialIcon="smart_toy"
          value={activeCampaigns.length || '0'}
          label="Active Agents"
          trend={`${campaigns.length} total campaigns`}
          trendDir="up"
          bgColor="rgba(163, 230, 53, 0.1)"
        />
        <StatsCard
          materialIcon="score"
          value={campaigns.length > 0 && campaigns.some(c => c.metrics?.matrixScore !== undefined)
            ? (campaigns.reduce((s, c) => s + (c.metrics?.matrixScore || 0), 0) / campaigns.filter(c => c.metrics?.matrixScore !== undefined).length || 1).toFixed(1)
            : '--'}
          label="Matrix Score"
          trend={campaigns.length > 0 ? 'avg across campaigns' : null}
          trendDir="up"
          bgColor="rgba(163, 230, 53, 0.1)"
        />
      </div>

      {/* Main Content: Activity Feed + Side Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 32 }}>
        {/* Activity Feed (2/3 width) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Live Agent Activity */}
          <div className="glass glow-border" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.15)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--accent-primary)' }}>sensors</span>
                <h3 style={{ fontWeight: 700, fontSize: 18 }}>Live Agent Activity</h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-green)', display: 'inline-block', animation: 'livePulse 2s infinite' }} />
                <span style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--text-muted)' }}>Real-time Stream</span>
              </div>
            </div>
            <div style={{ padding: 24 }}>
              <div className="activity-feed">
                {/* Activity Item 1 */}
                <div className="activity-item">
                  <div className="activity-line-wrap">
                    <div className="activity-dot activity-dot-primary">
                      <span className="material-symbols-outlined">robot_2</span>
                    </div>
                    <div className="activity-connector" />
                  </div>
                  <div className="activity-content">
                    <div className="activity-header">
                      <h4 className="activity-agent">Agent Alpha</h4>
                      <span className="activity-time">2 mins ago</span>
                    </div>
                    <p className="activity-message">
                      Successfully initiated outreach to <span className="highlight">124 leads</span> in the &quot;SaaS Q4&quot; campaign. Personalized messaging based on LinkedIn profiles.
                    </p>
                  </div>
                </div>

                {/* Activity Item 2 */}
                <div className="activity-item">
                  <div className="activity-line-wrap">
                    <div className="activity-dot activity-dot-success">
                      <span className="material-symbols-outlined">check_circle</span>
                    </div>
                    <div className="activity-connector" />
                  </div>
                  <div className="activity-content">
                    <div className="activity-header">
                      <h4 className="activity-agent">Agent Beta</h4>
                      <span className="activity-time">5 mins ago</span>
                    </div>
                    <p className="activity-message">
                      Resolved support query for lead <em>&quot;David Chen&quot;</em> regarding API integration. High sentiment score (0.92) detected.
                    </p>
                  </div>
                </div>

                {/* Activity Item 3 */}
                <div className="activity-item">
                  <div className="activity-line-wrap">
                    <div className="activity-dot activity-dot-primary">
                      <span className="material-symbols-outlined">calendar_today</span>
                    </div>
                    <div className="activity-connector" />
                  </div>
                  <div className="activity-content">
                    <div className="activity-header">
                      <h4 className="activity-agent">Agent Gamma</h4>
                      <span className="activity-time">12 mins ago</span>
                    </div>
                    <p className="activity-message">
                      Scheduled meeting with <span className="highlight">TechNova Global</span> for Tuesday, Oct 24th at 2:00 PM PST. Syncing to main calendar.
                    </p>
                  </div>
                </div>

                {/* Activity Item 4 */}
                <div className="activity-item">
                  <div className="activity-line-wrap">
                    <div className="activity-dot activity-dot-neutral">
                      <span className="material-symbols-outlined">person_add</span>
                    </div>
                  </div>
                  <div className="activity-content">
                    <div className="activity-header">
                      <h4 className="activity-agent">Agent Delta</h4>
                      <span className="activity-time">15 mins ago</span>
                    </div>
                    <p className="activity-message">
                      New lead &quot;Sarah Jenkins&quot; processed and qualified. Assigned to <strong style={{ color: 'var(--text-secondary)' }}>Enterprise Pipeline</strong>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Campaigns Table */}
          {!loading && campaigns.length > 0 && (
            <div className="glass" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.15)' }}>
                <h3 style={{ fontWeight: 700, fontSize: 16 }}>Recent Campaigns</h3>
                <Link href="/campaigns" className="btn btn-ghost btn-sm">View All →</Link>
              </div>
              <div className="table-container" style={{ border: 'none' }}>
                <table className="table">
                  <thead>
                    <tr><th>Campaign</th><th>Status</th><th>Open Rate</th><th>Click Rate</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {campaigns.slice(0, 5).map((c) => (
                      <tr key={c._id}>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                            {c.brief?.substring(0, 50) || 'Untitled'}{c.brief?.length > 50 ? '...' : ''}
                          </div>
                        </td>
                        <td><span className={`badge ${statusClass(c.status)}`}>{statusLabel(c.status)}</span></td>
                        <td><span style={{ fontWeight: 700, color: c.metrics?.openRate ? 'var(--accent-green)' : 'var(--text-muted)' }}>{c.metrics?.openRate ? `${c.metrics.openRate}%` : '--'}</span></td>
                        <td><span style={{ fontWeight: 700, color: c.metrics?.clickRate ? 'var(--accent-primary)' : 'var(--text-muted)' }}>{c.metrics?.clickRate ? `${c.metrics.clickRate}%` : '--'}</span></td>
                        <td><Link href={`/campaigns/${c._id}`} className="btn btn-ghost btn-sm">View</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!loading && campaigns.length === 0 && (
            <div className="glass" style={{ padding: 0 }}>
              <EmptyState
                icon={"🚀"} title="No campaigns created yet"
                description="Start your first AI-powered campaign in minutes"
                action={<Link href="/campaigns/new" className="btn btn-primary">Create First Campaign</Link>}
              />
            </div>
          )}
        </div>

        {/* Side Panel (1/3 width) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Campaign Distribution */}
          <div className="glass" style={{ padding: 24 }}>
            <h4 style={{ fontWeight: 700, marginBottom: 16 }}>Campaign Distribution</h4>
            <div>
              <div className="dist-item">
                <div className="dist-header">
                  <span>Email Marketing</span>
                  <span>75%</span>
                </div>
                <div className="dist-track">
                  <div className="dist-fill" style={{ width: '75%', background: 'var(--accent-primary)' }} />
                </div>
              </div>
              <div className="dist-item">
                <div className="dist-header">
                  <span>LinkedIn Outreach</span>
                  <span>42%</span>
                </div>
                <div className="dist-track">
                  <div className="dist-fill" style={{ width: '42%', background: 'rgba(163,230,53,0.6)' }} />
                </div>
              </div>
              <div className="dist-item">
                <div className="dist-header">
                  <span>Customer Support AI</span>
                  <span>91%</span>
                </div>
                <div className="dist-track">
                  <div className="dist-fill" style={{ width: '91%', background: 'var(--accent-green)' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Upgrade CTA */}
          <div className="cta-card">
            <h4>Automate More</h4>
            <p>Unleash the full potential of your campaigns with Advanced AI Agents.</p>
            <button className="cta-btn">Upgrade to Enterprise</button>
          </div>

          {/* Active Agents Map */}
          <div className="glass" style={{ padding: 24 }}>
            <h4 style={{ fontWeight: 700, marginBottom: 16 }}>Active Agents Map</h4>
            <div style={{
              aspectRatio: '16/9', width: '100%', background: 'rgba(255,255,255,0.02)', borderRadius: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 4
            }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--accent-primary)', fontSize: 36 }}>public</span>
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, color: 'var(--text-muted)' }}>Global Coverage</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}