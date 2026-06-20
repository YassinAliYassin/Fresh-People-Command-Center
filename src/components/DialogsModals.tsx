/**
 * DialogsModals — Consolidated modal dialogs extracted from App.tsx
 *
 * Contains:
 * 1. Apple ID & iCloud Calendar Authentication Modal
 * 2. Delete Confirmation Modal
 * 3. Keyboard Shortcuts Help Modal
 */

import React from 'react';
import { X, Apple, RefreshCw, Trash2 } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface DialogsModalsProps {
  // Apple Auth Modal
  isAppleAuthModalOpen: boolean;
  setIsAppleAuthModalOpen: (v: boolean) => void;
  appleEmailInput: string;
  setAppleEmailInput: (v: string) => void;
  applePasswordInput: string;
  setApplePasswordInput: (v: string) => void;
  appleFeedUrl: string;
  setAppleFeedUrl: (v: string) => void;
  isLinkingApple: boolean;
  setIsLinkingApple: (v: boolean) => void;
  handleAppleLoginSubmit: (e: React.FormEvent) => void;

  // Delete Confirmation Modal
  showDeleteConfirm: string | null;
  setShowDeleteConfirm: (v: string | null) => void;
  deleteEvent: (id: string) => void;

  // Shortcuts Modal
  showShortcutsModal: boolean;
  setShowShortcutsModal: (v: boolean) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

const DialogsModals: React.FC<DialogsModalsProps> = ({
  // Apple Auth
  isAppleAuthModalOpen,
  setIsAppleAuthModalOpen,
  appleEmailInput,
  setAppleEmailInput,
  applePasswordInput,
  setApplePasswordInput,
  appleFeedUrl,
  setAppleFeedUrl,
  isLinkingApple,
  setIsLinkingApple,
  handleAppleLoginSubmit,
  // Delete Confirm
  showDeleteConfirm,
  setShowDeleteConfirm,
  deleteEvent,
  // Shortcuts
  showShortcutsModal,
  setShowShortcutsModal,
}) => {
  return (
    <>
      {/* ========================================================================= */}
      {/* APPLE ID & ICLOUD CALENDAR AUTHENTICATION DIALOG MODULE                   */}
      {/* ========================================================================= */}
      {isAppleAuthModalOpen && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-[340px] p-6 bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-2xl select-none">
            <button
              onClick={() => setIsAppleAuthModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center space-y-3 pt-2">
              <Apple className="w-10 h-10 text-white mx-auto animate-pulse" />
              <h3 className="text-md font-bold tracking-tight">Sign in with Apple ID</h3>
              <p className="text-[10px] text-slate-400 leading-normal font-medium max-w-[240px] mx-auto">
                Link with your iCloud account to enable real-time calendar synchronization for your events.
              </p>
            </div>

            <form onSubmit={handleAppleLoginSubmit} className="mt-6 space-y-4">
              <div className="space-y-1">
                <label htmlFor="apple_id_email" className="text-[8px] text-slate-400 uppercase tracking-widest block font-bold font-mono">Apple ID</label>
                <input
                  type="email"
                  id="apple_id_email"
                  value={appleEmailInput}
                  onChange={(e) => setAppleEmailInput(e.target.value)}
                  required
                  placeholder="name@icloud.com"
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-white px-3 py-2 rounded-lg focus:border-white focus:outline-hidden font-bold"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="apple_id_password" className="text-[8px] text-slate-400 uppercase tracking-widest block font-bold font-mono">Password / App-Specific Code</label>
                <input
                  type="password"
                  id="apple_id_password"
                  value={applePasswordInput}
                  onChange={(e) => setApplePasswordInput(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-white px-3 py-2 rounded-lg focus:border-white focus:outline-hidden font-bold"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="apple_id_feed" className="text-[8px] text-slate-400 uppercase tracking-widest block font-bold font-mono">iCloud iCal Publish Feed URL</label>
                <input
                  type="text"
                  id="apple_id_feed"
                  value={appleFeedUrl}
                  onChange={(e) => setAppleFeedUrl(e.target.value)}
                  placeholder="Paste Apple Published iCal link hps://p56-caldav..."
                  className="w-full bg-slate-950 border border-slate-800 text-[9px] text-slate-200 px-3 py-1.5 rounded-lg focus:border-white focus:outline-hidden font-mono"
                />
              </div>

              <p className="text-[8px] text-slate-500 leading-normal font-semibold text-center italic">
                Your credentials are encrypted end-to-end directly with Apple ID sync hosts securely.
              </p>

              <div className="flex space-x-2 pt-2 text-[9px] uppercase tracking-wider font-extrabold font-mono">
                <button
                  type="button"
                  onClick={() => setIsAppleAuthModalOpen(false)}
                  className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-755 text-slate-300 rounded-lg cursor-pointer transition-all border border-slate-700/50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLinkingApple}
                  className="flex-1 py-1.5 bg-white hover:bg-slate-100 text-black rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5"
                >
                  {isLinkingApple ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      Linking...
                    </>
                  ) : (
                    'Link Account'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-sm p-6 glass-panel rounded-lg shadow-2xl bg-white/95 border border-red-200/40 fade-in-up">
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-50 border border-red-200 mb-4">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="font-display text-sm tracking-[0.15em] text-slate-900 font-bold uppercase">Confirm Deletion</h3>
              <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
                Are you sure you want to permanently delete this event? This action cannot be undone and will remove the event from all logs.
              </p>
            </div>
            <div className="flex space-x-2 pt-2 text-[9px] uppercase tracking-wider font-extrabold font-mono">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer transition-all border border-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteEvent(showDeleteConfirm)}
                className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3 h-3" />
                Delete Event
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Help Modal */}
      {showShortcutsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowShortcutsModal(false)}>
          <div className="w-full max-w-md p-6 glass-panel rounded-xl shadow-2xl bg-white/95 border border-gold-200/50 fade-in-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5 border-b border-slate-200/60 pb-3">
              <h3 className="font-display text-sm tracking-[0.15em] text-slate-900 font-bold uppercase flex items-center gap-2">
                ⌨️ Keyboard Shortcuts
              </h3>
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer select-none"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-[10px]">
              <div className="grid grid-cols-2 gap-2">
                <div className="text-slate-500 font-bold uppercase tracking-wider">Navigation</div>
                <div className="text-slate-400 font-mono text-[8px] text-right">Press ? to toggle</div>
              </div>
              {[
                { key: 'Alt + C', desc: 'Switch to Clients tab' },
                { key: 'Alt + V', desc: 'Switch to Venues tab' },
                { key: 'Alt + S', desc: 'Switch to Staff tab' },
                { key: 'Alt + E', desc: 'Scroll to Event form' },
                { key: 'Ctrl + N', desc: 'New event (scroll to form)' },
                { key: 'Ctrl + B', desc: 'Export JSON backup' },
                { key: 'Ctrl + Z', desc: 'Undo last event change' },
                { key: 'Ctrl + Shift + Z', desc: 'Redo last undone change' },
                { key: 'Ctrl + Y', desc: 'Redo (alternative)' },
                { key: 'Esc', desc: 'Close modal / Cancel edit' },
                { key: '?', desc: 'Show this help panel' },
              ].map((shortcut, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
                  <span className="text-slate-700 font-medium">{shortcut.desc}</span>
                  <kbd className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[8px] font-mono font-bold text-slate-600 shadow-sm">
                    {shortcut.key}
                  </kbd>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200/60 text-center">
              <p className="text-[8px] text-slate-400 uppercase tracking-widest font-bold">
                Shortcuts disabled while typing in input fields
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DialogsModals;
