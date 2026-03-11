'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';

const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'draft', label: 'Draft' },
  { key: 'sent', label: 'Sent' },
  { key: 'completed', label: 'Completed' },
  { key: 'optimizing', label: 'Optimizing' },
];

const statusColor = (s) => {
  const m = { draft: 'draft', active: 'active', sent: 'success', completed: 'success', analyzed: 'info', optimizing: 'ai', error: 'danger' };
  return m[s] || 'default';
};

export default function CampaignManagement() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('date');

  useEffect(() => {
    fetch('/api/agent')
      .then((r) => r.json())
      .then((d) => setCampaigns(d.campaigns || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = [...campaigns];
    if (activeTab !== 'all') list = list.filter((c) => c.status === activeTab);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) => (c.brief || '').toLowerCase().includes(q) || (c.campaignId || '').toLowerCase().includes(q));
    }
    if (sortBy === 'date') list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    if (sortBy === 'status') list.sort((a, b) => (a.status || '').localeCompare(b.status || ''));
    return list;
  }, [campaigns, activeTab, search, sortBy]);

  const tabCounts = useMemo(() => {
    const c = { all: campaigns.length };
    campaigns.forEach((cam) => { c[cam.status] = (c[cam.status] || 0) + 1; });
    return c;
  }, [campaigns]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this campaign? This action cannot be undone.')) return;
    try {
      await fetch('/api/agent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', campaignId: id }) });
      setCampaigns((prev) => prev.filter((c) => c._id !== id));
    } catch { /* ignore */ }
  };

  if (loading) {
    return (
      <div className="g3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="card" style={{ minHeight: 200 }}>
            <div className="skeleton skeleton-text" style={{ width: '60%' }} />
            <div className="skeleton skeleton-text" style={{ width: '100%', marginTop: 12 }} />
            <div className="skeleton skeleton-text" style={{ width: '80%', marginTop: 8 }} />
            <div className="skeleton skeleton-text" style={{ width: '40%', marginTop: 16 }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Toolbar */}
      <div className="toolbar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="Search campaigns..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select className="select" value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ width: 'auto' }}>
            <option value="date">Sort by Date</option>
            <option value="status">Sort by Status</option>
          </select>
          <div style={{ display: 'flex', gap: 2 }}>
            <button className={`btn btn-icon ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')} title="Grid view">▦</button>
            <button className={`btn btn-icon ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')} title="List view">☰</button>
          </div>
          <Link href="/campaigns/new" className="btn btn-primary">+ Create Campaign</Link>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="tabs tabs-pill">
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            className={`tab ${activeTab === t.key ? 'active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
            {(tabCounts[t.key] || 0) > 0 && (
              <span className="badge badge-sm" style={{ marginLeft: 6 }}>{tabCounts[t.key]}</span>
            )}
          </button>
        ))}
      </div>

      {/* Campaign Cards */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <h3 className="empty-title">
            {search ? 'No matching campaigns' : activeTab !== 'all' ? `No ${activeTab} campaigns` : 'No campaigns yet'}
          </h3>
          <p className="empty-desc">
            {search ? 'Try a different search term' : 'Create your first AI-powered campaign to get started.'}
          </p>
          {!search && <Link href="/campaigns/new" className="btn btn-primary" style={{ marginTop: 12 }}>+ Create Campaign</Link>}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="g3">
          {filtered.map((c) => (
            <div key={c._id} className="campaign-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.5px' }}>
                  {c.campaignId}
                </span>
                <span className={`status-badge ${statusColor(c.status)}`}>{c.status}</span>
              </div>
              <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {c.brief?.substring(0, 120) || 'Untitled Campaign'}
              </h4>
              <div style={{ display: 'flex', gap: 16, marginBottom: 12, fontSize: 12, color: 'var(--text-secondary)' }}>
                <span>👥 {c.contentVariants?.reduce((s, v) => s + (v.customerIds?.length || 0), 0) || 0}</span>
                {c.metrics?.openRate != null && <span>📬 {c.metrics.openRate}%</span>}
                {c.metrics?.clickRate != null && <span>🖱️ {c.metrics.clickRate}%</span>}
              </div>
              {c.status === 'active' && (
                <div className="progress-bar" style={{ marginBottom: 12 }}>
                  <div className="progress-fill" style={{ width: '45%' }} />
                </div>
              )}
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>
                {c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <Link href={`/campaigns/${c._id}`} className="btn btn-sm btn-outline">View</Link>
                {['sent', 'completed'].includes(c.status) && (
                  <Link href={`/campaigns/${c._id}?tab=analytics`} className="btn btn-sm btn-ghost">📊 Analyze</Link>
                )}
                <button className="btn btn-sm btn-ghost" style={{ color: 'var(--accent-red)', marginLeft: 'auto' }} onClick={() => handleDelete(c._id)}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Status</th>
                <th>Recipients</th>
                <th>Open Rate</th>
                <th>Click Rate</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c._id}>
                  <td>
                    <div style={{ maxWidth: 280 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {c.brief?.substring(0, 80) || 'Untitled'}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{c.campaignId}</div>
                    </div>
                  </td>
                  <td><span className={`status-badge ${statusColor(c.status)}`}>{c.status}</span></td>
                  <td>{c.contentVariants?.reduce((s, v) => s + (v.customerIds?.length || 0), 0) || 0}</td>
                  <td>{c.metrics?.openRate != null ? `${c.metrics.openRate}%` : '—'}</td>
                  <td>{c.metrics?.clickRate != null ? `${c.metrics.clickRate}%` : '—'}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <Link href={`/campaigns/${c._id}`} className="btn btn-sm btn-outline">View</Link>
                      <button className="btn btn-sm btn-ghost" style={{ color: 'var(--accent-red)' }} onClick={() => handleDelete(c._id)}>🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
