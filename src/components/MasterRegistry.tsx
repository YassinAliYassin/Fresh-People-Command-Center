/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { MapPin } from 'lucide-react';
import { Client, Venue, Staff } from '../types';

type RegistryTab = 'clients' | 'venues' | 'staff';

interface MasterRegistryProps {
  activeTab: RegistryTab;
  switchTab: (tab: RegistryTab) => void;
  clients: Client[];
  venues: Venue[];
  staff: Staff[];
  onAddClient: () => void;
  onAddVenue: () => void;
  onAddStaff: () => void;
}

const MasterRegistry: React.FC<MasterRegistryProps> = ({
  activeTab,
  switchTab,
  clients,
  venues,
  staff,
  onAddClient,
  onAddVenue,
  onAddStaff,
}) => {
  return (
    <div className="bg-white border border-slate-200/60 rounded-xl shadow-sm overflow-hidden">
      {/* Tab Header */}
      <div className="px-4 pt-3 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-4 bg-gold-500 rounded-full"></div>
          <span className="text-[10px] font-display text-slate-700 uppercase tracking-[0.15em] font-bold">
            Master Registries
          </span>
        </div>
        <div className="flex space-x-2 bg-slate-100/60 p-1 rounded border border-slate-200/40">
          <button
            onClick={() => switchTab('clients')}
            className={`flex-1 py-1.5 text-center text-[10px] font-bold cursor-pointer rounded transition-all tracking-widest uppercase ${
              activeTab === 'clients' ? 'text-gold-700 bg-white border border-gold-200/50 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Clients ({clients.length})
          </button>
          <button
            onClick={() => switchTab('venues')}
            className={`flex-1 py-1.5 text-center text-[10px] font-bold cursor-pointer rounded transition-all tracking-widest uppercase ${
              activeTab === 'venues' ? 'text-gold-700 bg-white border border-gold-200/50 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Venues ({venues.length})
          </button>
          <button
            onClick={() => switchTab('staff')}
            className={`flex-1 py-1.5 text-center text-[10px] font-bold cursor-pointer rounded transition-all tracking-widest uppercase ${
              activeTab === 'staff' ? 'text-gold-700 bg-white border border-gold-200/50 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Staff ({staff.length})
          </button>
        </div>
      </div>

      {/* List details container */}
      <div className="overflow-y-auto max-h-[220px] space-y-3.5 pr-1 font-mono text-[9px] text-slate-700 leading-relaxed select-all font-semibold p-4 pt-3">
        {activeTab === 'clients' && (
          <div className="space-y-2">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[9px] text-slate-705 uppercase tracking-widest font-bold block">Client Accounts</span>
              <button
                onClick={onAddClient}
                className="text-[8px] text-gold-700 border border-gold-300 hover:border-gold-500 hover:bg-gold-50/55 px-2.5 py-1 rounded transition-all font-mono font-bold"
              >
                + Ingest Client
              </button>
            </div>
            {clients.length === 0 ? (
              <div className="text-[10px] text-slate-400 text-center py-4">No clients registered.</div>
            ) : (
              clients.map((c) => (
                <div key={c.id} className="p-3 bg-white border border-slate-200/60 rounded-md hover:border-gold-500/35 transition-all shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-800 tracking-wide font-bold">{c.name}</span>
                    <span className="text-[8px] uppercase tracking-widest px-1.5 py-0.5 bg-gold-50 text-gold-700 font-bold border border-gold-200/40 rounded">Premium Account</span>
                  </div>
                  <p className="text-[9px] text-slate-600 mt-1 font-medium">Contact: {c.contact} &bull; {c.phone}</p>
                  {c.notes && <p className="text-[9px] text-slate-600 italic mt-1 bg-slate-50 border border-slate-100 p-1.5 rounded">{c.notes}</p>}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'venues' && (
          <div className="space-y-2">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[9px] text-slate-705 uppercase tracking-widest font-bold block">Indexed Venues</span>
              <button
                onClick={onAddVenue}
                className="text-[8px] text-gold-700 border border-gold-300 hover:border-gold-500 hover:bg-gold-50/55 px-2.5 py-1 rounded transition-all font-mono font-bold"
              >
                + Index Venue
              </button>
            </div>
            {venues.length === 0 ? (
              <div className="text-[10px] text-slate-400 text-center py-4">No venues indexed.</div>
            ) : (
              venues.map((v) => (
                <div key={v.id} className="p-3 bg-white border border-slate-200/60 rounded-md hover:border-gold-500/35 transition-all shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-800 tracking-wide font-bold">{v.name}</span>
                    <span className="text-[8px] uppercase tracking-widest px-1.5 py-0.5 bg-slate-100 text-slate-600 font-bold border border-slate-205 rounded">{v.tier}</span>
                  </div>
                  <p className="text-[9px] text-slate-600 mt-1 flex items-center gap-1 font-medium">
                    <MapPin className="w-3 h-3 text-gold-500" />
                    <span>{v.address}</span>
                  </p>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'staff' && (
          <div className="space-y-2">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[9px] text-slate-705 uppercase tracking-widest font-bold block">Vetted Agency Staff</span>
              <button
                onClick={onAddStaff}
                className="text-[8px] text-gold-700 border border-gold-300 hover:border-gold-500 hover:bg-gold-50/55 px-2.5 py-1 rounded transition-all font-mono font-bold"
              >
                + Register Staff
              </button>
            </div>
            {staff.length === 0 ? (
              <div className="text-[10px] text-slate-400 text-center py-4">No staff members enrolled.</div>
            ) : (
              staff.map((s) => (
                <div key={s.id} className="p-3 bg-white border border-slate-200/60 rounded-md hover:border-gold-500/35 transition-all shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-800 font-bold">{s.name} {s.surname}</span>
                    <span className="text-[8.5px] uppercase tracking-widest px-1.5 py-0.5 bg-gold-50 text-gold-700 font-bold border border-gold-200/40 rounded italic">{s.role}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1 text-[9px] text-slate-600 font-mono font-semibold">
                    <span>Rate: R{s.rate}/h</span>
                    <span>{s.phone}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MasterRegistry;
