'use client';

import { useState, useEffect, useMemo } from 'react';

const AGENTS = [
  { name: 'orchestrator', label: 'Orchestrator', icon: '🎭', desc: 'Coordinates all agents' },
  { name: 'strategy', label: 'Strategy Agent', icon: '🧠', desc: 'Segmentation & planning' },
  { name: 'content', label: 'Content Agent', icon: '✍️', desc: 'Email generation' },
  { name: 'analysis', label: 'Analysis Agent', icon: '📊', desc: 'Performance analysis' },
];

const TABS = ['Activity Feed', 'Reasoning Trail', 'API Discovery'];

export default function AIAgentStudio() {
  const [tab, setTab] = useState('Activity Feed');
  const [logs, setLogs] = useState([]);
  const [tools, setTools] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState('all');
  const [agentFilter, setAgentFilter] = useState('all');
  const [searchLog, setSearchLog] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/logs').then((r) => r.json()),
      fetch('/api/discover').then((r) => r.json()),
      fetch('/api/agent').then((r) => r.json()),
    ])
      .then(([logData, toolData, campData]) => {
        setLogs(logData.logs || []);
        setTools(toolData.tools || []);
        setCampaigns(campData.campaigns || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Agent stats
  const agentStats = useMemo(() => {
    const stats = {};
    AGENTS.forEach((a) => { stats[a.name] = { total: 0, last: null }; });
    logs.forEach((l) => {
      if (stats[l.agent]) {
        stats[l.agent].total++;
        if (!stats[l.agent].last || new Date(l.createdAt) > new Date(stats[l.agent].last)) {
          stats[l.agent].last = l.createdAt;
        }
      }
    });
    return stats;
  }, [logs]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    let list = [...logs];
    if (selectedCampaign !== 'all') list = list.filter((l) => l.campaignId === selectedCampaign);
    if (agentFilter !== 'all') list = list.filter((l) => l.agent === agentFilter);
    if (searchLog.trim()) {
      const q = searchLog.toLowerCase();
      list = list.filter((l) => (l.reasoning || '').toLowerCase().includes(q) || (l.step || '').toLowerCase().includes(q));
    }
    return list;
  }, [logs, selectedCampaign, agentFilter, searchLog]);

  // Grouped reasoning trail
  const reasoningTrail = useMemo(() => {
    const camLogs = selectedCampaign !== 'all'
      ? logs.filter((l) => l.campaignId === selectedCampaign)
      : logs;
    // Group by step
    const grouped = {};
    camLogs.forEach((l) => {
      const key = l.step || 'general';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(l);
    });
    return grouped;
  }, [logs, selectedCampaign]);

  const relativeTime = (date) => {
    if (!date) return '—';
    const d = new Date(date);
    const now = new Date();
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString();
  };

  if (loading) {
    return (
      <>
        <div className="g4" style={{ marginBottom: 24 }}>
          {[1, 2, 3, 4].map((i) => <div key={i} className="stat-card"><div className="skeleton skeleton-text" style={{ width: '60%', height: 28 }} /></div>)}
        </div>
        <div className="card"><div className="skeleton skeleton-text" style={{ width: '100%', height: 300 }} /></div>
      </>
    );
  }

  return (
    <>
      {/* Agent Status Cards */}
      <div className="g4" style={{ marginBottom: 24 }}>
        {AGENTS.map((a) => {
          const s = agentStats[a.name];
          return (
            <div key={a.name} className="stat-card" onClick={() => setAgentFilter(agentFilter === a.name ? 'all' : a.name)} style={{ cursor: 'pointer', border: agentFilter === a.name ? '1px solid var(--accent)' : undefined }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div className={`agent-avatar ${a.name}`}>{a.icon}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{a.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{a.desc}</div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--text-muted)' }}>{s?.total || 0} actions</span>
                <span style={{ color: s?.total > 0 ? 'var(--accent-green)' : 'var(--text-muted)', fontWeight: 600 }}>
                  {s?.total > 0 ? '● Active' : '○ Idle'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="tabs tabs-underline" style={{ marginBottom: 24 }}>
        {TABS.map((t) => (
          <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {/* ─── Activity Feed ─── */}
      {tab === 'Activity Feed' && (
        <>
          <div className="toolbar" style={{ marginBottom: 16 }}>
            <div className="search-box" style={{ flex: 1, maxWidth: 300 }}>
              <span className="search-icon">🔍</span>
              <input className="search-input" placeholder="Search activity..." value={searchLog} onChange={(e) => setSearchLog(e.target.value)} />
            </div>
            <select className="select" style={{ width: 'auto' }} value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)}>
              <option value="all">All Agents</option>
              {AGENTS.map((a) => <option key={a.name} value={a.name}>{a.label}</option>)}
            </select>
            <select className="select" style={{ width: 'auto' }} value={selectedCampaign} onChange={(e) => setSelectedCampaign(e.target.value)}>
              <option value="all">All Campaigns</option>
              {campaigns.map((c) => <option key={c._id} value={c._id}>{c.brief?.substring(0, 40) || c._id}</option>)}
            </select>
          </div>

          {/* Stats Summary */}
          <div className="g4" style={{ marginBottom: 20 }}>
            <div className="mtile"><div className="mtile-val">{logs.length}</div><div className="mtile-label">Total Actions</div></div>
            <div className="mtile"><div className="mtile-val">{logs.filter((l) => l.duration).length > 0 ? Math.round(logs.filter((l) => l.duration).reduce((s, l) => s + l.duration, 0) / logs.filter((l) => l.duration).length) : '—'}</div><div className="mtile-label">Avg Duration (ms)</div></div>
            <div className="mtile"><div className="mtile-val">{new Set(logs.map((l) => l.agent)).size}</div><div className="mtile-label">Agents Used</div></div>
            <div className="mtile"><div className="mtile-val">{new Set(logs.map((l) => l.campaignId)).size}</div><div className="mtile-label">Campaigns</div></div>
          </div>

          {filteredLogs.length > 0 ? (
            <div className="card">
              <div className="agent-log" style={{ maxHeight: 600 }}>
                {filteredLogs.map((l, i) => (
                  <div key={i} className={`log-item ${l.agent}`}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <span className="log-agent">{l.agent}</span>
                          {l.step && <span className="badge badge-sm badge-ai">{l.step}</span>}
                        </div>
                        <span className="log-msg">{l.reasoning || l.output?.substring?.(0, 200) || '—'}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{relativeTime(l.createdAt)}</span>
                        {l.duration && <span style={{ fontSize: 10, color: 'var(--accent-blue)' }}>{l.duration}ms</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">🤖</div>
              <h3 className="empty-title">No agent activity</h3>
              <p className="empty-desc">Create a campaign to see AI agent reasoning and activity.</p>
            </div>
          )}
        </>
      )}

      {/* ─── Reasoning Trail ─── */}
      {tab === 'Reasoning Trail' && (
        <>
          <div style={{ marginBottom: 16 }}>
            <select className="select" style={{ maxWidth: 400 }} value={selectedCampaign} onChange={(e) => setSelectedCampaign(e.target.value)}>
              <option value="all">All Campaigns</option>
              {campaigns.map((c) => <option key={c._id} value={c._id}>{c.brief?.substring(0, 60) || c._id}</option>)}
            </select>
          </div>

          {Object.keys(reasoningTrail).length > 0 ? (
            <div className="card">
              <div className="timeline">
                {Object.entries(reasoningTrail).map(([step, items], si) => (
                  <div key={si}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8, marginTop: si > 0 ? 20 : 0 }}>
                      Step: {step}
                    </div>
                    {items.map((l, i) => (
                      <div key={i} className="timeline-item">
                        <div className={`timeline-dot done`} />
                        <div className="timeline-content">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <div className="timeline-title">{l.agent}</div>
                            {l.duration && <span style={{ fontSize: 10, color: 'var(--accent-blue)' }}>{l.duration}ms</span>}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                            {l.reasoning || l.output?.substring?.(0, 300) || '—'}
                          </div>
                          <div className="timeline-time">{relativeTime(l.createdAt)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">🧵</div>
              <h3 className="empty-title">No reasoning data</h3>
              <p className="empty-desc">Select a campaign or create one to view the agent reasoning trail.</p>
            </div>
          )}
        </>
      )}

      {/* ─── API Discovery ─── */}
      {tab === 'API Discovery' && (
        <>
          {tools.length > 0 ? (
            <>
              <div className="g4" style={{ marginBottom: 20 }}>
                <div className="mtile"><div className="mtile-val">{tools.length}</div><div className="mtile-label">Endpoints Discovered</div></div>
                <div className="mtile"><div className="mtile-val">{tools.filter((t) => t.method === 'GET').length}</div><div className="mtile-label">GET Endpoints</div></div>
                <div className="mtile"><div className="mtile-val">{tools.filter((t) => t.method === 'POST').length}</div><div className="mtile-label">POST Endpoints</div></div>
                <div className="mtile"><div className="mtile-val">{new Set(tools.map((t) => t.path.split('/').slice(0, 4).join('/'))).size}</div><div className="mtile-label">API Groups</div></div>
              </div>

              <div className="g2">
                {tools.map((t, i) => (
                  <div key={i} className="api-tool" style={{ padding: 16, borderRadius: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <span className={`api-method ${t.method.toLowerCase()}`}>{t.method}</span>
                      <code style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{t.path}</code>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 10 }}>
                      {t.description}
                    </p>
                    {t.parameters && t.parameters.length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Parameters</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {t.parameters.map((p, pi) => (
                            <span key={pi} className="badge badge-sm">{typeof p === 'string' ? p : p.name || JSON.stringify(p)}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {t.requestBody && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Request Body</div>
                        <pre style={{ fontSize: 10, color: 'var(--text-muted)', background: 'var(--bg-primary)', padding: 8, borderRadius: 6, overflow: 'auto', maxHeight: 100 }}>
                          {typeof t.requestBody === 'string' ? t.requestBody : JSON.stringify(t.requestBody, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">🔌</div>
              <h3 className="empty-title">No APIs discovered</h3>
              <p className="empty-desc">APIs are discovered from the OpenAPI spec when agents start analyzing campaigns.</p>
            </div>
          )}
        </>
      )}
    </>
  );
}
