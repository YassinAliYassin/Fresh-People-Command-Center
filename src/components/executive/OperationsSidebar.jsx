import React from 'react';
import {
  LayoutDashboard,
  CalendarDays,
  ListChecks,
  Link2,
  Users,
  UserCircle,
  Wallet,
  Settings,
  BarChart3,
  Bell,
  Zap,
} from 'lucide-react';

const ICONS = {
  dashboard: LayoutDashboard,
  calendar: CalendarDays,
  events: ListChecks,
  link: Link2,
  staff: Users,
  clients: UserCircle,
  payroll: Wallet,
  settings: Settings,
  analytics: BarChart3,
  notifications: Bell,
  lightning: Zap,
};

const OperationsSidebar = ({ isOpen = true, onClose }) => {
  const menuSections = [
    {
      title: 'Operations',
      items: [
        { icon: 'dashboard', label: 'Dashboard', path: '/', badge: null },
        { icon: 'calendar', label: 'Calendar', path: '/calendar', badge: null },
        { icon: 'events', label: 'Events', path: '/events', badge: 5 },
        { icon: 'link', label: 'Unified View', path: '/unified-calendar', badge: null }
      ]
    },
    {
      title: 'Management',
      items: [
        { icon: 'staff', label: 'Staff', path: '/staff', badge: null },
        { icon: 'clients', label: 'Clients', path: '/clients', badge: null },
        { icon: 'payroll', label: 'Payroll', path: '/payroll', badge: null }
      ]
    },
    {
      title: 'System',
      items: [
        { icon: 'settings', label: 'Settings', path: '/settings', badge: null },
        { icon: 'analytics', label: 'Analytics', path: '/analytics', badge: null },
        { icon: 'notifications', label: 'Notifications', path: '/notifications', badge: 3 }
      ]
    }
  ];

  const handleNavigation = (path) => {
    window.location.href = path;
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 199,
            display: isOpen ? 'block' : 'none'
          }}
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`operations-sidebar ${isOpen ? '' : 'collapsed'}`}>
        {/* Close button (mobile) */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: '1.5rem',
            cursor: 'pointer',
            display: 'none'
          }}
          className="mobile-close-btn"
        >
          ×
        </button>

        {menuSections.map((section, sectionIndex) => (
          <div key={sectionIndex} className="sidebar-section">
            <div className="sidebar-section-title">{section.title}</div>
            {section.items.map((item, itemIndex) => {
              const Icon = ICONS[item.icon] || LayoutDashboard;
              return (
                <div
                  key={itemIndex}
                  className={`sidebar-item ${
                    window.location.pathname === item.path ? 'active' : ''
                  }`}
                  onClick={() => handleNavigation(item.path)}
                >
                  <span className="sidebar-item-icon">
                    <Icon size={16} />
                  </span>
                  <span className="sidebar-item-label">{item.label}</span>
                  {item.badge && (
                    <span className="sidebar-item-badge">{item.badge}</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {/* System Status Indicator */}
        <div style={{
          marginTop: 'auto',
          padding: '1rem',
          borderTop: '1px solid var(--border)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.813rem',
            color: 'var(--text-muted)'
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'var(--priority-low)',
              boxShadow: 'var(--glow-success)',
              animation: 'pulse-glow 2s infinite'
            }} />
            <span>System Operational</span>
          </div>
        </div>
      </aside>
    </>
  );
};

export default OperationsSidebar;
