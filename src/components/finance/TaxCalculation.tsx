/**
 * Tax Calculation Component
 * Calculates taxes for invoices and displays tax breakdown
 */

import React, { useState, useMemo } from 'react';
import { 
  Calculator, 
  DollarSign, 
  Percent, 
  FileText, 
  Download,
  CheckCircle,
  AlertCircle,
  X,
  Plus,
  Trash2
} from 'lucide-react';
import { Invoice, InvoiceItem } from '../types/agent-types';

// Mock invoice data
const MOCK_INVOICES: Invoice[] = [
  {
    id: '1',
    clientId: 1,
    clientName: 'Acme Corp',
    invoiceNumber: 'INV-2026-001',
    issueDate: '2026-06-01',
    dueDate: '2026-07-01',
    items: [
      { id: '1', description: 'Premium Service Package', quantity: 1, unitPrice: 25000, total: 25000 },
      { id: '2', description: 'Implementation Fee', quantity: 1, unitPrice: 5000, total: 5000 }
    ],
    subtotal: 30000,
    taxRate: 8.5,
    taxAmount: 2550,
    total: 32550,
    status: 'sent',
    paymentTerms: 30,
    remindersSent: 1,
    lastReminderDate: '2026-06-15'
  },
  {
    id: '2',
    clientId: 2,
    clientName: 'Beta Inc',
    invoiceNumber: 'INV-2026-002',
    issueDate: '2026-05-15',
    dueDate: '2026-06-14',
    items: [
      { id: '1', description: 'Consulting Services (40 hours)', quantity: 40, unitPrice: 150, total: 6000 }
    ],
    subtotal: 6000,
    taxRate: 8.5,
    taxAmount: 510,
    total: 6510,
    status: 'overdue',
    paymentTerms: 30,
    remindersSent: 3,
    lastReminderDate: '2026-06-20'
  }
];

interface TaxCalculationProps {
  invoiceId?: string; // If provided, show tax for specific invoice
}

const TaxCalculation: React.FC<TaxCalculationProps> = ({ invoiceId }) => {
  const [invoices] = useState<Invoice[]>(
    invoiceId 
      ? MOCK_INVOICES.filter(inv => inv.id === invoiceId)
      : MOCK_INVOICES
  );
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(
    invoices.length > 0 ? invoices[0] : null
  );
  const [customTaxRate, setCustomTaxRate] = useState<number>(8.5);
  const [showTaxSettings, setShowTaxSettings] = useState(false);

  // Tax jurisdictions (for demonstration)
  const taxJurisdictions = [
    { name: 'California, USA', rate: 8.5, type: 'Sales Tax' },
    { name: 'New York, USA', rate: 8.25, type: 'Sales Tax' },
    { name: 'Ontario, Canada', rate: 13, type: 'HST' },
    { name: 'UK (VAT)', rate: 20, type: 'VAT' },
    { name: 'Germany (VAT)', rate: 19, type: 'VAT' }
  ];

  // Calculate tax for an invoice
  const calculateTax = (subtotal: number, taxRate: number) => {
    return subtotal * (taxRate / 100);
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Calculate tax breakdown by jurisdiction
  const taxBreakdown = useMemo(() => {
    if (!selectedInvoice) return [];
    
    const breakdown = taxJurisdictions.map(jurisdiction => {
      const amount = selectedInvoice.subtotal * 0.2; // Assume 20% of revenue from each jurisdiction
      const tax = calculateTax(amount, jurisdiction.rate);
      return {
        jurisdiction: jurisdiction.name,
        type: jurisdiction.type,
        rate: jurisdiction.rate,
        taxableAmount: amount,
        taxAmount: tax
      };
    });
    
    return breakdown;
  }, [selectedInvoice]);

  return (
    <div className="tax-calculation">
      {/* Header */}
      <div className="tax-header">
        <div>
          <h3 className="tax-title">Tax Calculation</h3>
          <p className="tax-subtitle">
            {invoices.length} invoice{invoices.length > 1 ? 's' : ''} • {formatCurrency(invoices.reduce((sum, inv) => sum + inv.taxAmount, 0))} total tax
          </p>
        </div>
        <button 
          className="tax-settings-btn"
          onClick={() => setShowTaxSettings(true)}
        >
          <Calculator className="w-4 h-4" />
          Tax Settings
        </button>
      </div>

      {/* Invoice Selection */}
      {!invoiceId && (
        <div className="invoice-selector">
          <label>Select Invoice:</label>
          <select 
            value={selectedInvoice?.id || ''} 
            onChange={(e) => {
              const inv = invoices.find(inv => inv.id === e.target.value);
              setSelectedInvoice(inv || null);
            }}
          >
            <option value="">Select an invoice...</option>
            {invoices.map(inv => (
              <option key={inv.id} value={inv.id}>
                {inv.invoiceNumber} - {inv.clientName}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Tax Calculation Details */}
      {selectedInvoice && (
        <div className="tax-details">
          {/* Invoice Summary */}
          <div className="invoice-summary">
            <h4>Invoice {selectedInvoice.invoiceNumber}</h4>
            <p className="client-name">{selectedInvoice.clientName}</p>
            
            <div className="invoice-amounts">
              <div className="amount-row">
                <span>Subtotal:</span>
                <span>{formatCurrency(selectedInvoice.subtotal)}</span>
              </div>
              <div className="amount-row">
                <span>Tax Rate:</span>
                <div className="tax-rate-input">
                  <input 
                    type="number" 
                    value={customTaxRate}
                    onChange={(e) => setCustomTaxRate(parseFloat(e.target.value))}
                    step="0.1"
                    min="0"
                    max="30"
                  />
                  <Percent className="w-3 h-3" />
                </div>
              </div>
              <div className="amount-row total">
                <span>Tax Amount:</span>
                <span className="tax-amount">
                  {formatCurrency(calculateTax(selectedInvoice.subtotal, customTaxRate))}
                </span>
              </div>
              <div className="amount-row grand-total">
                <span>Total:</span>
                <span>{formatCurrency(selectedInvoice.subtotal + calculateTax(selectedInvoice.subtotal, customTaxRate))}</span>
              </div>
            </div>
          </div>

          {/* Tax Breakdown by Jurisdiction */}
          <div className="tax-breakdown">
            <h5>Tax Breakdown by Jurisdiction</h5>
            <table className="tax-table">
              <thead>
                <tr>
                  <th>Jurisdiction</th>
                  <th>Type</th>
                  <th>Rate</th>
                  <th>Taxable Amount</th>
                  <th>Tax Amount</th>
                </tr>
              </thead>
              <tbody>
                {taxBreakdown.map((item, index) => (
                  <tr key={index}>
                    <td>{item.jurisdiction}</td>
                    <td>{item.type}</td>
                    <td>{item.rate}%</td>
                    <td>{formatCurrency(item.taxableAmount)}</td>
                    <td className="tax-value">{formatCurrency(item.taxAmount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4}><strong>Total Tax Liability</strong></td>
                  <td className="tax-total">
                    {formatCurrency(taxBreakdown.reduce((sum, item) => sum + item.taxAmount, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Tax Compliance Status */}
          <div className="tax-compliance">
            <h5>Compliance Status</h5>
            <div className="compliance-items">
              <div className="compliance-item passed">
                <CheckCircle className="w-4 h-4" />
                <span>Tax ID Verified</span>
              </div>
              <div className="compliance-item passed">
                <CheckCircle className="w-4 h-4" />
                <span>Tax Rate Current</span>
              </div>
              <div className="compliance-item warning">
                <AlertCircle className="w-4 h-4" />
                <span>Q2 Filing Due: July 31</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tax Settings Modal */}
      {showTaxSettings && (
        <div className="tax-modal-overlay" onClick={() => setShowTaxSettings(false)}>
          <div className="tax-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tax-modal-header">
              <h4>Tax Settings</h4>
              <button onClick={() => setShowTaxSettings(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="tax-settings-form">
              <div className="form-group">
                <label>Default Tax Rate (%)</label>
                <input type="number" defaultValue="8.5" step="0.1" />
              </div>
              
              <div className="form-group">
                <label>Tax Type</label>
                <select>
                  <option>Sales Tax</option>
                  <option>VAT</option>
                  <option>GST</option>
                  <option>HST</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>Tax Jurisdictions</label>
                <div className="jurisdiction-list">
                  {taxJurisdictions.map((j, i) => (
                    <div key={i} className="jurisdiction-item">
                      <span>{j.name} ({j.rate}%)</span>
                      <button className="remove-btn">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <button className="add-jurisdiction-btn">
                  <Plus className="w-4 h-4" />
                  Add Jurisdiction
                </button>
              </div>
              
              <button className="save-settings-btn">
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaxCalculation;
