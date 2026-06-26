import React, { useState, useEffect, useCallback } from 'react';
import { Users, UserPlus, Trash2, Pencil } from 'lucide-react';
import * as dataStore from '../services/dataStore';

const StaffView = () => {
  const [staffList, setStaffList] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    role: '',
    rate: '',
    notes: ''
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch staff list from data store (now connected to Firestore)
  const fetchStaff = useCallback(() => {
    const stored = dataStore.listStaff();
    setStaffList(stored || []);
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      if (editingId) {
        // Optimistic update for edit
        dataStore.updateStaff(editingId, {
          name: formData.name,
          phone: formData.phone,
          role: formData.role,
          rate: Number(formData.rate) || 0,
          notes: formData.notes
        });
        setSuccessMsg('Staff updated!');
      } else {
        // Optimistic update for add
        dataStore.addStaff({
          name: formData.name,
          phone: formData.phone,
          role: formData.role,
          rate: Number(formData.rate) || 0,
          notes: formData.notes
        });
        setSuccessMsg('Staff added!');
      }
      
      setFormData({ name: '', phone: '', role: '', rate: '', notes: '' });
      setEditingId(null);
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchStaff();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (staff: any) => {
    setFormData({
      name: staff.name,
      phone: staff.phone || '',
      role: staff.role || '',
      rate: staff.rate?.toString() || '',
      notes: staff.notes || ''
    });
    setEditingId(staff.id);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this staff member?')) return;
    
    try {
      // Optimistic delete - just refetch for now
      fetchStaff();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Quiet Luxury styling
  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      width: '100%',
      maxWidth: '800px',
      margin: '0 auto',
      padding: '24px',
      gap: '24px'
    },
    card: {
      width: '100%',
      backgroundColor: '#161b22',
      border: '1px solid #30363d',
      borderRadius: '12px',
      padding: '32px',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px'
    },
    title: {
      fontSize: '24px',
      fontWeight: '600',
      color: '#e6edf3',
      letterSpacing: '-0.02em',
      margin: 0
    },
    formRow: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    },
    label: {
      fontSize: '13px',
      fontWeight: '500',
      color: '#8b949e',
      textTransform: 'uppercase',
      letterSpacing: '0.06em'
    },
    input: {
      width: '100%',
      padding: '12px 16px',
      backgroundColor: '#0d1117',
      border: '1px solid #30363d',
      borderRadius: '8px',
      color: '#e6edf3',
      fontSize: '14px',
      outline: 'none'
    },
    button: {
      padding: '12px 24px',
      border: 'none',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.15s',
      backgroundColor: '#00e5a0',
      color: '#0d1117'
    },
    listItem: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '16px',
      backgroundColor: '#0d1117',
      border: '1px solid #30363d',
      borderRadius: '8px'
    }
  };

  return (
    <div style={styles.container as React.CSSProperties}>
      <div style={styles.card as React.CSSProperties}>
        <h2 style={styles.title as React.CSSProperties}>
          {editingId ? 'Edit Staff' : 'Add New Staff'}
        </h2>

        {successMsg && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid #10B981',
            borderRadius: '8px',
            color: '#10B981',
            fontSize: '14px'
          }}>
            {successMsg}
          </div>
        )}

        {error && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid #EF4444',
            borderRadius: '8px',
            color: '#EF4444',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={styles.formRow as React.CSSProperties}>
            <label style={styles.label as React.CSSProperties}>Full Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={e => handleChange('name', e.target.value)}
              required
              style={styles.input as React.CSSProperties}
              placeholder="e.g. John Smith"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={styles.formRow as React.CSSProperties}>
              <label style={styles.label as React.CSSProperties}>Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={e => handleChange('phone', e.target.value)}
                style={styles.input as React.CSSProperties}
                placeholder="+27 123 456 789"
              />
            </div>
            <div style={styles.formRow as React.CSSProperties}>
              <label style={styles.label as React.CSSProperties}>Role</label>
              <input
                type="text"
                value={formData.role}
                onChange={e => handleChange('role', e.target.value)}
                style={styles.input as React.CSSProperties}
                placeholder="e.g. Sound Engineer"
              />
            </div>
          </div>

          <div style={styles.formRow as React.CSSProperties}>
            <label style={styles.label as React.CSSProperties}>Hourly Rate (R)</label>
            <input
              type="number"
              value={formData.rate}
              onChange={e => handleChange('rate', e.target.value)}
              min="0"
              step="0.01"
              style={styles.input as React.CSSProperties}
              placeholder="e.g. 150"
            />
          </div>

          <div style={styles.formRow as React.CSSProperties}>
            <label style={styles.label as React.CSSProperties}>Notes</label>
            <textarea
              value={formData.notes}
              onChange={e => handleChange('notes', e.target.value)}
              rows={3}
              style={{...styles.input as React.CSSProperties, resize: 'vertical'}}
              placeholder="Any additional notes..."
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.button as React.CSSProperties,
                flex: 1,
                opacity: loading ? 0.5 : 1
              }}
            >
              {loading ? 'Saving...' : editingId ? 'Update Staff' : 'Add Staff'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setFormData({ name: '', phone: '', role: '', rate: '', notes: '' });
                  setEditingId(null);
                }}
                style={{
                  padding: '12px 24px',
                  backgroundColor: 'transparent',
                  border: '1px solid #30363d',
                  borderRadius: '8px',
                  color: '#e6edf3',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div style={styles.card as React.CSSProperties}>
        <h3 style={{...styles.title as React.CSSProperties, fontSize: '20px'}}>
          Staff List ({staffList.length})
        </h3>

        {staffList.length === 0 ? (
          <p style={{ color: '#8b949e', textAlign: 'center', padding: '32px 0' }}>
            No staff added yet
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {staffList.map(staff => (
              <div key={staff.id} style={styles.listItem as React.CSSProperties}>
                <div>
                  <p style={{ color: '#e6edf3', fontWeight: '500', margin: 0 }}>
                    {staff.name}
                  </p>
                  <p style={{ fontSize: '13px', color: '#8b949e', margin: '4px 0 0' }}>
                    {staff.role || 'No role'} • {staff.phone || 'No phone'}
                    {staff.rate ? ` • R${staff.rate}/hr` : ''}
                  </p>
                  {staff.notes && (
                    <p style={{ fontSize: '12px', color: '#8b949e', margin: '8px 0 0' }}>
                      {staff.notes}
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleEdit(staff)}
                    style={{
                      padding: '8px',
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: '#8b949e',
                      cursor: 'pointer'
                    }}
                    title="Edit"
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(staff.id)}
                    style={{
                      padding: '8px',
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: '#8b949e',
                      cursor: 'pointer'
                    }}
                    title="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffView;