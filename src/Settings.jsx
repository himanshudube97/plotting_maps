import React, { useState, useEffect } from 'react';
import DataConfigEditor from './DataConfigEditor.jsx';
import StreamlinedUploader from './components/CustomGeoJSON/StreamlinedUploader.jsx';
import { storeCustomLayer, getAllCustomLayers, deleteCustomLayer } from './utils/geoStorage.js';
import { processCustomGeoJSON, createLayerMetadata } from './utils/geoProcessing.js';
import './Settings.css';

const Settings = ({ isOpen, onClose, hierarchyConfig, onHierarchyChange, onDataConfigChange }) => {
  const [localConfig, setLocalConfig] = useState(hierarchyConfig);
  const [dataConfig, setDataConfig] = useState(null);
  const [activeTab, setActiveTab] = useState('hierarchy');
  const [customLayers, setCustomLayers] = useState([]);
  const [loadingLayers, setLoadingLayers] = useState(false);

  useEffect(() => {
    // Ensure the localConfig has the required property structure
    const configWithRequiredDefaults = {
      ...hierarchyConfig,
      india: {
        ...hierarchyConfig.india,
        required: hierarchyConfig.india?.required || { state: true, district: false, ward: false }
      },
      kenya: {
        ...hierarchyConfig.kenya,
        required: hierarchyConfig.kenya?.required || { county: true, constituency: false, ward: false }
      }
    };
    setLocalConfig(configWithRequiredDefaults);
  }, [hierarchyConfig]);

  // Load custom layers when Settings opens or when activeTab changes to 'layers'
  useEffect(() => {
    if (isOpen && activeTab === 'layers') {
      loadCustomLayers();
    }
  }, [isOpen, activeTab]);

  const loadCustomLayers = async () => {
    setLoadingLayers(true);
    try {
      const layers = await getAllCustomLayers();
      setCustomLayers(layers);
    } catch (error) {
      console.error('Failed to load custom layers:', error);
    } finally {
      setLoadingLayers(false);
    }
  };

  const handleDeleteLayer = async (layerId) => {
    if (confirm('Are you sure you want to delete this layer?')) {
      try {
        await deleteCustomLayer(layerId);
        setCustomLayers(prev => prev.filter(layer => layer.id !== layerId));
        // Notify parent to refresh data
        onDataConfigChange?.();
      } catch (error) {
        console.error('Failed to delete layer:', error);
        alert('Failed to delete layer');
      }
    }
  };

  const handleSave = () => {
    onHierarchyChange(localConfig);
    onClose();
  };

  const handleReset = () => {
    const defaultConfig = {
      india: {
        levels: ['state', 'district', 'ward'],
        enabled: { state: true, district: true, ward: true },
        required: { state: true, district: false, ward: false }
      },
      kenya: {
        levels: ['county', 'constituency', 'ward'],
        enabled: { county: true, constituency: true, ward: true },
        required: { county: true, constituency: false, ward: false }
      }
    };
    setLocalConfig(defaultConfig);
  };

  const updateCountryConfig = (country, level, enabled) => {
    // Don't allow disabling required levels
    if (localConfig[country]?.required?.[level] && !enabled) {
      return;
    }
    
    setLocalConfig(prev => ({
      ...prev,
      [country]: {
        ...prev[country],
        enabled: {
          ...prev[country].enabled,
          [level]: enabled
        },
        // Preserve the required structure
        required: prev[country].required
      }
    }));
  };



  const handleDataConfigChange = (newDataConfig) => {
    setDataConfig(newDataConfig);
    // Notify parent component to refresh map data
    onDataConfigChange?.();
  };

  const handleStreamlinedUpload = async (uploadData) => {
    try {
      console.log('🚀 Processing streamlined upload:', uploadData);
      
      // Process the GeoJSON with the streamlined data
      const processedData = await processCustomGeoJSON(
        uploadData.geoJson,
        uploadData.propertyMapping,
        uploadData.scope,
        uploadData.metadata
      );
      
      // Create metadata
      const metadata = createLayerMetadata(
        uploadData.file,
        uploadData.geoJson,
        uploadData.propertyMapping,
        uploadData.scope,
        uploadData.metadata
      );
      
      // Store the layer
      const layerData = {
        id: metadata.id,
        geoJson: uploadData.geoJson,
        processedFeatures: processedData.processedFeatures,
        metadata
      };
      
      await storeCustomLayer(layerData);
      
      console.log('✅ Streamlined upload completed successfully');
      alert('✅ Layer uploaded successfully!');
      
      // Refresh layers list if on layers tab
      if (activeTab === 'layers') {
        loadCustomLayers();
      }
      
      // Notify parent component that custom layers have changed
      onDataConfigChange?.();
      
    } catch (error) {
      console.error('❌ Streamlined upload failed:', error);
      alert('Upload failed: ' + error.message);
    }
  };

  if (!isOpen) return null;

  const tabs = [
    { id: 'hierarchy', label: 'Hierarchy', description: 'Configure map drill-down levels' },
    { id: 'editor', label: 'Data Editor', description: 'Edit data values' },
    { id: 'layers', label: 'Layers', description: 'Manage existing layers' },
    { id: 'upload', label: 'Upload Layers', description: 'Add custom GeoJSON layers' }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'hierarchy':
        return (
          <div className="settings-content">
            <div className="settings-section">
              <h3>India Hierarchy</h3>
              <p className="section-description">Configure the drill-down levels for India</p>
              <div className="hierarchy-config">
                {localConfig.india.levels.map((level, index) => {
                  const isRequired = localConfig.india.required?.[level];
                  return (
                    <div key={level} className={`level-item ${isRequired ? 'required' : ''}`}>
                      <div className="level-info">
                        <span className="level-number">{index + 1}</span>
                        <span className="level-name">
                          {level.charAt(0).toUpperCase() + level.slice(1)}
                          {isRequired && <span className="required-badge">Required</span>}
                        </span>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={localConfig.india.enabled[level]}
                          disabled={isRequired}
                          onChange={(e) => updateCountryConfig('india', level, e.target.checked)}
                        />
                        <span className={`slider ${isRequired ? 'disabled' : ''}`}></span>
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="settings-section">
              <h3>Kenya Hierarchy</h3>
              <p className="section-description">Configure the drill-down levels for Kenya</p>
              <div className="hierarchy-config">
                {localConfig.kenya.levels.map((level, index) => {
                  const isRequired = localConfig.kenya.required?.[level];
                  return (
                    <div key={level} className={`level-item ${isRequired ? 'required' : ''}`}>
                      <div className="level-info">
                        <span className="level-number">{index + 1}</span>
                        <span className="level-name">
                          {level.charAt(0).toUpperCase() + level.slice(1)}
                          {isRequired && <span className="required-badge">Required</span>}
                        </span>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={localConfig.kenya.enabled[level]}
                          disabled={isRequired}
                          onChange={(e) => updateCountryConfig('kenya', level, e.target.checked)}
                        />
                        <span className={`slider ${isRequired ? 'disabled' : ''}`}></span>
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="hierarchy-preview">
              <h4>Hierarchy Preview</h4>
              <div className="preview-section">
                <strong>India:</strong> 
                <span className="preview-path">
                  {localConfig.india.levels
                    .filter(level => localConfig.india.enabled[level])
                    .map(level => level.charAt(0).toUpperCase() + level.slice(1))
                    .join(' → ') || 'No levels enabled'}
                </span>
              </div>
              <div className="preview-section">
                <strong>Kenya:</strong> 
                <span className="preview-path">
                  {localConfig.kenya.levels
                    .filter(level => localConfig.kenya.enabled[level])
                    .map(level => level.charAt(0).toUpperCase() + level.slice(1))
                    .join(' → ') || 'No levels enabled'}
                </span>
              </div>
            </div>
          </div>
        );

      case 'editor':
        return (
          <div className="settings-content">
            <DataConfigEditor 
              hierarchyConfig={localConfig} 
              onDataConfigChange={handleDataConfigChange}
            />
          </div>
        );

      case 'layers':
        return (
          <div className="settings-content">
            <div className="settings-section">
              <div className="section-header">
                <h3>Existing Layers</h3>
                <button onClick={loadCustomLayers} className="btn btn-secondary btn-small">
                  Refresh
                </button>
              </div>
              <p className="section-description">
                Manage your default and custom uploaded layers
              </p>

              {loadingLayers ? (
                <div className="loading-message">
                  Loading layers...
                </div>
              ) : (
                <div>
                  {/* Default Layers */}
                  <div className="layers-grid">
                    <div className="layer-card default-layer">
                      <div className="layer-header">
                        <h4 className="layer-name">World Countries</h4>
                        <span className="layer-badge default-badge">Default</span>
                      </div>
                      <div className="layer-info">
                        <div className="layer-meta">
                          <span className="layer-level">countries</span>
                          <span className="layer-features">195 countries</span>
                        </div>
                        <p className="layer-description">
                          Default world map showing all countries for initial navigation
                        </p>
                      </div>
                    </div>

                    <div className="layer-card default-layer">
                      <div className="layer-header">
                        <h4 className="layer-name">India States</h4>
                        <span className="layer-badge default-badge">Default</span>
                      </div>
                      <div className="layer-info">
                        <div className="layer-meta">
                          <span className="layer-level">states</span>
                          <span className="layer-features">36 states & UTs</span>
                        </div>
                        <p className="layer-description">
                          All Indian states and union territories
                        </p>
                      </div>
                    </div>

                    <div className="layer-card default-layer">
                      <div className="layer-header">
                        <h4 className="layer-name">India Districts</h4>
                        <span className="layer-badge default-badge">Default</span>
                      </div>
                      <div className="layer-info">
                        <div className="layer-meta">
                          <span className="layer-level">districts</span>
                          <span className="layer-features">640+ districts</span>
                        </div>
                        <p className="layer-description">
                          District-level boundaries for all Indian states
                        </p>
                      </div>
                    </div>

                    <div className="layer-card default-layer">
                      <div className="layer-header">
                        <h4 className="layer-name">Kenya Counties</h4>
                        <span className="layer-badge default-badge">Default</span>
                      </div>
                      <div className="layer-info">
                        <div className="layer-meta">
                          <span className="layer-level">counties</span>
                          <span className="layer-features">47 counties</span>
                        </div>
                        <p className="layer-description">
                          All Kenyan county boundaries
                        </p>
                      </div>
                    </div>

                    <div className="layer-card default-layer">
                      <div className="layer-header">
                        <h4 className="layer-name">Kenya Constituencies</h4>
                        <span className="layer-badge default-badge">Default</span>
                      </div>
                      <div className="layer-info">
                        <div className="layer-meta">
                          <span className="layer-level">constituencies</span>
                          <span className="layer-features">290 constituencies</span>
                        </div>
                        <p className="layer-description">
                          Parliamentary constituency boundaries
                        </p>
                      </div>
                    </div>

                    <div className="layer-card default-layer">
                      <div className="layer-header">
                        <h4 className="layer-name">Kenya Wards</h4>
                        <span className="layer-badge default-badge">Default</span>
                      </div>
                      <div className="layer-info">
                        <div className="layer-meta">
                          <span className="layer-level">wards</span>
                          <span className="layer-features">1450+ wards</span>
                        </div>
                        <p className="layer-description">
                          Electoral ward boundaries across Kenya
                        </p>
                      </div>
                    </div>

                    {/* Custom Layers */}
                    {customLayers.map(layer => (
                      <div key={layer.id} className="layer-card custom-layer">
                        <div className="layer-header">
                          <h4 className="layer-name">{layer.name}</h4>
                          <span className="layer-badge custom-badge">Custom</span>
                        </div>
                        <div className="layer-info">
                          <div className="layer-meta">
                            <span className="layer-level">{layer.scope?.level}</span>
                            <span className="layer-features">{layer.stats?.featureCount} features</span>
                          </div>
                          <p className="layer-description">
                            {layer.description || 'Custom uploaded layer'}
                          </p>
                          <div className="layer-details">
                            <small>Country: {layer.scope?.country}</small>
                            <small>Upload: {new Date(layer.uploadDate).toLocaleDateString()}</small>
                            <small>Type: {layer.scope?.uploadType}</small>
                          </div>
                        </div>
                        <div className="layer-actions">
                          <button
                            onClick={() => handleDeleteLayer(layer.id)}
                            className="btn btn-danger btn-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}

                    {customLayers.length === 0 && !loadingLayers && (
                      <div className="empty-state">
                        <p>No custom layers uploaded yet</p>
                        <p>Switch to the "Upload Layers" tab to add your own GeoJSON files</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'upload':
        return (
          <div className="settings-content">
            <div className="settings-section">
              <h3>Upload Custom GeoJSON Layer</h3>
              <p className="section-description">Upload your own GeoJSON files to customize the map</p>
              
              <StreamlinedUploader
                onComplete={handleStreamlinedUpload}
                onCancel={() => {}} // No cancel needed since this is always visible
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="settings-overlay">
      <div className="settings-modal">
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="settings-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              title={tab.description}
            >
              {tab.label}
            </button>
          ))}
        </div>
        
        {renderTabContent()}
        
        <div className="settings-footer">
          <button className="btn btn-secondary" onClick={handleReset}>
            Reset to Default
          </button>
          <div className="footer-actions">
            <button className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSave}>
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
