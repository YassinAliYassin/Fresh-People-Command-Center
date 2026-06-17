/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#FAF9F6] p-6">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-red-50 border border-red-200 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900 tracking-wide mb-2">
                System Error
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                An unexpected error occurred in the Command Center. Your data is safe — stored locally in your browser.
              </p>
            </div>
            {this.state.error && (
              <div className="bg-slate-100 border border-slate-200 rounded-lg p-3 text-left">
                <p className="text-[10px] font-mono text-slate-500 break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}
            <button
              onClick={this.handleReload}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gold-600 to-gold-500 text-white font-display font-bold text-[10px] tracking-widest uppercase rounded-lg shadow-sm cursor-pointer hover:brightness-110 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Reload Command Center
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
