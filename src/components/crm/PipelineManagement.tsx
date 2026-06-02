/**
 * CRM Pipeline Management Component
 * Kanban-style pipeline with drag-drop support
 * Features: Deal tracking, stage progression, value tracking
 */

import React, { useState, useCallback } from 'react';
import { 
  Plus, 
  DollarSign, 
  Calendar, 
  User, 
  TrendingUp, 
  ChevronRight, 
  BarChart3,
  GripVertical,
  X
} from 'lucide-react';
import { PipelineDeal, PipelineStage } from '../types/agent-types';

// Pipeline stage configuration
const PIPELINE_STAGES: { id: PipelineStage; label: string; color: string; bgColor: string }[] = [
  { id: 'lead', label: 'New Leads', color: '#6B7280', bgColor: 'rgba(107, 114, 128, 0.1)' },
  { id: 'qualified', label: 'Qualified', color: '#3B82F6', bgColor: 'rgba(59, 130, 246, 0.1)' },
  { id: 'proposal', label: 'Proposal', color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.1)' },
  { id: 'negotiation', label: 'Negotiation', color: '#8B5CF6', bgColor: 'rgba(139, 92, 246, 0.1)' },
  { id: 'closed_won', label: 'Closed Won', color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.1)' },
  { id: 'closed_lost', label: 'Closed Lost', color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.1)' }
];

// Mock data for demonstration
const INITIAL_DEALS: PipelineDeal[] = [
  {
    id: '1',
    clientId: 1,
    clientName: 'Acme Corp',
    stage: 'qualified',
    value: 25000,
    probability: 65,
    expectedCloseDate: '2026-07-15',
    assignedTo: 'John Doe',
    lastActivity: '2026-06-01',
    notes: 'Interested in premium package'
  },
  {
    id: '2',
    clientId: 2,
    clientName: 'Beta Inc',
    stage: 'proposal',
    value: 45000,
    probability: 75,
    expectedCloseDate: '2026-06-30',
    assignedTo: 'Jane Smith',
    lastActivity: '2026-06-02',
    notes: 'Proposal sent for annual contract'
  },
  {
    id: '3',
    clientId: 3,
    clientName: 'Gamma LLC',
    stage: 'lead',
    value: 15000,
    probability: 30,
    expectedCloseDate: '2026-08-01',
    assignedTo: 'John Doe',
    lastActivity: '2026-05-28',
    notes: 'Initial discovery call completed'
  },
  {
    id: '4',
    clientId: 4,
    clientName: 'Delta Co',
    stage: 'negotiation',
    value: 60000,
    probability: 85,
    expectedCloseDate: '2026-06-20',
    assignedTo: 'Jane Smith',
    lastActivity: '2026-06-03',
    notes: 'Negotiating contract terms'
  },
  {
    id: '5',
    clientId: 5,
    clientName: 'Epsilon Ltd',
    stage: 'closed_won',
    value: 35000,
    probability: 100,
    expectedCloseDate: '2026-06-01',
    assignedTo: 'John Doe',
    lastActivity: '2026-06-01',
    notes: 'Contract signed'
  }
];

interface PipelineManagementProps {
  onDealSelect?: (deal: PipelineDeal) => void;
}

const PipelineManagement: React.FC<PipelineManagementProps> = ({ onDealSelect }) => {
  const [deals, setDeals] = useState<PipelineDeal[]>(INITIAL_DEALS);
  const [draggedDeal, setDraggedDeal] = useState<PipelineDeal | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedStage, setSelectedStage] = useState<PipelineStage | null>(null);

  // Handle drag start
  const handleDragStart = useCallback((e: React.DragEvent, deal: PipelineDeal) => {
    setDraggedDeal(deal);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', deal.id);
  }, []);

  // Handle drag over
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle drop
  const handleDrop = useCallback((e: React.DragEvent, targetStage: PipelineStage) => {
    e.preventDefault();
    
    if (!draggedDeal) return;
    
    setDeals(prev => prev.map(deal => 
      deal.id === draggedDeal.id 
        ? { ...deal, stage: targetStage, lastActivity: new Date().toISOString().split('T')[0] }
        : deal
    ));
    
    setDraggedDeal(null);
  }, [draggedDeal]);

  // Get deals for a specific stage
  const getDealsForStage = (stage: PipelineStage) => {
    return deals.filter(deal => deal.stage === stage);
  };

  // Calculate stage value
  const getStageValue = (stage: PipelineStage) => {
    return getDealsForStage(stage).reduce((sum, deal) => sum + deal.value, 0);
  };

  // Calculate weighted value (value * probability)
  const getWeightedValue = (stage: PipelineStage) => {
    return getDealsForStage(stage).reduce((sum, deal) => sum + (deal.value * deal.probability / 100), 0);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="pipeline-container">
      {/* Header */}
      <div className="pipeline-header">
        <div>
          <h2 className="pipeline-title">Pipeline Management</h2>
          <p className="pipeline-subtitle">
            {deals.length} deals • {formatCurrency(deals.reduce((sum, d) => sum + d.value, 0))} total value
          </p>
        </div>
        <button 
          className="pipeline-add-btn"
          onClick={() => setShowAddModal(true)}
        >
          <Plus className="w-4 h-4" />
          Add Deal
        </button>
      </div>

      {/* Pipeline Board */}
      <div className="pipeline-board">
        {PIPELINE_STAGES.map(stage => {
          const stageDeals = getDealsForStage(stage.id);
          const stageValue = getStageValue(stage.id);
          const weightedValue = getWeightedValue(stage.id);
          
          return (
            <div
              key={stage.id}
              className="pipeline-column"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage.id)}
            >
              {/* Column Header */}
              <div className="pipeline-column-header">
                <div className="pipeline-stage-info">
                  <div 
                    className="pipeline-stage-dot"
                    style={{ backgroundColor: stage.color }}
                  ></div>
                  <h3 className="pipeline-stage-name">{stage.label}</h3>
                  <span className="pipeline-deal-count">{stageDeals.length}</span>
                </div>
                <ChevronRight className="w-4 h-4 pipeline-arrow" />
              </div>

              {/* Stage Metrics */}
              <div className="pipeline-stage-metrics">
                <div className="pipeline-metric">
                  <DollarSign className="w-3 h-3" />
                  <span>{formatCurrency(stageValue)}</span>
                </div>
                <div className="pipeline-metric">
                  <BarChart3 className="w-3 h-3" />
                  <span>{formatCurrency(weightedValue)} weighted</span>
                </div>
              </div>

              {/* Deals List */}
              <div className="pipeline-deals">
                {stageDeals.map(deal => (
                  <div
                    key={deal.id}
                    className="pipeline-deal-card"
                    draggable
                    onDragStart={(e) => handleDragStart(e, deal)}
                    onClick={() => onDealSelect?.(deal)}
                  >
                    <div className="pipeline-deal-header">
                      <GripVertical className="w-4 h-4 pipeline-drag-handle" />
                      <span className="pipeline-deal-name">{deal.clientName}</span>
                    </div>
                    
                    <div className="pipeline-deal-details">
                      <div className="pipeline-deal-value">
                        {formatCurrency(deal.value)}
                      </div>
                      <div className="pipeline-deal-probability">
                        <TrendingUp className="w-3 h-3" />
                        {deal.probability}%
                      </div>
                    </div>
                    
                    <div className="pipeline-deal-footer">
                      <div className="pipeline-deal-assignee">
                        <User className="w-3 h-3" />
                        {deal.assignedTo}
                      </div>
                      <div className="pipeline-deal-date">
                        <Calendar className="w-3 h-3" />
                        {new Date(deal.expectedCloseDate).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </div>
                    </div>
                  </div>
                ))}
                
                {stageDeals.length === 0 && (
                  <div className="pipeline-empty-stage">
                    <p>No deals in this stage</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Deal Modal */}
      {showAddModal && (
        <div className="pipeline-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="pipeline-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pipeline-modal-header">
              <h3>Add New Deal</h3>
              <button onClick={() => setShowAddModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <form className="pipeline-modal-form">
              <div className="form-group">
                <label>Client Name</label>
                <input type="text" placeholder="Enter client name" />
              </div>
              <div className="form-group">
                <label>Value</label>
                <input type="number" placeholder="Deal value" />
              </div>
              <div className="form-group">
                <label>Stage</label>
                <select>
                  {PIPELINE_STAGES.map(stage => (
                    <option key={stage.id} value={stage.id}>{stage.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Expected Close Date</label>
                <input type="date" />
              </div>
              <div className="form-group">
                <label>Assigned To</label>
                <input type="text" placeholder="Assign team member" />
              </div>
              <button type="submit" className="pipeline-submit-btn">
                Create Deal
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PipelineManagement;
