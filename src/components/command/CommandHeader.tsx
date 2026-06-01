import React, { useState, useEffect } from 'react';
import { KPIMetric, LiveKPIs } from '../../types/event-system';

/**
 * Command Header Component
 * Premium executive header with live KPIs and system status
 */

interface CommandHeaderProps {
  kpis: LiveKPIs;
  onToggleSidebar: () => void;
  onToggleTheme: () => void;
  isDarkMode: boolean;
  systemStatus: 'operational' | 'degraded' | 'outage';
  currentTime: Date;
}

const CommandHeader: React.FC<CommandHeaderProps> = ({
  kpis,
  onToggleSidebar,
  onToggleTheme,
  isDarkMode,
  systemStatus,
  currentTime
}) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const statusColors = {
    operational: { bg: 'rgba(16, 185, 129, 0.1)', color: '#10B981', text: 'Operational' },
    degraded: { bg: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B', text: 'Degraded' },
    outage: { bg: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', text: 'Outage' }
  };

  const status = statusColors[systemStatus];

  return (
    <header className="command-header">
      <div className="command-header-inner">
        {/* Left Section - Logo & Navigation */}
        <div className="header-left">
          <button className="header-menu-btn" onClick={onToggleSidebar}>
            <span>☰</span>
          </button>
          
          <div className="header-logo">
            <div className="logo-icon">
              <span>FPCC</span>
            </div>
            <div className="logo-text">
              <h1>FRESH PEOPLE</h1>
              <span className="logo-subtitle">Operations Command Center</span>
            </div>
          </div>
        </div>

        {/* Center Section - Live KPIs */}
        <div className="header-kpis">
          <KPICard
            metric={kpis.todaysEvents}
            compact
          />
          <KPICard
            metric={kpis.activeStaff}
            compact
          />
          <KPICard
            metric={kpis.pendingPayments}
            compact
          />
          <KPICard
            metric={kpis.monthlyRevenue}
            compact
          />
        </div>

        {/* Right Section - Actions & Status */}
        <div className="header-right">
          {/* System Status */}
          <div className="system-status" style={{
            background: status.bg,
            borderColor: status.color + '30'
          }}>
            <span className="status-dot" style={{
              background: status.color,
              boxShadow: `0 0 10px ${status.color}40`
            }} />
            <span className="status-text" style={{ color: status.color }}>
              {status.text}
            </span>
          </div>

          {/* Search Toggle */}
          <button
            className="header-action-btn"
            onClick={() => setSearchOpen(!searchOpen)}
            title="Search"
          >
            <span>🔍</span>
          </button>

          {/* Theme Toggle */}
          <button
            className={`theme-toggle ${!isDarkMode ? 'active' : ''}`}
            onClick={onToggleTheme}
            title="Toggle Theme"
          >
            <div className="theme-toggle-thumb">
              {isDarkMode ? '🌙' : '☀️'}
            </div>
          </button>

          {/* Current Time */}
          <div className="header-time">
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
      {searchOpen && (
        <div className="header-search-bar">
          <input
            type="text"
            placeholder="Search events, staff, clients, venues..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
            autoFocus
          />
          <div className="search-shortcuts">
            <kbd>⌘K</kbd> <span>for quick actions</span>
          </div>
        </div>
      )}
    </header>
  );
};

// Compact KPI Card for Header
interface KPICardProps {
  metric: KPIMetric;
  compact?: boolean;
}

const KPICard: React.FC<KPICardProps> = ({ metric, compact }) => {
  const trendIcon = metric.trend === 'up' ? '↑' : metric.trend === 'down' ? '↓' : '→';
  const trendColor = metric.trend === 'up' ? '#10B981' : metric.trend === 'down' ? '#EF4444' : '#6B7280';

  if (compact) {
    return (
      <div className="kpi-compact">
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
