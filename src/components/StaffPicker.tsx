import React, { useState, useEffect } from 'react';
import { Search, UserPlus, UserMinus, Users } from 'lucide-react';
import { Staff } from '../types';

interface StaffPickerProps {
  eventId: string;
  assignedStaff: Staff[];
  onAssign: (staffId: number) => void;
  onUnassign: (staffId: number) => void;
}

const StaffPicker: React.FC<StaffPickerProps> = ({ eventId, assignedStaff, onAssign, onUnassign }) => {
  const [allStaff, setAllStaff] = useState<Staff[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Fetch all staff
  useEffect(() => {
    fetch(`http://${window.location.hostname}:3001/api/staff`)
      .then(res => res.json())
      .then(data => {
        setAllStaff(data.staff || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching staff:', err);
        setLoading(false);
      });
  }, []);

  // Filter available staff (not already assigned)
  const assignedIds = new Set(assignedStaff.map(s => s.id));
  const availableStaff = allStaff.filter(s => !assignedIds.has(s.id));

  // Filter by search term
  const filterBySearch = (staff: Staff[]) => {
    if (!searchTerm) return staff;
    const term = searchTerm.toLowerCase();
    return staff.filter(s => 
      s.fullName.toLowerCase().includes(term) || 
      s.role?.toLowerCase().includes(term)
    );
  };

  const filteredAvailable = filterBySearch(availableStaff);
  const filteredAssigned = filterBySearch(assignedStaff);

  if (loading) return <div className="text-gray-400 p-4">Loading staff...</div>;

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <Users className="w-5 h-5 text-blue-400" />
        Staff Assignment
      </h3>

      {/* Search Bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search staff by name or role..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Dual Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Available Staff */}
        <div>
          <h4 className="text-sm font-medium text-gray-400 mb-2">
            Available ({filteredAvailable.length})
          </h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {filteredAvailable.length === 0 ? (
              <p className="text-gray-500 text-sm italic">No available staff</p>
            ) : (
              filteredAvailable.map(staff => (
                <div
                  key={staff.id}
                  className="flex items-center justify-between bg-gray-700 p-3 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{staff.fullName}</p>
                    {staff.role && <p className="text-xs text-gray-400">{staff.role}</p>}
                  </div>
                  <button
                    onClick={() => onAssign(staff.id)}
                    className="ml-2 p-2 text-green-400 hover:text-green-300 hover:bg-gray-600 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                    title={`Assign ${staff.fullName}`}
                  >
                    <UserPlus className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Assigned Staff */}
        <div>
          <h4 className="text-sm font-medium text-gray-400 mb-2">
            Assigned ({filteredAssigned.length})
          </h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {filteredAssigned.length === 0 ? (
              <p className="text-gray-500 text-sm italic">No staff assigned</p>
            ) : (
              filteredAssigned.map(staff => (
                <div
                  key={staff.id}
                  className="flex items-center justify-between bg-blue-900/30 p-3 rounded-lg border border-blue-800"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{staff.fullName}</p>
                    {staff.role && <p className="text-xs text-gray-400">{staff.role}</p>}
                    {staff.phone && <p className="text-xs text-gray-500">{staff.phone}</p>}
                  </div>
                  <button
                    onClick={() => onUnassign(staff.id)}
                    className="ml-2 p-2 text-red-400 hover:text-red-300 hover:bg-gray-600 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                    title={`Remove ${staff.fullName}`}
                  >
                    <UserMinus className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffPicker;
