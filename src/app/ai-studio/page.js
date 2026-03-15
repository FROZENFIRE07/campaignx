'use client';

import { useState, useEffect, useRef } from 'react';

const AGENT_FILTERS = [
  { label: 'All Agents', key: 'all', color: 'var(--accent-primary)' },
  { label: 'System', key: 'system', color: 'var(--text-muted)' },
  { label: 'Strategy', key: 'strategy', color: '#c084fc' },
  { label: 'Content', key: 'content', color: '#60a5fa' },
  { label: 'Tool Calls', key: 'tool', color: '#4ade80' },
];


export default function AIStudio() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [isLive, setIsLive] = useState(true);
  const logContainer = useRef(null);

  useEffect(() => {
    fetch('/api/logs')
      .then((r) => r.json())
      .then((data) => {
        const apiLogs = (data.logs || []).map((l) => ({
          timestamp: l.createdAt
            ? new Date(l.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            : '--:--:--',
          agent: l.agent || 'system',
          step: l.step || '',
          reasoning: l.reasoning || '',
          createdAt: l.createdAt || '',
          type: l.type || 'info',
        }));
        setLogs(apiLogs.length > 0 ? apiLogs : defaultLogs());
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
    : logs.filter((l) => l.agent?.toLowerCase().includes(activeFilter));

  const tagClass = (agent) => {
    const t = agent?.toLowerCase() || '';
    if (t.includes('strategy')) return 'terminal-tag-strategy';
    if (t.includes('content')) return 'terminal-tag-content';
    if (t.includes('tool') || t.includes('optim')) return 'terminal-tag-tool';
    return 'terminal-tag-system';
  };

  const textClass = (log) => {
    const t = log.agent?.toLowerCase() || '';
    if (t.includes('tool') || t.includes('optim')) return 'terminal-text-tool';
    if (log.type === 'response') return 'terminal-text-response';
    return 'terminal-text';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 140px)' }}>

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
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(163,230,53,0.1)', display: 'flex', alignItems: 'center', gap: 16 }}>
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
                <span className={`terminal-tag ${tagClass(log.agent)}`}>[{log.agent}]</span>
                {log.step && <span style={{ color: 'var(--accent-primary)', fontWeight: 600, marginRight: 6 }}>[{log.step}]</span>}
                <span className={textClass(log)}>{log.reasoning}</span>
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
    { timestamp: '14:32:01', agent: 'System', step: 'init', reasoning: 'Initializing CampaignX Multi-Agent Runtime v4.2.1...', createdAt: new Date().toISOString(), type: 'info' },
    { timestamp: '14:32:02', agent: 'System', step: 'init', reasoning: 'Loading strategy, content, and analysis agent modules.', createdAt: new Date().toISOString(), type: 'info' },
    { timestamp: '14:32:03', agent: 'System', step: 'connect', reasoning: 'Connected to LLM endpoint: groq/llama-3.3-70b-versatile', createdAt: new Date().toISOString(), type: 'highlight' },
    { timestamp: '14:32:04', agent: 'System', step: 'ready', reasoning: 'All agents initialized. Runtime ready.', createdAt: new Date().toISOString(), type: 'info' },
    { timestamp: '14:32:10', agent: 'Strategy', step: 'analyze', reasoning: 'Received campaign brief. Analyzing target audience and market positioning...', createdAt: new Date().toISOString(), type: 'info' },
    { timestamp: '14:32:15', agent: 'Strategy', step: 'segment', reasoning: 'Market analysis complete. Identified 3 key segments: Enterprise SaaS, Mid-Market, SMB.', createdAt: new Date().toISOString(), type: 'info' },
    { timestamp: '14:32:20', agent: 'Tool_Call', step: 'discover', reasoning: 'POST /api/discover → 200 OK (discovered 12 API tools)', createdAt: new Date().toISOString(), type: 'info' },
    { timestamp: '14:32:25', agent: 'Content', step: 'generate', reasoning: 'Generating email variants for segment "Enterprise SaaS"...', createdAt: new Date().toISOString(), type: 'info' },
    { timestamp: '14:32:30', agent: 'Content', step: 'complete', reasoning: 'Generated 3 email variants. Subject lines optimized for open rate.', createdAt: new Date().toISOString(), type: 'info' },
    { timestamp: '14:32:35', agent: 'Tool_Call', step: 'fetch', reasoning: 'GET /api/agent → 200 OK (fetched 8 active campaigns)', createdAt: new Date().toISOString(), type: 'info' },
    { timestamp: '14:32:40', agent: 'Strategy', step: 'schedule', reasoning: 'Recommending send window: Tuesday 10:00 AM EST based on historical data.', createdAt: new Date().toISOString(), type: 'info' },
    { timestamp: '14:32:45', agent: 'System', step: 'done', reasoning: 'Campaign orchestration complete. Awaiting human approval.', createdAt: new Date().toISOString(), type: 'highlight' },
  ];
}
