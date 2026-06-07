import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Users, Plus, Search, Mail, Phone, MapPin, Star, TrendingUp, DollarSign, Filter } from 'lucide-react';
import * as dataStore from '../services/dataStore';
import { Client as BaseClient } from '../types';

interface CRMClient extends BaseClient {
  address?: string;
  status: 'active' | 'inactive' | 'lead' | 'vip';
  notes?: string;
  lastContact?: string;
  eventsBooked?: number;
  totalRevenue?: number;
}

interface ClientsViewProps {
  onSelectClient?: (clientId: number) => void;
  clients?: any[];
  events?: any[];
  addToast?: (msg: string, type?: string) => void;
}

const ClientsViewClean: React.FC<ClientsViewProps> = () => {
  const [clients, setClients] = useState<CRMClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'lead' | 'vip'>('all');

  const fetchClients = useCallback(() => {
    setLoading(true);
    const stored = dataStore.listClients();
    const clientsWithStatus = (stored || []).map((client: any) => ({
      ...client,
      status: client.status || 'active',
      eventsBooked: client.eventsBooked || 0,
      totalRevenue: client.totalRevenue || 0,
    }));
    setClients(clientsWithStatus);
    setLoading(false);
  }, []);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  const filteredClients = useMemo(() => {
    let filtered = [...clients];
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(client =>
        client.name.toLowerCase().includes(query) ||
        (client.email && client.email.toLowerCase().includes(query))
      );
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter(client => client.status === statusFilter);
    }
    return filtered;
  }, [clients, searchQuery, statusFilter]);

  const summaryStats = useMemo(() => {
    const total = clients.length;
    const active = clients.filter(c => c.status === 'active').length;
    const vip = clients.filter(c => c.status === 'vip').length;
    const totalRevenue = clients.reduce((sum, c) => sum + (c.totalRevenue || 0), 0);
    return { total, active, vip, totalRevenue };
  }, [clients]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading clients...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Clean Header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Clients</h1>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Plus size={18} />
            Add Client
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Clients', value: summaryStats.total, icon: <Users size={20} />, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Active Clients', value: summaryStats.active, icon: <Users size={20} />, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'VIP Clients', value: summaryStats.vip, icon: <Star size={20} />, color: 'text-purple-600', bg: 'bg-purple-50' },
            { label: 'Total Revenue', value: `R${summaryStats.totalRevenue}`, icon: <DollarSign size={20} />, color: 'text-emerald-600', bg: 'bg-emerald-50' }
          ].map((stat, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">{stat.label}</span>
                <div className={`p-2 rounded-lg ${stat.bg} ${stat.color}`}>
                  {stat.icon}
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Search & Filters */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search clients..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2">
              {['all', 'active', 'vip', 'lead'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter as any)}
                  className={`px-4 py-2 rounded-lg capitalize ${
                    statusFilter === filter
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Client Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client) => (
            <div key={client.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{client.name}</h3>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                    client.status === 'active' ? 'bg-green-100 text-green-700' :
                    client.status === 'vip' ? 'bg-purple-100 text-purple-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {client.status === 'active' && <Users size={12} />}
                    {client.status === 'vip' && <Star size={12} />}
                    {client.status}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2 text-sm text-gray-600">
                {client.email && (
                  <div className="flex items-center gap-2">
                    <Mail size={14} />
                    <span>{client.email}</span>
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center gap-2">
                    <Phone size={14} />
                    <span>{client.phone}</span>
                  </div>
                )}
                {client.address && (
                  <div className="flex items-center gap-2">
                    <MapPin size={14} />
                    <span>{client.address}</span>
                  </div>
                )}
              </div>
              
              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">
                  R{client.totalRevenue || 0}
                </span>
                <span className="text-xs text-gray-500">
                  {client.eventsBooked || 0} events
                </span>
              </div>
            </div>
          ))}
        </div>

        {filteredClients.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No clients found
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientsViewClean;
