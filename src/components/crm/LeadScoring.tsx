/**
 * Lead Scoring Component
 * Displays and calculates lead scores based on multiple factors
 */

// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  User, 
  BarChart3, 
  Info,
  Star,
  ThumbsUp,
  ThumbsDown,
  X
} from 'lucide-react';
import { LeadScore } from '../../types/agent-types';

// Mock lead scores for demonstration
const MOCK_LEAD_SCORES: LeadScore[] = [
  {
    clientId: 1,
    score: 85,
    factors: { engagement: 90, demographics: 80, behavior: 85, firmographics: 85 },
    trend: 'up',
    lastUpdated: '2026-06-02'
  },
  {
    clientId: 2,
    score: 72,
    factors: { engagement: 75, demographics: 70, behavior: 68, firmographics: 75 },
    trend: 'stable',
    lastUpdated: '2026-06-01'
  },
  {
    clientId: 3,
    score: 45,
    factors: { engagement: 40, demographics: 50, behavior: 35, firmographics: 55 },
    trend: 'down',
    lastUpdated: '2026-05-30'
  },
  {
    clientId: 4,
    score: 92,
    factors: { engagement: 95, demographics: 90, behavior: 88, firmographics: 95 },
    trend: 'up',
    lastUpdated: '2026-06-03'
  },
  {
    clientId: 5,
    score: 68,
    factors: { engagement: 65, demographics: 72, behavior: 70, firmographics: 65 },
    trend: 'stable',
    lastUpdated: '2026-06-02'
  }
];

interface LeadScoringProps {
  clientId?: number; // If provided, show score for specific client
  compact?: boolean; // Compact view for embedding
}

const LeadScoring: React.FC<LeadScoringProps> = ({ clientId, compact = false }) => {
  const [selectedScore, setSelectedScore] = useState<LeadScore | null>(null);

  // Filter scores if clientId is provided
  const scores = useMemo(() => {
    if (clientId) {
      return MOCK_LEAD_SCORES.filter(s => s.clientId === clientId);
    }
    return MOCK_LEAD_SCORES;
  }, [clientId]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10B981'; // Green
    if (score >= 60) return '#F59E0B'; // Yellow
    if (score >= 40) return '#F97316'; // Orange
    return '#EF4444'; // Red
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Hot Lead';
    if (score >= 60) return 'Warm Lead';
    if (score >= 40) return 'Cold Lead';
    return 'Unqualified';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-red-500" />;
      default: return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const renderScoreGauge = (score: number) => {
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;
    const color = getScoreColor(score);

    return (
      <div className="score-gauge">
        <svg width="100" height="100" className="score-gauge-svg">
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="rgba(75, 85, 99, 0.3)"
            strokeWidth="8"
          />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="score-gauge-progress"
            transform="rotate(-90 50 50)"
          />
          <text x="50" y="50" textAnchor="middle" dy="0.3em" 
                fill="white" fontSize="20" fontWeight="bold">
            {score}
          </text>
        </svg>
      </div>
    );
  };

  if (compact && scores.length > 0) {
    const score = scores[0];
    return (
      <div className="lead-score-compact">
        <div className="score-badge" style={{ backgroundColor: getScoreColor(score.score) }}>
          {score.score}
        </div>
        <div className="score-info">
          <span className="score-label">{getScoreLabel(score.score)}</span>
          {getTrendIcon(score.trend)}
        </div>
      </div>
    );
  }

  return (
    <div className="lead-scoring-container">
      {/* Header */}
      <div className="lead-scoring-header">
        <div>
          <h3 className="lead-scoring-title">Lead Scoring</h3>
          <p className="lead-scoring-subtitle">
            {scores.length} leads scored • Last updated: {scores[0]?.lastUpdated}
          </p>
        </div>
        <button className="lead-scoring-info-btn">
          <Info className="w-4 h-4" />
          How it works
        </button>
      </div>

      {/* Score Breakdown Modal */}
      {selectedScore && (
        <div className="score-breakdown-overlay" onClick={() => setSelectedScore(null)}>
          <div className="score-breakdown-modal" onClick={(e) => e.stopPropagation()}>
            <div className="breakdown-header">
              <h4>Lead Score Breakdown - Client #{selectedScore.clientId}</h4>
              <button onClick={() => setSelectedScore(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="breakdown-score">
              {renderScoreGauge(selectedScore.score)}
              <div className="breakdown-label">{getScoreLabel(selectedScore.score)}</div>
            </div>

            <div className="breakdown-factors">
              <h5>Scoring Factors</h5>
              {Object.entries(selectedScore.factors).map(([factor, value]) => (
                <div key={factor} className="factor-row">
                  <div className="factor-info">
                    <span className="factor-name">{factor.charAt(0).toUpperCase() + factor.slice(1)}</span>
                    <span className="factor-value">{value}/100</span>
                  </div>
                  <div className="factor-bar">
                    <div 
                      className="factor-bar-fill" 
                      style={{ 
                        width: `${value}%`,
                        backgroundColor: getScoreColor(value)
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>

            <div className="breakdown-footer">
              <div className="breakdown-trend">
                <span>Trend:</span>
                {getTrendIcon(selectedScore.trend)}
                <span className="capitalize">{selectedScore.trend}</span>
              </div>
              <div className="breakdown-date">
                Last updated: {new Date(selectedScore.lastUpdated).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scores List */}
      <div className="lead-scores-list">
        {scores.map(score => (
          <div 
            key={score.clientId} 
            className="lead-score-card"
            onClick={() => setSelectedScore(score)}
          >
            <div className="score-card-left">
              <div 
                className="score-circle"
                style={{ backgroundColor: getScoreColor(score.score) }}
              >
                {score.score}
              </div>
              <div className="score-card-info">
                <div className="score-card-client">Client #{score.clientId}</div>
                <div className="score-card-label">{getScoreLabel(score.score)}</div>
              </div>
            </div>
            
            <div className="score-card-right">
              <div className="score-factors-mini">
                {Object.entries(score.factors).map(([factor, value]) => (
                  <div key={factor} className="factor-mini" title={`${factor}: ${value}`}>
                    <div 
                      className="factor-dot"
                      style={{ backgroundColor: getScoreColor(value) }}
                    ></div>
                  </div>
                ))}
              </div>
              {getTrendIcon(score.trend)}
            </div>
          </div>
        ))}
      </div>

      {/* Scoring Methodology */}
      <div className="scoring-methodology">
        <h5>Scoring Methodology</h5>
        <div className="methodology-items">
          <div className="methodology-item">
            <User className="w-4 h-4" />
            <span><strong>Demographics (25%):</strong> Industry, company size, location</span>
          </div>
          <div className="methodology-item">
            <BarChart3 className="w-4 h-4" />
            <span><strong>Behavior (30%):</strong> Website visits, content downloads</span>
          </div>
          <div className="methodology-item">
            <ThumbsUp className="w-4 h-4" />
            <span><strong>Engagement (25%):</strong> Email opens, meeting attendance</span>
          </div>
          <div className="methodology-item">
            <Star className="w-4 h-4" />
            <span><strong>Firmographics (20%):</strong> Revenue, growth rate</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadScoring;
