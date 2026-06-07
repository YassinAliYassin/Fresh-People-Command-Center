import React, { useState } from 'react';
import {
  OperationalEvent,
  OperationalStaff,
  OperationalAlert,
  PendingPayment,
  ActivityItem,
  Priority,
  StaffStatus,
  AlertSeverity,
  formatTime,
  formatDate,
  getPriorityColor
} from '../../types/event-system';

/**
 * Live Operations Feed Panel
 * Right panel showing real-time operational data
 */

interface LiveOperationsFeedProps {
  todaysSchedule: OperationalEvent[];
  staffStatus: OperationalStaff[];
  alerts: OperationalAlert[];
  pendingPayments: PendingPayment[];
  recentActivity: ActivityItem[];
  onEventClick: (event: OperationalEvent) => void;
  onStaffClick: (staff: OperationalStaff) => void;
  onAlertAction: (alertId: string, action: string) => void;
  onPaymentProcess: (paymentId: string) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const LiveOperationsFeed: React.FC<LiveOperationsFeedProps> = ({
  todaysSchedule,
  staffStatus,
  alerts,
  pendingPayments,
  recentActivity,
  onEventClick,
  onStaffClick,
  onAlertAction,
  onPaymentProcess,
  collapsed = false,
  onToggleCollapse
}) => {
  const [activeTab, setActiveTab] = useState<'schedule' | 'staff' | 'alerts' | 'payments' | 'activity'>('schedule');
  const [expandedSections, setExpandedSections] = useState<string[]>(['schedule']);

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const getSeverityIcon = (severity: AlertSeverity) => {
    switch (severity) {
      case 'CRITICAL': return '🔴';
      case 'HIGH': return '🟠';
      case 'MEDIUM': return '🟡';
      case 'LOW': return '🟢';
      case 'INFO': return '🔵';
    }
  };

  const getStaffStatusColor = (status: StaffStatus) => {
    switch (status) {
      case 'AVAILABLE': return '#10B981';
      case 'ASSIGNED': return '#3B82F6';
      case 'ON_BREAK': return '#F59E0B';
      case 'OFF_DUTY': return '#6B7280';
      case 'CHECKED_IN': return '#8B5CF6';
    }
  };

  if (collapsed) {
    return (
      <div className="live-feed-collapsed">
        <button className="feed-expand-btn" onClick={onToggleCollapse}>
          ›
        </button>
        
        <div className="feed-mini-indicators">
          {todaysSchedule.length > 0 && (
            <div className="mini-indicator" title={`${todaysSchedule.length} events today`}>
              <span>📅</span>
              <span className="indicator-count">{todaysSchedule.length}</span>
            </div>
          )}
          
          {alerts.filter(a => !a.isRead).length > 0 && (
            <div className="mini-indicator alert" title={`${alerts.filter(a => !a.isRead).length} unread alerts`}>
              <span>🔔</span>
              <span className="indicator-count">{alerts.filter(a => !a.isRead).length}</span>
            </div>
          )}
          
          {pendingPayments.length > 0 && (
            <div className="mini-indicator payment" title={`${pendingPayments.length} pending payments`}>
              <span>💰</span>
              <span className="indicator-count">{pendingPayments.length}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <aside className="live-operations-feed">
      {/* Feed Header */}
      <div className="feed-header">
        <h3 className="feed-title">Live Operations</h3>
        <button className="feed-collapse-btn" onClick={onToggleCollapse}>
          ‹
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="feed-tabs">
        {([
          { key: 'schedule', label: 'Schedule', icon: '📅' },
          { key: 'staff', label: 'Staff', icon: '👥' },
          { key: 'alerts', label: 'Alerts', icon: '🔔' },
          { key: 'payments', label: 'Pay', icon: '💰' },
          { key: 'activity', label: 'Log', icon: '📋' }
        ] as const).map(tab => (
          <button
            key={tab.key}
            className={`feed-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
            {tab.key === 'alerts' && alerts.filter(a => !a.isRead).length > 0 && (
              <span className="tab-badge">{alerts.filter(a => !a.isRead).length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Feed Content */}
      <div className="feed-content">
        {/* Today's Schedule Tab */}
        {activeTab === 'schedule' && (
          <div className="feed-section">
            <div className="section-header">
              <h4>Today's Schedule</h4>
              <span className="section-count">{todaysSchedule.length} events</span>
            </div>
            
            <div className="schedule-list">
              {todaysSchedule.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon">📅</span>
                  <span className="empty-text">No events today</span>
                </div>
              ) : (
                todaysSchedule.map(event => (
                  <div
                    key={event.id}
                    className="schedule-item"
                    onClick={() => onEventClick(event)}
                  >
                    <div className="schedule-time">
                      {formatTime(event.startDate)}
                    </div>
                    
                    <div className="schedule-details">
                      <div className="schedule-title">{event.title}</div>
                      <div className="schedule-meta">
                        <span className="meta-item">
                          👤 {event.staff.length} staff
                        </span>
                        <span className="meta-item">
                          📍 {event.venue?.name || 'TBD'}
                        </span>
                      </div>
                    </div>
                    
                    <div
                      className="priority-indicator"
                      style={{ background: getPriorityColor(event.priority).primary }}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Staff Status Tab */}
        {activeTab === 'staff' && (
          <div className="feed-section">
            <div className="section-header">
              <h4>Staff Status</h4>
              <span className="section-count">{staffStatus.length} on duty</span>
            </div>
            
            <div className="staff-list">
              {staffStatus.map(staff => (
                <div
                  key={staff.id}
                  className="staff-item"
                  onClick={() => onStaffClick(staff)}
                >
                  <div className="staff-avatar">
                    {(staff.fullName || staff.name || '').charAt(0)}
                  </div>
                  
                  <div className="staff-info">
                    <div className="staff-name">{staff.fullName}</div>
                    <div className="staff-role">{staff.role}</div>
                  </div>
                  
                  <div className="staff-status-badge" style={{
                    background: `${getStaffStatusColor(staff.status)}20`,
                    color: getStaffStatusColor(staff.status),
                    borderColor: `${getStaffStatusColor(staff.status)}40`
                  }}>
                    {staff.status.replace('_', ' ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Alerts Tab */}
        {activeTab === 'alerts' && (
          <div className="feed-section">
            <div className="section-header">
              <h4>Alerts</h4>
              <span className="section-count">{alerts.length} alerts</span>
            </div>
            
            <div className="alerts-list">
              {alerts.map(alert => (
                <div
                  key={alert.id}
                  className={`alert-item ${alert.isRead ? 'read' : 'unread'} severity-${alert.severity.toLowerCase()}`}
                >
                  <div className="alert-icon">
                    {getSeverityIcon(alert.severity)}
                  </div>
                  
                  <div className="alert-content">
                    <div className="alert-title">{alert.title}</div>
                    <div className="alert-message">{alert.message}</div>
                    <div className="alert-time">
                      {new Date(alert.timestamp).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                  
                  {alert.actionRequired && alert.actions && (
                    <div className="alert-actions">
                      {alert.actions.map((action, index) => (
                        <button
                          key={index}
                          className={`alert-action-btn ${action.variant}`}
                          onClick={() => onAlertAction(alert.id, action.label)}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending Payments Tab */}
        {activeTab === 'payments' && (
          <div className="feed-section">
            <div className="section-header">
              <h4>Pending Payments</h4>
              <span className="section-count">${pendingPayments.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}</span>
            </div>
            
            <div className="payments-list">
              {pendingPayments.map(payment => (
                <div key={payment.id} className="payment-item">
                  <div className="payment-info">
                    <div className="payment-staff">{payment.staffName}</div>
                    <div className="payment-details">
                      {payment.eventTitle} • {payment.hoursWorked}h
                    </div>
                  </div>
                  
                  <div className="payment-amount">
                    ${payment.amount.toLocaleString()}
                  </div>
                  
                  <button
                    className="payment-process-btn"
                    onClick={() => onPaymentProcess(payment.id)}
                  >
                    Process
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Activity Log Tab */}
        {activeTab === 'activity' && (
          <div className="feed-section">
            <div className="section-header">
              <h4>Activity Log</h4>
              <span className="section-count">{recentActivity.length} events</span>
            </div>
            
            <div className="activity-timeline">
              {recentActivity.map((activity, index) => (
                <div key={activity.id} className="timeline-item">
                  <div className={`timeline-dot ${activity.isUrgent ? 'urgent' : ''}`} />
                  
                  <div className="timeline-content">
                    <div className="timeline-header">
                      <span className="timeline-operator">{activity.operator}</span>
                      <span className="timeline-time">
                        {new Date(activity.timestamp).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <div className="timeline-message">{activity.message}</div>
                    {activity.details && (
                      <div className="timeline-details">{activity.details}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick Stats Footer */}
      <div className="feed-footer">
        <div className="quick-stat">
          <span className="stat-label">Staff On Duty</span>
          <span className="stat-value">
            {staffStatus.filter(s => s.status !== 'OFF_DUTY').length}/{staffStatus.length}
          </span>
        </div>
        <div className="quick-stat">
          <span className="stat-label">Events Today</span>
          <span className="stat-value">{todaysSchedule.length}</span>
        </div>
      </div>
    </aside>
  );
};

export default LiveOperationsFeed;
