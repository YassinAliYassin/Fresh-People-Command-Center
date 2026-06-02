import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Users, 
  UserPlus, 
  Trash2, 
  Pencil, 
  Phone, 
  Mail, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle,
  Filter,
  Grid,
  List,
  Search,
  Send,
  Calendar,
  Briefcase,
  TrendingUp,
  Activity,
  ChevronDown,
  RefreshCw
} from 'lucide-react';

// Types
interface StaffMember {
  id: string;
  staffName: string;
  staffPhone: string;
  role: string;
  status: 'active' | 'inactive';
  availability: 'available' | 'busy' | 'off-duty';
  hourlyRate?: number;
  notes?: string;
  createdAt?: string;
}

interface EventAssignment {
  id: string;
  eventName: string;
  eventDate: string;
  status: string;
  staffId: string;
}

type AvailabilityFilter = 'all' | 'available' | 'busy' | 'off-duty';
type ViewMode = 'grid' | 'list';

const Staff = () => {
  // Core state
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [assignments, setAssignments] = useState<EventAssignment[]>([]);
  const [formData, setFormData] = useState({
    staffName: '',
    staffPhone: '',
    role: '',
    hourlyRate: '',
    notes: ''
  });
  
  // UI state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Autonomous agent state
  const [availabilityFilter, setAvailabilityFilter] = useState<AvailabilityFilter>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [whatsappSending, setWhatsappSending] = useState<string | null>(null);

  // Fetch staff and assignments
  const fetchStaff = useCallback(async () => {
    setFetching(true);
    try {
      const res = await fetch('/api/staff');
      const data = await res.json();
      setStaffList(data.staff || []);
    } catch (err) {
      console.error('Failed to fetch staff:', err);
      setError('Failed to load staff data');
    } finally {
      setFetching(false);
    }
  }, []);

  const fetchAssignments = useCallback(async () => {
    try {
      const res = await fetch('/api/events');
      const data = await res.json();
      // Extract staff assignments from events
      const allAssignments: EventAssignment[] = [];
      (data.events || []).forEach((event: any) => {
        if (event.assignedStaff) {
          event.assignedStaff.forEach((staffId: string) => {
            allAssignments.push({
              id: event.id,
              eventName: event.eventName,
              eventDate: event.eventDate,
              status: event.status,
              staffId: staffId
            });
          });
        }
      });
      setAssignments(allAssignments);
    } catch (err) {
      console.error('Failed to fetch assignments:', err);
    }
  }, []);

  useEffect(() => {
    fetchStaff();
    fetchAssignments();
  }, [fetchStaff, fetchAssignments]);

  // Get unique roles for filter
  const uniqueRoles = [...new Set(staffList.map(s => s.role).filter(Boolean))];

  // Filter staff based on current filters
  const filteredStaff = staffList.filter(staff => {
    if (availabilityFilter !== 'all' && staff.availability !== availabilityFilter) return false;
    if (roleFilter !== 'all' && staff.role !== roleFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        staff.staffName.toLowerCase().includes(query) ||
        staff.role?.toLowerCase().includes(query) ||
        staff.staffPhone?.includes(query)
      );
    }
    return true;
  });

  // Get staff assignments
  const getStaffAssignments = (staffId: string) => {
    return assignments.filter(a => a.staffId === staffId);
  };

  // Get availability stats
  const availabilityStats = {
    available: staffList.filter(s => s.availability === 'available').length,
    busy: staffList.filter(s => s.availability === 'busy').length,
    offDuty: staffList.filter(s => s.availability === 'off-duty').length,
    total: staffList.length
  };

  const staffPerformance = useMemo(() => {
    return staffList.map(staff => {
      const staffAssignments = getStaffAssignments(staff.id);
      const completed = staffAssignments.filter(a => a.status?.toLowerCase() === 'completed').length;
      const upcoming = staffAssignments.filter(a => new Date(a.eventDate) >= new Date()).length;
      const utilization = staffAssignments.length > 0 ? Math.round((completed / staffAssignments.length) * 100) : 0;
      const availabilityScore = staff.availability === 'available' ? 35 : staff.availability === 'busy' ? 18 : 6;
      const roleDemand = staffList.filter(member => member.role === staff.role).length;
      const assignmentScore = Math.max(0, 35 - staffAssignments.length * 4);
      const rateScore = staff.hourlyRate ? Math.max(5, 30 - Math.round(staff.hourlyRate / 20)) : 15;

      return {
        staff,
        assignments: staffAssignments,
        completed,
        upcoming,
        utilization,
        optimizerScore: Math.min(100, availabilityScore + assignmentScore + rateScore + Math.min(10, roleDemand * 2))
      };
    }).sort((a, b) => b.optimizerScore - a.optimizerScore);
  }, [staffList, assignments]);

  const optimizedStaff = useMemo(() => {
    return staffPerformance
      .filter(item => item.staff.status !== 'inactive' && item.staff.availability !== 'off-duty')
      .slice(0, 5);
  }, [staffPerformance]);

  const shiftPlan = useMemo(() => {
    const upcomingAssignments = assignments
      .filter(assignment => new Date(assignment.eventDate) >= new Date())
      .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime())
      .slice(0, 6);

    return upcomingAssignments.map(assignment => ({
      ...assignment,
      staff: staffList.find(staff => staff.id === assignment.staffId)
    }));
  }, [assignments, staffList]);

  const performanceMetrics = useMemo(() => {
    const activeStaff = staffList.filter(staff => staff.status !== 'inactive').length;
    const assignedStaff = new Set(assignments.map(assignment => assignment.staffId)).size;
    const utilization = activeStaff > 0 ? Math.round((assignedStaff / activeStaff) * 100) : 0;
    const averageScore = staffPerformance.length
      ? Math.round(staffPerformance.reduce((sum, item) => sum + item.optimizerScore, 0) / staffPerformance.length)
      : 0;
    const coverageRisk = Math.max(0, shiftPlan.length - availabilityStats.available);

    return { activeStaff, assignedStaff, utilization, averageScore, coverageRisk };
  }, [staffList, assignments, staffPerformance, shiftPlan.length, availabilityStats.available]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const method = editingId ? 'PATCH' : 'POST';
      const payload = editingId 
        ? { ...formData, id: editingId, hourlyRate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : undefined }
        : { ...formData, hourlyRate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : undefined };
      
      const res = await fetch('/api/staff', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed to save staff');
      
      setSuccessMsg(editingId ? 'Staff updated successfully!' : 'Staff added successfully!');
      setFormData({ staffName: '', staffPhone: '', role: '', hourlyRate: '', notes: '' });
      setEditingId(null);
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchStaff();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (staff: StaffMember) => {
    setFormData({
      staffName: staff.staffName,
      staffPhone: staff.staffPhone || '',
      role: staff.role || '',
      hourlyRate: staff.hourlyRate?.toString() || '',
      notes: staff.notes || ''
    });
    setEditingId(staff.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this staff member?')) return;
    
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

  const handleAvailabilityChange = async (staffId: string, newAvailability: StaffMember['availability']) => {
    try {
      const res = await fetch('/api/staff', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: staffId, availability: newAvailability })
      });
      if (!res.ok) throw new Error('Failed to update availability');
      fetchStaff();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const sendWhatsApp = async (staff: StaffMember) => {
    if (!staff.staffPhone) {
      setError('No phone number available for this staff member');
      return;
    }
    
    setWhatsappSending(staff.id);
    try {
      const message = `Hello ${staff.staffName},\n\nThis is a message from Fresh People Command Center.\n\nBest regards,\nFresh People Team`;
      const encodedMessage = encodeURIComponent(message);
      const phone = staff.staffPhone.replace(/\D/g, '');
      const whatsappUrl = `https://wa.me/${phone}?text=${encodedMessage}`;
      
      window.open(whatsappUrl, '_blank');
      setSuccessMsg(`WhatsApp opened for ${staff.staffName}`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setError('Failed to open WhatsApp');
    } finally {
      setWhatsappSending(null);
    }
  };

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'available': return 'text-green-400 bg-green-400/10 border-green-400/30';
      case 'busy': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
      case 'off-duty': return 'text-red-400 bg-red-400/10 border-red-400/30';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/30';
    }
  };

  const getAvailabilityIcon = (availability: string) => {
    switch (availability) {
      case 'available': return <CheckCircle size={16} />;
      case 'busy': return <Clock size={16} />;
      case 'off-duty': return <XCircle size={16} />;
      default: return <AlertCircle size={16} />;
    }
  };

  if (fetching) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="animate-spin text-[#BF8F3B]" size={48} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Workforce Agent Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-gray-900/90 to-gray-800/90 backdrop-blur-xl rounded-2xl border border-[#BF8F3B]/30 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-[#BF8F3B]/5 to-transparent" />
          <div className="relative p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-3 bg-[#BF8F3B]/20 rounded-xl">
                    <Activity className="text-[#BF8F3B]" size={28} />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-white">Workforce Agent</h1>
                    <p className="text-[#BF8F3B] text-sm font-medium tracking-wide">AUTONOMOUS STAFF MANAGEMENT</p>
                  </div>
                </div>
                <p className="text-gray-400 mt-2">Managing {availabilityStats.total} staff members • {availabilityStats.available} available now</p>
              </div>
              
              {/* Quick Stats */}
              <div className="flex gap-3">
                <div className="px-4 py-2 bg-green-400/10 border border-green-400/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-green-400" />
                    <span className="text-green-400 font-bold">{availabilityStats.available}</span>
                    <span className="text-gray-400 text-sm">Available</span>
                  </div>
                </div>
                <div className="px-4 py-2 bg-yellow-400/10 border border-yellow-400/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-yellow-400" />
                    <span className="text-yellow-400 font-bold">{availabilityStats.busy}</span>
                    <span className="text-gray-400 text-sm">Busy</span>
                  </div>
                </div>
                <div className="px-4 py-2 bg-red-400/10 border border-red-400/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <XCircle size={16} className="text-red-400" />
                    <span className="text-red-400 font-bold">{availabilityStats.offDuty}</span>
                    <span className="text-gray-400 text-sm">Off-duty</span>
                  </div>
                </div>
                <button 
                  onClick={() => window.print()} 
                  className="px-4 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg hover:bg-gray-700/50 transition-all duration-300 flex items-center gap-2"
                >
                  <Calendar size={16} className="text-gray-400" />
                  <span className="text-gray-400 text-sm">Print List</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Success/Error Messages */}
        {successMsg && (
          <div className="p-4 bg-green-900/50 border border-green-700/50 rounded-xl text-green-300 backdrop-blur-sm animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle size={20} />
              {successMsg}
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-900/50 border border-red-700/50 rounded-xl text-red-300 backdrop-blur-sm animate-fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle size={20} />
              {error}
            </div>
          </div>
        )}

        {/* Operations Agent Intelligence */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="relative overflow-hidden bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-xl rounded-2xl border border-gray-700/50 shadow-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Activity size={20} className="text-[#BF8F3B]" />
                Availability Optimizer
              </h2>
              <span className="text-xs text-gray-400">{optimizedStaff.length} matches</span>
            </div>
            <div className="space-y-3">
              {optimizedStaff.map(item => (
                <div key={item.staff.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-700/60 bg-gray-800/40 px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold text-white">{item.staff.staffName}</p>
                    <span className="text-xs text-gray-400">{item.staff.role || 'General'} • {item.assignments.length} shifts</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-[#BF8F3B]">{item.optimizerScore}%</p>
                    <span className={`text-xs ${item.staff.availability === 'available' ? 'text-green-400' : 'text-yellow-400'}`}>
                      {item.staff.availability}
                    </span>
                  </div>
                </div>
              ))}
              {optimizedStaff.length === 0 && (
                <p className="text-sm text-gray-400">No available staff match current filters.</p>
              )}
            </div>
          </div>

          <div className="relative overflow-hidden bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-xl rounded-2xl border border-gray-700/50 shadow-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Calendar size={20} className="text-[#BF8F3B]" />
                Shift Planner
              </h2>
              <span className={`text-xs ${performanceMetrics.coverageRisk > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                {performanceMetrics.coverageRisk > 0 ? `${performanceMetrics.coverageRisk} coverage risk` : 'Covered'}
              </span>
            </div>
            <div className="space-y-3">
              {shiftPlan.map(shift => (
                <div key={`${shift.id}-${shift.staffId}`} className="rounded-lg border border-gray-700/60 bg-gray-800/40 px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-white">{shift.eventName || 'Scheduled event'}</p>
                    <span className="text-xs text-gray-400">{new Date(shift.eventDate).toLocaleDateString()}</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-400">
                    {shift.staff?.staffName || 'Unmatched staff'} • {shift.status || 'pending'}
                  </p>
                </div>
              ))}
              {shiftPlan.length === 0 && (
                <p className="text-sm text-gray-400">No upcoming shifts found.</p>
              )}
            </div>
          </div>

          <div className="relative overflow-hidden bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-xl rounded-2xl border border-gray-700/50 shadow-xl p-5">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
              <TrendingUp size={20} className="text-[#BF8F3B]" />
              Performance Metrics
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-gray-700/60 bg-gray-800/40 p-3">
                <span className="text-xs text-gray-400">Utilization</span>
                <p className="text-2xl font-bold text-white">{performanceMetrics.utilization}%</p>
              </div>
              <div className="rounded-lg border border-gray-700/60 bg-gray-800/40 p-3">
                <span className="text-xs text-gray-400">Avg Score</span>
                <p className="text-2xl font-bold text-[#BF8F3B]">{performanceMetrics.averageScore}%</p>
              </div>
              <div className="rounded-lg border border-gray-700/60 bg-gray-800/40 p-3">
                <span className="text-xs text-gray-400">Assigned</span>
                <p className="text-2xl font-bold text-white">{performanceMetrics.assignedStaff}</p>
              </div>
              <div className="rounded-lg border border-gray-700/60 bg-gray-800/40 p-3">
                <span className="text-xs text-gray-400">Active</span>
                <p className="text-2xl font-bold text-white">{performanceMetrics.activeStaff}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Add/Edit Staff Form */}
        <div className="relative overflow-hidden bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-xl rounded-2xl border border-gray-700/50 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-[#BF8F3B]/5 to-transparent" />
          <div className="relative p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <UserPlus size={24} className="text-[#BF8F3B]" />
              {editingId ? 'Edit Staff Member' : 'Add New Staff Member'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
                <input
                  type="text"
                  value={formData.staffName}
                  onChange={e => handleChange('staffName', e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#BF8F3B]/50 focus:border-[#BF8F3B] transition-all"
                  placeholder="e.g. John Smith"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number</label>
                  <input
                    type="tel"
                    value={formData.staffPhone}
                    onChange={e => handleChange('staffPhone', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#BF8F3B]/50 focus:border-[#BF8F3B] transition-all"
                    placeholder="+27 123 456 789"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Role</label>
                  <input
                    type="text"
                    value={formData.role}
                    onChange={e => handleChange('role', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#BF8F3B]/50 focus:border-[#BF8F3B] transition-all"
                    placeholder="e.g. Sound Engineer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Hourly Rate (R)</label>
                <input
                  type="number"
                  value={formData.hourlyRate}
                  onChange={e => handleChange('hourlyRate', e.target.value)}
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#BF8F3B]/50 focus:border-[#BF8F3B] transition-all"
                  placeholder="e.g. 150"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={e => handleChange('notes', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#BF8F3B]/50 focus:border-[#BF8F3B] transition-all resize-none"
                  placeholder="Any additional notes..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 min-h-[48px] bg-gradient-to-r from-[#BF8F3B] to-[#A67B2E] hover:from-[#A67B2E] hover:to-[#8B6914] text-white font-medium py-3 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#BF8F3B]/25"
                >
                  {loading ? 'Saving...' : editingId ? 'Update Staff' : 'Add Staff'}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({ staffName: '', staffPhone: '', role: '', hourlyRate: '', notes: '' });
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
        </div>

        {/* Filters and Controls */}
        <div className="relative overflow-hidden bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-xl rounded-2xl border border-gray-700/50 shadow-xl">
          <div className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search staff by name, role, or phone..."
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#BF8F3B]/50 focus:border-[#BF8F3B] transition-all"
                  />
                </div>
              </div>

              {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-4 py-2.5 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-300 hover:text-white hover:border-[#BF8F3B]/50 transition-all flex items-center gap-2"
              >
                <Filter size={18} />
                Filters
                <ChevronDown size={16} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>

              {/* View Mode Toggle */}
              <div className="flex bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-4 py-2.5 transition-all flex items-center gap-2 ${
                    viewMode === 'grid' 
                      ? 'bg-[#BF8F3B] text-white' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Grid size={18} />
                  Grid
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-2.5 transition-all flex items-center gap-2 ${
                    viewMode === 'list' 
                      ? 'bg-[#BF8F3B] text-white' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <List size={18} />
                  List
                </button>
              </div>
            </div>

            {/* Expanded Filters */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t border-gray-700 grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Availability</label>
                  <select
                    value={availabilityFilter}
                    onChange={e => setAvailabilityFilter(e.target.value as AvailabilityFilter)}
                    className="w-full px-4 py-2.5 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#BF8F3B]/50"
                  >
                    <option value="all">All Staff</option>
                    <option value="available">Available</option>
                    <option value="busy">Busy</option>
                    <option value="off-duty">Off-duty</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Role</label>
                  <select
                    value={roleFilter}
                    onChange={e => setRoleFilter(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#BF8F3B]/50"
                  >
                    <option value="all">All Roles</option>
                    {uniqueRoles.map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Staff List/Grid */}
        <div className="relative overflow-hidden bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-xl rounded-2xl border border-gray-700/50 shadow-xl">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Users size={20} className="text-[#BF8F3B]" />
                Staff Directory ({filteredStaff.length})
              </h3>
              <button
                onClick={() => { fetchStaff(); fetchAssignments(); }}
                className="p-2 text-gray-400 hover:text-white transition-colors"
                title="Refresh"
              >
                <RefreshCw size={18} />
              </button>
            </div>

            {filteredStaff.length === 0 ? (
              <div className="text-center py-12">
                <Users className="mx-auto text-gray-600 mb-4" size={48} />
                <p className="text-gray-400">No staff members found matching your criteria.</p>
              </div>
            ) : (
              <div className={viewMode === 'grid' 
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" 
                : "space-y-3"
              }>
                {filteredStaff.map((staff) => {
                  const staffAssignments = getStaffAssignments(staff.id);
                  
                  return (
                    <div
                      key={staff.id}
                      className={`gradient-border group relative overflow-hidden bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-700/50 hover:border-[#BF8F3B]/50 transition-all duration-300 hover:shadow-lg hover:shadow-[#BF8F3B]/10 ${
                        viewMode === 'list' ? 'p-4' : 'p-5'
                      }`}
                    >
                      {/* Availability Indicator */}
                      <div className={`absolute top-0 left-0 w-full h-1 ${
                        staff.availability === 'available' ? 'bg-green-400' :
                        staff.availability === 'busy' ? 'bg-yellow-400' :
                        'bg-red-400'
                      }`} />

                      <div className={viewMode === 'list' ? 'flex items-center justify-between' : ''}>
                        <div className={viewMode === 'list' ? 'flex-1' : ''}>
                          {/* Header */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h4 className="text-lg font-bold text-white group-hover:text-[#BF8F3B] transition-colors">
                                {staff.staffName}
                              </h4>
                              {staff.role && (
                                <p className="text-sm text-[#BF8F3B] font-medium">{staff.role}</p>
                              )}
                            </div>
                            
                            {/* Availability Badge */}
                            <button
                              onClick={() => {
                                const nextStatus = staff.availability === 'available' ? 'busy' :
                                                  staff.availability === 'busy' ? 'off-duty' : 'available';
                                handleAvailabilityChange(staff.id, nextStatus);
                              }}
                              className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${getAvailabilityColor(staff.availability)} hover:opacity-80 transition-opacity`}
                              title="Click to change availability"
                            >
                              {getAvailabilityIcon(staff.availability)}
                              {staff.availability}
                            </button>
                          </div>

                          {/* Contact Info */}
                          <div className="space-y-2 mb-3">
                            {staff.staffPhone && (
                              <div className="flex items-center gap-2 text-sm text-gray-400">
                                <Phone size={14} />
                                <span>{staff.staffPhone}</span>
                              </div>
                            )}
                            {staff.hourlyRate && (
                              <div className="flex items-center gap-2 text-sm text-gray-400">
                                <TrendingUp size={14} />
                                <span>R{staff.hourlyRate}/hr</span>
                              </div>
                            )}
                          </div>

                          {/* Assignments */}
                          {staffAssignments.length > 0 && (
                            <div className="mb-3">
                              <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                                <Calendar size={12} />
                                Assigned to {staffAssignments.length} event(s)
                              </p>
                              <div className="space-y-1">
                                {staffAssignments.slice(0, 2).map(assignment => (
                                  <div key={assignment.id} className="text-xs text-gray-400 bg-gray-800/50 rounded px-2 py-1">
                                    {assignment.eventName} • {new Date(assignment.eventDate).toLocaleDateString()}
                                  </div>
                                ))}
                                {staffAssignments.length > 2 && (
                                  <p className="text-xs text-gray-500">+{staffAssignments.length - 2} more...</p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Notes */}
                          {staff.notes && (
                            <p className="text-xs text-gray-500 mb-3 italic">{staff.notes}</p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className={`flex gap-2 ${viewMode === 'list' ? 'ml-4' : 'mt-3'}`}>
                          {staff.staffPhone && (
                            <button
                              onClick={() => sendWhatsApp(staff)}
                              disabled={whatsappSending === staff.id}
                              className="p-2 text-gray-400 hover:text-green-400 transition-colors disabled:opacity-50"
                              title="Send WhatsApp"
                            >
                              <Send size={16} />
                            </button>
                          )}
                          {staff.staffPhone && (
                            <a
                              href={`tel:${staff.staffPhone}`}
                              className="p-2 text-gray-400 hover:text-blue-400 transition-colors"
                              title="Call Staff"
                            >
                              <Phone size={16} />
                            </a>
                          )}
                          <button
                            onClick={() => alert(`Assign ${staff.staffName} to event - Feature coming soon!`)}
                            className="p-2 text-gray-400 hover:text-[#BF8F3B] transition-colors"
                            title="Assign to Event"
                          >
                            <Calendar size={16} />
                          </button>
                          <button
                            onClick={() => handleEdit(staff)}
                            className="p-2 text-gray-400 hover:text-[#BF8F3B] transition-colors"
                            title="Edit"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(staff.id)}
                            className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Staff;
