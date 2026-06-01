import React, { useState, useEffect, useCallback, useRef } from 'react';
import { KPIMetric, LiveKPIs } from '../../types/event-system';

/**
 * Enhanced Command Header Component
 * Premium executive header with live KPIs, accessibility, and smooth transitions
 * Supports agent identity preservation and consistent navigation patterns
 */

export interface CommandHeaderProps {
  kpis: LiveKPIs;
  onToggleSidebar: () => void;
  onToggleTheme: () => void;
  isDarkMode: boolean;
  systemStatus: 'operational' | 'degraded' | 'outage';
  currentTime: Date;
  agentTheme?: AgentTheme;
  agentName?: string;
  agentIcon?: string;
  onSearch?: (query: string) => void;
  notifications?: NotificationItem[];
  onNotificationClick?: (notification: NotificationItem) => void;
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

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  type: 'info' | 'warning' | 'error' | 'success';
}

interface StatusConfig {
  bg: string;
  color: string;
  text: string;
  ariaLabel: string;
}

const defaultAgentTheme: AgentTheme = {
  primaryColor: '#BF8F3B',
  secondaryColor: '#FBBF24',
  accentColor: '#F59E0B',
  glowColor: 'rgba(191, 143, 59, 0.4)',
  gradientStart: '#BF8F3B',
  gradientEnd: '#FBBF24',
  agentName: 'Operations Command',
  agentIcon: '🎯'
};

const CommandHeader: React.FC<CommandHeaderProps> = ({
  kpis,
  onToggleSidebar,
  onToggleTheme,
  isDarkMode,
  systemStatus,
  currentTime,
  agentTheme = defaultAgentTheme,
  agentName = 'Operations Command',
  agentIcon = '🎯',
  onSearch,
  notifications = [],
  onNotificationClick
}) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  const statusConfig: Record<'operational' | 'degraded' | 'outage', StatusConfig> = {
    operational: {
      bg: 'rgba(16, 185, 129, 0.1)',
      color: '#10B981',
      text: 'Operational',
      ariaLabel: 'System status: Operational'
    },
    degraded: {
      bg: 'rgba(245, 158, 11, 0.1)',
      color: '#F59E0B',
      text: 'Degraded',
      ariaLabel: 'System status: Degraded performance'
    },
    outage: {
      bg: 'rgba(239, 68, 68, 0.1)',
      color: '#EF4444',
      text: 'Outage',
      ariaLabel: 'System status: Outage detected'
    }
  };

  const status = statusConfig[systemStatus];

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle scroll for header shadow
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [searchOpen]);

  // Close notifications panel on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
    };

    if (notificationsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [notificationsOpen]);

  // Handle search submission
  const handleSearchSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch && searchQuery.trim()) {
      onSearch(searchQuery.trim());
      setSearchQuery('');
      setSearchOpen(false);
    }
  }, [searchQuery, onSearch]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K for search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      }
      
      // Escape to close search or notifications
      if (e.key === 'Escape') {
        if (searchOpen) setSearchOpen(false);
        if (notificationsOpen) setNotificationsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [searchOpen, notificationsOpen]);

  const unreadNotifications = notifications.filter(n => !n.read).length;

  return (
    <header
      className={`command-header ${scrolled ? 'scrolled' : ''}`}
      role="banner"
      style={{
        '--header-primary': agentTheme.primaryColor,
        '--header-glow': agentTheme.glowColor
      } as React.CSSProperties}
    >
      <div className="command-header-inner">
        {/* Left Section - Logo & Navigation */}
        <div className="header-left">
          <button
            className="header-menu-btn"
            onClick={onToggleSidebar}
            aria-label="Toggle navigation sidebar"
            title="Toggle sidebar"
          >
            <span aria-hidden="true">☰</span>
          </button>
          
          <div className="header-logo" role="link" tabIndex={0} aria-label={`${agentName} - Go to dashboard`}>
            <div
              className="logo-icon"
              style={{
                background: `linear-gradient(135deg, ${agentTheme.gradientStart}, ${agentTheme.gradientEnd})`,
                boxShadow: `0 0 20px ${agentTheme.glowColor}`
              }}
            >
              <span>{agentIcon}</span>
            </div>
            <div className="logo-text">
              <h1>FRESH PEOPLE</h1>
              <span className="logo-subtitle">{agentName}</span>
            </div>
          </div>
        </div>

        {/* Center Section - Live KPIs */}
        <div className="header-kpis" role="region" aria-label="Live KPI metrics">
          <KPICard
            metric={kpis.todaysEvents}
            compact
            agentTheme={agentTheme}
          />
          <KPICard
            metric={kpis.activeStaff}
            compact
            agentTheme={agentTheme}
          />
          <KPICard
            metric={kpis.pendingPayments}
            compact
            agentTheme={agentTheme}
          />
          <KPICard
            metric={kpis.monthlyRevenue}
            compact
            agentTheme={agentTheme}
          />
        </div>

        {/* Right Section - Actions & Status */}
        <div className="header-right">
          {/* System Status */}
          <div
            className="system-status"
            style={{
              background: status.bg,
              borderColor: status.color + '30'
            }}
            role="status"
            aria-label={status.ariaLabel}
          >
            <span
              className="status-dot"
              style={{
                background: status.color,
                boxShadow: `0 0 10px ${status.color}40`
              }}
              aria-hidden="true"
            />
            <span className="status-text" style={{ color: status.color }}>
              {status.text}
            </span>
          </div>

          {/* Search Toggle */}
          <button
            className="header-action-btn"
            onClick={() => setSearchOpen(!searchOpen)}
            aria-label="Toggle search (Ctrl+K)"
            title="Search (Ctrl+K)"
            aria-expanded={searchOpen}
          >
            <span aria-hidden="true">🔍</span>
          </button>

          {/* Notifications Toggle */}
          <div className="notifications-container" ref={notificationsRef}>
            <button
              className="header-action-btn notification-btn"
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              aria-label={`Notifications${unreadNotifications > 0 ? ` (${unreadNotifications} unread)` : ''}`}
              aria-expanded={notificationsOpen}
            >
              <span aria-hidden="true">🔔</span>
              {unreadNotifications > 0 && (
                <span className="notification-badge" aria-label={`${unreadNotifications} unread notifications`}>
                  {unreadNotifications}
                </span>
              )}
            </button>

            {/* Notifications Panel */}
            {notificationsOpen && (
              <div className="notifications-panel" role="menu" aria-label="Notifications">
                <div className="notifications-header">
                  <h3>Notifications</h3>
                  {unreadNotifications > 0 && (
                    <span className="notifications-count">{unreadNotifications} unread</span>
                  )}
                </div>
                <div className="notifications-list">
                  {notifications.length === 0 ? (
                    <div className="notifications-empty">No notifications</div>
                  ) : (
                    notifications.map(notification => (
                      <button
                        key={notification.id}
                        className={`notification-item ${notification.read ? 'read' : 'unread'}`}
                        onClick={() => onNotificationClick?.(notification)}
                        role="menuitem"
                        aria-label={notification.title}
                      >
                        <div className={`notification-icon ${notification.type}`} aria-hidden="true">
                          {notification.type === 'info' && 'ℹ️'}
                          {notification.type === 'warning' && '⚠️'}
                          {notification.type === 'error' && '❌'}
                          {notification.type === 'success' && '✅'}
                        </div>
                        <div className="notification-content">
                          <span className="notification-title">{notification.title}</span>
                          <span className="notification-message">{notification.message}</span>
                          <span className="notification-time">
                            {new Date(notification.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Theme Toggle */}
          <button
            className={`theme-toggle ${!isDarkMode ? 'active' : ''}`}
            onClick={onToggleTheme}
            aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
            title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
          >
            <div className="theme-toggle-thumb">
              {isDarkMode ? '🌙' : '☀️'}
            </div>
          </button>

          {/* Current Time */}
          <div className="header-time" role="timer" aria-label="Current time">
            <span className="time-text">
              {currentTime.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              })}
            </span>
            <span className="date-text">
              {currentTime.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Expandable Search Bar */}
      <div className={`header-search-container ${searchOpen ? 'open' : ''}`} aria-hidden={!searchOpen}>
        <form className="header-search-bar" onSubmit={handleSearchSubmit} role="search">
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search events, staff, clients, venues..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
            aria-label="Search"
          />
          <div className="search-shortcuts">
            <kbd>⌘K</kbd> <span>for quick actions</span>
          </div>
          <button type="submit" className="search-submit" aria-label="Submit search">
            <span aria-hidden="true">→</span>
          </button>
        </form>
      </div>
    </header>
  );
};

// Compact KPI Card for Header
interface KPICardProps {
  metric: KPIMetric;
  compact?: boolean;
  agentTheme?: AgentTheme;
}

const KPICard: React.FC<KPICardProps> = ({ metric, compact, agentTheme }) => {
  const trendIcon = metric.trend === 'up' ? '↑' : metric.trend === 'down' ? '↓' : '→';
  const trendColor = metric.trend === 'up' ? '#10B981' : metric.trend === 'down' ? '#EF4444' : '#6B7280';

  if (compact) {
    return (
      <div
        className="kpi-compact"
        role="button"
        tabIndex={0}
        aria-label={`${metric.label}: ${metric.value}`}
        style={{
          '--kpi-accent': agentTheme?.accentColor || '#BF8F3B'
        } as React.CSSProperties}
      >
        <div className="kpi-compact-icon">{metric.icon}</div>
        <div className="kpi-compact-content">
          <span className="kpi-compact-value">{metric.value}</span>
          <span className="kpi-compact-label">{metric.label}</span>
        </div>
        <div className="kpi-compact-trend" style={{ color: trendColor }}>
          {trendIcon} {Math.abs(metric.change)}%
        </div>
      </div>
    );
  }

  return (
    <div className="kpi-card">
      <div className="kpi-header">
        <span className="kpi-icon">{metric.icon}</span>
        <span className="kpi-label">{metric.label}</span>
      </div>
      <div className="kpi-value">{metric.value}</div>
      <div className="kpi-trend" style={{ color: trendColor }}>
        <span>{trendIcon}</span>
        <span>{Math.abs(metric.change)}% from last period</span>
      </div>
    </div>
  );
};

export default CommandHeader;
