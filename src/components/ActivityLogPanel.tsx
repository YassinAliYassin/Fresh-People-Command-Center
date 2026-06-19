/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ScrollText } from 'lucide-react';
import { ActivityLog } from '../types';

type LogTypeFilter = 'all' | 'auth' | 'event_create' | 'event_delete' | 'sync' | 'direct_booking' | 'call' | 'staff_reply';

interface ActivityLogPanelProps {
  activityLogs: ActivityLog[];
  onClearLogs: () => void;
}

const ActivityLogPanel: React.FC<ActivityLogPanelProps> = ({
  activityLogs,
  onClearLogs,
}) => {
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [logTypeFilter, setLogTypeFilter] = useState<LogTypeFilter>('all');

  const filteredLogs = activityLogs.filter(log => {
    const matchesSearch = !logSearchQuery ||
      log.message.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
      log.operator.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
      log.type.toLowerCase().includes(logSearchQuery.toLowerCase());
    const matchesType = logTypeFilter === 'all' || log.type === logTypeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="glass-panel rounded-lg p-5 shadow-luxury-glow flex flex-col min-h-[160px] max-h-[220px]">
      <div className="flex items-center justify-between mb-3 border-b border-slate-205 pb-2">
        <span className="text-[10px] uppercase tracking-[0.15em] text-slate-800 font-display flex items-center gap-1.5 font-bold">
          <ScrollText className="w-4 h-4 text-gold-600 animate-pulse" /> Operational Pipeline Buffer
        </span>
        <button
          onClick={onClearLogs}
          className="text-[8px] text-slate-500 hover:text-red-500 transition-all font-mono uppercase tracking-widest font-bold cursor-pointer"
        >
          Flush Logs
        </button>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex gap-1.5 mb-2">
        <input
          type="text"
          placeholder="Search logs..."
          value={logSearchQuery}
          onChange={(e) => setLogSearchQuery(e.target.value)}
          className="flex-1 bg-white border border-slate-200 text-[9px] text-slate-900 px-2 py-1 rounded focus:border-gold-500 focus:outline-none placeholder-slate-400 font-medium"
        />
        <select
          value={logTypeFilter}
          onChange={(e) => setLogTypeFilter(e.target.value as LogTypeFilter)}
          className="bg-white border border-slate-200 text-[9px] text-slate-700 px-1.5 py-1 rounded focus:border-gold-500 focus:outline-none font-bold cursor-pointer"
        >
          <option value="all">All Types</option>
          <option value="auth">Auth</option>
          <option value="event_create">Events</option>
          <option value="event_delete">Deletions</option>
          <option value="sync">Sync</option>
          <option value="direct_booking">Bookings</option>
          <option value="call">Calls</option>
          <option value="staff_reply">RSVP</option>
        </select>
        {(logSearchQuery || logTypeFilter !== 'all') && (
          <button
            onClick={() => { setLogSearchQuery(''); setLogTypeFilter('all'); }}
            className="text-[8px] text-slate-500 hover:text-red-600 border border-slate-200 hover:border-red-300 px-1.5 py-1 rounded transition-all font-mono uppercase tracking-widest font-bold bg-white cursor-pointer"
          >
            ✕
          </button>
        )}
      </div>

      <div id="activity_feed_box" className="flex-1 overflow-y-auto space-y-3.5 pr-1 font-mono text-[9px] text-slate-700 leading-relaxed select-all font-semibold">
        {filteredLogs.map((log, index) => (
          <div key={`${log.id}-${index}`} className="relative pl-3.5 border-l border-slate-200 hover:border-gold-400 transition-all animate-fade-in">
            {/* Small pointer glyph for active logs */}
            <div
              className={`absolute left-[-2.5px] top-1 w-1.5 h-1.5 rounded-full ${
                log.isUrgent ? 'bg-red-550 animate-ping' : 'bg-gold-600/60'
              }`}
            ></div>
            <div className="flex justify-between text-[8px] text-slate-500 font-extrabold mb-0.5">
              <span>[{log.operator}] &bull; {log.type.toUpperCase()}</span>
              <span>{log.timestamp.split('T')[1].slice(0, 8)}</span>
            </div>
            <p className={`${log.isUrgent ? 'text-red-600 font-extrabold' : 'text-slate-800 font-bold'}`}>
              {log.message}
            </p>
          </div>
        ))}
        {filteredLogs.length === 0 && (
          <div className="text-center py-4 text-slate-400 text-[10px] font-medium">
            {activityLogs.length === 0 ? 'No activity logs yet.' : 'No logs match your filter.'}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityLogPanel;
