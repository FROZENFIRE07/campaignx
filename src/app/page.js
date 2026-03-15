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
      .catch(() => {})
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
      <div className="hero">
        <div className="hero-title">{`Welcome back, SuperBFSI \u{1F44B}`}</div>
        <div className="hero-subtitle">
          AI-powered campaign management at your fingertips. Create, analyze, and optimize marketing campaigns with multi-agent intelligence.
        </div>
        <div className="hero-actions">
          <Link href="/campaigns/new" className="btn btn-primary btn-lg">{`\u{2728}`} Create New Campaign</Link>
          <Link href="/campaigns" className="btn btn-outline">View All Campaigns</Link>
        </div>
      </div>

      <div className="stats-grid">
        <StatsCard icon={"\u{1F4E8}"} value={campaigns.length} label="Total Campaigns" bgColor="rgba(99,102,241,0.1)" />
        <StatsCard icon={"\u{1F7E2}"} value={activeCampaigns.length} label="Active Campaigns" bgColor="rgba(16,185,129,0.1)" />
        <StatsCard icon={"\u{1F4EC}"} value={avgOpenRate !== '--' ? `${avgOpenRate}%` : '--'} label="Avg Open Rate" bgColor="rgba(139,92,246,0.1)" />
        <StatsCard icon={"\u{1F5B1}"} value={avgClickRate !== '--' ? `${avgClickRate}%` : '--'} label="Avg Click Rate" bgColor="rgba(59,130,246,0.1)" />
      </div>

      <div className="card">
        <div className="section-header">
          <h2>Recent Campaigns</h2>
          <Link href="/campaigns" className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }}>{"View All \u{2192}"}</Link>
        </div>

        {loading ? (
          <div className="loading-state"><div className="spinner spinner-lg" /><p>Loading campaigns...</p></div>
        ) : campaigns.length === 0 ? (
          <EmptyState
            icon={"\u{1F680}"} title="No campaigns created yet"
            description="Start your first AI-powered campaign in minutes"
            action={<Link href="/campaigns/new" className="btn btn-primary">Create First Campaign</Link>}
          />
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr><th>Campaign</th><th>Status</th><th>Created</th><th>Open Rate</th><th>Click Rate</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {campaigns.slice(0, 10).map((c) => (
                  <tr key={c._id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                        {c.brief?.substring(0, 60) || 'Untitled'}{c.brief?.length > 60 ? '...' : ''}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Iteration {c.iteration || 1}</div>
                    </td>
                    <td><span className={`badge ${statusClass(c.status)}`}>{statusLabel(c.status)}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td><span style={{ fontWeight: 700, color: c.metrics?.openRate ? 'var(--accent)' : 'var(--text-muted)' }}>{c.metrics?.openRate ? `${c.metrics.openRate}%` : '--'}</span></td>
                    <td><span style={{ fontWeight: 700, color: c.metrics?.clickRate ? 'var(--accent-green)' : 'var(--text-muted)' }}>{c.metrics?.clickRate ? `${c.metrics.clickRate}%` : '--'}</span></td>
                    <td><Link href={`/campaigns/${c._id}`} className="btn btn-ghost btn-sm">View</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="g2">
        <div className="card">
          <div className="section-header"><h2>Performance Overview</h2></div>
          {analyzedCampaigns.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {analyzedCampaigns.slice(0, 3).map((c) => (
                <div key={c._id}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>{c.brief?.substring(0, 40)}...</div>
                  <div className="perf-bar-wrap">
                    <div className="perf-bar-head"><span className="perf-bar-label">Open Rate</span><span className="perf-bar-val">{c.metrics?.openRate || 0}%</span></div>
                    <div className="perf-track"><div className="perf-fill purple" style={{ width: `${Math.min(c.metrics?.openRate || 0, 100)}%` }} /></div>
                  </div>
                  <div className="perf-bar-wrap">
                    <div className="perf-bar-head"><span className="perf-bar-label">Click Rate</span><span className="perf-bar-val">{c.metrics?.clickRate || 0}%</span></div>
                    <div className="perf-track"><div className="perf-fill green" style={{ width: `${Math.min(c.metrics?.clickRate || 0, 100)}%` }} /></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>
              Performance data will appear after campaigns are analyzed
            </div>
          )}
        </div>

        <div className="card">
          <div className="section-header">
            <h2>AI Agent Activity</h2>
            <Link href="/ai-studio" className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }}>{"View Studio \u{2192}"}</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { agent: 'Orchestrator', status: 'idle', icon: '\u{1F9E0}', desc: 'Coordinating multi-agent workflows' },
              { agent: 'Strategy Agent', status: 'idle', icon: '\u{1F3AF}', desc: 'Customer segmentation & targeting' },
              { agent: 'Content Agent', status: 'idle', icon: '\u{270D}', desc: 'Generating email variants' },
              { agent: 'Analysis Agent', status: 'idle', icon: '\u{1F4CA}', desc: 'Performance analytics & optimization' },
            ].map((a) => (
              <div key={a.agent} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div className={`agent-avatar ${a.agent.split(' ')[0].toLowerCase()}`}>
                  {a.icon}
                  <div className={`agent-status ${a.status}`} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{a.agent}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.desc}</div>
                </div>
                <span className={`badge ${a.status === 'active' ? 'badge-success' : 'badge-draft'}`}>{a.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}