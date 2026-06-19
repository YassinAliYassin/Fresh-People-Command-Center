/**
 * StaffAllocationChecklist Component
 * Extracted from App.tsx Event Architect form for maintainability.
 * Renders the staff checkbox list for event allocation.
 */

import React from 'react';
import type { Staff } from '../types';

export interface StaffAllocationChecklistProps {
  staff: Staff[];
  evSelectedStaffIds: string[];
  onToggleStaff: (staffId: string) => void;
}

export const StaffAllocationChecklist: React.FC<StaffAllocationChecklistProps> = ({
  staff,
  evSelectedStaffIds,
  onToggleStaff,
}) => {
  const mappedRosterCount = evSelectedStaffIds.length;

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center mb-1 animate-pulse">
        <label className="text-[8px] text-gold-700 uppercase tracking-widest font-bold block">Allocate Staff Members</label>
        <span className="text-[8px] font-mono text-slate-500 font-bold">{mappedRosterCount} Selected</span>
      </div>
      <div id="roster_checklist" className="max-h-24 overflow-y-auto border border-slate-200 bg-white shadow-xs rounded-md p-1.5 space-y-1.5 divide-y divide-slate-100">
        {staff.length === 0 ? (
          <div className="text-[9px] text-slate-400 text-center py-2">Add staff to enable dispatch maps.</div>
        ) : (
          staff.map((s) => {
            const isSelected = evSelectedStaffIds.includes(s.id);
            return (
              <div
                key={s.id}
                onClick={() => onToggleStaff(s.id)}
                className="flex items-center space-x-2 py-1 cursor-pointer select-none text-[10px]"
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  readOnly
                  className="rounded text-gold-600 focus:ring-0 w-3 h-3 bg-white border-slate-300 cursor-pointer"
                />
                <span className={`flex-1 transition-all ${isSelected ? 'text-gold-700 font-bold' : 'text-slate-650'}`}>
                  {s.name} {s.surname} ({s.role})
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
