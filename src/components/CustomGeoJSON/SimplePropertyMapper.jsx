import React, { useState, useEffect } from 'react';
import './SimplePropertyMapper.css';

const SimplePropertyMapper = ({ analysis, onMappingChange, onValidationChange }) => {
  const [mapping, setMapping] = useState({
    name: '',
    id: ''
  });

  const [validation, setValidation] = useState({ valid: false, errors: [] });

  // Initialize with first reasonable property for name
  useEffect(() => {
    if (analysis?.properties?.length > 0) {
      // Find the first string property with high completeness for name
      const nameCandidate = analysis.properties.find(prop => 
        prop.type === 'string' && prop.completeness > 80
      ) || analysis.properties[0];

      // Find the first numeric property or property with 'id' in name for ID
      const idCandidate = analysis.properties.find(prop => 
        prop.name.toLowerCase().includes('id') || 
        prop.name.toLowerCase().includes('code') ||
        prop.type === 'number'
      );

      setMapping({
        name: nameCandidate?.name || '',
        id: idCandidate?.name || ''
      });
    }
  }, [analysis]);

  // Validate mapping
  useEffect(() => {
    const errors = [];
    
    if (!mapping.name) {
      errors.push('Name field is required');
    } else if (!analysis.properties.find(p => p.name === mapping.name)) {
      errors.push('Selected name field not found in data');
    }

    if (mapping.id && !analysis.properties.find(p => p.name === mapping.id)) {
      errors.push('Selected ID field not found in data');
    }

    const isValid = errors.length === 0;
    setValidation({ valid: isValid, errors });
    onValidationChange?.({ valid: isValid, errors });
  }, [mapping, analysis, onValidationChange]);

  // Notify parent of changes
  useEffect(() => {
    onMappingChange?.(mapping);
  }, [mapping, onMappingChange]);

  const handleMappingChange = (field, value) => {
    setMapping(prev => ({ ...prev, [field]: value }));
  };

  if (!analysis?.properties?.length) {
    return (
      <div className="simple-property-mapper">
        <div className="no-properties">
          <p>❌ No properties found in the uploaded GeoJSON file.</p>
          <p>Please upload a valid GeoJSON file with feature properties.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="simple-property-mapper">
      <div className="mapper-header">
        <h3>🗺️ Map Your Data Fields</h3>
        <p>Tell us which fields in your GeoJSON contain the feature names and IDs.</p>
      </div>

      {validation.errors.length > 0 && (
        <div className="validation-errors">
          {validation.errors.map((error, index) => (
            <div key={index} className="validation-error">❌ {error}</div>
          ))}
        </div>
      )}

      <div className="mapping-fields">
        <div className="mapping-field required">
          <label className="field-label">
            <span className="label-text">
              Feature Name Field <span className="required-star">*</span>
            </span>
            <span className="field-description">
              Which field contains the name of each geographic feature?
            </span>
          </label>
          
          <select
            value={mapping.name}
            onChange={(e) => handleMappingChange('name', e.target.value)}
            className={`field-select ${!mapping.name ? 'empty' : ''}`}
          >
            <option value="">Select name field...</option>
            {analysis.properties.map(prop => (
              <option key={prop.name} value={prop.name}>
                {prop.name} ({prop.type}, {prop.completeness}% complete)
              </option>
            ))}
          </select>

          {mapping.name && (
            <div className="field-preview">
              <span className="preview-label">Sample values:</span>
              <div className="sample-values">
                {analysis.properties
                  .find(p => p.name === mapping.name)?.samples
                  ?.slice(0, 5)
                  .map((sample, index) => (
                    <span key={index} className="sample-value">{sample}</span>
                  ))}
              </div>
            </div>
          )}
        </div>

        <div className="mapping-field optional">
          <label className="field-label">
            <span className="label-text">ID Field (Optional)</span>
            <span className="field-description">
              Which field contains unique identifiers? (Leave empty if none)
            </span>
          </label>
          
          <select
            value={mapping.id}
            onChange={(e) => handleMappingChange('id', e.target.value)}
            className="field-select"
          >
            <option value="">No ID field</option>
            {analysis.properties.map(prop => (
              <option key={prop.name} value={prop.name}>
                {prop.name} ({prop.type}, {prop.completeness}% complete)
              </option>
            ))}
          </select>

          {mapping.id && (
            <div className="field-preview">
              <span className="preview-label">Sample values:</span>
              <div className="sample-values">
                {analysis.properties
                  .find(p => p.name === mapping.id)?.samples
                  ?.slice(0, 5)
                  .map((sample, index) => (
                    <span key={index} className="sample-value">{sample}</span>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="data-summary">
        <h4>📊 Your Data Summary</h4>
        <div className="summary-grid">
          <div className="summary-item">
            <span className="summary-label">Total Features:</span>
            <span className="summary-value">{analysis.info?.validFeatures || 0}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Available Fields:</span>
            <span className="summary-value">{analysis.properties.length}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Geometry Type:</span>
            <span className="summary-value">
              {analysis.info?.geometryTypes ? 
                Object.keys(analysis.info.geometryTypes).join(', ') : 'Unknown'}
            </span>
          </div>
        </div>
      </div>

      <div className="available-fields">
        <h4>📋 All Available Fields</h4>
        <div className="fields-grid">
          {analysis.properties.map(prop => (
            <div key={prop.name} className="field-item">
              <div className="field-name">{prop.name}</div>
              <div className="field-meta">
                <span className="field-type">{prop.type}</span>
                <span className="field-completeness">{prop.completeness}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SimplePropertyMapper;