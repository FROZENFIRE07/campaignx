'use client';

import { useState, useEffect, useRef } from 'react';

const AGENT_FILTERS = [
  { label: 'All Agents', key: 'all', color: 'var(--accent-primary)' },
  { label: 'System', key: 'system', color: 'var(--text-muted)' },
  { label: 'Strategy', key: 'strategy', color: '#c084fc' },
  { label: 'Content', key: 'content', color: '#60a5fa' },
  { label: 'Tool Calls', key: 'tool', color: '#4ade80' },
];

const AGENT_STATUS = [
  { name: 'Orchestrator', status: 'online' },
  { name: 'Strategy Agent', status: 'online' },
  { name: 'Content Agent', status: 'processing' },
  { name: 'Analysis Agent', status: 'online' },
];

const NAV_ITEMS = [
  { icon: 'dashboard', label: 'Dashboard', active: false },
  { icon: 'smart_toy', label: 'Agents', active: false },
  { icon: 'terminal', label: 'Runtime Logs', active: true },
  { icon: 'history', label: 'History', active: false },
];

export default function AIStudio() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [isLive, setIsLive] = useState(true);
  const logContainer = useRef(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/logs').then((r) => r.json()),
      fetch('/api/agent').then((r) => r.json()),
    ])
      .then(([logsData, agentData]) => {
        const apiLogs = (logsData.logs || []).map((l) => ({
          timestamp: new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          tag: l.agentType || 'system',
          text: l.message || l.action || '',
          type: l.type || 'info',
        }));

        const campaignLogs = (agentData.campaigns || []).flatMap((c) =>
          (c.agentActivity || []).map((a) => ({
            timestamp: new Date(a.timestamp || c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            tag: a.agentType || 'system',
            text: a.message || a.action || '',
            type: 'info',
          }))
        );

        const merged = [...apiLogs, ...campaignLogs].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
        setLogs(merged.length > 0 ? merged : defaultLogs());
      })
      .catch(() => setLogs(defaultLogs()))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (logContainer.current) {
      logContainer.current.scrollTop = logContainer.current.scrollHeight;
    }
  }, [logs]);

  const filteredLogs = activeFilter === 'all'
    ? logs
    : logs.filter((l) => l.tag?.toLowerCase().includes(activeFilter));

  const tagClass = (tag) => {
    const t = tag?.toLowerCase() || '';
    if (t.includes('strategy')) return 'terminal-tag-strategy';
    if (t.includes('content')) return 'terminal-tag-content';
    if (t.includes('tool') || t.includes('optim')) return 'terminal-tag-tool';
    return 'terminal-tag-system';
  };

  const textClass = (log) => {
    const t = log.tag?.toLowerCase() || '';
    if (t.includes('tool') || t.includes('optim')) return 'terminal-text-tool';
    if (log.type === 'response') return 'terminal-text-response';
    return 'terminal-text';
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 24, height: 'calc(100vh - 140px)' }}>
      {/* Left Sidebar Nav */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {NAV_ITEMS.map((item) => (
            <button key={item.label}
              className={`sidebar-nav-item ${item.active ? 'active' : ''}`}
              style={{ textAlign: 'left', fontSize: 13, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, border: 'none', background: item.active ? 'var(--accent-primary)' : 'transparent', color: item.active ? '#fff' : 'var(--text-muted)', borderRadius: 10, cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: item.active ? 600 : 400 }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>

        {/* Agent Status */}
        <div className="agent-status-card">
          <div className="agent-status-title">Agent Status</div>
          {AGENT_STATUS.map((agent) => (
            <div className="agent-status-row" key={agent.name}>
              <span className="agent-status-name">{agent.name}</span>
              <span className={`agent-status-dot agent-status-dot-${agent.status}`} />
            </div>
          ))}
        </div>
      </div>

      {/* Main Terminal */}
      <div className="glass-dark terminal-container">
        {/* Terminal Header */}
        <div className="terminal-header">
          <div className="terminal-dots">
            <div className="terminal-dot terminal-dot-red" />
            <div className="terminal-dot terminal-dot-yellow" />
            <div className="terminal-dot terminal-dot-green" />
          </div>
          <span className="terminal-title">Agent Runtime Logs</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => setIsLive(!isLive)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px',
                borderRadius: 999, fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: 2, cursor: 'pointer', border: 'none',
                background: isLive ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)',
                color: isLive ? 'var(--accent-green)' : 'var(--text-muted)',
              }}
            >
              {isLive && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-green)', display: 'inline-block', animation: 'livePulse 1.5s infinite' }} />}
              {isLive ? 'Live' : 'Paused'}
            </button>
            <button className="btn btn-ghost btn-sm" style={{ fontSize: 10, padding: '4px 10px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>download</span> Export
            </button>
            <button className="btn btn-ghost btn-sm" style={{ fontSize: 10, padding: '4px 10px' }} onClick={() => setLogs(defaultLogs())}>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>delete</span> Clear
            </button>
          </div>
        </div>

        {/* Agent Filter Pills */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="agent-pills">
            {AGENT_FILTERS.map((f) => (
              <button
                key={f.key}
                className={`agent-pill ${activeFilter === f.key ? 'active' : ''}`}
                onClick={() => setActiveFilter(f.key)}
              >
                <span className="agent-pill-dot" style={{ background: f.color }} />
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Terminal Body */}
        <div className="terminal-body" ref={logContainer}>
          {loading ? (
            <div className="loading-state">
              <div className="spinner" />
              <p>Connecting to agent runtime...</p>
            </div>
          ) : filteredLogs.length > 0 ? (
            filteredLogs.map((log, i) => (
              <div key={i} className={`terminal-line ${log.type === 'highlight' ? 'highlight' : ''}`}>
                <span className="terminal-timestamp">{log.timestamp}</span>
                <span className={`terminal-tag ${tagClass(log.tag)}`}>[{log.tag}]</span>
                <span className={textClass(log)}>{log.text}</span>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 48, marginBottom: 12, display: 'block', opacity: 0.3 }}>terminal</span>
              No logs matching filter
            </div>
          )}
        </div>

        {/* Terminal Footer */}
        <div className="terminal-footer">
          <span className="terminal-prompt">&gt;</span>
          <input className="terminal-input" placeholder="Enter command or query..." />
          <div className="terminal-metrics">
            <div className="terminal-metric">
              <span className="terminal-metric-label">Memory</span>
              <div className="terminal-metric-bar">
                <div className="terminal-metric-fill" style={{ width: '45%', background: 'var(--accent-primary)' }} />
              </div>
            </div>
            <div className="terminal-metric">
              <span className="terminal-metric-label">CPU</span>
              <div className="terminal-metric-bar">
                <div className="terminal-metric-fill" style={{ width: '72%', background: 'var(--accent-green)' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function defaultLogs() {
  return [
    { timestamp: '14:32:01', tag: 'System', text: 'Initializing CampaignX Multi-Agent Runtime v4.2.1...', type: 'info' },
    { timestamp: '14:32:02', tag: 'System', text: 'Loading strategy, content, and analysis agent modules.', type: 'info' },
    { timestamp: '14:32:03', tag: 'System', text: 'Connected to LLM endpoint: groq/llama-3.3-70b-versatile', type: 'highlight' },
    { timestamp: '14:32:04', tag: 'System', text: 'All agents initialized. Runtime ready.', type: 'info' },
    { timestamp: '14:32:10', tag: 'Strategy', text: 'Received campaign brief. Analyzing target audience and market positioning...', type: 'info' },
    { timestamp: '14:32:15', tag: 'Strategy', text: 'Market analysis complete. Identified 3 key segments: Enterprise SaaS, Mid-Market, SMB.', type: 'info' },
    { timestamp: '14:32:20', tag: 'Tool_Call', text: 'POST /api/discover → 200 OK (discovered 12 API tools)', type: 'info' },
    { timestamp: '14:32:25', tag: 'Content', text: 'Generating email variants for segment "Enterprise SaaS"...', type: 'info' },
    { timestamp: '14:32:30', tag: 'Content', text: 'Generated 3 email variants. Subject lines optimized for open rate.', type: 'info' },
    { timestamp: '14:32:35', tag: 'Tool_Call', text: 'GET /api/agent → 200 OK (fetched 8 active campaigns)', type: 'info' },
    { timestamp: '14:32:40', tag: 'Strategy', text: 'Recommending send window: Tuesday 10:00 AM EST based on historical data.', type: 'info' },
    { timestamp: '14:32:45', tag: 'System', text: 'Campaign orchestration complete. Awaiting human approval.', type: 'highlight' },
  ];
}
