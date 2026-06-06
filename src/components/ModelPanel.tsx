import React, { useState } from 'react';
import { FREE_MODELS, getModelForTask, getModelById } from '../services/modelRotation';

interface ModelPanelProps {
  currentTask?: string;
  onModelSelect?: (modelId: string) => void;
}

export default function ModelPanel({ currentTask = 'default', onModelSelect }: ModelPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState(FREE_MODELS[0].id);
  
  const recommendedModel = getModelForTask(currentTask);
  const currentModel = getModelById(selectedModel);

  const handleSelect = (modelId: string) => {
    setSelectedModel(modelId);
    onModelSelect?.(modelId);
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'linear-gradient(135deg, #00e5a0 0%, #7c6af7 100%)',
          border: 'none',
          borderRadius: '8px',
          padding: '8px 16px',
          color: '#0d1117',
          fontWeight: 600,
          fontSize: '12px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        <span>🤖</span>
        <span>{currentModel?.name || 'Select Model'}</span>
        <span style={{ fontSize: '10px' }}>▼</span>
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: '8px',
          background: '#161b22',
          border: '1px solid #30363d',
          borderRadius: '12px',
          padding: '16px',
          width: '320px',
          zIndex: 1000,
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
        }}>
          <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#e6edf3' }}>
            Free AI Models
          </div>
          
          <div style={{ fontSize: '11px', color: '#7d8590', marginBottom: '12px' }}>
            Task: <span style={{ color: '#00e5a0' }}>{currentTask}</span>
            <br />
            Recommended: <span style={{ color: '#7c6af7' }}>{getModelById(recommendedModel)?.name}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
            {FREE_MODELS.map(model => (
              <div
                key={model.id}
                onClick={() => handleSelect(model.id)}
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  background: selectedModel === model.id ? '#00e5a022' : 'transparent',
                  border: selectedModel === model.id ? '1px solid #00e5a0' : '1px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: '#e6edf3' }}>
                    {model.name}
                  </span>
                  {model.id === recommendedModel && (
                    <span style={{ fontSize: '10px', background: '#7c6af722', color: '#7c6af7', padding: '2px 6px', borderRadius: '4px' }}>
                      Recommended
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '11px', color: '#7d8590' }}>
                  {model.provider} • {model.contextWindow.toLocaleString()} ctx • {model.speed}
                </div>
                <div style={{ fontSize: '10px', color: '#7d8590', marginTop: '4px' }}>
                  Best for: {model.bestFor.join(', ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
