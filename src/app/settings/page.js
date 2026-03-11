'use client';

import { useState } from 'react';

const SECTIONS = [
  { key: 'general', label: 'General', icon: '⚙️' },
  { key: 'api', label: 'API Configuration', icon: '🔌' },
  { key: 'team', label: 'Team', icon: '👥' },
  { key: 'preferences', label: 'Preferences', icon: '🎨' },
  { key: 'docs', label: 'Documentation', icon: '📖' },
];

export default function Settings() {
  const [section, setSection] = useState('general');
  const [apiKey, setApiKey] = useState('');
  const [groqKey, setGroqKey] = useState(process.env.NEXT_PUBLIC_GROQ_KEY || '');
  const [mongoUri, setMongoUri] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [showGroqKey, setShowGroqKey] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [notifications, setNotifications] = useState({ campaign: true, performance: true, agent: false });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 600);
  };

  return (
    <div className="settings-layout">
      {/* Settings Sidebar */}
      <nav className="settings-sidebar">
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            className={`settings-nav-item ${section === s.key ? 'active' : ''}`}
            onClick={() => setSection(s.key)}
          >
            <span>{s.icon}</span>
            <span>{s.label}</span>
          </button>
        ))}
      </nav>

      {/* Settings Content */}
      <div className="settings-content">
        {/* ─── General ─── */}
        {section === 'general' && (
          <>
            <div className="card" style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Team Information</h3>
              <div className="form-group">
                <label className="form-label">Team Name</label>
                <input className="input" defaultValue="CampaignX Team" />
              </div>
              <div className="form-group">
                <label className="form-label">Team Email</label>
                <input className="input" type="email" defaultValue="team@campaignx.ai" />
              </div>
              <div className="form-group">
                <label className="form-label">Registration Date</label>
                <input className="input" value="January 2025" disabled style={{ opacity: 0.6 }} />
              </div>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? '⏳ Saving...' : saved ? '✅ Saved!' : 'Save Changes'}
              </button>
            </div>

            <div className="card" style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Account Status</h3>
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>API Rate Limit</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>24 / 100 calls today</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: '24%' }} />
                </div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Resets at 00:00 UTC daily</div>
            </div>

            <div className="card" style={{ borderColor: 'var(--accent-red)', borderWidth: 1, borderStyle: 'solid' }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--accent-red)', marginBottom: 16 }}>⚠️ Danger Zone</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Delete All Campaigns</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Permanently remove all campaign data</div>
                  </div>
                  <button className="btn btn-sm btn-danger">Delete All</button>
                </div>
                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Reset Application</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Clear all data and reset to defaults</div>
                  </div>
                  <button className="btn btn-sm btn-danger">Reset</button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ─── API Configuration ─── */}
        {section === 'api' && (
          <>
            <div className="card" style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>CampaignX API</h3>
              <div className="form-group">
                <label className="form-label">API Key</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="input"
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your CampaignX API key..."
                    style={{ flex: 1 }}
                  />
                  <button className="btn btn-icon" onClick={() => setShowApiKey(!showApiKey)}>{showApiKey ? '🙈' : '👁️'}</button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button className="btn btn-outline btn-sm">Test Connection</button>
                <span style={{ fontSize: 11, color: 'var(--accent-green)' }}>● Connected</span>
              </div>
            </div>

            <div className="card" style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Groq LLM API</h3>
              <div className="form-group">
                <label className="form-label">API Key</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="input"
                    type={showGroqKey ? 'text' : 'password'}
                    value={groqKey}
                    onChange={(e) => setGroqKey(e.target.value)}
                    placeholder="Enter your Groq API key..."
                    style={{ flex: 1 }}
                  />
                  <button className="btn btn-icon" onClick={() => setShowGroqKey(!showGroqKey)}>{showGroqKey ? '🙈' : '👁️'}</button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Model</label>
                <select className="select">
                  <option>llama-3.3-70b-versatile</option>
                  <option>llama-3.1-8b-instant</option>
                  <option>mixtral-8x7b-32768</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Temperature: 0.7</label>
                <input type="range" min="0" max="2" step="0.1" defaultValue="0.7" style={{ width: '100%' }} />
              </div>
              <button className="btn btn-outline btn-sm">Test LLM Connection</button>
            </div>

            <div className="card">
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>MongoDB Connection</h3>
              <div className="form-group">
                <label className="form-label">Connection String</label>
                <input
                  className="input"
                  type="password"
                  value={mongoUri}
                  onChange={(e) => setMongoUri(e.target.value)}
                  placeholder="mongodb+srv://..."
                />
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button className="btn btn-outline btn-sm">Test Connection</button>
                <span style={{ fontSize: 11, color: 'var(--accent-green)' }}>● Connected</span>
              </div>
            </div>
          </>
        )}

        {/* ─── Team ─── */}
        {section === 'team' && (
          <>
            <div className="card" style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Team Members</h3>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: 600 }}>You</td>
                      <td>admin@campaignx.ai</td>
                      <td><span className="badge badge-ai">Admin</span></td>
                      <td>—</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card">
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Invite Member</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="input" placeholder="Email address" style={{ flex: 1 }} />
                <select className="select" style={{ width: 150 }}>
                  <option>Admin</option>
                  <option>Editor</option>
                  <option>Viewer</option>
                </select>
                <button className="btn btn-primary">Send Invite</button>
              </div>
            </div>
          </>
        )}

        {/* ─── Preferences ─── */}
        {section === 'preferences' && (
          <>
            <div className="card" style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Appearance</h3>
              <div className="form-group">
                <label className="form-label">Theme</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['dark', 'light', 'auto'].map((t) => (
                    <button
                      key={t}
                      className={`btn ${theme === t ? 'btn-primary' : 'btn-outline'} btn-sm`}
                      onClick={() => setTheme(t)}
                    >
                      {t === 'dark' ? '🌙' : t === 'light' ? '☀️' : '🔄'} {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Accent Color</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#ef4444'].map((c) => (
                    <div key={c} style={{ width: 32, height: 32, borderRadius: 8, background: c, cursor: 'pointer', border: '2px solid transparent' }} />
                  ))}
                </div>
              </div>
            </div>

            <div className="card" style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Notifications</h3>
              {[
                { key: 'campaign', label: 'Campaign completion alerts' },
                { key: 'performance', label: 'Performance threshold alerts' },
                { key: 'agent', label: 'Agent activity notifications' },
              ].map((n) => (
                <div key={n.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{n.label}</span>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={notifications[n.key]}
                      onChange={(e) => setNotifications((prev) => ({ ...prev, [n.key]: e.target.checked }))}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>
              ))}
            </div>

            <div className="card">
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Data & Privacy</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Data Retention Period</span>
                  <select className="select" style={{ width: 'auto' }}>
                    <option>30 days</option>
                    <option>90 days</option>
                    <option>1 year</option>
                    <option>Forever</option>
                  </select>
                </div>
                <button className="btn btn-outline btn-sm" style={{ alignSelf: 'flex-start' }}>📦 Export All Data</button>
              </div>
            </div>
          </>
        )}

        {/* ─── Documentation ─── */}
        {section === 'docs' && (
          <>
            <div className="card" style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Quick Start Guide</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { step: 1, title: 'Write Your Campaign Brief', desc: 'Describe your campaign goals, target audience, and key messaging.' },
                  { step: 2, title: 'AI Analysis & Strategy', desc: 'AI agents analyze your cohort, create segments, and generate strategy.' },
                  { step: 3, title: 'Review & Approve', desc: 'Review the AI-generated content, segments, and email variants.' },
                  { step: 4, title: 'Launch & Monitor', desc: 'Approve to send, then monitor performance and optimize.' },
                ].map((s) => (
                  <div key={s.step} style={{ display: 'flex', gap: 12, padding: 12, background: 'var(--bg-primary)', borderRadius: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                      {s.step}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{s.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>API Documentation</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <a href="/openapi.json" target="_blank" className="btn btn-outline btn-sm" style={{ alignSelf: 'flex-start', textDecoration: 'none' }}>
                  📄 View OpenAPI Spec
                </a>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  The CampaignX API is RESTful and uses JSON. AI agents autonomously discover and use these APIs at runtime.
                </p>
              </div>
            </div>

            <div className="card">
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>What&apos;s New</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { version: 'v1.0', date: 'Jan 2025', desc: 'Initial release with agentic AI campaign workflow, multi-agent orchestration, and human-in-the-loop approval.' },
                  { version: 'v1.1', date: 'Feb 2025', desc: 'Added performance analytics, A/B test tracking, optimization cycles, and comprehensive UI overhaul.' },
                ].map((r) => (
                  <div key={r.version} style={{ padding: 12, background: 'var(--bg-primary)', borderRadius: 8 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                      <span className="badge badge-ai">{r.version}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.date}</span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{r.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
