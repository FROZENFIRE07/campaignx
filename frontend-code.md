# CampaignX Frontend Code — Complete Source

> All redesigned frontend files for the CampaignX AI Campaign Management platform.
> Technology: Next.js 16 + React 19 + Vanilla CSS + Material Symbols Icons

---

## Table of Contents

1. [layout.js](#1-layoutjs) — Root layout
2. [globals.css](#2-globalscss) — All styles (link to file)
3. [page.js](#3-pagejs) — Dashboard
4. [components/AppShell.js](#4-componentsappshelljs) — Header + layout shell
5. [components/Sidebar.js](#5-componentssidebarjs) — Navigation sidebar
6. [components/StatsCard.js](#6-componentsstatscardjs) — Reusable stat card
7. [components/EmptyState.js](#7-componentsemptystatejs) — Empty state component
8. [analytics/page.js](#8-analyticspagejs) — Analytics page
9. [ai-studio/page.js](#9-ai-studiopagejs) — Agent terminal logs
10. [campaigns/new/page.js](#10-campaignsnewpagejs) — Campaign creator wizard

---

## 1. layout.js
**Path:** `src/app/layout.js`

```jsx
import "./globals.css";
import AppShell from "./components/AppShell";
import { ToastProvider } from "./components/Toast";

export const metadata = {
  title: "CampaignX | AI-Powered Campaign Management",
  description: "AI Multi-Agent System for Digital Marketing Campaign Automation - SuperBFSI",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark" data-theme="dark">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&family=Sora:wght@700;800&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body>
        <ToastProvider>
          <AppShell>{children}</AppShell>
        </ToastProvider>
      </body>
    </html>
  );
}
```

---

## 2. globals.css
**Path:** `src/app/globals.css`

> ⚠️ This file is ~3700 lines. See the full file at: `src/app/globals.css`
>
> Key design tokens and new styles added:
> - Glass cards: `.glass`, `.glass-hover`, `.glass-card`, `.glass-dark`, `.frosted-glass`
> - Background blobs: `.bg-blobs`, `.bg-blob-primary`, `.bg-blob-success`
> - Terminal styles: `.terminal-container`, `.terminal-header`, `.terminal-body`, `.terminal-line`
> - Activity feed: `.activity-feed`, `.activity-item`, `.activity-dot`, `.activity-connector`
> - Distribution bars: `.dist-item`, `.dist-track`, `.dist-fill`
> - Heatmap: `.heatmap-grid`, `.heatmap-cell`
> - Orchestration: `.orch-flow`, `.orch-node`, `.orch-circle`, `.orch-connector`
> - Variant cards: `.variant-card`, `.variant-header`, `.variant-actions`
> - Insights: `.insight-item`, `.insight-icon`
> - Chart legend: `.chart-legend`, `.chart-legend-item`

---

## 3. page.js
**Path:** `src/app/page.js` — Dashboard

```jsx
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
        <StatsCard materialIcon="mail" value={avgOpenRate !== '--' ? `${avgOpenRate}%` : '--'} label="Open Rate" trend={avgOpenRate !== '--' ? '+2.1% from last week' : null} trendDir="up" bgColor="rgba(99, 102, 241, 0.1)" />
        <StatsCard materialIcon="ads_click" value={avgClickRate !== '--' ? `${avgClickRate}%` : '--'} label="CTR" trend={avgClickRate !== '--' ? 'vs last week' : null} trendDir={Number(avgClickRate) > 5 ? 'up' : 'down'} bgColor="rgba(99, 102, 241, 0.1)" />
        <StatsCard materialIcon="smart_toy" value={activeCampaigns.length || '0'} label="Active Agents" trend={`${campaigns.length} total campaigns`} trendDir="up" bgColor="rgba(99, 102, 241, 0.1)" />
        <StatsCard materialIcon="payments" value={analyzedCampaigns.length > 0 ? '4.8%' : '--'} label="Conversion" trend={analyzedCampaigns.length > 0 ? '+1.2% boost' : null} trendDir="up" bgColor="rgba(99, 102, 241, 0.1)" />
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
                <div className="activity-item">
                  <div className="activity-line-wrap">
                    <div className="activity-dot activity-dot-primary"><span className="material-symbols-outlined">robot_2</span></div>
                    <div className="activity-connector" />
                  </div>
                  <div className="activity-content">
                    <div className="activity-header">
                      <h4 className="activity-agent">Agent Alpha</h4>
                      <span className="activity-time">2 mins ago</span>
                    </div>
                    <p className="activity-message">Successfully initiated outreach to <span className="highlight">124 leads</span> in the &quot;SaaS Q4&quot; campaign.</p>
                  </div>
                </div>
                <div className="activity-item">
                  <div className="activity-line-wrap">
                    <div className="activity-dot activity-dot-success"><span className="material-symbols-outlined">check_circle</span></div>
                    <div className="activity-connector" />
                  </div>
                  <div className="activity-content">
                    <div className="activity-header">
                      <h4 className="activity-agent">Agent Beta</h4>
                      <span className="activity-time">5 mins ago</span>
                    </div>
                    <p className="activity-message">Resolved support query for lead <em>&quot;David Chen&quot;</em>. High sentiment score (0.92).</p>
                  </div>
                </div>
                <div className="activity-item">
                  <div className="activity-line-wrap">
                    <div className="activity-dot activity-dot-primary"><span className="material-symbols-outlined">calendar_today</span></div>
                    <div className="activity-connector" />
                  </div>
                  <div className="activity-content">
                    <div className="activity-header">
                      <h4 className="activity-agent">Agent Gamma</h4>
                      <span className="activity-time">12 mins ago</span>
                    </div>
                    <p className="activity-message">Scheduled meeting with <span className="highlight">TechNova Global</span> for Tuesday, Oct 24th at 2:00 PM PST.</p>
                  </div>
                </div>
                <div className="activity-item">
                  <div className="activity-line-wrap">
                    <div className="activity-dot activity-dot-neutral"><span className="material-symbols-outlined">person_add</span></div>
                  </div>
                  <div className="activity-content">
                    <div className="activity-header">
                      <h4 className="activity-agent">Agent Delta</h4>
                      <span className="activity-time">15 mins ago</span>
                    </div>
                    <p className="activity-message">New lead &quot;Sarah Jenkins&quot; processed and qualified. Assigned to <strong style={{ color: 'var(--text-secondary)' }}>Enterprise Pipeline</strong>.</p>
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
                  <thead><tr><th>Campaign</th><th>Status</th><th>Open Rate</th><th>Click Rate</th><th>Actions</th></tr></thead>
                  <tbody>
                    {campaigns.slice(0, 5).map((c) => (
                      <tr key={c._id}>
                        <td><div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.brief?.substring(0, 50) || 'Untitled'}{c.brief?.length > 50 ? '...' : ''}</div></td>
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
              <EmptyState icon={"🚀"} title="No campaigns created yet" description="Start your first AI-powered campaign in minutes" action={<Link href="/campaigns/new" className="btn btn-primary">Create First Campaign</Link>} />
            </div>
          )}
        </div>

        {/* Side Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="glass" style={{ padding: 24 }}>
            <h4 style={{ fontWeight: 700, marginBottom: 16 }}>Campaign Distribution</h4>
            <div>
              {[{ name: 'Email Marketing', pct: 75, color: 'var(--accent-primary)' }, { name: 'LinkedIn Outreach', pct: 42, color: 'rgba(99,102,241,0.6)' }, { name: 'Customer Support AI', pct: 91, color: 'var(--accent-green)' }].map(ch => (
                <div className="dist-item" key={ch.name}>
                  <div className="dist-header"><span>{ch.name}</span><span>{ch.pct}%</span></div>
                  <div className="dist-track"><div className="dist-fill" style={{ width: `${ch.pct}%`, background: ch.color }} /></div>
                </div>
              ))}
            </div>
          </div>
          <div className="cta-card">
            <h4>Automate More</h4>
            <p>Unleash the full potential of your campaigns with Advanced AI Agents.</p>
            <button className="cta-btn">Upgrade to Enterprise</button>
          </div>
          <div className="glass" style={{ padding: 24 }}>
            <h4 style={{ fontWeight: 700, marginBottom: 16 }}>Active Agents Map</h4>
            <div style={{ aspectRatio: '16/9', width: '100%', background: 'rgba(255,255,255,0.02)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 4 }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--accent-primary)', fontSize: 36 }}>public</span>
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, color: 'var(--text-muted)' }}>Global Coverage</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
```

---

## 4. components/AppShell.js
**Path:** `src/app/components/AppShell.js`

```jsx
'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';

const PAGE_TITLES = {
  '/': { title: 'Performance Overview', subtitle: "Welcome back, here's what's happening today." },
  '/campaigns': { title: 'Campaigns', subtitle: 'Manage and monitor all your campaigns.' },
  '/campaigns/new': { title: 'Create Campaign', subtitle: 'Use AI to orchestrate your next campaign.' },
  '/cohort': { title: 'Customer Cohort', subtitle: 'Analyze your customer segments.' },
  '/ai-studio': { title: 'Agent Runtime Logs', subtitle: 'Monitoring real-time LLM execution and tool interactions.' },
  '/analytics': { title: 'Performance Overview', subtitle: 'Real-time campaign analytics and insights.' },
  '/settings': { title: 'Settings', subtitle: 'Configure your workspace preferences.' },
};

export default function AppShell({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  const getPageInfo = () => {
    if (pathname.startsWith('/campaigns/') && pathname !== '/campaigns/new' && pathname !== '/campaigns') {
      return { title: 'Campaign Detail', subtitle: 'View campaign performance and details.' };
    }
    return PAGE_TITLES[pathname] || { title: 'CampaignX', subtitle: '' };
  };

  const pageInfo = getPageInfo();

  return (
    <div className="app-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <div className="bg-blobs">
          <div className="bg-blob bg-blob-primary" />
          <div className="bg-blob bg-blob-success" />
        </div>
        <header className="main-header">
          <div className="main-header-left">
            <button className="mobile-sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle navigation">
              <span className="material-symbols-outlined">menu</span>
            </button>
            <div>
              <h1 className="page-title">{pageInfo.title}</h1>
              {pageInfo.subtitle && <p className="page-subtitle">{pageInfo.subtitle}</p>}
            </div>
          </div>
          <div className="main-header-right">
            <div className="header-search">
              <span className="material-symbols-outlined header-search-icon">search</span>
              <input className="header-search-input" placeholder="Search campaigns..." type="text" />
            </div>
            <button className="header-btn notification-btn">
              <span className="material-symbols-outlined">notifications</span>
              <span className="notification-dot" />
            </button>
          </div>
        </header>
        <div className="page-container">{children}</div>
      </div>
    </div>
  );
}
```

---

## 5. components/Sidebar.js
**Path:** `src/app/components/Sidebar.js`

```jsx
'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/', icon: 'dashboard' },
  { label: 'Create', href: '/campaigns/new', icon: 'add_circle' },
  { label: 'Campaigns', href: '/campaigns', icon: 'campaign' },
  { label: 'Analytics', href: '/analytics', icon: 'bar_chart' },
  { label: 'Agent Logs', href: '/ai-studio', icon: 'terminal' },
  { label: 'Cohort', href: '/cohort', icon: 'group' },
  { label: 'Settings', href: '/settings', icon: 'settings' },
];

export default function Sidebar({ isOpen, onClose }) {
  const pathname = usePathname();

  const isActive = (href) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <>
      {isOpen && <div className="modal-overlay" style={{ zIndex: 99, background: 'rgba(0,0,0,0.5)' }} onClick={onClose} />}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo-icon">
            <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: 22 }}>auto_awesome</span>
          </div>
          <div>
            <span className="sidebar-logo">CampaignX</span>
            <div className="sidebar-subtitle">AI Automation</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className={`sidebar-nav-item ${isActive(item.href) ? 'active' : ''}`} onClick={onClose}>
              <span className="material-symbols-outlined nav-icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">SB</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">SuperBFSI</div>
              <div className="sidebar-user-role">Pro Account</div>
            </div>
            <span className="material-symbols-outlined" style={{ color: 'var(--text-muted)', fontSize: 20, cursor: 'pointer' }}>logout</span>
          </div>
        </div>
      </aside>
    </>
  );
}
```

---

## 6. components/StatsCard.js
**Path:** `src/app/components/StatsCard.js`

```jsx
'use client';

export default function StatsCard({ icon, materialIcon, value, label, trend, trendDir, bgColor }) {
  return (
    <div className="glass glass-hover stat-card-new">
      <div className="stat-card-new-top">
        <span className="stat-card-new-label">{label}</span>
        <div className="stat-card-new-icon" style={{ background: bgColor || 'rgba(99, 102, 241, 0.1)' }}>
          {materialIcon ? (
            <span className="material-symbols-outlined">{materialIcon}</span>
          ) : (
            <span style={{ fontSize: 18 }}>{icon}</span>
          )}
        </div>
      </div>
      <div className="stat-card-new-bottom">
        <div>
          <h3 className="stat-card-new-value">{value}</h3>
          {trend && (
            <p className={`stat-card-new-trend ${trendDir || 'up'}`}>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                {trendDir === 'down' ? 'trending_down' : 'trending_up'}
              </span>
              {trend}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

## 7. components/EmptyState.js
**Path:** `src/app/components/EmptyState.js`

```jsx
'use client';

export default function EmptyState({ icon, title, description, action }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon || '🚀'}</div>
      <div className="empty-state-title">{title}</div>
      {description && <div className="empty-state-desc">{description}</div>}
      {action}
    </div>
  );
}
```

---

## 8. analytics/page.js
**Path:** `src/app/analytics/page.js`

```jsx
'use client';

import { useState, useEffect } from 'react';
import StatsCard from '../components/StatsCard';

const HEATMAP_DATA = {
  hours: ['6AM', '9AM', '12PM', '3PM', '6PM', '9PM'],
  days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  values: [
    [0.2, 0.5, 0.8, 0.6, 0.7, 0.3, 0.1],
    [0.4, 0.9, 0.7, 0.8, 0.5, 0.2, 0.1],
    [0.3, 0.7, 0.9, 0.95, 0.8, 0.4, 0.2],
    [0.2, 0.6, 0.8, 0.9, 0.7, 0.3, 0.1],
    [0.1, 0.4, 0.5, 0.6, 0.9, 0.5, 0.2],
    [0.05, 0.2, 0.3, 0.4, 0.5, 0.3, 0.1],
  ],
};

const REGIONS = [
  { name: 'North America', pct: 42, color: 'var(--accent-primary)' },
  { name: 'Europe', pct: 28, color: 'rgba(99,102,241,0.6)' },
  { name: 'Asia Pacific', pct: 18, color: 'rgba(99,102,241,0.4)' },
  { name: 'Latin America', pct: 8, color: 'rgba(99,102,241,0.25)' },
  { name: 'Others', pct: 4, color: 'rgba(99,102,241,0.15)' },
];

const INSIGHTS = [
  { icon: 'trending_up', title: 'Engagement spike detected on Tuesdays between 10-11 AM EST', bg: 'rgba(16,185,129,0.15)', color: 'var(--accent-green)' },
  { icon: 'psychology', title: 'Subject lines with questions have 23% higher open rates', bg: 'rgba(99,102,241,0.15)', color: 'var(--accent-primary)' },
  { icon: 'warning', title: 'Click-through rate declining in "SMB" segment — consider A/B test', bg: 'rgba(245,158,11,0.15)', color: 'var(--accent-amber)' },
];

export default function Analytics() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/agent')
      .then((r) => r.json())
      .then((d) => setCampaigns(d.campaigns || []))
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  const totalReach = campaigns.reduce((s, c) => s + (c.cohortAnalysis?.totalAudience || 0), 0) || 12400;
  const avgEngagement = campaigns.length > 0
    ? (campaigns.reduce((s, c) => s + (c.metrics?.openRate || 0), 0) / campaigns.length).toFixed(1)
    : '24.8';
  const totalConversions = campaigns.filter(c => c.status === 'analyzed').length * 127 || 847;
  const totalSpend = campaigns.length > 0 ? `$${(campaigns.length * 1240).toLocaleString()}` : '$3,240';

  const chartPoints = [20, 35, 28, 42, 38, 55, 48, 62, 58, 72, 65, 78];
  const chartWidth = 100;
  const chartHeight = 80;
  const svgPath = chartPoints.map((p, i) => {
    const x = (i / (chartPoints.length - 1)) * chartWidth;
    const y = chartHeight - (p / 100) * chartHeight;
    return `${i === 0 ? 'M' : 'L'}${x},${y}`;
  }).join(' ');
  const areaPath = `${svgPath} L${chartWidth},${chartHeight} L0,${chartHeight} Z`;

  if (loading) {
    return (<div className="loading-state" style={{ minHeight: 400 }}><div className="spinner spinner-lg" /><p>Loading analytics data...</p></div>);
  }

  return (
    <>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 999, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, background: 'rgba(16,185,129,0.2)', color: 'var(--accent-green)' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-green)', display: 'inline-block', animation: 'livePulse 1.5s infinite' }} />
            Live Analytics
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm"><span className="material-symbols-outlined" style={{ fontSize: 16 }}>calendar_today</span> Last 30 Days</button>
          <button className="btn btn-primary btn-sm"><span className="material-symbols-outlined" style={{ fontSize: 16 }}>download</span> Export</button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 32 }}>
        <StatsCard materialIcon="campaign" value={totalReach.toLocaleString()} label="Total Reach" trend="+12.5% vs last month" trendDir="up" bgColor="rgba(99,102,241,0.1)" />
        <StatsCard materialIcon="touch_app" value={`${avgEngagement}%`} label="Engagement Rate" trend="+3.2% vs last month" trendDir="up" bgColor="rgba(99,102,241,0.1)" />
        <StatsCard materialIcon="payments" value={totalConversions.toLocaleString()} label="Conversions" trend="+8.1% vs last month" trendDir="up" bgColor="rgba(99,102,241,0.1)" />
        <StatsCard materialIcon="account_balance_wallet" value={totalSpend} label="Total Spend" trend="-5.2% efficiency gain" trendDir="down" bgColor="rgba(99,102,241,0.1)" />
      </div>

      {/* Chart + Heatmap */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
        <div className="glass" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <h3 style={{ fontWeight: 700 }}>Engagement Over Time</h3>
            <div className="chart-legend">
              <div className="chart-legend-item" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--accent-primary)' }}><span className="chart-legend-dot" style={{ background: 'var(--accent-primary)' }} /> Open Rate</div>
              <div className="chart-legend-item" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--accent-green)' }}><span className="chart-legend-dot" style={{ background: 'var(--accent-green)' }} /> Click Rate</div>
            </div>
          </div>
          <div style={{ position: 'relative', height: 250 }}>
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight + 10}`} style={{ width: '100%', height: '100%' }} preserveAspectRatio="none">
              <defs><linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="rgba(99,102,241,0.3)" /><stop offset="100%" stopColor="rgba(99,102,241,0)" /></linearGradient></defs>
              <path d={areaPath} fill="url(#chartGradient)" />
              <path d={svgPath} stroke="var(--accent-primary)" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <path d={chartPoints.map((p, i) => { const x = (i / (chartPoints.length - 1)) * chartWidth; const y = chartHeight - ((p * 0.45) / 100) * chartHeight; return `${i === 0 ? 'M' : 'L'}${x},${y}`; }).join(' ')} stroke="var(--accent-green)" strokeWidth="1" fill="none" strokeDasharray="4 2" strokeLinecap="round" />
            </svg>
            <div className="analytics-axis">{['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m) => <span key={m}>{m}</span>)}</div>
          </div>
        </div>
        <div className="glass" style={{ padding: 24 }}>
          <h3 style={{ fontWeight: 700, marginBottom: 24 }}>Best Send Times</h3>
          <div className="heatmap-grid">
            <div className="heatmap-label" />
            {HEATMAP_DATA.days.map((d) => <div className="heatmap-label" key={d}>{d}</div>)}
            {HEATMAP_DATA.hours.map((h, hi) => (
              <>
                <div className="heatmap-label" key={`h-${h}`}>{h}</div>
                {HEATMAP_DATA.days.map((d, di) => {
                  const val = HEATMAP_DATA.values[hi][di];
                  return <div className="heatmap-cell" key={`${h}-${d}`} style={{ background: `rgba(99, 102, 241, ${Math.max(0.05, val)})` }} title={`${d} ${h}: ${Math.round(val * 100)}%`} />;
                })}
              </>
            ))}
          </div>
        </div>
      </div>

      {/* 3-Column Bottom */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
        <div className="glass" style={{ padding: 24 }}>
          <h4 style={{ fontWeight: 700, marginBottom: 20 }}>Channel Distribution</h4>
          {[{ name: 'Email', pct: 45, color: 'var(--accent-primary)' }, { name: 'LinkedIn', pct: 25, color: 'rgba(99,102,241,0.6)' }, { name: 'WhatsApp', pct: 18, color: 'var(--accent-green)' }, { name: 'SMS', pct: 12, color: 'var(--accent-amber)' }].map(ch => (
            <div className="dist-item" key={ch.name}>
              <div className="dist-header"><span style={{ color: 'var(--text-secondary)' }}>{ch.name}</span><span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{ch.pct}%</span></div>
              <div className="dist-track"><div className="dist-fill" style={{ width: `${ch.pct}%`, background: ch.color }} /></div>
            </div>
          ))}
        </div>
        <div className="glass" style={{ padding: 24 }}>
          <h4 style={{ fontWeight: 700, marginBottom: 20 }}>Top Audience Regions</h4>
          {REGIONS.map(r => (
            <div className="dist-item" key={r.name}>
              <div className="dist-header"><span style={{ color: 'var(--text-secondary)' }}>{r.name}</span><span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{r.pct}%</span></div>
              <div className="dist-track"><div className="dist-fill" style={{ width: `${r.pct}%`, background: r.color }} /></div>
            </div>
          ))}
        </div>
        <div className="glass" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--accent-primary)', fontSize: 20 }}>auto_awesome</span>
            <h4 style={{ fontWeight: 700 }}>AI Insights</h4>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {INSIGHTS.map((insight, i) => (
              <div className="insight-item" key={i}>
                <div className="insight-icon" style={{ background: insight.bg }}><span className="material-symbols-outlined" style={{ color: insight.color }}>{insight.icon}</span></div>
                <div><div className="insight-title">{insight.title}</div><div className="insight-desc">Click to explore →</div></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
```

---

## 9. ai-studio/page.js
**Path:** `src/app/ai-studio/page.js` — Agent Terminal Logs

> Full source: see `src/app/ai-studio/page.js` (228 lines)
> 
> Features: Terminal-style log viewer with Mac window dots, color-coded agent tags (`[System]`, `[Strategy]`, `[Content]`, `[Tool_Call]`), filter pills, Live/Paused toggle, Export/Clear, command prompt with Memory/CPU bars, left sidebar with agent status panel.

---

## 10. campaigns/new/page.js
**Path:** `src/app/campaigns/new/page.js` — Campaign Creator Wizard

> Full source: see `src/app/campaigns/new/page.js` (337 lines)
>
> Features: 3-step wizard (Brief → Orchestration → Preview), left step navigation with progress bar, JetBrains Mono briefing textarea, orchestration blueprint with circular node flow (Strategy → Content → Analysis), variant review cards with match scores and edit/approve buttons, campaign launch with success state.
