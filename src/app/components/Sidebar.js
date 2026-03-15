'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/', icon: 'dashboard' },
  { label: 'Create', href: '/campaigns/new', icon: 'add_circle' },
  { label: 'Campaigns', href: '/campaigns', icon: 'campaign' },
  { label: 'Analytics', href: '/analytics', icon: 'bar_chart' },
  { label: 'Agent Logs', href: '/ai-studio', icon: 'terminal' },
  { label: 'Cohort', href: '/cohort', icon: 'group' },
  { label: 'Settings', href: '/settings', icon: 'settings' },
];

export default function Sidebar({ expanded, onMouseEnter, onMouseLeave }) {
  const pathname = usePathname();
  const isActive = (href) => pathname === href;

  return (
    <motion.aside
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      animate={{ width: expanded ? 260 : 70 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{
        position: 'fixed',
        top: 16,
        left: 16,
        bottom: 16,
        height: 'calc(100vh - 32px)',
        borderRadius: 20,
        background: 'rgba(14, 14, 14, 0.82)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 100,
        overflow: 'hidden',
      }}
    >
      {/* ── Brand Header — always fully visible, never collapses ── */}
      <div
        style={{
          padding: '0 16px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          height: 64,
          flexShrink: 0,
          overflow: 'hidden',
          whiteSpace: 'nowrap',
        }}
      >
        <div className="sidebar-logo-icon" style={{ flexShrink: 0 }}>
          <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: 22 }}>
            auto_awesome
          </span>
        </div>
        {/* Brand text always rendered — slides into view as sidebar widens */}
        <div style={{ overflow: 'hidden', minWidth: 0 }}>
          <span className="sidebar-logo">CampaignX</span>
          <div className="sidebar-subtitle">AI Automation</div>
        </div>
      </div>

      {/* ── Nav ── */}
      <nav className="sidebar-nav" style={{ padding: expanded ? '12px' : '12px 8px' }}>
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`sidebar-nav-item ${isActive(item.href) ? 'active' : ''}`}
            style={{
              position: 'relative',
              justifyContent: expanded ? 'flex-start' : 'center',
              padding: expanded ? '11px 16px' : '11px 0',
              transition: 'justify-content 0s, padding 0.25s ease',
            }}
          >
            {isActive(item.href) && (
              <motion.div
                layoutId="sidebar-active-indicator"
                className="sidebar-active-bg"
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              />
            )}
            <span
              className="material-symbols-outlined nav-icon"
              style={{ position: 'relative', zIndex: 1, fontSize: 20, flexShrink: 0 }}
            >
              {item.icon}
            </span>
            <AnimatePresence initial={false}>
              {expanded && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.18 }}
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.label}
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
        ))}
      </nav>

      {/* ── Footer / User ── */}
      <div
        className="sidebar-footer"
        style={{ padding: expanded ? '16px' : '16px 8px', flexShrink: 0 }}
      >
        <div
          className="sidebar-user"
          style={{
            justifyContent: expanded ? 'flex-start' : 'center',
            padding: expanded ? '10px 12px' : '10px 0',
          }}
        >
          <div className="sidebar-avatar" style={{ flexShrink: 0 }}>SB</div>
          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.18 }}
                style={{
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  flex: 1,
                }}
              >
                <div className="sidebar-user-info">
                  <div className="sidebar-user-name">SuperBFSI</div>
                  <div className="sidebar-user-role">Pro Account</div>
                </div>
                <span
                  className="material-symbols-outlined"
                  style={{ color: 'var(--text-muted)', fontSize: 20, cursor: 'pointer', flexShrink: 0 }}
                >
                  logout
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.aside>
  );
}
