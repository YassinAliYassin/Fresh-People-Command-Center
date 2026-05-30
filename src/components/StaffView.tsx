import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Trash2, Pencil } from 'lucide-react';

const StaffView = () => {
  const [staffList, setStaffList] = useState([]);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    role: '',
    rate: '',
    notes: ''
  });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch staff list
  const fetchStaff = async () => {
    try {
      const res = await fetch('/api/staff');
      const data = await res.json();
      setStaffList(data.staff || []);
    } catch (err) {
      console.error('Failed to fetch staff:', err);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const method = editingId ? 'PATCH' : 'POST';
      
      const res = await fetch('/api/staff', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingId ? { ...formData, id: editingId } : formData)
      });

      if (!res.ok) throw new Error('Failed to save staff');
      
      setSuccessMsg(editingId ? 'Staff updated!' : 'Staff added!');
      setFormData({ fullName: '', phone: '', role: '', rate: '', notes: '' });
      setEditingId(null);
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchStaff();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (staff) => {
    setFormData({
      fullName: staff.fullName,
      phone: staff.phone || '',
      role: staff.role || '',
      rate: staff.rate?.toString() || '',
      notes: staff.notes || ''
    });
    setEditingId(staff.id);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this staff member?')) return;
    
    try {
      const res = await fetch('/api/staff', { 
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (!res.ok) throw new Error('Failed to delete staff');
      fetchStaff();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-900 rounded-xl shadow-lg border border-gray-800 p-6">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <UserPlus size={24} className="text-blue-400" />
          {editingId ? 'Edit Staff' : 'Add New Staff'}
        </h2>

        {successMsg && (
          <div className="mb-4 p-3 bg-green-900/50 border border-green-700 rounded-lg text-green-300">
            {successMsg}
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Full Name (Firstname Surname)</label>
            <input
              type="text"
              value={formData.fullName}
              onChange={e => handleChange('fullName', e.target.value)}
              required
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. John Smith"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={e => handleChange('phone', e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="+27 123 456 789"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Role</label>
              <input
                type="text"
                value={formData.role}
                onChange={e => handleChange('role', e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Sound Engineer"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Hourly Rate (R)</label>
            <input
              type="number"
              value={formData.rate}
              onChange={e => handleChange('rate', e.target.value)}
              min="0"
              step="0.01"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. 150"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={e => handleChange('notes', e.target.value)}
              rows={3}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Any additional notes..."
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 min-h-[48px] bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : editingId ? 'Update Staff' : 'Add Staff'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setFormData({ fullName: '', phone: '', role: '', rate: '', notes: '' });
                  setEditingId(null);
                }}
                className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="bg-gray-900 rounded-xl shadow-lg border border-gray-800 p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Users size={20} className="text-blue-400" />
          Staff List
        </h3>

        {staffList.length === 0 ? (
          <p className="text-gray-400">No staff added yet.</p>
        ) : (
          <div className="space-y-3">
            {staffList.map(staff => (
              <div key={staff.id} className="bg-gray-800 rounded-lg p-4 flex justify-between items-center">
                <div>
                  <p className="text-white font-medium">{staff.fullName}</p>
                  <p className="text-sm text-gray-400">
                    {staff.role || 'No role'} • {staff.phone || 'No phone'}
                    {staff.rate ? ` • R${staff.rate}/hr` : ''}
                  </p>
                  {staff.notes && (
                    <p className="text-xs text-gray-500 mt-1">{staff.notes}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(staff)}
                    className="p-2 text-gray-400 hover:text-blue-400 transition-colors"
                    title="Edit"
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(staff.id)}
                    className="p-2 text-gray-400 hover:text-red-400 transition-colors"
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
