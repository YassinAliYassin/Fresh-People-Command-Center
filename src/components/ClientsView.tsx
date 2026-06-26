import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users, Plus, Search, Mail, Phone, MapPin, Star, TrendingUp, Calendar,
  Edit, Trash2, X, Save, MessageCircle, ChevronRight, ChevronDown,
  Award, Activity, Briefcase, DollarSign, Filter, MoreVertical,
  Edit2, Clock, CheckCircle, XCircle, AlertCircle, UserPlus, FileText, Eye
} from 'lucide-react';
import * as dataStore from '../services/dataStore';
import { Client as BaseClient } from '../types';

// ==========================================
// ENHANCED TYPES FOR CRM AGENT
// ==========================================

interface ClientEvent {
  id: string;
  title: string;
  date: string;
  status: 'completed' | 'upcoming' | 'cancelled';
  revenue: number;
}

interface ClientCommunication {
  id: string;
  type: 'call' | 'email' | 'whatsapp' | 'meeting';
  subject: string;
  date: string;
  outcome: string;
}

interface CRMClient extends BaseClient {
  address?: string;
  status: 'active' | 'inactive' | 'lead' | 'vip';
  notes?: string;
  lastContact?: string;
  eventsBooked?: number;
  totalRevenue?: number;
  eventHistory?: ClientEvent[];
  communicationHistory?: ClientCommunication[];
  createdAt?: string;
}

interface ClientsViewProps {
  onSelectClient?: (clientId: number) => void;
}

// ==========================================
// CRM AGENT COMPONENT
// ==========================================

const ClientsView: React.FC<ClientsViewProps> = ({ onSelectClient }) => {
  // ==========================================
  // CORE STATE
  // ==========================================

  const [clients, setClients] = useState<CRMClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<CRMClient | null>(null);

  // ==========================================
  // FILTER & SORT STATE (AUTONOMOUS BEHAVIOR)
  // ==========================================

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'lead' | 'vip'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'revenue' | 'events' | 'recent'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // ==========================================
  // FORM STATE
  // ==========================================

  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    status: 'active' as 'active' | 'inactive' | 'lead' | 'vip',
    notes: ''
  });

  // ==========================================
  // DATA FETCHING
  // ==========================================

  const fetchClients = useCallback(() => {
    setLoading(true);
    const stored = dataStore.listClients();
    const clientsWithStatus = (stored || []).map((client: any) => ({
      ...client,
      contactPerson: client.contactPerson || client.name,
      status: client.status || 'active',
      eventsBooked: client.eventsBooked || 0,
      totalRevenue: client.totalRevenue || 0,
      eventHistory: client.eventHistory || [],
      communicationHistory: client.communicationHistory || [],
      notes: client.notes || '',
      address: client.address || '',
      hourlyRate: client.hourlyRate || 90,
    }));
    setClients(clientsWithStatus);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // ==========================================
  // FILTERED & SORTED CLIENTS (AUTONOMOUS STATE MANAGEMENT)
  // ==========================================

  const filteredAndSortedClients = React.useMemo(() => {
    let filtered = [...clients];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(client =>
        client.name.toLowerCase().includes(query) ||
        client.email.toLowerCase().includes(query) ||
        client.phone.includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(client => client.status === statusFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'revenue':
          comparison = (a.totalRevenue || 0) - (b.totalRevenue || 0);
          break;
        case 'events':
          comparison = (a.eventsBooked || 0) - (b.eventsBooked || 0);
          break;
        case 'recent':
          comparison = (a.id || 0) - (b.id || 0);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [clients, searchQuery, statusFilter, sortBy, sortOrder]);

  // ==========================================
  // SUMMARY STATS
  // ==========================================

  const summaryStats = React.useMemo(() => {
    const total = clients.length;
    const active = clients.filter(c => c.status === 'active').length;
    const vip = clients.filter(c => c.status === 'vip').length;
    const leads = clients.filter(c => c.status === 'lead').length;
    const totalRevenue = clients.reduce((sum, c) => sum + (c.totalRevenue || 0), 0);
    const totalEvents = clients.reduce((sum, c) => sum + (c.eventsBooked || 0), 0);

    return { total, active, vip, leads, totalRevenue, totalEvents };
  }, [clients]);

  // ==========================================
  // CRUD OPERATIONS (OPTIMISTIC + FIRESTORE)
  // ==========================================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingClient) {
      // Optimistic update for edit
      dataStore.updateClient(editingClient.id, {
        name: formData.name,
        contactPerson: formData.contactPerson,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        status: formData.status,
        notes: formData.notes,
      });
    } else {
      // Optimistic update for add
      dataStore.addClient({
        name: formData.name,
        contactPerson: formData.contactPerson,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        status: formData.status,
        notes: formData.notes,
        hourlyRate: 90,
      });
    }

    setShowForm(false);
    setEditingClient(null);
    setFormData({
      name: '',
      contactPerson: '',
      email: '',
      phone: '',
      address: '',
      status: 'active',
      notes: ''
    });
    fetchClients();
  };

  const handleEdit = (client: CRMClient) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      contactPerson: client.contactPerson || '',
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || '',
      status: client.status || 'active',
      notes: client.notes || ''
    });
    setShowForm(true);
  };

  const handleAddNew = () => {
    setEditingClient(null);
    setFormData({
      name: '',
      contactPerson: '',
      email: '',
      phone: '',
      address: '',
      status: 'active',
      notes: ''
    });
    setShowForm(true);
  };

  // ==========================================
  // MAIN RENDER (QUIET LUXURY AESTHETIC)
  // ==========================================

  const styles: Record<string, React.CSSProperties> = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      width: '100%',
      maxWidth: '1000px',
      margin: '0 auto',
      padding: '24px',
      gap: '24px'
    },
    card: {
      width: '100%',
      backgroundColor: '#161b22',
      border: '1px solid #30363d',
      borderRadius: '12px',
      padding: '32px',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px'
    },
    title: {
      fontSize: '24px',
      fontWeight: '600',
      color: '#e6edf3',
      letterSpacing: '-0.02em',
      margin: 0
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '24px'
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      gap: '16px',
      marginBottom: '24px'
    },
    statCard: {
      backgroundColor: '#0d1117',
      border: '1px solid #30363d',
      borderRadius: '8px',
      padding: '20px',
      textAlign: 'center'
    },
    statValue: {
      fontSize: '28px',
      fontWeight: '700',
      color: '#e6edf3',
      lineHeight: 1
    },
    statLabel: {
      fontSize: '12px',
      color: '#8b949e',
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      marginTop: '8px'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>CRM Agent</h1>
          <p style={{ color: '#8b949e', fontSize: '14px', marginTop: '8px' }}>
            {summaryStats.total} clients • {summaryStats.totalEvents} events • ${summaryStats.totalRevenue} revenue
          </p>
        </div>
        <button
          onClick={handleAddNew}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            backgroundColor: '#00e5a0',
            color: '#0d1117',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          <Plus size={16} />
          Add Client
        </button>
      </div>

      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{summaryStats.total}</div>
          <div style={styles.statLabel}>Total Clients</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{summaryStats.active}</div>
          <div style={styles.statLabel}>Active</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{summaryStats.vip}</div>
          <div style={styles.statLabel}>VIP</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{summaryStats.leads}</div>
          <div style={styles.statLabel}>Leads</div>
        </div>
      </div>

      <div style={styles.card}>
        <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8b949e' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search clients..."
              style={{
                width: '100%',
                padding: '10px 12px 10px 36px',
                backgroundColor: '#0d1117',
                border: '1px solid #30363d',
                borderRadius: '6px',
                color: '#e6edf3',
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            style={{
              padding: '10px 16px',
              backgroundColor: '#0d1117',
              border: '1px solid #30363d',
              borderRadius: '6px',
              color: '#e6edf3',
              fontSize: '14px',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="lead">Leads</option>
            <option value="vip">VIP</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {filteredAndSortedClients.length === 0 ? (
          <p style={{ color: '#8b949e', textAlign: 'center', padding: '32px 0' }}>
            No clients match your filters
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredAndSortedClients.map(client => (
              <div key={client.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 20px',
                backgroundColor: '#0d1117',
                border: '1px solid #30363d',
                borderRadius: '8px'
              }}>
                <div>
                  <p style={{ color: '#e6edf3', fontWeight: '500', margin: 0 }}>
                    {client.name}
                  </p>
                  <p style={{ fontSize: '13px', color: '#8b949e', margin: '4px 0' }}>
                    {client.email} • {client.phone}
                  </p>
                  <span style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    backgroundColor: client.status === 'active' ? 'rgba(16, 185, 129, 0.2)' : 
                                    client.status === 'vip' ? 'rgba(124, 106, 247, 0.2)' :
                                    client.status === 'lead' ? 'rgba(227, 179, 65, 0.2)' : 'rgba(139, 148, 158, 0.2)',
                    color: client.status === 'active' ? '#10B981' : 
                           client.status === 'vip' ? '#7C6AF7' :
                           client.status === 'lead' ? '#E3B341' : '#8B949E',
                    borderRadius: '4px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em'
                  }}>
                    {client.status}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleEdit(client)}
                    style={{
                      padding: '8px',
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: '#8b949e',
                      cursor: 'pointer'
                    }}
                    title="Edit"
                  >
                    <Edit size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(13, 17, 23, 0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }}>
          <div style={{
            backgroundColor: '#161b22',
            border: '1px solid #30363d',
            borderRadius: '12px',
            padding: '32px',
            width: '90%',
            maxWidth: '500px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <h3 style={{ color: '#e6edf3', fontSize: '20px', fontWeight: '600', margin: 0 }}>
              {editingClient ? 'Edit Client' : 'Add Client'}
            </h3>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', color: '#8b949e', fontSize: '12px', marginBottom: '6px' }}>
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    backgroundColor: '#0d1117',
                    border: '1px solid #30363d',
                    borderRadius: '6px',
                    color: '#e6edf3',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: '#8b949e', fontSize: '12px', marginBottom: '6px' }}>
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    backgroundColor: '#0d1117',
                    border: '1px solid #30363d',
                    borderRadius: '6px',
                    color: '#e6edf3',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: '#8b949e', fontSize: '12px', marginBottom: '6px' }}>
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    backgroundColor: '#0d1117',
                    border: '1px solid #30363d',
                    borderRadius: '6px',
                    color: '#e6edf3',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '12px 20px',
                    backgroundColor: '#00e5a0',
                    color: '#0d1117',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  {editingClient ? 'Update' : 'Add'} Client
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  style={{
                    padding: '12px 20px',
                    backgroundColor: 'transparent',
                    border: '1px solid #30363d',
                    borderRadius: '6px',
                    color: '#e6edf3',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientsView;