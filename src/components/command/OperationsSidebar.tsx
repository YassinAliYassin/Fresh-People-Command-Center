import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Enhanced Operations Sidebar
 * Luxury navigation with glassmorphism and live indicators
 */

interface NavItem {
  icon: string;
  label: string;
  path: string;
  badge?: number;
  badgeVariant?: 'default' | 'alert' | 'success';
  subItems?: NavItem[];
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navigationSections: NavSection[] = [
  {
    title: 'OPERATIONS',
    items: [
      { icon: '📊', label: 'Dashboard', path: '/' },
      { icon: '📅', label: 'Calendar', path: '/calendar' },
      { icon: '📋', label: 'Events', path: '/events', badge: 5 },
      { icon: '🔗', label: 'Unified View', path: '/unified-calendar' }
    ]
  },
  {
    title: 'MANAGEMENT',
    items: [
      { icon: '👥', label: 'Staff', path: '/staff' },
      { icon: '👤', label: 'Clients', path: '/clients' },
      { icon: '💰', label: 'Payroll', path: '/payroll', badge: 3, badgeVariant: 'alert' }
    ]
  },
  {
    title: 'INTELLIGENCE',
    items: [
      { icon: '📈', label: 'Analytics', path: '/analytics' },
      { icon: '📊', label: 'Reports', path: '/reports' },
      { icon: '🔔', label: 'Alerts', path: '/alerts', badge: 2, badgeVariant: 'alert' }
    ]
  },
  {
    title: 'SYSTEM',
    items: [
      { icon: '⚙️', label: 'Settings', path: '/settings' },
      { icon: '🔌', label: 'Integrations', path: '/integrations' },
      { icon: '📝', label: 'Activity Log', path: '/activity' }
    ]
  }
];

interface OperationsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const OperationsSidebar: React.FC<OperationsSidebarProps> = ({
  isOpen,
  onClose,
  collapsed = false,
  onToggleCollapse
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedSections, setExpandedSections] = useState<string[]>(['OPERATIONS']);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const toggleSection = (title: string) => {
    setExpandedSections(prev =>
      prev.includes(title)
        ? prev.filter(s => s !== title)
        : [...prev, title]
    );
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    if (window.innerWidth < 768) {
      onClose();
    }
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="sidebar-overlay"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`operations-sidebar ${isOpen ? 'open' : 'closed'} ${collapsed ? 'collapsed' : ''}`}>
        {/* Sidebar Header */}
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">F</div>
            {!collapsed && (
              <div className="sidebar-logo-text">
                <span className="logo-main">FPCC</span>
                <span className="logo-sub">Command</span>
              </div>
            )}
          </div>
          
          {!collapsed && onToggleCollapse && (
            <button className="sidebar-collapse-btn" onClick={onToggleCollapse}>
              ‹
            </button>
          )}
        </div>

        {/* Navigation Sections */}
        <nav className="sidebar-nav">
          {navigationSections.map((section) => (
            <div key={section.title} className="sidebar-section">
              {!collapsed && (
                <button
                  className="sidebar-section-title"
                  onClick={() => toggleSection(section.title)}
                >
                  <span>{section.title}</span>
                  <span className={`section-chevron ${expandedSections.includes(section.title) ? 'expanded' : ''}`}>
                    ›
                  </span>
                </button>
              )}
              
              <div className={`sidebar-section-items ${expandedSections.includes(section.title) || collapsed ? 'expanded' : ''}`}>
                {section.items.map((item) => (
                  <div
                    key={item.path}
                    className={`sidebar-item ${isActive(item.path) ? 'active' : ''} ${hoveredItem === item.path ? 'hovered' : ''}`}
                    onClick={() => handleNavigation(item.path)}
                    onMouseEnter={() => setHoveredItem(item.path)}
                    onMouseLeave={() => setHoveredItem(null)}
                    title={collapsed ? item.label : undefined}
                  >
                    <span className="sidebar-item-icon">{item.icon}</span>
                    
                    {!collapsed && (
                      <>
                        <span className="sidebar-item-label">{item.label}</span>
                        
                        {item.badge && (
                          <span className={`sidebar-item-badge badge-${item.badgeVariant || 'default'}`}>
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                    
                    {/* Active Indicator */}
                    {isActive(item.path) && (
                      <div className="active-indicator" />
                    )}
                    
                    {/* Hover Glow Effect */}
                    {hoveredItem === item.path && (
                      <div className="hover-glow" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          {/* System Status */}
          <div className="system-status-mini">
            <span className="status-dot-mini operational" />
            {!collapsed && <span className="status-text-mini">System Operational</span>}
          </div>
          
          {/* User Info */}
          {!collapsed && (
            <div className="sidebar-user">
              <div className="user-avatar">A</div>
              <div className="user-info">
                <span className="user-name">Admin</span>
                <span className="user-role">Commander</span>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default OperationsSidebar;
