import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, CalendarDays, ListChecks, Link2, Users, UserCircle, Wallet, BarChart3, FileBarChart2, Bell, Settings, Receipt, FileText, BookOpen, Briefcase, Clock, Plus, Save, Trash2, Pencil } from 'lucide-react';

/**
 * Enhanced Operations Sidebar
 * Luxury navigation with glassmorphism, accessibility, and smooth transitions
 * Supports agent identity preservation and consistent navigation patterns
 */

export interface NavItem {
  icon: string;
  label: string;
  path: string;
  badge?: number;
  badgeVariant?: 'default' | 'alert' | 'success' | 'info';
  subItems?: NavItem[];
  disabled?: boolean;
  ariaLabel?: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
  icon?: string;
  collapsible?: boolean;
}

export interface AgentTheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  glowColor: string;
  gradientStart: string;
  gradientEnd: string;
  agentName: string;
  agentIcon: string;
}

interface OperationsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  agentTheme?: AgentTheme;
  onNavigate?: (path: string) => void;
}

// Default navigation sections - can be customized per agent
const defaultNavigationSections: NavSection[] = [
  {
    title: 'OPERATIONS',
    icon: 'lightning',
    collapsible: false,
    items: [
      { icon: 'dashboard', label: 'Dashboard', path: '/', ariaLabel: 'Navigate to Dashboard' },
      { icon: 'calendar', label: 'Calendar', path: '/calendar', ariaLabel: 'Navigate to Calendar' },
      { icon: 'events', label: 'Events', path: '/events', badge: 5, ariaLabel: 'Navigate to Events' },
      { icon: 'link', label: 'Unified View', path: '/unified-calendar', ariaLabel: 'Navigate to Unified Calendar View' }
    ]
  },
  {
    title: 'MANAGEMENT',
    icon: 'staff',
    items: [
      { icon: 'staff', label: 'Staff', path: '/staff', ariaLabel: 'Navigate to Staff Management' },
      { icon: 'clients', label: 'Clients', path: '/clients', ariaLabel: 'Navigate to Client Management' },
      { icon: 'payroll', label: 'Payroll', path: '/payroll', badge: 3, badgeVariant: 'alert', ariaLabel: 'Navigate to Payroll' }
    ]
  },
  {
    title: 'INTELLIGENCE',
    icon: 'analytics',
    items: [
      { icon: 'analytics', label: 'Analytics', path: '/analytics', ariaLabel: 'Navigate to Analytics' },
      { icon: 'reports', label: 'Reports', path: '/reports', ariaLabel: 'Navigate to Reports' },
      { icon: 'alerts', label: 'Alerts', path: '/alerts', badge: 2, badgeVariant: 'alert', ariaLabel: 'Navigate to Alerts' }
    ]
  },
  {
    title: 'SYSTEM',
    icon: 'settings',
    items: [
      { icon: 'settings', label: 'Settings', path: '/settings', ariaLabel: 'Navigate to Settings' },
      { icon: 'integrations', label: 'Integrations', path: '/integrations', ariaLabel: 'Navigate to Integrations' },
      { icon: 'activity', label: 'Activity Log', path: '/activity', ariaLabel: 'Navigate to Activity Log' }
    ]
  }
];

// Default agent theme (Operations)
const defaultAgentTheme: AgentTheme = {
  primaryColor: '#BF8F3B',
  secondaryColor: '#FBBF24',
  accentColor: '#F59E0B',
  glowColor: 'rgba(191, 143, 59, 0.4)',
  gradientStart: '#BF8F3B',
  gradientEnd: '#FBBF24',
  agentName: 'Operations Command',
  agentIcon: 'target'
};

// Map icon keys to Lucide components
const ICON_MAP: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  dashboard: LayoutDashboard,
  calendar: CalendarDays,
  events: ListChecks,
  link: Link2,
  staff: Users,
  clients: UserCircle,
  payroll: Wallet,
  analytics: BarChart3,
  reports: FileBarChart2,
  alerts: Bell,
  settings: Settings,
  integrations: Link2,
  activity: BookOpen,
  lightning: CalendarDays,
  target: Settings,
  quotes: FileText,
  invoices: Receipt,
  timesheets: Clock,
  jobs: Briefcase,
  statements: BookOpen,
  roster: CalendarDays,
  add: Plus,
  save: Save,
  delete: Trash2,
  edit: Pencil,
};

const OperationsSidebar: React.FC<OperationsSidebarProps> = ({
  isOpen,
  onClose,
  collapsed = false,
  onToggleCollapse,
  agentTheme = defaultAgentTheme,
  onNavigate
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const sidebarRef = useRef<HTMLElement>(null);
  const [expandedSections, setExpandedSections] = useState<string[]>(['OPERATIONS']);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close sidebar on mobile when route changes
  useEffect(() => {
    if (isMobile && isOpen) {
      onClose();
    }
  }, [location.pathname, isMobile, isOpen, onClose]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen && e.key !== 'Escape') return;

      switch (e.key) {
        case 'Escape':
          if (isOpen) {
            onClose();
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex(prev => Math.min(prev + 1, getAllNavItems().length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          if (focusedIndex >= 0) {
            const items = getAllNavItems();
            if (items[focusedIndex]) {
              handleNavigation(items[focusedIndex].path);
            }
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, focusedIndex, isOpen, onClose]);

  // Get all navigable items for keyboard navigation
  const getAllNavItems = useCallback(() => {
    const items: NavItem[] = [];
    defaultNavigationSections.forEach(section => {
      items.push(...section.items);
    });
    return items;
  }, []);

  const toggleSection = (title: string) => {
    setExpandedSections(prev =>
      prev.includes(title)
        ? prev.filter(s => s !== title)
        : [...prev, title]
    );
  };

  const handleNavigation = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      navigate(path);
    }
    
    if (isMobile) {
      onClose();
    }
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const isSectionActive = (section: NavSection) => {
    return section.items.some(item => isActive(item.path));
  };

  // Focus management for keyboard navigation
  useEffect(() => {
    if (focusedIndex >= 0 && sidebarRef.current) {
      const focusableElements = sidebarRef.current.querySelectorAll('[tabindex="0"]');
      if (focusableElements[focusedIndex]) {
        (focusableElements[focusedIndex] as HTMLElement).focus();
      }
    }
  }, [focusedIndex]);

  return (
    <>
      {/* Mobile Overlay with backdrop blur */}
      {isOpen && (
        <div
          className="sidebar-overlay"
          onClick={onClose}
          role="presentation"
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        className={`operations-sidebar ${isOpen ? 'open' : 'closed'} ${collapsed ? 'collapsed' : ''}`}
        aria-label={`${agentTheme.agentName} Navigation`}
        aria-hidden={!isOpen}
        role="navigation"
      >
        {/* Sidebar Header with Agent Identity */}
        <div className="sidebar-header">
          <div className="sidebar-logo" style={{
            background: `linear-gradient(135deg, ${agentTheme.gradientStart}, ${agentTheme.gradientEnd})`
          }}>
            <div className="sidebar-logo-icon">
              {(() => {
                const Icon = ICON_MAP[agentTheme.agentIcon] || Settings;
                return <Icon size={18} color="#0d1117" />;
              })()}
            </div>
            {!collapsed && (
              <div className="sidebar-logo-text">
                <span className="logo-main">FPCC</span>
                <span className="logo-sub">{agentTheme.agentName}</span>
              </div>
            )}
          </div>
          
          {!collapsed && onToggleCollapse && (
            <button
              className="sidebar-collapse-btn"
              onClick={onToggleCollapse}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              ‹
            </button>
          )}
        </div>

        {/* Navigation Sections */}
        <nav className="sidebar-nav" aria-label="Main navigation">
          {defaultNavigationSections.map((section, sectionIndex) => (
            <div key={section.title} className="sidebar-section">
              {(!collapsed || isMobile) && (
                <button
                  className={`sidebar-section-title ${isSectionActive(section) ? 'active' : ''}`}
                  onClick={() => toggleSection(section.title)}
                  aria-expanded={expandedSections.includes(section.title)}
                  aria-controls={`section-${section.title.replace(/\s+/g, '-').toLowerCase()}`}
                >
                  <span className="section-icon">
                    {(() => {
                      const Icon = ICON_MAP[section.icon as string] || CalendarDays;
                      return <Icon size={14} color={isSectionActive(section) ? '#58a6ff' : '#8b949e'} />;
                    })()}
                  </span>
                  <span className="section-title">{section.title}</span>
                  <span className={`section-chevron ${expandedSections.includes(section.title) ? 'expanded' : ''}`}>
                    ›
                  </span>
                </button>
              )}
              
              <div
                id={`section-${section.title.replace(/\s+/g, '-').toLowerCase()}`}
                className={`sidebar-section-items ${expandedSections.includes(section.title) || collapsed ? 'expanded' : ''}`}
                role="region"
                aria-label={`${section.title} navigation items`}
              >
                {section.items.map((item, itemIndex) => {
                  const globalIndex = getAllNavItems().findIndex(navItem => navItem.path === item.path);
                  const active = isActive(item.path);
                  
                  return (
                    <div
                      key={item.path}
                      className={`sidebar-item ${active ? 'active' : ''} ${hoveredItem === item.path ? 'hovered' : ''} ${item.disabled ? 'disabled' : ''}`}
                      onClick={() => !item.disabled && handleNavigation(item.path)}
                      onMouseEnter={() => setHoveredItem(item.path)}
                      onMouseLeave={() => setHoveredItem(null)}
                      onFocus={() => setFocusedIndex(globalIndex)}
                      tabIndex={0}
                      role="link"
                      aria-label={item.ariaLabel || `Navigate to ${item.label}`}
                      aria-current={active ? 'page' : undefined}
                      title={collapsed ? item.label : undefined}
                      style={{
                        '--item-primary': agentTheme.primaryColor,
                        '--item-glow': agentTheme.glowColor
                      } as React.CSSProperties}
                    >
                      <span className="sidebar-item-icon">
                        {(() => {
                          const Icon = ICON_MAP[item.icon] || CalendarDays;
                          return <Icon size={16} color={active ? '#58a6ff' : '#8b949e'} />;
                        })()}
                      </span>
                      
                      {!collapsed && (
                        <>
                          <span className="sidebar-item-label">{item.label}</span>
                          
                          {item.badge && (
                            <span
                              className={`sidebar-item-badge badge-${item.badgeVariant || 'default'}`}
                              aria-label={`${item.badge} notifications`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                      
                      {/* Active Indicator with animation */}
                      {active && (
                        <div className="active-indicator" aria-hidden="true">
                          <div className="active-indicator-glow" style={{
                            background: agentTheme.glowColor
                          }} />
                        </div>
                      )}
                      
                      {/* Hover Glow Effect */}
                      {hoveredItem === item.path && !active && (
                        <div className="hover-glow" aria-hidden="true" style={{
                          background: `radial-gradient(circle, ${agentTheme.glowColor} 0%, transparent 70%)`
                        }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar Footer with System Status & User Info */}
        <div className="sidebar-footer">
          {/* System Status Indicator */}
          <div className="system-status-mini" role="status" aria-label="System status">
            <span className="status-dot-mini operational animate-pulse" aria-hidden="true" />
            {!collapsed && <span className="status-text-mini">System Operational</span>}
          </div>
          
          {/* Version Number */}
          {!collapsed && (
            <div className="sidebar-version" style={{ fontSize: '10px', color: 'rgba(156, 163, 175, 0.6)', textAlign: 'center', marginTop: '4px' }}>
              FPCC v2.1.0
            </div>
          )}
          
          {/* User Info */}
          {!collapsed && (
            <div className="sidebar-user" role="button" tabIndex={0} aria-label="User profile">
              <div className="user-avatar" style={{
                background: `linear-gradient(135deg, ${agentTheme.gradientStart}, ${agentTheme.gradientEnd})`
              }}>
                A
              </div>
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
