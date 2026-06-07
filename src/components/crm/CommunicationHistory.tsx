/**
 * Communication History Component
 * Displays timeline of all communications with a client
 */

// @ts-nocheck
import React, { useState } from 'react';
import { 
  Mail, 
  Phone, 
  Calendar, 
  FileText, 
  MessageSquare, 
  Send,
  Inbox,
  Clock,
  Download,
  X,
  ChevronDown,
  ChevronUp,
  User,
  Plus
} from 'lucide-react';
import { CommunicationRecord } from '../../types/agent-types';

// Mock communication history
const MOCK_COMMUNICATIONS: CommunicationRecord[] = [
  {
    id: '1',
    clientId: 1,
    type: 'email',
    direction: 'outbound',
    date: '2026-06-02T10:30:00',
    subject: 'Proposal Follow-up',
    content: 'Hi John, I wanted to follow up on the proposal we sent last week. Have you had a chance to review it?',
    attachments: ['proposal-v2.pdf'],
    outcome: 'Opened - 2 hours later'
  },
  {
    id: '2',
    clientId: 1,
    type: 'call',
    direction: 'inbound',
    date: '2026-06-01T14:15:00',
    subject: 'Requirements Discussion',
    content: 'Discussed additional requirements for the premium package. Client needs customization for reporting module.',
    duration: 25,
    outcome: 'Positive - Moving to proposal stage'
  },
  {
    id: '3',
    clientId: 1,
    type: 'meeting',
    direction: 'outbound',
    date: '2026-05-30T09:00:00',
    subject: 'Initial Discovery Meeting',
    content: 'Met at client office to discuss their needs. Presented our solution overview.',
    duration: 60,
    attendees: ['John Doe (Client)', 'Jane Smith (Our Team)'],
    outcome: 'Very positive - Client interested in premium package'
  },
  {
    id: '4',
    clientId: 1,
    type: 'email',
    direction: 'inbound',
    date: '2026-05-28T16:45:00',
    subject: 'Re: Introduction',
    content: 'Thanks for the introduction. I would like to learn more about your services.',
    outcome: 'Replied within 2 hours'
  },
  {
    id: '5',
    clientId: 1,
    type: 'note',
    direction: 'outbound',
    date: '2026-05-27T11:20:00',
    subject: 'Research Notes',
    content: 'Client company is expanding to 3 new locations. This could be a major opportunity.',
    outcome: 'Internal note'
  }
];

interface CommunicationHistoryProps {
  clientId?: number; // If provided, show communications for specific client
  embedded?: boolean; // If true, render in embedded mode
}

const CommunicationHistory: React.FC<CommunicationHistoryProps> = ({ 
  clientId, 
  embedded = false 
}) => {
  const [communications] = useState<CommunicationRecord[]>(
    clientId 
      ? MOCK_COMMUNICATIONS.filter(c => c.clientId === clientId)
      : MOCK_COMMUNICATIONS
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'email' | 'call' | 'meeting' | 'note'>('all');
  const [showAddForm, setShowAddForm] = useState(false);

  const getIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="w-4 h-4" />;
      case 'call': return <Phone className="w-4 h-4" />;
      case 'meeting': return <Calendar className="w-4 h-4" />;
      case 'note': return <FileText className="w-4 h-4" />;
      case 'sms': return <MessageSquare className="w-4 h-4" />;
      default: return <Mail className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'email': return '#3B82F6';
      case 'call': return '#10B981';
      case 'meeting': return '#8B5CF6';
      case 'note': return '#F59E0B';
      case 'sms': return '#EC4899';
      default: return '#6B7280';
    }
  };

  const filteredComms = communications.filter(c => 
    filter === 'all' || c.type === filter
  );

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return `Today at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays === 1) {
      return `Yesterday at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      });
    }
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return '';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className={`communication-history ${embedded ? 'embedded' : ''}`}>
      {/* Header */}
      <div className="comm-header">
        <div>
          <h3 className="comm-title">Communication History</h3>
          <p className="comm-subtitle">
            {filteredComms.length} records • {communications.filter(c => c.direction === 'outbound').length} outbound
          </p>
        </div>
        <button 
          className="comm-add-btn"
          onClick={() => setShowAddForm(true)}
        >
          <Plus className="w-4 h-4" />
          Add Note
        </button>
      </div>

      {/* Filters */}
      <div className="comm-filters">
        {['all', 'email', 'call', 'meeting', 'note'].map(filterType => (
          <button
            key={filterType}
            className={`comm-filter-btn ${filter === filterType ? 'active' : ''}`}
            onClick={() => setFilter(filterType as any)}
          >
            {filterType === 'all' ? 'All' : filterType.charAt(0).toUpperCase() + filterType.slice(1)}
            {filterType !== 'all' && (
              <span className="comm-filter-count">
                {communications.filter(c => c.type === filterType).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div className="comm-timeline">
        {filteredComms.map((comm, index) => (
          <div key={comm.id} className="comm-item">
            {/* Timeline Connector */}
            <div className="comm-timeline-left">
              <div 
                className="comm-icon"
                style={{ backgroundColor: `${getTypeColor(comm.type)}20`, color: getTypeColor(comm.type) }}
              >
                {getIcon(comm.type)}
              </div>
              {index < filteredComms.length - 1 && <div className="comm-timeline-line"></div>}
            </div>

            {/* Content */}
            <div className="comm-content">
              <div className="comm-content-header">
                <div className="comm-type-badge" style={{ color: getTypeColor(comm.type) }}>
                  {comm.type.charAt(0).toUpperCase() + comm.type.slice(1)}
                </div>
                <div className="comm-direction">
                  {comm.direction === 'outbound' ? (
                    <Send className="w-3 h-3" />
                  ) : (
                    <Inbox className="w-3 h-3" />
                  )}
                  <span className="capitalize">{comm.direction}</span>
                </div>
                <div className="comm-date">
                  <Clock className="w-3 h-3" />
                  {formatDate(comm.date)}
                </div>
              </div>

              <h4 className="comm-subject">{comm.subject}</h4>
              
              <p className="comm-preview">
                {comm.content.length > 120 && expandedId !== comm.id
                  ? `${comm.content.substring(0, 120)}...`
                  : comm.content
                }
              </p>

              {/* Expanded Details */}
              {expandedId === comm.id && (
                <div className="comm-details">
                  {comm.duration && (
                    <div className="comm-detail-item">
                      <Clock className="w-3 h-3" />
                      <span>Duration: {formatDuration(comm.duration)}</span>
                    </div>
                  )}
                  {comm.attendees && (
                    <div className="comm-detail-item">
                      <User className="w-3 h-3" />
                      <span>Attendees: {comm.attendees.join(', ')}</span>
                    </div>
                  )}
                  {comm.attachments && comm.attachments.length > 0 && (
                    <div className="comm-attachments">
                      <Download className="w-3 h-3" />
                      {comm.attachments.map((att, i) => (
                        <span key={i} className="comm-attachment">{att}</span>
                      ))}
                    </div>
                  )}
                  {comm.outcome && (
                    <div className="comm-outcome">
                      <strong>Outcome:</strong> {comm.outcome}
                    </div>
                  )}
                </div>
              )}

              {/* Footer */}
              <div className="comm-footer">
                <button
                  className="comm-expand-btn"
                  onClick={() => setExpandedId(expandedId === comm.id ? null : comm.id)}
                >
                  {expandedId === comm.id ? (
                    <>
                      <ChevronUp className="w-3 h-3" />
                      Show Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3 h-3" />
                      Show More
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredComms.length === 0 && (
          <div className="comm-empty">
            <MessageSquare className="w-8 h-8" />
            <p>No communications found</p>
          </div>
        )}
      </div>

      {/* Add Note Modal */}
      {showAddForm && (
        <div className="comm-modal-overlay" onClick={() => setShowAddForm(false)}>
          <div className="comm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="comm-modal-header">
              <h4>Add Communication Record</h4>
              <button onClick={() => setShowAddForm(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <form className="comm-form">
              <div className="form-group">
                <label>Type</label>
                <select>
                  <option value="note">Note</option>
                  <option value="email">Email</option>
                  <option value="call">Call</option>
                  <option value="meeting">Meeting</option>
                </select>
              </div>
              <div className="form-group">
                <label>Subject</label>
                <input type="text" placeholder="Enter subject" />
              </div>
              <div className="form-group">
                <label>Content</label>
                <textarea rows={4} placeholder="Enter details..."></textarea>
              </div>
              <div className="form-group">
                <label>Direction</label>
                <select>
                  <option value="outbound">Outbound</option>
                  <option value="inbound">Inbound</option>
                </select>
              </div>
              <button type="submit" className="comm-submit-btn">
                Save Record
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunicationHistory;
