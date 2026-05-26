import React, { useState } from 'react';
import { Plus, Trash2, Receipt, Car, Utensils, Wrench, Package, HelpCircle } from 'lucide-react';
import { MiscExpense } from '../types';

interface MiscExpensesProps {
  eventId: string;
  expenses: MiscExpense[];
  onUpdate: (expenses: MiscExpense[]) => void;
}

const CATEGORIES = [
  { value: 'Transport', label: 'Transport', icon: Car },
  { value: 'Food', label: 'Food', icon: Utensils },
  { value: 'Equipment', label: 'Equipment', icon: Wrench },
  { value: 'Materials', label: 'Materials', icon: Package },
  { value: 'Other', label: 'Other', icon: HelpCircle }
];

const MiscExpenses: React.FC<MiscExpensesProps> = ({ eventId, expenses, onUpdate }) => {
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState<string>('Transport');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  const addExpense = () => {
    if (!description.trim() || !amount || isNaN(parseFloat(amount))) {
      alert('Please fill in all fields correctly');
      return;
    }

    const newExpense: MiscExpense = {
      id: `exp_${Date.now()}`,
      category: category as MiscExpense['category'],
      description: description.trim(),
      amount: parseFloat(amount),
      date: date
    };

    const updated = [...expenses, newExpense];
    onUpdate(updated);
    
    // Reset form
    setDescription('');
    setAmount('');
    setShowForm(false);
  };

  const removeExpense = (expenseId: string) => {
    const updated = expenses.filter(e => e.id !== expenseId);
    onUpdate(updated);
  };

  const getCategoryIcon = (cat: string) => {
    const found = CATEGORIES.find(c => c.value === cat);
    return found ? <found.icon className="w-3 h-3" /> : <HelpCircle className="w-3 h-3" />;
  };

  return (
    <div className="bg-gray-700 p-3 rounded-lg space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-300 flex items-center gap-2">
          <Receipt className="w-4 h-4 text-yellow-400" />
          Misc Expenses ({expenses.length})
        </p>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-yellow-400">R{totalExpenses.toFixed(2)}</span>
          <button
            onClick={() => setShowForm(!showForm)}
            className="p-1 text-blue-400 hover:text-blue-300 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Add expense"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expense List */}
      {expenses.length > 0 && (
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {expenses.map(exp => (
            <div key={exp.id} className="flex items-center justify-between bg-gray-800 px-2 py-1 rounded text-xs">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {getCategoryIcon(exp.category)}
                <span className="truncate">{exp.description}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-yellow-400 font-medium">R{exp.amount.toFixed(2)}</span>
                <button
                  onClick={() => removeExpense(exp.id)}
                  className="p-0.5 text-red-400 hover:text-red-300 transition-colors"
                  title="Remove"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Expense Form */}
      {showForm && (
        <div className="space-y-2 bg-gray-800 p-2 rounded">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs focus:outline-none focus:border-blue-500"
          >
            {CATEGORIES.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
          
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs placeholder-gray-400 focus:outline-none focus:border-blue-500"
          />
          
          <div className="flex gap-2">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount"
              step="0.01"
              className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs focus:outline-none focus:border-blue-500"
            />
          </div>
          
          <div className="flex gap-1">
            <button
              onClick={addExpense}
              className="flex-1 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs transition-colors min-h-[44px]"
            >
              Add
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 py-1 bg-gray-600 hover:bg-gray-500 rounded text-xs transition-colors min-h-[44px]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MiscExpenses;
