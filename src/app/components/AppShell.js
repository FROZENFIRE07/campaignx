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
        {/* Background gradient blobs */}
        <div className="bg-blobs">
          <div className="bg-blob bg-blob-primary" />
          <div className="bg-blob bg-blob-success" />
        </div>

        <header className="main-header">
          <div className="main-header-left">
            <button
              className="mobile-sidebar-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle navigation"
            >
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
        <div className="page-container">
          {children}
        </div>
      </div>
    </div>
  );
}
