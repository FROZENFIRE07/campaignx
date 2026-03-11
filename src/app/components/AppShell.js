'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/campaigns': 'Campaigns',
  '/campaigns/new': 'Create Campaign',
  '/cohort': 'Customer Cohort',
  '/ai-studio': 'AI Agent Studio',
  '/analytics': 'Analytics & Reports',
  '/settings': 'Settings',
};

export default function AppShell({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  const getPageTitle = () => {
    if (pathname.startsWith('/campaigns/') && pathname !== '/campaigns/new' && pathname !== '/campaigns') {
      return 'Campaign Detail';
    }
    return PAGE_TITLES[pathname] || 'CampaignX';
  };

  return (
    <div className="app-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <header className="main-header">
          <div className="main-header-left">
            <button
              className="mobile-sidebar-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle navigation"
            >
              ☰
            </button>
            <h1 className="page-title">{getPageTitle()}</h1>
          </div>
          <div className="main-header-right">
            <div className="live-indicator">
              <div className="live-dot" />
              <span>System Online</span>
            </div>
          </div>
        </header>
        <div className="page-container">
          {children}
        </div>
      </div>
    </div>
  );
}
