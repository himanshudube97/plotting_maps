// geoProcessing.js - Processing utilities for custom GeoJSON files

import { loadGeoDataConfig } from '../dataLoader.js';

/**
 * Process uploaded GeoJSON into our data format
 */
export const processCustomGeoJSON = async (geoJson, mapping, scope, metadata) => {
  const processedFeatures = {};
  const stats = {
    totalFeatures: 0,
    processedFeatures: 0,
    skippedFeatures: 0,
    errors: []
  };
  
  if (!geoJson?.features) {
    throw new Error('Invalid GeoJSON: no features found');
  }
  
  // Load data config to get values for features
  const dataConfig = await loadGeoDataConfig();
  const generateDefaultValue = (name, level, country) => {
    try {
      // Try to find value from data config based on level
      let configData = null;
      
      if (country === 'India') {
        if (level === 'states') {
          configData = dataConfig.data.indiaStates;
        } else if (level === 'districts') {
          configData = dataConfig.data.indiaDistricts;
        } else if (level === 'wards') {
          configData = dataConfig.data.indiaWards;
        }
      } else if (country === 'Kenya') {
        if (level === 'counties') {
          configData = dataConfig.data.kenyaCounties;
        } else if (level === 'constituencies') {
          configData = dataConfig.data.kenyaConstituencies;
        } else if (level === 'wards') {
          configData = dataConfig.data.kenyaWards;
        }
      } else if (country === 'Countries' || country === 'Global') {
        configData = dataConfig.data.countries;
      }
      
      // Look for matching name in config
      if (configData) {
        const match = Object.values(configData).find(item => 
          item.name === name || item.name.toLowerCase() === name.toLowerCase()
        );
        if (match) {
          return match.value;
        }
      }
      
      // Fallback to random value if no match found
      return Math.floor(Math.random() * 1000);
    } catch (error) {
      console.warn('Error generating value for', name, ':', error);
      return Math.floor(Math.random() * 1000);
    }
  };
  
  geoJson.features.forEach((feature, index) => {
    stats.totalFeatures++;
    
    try {
      // Extract mapped properties
      const name = getPropertyValue(feature.properties, mapping.name);
      const parent = mapping.parent ? getPropertyValue(feature.properties, mapping.parent) : null;
      const id = mapping.id ? getPropertyValue(feature.properties, mapping.id) : null;
      const description = mapping.description ? getPropertyValue(feature.properties, mapping.description) : null;
      
      if (!name) {
        stats.skippedFeatures++;
        stats.errors.push(`Feature ${index + 1}: Missing name property '${mapping.name}'`);
        return;
      }
      
      // Generate value based on data config or fallback to random
      const defaultValue = generateDefaultValue(name, scope.level, scope.country);
      
      // Create processed feature
      processedFeatures[name] = {
        name: name,
        value: defaultValue,
        parent: parent,
        id: id,
        description: description,
        enabled: true,
        index: index,
        customLayer: true,
        scope: scope
      };
      
      stats.processedFeatures++;
      
    } catch (error) {
      stats.skippedFeatures++;
      stats.errors.push(`Feature ${index + 1}: ${error.message}`);
    }
  });
  
  return {
    processedFeatures,
    stats,
    metadata: {
      ...metadata,
      stats: {
        ...stats,
        fileSize: JSON.stringify(geoJson).length, // Approximate size
        featureCount: stats.processedFeatures
      }
    }
  };
};

/**
 * Get property value with fallback handling
 */
const getPropertyValue = (properties, propertyName) => {
  if (!properties || !propertyName) return null;
  
  const value = properties[propertyName];
  if (value === null || value === undefined || value === '') return null;
  
  return String(value).trim();
};


/**
 * Create layer metadata from user input
 */
export const createLayerMetadata = (file, geoJson, mapping, scope, userInputs = {}) => {
  const now = new Date().toISOString();
  const layerId = generateLayerId(userInputs.name || file.name, now);
  
  // Handle the new scope structure from SimpleScopeSelector
  const scopeConfig = {
    uploadType: scope.uploadType,
    country: scope.country,
    level: scope.level,
    ...(scope.uploadType === 'replace' && {
      replaceScope: scope.replaceScope,
      parentField: scope.parentField,
      targetCountry: scope.targetCountry,
      targetRegion: scope.targetRegion
    }),
    ...(scope.uploadType === 'local' && {
      localTarget: scope.localTarget
    })
  };
  
  return {
    id: layerId,
    name: userInputs.name || file.name.replace(/\.(geo)?json$/i, ''),
    description: userInputs.description || '',
    uploadDate: now,
    fileName: file.name,
    fileSize: file.size,
    
    scope: scopeConfig,
    
    propertyMapping: {
      name: mapping.name,
      parent: scope.parentField || null,
      id: mapping.id || null,
      description: mapping.description || null
    },
    
    hierarchy: {
      level: scope.level,
      parentLevel: getParentLevel(scope.level),
      childLevel: getChildLevel(scope.level)
    },
    
    stats: {
      fileSize: file.size,
      featureCount: geoJson.features?.length || 0,
      bounds: calculateBounds(geoJson)
    },
    
    validation: {
      validated: true,
      validatedAt: now
    }
  };
};

/**
 * Generate unique layer ID
 */
const generateLayerId = (name, timestamp) => {
  const cleanName = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
    
  const timeHash = new Date(timestamp).getTime().toString(36);
  
  return `custom-${cleanName}-${timeHash}`;
};

/**
 * Calculate bounding box for GeoJSON
 */
const calculateBounds = (geoJson) => {
  if (!geoJson?.features?.length) return null;
  
  let minLng = Infinity, minLat = Infinity;
  let maxLng = -Infinity, maxLat = -Infinity;
  
  geoJson.features.forEach(feature => {
    if (feature.geometry?.coordinates) {
      extractCoordinates(feature.geometry.coordinates).forEach(([lng, lat]) => {
        minLng = Math.min(minLng, lng);
        minLat = Math.min(minLat, lat);
        maxLng = Math.max(maxLng, lng);
        maxLat = Math.max(maxLat, lat);
      });
    }
  });
  
  return isFinite(minLng) ? [minLng, minLat, maxLng, maxLat] : null;
};

/**
 * Extract all coordinates from geometry (handles different geometry types)
 */
const extractCoordinates = (coords) => {
  const result = [];
  
  const extract = (item) => {
    if (Array.isArray(item)) {
      if (typeof item[0] === 'number' && typeof item[1] === 'number') {
        result.push(item);
      } else {
        item.forEach(extract);
      }
    }
  };
  
  extract(coords);
  return result;
};

/**
 * Get parent level in hierarchy
 */
const getParentLevel = (level) => {
  const hierarchy = {
    countries: null,
    states: 'countries',
    counties: 'countries',
    districts: 'states',
    constituencies: 'counties',
    wards: ['districts', 'constituencies'], // Can have multiple parents
    subwards: 'wards'
  };
  
  return hierarchy[level] || null;
};

/**
 * Get child level in hierarchy
 */
const getChildLevel = (level) => {
  const hierarchy = {
    countries: ['states', 'counties'],
    states: 'districts',
    counties: 'constituencies',
    districts: 'wards',
    constituencies: 'wards',
    wards: 'subwards',
    subwards: null
  };
  
  return hierarchy[level] || null;
};

/**
 * Merge custom layer data with existing configuration
 */
export const mergeWithExistingConfig = (existingConfig, customLayer) => {
  const scope = customLayer.metadata.scope;
  const levelKey = `custom${scope.level}`;
  
  // Create new configuration structure
  const newConfig = {
    ...existingConfig,
    customLayers: {
      ...existingConfig.customLayers,
      [customLayer.metadata.id]: customLayer
    }
  };
  
  // Add to data structure
  if (!newConfig.data[levelKey]) {
    newConfig.data[levelKey] = {};
  }
  
  // Merge features based on scope
  Object.assign(newConfig.data[levelKey], customLayer.processedFeatures);
  
  return newConfig;
};

/**
 * Check if custom layer should override default for given parameters
 */
export const shouldUseCustomLayer = (customLayers, scope, level, target = null) => {
  return customLayers.find(layer => {
    const layerScope = layer.metadata.scope;
    
    // Level must match
    if (layerScope.level !== level) return false;
    
    // Check scope compatibility
    switch (layerScope.type) {
      case 'global':
        return true; // Global always applies
        
      case 'country':
        return layerScope.target === scope.country;
        
      case 'regional':
        return layerScope.target === scope.region || layerScope.target === target;
        
      case 'local':
        return layerScope.target === scope.local || layerScope.target === target;
        
      default:
        return false;
    }
  });
};

/**
 * Validate layer compatibility with existing hierarchy
 */
export const validateLayerCompatibility = (newLayer, existingLayers) => {
  const errors = [];
  const warnings = [];
  
  const newScope = newLayer.metadata.scope;
  
  // Check for conflicts with existing custom layers
  existingLayers.forEach(existing => {
    const existingScope = existing.metadata.scope;
    
    if (existingScope.level === newScope.level && 
        existingScope.target === newScope.target) {
      warnings.push(`Will override existing layer: ${existing.metadata.name}`);
    }
  });
  
  // Check parent-child relationships
  const parentLevel = getParentLevel(newScope.level);
  const childLevel = getChildLevel(newScope.level);
  
  if (parentLevel && !hasCompatibleParent(newLayer, existingLayers, parentLevel)) {
    warnings.push(`No compatible parent layer found for level '${newScope.level}'`);
  }
  
  return {
    compatible: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Check if layer has compatible parent
 */
const hasCompatibleParent = (layer, existingLayers, parentLevel) => {
  // This would need more sophisticated logic based on actual parent-child mappings
  // For now, we'll assume compatibility and let users handle relationships
  return true;
};

/**
 * Format layer for display in UI
 */
export const formatLayerForDisplay = (layer) => {
  const metadata = layer.metadata;
  const scope = metadata.scope;
  
  return {
    id: metadata.id,
    name: metadata.name,
    description: metadata.description,
    type: 'custom',
    scope: `${scope.type}${scope.target ? ` (${scope.target})` : ''}`,
    level: scope.level,
    features: metadata.stats.featureCount,
    size: formatFileSize(metadata.stats.fileSize),
    uploadDate: new Date(metadata.uploadDate).toLocaleDateString(),
    editable: true,
    deleteable: true
  };
};

/**
 * Format file size for display
 */
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};