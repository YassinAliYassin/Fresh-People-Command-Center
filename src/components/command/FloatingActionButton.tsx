import React, { useState } from 'react';
import { ModalType } from '../../types/event-system';

/**
 * Floating Action Button Component
 * Premium FAB with expandable action menu and modal system
 */

interface FloatingActionButtonProps {
  onAction: (action: string, data?: any) => void;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

interface ActionItem {
  id: string;
  label: string;
  icon: string;
  color: string;
  modalType?: ModalType;
  action?: () => void;
}

const actionItems: ActionItem[] = [
  {
    id: 'new-event',
    label: 'New Event',
    icon: '📅',
    color: '#BF8F3B',
    modalType: 'new_event'
  },
  {
    id: 'new-staff',
    label: 'Add Staff',
    icon: '👤',
    color: '#3B82F6',
    modalType: 'new_staff'
  },
  {
    id: 'new-client',
    label: 'New Client',
    icon: '🏢',
    color: '#10B981',
    modalType: 'new_client'
  },
  {
    id: 'dispatch',
    label: 'Dispatch Staff',
    icon: '🚀',
    color: '#8B5CF6',
    action: () => console.log('Dispatch staff')
  },
  {
    id: 'sync',
    label: 'Sync Calendars',
    icon: '🔄',
    color: '#F59E0B',
    action: () => console.log('Sync calendars')
  },
  {
    id: 'report',
    label: 'Generate Report',
    icon: '📊',
    color: '#EF4444',
    action: () => console.log('Generate report')
  }
];

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onAction,
  position = 'bottom-right'
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleActionClick = (item: ActionItem) => {
    if (item.modalType) {
      onAction('open_modal', { type: item.modalType });
    } else if (item.action) {
      item.action();
    }
    setIsExpanded(false);
  };

  const positionStyles = {
    'bottom-right': { bottom: '2rem', right: '2rem' },
    'bottom-left': { bottom: '2rem', left: '2rem' },
    'top-right': { top: '2rem', right: '2rem' },
    'top-left': { top: '2rem', left: '2rem' }
  };

  return (
    <div
      className="floating-action-button"
      style={positionStyles[position]}
    >
      {/* Action Items */}
      <div className={`fab-actions ${isExpanded ? 'expanded' : ''}`}>
        {actionItems.map((item, index) => (
          <div
            key={item.id}
            className="fab-action-item"
            style={{
              transitionDelay: isExpanded ? `${index * 50}ms` : '0ms',
              '--action-color': item.color
            } as React.CSSProperties}
            onClick={() => handleActionClick(item)}
          >
            <div className="fab-action-icon" style={{ background: item.color }}>
              <span>{item.icon}</span>
            </div>
            <div className="fab-action-label">{item.label}</div>
          </div>
        ))}
      </div>

      {/* Main FAB Button */}
      <button
        className={`fab-main ${isExpanded ? 'expanded' : ''} ${isHovered ? 'hovered' : ''}`}
        onClick={() => setIsExpanded(!isExpanded)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="fab-main-icon">
          {isExpanded ? '✕' : '＋'}
        </div>
        
        {/* Pulse Animation */}
        <div className="fab-pulse" />
        
        {/* Glow Effect */}
        <div className="fab-glow" />
      </button>

      {/* Backdrop */}
      {isExpanded && (
        <div
          className="fab-backdrop"
          onClick={() => setIsExpanded(false)}
        />
      )}
    </div>
  );
};

export default FloatingActionButton;
