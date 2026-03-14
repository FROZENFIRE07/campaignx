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
      {isOpen && (
        <div
          className="modal-overlay"
          style={{ zIndex: 99, background: 'rgba(0,0,0,0.5)' }}
          onClick={onClose}
        />
      )}
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
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-nav-item ${isActive(item.href) ? 'active' : ''}`}
              onClick={onClose}
            >
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
