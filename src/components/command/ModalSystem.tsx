import React, { useState, useEffect } from 'react';
import { ModalType, OperationalEvent, OperationalStaff } from '../../types/event-system';

/**
 * Modal System Component
 * Luxury modals for all CRUD operations
 */

interface ModalSystemProps {
  activeModal: ModalType | null;
  modalData?: any;
  onClose: () => void;
  onSave: (type: ModalType, data: any) => void;
}

// ==========================================
// NEW EVENT MODAL
// ==========================================

const NewEventModal: React.FC<{ onClose: () => void; onSave: (data: any) => void }> = ({
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState({
    title: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '13:00',
    client: '',
    venue: '',
    priority: 'NORMAL' as 'VIP' | 'HIGH' | 'NORMAL' | 'LOW',
    staffNeeded: 1,
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">📅 Create New Event</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label className="form-label">Event Title</label>
            <input
              type="text"
              className="form-input"
              placeholder="Enter event title..."
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Date</label>
              <input
                type="date"
                className="form-input"
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Priority</label>
              <select
                className="form-select"
                value={formData.priority}
                onChange={e => setFormData({ ...formData, priority: e.target.value as any })}
              >
                <option value="LOW">⬜ Low</option>
                <option value="NORMAL">🔵 Normal</option>
                <option value="HIGH">🔴 High</option>
                <option value="VIP">🟡 VIP</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Start Time</label>
              <input
                type="time"
                className="form-input"
                value={formData.startTime}
                onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">End Time</label>
              <input
                type="time"
                className="form-input"
                value={formData.endTime}
                onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Client</label>
            <input
              type="text"
              className="form-input"
              placeholder="Client name..."
              value={formData.client}
              onChange={e => setFormData({ ...formData, client: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Venue</label>
            <input
              type="text"
              className="form-input"
              placeholder="Venue name..."
              value={formData.venue}
              onChange={e => setFormData({ ...formData, venue: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Staff Needed</label>
            <input
              type="number"
              className="form-input"
              min="1"
              max="50"
              value={formData.staffNeeded}
              onChange={e => setFormData({ ...formData, staffNeeded: parseInt(e.target.value) })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea
              className="form-textarea"
              placeholder="Additional notes..."
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Create Event
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==========================================
// NEW STAFF MODAL
// ==========================================

const NewStaffModal: React.FC<{ onClose: () => void; onSave: (data: any) => void }> = ({
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    role: 'Bartender',
    rate: 25,
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">👤 Add New Staff</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="Staff member name..."
              value={formData.fullName}
              onChange={e => setFormData({ ...formData, fullName: e.target.value })}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input
                type="tel"
                className="form-input"
                placeholder="+1 (555) 123-4567"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-input"
                placeholder="email@domain.com"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Role</label>
              <select
                className="form-select"
                value={formData.role}
                onChange={e => setFormData({ ...formData, role: e.target.value })}
              >
                <option value="Bartender">Bartender</option>
                <option value="Server">Server</option>
                <option value="Barista">Barista</option>
                <option value="Mixologist">Mixologist</option>
                <option value="Barback">Barback</option>
                <option value="Setup Team">Setup Team</option>
                <option value="Promoter">Promoter</option>
                <option value="Usher">Usher</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Hourly Rate ($)</label>
              <input
                type="number"
                className="form-input"
                min="15"
                max="150"
                value={formData.rate}
                onChange={e => setFormData({ ...formData, rate: parseInt(e.target.value) })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea
              className="form-textarea"
              placeholder="Skills, availability, notes..."
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Add Staff
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==========================================
// MAIN MODAL SYSTEM
// ==========================================

const ModalSystem: React.FC<ModalSystemProps> = ({
  activeModal,
  modalData,
  onClose,
  onSave
}) => {
  if (!activeModal) return null;

  const handleSave = (type: ModalType, data: any) => {
    onSave(type, data);
    onClose();
  };

  const renderModal = () => {
    switch (activeModal) {
      case 'new_event':
        return (
          <NewEventModal
            onClose={onClose}
            onSave={(data) => handleSave('new_event', data)}
          />
        );
      
      case 'new_staff':
        return (
          <NewStaffModal
            onClose={onClose}
            onSave={(data) => handleSave('new_staff', data)}
          />
        );
      
      case 'new_client':
        return (
          <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">🏢 Add New Client</h2>
                <button className="modal-close" onClick={onClose}>✕</button>
              </div>
              <div className="modal-body">
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
                  Client creation form - Coming soon
                </p>
                <div className="modal-actions">
                  <button className="btn-secondary" onClick={onClose}>Close</button>
                </div>
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return <>{renderModal()}</>;
};

export default ModalSystem;
