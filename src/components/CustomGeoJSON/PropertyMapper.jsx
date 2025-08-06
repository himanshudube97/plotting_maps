import React, { useState, useEffect } from 'react';
import { validatePropertyMapping } from '../../utils/geoValidation.js';
import './PropertyMapper.css';

const PropertyMapper = ({ analysis, onMappingChange, onValidationChange }) => {
  const [mapping, setMapping] = useState({
    name: '',
    parent: '',
    id: '',
    description: ''
  });
  
  const [validation, setValidation] = useState({ valid: false, errors: [], warnings: [] });
  const [showSuggestions, setShowSuggestions] = useState(true);

  // Initialize mapping with suggestions
  useEffect(() => {
    if (analysis?.suggestions) {
      const initialMapping = {
        name: analysis.suggestions.name[0]?.property || '',
        parent: analysis.suggestions.parent[0]?.property || '',
        id: analysis.suggestions.id[0]?.property || '',
        description: analysis.suggestions.description[0]?.property || ''
      };
      
      setMapping(initialMapping);
    }
  }, [analysis]);

  // Validate mapping when it changes
  useEffect(() => {
    if (analysis?.properties) {
      const validationResult = validatePropertyMapping(analysis.properties, mapping);
      setValidation(validationResult);
      onValidationChange?.(validationResult);
    }
  }, [mapping, analysis, onValidationChange]);

  // Notify parent of mapping changes
  useEffect(() => {
    onMappingChange?.(mapping);
  }, [mapping, onMappingChange]);

  const handleMappingChange = (field, value) => {
    setMapping(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const applySuggestion = (field, property) => {
    handleMappingChange(field, property);
  };

  const clearMapping = (field) => {
    handleMappingChange(field, '');
  };

  if (!analysis?.properties?.length) {
    return (
      <div className="property-mapper">
        <div className="no-properties">
          <p>No properties found in the uploaded GeoJSON file.</p>
          <p>Please upload a valid GeoJSON file with feature properties.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="property-mapper">
      <div className="mapper-header">
        <h3>🗺️ Property Mapping</h3>
        <p>Map your GeoJSON properties to the required fields for the mapping system.</p>
        
        {(validation.errors.length > 0 || validation.warnings.length > 0) && (
          <div className="validation-summary">
            {validation.errors.map((error, index) => (
              <div key={index} className="validation-error">❌ {error}</div>
            ))}
            {validation.warnings.map((warning, index) => (
              <div key={index} className="validation-warning">⚠️ {warning}</div>
            ))}
          </div>
        )}
      </div>

      <div className="mapping-fields">
        <div className="mapping-field required">
          <label className="field-label">
            <span className="label-text">Name Field <span className="required-star">*</span></span>
            <span className="field-description">Property containing the feature name/identifier</span>
          </label>
          
          <div className="field-input-group">
            <select
              value={mapping.name}
              onChange={(e) => handleMappingChange('name', e.target.value)}
              className={`field-select ${!mapping.name ? 'empty' : ''}`}
            >
              <option value="">Select property...</option>
              {analysis.properties.map(prop => (
                <option key={prop.name} value={prop.name}>
                  {prop.name} ({prop.type}, {prop.completeness}% complete)
                </option>
              ))}
            </select>
            
            {mapping.name && (
              <button
                onClick={() => clearMapping('name')}
                className="clear-button"
                title="Clear selection"
              >
                ✕
              </button>
            )}
          </div>

          {showSuggestions && analysis.suggestions.name.length > 0 && (
            <div className="suggestions">
              <span className="suggestions-label">💡 Suggestions:</span>
              {analysis.suggestions.name.slice(0, 3).map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => applySuggestion('name', suggestion.property)}
                  className={`suggestion-button ${suggestion.confidence}`}
                  title={suggestion.reason}
                >
                  {suggestion.property}
                  <span className="confidence-badge">{suggestion.confidence}</span>
                </button>
              ))}
            </div>
          )}

          {mapping.name && (
            <div className="field-preview">
              <span className="preview-label">Sample values:</span>
              <div className="sample-values">
                {analysis.properties
                  .find(p => p.name === mapping.name)?.samples
                  ?.slice(0, 3)
                  .map((sample, index) => (
                    <span key={index} className="sample-value">{sample}</span>
                  ))}
              </div>
            </div>
          )}
        </div>

        <div className="mapping-field optional">
          <label className="field-label">
            <span className="label-text">Parent Field</span>
            <span className="field-description">Property linking to parent geographic level</span>
          </label>
          
          <div className="field-input-group">
            <select
              value={mapping.parent}
              onChange={(e) => handleMappingChange('parent', e.target.value)}
              className="field-select"
            >
              <option value="">None (top-level features)</option>
              {analysis.properties.map(prop => (
                <option key={prop.name} value={prop.name}>
                  {prop.name} ({prop.type}, {prop.completeness}% complete)
                </option>
              ))}
            </select>
            
            {mapping.parent && (
              <button
                onClick={() => clearMapping('parent')}
                className="clear-button"
                title="Clear selection"
              >
                ✕
              </button>
            )}
          </div>

          {showSuggestions && analysis.suggestions.parent.length > 0 && (
            <div className="suggestions">
              <span className="suggestions-label">💡 Suggestions:</span>
              {analysis.suggestions.parent.slice(0, 3).map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => applySuggestion('parent', suggestion.property)}
                  className={`suggestion-button ${suggestion.confidence}`}
                  title={suggestion.reason}
                >
                  {suggestion.property}
                  <span className="confidence-badge">{suggestion.confidence}</span>
                </button>
              ))}
            </div>
          )}

          {mapping.parent && (
            <div className="field-preview">
              <span className="preview-label">Sample values:</span>
              <div className="sample-values">
                {analysis.properties
                  .find(p => p.name === mapping.parent)?.samples
                  ?.slice(0, 3)
                  .map((sample, index) => (
                    <span key={index} className="sample-value">{sample}</span>
                  ))}
              </div>
            </div>
          )}
        </div>

        <div className="mapping-field optional">
          <label className="field-label">
            <span className="label-text">ID Field</span>
            <span className="field-description">Unique identifier property (optional)</span>
          </label>
          
          <div className="field-input-group">
            <select
              value={mapping.id}
              onChange={(e) => handleMappingChange('id', e.target.value)}
              className="field-select"
            >
              <option value="">None</option>
              {analysis.properties.map(prop => (
                <option key={prop.name} value={prop.name}>
                  {prop.name} ({prop.type}, {prop.completeness}% complete)
                </option>
              ))}
            </select>
            
            {mapping.id && (
              <button
                onClick={() => clearMapping('id')}
                className="clear-button"
                title="Clear selection"
              >
                ✕
              </button>
            )}
          </div>

          {showSuggestions && analysis.suggestions.id.length > 0 && (
            <div className="suggestions">
              <span className="suggestions-label">💡 Suggestions:</span>
              {analysis.suggestions.id.slice(0, 3).map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => applySuggestion('id', suggestion.property)}
                  className={`suggestion-button ${suggestion.confidence}`}
                  title={suggestion.reason}
                >
                  {suggestion.property}
                  <span className="confidence-badge">{suggestion.confidence}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mapping-field optional">
          <label className="field-label">
            <span className="label-text">Description Field</span>
            <span className="field-description">Additional descriptive information (optional)</span>
          </label>
          
          <div className="field-input-group">
            <select
              value={mapping.description}
              onChange={(e) => handleMappingChange('description', e.target.value)}
              className="field-select"
            >
              <option value="">None</option>
              {analysis.properties.map(prop => (
                <option key={prop.name} value={prop.name}>
                  {prop.name} ({prop.type}, {prop.completeness}% complete)
                </option>
              ))}
            </select>
            
            {mapping.description && (
              <button
                onClick={() => clearMapping('description')}
                className="clear-button"
                title="Clear selection"
              >
                ✕
              </button>
            )}
          </div>

          {showSuggestions && analysis.suggestions.description.length > 0 && (
            <div className="suggestions">
              <span className="suggestions-label">💡 Suggestions:</span>
              {analysis.suggestions.description.slice(0, 3).map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => applySuggestion('description', suggestion.property)}
                  className={`suggestion-button ${suggestion.confidence}`}
                  title={suggestion.reason}
                >
                  {suggestion.property}
                  <span className="confidence-badge">{suggestion.confidence}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mapper-controls">
        <button
          onClick={() => setShowSuggestions(!showSuggestions)}
          className="toggle-suggestions-button"
        >
          {showSuggestions ? '🙈 Hide' : '💡 Show'} Suggestions
        </button>
        
        <div className="mapping-status">
          {validation.valid ? (
            <span className="status-valid">✅ Mapping valid</span>
          ) : (
            <span className="status-invalid">❌ Mapping incomplete</span>
          )}
        </div>
      </div>

      <div className="available-properties">
        <h4>📋 Available Properties</h4>
        <div className="properties-grid">
          {analysis.properties.map(prop => (
            <div key={prop.name} className="property-item">
              <div className="property-name">{prop.name}</div>
              <div className="property-meta">
                <span className="property-type">{prop.type}</span>
                <span className="property-completeness">{prop.completeness}%</span>
              </div>
              {prop.samples.length > 0 && (
                <div className="property-samples">
                  {prop.samples.slice(0, 2).map((sample, index) => (
                    <span key={index} className="sample">{sample}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PropertyMapper;