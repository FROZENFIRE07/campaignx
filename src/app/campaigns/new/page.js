'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';

const STEPS = [
  { label: 'Brief', icon: 'edit_note', desc: 'Define campaign objectives' },
  { label: 'Orchestration', icon: 'account_tree', desc: 'AI agent workflow' },
  { label: 'Preview', icon: 'visibility', desc: 'Review & approve' },
];

const ORCHESTRATION_NODES = [
  { icon: 'psychology', label: 'Strategy', status: 'processing' },
  { icon: 'draw', label: 'Content', status: 'pending' },
  { icon: 'analytics', label: 'Analysis', status: 'pending' },
];

export default function NewCampaign() {
  const [step, setStep] = useState(0);
  const [brief, setBrief] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [variants, setVariants] = useState([]);
  const [orchestrating, setOrchestrating] = useState(false);
  const [orchProgress, setOrchProgress] = useState(0);
  const [error, setError] = useState('');
  const [launched, setLaunched] = useState(false);
  const briefRef = useRef(null);

  const handleOrchestrate = async () => {
    if (!brief.trim()) { setError('Please enter a campaign brief.'); return; }
    setError('');
    setOrchestrating(true);
    setStep(1);
    setOrchProgress(0);

    // Simulate orchestration progress
    const interval = setInterval(() => {
      setOrchProgress((prev) => {
        if (prev >= 95) { clearInterval(interval); return 95; }
        return prev + Math.random() * 15;
      });
    }, 500);

    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', brief }),
      });
      const data = await response.json();
      clearInterval(interval);
      setOrchProgress(100);
      setResult(data);

      // Use real API response fields for variants preview
      const planVariants = data.plan?.contentVariants || [];
      setVariants(planVariants.map((v, i) => ({
        name: v.variantName || `Variant ${String.fromCharCode(65 + i)}`,
        match: v.matchScore ? `${v.matchScore}%` : '—',
        subject: v.subject || 'Untitled',
        body: v.body?.substring(0, 200) || '',
        segment: v.targetSegment || 'General',
      })));

      setTimeout(() => { setStep(2); setOrchestrating(false); }, 1200);
    } catch (err) {
      clearInterval(interval);
      setOrchestrating(false);
      setError('Orchestration failed. Please try again.');
      setStep(0);
    }
  };

  const handleLaunch = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', campaignId: result?.campaignId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Launch failed.');
      setLaunched(true);
    } catch (e) {
      setError(e.message || 'Launch failed.');
    }
    setLoading(false);
  };

  if (launched) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
        <div className="glass" style={{ padding: 48, maxWidth: 500, width: '100%' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🚀</div>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Campaign Launched!</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.6 }}>
            Your AI agents are now executing the campaign. Track progress in real-time from the dashboard.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <Link href="/" className="btn btn-primary">Go to Dashboard</Link>
            <button className="btn btn-ghost" onClick={() => { setLaunched(false); setStep(0); setBrief(''); setResult(null); setVariants([]); }}>Create Another</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 32, minHeight: 'calc(100vh - 140px)' }}>
      {/* Left Step Navigation */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {STEPS.map((s, i) => (
          <div
            key={s.label}
            onClick={() => { if (i < step) setStep(i); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
              borderRadius: 12, cursor: i <= step ? 'pointer' : 'default',
              background: step === i ? 'var(--accent-primary)' : i < step ? 'rgba(16,185,129,0.1)' : 'transparent',
              color: step === i ? '#fff' : i < step ? 'var(--accent-green)' : 'var(--text-muted)',
              border: '1px solid',
              borderColor: step === i ? 'var(--accent-primary)' : i < step ? 'rgba(16,185,129,0.2)' : 'var(--border)',
              transition: 'all 0.3s',
              opacity: i > step ? 0.4 : 1,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
              {i < step ? 'check_circle' : s.icon}
            </span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{s.label}</div>
              <div style={{ fontSize: 10, opacity: 0.7 }}>{s.desc}</div>
            </div>
          </div>
        ))}

        <div style={{ flex: 1 }} />

        {/* Progress indicator */}
        <div style={{ padding: 16, borderRadius: 12, background: 'rgba(163,230,53,0.05)', border: '1px solid rgba(163,230,53,0.1)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>Progress</div>
          <div style={{ display: 'flex', gap: 3 }}>
            {STEPS.map((_, i) => (
              <div key={i} style={{ flex: 1, height: 4, borderRadius: 4, background: i <= step ? 'var(--accent-primary)' : 'var(--border)', transition: 'background 0.3s' }} />
            ))}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8 }}>Step {step + 1} of {STEPS.length}</div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {error && (
          <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--accent-red)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>error</span>
            {error}
          </div>
        )}

        {/* Step 0: Brief */}
        {step === 0 && (
          <div className="glass" style={{ padding: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(163,230,53,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--accent-primary)', fontSize: 22 }}>auto_awesome</span>
              </div>
              <div>
                <h2 style={{ fontWeight: 700, fontSize: 20 }}>Campaign Briefing</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Describe your campaign goals and target audience</p>
              </div>
            </div>

            <div className="brief-box">
              <textarea
                ref={briefRef}
                className="brief-textarea"
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                placeholder={`Example: Launch an outreach campaign targeting SaaS CTOs in Series B+ companies. Focus on personalized messaging about our AI analytics platform's ROI improvements. Include follow-up sequences and A/B test subject lines.`}
                rows={8}
                style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{brief.length} / 2000 characters</span>
              <button className="btn btn-primary" onClick={handleOrchestrate} disabled={!brief.trim() || loading}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>rocket_launch</span>
                Start Orchestrating
              </button>
            </div>
          </div>
        )}

        {/* Step 1: Orchestration */}
        {step === 1 && (
          <div className="glass" style={{ padding: 32 }}>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <h2 style={{ fontWeight: 700, fontSize: 20, marginBottom: 8 }}>Orchestration Blueprint</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>AI agents are working on your campaign</p>
            </div>

            {/* Node Flow */}
            <div className="orch-flow">
              {ORCHESTRATION_NODES.map((node, i) => {
                const isActive = orchProgress >= (i === 0 ? 0 : i === 1 ? 33 : 66);
                const isDone = orchProgress >= (i === 0 ? 33 : i === 1 ? 66 : 100);
                return (
                  <div key={node.label} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                    <div className="orch-node">
                      <div className={`orch-circle ${isDone ? 'orch-circle-active' : isActive ? 'orch-circle-active' : 'orch-circle-pending'}`}>
                        <span className="material-symbols-outlined">
                          {isDone ? 'check' : node.icon}
                        </span>
                      </div>
                      <span className="orch-label" style={{ color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
                        {node.label}
                      </span>
                      <span className="orch-badge" style={{
                        background: isDone ? 'rgba(16,185,129,0.2)' : isActive ? 'rgba(163,230,53,0.2)' : 'rgba(255,255,255,0.05)',
                        color: isDone ? 'var(--accent-green)' : isActive ? 'var(--accent-primary)' : 'var(--text-muted)',
                      }}>
                        {isDone ? 'Complete' : isActive ? 'Processing' : 'Queued'}
                      </span>
                    </div>
                    {i < ORCHESTRATION_NODES.length - 1 && (
                      <div className={`orch-connector ${isActive ? 'orch-connector-active' : 'orch-connector-pending'}`}>
                        {isActive && !isDone && <div className="orch-connector-dot" />}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Progress Bar */}
            <div style={{ marginTop: 32 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Overall Progress</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-primary)' }}>{Math.round(orchProgress)}%</span>
              </div>
              <div className="progress-bar" style={{ height: 8 }}>
                <div className="progress-bar-fill purple" style={{ width: `${orchProgress}%` }} />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Preview & Approve */}
        {step === 2 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontWeight: 700, fontSize: 20, marginBottom: 4 }}>Human-in-the-Loop Review</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Review AI-generated variants before launch</p>
              </div>
              <button className="btn btn-primary" onClick={handleLaunch} disabled={loading}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>rocket_launch</span>
                {loading ? 'Launching...' : 'Launch Campaign'}
              </button>
            </div>

            {/* Variant Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              {variants.map((v, i) => (
                <div className="glass variant-card" key={i}>
                  <div className="variant-header">
                    <div className="variant-name">
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>mail</span>
                      {v.name}
                    </div>
                    <span className="variant-match">Match: {v.match}</span>
                  </div>
                  <div className="variant-body">
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', marginBottom: 6 }}>{v.segment}</div>
                    <h4 style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>{v.subject}</h4>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{v.body}</p>
                  </div>
                  <div className="variant-actions">
                    <button className="variant-btn variant-btn-edit">
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>edit</span>
                      Edit
                    </button>
                    <button className="variant-btn variant-btn-approve">
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>check</span>
                      Approve
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Strategy Summary */}
            {result?.plan?.strategy && (
              <div className="glass" style={{ padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--accent-primary)', fontSize: 20 }}>psychology</span>
                  <h4 style={{ fontWeight: 700 }}>Strategy Summary</h4>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                  {typeof result.plan.strategy === 'string' ? result.plan.strategy : JSON.stringify(result.plan.strategy, null, 2)}
                </div>
              </div>
            )}

            {/* Segments from Strategy */}
            {result?.plan?.strategy?.segments?.length > 0 && (
              <div className="glass" style={{ padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--accent-primary)', fontSize: 20 }}>group</span>
                  <h4 style={{ fontWeight: 700 }}>Segments</h4>
                </div>
                <div className="g3">
                  {result.plan.strategy.segments.map((seg, i) => (
                    <div key={i} className="seg-card">
                      <div className="seg-head">
                        <span className="seg-name">{seg.name}</span>
                        <span className="seg-count">{seg.count?.toLocaleString()} customers</span>
                      </div>
                      {seg.description && <p className="seg-desc">{seg.description}</p>}
                      <div className="seg-meta">
                        {seg.recommendedTone && <span>🎯 {seg.recommendedTone}</span>}
                        {seg.recommendedSendTime && <span>🕐 {seg.recommendedSendTime}</span>}
                        {seg.priority && <span>⚡ {seg.priority}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Workflow Plan */}
            {result?.plan?.workflowPlan && (
              <div className="glass" style={{ padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--accent-primary)', fontSize: 20 }}>account_tree</span>
                  <h4 style={{ fontWeight: 700 }}>Workflow Plan</h4>
                </div>
                <pre style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                  {typeof result.plan.workflowPlan === 'string' ? result.plan.workflowPlan : JSON.stringify(result.plan.workflowPlan, null, 2)}
                </pre>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
