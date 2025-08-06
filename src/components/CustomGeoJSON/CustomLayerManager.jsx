import React, { useState, useEffect } from 'react';
import CustomLayerUpload from './CustomLayerUpload.jsx';
import SimplePropertyMapper from './SimplePropertyMapper.jsx';
import SimpleScopeSelector from './SimpleScopeSelector.jsx';
import { 
  storeCustomLayer, 
  getAllCustomLayers, 
  deleteCustomLayer,
  getStorageStats 
} from '../../utils/geoStorage.js';
import { 
  processCustomGeoJSON, 
  createLayerMetadata,
  formatLayerForDisplay 
} from '../../utils/geoProcessing.js';
import { validateCustomLayer } from '../../utils/geoValidation.js';
import './CustomLayerManager.css';

const CustomLayerManager = ({ onLayersChange }) => {
  const [activeTab, setActiveTab] = useState('upload');
  const [customLayers, setCustomLayers] = useState([]);
  const [storageStats, setStorageStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Upload workflow state
  const [uploadStep, setUploadStep] = useState(1);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [propertyMapping, setPropertyMapping] = useState({});
  const [scope, setScope] = useState({});
  const [validationResults, setValidationResults] = useState({});
  const [processing, setProcessing] = useState(false);

  // Load existing custom layers on mount
  useEffect(() => {
    loadCustomLayers();
  }, []);

  const loadCustomLayers = async () => {
    try {
      setLoading(true);
      const [layers, stats] = await Promise.all([
        getAllCustomLayers(),
        getStorageStats()
      ]);
      
      setCustomLayers(layers);
      setStorageStats(stats);
    } catch (error) {
      console.error('Failed to load custom layers:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle file upload and analysis
  const handleFileAnalyzed = (result) => {
    setAnalysisResult(result);
    setUploadStep(2);
  };

  // Handle property mapping changes
  const handleMappingChange = (mapping) => {
    setPropertyMapping(mapping);
  };

  const handleMappingValidation = (validation) => {
    setValidationResults(prev => ({ ...prev, mapping: validation }));
  };

  // Handle scope configuration changes
  const handleScopeChange = (newScope) => {
    setScope(newScope);
  };

  const handleScopeValidation = (validation) => {
    setValidationResults(prev => ({ ...prev, scope: validation }));
  };

  // Handle upload error
  const handleUploadError = (error) => {
    console.error('Upload error:', error);
    // Could show error notification here
  };

  // Process and save the custom layer
  const handleSaveLayer = async () => {
    if (!analysisResult || !propertyMapping.name || !scope.uploadType) {
      return;
    }

    setProcessing(true);

    try {
      // Validate the complete configuration
      const completeValidation = await validateCustomLayer(
        analysisResult.file,
        analysisResult.geoJson,
        propertyMapping,
        scope
      );

      if (!completeValidation.overall.valid) {
        throw new Error(`Validation failed: ${completeValidation.overall.errors.join(', ')}`);
      }

      // Create metadata
      const metadata = createLayerMetadata(
        analysisResult.file,
        analysisResult.geoJson,
        propertyMapping,
        scope
      );

      // Process the GeoJSON
      const processed = processCustomGeoJSON(
        analysisResult.geoJson,
        propertyMapping,
        scope,
        metadata
      );

      // Create layer data structure
      const layerData = {
        id: metadata.id,
        geoJson: analysisResult.geoJson,
        processedFeatures: processed.processedFeatures,
        metadata: processed.metadata
      };

      // Store in IndexedDB
      await storeCustomLayer(layerData);

      // Refresh the layers list
      await loadCustomLayers();

      // Notify parent component
      onLayersChange?.();

      // Reset upload workflow
      resetUploadWorkflow();

      // Switch to manage tab to show the new layer
      setActiveTab('manage');

    } catch (error) {
      console.error('Failed to save custom layer:', error);
      // Could show error notification here
    } finally {
      setProcessing(false);
    }
  };

  // Reset the upload workflow
  const resetUploadWorkflow = () => {
    setUploadStep(1);
    setAnalysisResult(null);
    setPropertyMapping({});
    setScope({});
    setValidationResults({});
  };

  // Delete a custom layer
  const handleDeleteLayer = async (layerId) => {
    if (!confirm('Are you sure you want to delete this custom layer?')) {
      return;
    }

    try {
      await deleteCustomLayer(layerId);
      await loadCustomLayers();
      onLayersChange?.();
    } catch (error) {
      console.error('Failed to delete layer:', error);
    }
  };

  // Check if current configuration is valid for saving
  const canSave = () => {
    return (
      analysisResult &&
      propertyMapping.name &&
      scope.uploadType &&
      scope.country &&
      scope.level &&
      validationResults.mapping?.valid !== false &&
      validationResults.scope?.valid !== false
    );
  };

  if (loading) {
    return (
      <div className="custom-layer-manager">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading custom layers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="custom-layer-manager">
      <div className="manager-header">
        <h2>🗺️ Custom GeoJSON Layers</h2>
        <p>Upload and manage your own geographic data layers for enhanced mapping capabilities.</p>
      </div>

      <div className="manager-tabs">
        <button
          className={`tab-button ${activeTab === 'upload' ? 'active' : ''}`}
          onClick={() => setActiveTab('upload')}
        >
          📤 Upload New Layer
        </button>
        <button
          className={`tab-button ${activeTab === 'manage' ? 'active' : ''}`}
          onClick={() => setActiveTab('manage')}
        >
          📁 Manage Layers ({customLayers.length})
        </button>
        <button
          className={`tab-button ${activeTab === 'defaults' ? 'active' : ''}`}
          onClick={() => setActiveTab('defaults')}
        >
          🏠 Default Layers
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'upload' && (
          <div className="upload-tab">
            {uploadStep === 1 && (
              <div className="upload-step">
                <h3>Step 1: Upload GeoJSON File</h3>
                <CustomLayerUpload
                  onFileAnalyzed={handleFileAnalyzed}
                  onError={handleUploadError}
                />
              </div>
            )}

            {uploadStep === 2 && analysisResult && (
              <div className="upload-step">
                <h3>Step 2: Map Your Data Fields</h3>
                <SimplePropertyMapper
                  analysis={analysisResult.analysis}
                  onMappingChange={handleMappingChange}
                  onValidationChange={handleMappingValidation}
                />
                
                <div className="step-navigation">
                  <button
                    onClick={() => setUploadStep(1)}
                    className="nav-button secondary"
                  >
                    ← Back to Upload
                  </button>
                  <button
                    onClick={() => setUploadStep(3)}
                    className="nav-button primary"
                    disabled={!validationResults.mapping?.valid}
                  >
                    Next: Choose Upload Type →
                  </button>
                </div>
              </div>
            )}

            {uploadStep === 3 && analysisResult && (
              <div className="upload-step">
                <h3>Step 3: Configure Upload Type & Scope</h3>
                <SimpleScopeSelector
                  analysis={analysisResult.analysis}
                  onScopeChange={handleScopeChange}
                  onValidationChange={handleScopeValidation}
                />
                
                <div className="step-navigation">
                  <button
                    onClick={() => setUploadStep(2)}
                    className="nav-button secondary"
                  >
                    ← Back to Field Mapping
                  </button>
                  <button
                    onClick={handleSaveLayer}
                    className="nav-button primary save-button"
                    disabled={!canSave() || processing}
                  >
                    {processing ? (
                      <>
                        <span className="button-spinner"></span>
                        Saving Layer...
                      </>
                    ) : (
                      'Save Custom Layer'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'manage' && (
          <div className="manage-tab">
            <div className="manage-header">
              <h3>Your Custom Layers</h3>
              {storageStats && (
                <div className="storage-stats">
                  <span className="stat">
                    📊 {storageStats.layerCount} layers
                  </span>
                  <span className="stat">
                    💾 {formatFileSize(storageStats.totalSize)}
                  </span>
                  <span className="stat">
                    🗺️ {storageStats.totalFeatures} features
                  </span>
                </div>
              )}
            </div>

            {customLayers.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📁</div>
                <h4>No Custom Layers Yet</h4>
                <p>Upload your first custom GeoJSON layer to get started.</p>
                <button
                  onClick={() => setActiveTab('upload')}
                  className="empty-action-button"
                >
                  Upload Layer
                </button>
              </div>
            ) : (
              <div className="layers-grid">
                {customLayers.map(layer => {
                  const formatted = formatLayerForDisplay({ metadata: layer });
                  return (
                    <div key={layer.id} className="layer-card">
                      <div className="layer-header">
                        <h4 className="layer-name">{layer.name}</h4>
                        <div className="layer-actions">
                          <button
                            onClick={() => handleDeleteLayer(layer.id)}
                            className="delete-button"
                            title="Delete layer"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                      
                      <div className="layer-meta">
                        <div className="meta-item">
                          <span className="meta-label">Scope:</span>
                          <span className="meta-value">{formatted.scope}</span>
                        </div>
                        <div className="meta-item">
                          <span className="meta-label">Level:</span>
                          <span className="meta-value">{formatted.level}</span>
                        </div>
                        <div className="meta-item">
                          <span className="meta-label">Features:</span>
                          <span className="meta-value">{formatted.features}</span>
                        </div>
                        <div className="meta-item">
                          <span className="meta-label">Size:</span>
                          <span className="meta-value">{formatted.size}</span>
                        </div>
                        <div className="meta-item">
                          <span className="meta-label">Uploaded:</span>
                          <span className="meta-value">{formatted.uploadDate}</span>
                        </div>
                      </div>

                      {layer.description && (
                        <div className="layer-description">
                          {layer.description}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'defaults' && (
          <div className="defaults-tab">
            <h3>Default GeoJSON Layers</h3>
            <p>These are the built-in geographic layers provided by the system.</p>
            
            <div className="default-layers-grid">
              {[
                { name: 'World Countries', file: 'countries.geo.json', features: 180, level: 'countries' },
                { name: 'India States', file: 'india.geojson', features: 36, level: 'states' },
                { name: 'India Districts', file: 'india_districts.geojson', features: 589, level: 'districts' },
                { name: 'Kenya Counties', file: 'kenya_counties.json', features: 47, level: 'counties' },
                { name: 'Kenya Constituencies', file: 'kenya_constituencies.json', features: 290, level: 'constituencies' },
                { name: 'Kenya Wards', file: 'kenya_wards.json', features: 1467, level: 'wards' },
                { name: 'Pune Electoral Wards', file: 'pune-electoral-wards_2022.geojson', features: 58, level: 'wards' }
              ].map((layer, index) => (
                <div key={index} className="default-layer-card">
                  <div className="default-layer-header">
                    <h4>{layer.name}</h4>
                    <span className="default-badge">Default</span>
                  </div>
                  <div className="default-layer-meta">
                    <div className="meta-item">
                      <span className="meta-label">File:</span>
                      <span className="meta-value">{layer.file}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">Features:</span>
                      <span className="meta-value">{layer.features}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">Level:</span>
                      <span className="meta-value">{layer.level}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper function to format file size
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default CustomLayerManager;