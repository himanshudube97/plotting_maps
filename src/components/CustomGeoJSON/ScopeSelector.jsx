import React, { useState, useEffect } from 'react';
import { validateScope } from '../../utils/geoValidation.js';
import './ScopeSelector.css';

const ScopeSelector = ({ analysis, onScopeChange, onValidationChange }) => {
  const [scope, setScope] = useState({
    type: 'regional',
    target: '',
    level: 'districts'
  });
  
  const [validation, setValidation] = useState({ valid: false, errors: [] });

  // Scope type options
  const scopeTypes = [
    {
      value: 'global',
      label: '🌍 Global',
      description: 'Replace this layer type everywhere in the world',
      examples: ['Replace all country boundaries', 'Use custom world regions']
    },
    {
      value: 'country',
      label: '🇮🇳 Country',
      description: 'Replace this layer type for a specific country',
      examples: ['Replace districts for India only', 'Custom states for USA']
    },
    {
      value: 'regional',
      label: '🏛️ Regional',
      description: 'Replace this layer type for a specific region/state',
      examples: ['Replace districts for Maharashtra', 'Custom counties for California']
    },
    {
      value: 'local',
      label: '🎯 Local',
      description: 'Add detailed features for a specific area',
      examples: ['Add wards for Pune district', 'Custom neighborhoods for Mumbai']
    }
  ];

  // Geographic level options
  const levelOptions = [
    { value: 'countries', label: 'Countries', description: 'National boundaries' },
    { value: 'states', label: 'States/Provinces', description: 'First-level administrative divisions' },
    { value: 'counties', label: 'Counties', description: 'Second-level administrative divisions' },
    { value: 'districts', label: 'Districts', description: 'Administrative districts' },
    { value: 'constituencies', label: 'Constituencies', description: 'Electoral constituencies' },
    { value: 'wards', label: 'Wards', description: 'Local administrative wards' },
    { value: 'subwards', label: 'Sub-wards', description: 'Smaller administrative units' }
  ];

  // Available targets based on scope type
  const getTargetOptions = () => {
    switch (scope.type) {
      case 'country':
        return [
          { value: 'India', label: '🇮🇳 India' },
          { value: 'Kenya', label: '🇰🇪 Kenya' },
          { value: 'USA', label: '🇺🇸 United States' },
          { value: 'Other', label: '🌐 Other Country' }
        ];
      
      case 'regional':
        return [
          // India states
          { value: 'Maharashtra', label: '🇮🇳 Maharashtra (India)' },
          { value: 'Karnataka', label: '🇮🇳 Karnataka (India)' },
          { value: 'Tamil Nadu', label: '🇮🇳 Tamil Nadu (India)' },
          { value: 'Gujarat', label: '🇮🇳 Gujarat (India)' },
          { value: 'Rajasthan', label: '🇮🇳 Rajasthan (India)' },
          // Kenya counties
          { value: 'Nairobi', label: '🇰🇪 Nairobi (Kenya)' },
          { value: 'Mombasa', label: '🇰🇪 Mombasa (Kenya)' },
          { value: 'Nakuru', label: '🇰🇪 Nakuru (Kenya)' },
          { value: 'Other-Regional', label: '🌐 Other Region' }
        ];
      
      case 'local':
        return [
          // India districts
          { value: 'Pune', label: '🇮🇳 Pune District (Maharashtra)' },
          { value: 'Mumbai', label: '🇮🇳 Mumbai District (Maharashtra)' },
          { value: 'Bangalore', label: '🇮🇳 Bangalore District (Karnataka)' },
          { value: 'Chennai', label: '🇮🇳 Chennai District (Tamil Nadu)' },
          // Kenya areas
          { value: 'Nairobi-Central', label: '🇰🇪 Nairobi Central (Kenya)' },
          { value: 'Mombasa-Island', label: '🇰🇪 Mombasa Island (Kenya)' },
          { value: 'Other-Local', label: '🌐 Other Local Area' }
        ];
      
      default:
        return [];
    }
  };

  // Validate scope when it changes
  useEffect(() => {
    const validationResult = validateScope(scope);
    setValidation(validationResult);
    onValidationChange?.(validationResult);
  }, [scope, onValidationChange]);

  // Notify parent of scope changes
  useEffect(() => {
    onScopeChange?.(scope);
  }, [scope, onScopeChange]);

  const handleScopeChange = (field, value) => {
    setScope(prev => {
      const newScope = { ...prev, [field]: value };
      
      // Clear target when scope type changes
      if (field === 'type') {
        newScope.target = '';
      }
      
      return newScope;
    });
  };

  const selectedScopeType = scopeTypes.find(type => type.value === scope.type);
  const targetOptions = getTargetOptions();
  const needsTarget = scope.type !== 'global';

  return (
    <div className="scope-selector">
      <div className="scope-header">
        <h3>🎯 Scope Configuration</h3>
        <p>Define where and how your custom layer should be applied in the mapping system.</p>
        
        {validation.errors.length > 0 && (
          <div className="validation-errors">
            {validation.errors.map((error, index) => (
              <div key={index} className="validation-error">❌ {error}</div>
            ))}
          </div>
        )}
      </div>

      <div className="scope-fields">
        <div className="scope-field">
          <label className="field-label">
            <span className="label-text">Scope Type <span className="required-star">*</span></span>
            <span className="field-description">How broadly should this layer be applied?</span>
          </label>
          
          <div className="scope-type-grid">
            {scopeTypes.map(type => (
              <div
                key={type.value}
                className={`scope-type-card ${scope.type === type.value ? 'selected' : ''}`}
                onClick={() => handleScopeChange('type', type.value)}
              >
                <div className="card-header">
                  <span className="card-label">{type.label}</span>
                  {scope.type === type.value && <span className="selected-indicator">✓</span>}
                </div>
                <div className="card-description">{type.description}</div>
                <div className="card-examples">
                  <span className="examples-label">Examples:</span>
                  <ul>
                    {type.examples.map((example, index) => (
                      <li key={index}>{example}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>

        {needsTarget && (
          <div className="scope-field">
            <label className="field-label">
              <span className="label-text">Target {scope.type.charAt(0).toUpperCase() + scope.type.slice(1)} <span className="required-star">*</span></span>
              <span className="field-description">Which specific {scope.type} should this layer apply to?</span>
            </label>
            
            <select
              value={scope.target}
              onChange={(e) => handleScopeChange('target', e.target.value)}
              className={`target-select ${!scope.target ? 'empty' : ''}`}
            >
              <option value="">Select {scope.type}...</option>
              {targetOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            
            {scope.target && scope.target.includes('Other') && (
              <div className="custom-target-input">
                <input
                  type="text"
                  placeholder={`Enter custom ${scope.type} name...`}
                  className="custom-target-field"
                  onChange={(e) => handleScopeChange('target', e.target.value)}
                />
              </div>
            )}
          </div>
        )}

        <div className="scope-field">
          <label className="field-label">
            <span className="label-text">Geographic Level <span className="required-star">*</span></span>
            <span className="field-description">What type of geographic features does this layer contain?</span>
          </label>
          
          <select
            value={scope.level}
            onChange={(e) => handleScopeChange('level', e.target.value)}
            className="level-select"
          >
            {levelOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label} - {option.description}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="scope-preview">
        <h4>📋 Configuration Preview</h4>
        <div className="preview-content">
          <div className="preview-item">
            <span className="preview-label">Scope:</span>
            <span className="preview-value">
              {selectedScopeType?.label}
              {scope.target && ` → ${scope.target}`}
            </span>
          </div>
          <div className="preview-item">
            <span className="preview-label">Level:</span>
            <span className="preview-value">
              {levelOptions.find(l => l.value === scope.level)?.label}
            </span>
          </div>
          <div className="preview-item">
            <span className="preview-label">Effect:</span>
            <span className="preview-value">
              {scope.type === 'global' && `Replace all ${scope.level} globally`}
              {scope.type === 'country' && scope.target && `Replace ${scope.level} for ${scope.target}`}
              {scope.type === 'regional' && scope.target && `Replace ${scope.level} in ${scope.target}`}
              {scope.type === 'local' && scope.target && `Add detailed ${scope.level} for ${scope.target}`}
              {(!scope.target && needsTarget) && 'Please select a target to see the effect'}
            </span>
          </div>
        </div>
      </div>

      {analysis && (
        <div className="analysis-info">
          <h4>📊 Layer Analysis</h4>
          <div className="analysis-content">
            <div className="analysis-item">
              <span className="analysis-label">Features:</span>
              <span className="analysis-value">{analysis.info?.validFeatures || 0} valid features</span>
            </div>
            <div className="analysis-item">
              <span className="analysis-label">Geometry:</span>
              <span className="analysis-value">
                {analysis.info?.geometryTypes ? 
                  Object.entries(analysis.info.geometryTypes)
                    .map(([type, count]) => `${count} ${type}`)
                    .join(', ') 
                  : 'Unknown'
                }
              </span>
            </div>
            <div className="analysis-item">
              <span className="analysis-label">Properties:</span>
              <span className="analysis-value">{analysis.properties?.length || 0} properties found</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScopeSelector;