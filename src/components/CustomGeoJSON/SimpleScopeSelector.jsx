import React, { useState, useEffect } from 'react';
import { 
  getAvailableCountries, 
  getRegionsForCountry, 
  getTargetsForLevel, 
  getAvailableLevels,
  isValidLevelForCountry 
} from '../../utils/geoDataLoader.js';
import './SimpleScopeSelector.css';

const SimpleScopeSelector = ({ analysis, onScopeChange, onValidationChange }) => {
  const [uploadType, setUploadType] = useState('');
  const [config, setConfig] = useState({
    type: '',
    country: '', // Add country selection
    level: '',
    replaceScope: '', // 'worldwide', 'country', 'regional'
    parentField: '',
    targetCountry: '',
    targetRegion: '',
    localTarget: '',
    customInput: '' // For custom "Other" inputs
  });

  const [validation, setValidation] = useState({ valid: false, errors: [] });
  const [availableCountries, setAvailableCountries] = useState([]);
  const [availableLevels, setAvailableLevels] = useState([]);
  const [availableRegions, setAvailableRegions] = useState([]);
  const [availableTargets, setAvailableTargets] = useState([]);
  const [showCustomInput, setShowCustomInput] = useState(false);

  // Load available countries on mount
  useEffect(() => {
    setAvailableCountries(getAvailableCountries());
  }, []);

  // Load available levels when country changes
  useEffect(() => {
    if (config.country) {
      setAvailableLevels(getAvailableLevels(config.country));
    } else {
      setAvailableLevels([]);
    }
  }, [config.country]);

  // Load available regions when country changes
  useEffect(() => {
    if (config.country) {
      getRegionsForCountry(config.country).then(setAvailableRegions);
    } else {
      setAvailableRegions([]);
    }
  }, [config.country]);

  // Load available targets when country and level change
  useEffect(() => {
    if (config.country && config.level) {
      getTargetsForLevel(config.country, config.level).then(setAvailableTargets);
    } else {
      setAvailableTargets([]);
    }
  }, [config.country, config.level]);

  // Handle custom input visibility
  useEffect(() => {
    const needsCustomInput = 
      (config.targetRegion === 'Other') || 
      (config.localTarget === 'Other');
    setShowCustomInput(needsCustomInput);
  }, [config.targetRegion, config.localTarget]);

  // Validate configuration
  useEffect(() => {
    const errors = [];
    
    if (!uploadType) {
      errors.push('Please select an upload type');
    } else if (!config.country) {
      errors.push('Please select a country');
    } else if (!config.level) {
      errors.push('Please select a geographic level');
    } else if (uploadType === 'replace') {
      if (!config.replaceScope) {
        errors.push('Please select replacement scope');
      } else if (config.replaceScope !== 'worldwide' && !config.parentField) {
        errors.push('Please select parent field for scoped replacement');
      } else if (config.replaceScope === 'country' && !config.targetCountry) {
        errors.push('Please select target country');
      } else if (config.replaceScope === 'regional' && (!config.targetCountry || !config.targetRegion)) {
        errors.push('Please select target country and region');
      }
    } else if (uploadType === 'local') {
      if (!config.localTarget) {
        errors.push('Please select target area for local addition');
      } else if (config.localTarget === 'Other' && !config.customInput) {
        errors.push('Please specify custom target area');
      }
    }
    
    // Validate custom inputs
    if (config.targetRegion === 'Other' && !config.customInput) {
      errors.push('Please specify custom region name');
    }

    const isValid = errors.length === 0;
    setValidation({ valid: isValid, errors });
    onValidationChange?.({ valid: isValid, errors });
  }, [uploadType, config]);

  // Notify parent of changes
  useEffect(() => {
    if (validation.valid) {
      const scopeConfig = {
        uploadType,
        country: config.country,
        level: config.level,
        ...(uploadType === 'replace' && {
          replaceScope: config.replaceScope,
          parentField: config.parentField,
          targetCountry: config.targetCountry,
          targetRegion: config.targetRegion === 'Other' ? config.customInput : config.targetRegion
        }),
        ...(uploadType === 'local' && {
          localTarget: config.localTarget === 'Other' ? config.customInput : config.localTarget
        })
      };
      onScopeChange?.(scopeConfig);
    }
  }, [uploadType, config, validation.valid]);

  const handleTypeChange = (type) => {
    setUploadType(type);
    setConfig(prev => ({ ...prev, type }));
  };

  const handleConfigChange = (field, value) => {
    setConfig(prev => {
      const newConfig = { ...prev, [field]: value };
      
      // Clear dependent fields when parent changes
      if (field === 'country') {
        newConfig.level = '';
        newConfig.targetCountry = '';
        newConfig.targetRegion = '';
        newConfig.localTarget = '';
        newConfig.customInput = '';
      }
      if (field === 'level') {
        newConfig.localTarget = '';
        newConfig.customInput = '';
      }
      if (field === 'targetCountry') {
        newConfig.targetRegion = '';
        newConfig.customInput = '';
      }
      if (field === 'targetRegion' || field === 'localTarget') {
        if (value !== 'Other') {
          newConfig.customInput = '';
        }
      }
      
      return newConfig;
    });
  };

  return (
    <div className="simple-scope-selector">
      <div className="selector-header">
        <h3>🎯 Choose Upload Type</h3>
        <p>How do you want to use your custom GeoJSON data?</p>
      </div>

      {validation.errors.length > 0 && (
        <div className="validation-errors">
          {validation.errors.map((error, index) => (
            <div key={index} className="validation-error">❌ {error}</div>
          ))}
        </div>
      )}

      <div className="upload-type-selection">
        <div
          className={`type-card ${uploadType === 'replace' ? 'selected' : ''}`}
          onClick={() => handleTypeChange('replace')}
        >
          <div className="card-icon">🌍</div>
          <h4>Replace Entire Layer</h4>
          <p>Replace existing geographic data with your custom layer</p>
          <div className="card-examples">
            <span>Examples:</span>
            <ul>
              <li>Replace all districts in India</li>
              <li>Replace all counties in Kenya</li>
              <li>Replace world country boundaries</li>
            </ul>
          </div>
        </div>

        <div
          className={`type-card ${uploadType === 'local' ? 'selected' : ''}`}
          onClick={() => handleTypeChange('local')}
        >
          <div className="card-icon">📍</div>
          <h4>Local Addition</h4>
          <p>Add detailed features for a specific geographic area</p>
          <div className="card-examples">
            <span>Examples:</span>
            <ul>
              <li>Add wards for Pune district</li>
              <li>Add constituencies for Nairobi</li>
              <li>Add sub-districts for a state</li>
            </ul>
          </div>
        </div>
      </div>

      {uploadType && (
        <div className="configuration-section">
          <h4>📋 Configuration</h4>
          
          <div className="config-field">
            <label className="config-label">
              Target Country <span className="required-star">*</span>
            </label>
            <select
              value={config.country}
              onChange={(e) => handleConfigChange('country', e.target.value)}
              className="config-select"
            >
              <option value="">Select country...</option>
              {availableCountries.map(country => (
                <option key={country.value} value={country.value}>
                  {country.label}
                </option>
              ))}
            </select>
          </div>

          {config.country && (
            <div className="config-field">
              <label className="config-label">
                Geographic Level <span className="required-star">*</span>
              </label>
              <select
                value={config.level}
                onChange={(e) => handleConfigChange('level', e.target.value)}
                className="config-select"
              >
                <option value="">Select level...</option>
                {availableLevels.map(level => (
                  <option key={level.value} value={level.value}>
                    {level.label} - {level.example}
                  </option>
                ))}
              </select>
            </div>
          )}

          {uploadType === 'replace' && config.level && (
            <div className="replace-config">
              <div className="config-field">
                <label className="config-label">
                  Replacement Scope <span className="required-star">*</span>
                </label>
                <select
                  value={config.replaceScope}
                  onChange={(e) => handleConfigChange('replaceScope', e.target.value)}
                  className="config-select"
                >
                  <option value="">Select scope...</option>
                  <option value="worldwide">🌍 World-wide (replace globally)</option>
                  <option value="country">🇮🇳 Country-specific</option>
                  <option value="regional">🏛️ Regional (state/province)</option>
                </select>
              </div>

              {config.replaceScope === 'country' && (
                <div className="config-field">
                  <label className="config-label">
                    Target Country <span className="required-star">*</span>
                  </label>
                  <select
                    value={config.targetCountry}
                    onChange={(e) => handleConfigChange('targetCountry', e.target.value)}
                    className="config-select"
                  >
                    <option value="">Select country...</option>
                    {availableCountries.map(country => (
                      <option key={country.value} value={country.value}>
                        {country.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {config.replaceScope === 'regional' && (
                <>
                  <div className="config-field">
                    <label className="config-label">
                      Target Country <span className="required-star">*</span>
                    </label>
                    <select
                      value={config.targetCountry}
                      onChange={(e) => handleConfigChange('targetCountry', e.target.value)}
                      className="config-select"
                    >
                      <option value="">Select country...</option>
                      {availableCountries.map(country => (
                        <option key={country.value} value={country.value}>
                          {country.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {config.targetCountry && (
                    <div className="config-field">
                      <label className="config-label">
                        Target Region <span className="required-star">*</span>
                      </label>
                      <select
                        value={config.targetRegion}
                        onChange={(e) => handleConfigChange('targetRegion', e.target.value)}
                        className="config-select"
                      >
                        <option value="">Select region...</option>
                        {availableRegions.map(region => (
                          <option key={region.value} value={region.value}>
                            {region.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              )}

              {config.replaceScope && config.replaceScope !== 'worldwide' && (
                <div className="config-field">
                  <label className="config-label">
                    Parent Field <span className="required-star">*</span>
                  </label>
                  <select
                    value={config.parentField}
                    onChange={(e) => handleConfigChange('parentField', e.target.value)}
                    className="config-select"
                  >
                    <option value="">Select parent field...</option>
                    {analysis?.properties?.map(prop => (
                      <option key={prop.name} value={prop.name}>
                        {prop.name} ({prop.type})
                      </option>
                    ))}
                  </select>
                  <div className="field-help">
                    Which field in your data links to the parent level?
                  </div>
                </div>
              )}
            </div>
          )}

          {uploadType === 'local' && config.level && (
            <div className="local-config">
              <div className="config-field">
                <label className="config-label">
                  Target Area <span className="required-star">*</span>
                </label>
                <select
                  value={config.localTarget}
                  onChange={(e) => handleConfigChange('localTarget', e.target.value)}
                  className="config-select"
                >
                  <option value="">Select target area...</option>
                  {availableTargets.map(target => (
                    <option key={target.value} value={target.value}>
                      {target.label}
                    </option>
                  ))}
                </select>
                <div className="field-help">
                  Which specific area will these {config.level} be added to?
                </div>
              </div>
            </div>
          )}

          {showCustomInput && (
            <div className="config-field">
              <label className="config-label">
                Custom Area Name <span className="required-star">*</span>
              </label>
              <input
                type="text"
                value={config.customInput}
                onChange={(e) => handleConfigChange('customInput', e.target.value)}
                className="config-select"
                placeholder="Enter custom area name..."
              />
              <div className="field-help">
                Please specify the exact name for the custom area.
              </div>
            </div>
          )}
        </div>
      )}

      {validation.valid && (
        <div className="config-preview">
          <h4>✅ Configuration Preview</h4>
          <div className="preview-content">
            <div className="preview-item">
              <strong>Upload Type:</strong> {uploadType === 'replace' ? 'Replace Entire Layer' : 'Local Addition'}
            </div>
            <div className="preview-item">
              <strong>Country:</strong> {config.country}
            </div>
            <div className="preview-item">
              <strong>Level:</strong> {config.level}
            </div>
            {uploadType === 'replace' && (
              <>
                <div className="preview-item">
                  <strong>Scope:</strong> {config.replaceScope}
                </div>
                {config.targetCountry && (
                  <div className="preview-item">
                    <strong>Target:</strong> {config.targetRegion ? `${config.targetRegion}, ${config.targetCountry}` : config.targetCountry}
                  </div>
                )}
                {config.parentField && (
                  <div className="preview-item">
                    <strong>Parent Field:</strong> {config.parentField}
                  </div>
                )}
              </>
            )}
            {uploadType === 'local' && (
              <div className="preview-item">
                <strong>Target Area:</strong> {config.localTarget === 'Other' ? config.customInput : config.localTarget}
              </div>
            )}
            {config.customInput && (config.targetRegion === 'Other' || config.localTarget === 'Other') && (
              <div className="preview-item">
                <strong>Custom Name:</strong> {config.customInput}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleScopeSelector;