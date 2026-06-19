/**
 * EventTemplatesPanel Component
 * Extracted from App.tsx Event Architect form for maintainability.
 * Manages event templates: save current form state, apply, and delete templates.
 */

import React from 'react';
import type { EventTemplate, Client, Venue } from '../types';

export interface EventTemplatesPanelProps {
  showTemplatePanel: boolean;
  setShowTemplatePanel: (show: boolean) => void;
  templateName: string;
  setTemplateName: (name: string) => void;
  eventTemplates: EventTemplate[];
  clients: Client[];
  venues: Venue[];
  // Current form field values (needed for saving a template)
  evTitle: string;
  evClient: string;
  evVenue: string;
  evTimeStart: string;
  evTimeEnd: string;
  evSelectedStaffIds: string[];
  evNotes: string;
  evClientRequirements: string;
  isDirectBookingChecked: boolean;
  // Callbacks
  onSaveTemplate: () => void;
  onApplyTemplate: (tmpl: EventTemplate) => void;
  onDeleteTemplate: (id: string) => void;
}

export const EventTemplatesPanel: React.FC<EventTemplatesPanelProps> = ({
  showTemplatePanel,
  setShowTemplatePanel,
  templateName,
  setTemplateName,
  eventTemplates,
  clients,
  venues,
  evTitle,
  evClient,
  evVenue,
  evTimeStart,
  evTimeEnd,
  evSelectedStaffIds,
  evNotes,
  evClientRequirements,
  isDirectBookingChecked,
  onSaveTemplate,
  onApplyTemplate,
  onDeleteTemplate,
}) => {
  if (!showTemplatePanel) return null;

  return (
    <div className="mb-4 p-3 bg-violet-50/50 border border-violet-200 rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[8px] text-violet-700 uppercase tracking-widest font-bold">Event Templates</span>
        <button
          type="button"
          onClick={() => setShowTemplatePanel(false)}
          className="text-[8px] text-violet-400 hover:text-violet-700 cursor-pointer"
        >✕</button>
      </div>
      {/* Save current form as template */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          placeholder="Template name..."
          className="flex-1 bg-white border border-violet-200 text-[10px] text-slate-900 px-2 py-1.5 rounded focus:border-violet-400 focus:outline-hidden placeholder-slate-400"
        />
        <button
          type="button"
          onClick={onSaveTemplate}
          className="text-[8px] px-3 py-1.5 bg-violet-600 text-white rounded font-bold uppercase tracking-wider hover:bg-violet-700 transition-all cursor-pointer"
        >
          Save Current
        </button>
      </div>
      {/* Template list */}
      {eventTemplates.length === 0 ? (
        <p className="text-[9px] text-slate-400 italic">No templates yet. Fill the form above and save as template.</p>
      ) : (
        <div className="space-y-1.5 max-h-40 overflow-y-auto">
          {eventTemplates.map((tmpl) => {
            const clientObj = clients.find(c => c.id === tmpl.clientId);
            const venueObj = venues.find(v => v.id === tmpl.venueId);
            return (
              <div key={tmpl.id} className="flex items-center justify-between bg-white border border-violet-100 rounded px-2 py-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[9px] font-bold text-slate-800 truncate">{tmpl.name}</span>
                  <span className="text-[7px] text-slate-500 truncate">
                    {clientObj?.name || '?'} @ {venueObj?.name || '?'} · {tmpl.startTime}-{tmpl.endTime} · {tmpl.staffIds.length} staff
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => onApplyTemplate(tmpl)}
                    className="text-[7px] px-2 py-0.5 bg-violet-100 text-violet-700 rounded font-bold hover:bg-violet-200 transition-all cursor-pointer"
                  >
                    Apply
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteTemplate(tmpl.id)}
                    className="text-[7px] px-1.5 py-0.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded font-bold transition-all cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
