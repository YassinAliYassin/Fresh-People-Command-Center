import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, DollarSign, Calendar, TrendingUp } from 'lucide-react';
import { Client } from '../types';

interface ClientsViewProps {
  onSelectClient?: (clientId: number) => void;
}

const ClientsView: React.FC<ClientsViewProps> = ({ onSelectClient }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState({ name: '', contactPerson: '', email: '', phone: '' });

  const fetchClients = () => {
    setLoading(true);
    fetch(`http://${window.location.hostname}:3001/api/clients`)
      .then(res => res.json())
      .then(data => {
        setClients(data.clients || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching clients:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const url = editingClient 
      ? `http://${window.location.hostname}:3001/api/clients/${editingClient.id}`
      : `http://${window.location.hostname}:3001/api/clients`;
    
    const method = editingClient ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setShowForm(false);
        setEditingClient(null);
        setFormData({ name: '', contactPerson: '', email: '', phone: '' });
        fetchClients();
      }
    } catch (err) {
      console.error('Error saving client:', err);
    }
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      contactPerson: client.contactPerson || '',
      email: client.email || '',
      phone: client.phone || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this client?')) return;

    try {
      const response = await fetch(`http://${window.location.hostname}:3001/api/clients/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) fetchClients();
      else alert('Cannot delete client with booked events');
    } catch (err) {
      console.error('Error deleting client:', err);
    }
  };

  if (loading) return <div className="text-gray-400 p-4">Loading clients...</div>;

  const totalRevenue = clients.reduce((sum, c) => sum + (c.totalRevenue || 0), 0);
  const totalEvents = clients.reduce((sum, c) => sum + (c.eventsBooked || 0), 0);

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Client CRM</h2>
          <p className="text-sm text-gray-400 mt-1">
            {clients.length} clients • {totalEvents} events • R{totalRevenue.toFixed(2)} revenue
          </p>
        </div>
        <button
          onClick={() => {
            setEditingClient(null);
            setFormData({ name: '', contactPerson: '', email: '', phone: '' });
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors min-h-[44px]"
        >
          <Plus className="w-4 h-4" />
          Add Client
        </button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-700 p-4 rounded-lg mb-6 space-y-3">
          <h3 className="font-medium">{editingClient ? 'Edit Client' : 'New Client'}</h3>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Client/Company Name *"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            required
          />
          <input
            type="text"
            value={formData.contactPerson}
            onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
            placeholder="Contact Person"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
          />
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="Email"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
          />
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="Phone"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors min-h-[44px]"
            >
              {editingClient ? 'Update' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded transition-colors min-h-[44px]"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Clients List */}
      <div className="space-y-3">
        {clients.length === 0 ? (
          <p className="text-gray-500 italic text-center py-8">No clients yet. Add your first client!</p>
        ) : (
          clients.map(client => (
            <div key={client.id} className="bg-gray-700 p-4 rounded-lg flex items-center justify-between hover:bg-gray-600 transition-colors">
              <div className="flex-1">
                <h3 className="font-medium text-white">{client.name}</h3>
                {client.contactPerson && (
                  <p className="text-sm text-gray-300">{client.contactPerson}</p>
                )}
                <div className="flex gap-4 mt-1 text-xs text-gray-400">
                  {client.email && <span>{client.email}</span>}
                  {client.phone && <span>{client.phone}</span>}
                </div>
                <div className="flex gap-4 mt-2">
                  <span className="text-xs flex items-center gap-1 text-blue-400">
                    <Calendar className="w-3 h-3" />
                    {client.eventsBooked || 0} events
                  </span>
                  <span className="text-xs flex items-center gap-1 text-green-400">
                    <DollarSign className="w-3 h-3" />
                    R{(client.totalRevenue || 0).toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => onSelectClient?.(client.id)}
                  className="p-2 text-blue-400 hover:text-blue-300 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                  title="View events"
                >
                  <TrendingUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleEdit(client)}
                  className="p-2 text-yellow-400 hover:text-yellow-300 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                  title="Edit"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(client.id)}
                  className="p-2 text-red-400 hover:text-red-300 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ClientsView;
