'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/', icon: '📊' },
  { label: 'Campaigns', href: '/campaigns', icon: '📨' },
  { label: 'Create Campaign', href: '/campaigns/new', icon: '✨' },
  { label: 'Customer Cohort', href: '/cohort', icon: '👥' },
  { label: 'AI Agent Studio', href: '/ai-studio', icon: '🤖' },
  { label: 'Analytics', href: '/analytics', icon: '📈' },
  { label: 'Settings', href: '/settings', icon: '⚙️' },
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
          <span className="sidebar-logo">CampaignX</span>
          <span className="sidebar-badge">AI</span>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-nav-label">Main</div>
          {NAV_ITEMS.slice(0, 4).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-nav-item ${isActive(item.href) ? 'active' : ''}`}
              onClick={onClose}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}

          <div className="sidebar-nav-label">Intelligence</div>
          {NAV_ITEMS.slice(4, 6).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-nav-item ${isActive(item.href) ? 'active' : ''}`}
              onClick={onClose}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}

          <div className="sidebar-nav-label">System</div>
          {NAV_ITEMS.slice(6).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-nav-item ${isActive(item.href) ? 'active' : ''}`}
              onClick={onClose}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">SB</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">SuperBFSI</div>
              <div className="sidebar-user-role">Campaign Manager</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
