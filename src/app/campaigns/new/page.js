'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const STEPS = [
  { num: 1, label: 'Campaign Brief' },
  { num: 2, label: 'Cohort Analysis' },
  { num: 3, label: 'Strategy Review' },
  { num: 4, label: 'Content Preview' },
  { num: 5, label: 'Approval & Launch' },
];

export default function CampaignCreation() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [brief, setBrief] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [campaignPlan, setCampaignPlan] = useState(null);
  const [dbCampaignId, setDbCampaignId] = useState(null);
  const [sentResults, setSentResults] = useState(null);
  const [logs, setLogs] = useState([]);
  const [discoveredTools, setDiscoveredTools] = useState([]);
  const [cohortStats, setCohortStats] = useState(null);
  const logEndRef = useRef(null);

  useEffect(() => {
    fetch('/api/discover')
      .then((r) => r.json())
      .then((d) => setDiscoveredTools(d.tools || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const addLog = (e) => setLogs((prev) => [...prev, e]);

  const computeCohortStats = (data) => {
    if (!data || data.length === 0) return null;
    const fields = Object.keys(data[0]);
    const stats = { total: data.length, fields: fields.length, demographics: {}, categoricalFields: [], numericFields: [] };
    // Skip identity/contact fields dynamically (matches server-side schemaAnalyzer logic)
    const skipPatterns = [/(_id|^id)$/i, /email/i, /^_/, /^(full_?name|first_?name|last_?name|name|display_?name|username)$/i, /phone|mobile|tel/i];
    const isSkipField = (f) => skipPatterns.some((p) => p.test(f));

    for (const f of fields) {
      if (isSkipField(f)) continue;
      // Detect if field is numeric by sampling
      const sampleVals = data.slice(0, 50).map((c) => c[f]).filter((v) => v !== null && v !== undefined && v !== '');
      const numericCount = sampleVals.filter((v) => !isNaN(Number(v))).length;
      const isNumeric = sampleVals.length > 0 && numericCount / sampleVals.length > 0.8;

      if (isNumeric) {
        const vals = data.map((c) => Number(c[f])).filter((v) => !isNaN(v));
        if (vals.length === 0) continue;
        stats.demographics[`${f}_avg`] = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
        stats.demographics[`${f}_min`] = Math.min(...vals);
        stats.demographics[`${f}_max`] = Math.max(...vals);
        stats.numericFields.push(f);
      } else {
        const counts = {};
        data.forEach((c) => { const v = c[f]; if (v !== null && v !== undefined) counts[v] = (counts[v] || 0) + 1; });
        const uniqueCount = Object.keys(counts).length;
        if (uniqueCount > 0 && uniqueCount <= 30) {
          stats.demographics[f] = counts;
          stats.categoricalFields.push(f);
        }
      }
    }
    return stats;
  };

  const topN = (obj, n = 5) => Object.entries(obj || {}).sort((a, b) => b[1] - a[1]).slice(0, n);
  const colors = ['#8b5cf6', '#3b82f6', '#06b6d4', '#ec4899', '#f59e0b', '#10b981', '#ef4444'];

  // Step 1 → Analyze Brief
  const handleAnalyze = async () => {
    if (!brief.trim()) return;
    setLoading(true);
    setLoadingMsg('🧠 AI agents are reading API docs, analyzing your cohort, and creating strategy...');
    addLog({ agent: 'orchestrator', step: 'init', reasoning: 'Starting agentic campaign workflow — reading API documentation dynamically' });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000); // 5 min timeout

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', brief }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await res.json();
      if (data.success) {
        setCampaignPlan(data.plan);
        setDbCampaignId(data.campaignId);
        const cs = computeCohortStats(data.plan.cohortData);
        setCohortStats(cs);
        if (data.logs) data.logs.forEach((l) => addLog(l));
        setStep(2);
      } else {
        addLog({ agent: 'error', reasoning: data.error || 'Failed' });
      }
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        addLog({ agent: 'error', reasoning: 'Request timed out after 5 minutes. The external API may be slow. Please try again.' });
      } else {
        addLog({ agent: 'error', reasoning: err.message });
      }
    } finally {
      setLoading(false);
    }
  };

  // Step 5 → Approve & Send
  const handleApprove = async () => {
    setLoading(true);
    setLoadingMsg('📤 Sending campaigns via dynamically discovered API...');
    addLog({ agent: 'orchestrator', reasoning: 'Human approved → executing via agentic API tool calling' });
    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', campaignId: dbCampaignId, approvedVariants: campaignPlan.contentVariants }),
      });
      const data = await res.json();
      if (data.success) {
        setSentResults(data.results);
        addLog({ agent: 'orchestrator', reasoning: `Campaigns sent! IDs: ${data.results.map((r) => r.campaign_id).join(', ')}` });
      } else {
        addLog({ agent: 'error', reasoning: data.error });
      }
    } catch (err) {
      addLog({ agent: 'error', reasoning: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Stepper */}
      <div className="stepper">
        {STEPS.map((s, i) => (
          <div key={s.num} style={{ display: 'contents' }}>
            <div className={`stepper-step ${step === s.num ? 'active' : ''} ${step > s.num ? 'done' : ''}`}>
              <div className="stepper-circle">
                {step > s.num ? '✓' : s.num}
              </div>
              <span className="stepper-label">{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`stepper-line ${step > s.num ? 'done' : ''} ${step === s.num + 1 ? 'active' : ''}`} />
            )}
          </div>
        ))}
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="card">
          <div className="loading-state">
            <div className="spinner spinner-lg" />
            <p>{loadingMsg}</p>
            {logs.length > 0 && (
              <div style={{ width: '100%', maxWidth: 600, marginTop: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                  Agent Activity
                </div>
                <div className="agent-log" style={{ maxHeight: 150 }}>
                  {logs.slice(-5).map((l, i) => (
                    <div key={i} className={`log-item ${l.agent}`}>
                      <span className="log-agent">{l.agent}</span>
                      <span className="log-msg">{l.step && <strong>[{l.step}] </strong>}{l.reasoning}</span>
                    </div>
                  ))}
                  <div ref={logEndRef} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════ STEP 1: CAMPAIGN BRIEF ═══════════ */}
      {step === 1 && !loading && (
        <div className="card">
          <div className="section-header">
            <span className="section-num">1</span>
            <h2>Campaign Brief</h2>
            <span className="section-badge sbadge-ai">AI-Powered Analysis</span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
            Describe your campaign in natural language. The AI agents will analyze the customer cohort, create segmentation strategy,
            and generate optimized email content — all autonomously.
          </p>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>
              Quick Templates
            </div>
            <div className="filter-chips">
              {[
                'Product Launch Campaign',
                'Seasonal Promotion',
                'Customer Retention',
                'Cross-sell / Upsell',
              ].map((t) => (
                <button key={t} className="filter-chip" onClick={() => setBrief((prev) => prev ? prev : `Run an email campaign for ${t.toLowerCase()}...`)}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="brief-box">
            <textarea
              className="brief-textarea"
              placeholder="e.g., Run email campaign for launching XDeposit, a flagship term deposit product from SuperBFSI, that gives 1 percentage point higher returns than its competitors. Announce an additional 0.25% higher returns for female senior citizens. Optimise for open rate and click rate..."
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 18 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{brief.length} / 5000 characters</span>
            <button className="btn btn-primary btn-lg" onClick={handleAnalyze} disabled={loading || !brief.trim()}>
              🚀 Analyze Brief & Generate Strategy
            </button>
          </div>
        </div>
      )}

      {/* ═══════════ STEP 2: COHORT ANALYSIS ═══════════ */}
      {step === 2 && !loading && campaignPlan && (
        <div className="card">
          <div className="section-header">
            <span className="section-num">2</span>
            <h2>Customer Cohort Analysis</h2>
            <span className="section-badge sbadge-live">Live Data</span>
          </div>

          {cohortStats && (
            <>
              <div className="g4" style={{ marginBottom: 24 }}>
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
                {/* Dynamically render categorical distributions (top 3) */}
                {(cohortStats.categoricalFields || []).slice(0, 3).map((field, fi) => (
                  <div key={field} className="cohort-stat">
                    <div className="cohort-stat-title">{field.replace(/_/g, ' ')} Distribution</div>
                    <div className="cohort-bar">
                      {topN(cohortStats.demographics[field], 6).map(([k, v], i) => (
                        <div key={k} className="cohort-bar-item"
                          style={{ height: `${(v / cohortStats.total) * 100 * 2.5}px`, background: colors[i % colors.length], opacity: 0.8 }}
                          title={`${k}: ${v}`} />
                      ))}
                    </div>
                    <div className="cohort-bar-label">
                      {topN(cohortStats.demographics[field], 6).map(([k, v]) => (<span key={k}>{k}: {v}</span>))}
                    </div>
                  </div>
                ))}
                {/* Dynamically render numeric averages */}
                {(cohortStats.numericFields || []).length > 0 && (
                  <div className="cohort-stat">
                    <div className="cohort-stat-title">Key Averages</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {(cohortStats.numericFields || []).map((field) => (
                        <div key={field} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                          <span style={{ color: 'var(--text-muted)' }}>Avg {field.replace(/_/g, ' ')}</span>
                          <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{cohortStats.demographics[`${field}_avg`]?.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          <div className="approval-bar">
            <button className="btn btn-outline" onClick={() => setStep(1)}>← Back to Brief</button>
            <button className="btn btn-primary" onClick={() => setStep(3)} style={{ marginLeft: 'auto' }}>
              Continue to Strategy →
            </button>
          </div>
        </div>
      )}

      {/* ═══════════ STEP 3: STRATEGY REVIEW ═══════════ */}
      {step === 3 && !loading && campaignPlan && (
        <div className="card">
          <div className="section-header">
            <span className="section-num">3</span>
            <h2>AI Campaign Strategy</h2>
            <span className="section-badge sbadge-ai">🧠 AI-Generated</span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.6 }}>
            {campaignPlan.strategy?.overallStrategy}
          </p>

          {/* Workflow Plan */}
          {campaignPlan.workflowPlan && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>
                AI-Generated Workflow Plan
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(campaignPlan.workflowPlan?.steps || []).map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10 }}>
                    <div style={{ width: 26, height: 26, borderRadius: 8, background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                      {s.step}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{s.action}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{s.reasoning?.substring(0, 120)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Segments */}
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>
            Customer Segments ({campaignPlan.strategy?.segments?.length || 0})
          </div>
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

          <div className="approval-bar">
            <button className="btn btn-outline" onClick={() => setStep(2)}>← Back</button>
            <button className="btn btn-primary" onClick={() => setStep(4)} style={{ marginLeft: 'auto' }}>
              Continue to Content →
            </button>
          </div>
        </div>
      )}

      {/* ═══════════ STEP 4: CONTENT PREVIEW ═══════════ */}
      {step === 4 && !loading && campaignPlan && (
        <div className="card">
          <div className="section-header">
            <span className="section-num">4</span>
            <h2>Email Content Preview</h2>
            <span className="section-badge sbadge-ai">✍️ AI-Written</span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.6 }}>
            Review the AI-generated email variants below. Each segment receives A/B test variants for performance optimization.
          </p>

          {(campaignPlan.contentVariants || []).map((v, i) => (
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

          <div className="approval-bar">
            <button className="btn btn-outline" onClick={() => setStep(3)}>← Back</button>
            <button className="btn btn-primary" onClick={() => setStep(5)} style={{ marginLeft: 'auto' }}>
              Continue to Approval →
            </button>
          </div>
        </div>
      )}

      {/* ═══════════ STEP 5: APPROVAL & LAUNCH ═══════════ */}
      {step === 5 && !loading && campaignPlan && !sentResults && (
        <div className="card">
          <div className="section-header">
            <span className="section-num">5</span>
            <h2>Human-in-the-Loop Approval</h2>
            <span className="section-badge sbadge-warn">⏳ Awaiting Approval</span>
          </div>

          {/* Campaign Summary */}
          <div className="g3" style={{ marginBottom: 24 }}>
            <div className="mtile">
              <div className="mtile-val">{campaignPlan.contentVariants?.reduce((sum, v) => sum + (v.customerIds?.length || 0), 0)}</div>
              <div className="mtile-label">Total Recipients</div>
            </div>
            <div className="mtile">
              <div className="mtile-val">{campaignPlan.contentVariants?.length || 0}</div>
              <div className="mtile-label">Email Variants</div>
            </div>
            <div className="mtile">
              <div className="mtile-val">{campaignPlan.strategy?.segments?.length || 0}</div>
              <div className="mtile-label">Segments</div>
            </div>
          </div>

          {/* Checklist */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>
              Pre-Launch Checklist
            </div>
            {[
              { label: 'Campaign brief reviewed', done: true },
              { label: 'Customer cohort analyzed', done: !!cohortStats },
              { label: 'Strategy segments created', done: !!campaignPlan.strategy?.segments?.length },
              { label: 'Email content generated', done: !!campaignPlan.contentVariants?.length },
              { label: 'A/B test variants ready', done: (campaignPlan.contentVariants?.length || 0) > 1 },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', fontSize: 13 }}>
                <span style={{ color: item.done ? 'var(--accent-green)' : 'var(--text-muted)', fontWeight: 700 }}>
                  {item.done ? '✅' : '⬜'}
                </span>
                <span style={{ color: item.done ? 'var(--text-primary)' : 'var(--text-muted)' }}>{item.label}</span>
              </div>
            ))}
          </div>

          {/* Discovered APIs used */}
          {discoveredTools.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>
                APIs Discovered at Runtime
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {discoveredTools.filter((t) => t.path !== '/api/v1/signup').slice(0, 5).map((t, i) => (
                  <div key={i} className="api-tool">
                    <span className={`api-method ${t.method.toLowerCase()}`}>{t.method}</span>
                    <div>
                      <div className="path">{t.path}</div>
                      <div className="desc">{t.description?.substring(0, 100)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
            <strong>No campaign is sent until you explicitly approve.</strong> Clicking approve will send all variants to their target segments.
          </p>

          <div className="approval-bar">
            <button className="btn btn-outline" onClick={() => setStep(4)}>← Back</button>
            <button className="btn btn-success btn-lg" onClick={handleApprove} style={{ marginLeft: 'auto' }}>
              ✅ Approve & Send All Campaigns
            </button>
          </div>
        </div>
      )}

      {/* ═══════════ POST-LAUNCH: SENT RESULTS ═══════════ */}
      {sentResults && !loading && (
        <div className="card">
          <div className="section-header">
            <span className="section-num" style={{ background: 'var(--accent-green)' }}>✓</span>
            <h2>Campaigns Sent Successfully!</h2>
            <span className="section-badge sbadge-live">✅ Live</span>
          </div>

          <div className="table-container" style={{ marginBottom: 20 }}>
            <table className="table">
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
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => router.push(`/campaigns/${dbCampaignId}`)}>
              📊 View Campaign Details
            </button>
            <button className="btn btn-outline" onClick={() => router.push('/campaigns')}>
              View All Campaigns
            </button>
            <button className="btn btn-ghost" onClick={() => {
              setStep(1);
              setBrief('');
              setCampaignPlan(null);
              setSentResults(null);
              setLogs([]);
            }}>
              ✨ Create Another Campaign
            </button>
          </div>
        </div>
      )}

      {/* Agent Reasoning Trail */}
      {logs.length > 0 && !loading && (
        <div className="card">
          <div className="section-header">
            <span className="section-num" style={{ background: 'var(--gradient-ai)' }}>🤖</span>
            <h2>Agent Reasoning Trail</h2>
            <span className="section-badge sbadge-ai">{logs.length} steps</span>
          </div>
          <div className="agent-log">
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
    </>
  );
}
