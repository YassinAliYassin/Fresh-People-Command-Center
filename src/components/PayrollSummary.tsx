import React, { useState, useEffect } from 'react';
import { DollarSign, MessageCircle, Download, Calendar } from 'lucide-react';

interface PayrollStaff {
  staffId: number;
  fullName: string;
  phone: string;
  role: string;
  assignmentsCount: number;
  totalHours: number;
  totalEarned: number;
}

interface PayrollData {
  cycleStart: string;
  cycleEnd: string;
  staff: PayrollStaff[];
}

const PayrollSummary: React.FC = () => {
  const [payroll, setPayroll] = useState<PayrollData | null>(null);
  const [loading, setLoading] = useState(true);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const fetchPayroll = (start?: string, end?: string) => {
    setLoading(true);
    let url = `http://${window.location.hostname}:3001/api/payroll`;
    if (start && end) {
      url += `?cycleStart=${start}&cycleEnd=${end}`;
    }
    
    fetch(url)
      .then(res => res.json())
      .then(data => {
        setPayroll(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching payroll:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchPayroll();
  }, []);

  const handleCustomRange = () => {
    if (customStart && customEnd) {
      fetchPayroll(customStart, customEnd);
    }
  };

  const generateWhatsAppMessage = (staff: PayrollStaff) => {
    const message = `Hi ${staff.fullName},

Here's your payroll summary for the period ${payroll?.cycleStart} to ${payroll?.cycleEnd}:

📊 Hours Worked: ${staff.totalHours.toFixed(2)}hrs
💰 Earnings: R${staff.totalEarned.toFixed(2)} (at R40/hr)
📅 Assignments: ${staff.assignmentsCount} events

Thank you for your hard work!

Best regards,
Flow Events Team`;

    const url = `https://wa.me/${staff.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const exportCSV = () => {
    if (!payroll) return;
    
    const headers = 'Name,Role,Hours,Earnings,Assignments\n';
    const rows = payroll.staff.map(s => 
      `${s.fullName},${s.role},${s.totalHours.toFixed(2)},${s.totalEarned.toFixed(2)},${s.assignmentsCount}`
    ).join('\n');
    
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll-${payroll.cycleStart}-to-${payroll.cycleEnd}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) return <div className="text-gray-400 p-4">Loading payroll data...</div>;
  if (!payroll) return <div className="text-red-400 p-4">No payroll data available</div>;

  const totalCycleHours = payroll.staff.reduce((sum, s) => sum + s.totalHours, 0);
  const totalCycleEarnings = payroll.staff.reduce((sum, s) => sum + s.totalEarned, 0);

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <DollarSign className="w-6 h-6 text-green-400" />
          Payroll Summary
        </h2>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors min-h-[44px]"
          title="Export CSV"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Cycle Info */}
      <div className="bg-gray-700 p-4 rounded-lg mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="w-4 h-4 text-blue-400" />
          <span className="text-sm text-gray-300">
            Payroll Cycle: <strong>{payroll.cycleStart}</strong> to <strong>{payroll.cycleEnd}</strong>
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <p className="text-xs text-gray-400">Total Hours</p>
            <p className="text-2xl font-bold text-blue-400">{totalCycleHours.toFixed(2)}hrs</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Total Earnings</p>
            <p className="text-2xl font-bold text-green-400">R{totalCycleEarnings.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Custom Date Range */}
      <div className="flex gap-2 mb-6">
        <input
          type="date"
          value={customStart}
          onChange={(e) => setCustomStart(e.target.value)}
          className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
          placeholder="Start Date"
        />
        <input
          type="date"
          value={customEnd}
          onChange={(e) => setCustomEnd(e.target.value)}
          className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
          placeholder="End Date"
        />
        <button
          onClick={handleCustomRange}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg transition-colors min-h-[44px]"
        >
          Filter
        </button>
      </div>

      {/* Staff List */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold mb-3">Staff Earnings ({payroll.staff.length})</h3>
        {payroll.staff.length === 0 ? (
          <p className="text-gray-500 italic">No hours logged in this cycle</p>
        ) : (
          payroll.staff.map(staff => (
            <div key={staff.staffId} className="bg-gray-700 p-4 rounded-lg flex items-center justify-between">
              <div className="flex-1">
                <p className="font-medium text-white">{staff.fullName}</p>
                <p className="text-sm text-gray-400">{staff.role} • {staff.assignmentsCount} events</p>
              </div>
              <div className="text-right mr-4">
                <p className="text-lg font-bold text-blue-400">{staff.totalHours.toFixed(2)}hrs</p>
                <p className="text-sm font-semibold text-green-400">R{staff.totalEarned.toFixed(2)}</p>
              </div>
              <button
                onClick={() => generateWhatsAppMessage(staff)}
                className="p-2 text-green-400 hover:text-green-300 hover:bg-gray-600 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                title={`Send payroll message to ${staff.fullName}`}
                disabled={!staff.phone}
              >
                <MessageCircle className="w-5 h-5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PayrollSummary;
