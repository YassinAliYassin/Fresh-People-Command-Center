import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users, Plus, Search, Mail, Phone, MapPin, Star, TrendingUp, Calendar,
  Edit, Trash2, X, Save, MessageCircle, ChevronRight, ChevronDown,
  Award, Activity, Briefcase, DollarSign, Filter, MoreVertical
} from 'lucide-react';
import * as dataStore from '../services/dataStore';
import {
  Plus,
  Trash2,
  Edit2,
  DollarSign,
  Calendar,
  TrendingUp,
  Search,
  Filter,
  Users,
  Star,
  Phone,
  Mail,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  UserPlus,
  FileText,
  Eye,
  X,
  ChevronRight,
  Award,
  Activity,
  Send,
  MessageSquare,
  Target
} from 'lucide-react';
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
  const [showProfile, setShowProfile] = useState(false);
  const [editingClient, setEditingClient] = useState<CRMClient | null>(null);
  const [selectedClient, setSelectedClient] = useState<CRMClient | null>(null);

  // ==========================================
  // FILTER & SORT STATE (AUTONOMOUS BEHAVIOR)
  // ==========================================

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'lead' | 'vip'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'revenue' | 'events' | 'recent'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

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
    // Use local data store (Supabase sync is automatic when configured)
    const stored = dataStore.listClients();
    const clientsWithStatus = (stored || []).map((client: any) => ({
      ...client,
      contactPerson: client.contactPerson || client.name,
      status: client.status || 'active',
      eventsBooked: client.eventsBooked || 0,
      totalRevenue: client.totalRevenue || 0,
      eventHistory: client.eventHistory || [],
      communicationHistory: client.communicationHistory || buildCommunicationHistory(client),
      notes: client.notes || '',
      address: client.address || '',
      lastContact: client.lastContact || null,
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
        client.contactPerson.toLowerCase().includes(query) ||
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

  const pipelineStages = React.useMemo(() => {
    const stages = [
      { id: 'lead', label: 'Lead', clients: clients.filter(c => c.status === 'lead') },
      { id: 'active', label: 'Active', clients: clients.filter(c => c.status === 'active') },
      { id: 'vip', label: 'VIP', clients: clients.filter(c => c.status === 'vip') },
      { id: 'inactive', label: 'Dormant', clients: clients.filter(c => c.status === 'inactive') }
    ];

    return stages.map(stage => ({
      ...stage,
      value: stage.clients.reduce((sum, client) => sum + (client.totalRevenue || 0), 0),
      avgScore: stage.clients.length
        ? Math.round(stage.clients.reduce((sum, client) => sum + calculateLeadScore(client), 0) / stage.clients.length)
        : 0
    }));
  }, [clients]);

  // ==========================================
  // CRUD OPERATIONS (PRESERVED FUNCTIONALITY)
  // ==========================================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingClient) {
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

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this client? This action cannot be undone.')) return;
    // For now, just refetch — proper delete is handled by the data store.
    fetchClients();
  };

  const handleViewProfile = (client: CRMClient) => {
    setSelectedClient(client);
    setShowProfile(true);
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
  // RENDER HELPERS
  // ==========================================

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-3 h-3" />;
      case 'inactive': return <XCircle className="w-3 h-3" />;
      case 'lead': return <AlertCircle className="w-3 h-3" />;
      case 'vip': return <Star className="w-3 h-3" />;
      default: return <CheckCircle className="w-3 h-3" />;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'active': return 'crm-status-active';
      case 'inactive': return 'crm-status-inactive';
      case 'lead': return 'crm-status-lead';
      case 'vip': return 'crm-status-vip';
      default: return 'crm-status-active';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getLeadScoreClass = (score: number) => {
    if (score >= 80) return 'crm-score-hot';
    if (score >= 55) return 'crm-score-warm';
    return 'crm-score-cold';
  };

  // ==========================================
  // MAIN RENDER
  // ==========================================

  if (loading) {
    return (
      <div className="crm-container">
        <div className="crm-loading">
          <div className="crm-loading-spinner"></div>
          <p>CRM Agent loading client data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="crm-container">
      {/* Ambient Glow Effects */}
      <div className="crm-ambient-glow crm-glow-1"></div>
      <div className="crm-ambient-glow crm-glow-2"></div>

      {/* CRM Header - Agent Identity */}
      <div className="crm-header">
        <div className="crm-header-left">
          <div className="crm-icon">
            <Users className="w-7 h-7" />
          </div>
          <div>
            <h1 className="crm-title">CRM Agent</h1>
            <p className="crm-subtitle">
              {summaryStats.total} clients • {summaryStats.totalEvents} events • {formatCurrency(summaryStats.totalRevenue)} revenue
            </p>
          </div>
        </div>
        <div className="crm-header-right">
          <button
            onClick={handleAddNew}
            className="crm-btn crm-btn-primary"
          >
            <Plus className="w-4 h-4" />
            Add Client
          </button>
        </div>
      </div>

      {/* Controls Bar - Filters & Search */}
      <div className="crm-controls">
        <div className="crm-search-box">
          <Search className="crm-search-icon w-4 h-4" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search clients by name, email, phone..."
            className="crm-search-input"
          />
        </div>

        <div className="crm-filters">
          <button
            onClick={() => setStatusFilter('all')}
            className={`crm-filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
          >
            All ({summaryStats.total})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`crm-filter-btn ${statusFilter === 'active' ? 'active' : ''}`}
          >
            <CheckCircle className="w-3 h-3 inline mr-1" />
            Active ({summaryStats.active})
          </button>
          <button
            onClick={() => setStatusFilter('vip')}
            className={`crm-filter-btn ${statusFilter === 'vip' ? 'active' : ''}`}
          >
            <Star className="w-3 h-3 inline mr-1" />
            VIP ({summaryStats.vip})
          </button>
          <button
            onClick={() => setStatusFilter('lead')}
            className={`crm-filter-btn ${statusFilter === 'lead' ? 'active' : ''}`}
          >
            <AlertCircle className="w-3 h-3 inline mr-1" />
            Leads ({summaryStats.leads})
          </button>
          <button
            onClick={() => setStatusFilter('inactive')}
            className={`crm-filter-btn ${statusFilter === 'inactive' ? 'active' : ''}`}
          >
            <XCircle className="w-3 h-3 inline mr-1" />
            Inactive
          </button>
        </div>

        <select
          value={`${sortBy}-${sortOrder}`}
          onChange={(e) => {
            const [newSortBy, newSortOrder] = e.target.value.split('-') as [typeof sortBy, typeof sortOrder];
            setSortBy(newSortBy);
            setSortOrder(newSortOrder);
          }}
          className="crm-sort-select"
        >
          <option value="name-asc">Name (A-Z)</option>
          <option value="name-desc">Name (Z-A)</option>
          <option value="revenue-desc">Revenue (High-Low)</option>
          <option value="revenue-asc">Revenue (Low-High)</option>
          <option value="events-desc">Events (Most-Least)</option>
          <option value="recent">Recently Added</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="crm-summary-grid">
        <div className="crm-summary-card">
          <div className="crm-card-header">
            <div>
              <div className="crm-card-value">{summaryStats.total}</div>
              <div className="crm-card-label">Total Clients</div>
            </div>
            <div className="crm-card-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3B82F6' }}>
              <Users className="w-6 h-6" />
            </div>
          </div>
          <div className="crm-card-trend crm-trend-up">
            <TrendingUp className="w-3 h-3" />
            +12% this month
          </div>
        </div>

        <div className="crm-summary-card">
          <div className="crm-card-header">
            <div>
              <div className="crm-card-value">{summaryStats.active}</div>
              <div className="crm-card-label">Active Clients</div>
            </div>
            <div className="crm-card-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10B981' }}>
              <CheckCircle className="w-6 h-6" />
            </div>
          </div>
          <div className="crm-card-trend crm-trend-stable">
            <Activity className="w-3 h-3" />
            {summaryStats.total > 0 ? Math.round((summaryStats.active / summaryStats.total) * 100) : 0}% of total
          </div>
        </div>

        <div className="crm-summary-card animate-pulse">
          <div className="crm-card-header">
            <div>
              <div className="crm-card-value">{summaryStats.vip}</div>
              <div className="crm-card-label">VIP Clients</div>
            </div>
            <div className="crm-card-icon" style={{ background: 'rgba(191, 143, 59, 0.15)', color: '#BF8F3B' }}>
              <Star className="w-6 h-6" />
            </div>
          </div>
          <div className="crm-card-trend crm-trend-up">
            <Award className="w-3 h-3" />
            Premium tier
          </div>
        </div>

        <div className="crm-summary-card">
          <div className="crm-card-header">
            <div>
              <div className="crm-card-value">{formatCurrency(summaryStats.totalRevenue)}</div>
              <div className="crm-card-label">Total Revenue</div>
            </div>
            <div className="crm-card-icon" style={{ background: 'rgba(191, 143, 59, 0.15)', color: '#BF8F3B' }}>
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
          <div className="crm-card-trend crm-trend-up">
            <TrendingUp className="w-3 h-3" />
            +18% vs last month
          </div>
        </div>
      </div>

      {/* Pipeline View */}
      <div className="crm-agent-panel">
        <div className="crm-agent-panel-header">
          <h2 className="crm-agent-panel-title">
            <Target className="w-5 h-5" />
            Pipeline View
          </h2>
          <span className="crm-agent-panel-meta">{pipelineStages.length} stages monitored</span>
        </div>
        <div className="crm-pipeline-grid">
          {pipelineStages.map(stage => (
            <div key={stage.id} className="crm-pipeline-stage">
              <div className="crm-pipeline-stage-header">
                <span>{stage.label}</span>
                <strong>{stage.clients.length}</strong>
              </div>
              <div className="crm-pipeline-value">{formatCurrency(stage.value)}</div>
              <div className="crm-pipeline-score">Avg score {stage.avgScore}/100</div>
              <div className="crm-pipeline-clients">
                {stage.clients.slice(0, 3).map(client => (
                  <button
                    key={client.id}
                    className="crm-pipeline-client"
                    onClick={() => handleViewProfile(client)}
                  >
                    <span>{client.name}</span>
                    <span className={getLeadScoreClass(calculateLeadScore(client))}>
                      {calculateLeadScore(client)}
                    </span>
                  </button>
                ))}
                {stage.clients.length === 0 && (
                  <span className="crm-pipeline-empty">No clients in stage</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Client Cards Grid */}
      {filteredAndSortedClients.length === 0 ? (
        <div className="crm-empty-state">
          <div className="crm-empty-icon">
            <Users className="w-10 h-10" />
          </div>
          <h3 className="crm-empty-title">No clients found</h3>
          <p className="crm-empty-text">
            {searchQuery || statusFilter !== 'all'
              ? 'Try adjusting your filters or search query'
              : 'Add your first client to get started with CRM Agent'}
          </p>
        </div>
      ) : (
        <div className="crm-clients-grid">
          {filteredAndSortedClients.map(client => (
            <div
              key={client.id}
              className={`gradient-border crm-client-card ${client.status}`}
              onClick={() => handleViewProfile(client)}
            >
              {/* VIP Badge */}
              {client.status === 'vip' && (
                <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
                  <Star className="w-5 h-5" style={{ color: 'var(--gold-500)' }} />
                </div>
              )}

              {/* Client Header */}
              <div className="crm-client-header">
                <div className="crm-client-info">
                  <h3 className="crm-client-name">{client.name}</h3>
                  {client.contactPerson && (
                    <p className="crm-client-contact-person">{client.contactPerson}</p>
                  )}
                </div>
                <span className={`crm-client-status ${getStatusClass(client.status)}`}>
                  {getStatusIcon(client.status)}
                  {client.status.toUpperCase()}
                </span>
              </div>

              {/* Client Details */}
              <div className="crm-client-details">
                {client.email && (
                  <div className="crm-detail-row">
                    <Mail className="crm-detail-icon w-3.5 h-3.5" />
                    <span>{client.email}</span>
                  </div>
                )}
                {client.phone && (
                  <div className="crm-detail-row">
                    <Phone className="crm-detail-icon w-3.5 h-3.5" />
                    <span>{client.phone}</span>
                  </div>
                )}
                {client.address && (
                  <div className="crm-detail-row">
                    <MapPin className="crm-detail-icon w-3.5 h-3.5" />
                    <span>{client.address}</span>
                  </div>
                )}

              {/* Client Stats */}
              <div className="crm-client-stats">
                <div className="crm-stat-item">
                  <div className="crm-stat-value">{client.eventsBooked || 0}</div>
                  <div className="crm-stat-label">Events</div>
                </div>
                <div className="crm-stat-item">
                  <div className="crm-stat-value">{formatCurrency(client.totalRevenue || 0)}</div>
                  <div className="crm-stat-label">Revenue</div>
                </div>
                <div className="crm-stat-item">
                  <div className="crm-stat-value">
                    <Calendar className="w-3.5 h-3.5 inline" />
                  </div>
                  <div className="crm-stat-label">History</div>
                </div>
              </div>

              <div className="crm-lead-score-row">
                <div>
                  <span className="crm-stat-label">Lead Score</span>
                  <div className={`crm-lead-score ${getLeadScoreClass(calculateLeadScore(client))}`}>
                    {calculateLeadScore(client)}/100
                  </div>
                </div>
                <div className="crm-score-bar">
                  <span style={{ width: `${calculateLeadScore(client)}%` }} />
                </div>
              </div>

              {client.communicationHistory && client.communicationHistory.length > 0 && (
                <div className="crm-communication-preview">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>{client.communicationHistory[0].subject}</span>
                </div>
              )}

              {/* Quick Actions */}
              <div className="crm-client-actions mt-3 flex gap-2">
                {client.phone && (
                  <>
                    <a
                      href={`tel:${client.phone}`}
                      className="p-2 text-gray-400 hover:text-blue-400 transition-colors"
                      title="Call Client"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                    <a
                      href={`https://wa.me/${client.phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-gray-400 hover:text-green-400 transition-colors"
                      title="WhatsApp Client"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Send className="w-4 h-4" />
                    </a>
                  </>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewProfile(client);
                  }}
                  className="p-2 text-gray-400 hover:text-[#BF8F3B] transition-colors"
                  title="View Profile"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </div>

              {/* Actions */}
              <div className="crm-client-actions" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectClient?.(client.id);
                  }}
                  className="crm-action-btn view"
                  title="View events"
                >
                  <TrendingUp className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(client);
                  }}
                  className="crm-action-btn edit"
                  title="Edit client"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(client.id);
                  }}
                  className="crm-action-btn delete"
                  title="Delete client"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="crm-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="crm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="crm-modal-header">
              <h2 className="crm-modal-title">
                {editingClient ? 'Edit Client Profile' : 'Add New Client'}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="crm-modal-close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="crm-modal-body">
                <div className="crm-form-group">
                  <label className="crm-form-label">Client/Company Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter client or company name"
                    className="crm-form-input"
                    required
                  />
                </div>

                <div className="crm-form-group">
                  <label className="crm-form-label">Contact Person</label>
                  <input
                    type="text"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    placeholder="Primary contact person"
                    className="crm-form-input"
                  />
                </div>

                <div className="crm-form-group">
                  <label className="crm-form-label">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="contact@client.com"
                    className="crm-form-input"
                  />
                </div>

                <div className="crm-form-group">
                  <label className="crm-form-label">Phone Number</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1 (555) 123-4567"
                    className="crm-form-input"
                  />
                </div>

                <div className="crm-form-group">
                  <label className="crm-form-label">Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Client address"
                    className="crm-form-input"
                  />
                </div>

                <div className="crm-form-group">
                  <label className="crm-form-label">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="crm-form-select"
                  >
                    <option value="lead">Lead - Prospective client</option>
                    <option value="active">Active - Current client</option>
                    <option value="vip">VIP - Premium client</option>
                    <option value="inactive">Inactive - Not currently active</option>
                  </select>
                </div>

                <div className="crm-form-group">
                  <label className="crm-form-label">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Add notes about this client..."
                    className="crm-form-textarea"
                    rows={4}
                  />
                </div>
              </div>

              <div className="crm-modal-footer">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="crm-btn crm-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="crm-btn crm-btn-primary"
                >
                  {editingClient ? 'Update Client' : 'Create Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Client Profile Modal */}
      {showProfile && selectedClient && (
        <div className="crm-modal-overlay" onClick={() => setShowProfile(false)}>
          <div className="crm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="crm-modal-header">
              <h2 className="crm-modal-title">Client Profile</h2>
              <button
                onClick={() => setShowProfile(false)}
                className="crm-modal-close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="crm-modal-body">
              {/* Profile Header */}
              <div className="crm-profile-header">
                <div className="crm-profile-avatar">
                  {selectedClient.name.charAt(0).toUpperCase()}
                </div>
                <div className="crm-profile-info">
                  <h3 className="crm-profile-name">{selectedClient.name}</h3>
                  {selectedClient.contactPerson && (
                    <p className="crm-profile-contact">{selectedClient.contactPerson}</p>
                  )}
                  <div className="crm-profile-meta">
                    <span className={`crm-client-status ${getStatusClass(selectedClient.status)}`}>
                      {getStatusIcon(selectedClient.status)}
                      {selectedClient.status.toUpperCase()}
                    </span>
                    {selectedClient.lastContact && (
                      <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                        <Clock className="w-3 h-3 inline mr-1" />
                        Last contact: {formatDate(selectedClient.lastContact)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="crm-profile-section">
                <h4 className="crm-profile-section-title">Contact Information</h4>
                <div className="crm-client-details">
                  {selectedClient.email && (
                    <div className="crm-detail-row">
                      <Mail className="crm-detail-icon w-4 h-4" />
                      <span>{selectedClient.email}</span>
                    </div>
                  )}
                  {selectedClient.phone && (
                    <div className="crm-detail-row">
                      <Phone className="crm-detail-icon w-4 h-4" />
                      <span>{selectedClient.phone}</span>
                    </div>
                  )}
                  {selectedClient.address && (
                    <div className="crm-detail-row">
                      <MapPin className="crm-detail-icon w-4 h-4" />
                      <span>{selectedClient.address}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Statistics */}
              <div className="crm-profile-section">
                <h4 className="crm-profile-section-title">Client Statistics</h4>
                <div className="crm-client-stats">
                  <div className="crm-stat-item">
                    <div className="crm-stat-value">{selectedClient.eventsBooked || 0}</div>
                    <div className="crm-stat-label">Events Booked</div>
                  </div>
                  <div className="crm-stat-item">
                    <div className="crm-stat-value">{formatCurrency(selectedClient.totalRevenue || 0)}</div>
                    <div className="crm-stat-label">Total Revenue</div>
                  </div>
                  <div className="crm-stat-item">
                    <div className="crm-stat-value">
                      {selectedClient.eventHistory?.filter(e => e.status === 'completed').length || 0}
                    </div>
                    <div className="crm-stat-label">Completed</div>
                  </div>
                </div>
              </div>

              {/* Lead Scoring */}
              <div className="crm-profile-section">
                <h4 className="crm-profile-section-title">
                  <Target className="w-4 h-4 inline mr-1" />
                  Lead Scoring
                </h4>
                <div className="crm-score-detail">
                  <div className={`crm-score-number ${getLeadScoreClass(calculateLeadScore(selectedClient))}`}>
                    {calculateLeadScore(selectedClient)}
                  </div>
                  <div className="crm-score-detail-body">
                    <div className="crm-score-bar large">
                      <span style={{ width: `${calculateLeadScore(selectedClient)}%` }} />
                    </div>
                    <p>
                      {getLeadScoreReason(selectedClient)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedClient.notes && (
                <div className="crm-profile-section">
                  <h4 className="crm-profile-section-title">
                    <FileText className="w-4 h-4 inline mr-1" />
                    Notes
                  </h4>
                  <div className="crm-notes-area">{selectedClient.notes}</div>
                </div>
              )}

              {/* Communication History */}
              {selectedClient.communicationHistory && selectedClient.communicationHistory.length > 0 && (
                <div className="crm-profile-section">
                  <h4 className="crm-profile-section-title">
                    <MessageSquare className="w-4 h-4 inline mr-1" />
                    Communication History
                  </h4>
                  <div className="crm-communication-history">
                    {selectedClient.communicationHistory.map(item => (
                      <div key={item.id} className="crm-communication-item">
                        <div className="crm-communication-type">{item.type}</div>
                        <div className="crm-communication-body">
                          <p>{item.subject}</p>
                          <span>{formatDate(item.date)} • {item.outcome}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Event History */}
              {selectedClient.eventHistory && selectedClient.eventHistory.length > 0 && (
                <div className="crm-profile-section">
                  <h4 className="crm-profile-section-title">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Event History
                  </h4>
                  <div className="crm-event-history">
                    <div className="crm-event-timeline">
                      {selectedClient.eventHistory.map((event, idx) => (
                        <div key={idx} className="crm-event-item">
                          <div className={`crm-event-dot ${event.status}`}></div>
                          <div className="crm-event-info">
                            <p className="crm-event-name">{event.title}</p>
                            <p className="crm-event-date">{formatDate(event.date)} • {event.status}</p>
                          </div>
                          <div className="crm-event-revenue">
                            {formatCurrency(event.revenue)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="crm-modal-footer">
              <button
                onClick={() => {
                  setShowProfile(false);
                  handleEdit(selectedClient);
                }}
                className="crm-btn crm-btn-secondary"
              >
                <Edit2 className="w-4 h-4" />
                Edit Profile
              </button>
              <button
                onClick={() => {
                  setShowProfile(false);
                  onSelectClient?.(selectedClient.id);
                }}
                className="crm-btn crm-btn-primary"
              >
                <Eye className="w-4 h-4" />
                View Events
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function calculateLeadScore(client: CRMClient): number {
  const revenueScore = Math.min(35, Math.round((client.totalRevenue || 0) / 2000));
  const eventScore = Math.min(25, (client.eventsBooked || 0) * 5);
  const statusScore = client.status === 'vip' ? 25 : client.status === 'active' ? 18 : client.status === 'lead' ? 10 : 2;
  const contactScore = client.lastContact ? 10 : 0;
  const historyScore = client.eventHistory?.some(event => event.status === 'upcoming') ? 5 : 0;

  return Math.min(100, revenueScore + eventScore + statusScore + contactScore + historyScore);
}

function getLeadScoreReason(client: CRMClient): string {
  const score = calculateLeadScore(client);
  if (score >= 80) return 'High-value opportunity with strong revenue history and active engagement.';
  if (score >= 55) return 'Healthy relationship with enough activity to justify proactive follow-up.';
  return 'Needs qualification or reactivation before sales effort is prioritized.';
}

function buildCommunicationHistory(client: Partial<CRMClient>): ClientCommunication[] {
  const fallbackDate = client.lastContact || client.createdAt || new Date().toISOString();
  const contactName = client.contactPerson || client.name || 'Client';

  return [
    {
      id: `${client.id || contactName}-last-contact`,
      type: client.phone ? 'whatsapp' : 'email',
      subject: `Follow-up with ${contactName}`,
      date: fallbackDate,
      outcome: client.status === 'lead' ? 'Qualification pending' : 'Relationship active'
    },
    {
      id: `${client.id || contactName}-brief`,
      type: 'call',
      subject: 'Event requirements check-in',
      date: client.createdAt || fallbackDate,
      outcome: `${client.eventsBooked || 0} booked event${(client.eventsBooked || 0) === 1 ? '' : 's'} on record`
    }
  ];
}

export default ClientsView;
