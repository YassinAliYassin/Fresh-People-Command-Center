/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { Download, ScrollText, CreditCard, Upload, AlertTriangle } from 'lucide-react';

interface PayrollCycleBounds {
  label: string;
  startDateStr: string;
  endDateStr: string;
}

interface BackupData {
  exportDate: string;
  version: string;
  events: any[];
  clients: any[];
  venues: any[];
  staff: any[];
  activityLogs: any[];
}

interface ExportToolbarProps {
  payrollCycleBounds: PayrollCycleBounds;
  handleExportEventsCSV: () => void;
  handleExportPayrollCSV: () => void;
  handleExportJSON: () => void;
  onImportBackup: (data: BackupData, mode: 'replace' | 'merge') => void;
}

export default function ExportToolbar({
  payrollCycleBounds,
  handleExportEventsCSV,
  handleExportPayrollCSV,
  handleExportJSON,
  onImportBackup,
}: ExportToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [pendingImportData, setPendingImportData] = useState<BackupData | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string);
        if (!json.events || !json.clients || !json.venues || !json.staff) {
          setImportError('Invalid backup file: missing required data fields (events, clients, venues, staff).');
          return;
        }
        setPendingImportData(json as BackupData);
        setShowImportConfirm(true);
      } catch {
        setImportError('Failed to parse backup file. Please ensure it is a valid JSON backup.');
      }
    };
    reader.readAsText(file);
    // Reset input so the same file can be re-selected
    e.target.value = '';
  };

  const handleImportAction = (mode: 'replace' | 'merge') => {
    if (pendingImportData) {
      onImportBackup(pendingImportData, mode);
    }
    setShowImportConfirm(false);
    setPendingImportData(null);
  };

  const handleCancelImport = () => {
    setShowImportConfirm(false);
    setPendingImportData(null);
    setImportError(null);
  };

  return (
    <>
      {/* Premium Quiet Luxury Operational Export Control Panel */}
      <section className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6 select-none" id="export_control_toolbar">
        <div className="p-4 rounded-lg border border-gold-300/30 bg-white/95 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded bg-gold-50 border border-gold-300/30">
              <Download className="w-4 h-4 text-gold-600 animate-bounce" />
            </div>
            <div>
              <h3 className="text-[10px] uppercase font-display tracking-[0.2em] text-slate-905 font-bold">Operational Export Controls</h3>
              <p className="text-[8px] uppercase tracking-widest text-slate-500 font-mono mt-0.5">Secure CSV Ledger Spreads &bull; Ready for Audit Logs</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
            {/* Import Button */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="py-1.5 px-3.5 border border-emerald-200 hover:border-emerald-400 text-emerald-700 font-mono text-[9px] uppercase tracking-widest hover:bg-emerald-50 transition-all rounded flex items-center gap-1.5 cursor-pointer font-bold bg-emerald-50/50"
            >
              <Upload className="w-3 h-3 text-emerald-600" /> Import Backup
            </button>
            <button
              onClick={handleExportEventsCSV}
              id="export_events_csv_trigger"
              className="py-1.5 px-3.5 border border-slate-205 hover:border-gold-500/30 text-slate-800 font-mono text-[9px] uppercase tracking-widest hover:bg-gold-50 transition-all rounded flex items-center gap-1.5 cursor-pointer font-semibold"
            >
              <ScrollText className="w-3 h-3 text-gold-600" /> Export Events (.CSV)
            </button>
            <button
              onClick={handleExportPayrollCSV}
              id="export_payroll_csv_trigger"
              className="py-1.5 px-3.5 border border-gold-300/30 text-gold-800 font-mono text-[9px] uppercase tracking-widest hover:bg-gold-50 transition-all rounded flex items-center gap-1.5 cursor-pointer font-bold bg-gold-50/50"
            >
              <CreditCard className="w-3 h-3 text-gold-600" /> Export Payroll &bull; {payrollCycleBounds.label} (.CSV)
            </button>
            <button
              onClick={handleExportJSON}
              id="export_json_backup_trigger"
              className="py-1.5 px-3.5 border border-blue-200 hover:border-blue-400 text-blue-700 font-mono text-[9px] uppercase tracking-widest hover:bg-blue-50 transition-all rounded flex items-center gap-1.5 cursor-pointer font-bold bg-blue-50/50"
            >
              <Download className="w-3 h-3 text-blue-600" /> Full Backup (.JSON)
            </button>
          </div>
        </div>

        {/* Import Error Banner */}
        {importError && (
          <div className="mt-3 p-3 rounded-lg border border-red-200 bg-red-50 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-[10px] text-red-700 font-medium">{importError}</p>
            <button
              onClick={() => setImportError(null)}
              className="ml-auto text-[9px] text-red-500 hover:text-red-700 font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}
      </section>

      {/* Import Confirmation Modal */}
      {showImportConfirm && pendingImportData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full mx-4 p-6 border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-amber-50 border border-amber-200">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <h2 className="font-display text-sm font-bold tracking-wider text-slate-900 uppercase">Import Backup</h2>
            </div>

            <p className="text-xs text-slate-600 mb-3 leading-relaxed">
              Backup from <strong>{new Date(pendingImportData.exportDate).toLocaleString()}</strong> contains:
            </p>

            <div className="bg-slate-50 rounded-md p-3 mb-4 border border-slate-200">
              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                <div className="flex justify-between"><span className="text-slate-500">Events:</span><span className="font-bold text-slate-800">{pendingImportData.events.length}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Clients:</span><span className="font-bold text-slate-800">{pendingImportData.clients.length}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Venues:</span><span className="font-bold text-slate-800">{pendingImportData.venues.length}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Staff:</span><span className="font-bold text-slate-800">{pendingImportData.staff.length}</span></div>
                {pendingImportData.activityLogs && (
                  <div className="flex justify-between col-span-2"><span className="text-slate-500">Activity Logs:</span><span className="font-bold text-slate-800">{pendingImportData.activityLogs.length}</span></div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleImportAction('replace')}
                className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-display text-[10px] tracking-[0.15em] uppercase rounded font-semibold cursor-pointer transition-all flex items-center justify-center gap-2"
              >
                <Upload className="w-3.5 h-3.5" /> Replace All Data
              </button>
              <p className="text-[8px] text-red-500 text-center font-medium -mt-1 mb-1">
                ⚠ This will permanently delete all existing data
              </p>

              <button
                onClick={() => handleImportAction('merge')}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-display text-[10px] tracking-[0.15em] uppercase rounded font-semibold cursor-pointer transition-all flex items-center justify-center gap-2"
              >
                <Upload className="w-3.5 h-3.5" /> Merge with Existing
              </button>
              <p className="text-[8px] text-blue-500 text-center font-medium -mt-1 mb-1">
                Adds new records; existing records with matching IDs are kept
              </p>

              <button
                onClick={handleCancelImport}
                className="w-full py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-mono text-[9px] uppercase tracking-widest rounded cursor-pointer font-medium transition-all mt-2"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
