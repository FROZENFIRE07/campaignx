'use client';

import { useState, useEffect, useRef } from 'react';

const PHASES = ['brief', 'discovery', 'cohort', 'strategy', 'approval', 'sent', 'report'];

export default function Home() {
  const [phase, setPhase] = useState('brief');
  const [brief, setBrief] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [campaignPlan, setCampaignPlan] = useState(null);
  const [dbCampaignId, setDbCampaignId] = useState(null);
  const [sentResults, setSentResults] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [optimization, setOptimization] = useState(null);
  const [logs, setLogs] = useState([]);
  const [discoveredTools, setDiscoveredTools] = useState([]);
  const [cohortStats, setCohortStats] = useState(null);
  const [activeTab, setActiveTab] = useState('flow');
  const [campaignId, setCampaignId] = useState(null);
  const logEndRef = useRef(null);

  useEffect(() => {
    fetch('/api/discover').then(r => r.json()).then(d => setDiscoveredTools(d.tools || [])).catch(() => { });
  }, []);

  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs]);

  const addLog = (e) => setLogs(prev => [...prev, e]);

  const computeCohortStats = (data) => {
    if (!data || data.length === 0) return null;
    const fields = Object.keys(data[0]);
    const stats = { total: data.length, fields: fields.length, demographics: {} };

    const categFields = ['Gender', 'Marital_Status', 'Occupation', 'Occupation type', 'City', 'KYC status', 'App_Installed', 'Existing Customer', 'Social_Media_Active'];
    const numFields = ['Age', 'Monthly_Income', 'Credit score', 'Family_Size'];

    for (const f of categFields) {
      if (!data[0].hasOwnProperty(f)) continue;
      const counts = {};
      data.forEach(c => { const v = c[f]; counts[v] = (counts[v] || 0) + 1; });
      stats.demographics[f] = counts;
    }

    for (const f of numFields) {
      if (!data[0].hasOwnProperty(f)) continue;
      const vals = data.map(c => Number(c[f])).filter(v => !isNaN(v));
      if (vals.length === 0) continue;
      stats.demographics[`${f}_avg`] = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
      stats.demographics[`${f}_min`] = Math.min(...vals);
      stats.demographics[`${f}_max`] = Math.max(...vals);
    }

    return stats;
  };

  // Start campaign
  const handleStart = async () => {
    if (!brief.trim()) return;
    setLoading(true);
    setLoadingMsg('🧠 AI agents are reading API docs, analyzing your cohort, and creating strategy...');
    addLog({ agent: 'orchestrator', step: 'init', reasoning: 'Starting agentic campaign workflow — reading API documentation dynamically' });

    try {
      const res = await fetch('/api/agent', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', brief }),
      });
      const data = await res.json();
      if (data.success) {
        setCampaignPlan(data.plan);
        setDbCampaignId(data.campaignId);
        const cs = computeCohortStats(data.plan.cohortData);
        setCohortStats(cs);
        if (data.logs) data.logs.forEach(l => addLog(l));
        setPhase('approval');
      } else {
        addLog({ agent: 'error', reasoning: data.error || 'Failed' });
      }
    } catch (err) {
      addLog({ agent: 'error', reasoning: err.message });
    } finally { setLoading(false); }
  };

  // Approve
  const handleApprove = async () => {
    setLoading(true);
    setLoadingMsg('📤 Sending campaigns via dynamically discovered API...');
    addLog({ agent: 'orchestrator', reasoning: 'Human approved → executing via agentic API tool calling' });
    try {
      const res = await fetch('/api/agent', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', campaignId: dbCampaignId, approvedVariants: campaignPlan.contentVariants }),
      });
      const data = await res.json();
      if (data.success) {
        setSentResults(data.results);
        setCampaignId(data.results[0]?.campaign_id);
        setPhase('sent');
        addLog({ agent: 'orchestrator', reasoning: `Campaigns sent! IDs: ${data.results.map(r => r.campaign_id).join(', ')}` });
      } else { addLog({ agent: 'error', reasoning: data.error }); }
    } catch (err) { addLog({ agent: 'error', reasoning: err.message }); }
    finally { setLoading(false); }
  };

  // Analyze
  const handleAnalyze = async (cId) => {
    const id = cId || campaignId;
    if (!id) return;
    setLoading(true);
    setLoadingMsg('📊 Fetching report and running AI analysis + optimization...');
    try {
      const res = await fetch('/api/agent', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'analyze', campaignId: id, dbCampaignId }),
      });
      const data = await res.json();
      if (data.success) {
        setAnalysis(data.analysis);
        setOptimization(data.optimization);
        if (data.logs) data.logs.forEach(l => addLog(l));
        setPhase('report');
      } else { addLog({ agent: 'error', reasoning: data.error }); }
    } catch (err) { addLog({ agent: 'error', reasoning: err.message }); }
    finally { setLoading(false); }
  };

  // Optimize
  const handleOptimize = async () => {
    if (!optimization?.newSegments) return;
    setLoading(true);
    setLoadingMsg('🔄 Re-launching optimized campaign...');
    try {
      const variants = optimization.newSegments.map(s => ({
        subject: s.newSubject || 'SuperBFSI XDeposit - Optimized',
        body: s.newBody || s.description,
        customerIds: s.customerIds || [],
        targetSegment: s.name, sendTime: s.recommendedSendTime || '10:00',
      }));
      const res = await fetch('/api/agent', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'optimize', dbCampaignId, optimizedVariants: variants }),
      });
      const data = await res.json();
      if (data.success) {
        setSentResults(data.results);
        setCampaignId(data.results[0]?.campaign_id);
        setPhase('sent');
        addLog({ agent: 'optimization', reasoning: `Optimized campaign re-launched! IDs: ${data.results.map(r => r.campaign_id).join(', ')}` });
      }
    } catch (err) { addLog({ agent: 'error', reasoning: err.message }); }
    finally { setLoading(false); }
  };

  const pi = PHASES.indexOf(phase);

  // Helper: Top N from demographics
  const topN = (obj, n = 5) => Object.entries(obj || {}).sort((a, b) => b[1] - a[1]).slice(0, n);
  const colors = ['#8b5cf6', '#3b82f6', '#06b6d4', '#ec4899', '#f59e0b', '#10b981', '#ef4444'];

  return (
    <div className="app">
      {/* ── HEADER ── */}
      <header className="header">
        <div className="logo">
          <h1>CampaignX</h1>
          <span className="badge">AI Multi-Agent Platform</span>
        </div>
        <div className="header-right">
          <div className="live-dot"></div>
          <span>SuperBFSI Campaign Manager</span>
        </div>
      </header>

      {/* Phase bar */}
      <div className="phase-bar">
        {PHASES.map((p, i) => (
          <div key={p} className={`seg ${i < pi ? 'done' : ''} ${i === pi ? 'active' : ''}`} />
        ))}
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${activeTab === 'flow' ? 'active' : ''}`} onClick={() => setActiveTab('flow')}>Campaign Flow</button>
        <button className={`tab ${activeTab === 'logs' ? 'active' : ''}`} onClick={() => setActiveTab('logs')}>Agent Reasoning ({logs.length})</button>
        <button className={`tab ${activeTab === 'api' ? 'active' : ''}`} onClick={() => setActiveTab('api')}>Dynamic API Discovery</button>
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* TAB: Campaign Flow                          */}
      {/* ═══════════════════════════════════════════ */}
      {activeTab === 'flow' && (
        <div>

          {/* ── SECTION 1: CAMPAIGN BRIEF ── */}
          {phase === 'brief' && (
            <div className="card">
              <div className="section-header">
                <span className="section-num">1</span>
                <h2>Campaign Brief</h2>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
                Describe your campaign in natural language. The AI agents will analyze the customer cohort, create segmentation strategy,
                and generate optimized email content &mdash; all autonomously.
              </p>
              <div className="brief-box">
                <textarea
                  className="brief-textarea"
                  placeholder={"e.g., Run email campaign for launching XDeposit, a flagship term deposit product from SuperBFSI, that gives 1 percentage point higher returns than its competitors. Announce an additional 0.25% higher returns for female senior citizens. Optimise for open rate and click rate..."}
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                />
              </div>
              <div style={{ marginTop: 18, display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-primary" onClick={handleStart} disabled={loading || !brief.trim()}>
                  {loading ? <><span className="spinner"></span> Processing...</> : '🚀 Launch AI Agents'}
                </button>
              </div>
            </div>
          )}

          {/* Loading overlay */}
          {loading && (
            <div className="card">
              <div className="loading-state">
                <div className="spinner"></div>
                <p>{loadingMsg}</p>
              </div>
            </div>
          )}

          {/* ── SECTION 2: DYNAMIC API DISCOVERY (shown alongside strategy) ── */}
          {phase === 'approval' && campaignPlan && !loading && (
            <>
              {campaignPlan.workflowPlan && (
                <div className="card">
                  <div className="section-header">
                    <span className="section-num">2</span>
                    <h2>Dynamic API Discovery &amp; Workflow Plan</h2>
                    <span className="section-badge sbadge-ai">🤖 LLM-Planned</span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
                    The AI agent <strong>reads the OpenAPI specification at runtime</strong> and dynamically discovers available APIs.
                    It then <strong>plans the workflow steps</strong> — no hardcoded API calls.
                  </p>
                  <div className="g2">
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>
                        Discovered API Endpoints
                      </div>
                      {discoveredTools.filter(t => t.path !== '/api/v1/signup').map((t, i) => (
                        <div key={i} className="api-tool" style={{ marginBottom: 8 }}>
                          <span className={`api-method ${t.method.toLowerCase()}`}>{t.method}</span>
                          <div>
                            <div className="path">{t.path}</div>
                            <div className="desc">{t.description?.substring(0, 120)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>
                        AI-Generated Workflow Plan
                      </div>
                      {(campaignPlan.workflowPlan?.steps || []).map((s, i) => (
                        <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                          <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--gradient-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                            {s.step}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{s.action}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{s.reasoning?.substring(0, 100)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="flow-line"></div>

              {/* ── SECTION 3: CUSTOMER COHORT DASHBOARD ── */}
              {cohortStats && (
                <div className="card">
                  <div className="section-header">
                    <span className="section-num">3</span>
                    <h2>Customer Cohort Analysis</h2>
                    <span className="section-badge sbadge-live">Live Data</span>
                  </div>
                  <div className="g4" style={{ marginBottom: 20 }}>
                    <div className="mtile">
                      <div className="mtile-val">{cohortStats.total?.toLocaleString()}</div>
                      <div className="mtile-label">Total Customers</div>
                    </div>
                    <div className="mtile">
                      <div className="mtile-val">{cohortStats.fields}</div>
                      <div className="mtile-label">Data Fields</div>
                    </div>
                    <div className="mtile">
                      <div className="mtile-val">{campaignPlan.strategy?.segments?.length || 0}</div>
                      <div className="mtile-label">AI Segments</div>
                    </div>
                    <div className="mtile">
                      <div className="mtile-val">{campaignPlan.contentVariants?.length || 0}</div>
                      <div className="mtile-label">Content Variants</div>
                    </div>
                  </div>

                  <div className="g3">
                    {/* Gender Distribution */}
                    {cohortStats.demographics.Gender && (
                      <div className="cohort-stat">
                        <div className="cohort-stat-title">Gender Distribution</div>
                        <div className="cohort-bar">
                          {topN(cohortStats.demographics.Gender, 5).map(([k, v], i) => (
                            <div key={k} className="cohort-bar-item"
                              style={{ height: `${(v / cohortStats.total) * 100 * 2.5}px`, background: colors[i], opacity: 0.8 }}
                              title={`${k}: ${v}`}
                            />
                          ))}
                        </div>
                        <div className="cohort-bar-label">
                          {topN(cohortStats.demographics.Gender, 5).map(([k, v]) => (
                            <span key={k}>{k}: {v}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* City distribution */}
                    {cohortStats.demographics.City && (
                      <div className="cohort-stat">
                        <div className="cohort-stat-title">Top Cities</div>
                        <div className="cohort-bar">
                          {topN(cohortStats.demographics.City, 6).map(([k, v], i) => (
                            <div key={k} className="cohort-bar-item"
                              style={{ height: `${(v / cohortStats.total) * 100 * 3}px`, background: colors[i], opacity: 0.8 }}
                              title={`${k}: ${v}`}
                            />
                          ))}
                        </div>
                        <div className="cohort-bar-label">
                          {topN(cohortStats.demographics.City, 6).map(([k]) => (
                            <span key={k}>{k}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Key Numbers */}
                    <div className="cohort-stat">
                      <div className="cohort-stat-title">Key Averages</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {cohortStats.demographics.Age_avg && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                            <span style={{ color: 'var(--text-muted)' }}>Avg Age</span>
                            <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{cohortStats.demographics.Age_avg} yrs</span>
                          </div>
                        )}
                        {cohortStats.demographics.Monthly_Income_avg && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                            <span style={{ color: 'var(--text-muted)' }}>Avg Income</span>
                            <span style={{ fontWeight: 700, color: 'var(--accent)' }}>₹{cohortStats.demographics.Monthly_Income_avg?.toLocaleString()}</span>
                          </div>
                        )}
                        {cohortStats.demographics.Credit_score_avg && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                            <span style={{ color: 'var(--text-muted)' }}>Avg Credit Score</span>
                            <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{cohortStats.demographics.Credit_score_avg}</span>
                          </div>
                        )}
                        {cohortStats.demographics.KYC_status && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                            <span style={{ color: 'var(--text-muted)' }}>KYC Verified</span>
                            <span style={{ fontWeight: 700, color: 'var(--accent-green)' }}>{cohortStats.demographics.KYC_status?.Y || 0}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flow-line"></div>

              {/* ── SECTION 4: AI STRATEGY ── */}
              <div className="card">
                <div className="section-header">
                  <span className="section-num">4</span>
                  <h2>AI Campaign Strategy</h2>
                  <span className="section-badge sbadge-ai">🧠 AI-Generated</span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
                  {campaignPlan.strategy?.overallStrategy}
                </p>
                {(campaignPlan.strategy?.segments || []).map((seg, i) => (
                  <div key={i} className="seg-card">
                    <div className="seg-head">
                      <span className="seg-name">{seg.name}</span>
                      <span className="seg-count">{seg.count || seg.customerIds?.length} customers</span>
                    </div>
                    <div className="seg-desc">{seg.description}</div>
                    <div className="seg-meta">
                      <span>🎯 {seg.recommendedTone}</span>
                      <span>🕐 {seg.recommendedSendTime}</span>
                      <span>⚡ {seg.priority || 'medium'}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flow-line"></div>

              {/* ── SECTION 5: EMAIL PREVIEW + HITL APPROVAL ── */}
              <div className="card">
                <div className="section-header">
                  <span className="section-num">5</span>
                  <h2>Human-in-the-Loop Approval</h2>
                  <span className="section-badge sbadge-warn">⏳ Awaiting Approval</span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
                  Review the AI-generated email variants below. Each segment gets A/B test variants for performance optimization.
                  <strong> No campaign is sent until you explicitly approve.</strong>
                </p>
                {(campaignPlan.contentVariants || []).slice(0, 4).map((v, i) => (
                  <div key={i} className="email-card">
                    <div className="email-variant-label">
                      <span className="email-variant-tag">{v.targetSegment} — Variant {v.variantName}</span>
                      <span className="email-rcpt">{v.customerIds?.length} recipients</span>
                    </div>
                    <div className="email-preview-box">
                      <div className="email-subj">{v.subject}</div>
                      <div className="email-body-text">{v.body}</div>
                    </div>
                  </div>
                ))}
                {(campaignPlan.contentVariants || []).length > 4 && (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 8 }}>
                    + {campaignPlan.contentVariants.length - 4} more variants
                  </p>
                )}
                <div className="approval-bar">
                  <button className="btn btn-success" onClick={handleApprove}>✅ Approve &amp; Send All Campaigns</button>
                  <button className="btn btn-outline" onClick={() => { setPhase('brief'); setCampaignPlan(null); }}>✏️ Revise Brief</button>
                </div>
              </div>
            </>
          )}

          {/* ── CAMPAIGN SENT ── */}
          {phase === 'sent' && sentResults && !loading && (
            <div className="card">
              <div className="section-header">
                <span className="section-num">5</span>
                <h2>Campaign Sent Successfully</h2>
                <span className="section-badge sbadge-live">✅ Live</span>
              </div>
              <table className="sent-table">
                <thead>
                  <tr>
                    <th>Campaign ID</th>
                    <th>Segment</th>
                    <th>Subject</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sentResults.map((r, i) => (
                    <tr key={i}>
                      <td className="mono">{r.campaign_id}</td>
                      <td>{r.segment || '—'}</td>
                      <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.subject || '—'}</td>
                      <td><span className="status-badge success">{r.message || 'Sent'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: 20, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {sentResults.filter(r => r.campaign_id).map((r, i) => (
                  <button key={i} className="btn btn-primary btn-sm" onClick={() => handleAnalyze(r.campaign_id)}>
                    📊 Analyze Campaign {i + 1}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── SECTION 6: PERFORMANCE DASHBOARD + OPTIMIZATION ── */}
          {phase === 'report' && analysis && !loading && (
            <>
              <div className="card">
                <div className="section-header">
                  <span className="section-num">6</span>
                  <h2>Performance Dashboard</h2>
                  <span className="section-badge sbadge-live">📊 Live Metrics</span>
                </div>

                <div className="g3" style={{ marginBottom: 24 }}>
                  <div className="mtile">
                    <div className="mtile-val">{analysis.overallPerformance?.openRate}%</div>
                    <div className="mtile-label">Open Rate</div>
                  </div>
                  <div className="mtile">
                    <div className="mtile-val">{analysis.overallPerformance?.clickRate}%</div>
                    <div className="mtile-label">Click Rate</div>
                  </div>
                  <div className="mtile">
                    <div className="mtile-val">{analysis.overallPerformance?.totalSent?.toLocaleString()}</div>
                    <div className="mtile-label">Total Sent</div>
                  </div>
                </div>

                <div className="g2">
                  <div>
                    <div className="perf-bar-wrap">
                      <div className="perf-bar-head">
                        <span className="perf-bar-label">Email Opens</span>
                        <span className="perf-bar-val">{analysis.overallPerformance?.totalOpened} / {analysis.overallPerformance?.totalSent}</span>
                      </div>
                      <div className="perf-track">
                        <div className="perf-fill purple" style={{ width: `${Math.min(analysis.overallPerformance?.openRate || 0, 100)}%` }} />
                      </div>
                    </div>
                    <div className="perf-bar-wrap">
                      <div className="perf-bar-head">
                        <span className="perf-bar-label">Email Clicks</span>
                        <span className="perf-bar-val">{analysis.overallPerformance?.totalClicked} / {analysis.overallPerformance?.totalSent}</span>
                      </div>
                      <div className="perf-track">
                        <div className="perf-fill green" style={{ width: `${Math.min(analysis.overallPerformance?.clickRate || 0, 100)}%` }} />
                      </div>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>
                      A/B Test Winner
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      {analysis.abTestWinner}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flow-line"></div>

              <div className="g2">
                {/* Insights */}
                <div className="card">
                  <div className="section-header">
                    <span className="section-num" style={{ background: 'var(--accent-amber)' }}>💡</span>
                    <h2>AI Insights</h2>
                  </div>
                  {(analysis.insights || []).map((ins, i) => (
                    <div key={i} className="insight">{ins}</div>
                  ))}
                </div>

                {/* Optimization Plan */}
                <div className="card">
                  <div className="section-header">
                    <span className="section-num" style={{ background: 'var(--gradient-green)' }}>🔄</span>
                    <h2>Autonomous Optimization</h2>
                    <span className="section-badge sbadge-ai">{optimization?.optimizationType}</span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.6 }}>
                    {optimization?.reasoning?.substring(0, 200)}
                  </p>
                  <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 700, marginBottom: 12 }}>
                    Expected: Open Rate {optimization?.expectedImprovement?.openRate} · Click Rate {optimization?.expectedImprovement?.clickRate}
                  </div>
                  {(optimization?.changes || []).map((c, i) => (
                    <div key={i} className="optim-change">{c}</div>
                  ))}
                  <div className="approval-bar">
                    <button className="btn btn-success" onClick={handleOptimize}>✅ Approve &amp; Relaunch</button>
                    <button className="btn btn-outline" onClick={() => { setPhase('brief'); setCampaignPlan(null); setAnalysis(null); setOptimization(null); }}>🔙 New Campaign</button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* TAB: Agent Reasoning Logs                   */}
      {/* ═══════════════════════════════════════════ */}
      {activeTab === 'logs' && (
        <div className="card">
          <div className="section-header">
            <span className="section-num" style={{ background: 'var(--accent-pink)' }}>🤖</span>
            <h2>Agent Reasoning Trail</h2>
            <span className="section-badge sbadge-ai">{logs.length} steps</span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16 }}>
            Every decision made by the AI agents is logged here — showcasing the Plan → Execute → Reflect cycle.
          </p>
          <div className="agent-log">
            {logs.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>
                Agent reasoning logs will appear here as the AI system processes your campaign...
              </div>
            )}
            {logs.map((l, i) => (
              <div key={i} className={`log-item ${l.agent}`}>
                <span className="log-agent">{l.agent}</span>
                <span className="log-msg">
                  {l.step && <strong>[{l.step}] </strong>}{l.reasoning}
                </span>
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* TAB: Dynamic API Discovery                  */}
      {/* ═══════════════════════════════════════════ */}
      {activeTab === 'api' && (
        <div className="card">
          <div className="section-header">
            <span className="section-num" style={{ background: 'var(--accent-blue)' }}>🔍</span>
            <h2>Dynamic API Discovery</h2>
            <span className="section-badge sbadge-live">Runtime Parsed</span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.6 }}>
            These API tools are discovered <strong>automatically at runtime</strong> by parsing the OpenAPI specification.
            The AI agents use these tool definitions to <strong>dynamically construct API requests</strong> — no hardcoded endpoints,
            enabling the system to adapt to API changes without code modifications.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {discoveredTools.map((t, i) => (
              <div key={i} className="api-tool">
                <span className={`api-method ${t.method.toLowerCase()}`}>{t.method}</span>
                <div>
                  <div className="path">{t.path}</div>
                  <div className="desc">{t.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
