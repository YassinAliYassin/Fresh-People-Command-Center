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
  agentName: 'Fresh People Command',
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
  agentName = 'Fresh People Command',
  agentIcon = '🎯',
  onSearch,
  notifications = [],
  onNotificationClick
}) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);