import React, { useState, useEffect } from 'react';
import { loadGeoDataConfig, updateGeoDataConfig, detectFeaturesFromActiveGeoJSONs } from './dataLoader.js';
import './DataConfigEditor.css';

const DataConfigEditor = ({ hierarchyConfig, onDataConfigChange }) => {
  const [geoConfig, setGeoConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('countries');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingValues, setEditingValues] = useState({});

  const levelConfigs = {
    countries: { label: '🌍 Countries', enabled: true },
    indiaStates: { label: '🇮🇳 Indian States', enabled: hierarchyConfig?.india?.enabled?.state },
    indiaDistricts: { label: '🏛️ Indian Districts', enabled: hierarchyConfig?.india?.enabled?.district },
    puneWards: { label: '🏘️ Pune Wards', enabled: hierarchyConfig?.india?.enabled?.ward },
    kenyaCounties: { label: '🇰🇪 Kenya Counties', enabled: hierarchyConfig?.kenya?.enabled?.county },
    kenyaConstituencies: { label: '🏛️ Kenya Constituencies', enabled: hierarchyConfig?.kenya?.enabled?.constituency },
    kenyaWards: { label: '🏘️ Kenya Wards', enabled: hierarchyConfig?.kenya?.enabled?.ward }
  };

  useEffect(() => {
    loadGeoDataConfig()
      .then(config => {
        setGeoConfig(config);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error loading geo config:', error);
        setLoading(false);
      });
  }, []);

  // Filter features based on search term and hierarchy settings
  const getFilteredFeatures = (levelKey) => {
    if (!geoConfig?.data?.[levelKey]) return [];
    
    const features = Object.values(geoConfig.data[levelKey]);
    return features.filter(feature => 
      feature.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // Handle value changes
  const handleValueChange = (levelKey, featureName, newValue) => {
    const numericValue = parseFloat(newValue) || 0;
    
    setEditingValues(prev => ({
      ...prev,
      [`${levelKey}_${featureName}`]: numericValue
    }));

    // Update the main geo config
    const updatedConfig = {
      ...geoConfig,
      data: {
        ...geoConfig.data,
        [levelKey]: {
          ...geoConfig.data[levelKey],
          [featureName]: {
            ...geoConfig.data[levelKey][featureName],
            value: numericValue
          }
        }
      }
    };
    
    setGeoConfig(updatedConfig);
    
    // Update the in-memory configuration used by data loaders
    updateGeoDataConfig(updatedConfig);

    // Notify parent component of changes
    onDataConfigChange?.(updatedConfig);
  };

  // Save configuration to file (this would typically be sent to a backend)
  const handleSaveConfig = async () => {
    try {
      // In a real application, this would send the config to a backend API
      console.log('Saving configuration:', geoConfig);
      
      // For now, we'll just log it and show a success message
      alert('Configuration saved successfully! (Note: In production, this would save to the server)');
    } catch (error) {
      console.error('Error saving configuration:', error);
      alert('Error saving configuration');
    }
  };

  // Generate values from active GeoJSON files
  const handleGenerateValues = async () => {
    setLoading(true);
    try {
      console.log('🔄 Detecting features from active GeoJSON files...');
      const updatedConfig = await detectFeaturesFromActiveGeoJSONs();
      
      if (updatedConfig) {
        setGeoConfig(updatedConfig);
        onDataConfigChange?.(updatedConfig);
        alert('✅ Successfully detected and populated features from active GeoJSON files with default values of 0!');
      } else {
        alert('❌ Failed to detect features. Please check the console for errors.');
      }
    } catch (error) {
      console.error('Error generating values:', error);
      alert('Error detecting features from GeoJSON files');
    } finally {
      setLoading(false);
    }
  };

  // Get statistics for current level
  const getLevelStats = (levelKey) => {
    const features = getFilteredFeatures(levelKey);
    if (features.length === 0) return null;
    
    const values = features.map(f => f.value);
    return {
      count: features.length,
      min: Math.min(...values),
      max: Math.max(...values),
      avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length)
    };
  };

  if (loading) {
    return <div className="data-config-loading">Loading geographic data...</div>;
  }

  if (!geoConfig) {
    return <div className="data-config-error">Error loading geographic data configuration</div>;
  }

  return (
    <div className="data-config-editor">
      <div className="data-config-header">
        <h3>📊 Data Configuration Editor</h3>
        <p>Edit numerical values for choropleth mapping. Values are shown/hidden based on your hierarchy settings.</p>
      </div>

      <div className="data-config-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="🔍 Search locations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="control-buttons">
          <button className="generate-values-btn" onClick={handleGenerateValues} disabled={loading}>
            🔄 {loading ? 'Detecting...' : 'Generate Values'}
          </button>
          <button className="save-config-btn" onClick={handleSaveConfig}>
            💾 Save Configuration
          </button>
        </div>
      </div>

      <div className="data-config-tabs">
        {Object.entries(levelConfigs).map(([key, config]) => (
          <button
            key={key}
            className={`tab-btn ${activeTab === key ? 'active' : ''} ${!config.enabled ? 'disabled' : ''}`}
            onClick={() => config.enabled && setActiveTab(key)}
            disabled={!config.enabled}
            title={!config.enabled ? 'This level is disabled in hierarchy settings' : ''}
          >
            {config.label}
            {!config.enabled && <span className="disabled-badge">Disabled</span>}
          </button>
        ))}
      </div>

      <div className="data-config-content">
        {levelConfigs[activeTab]?.enabled ? (
          <div className="level-editor">
            <div className="level-stats">
              {(() => {
                const stats = getLevelStats(activeTab);
                return stats ? (
                  <div className="stats-row">
                    <span className="stat">📊 {stats.count} items</span>
                    <span className="stat">📈 Min: {stats.min}</span>
                    <span className="stat">📊 Max: {stats.max}</span>
                    <span className="stat">🎯 Avg: {stats.avg}</span>
                  </div>
                ) : (
                  <div className="no-data">No data available for this level</div>
                );
              })()}
            </div>

            <div className="features-grid">
              {getFilteredFeatures(activeTab).map((feature) => (
                <div key={feature.name} className="feature-item">
                  <div className="feature-info">
                    <span className="feature-name">{feature.name}</span>
                    {feature.parent && (
                      <span className="feature-parent">in {feature.parent}</span>
                    )}
                  </div>
                  <div className="feature-value">
                    <input
                      type="number"
                      value={editingValues[`${activeTab}_${feature.name}`] ?? feature.value}
                      onChange={(e) => handleValueChange(activeTab, feature.name, e.target.value)}
                      className="value-input"
                      min="0"
                      step="1"
                    />
                  </div>
                </div>
              ))}
            </div>

            {getFilteredFeatures(activeTab).length === 0 && searchTerm && (
              <div className="no-results">
                No results found for "{searchTerm}"
              </div>
            )}
          </div>
        ) : (
          <div className="level-disabled">
            <div className="disabled-message">
              <h4>📛 Level Disabled</h4>
              <p>This geographic level is currently disabled in your hierarchy settings.</p>
              <p>Enable it in the hierarchy configuration to view and edit data values.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataConfigEditor;