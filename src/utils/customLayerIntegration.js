// customLayerIntegration.js - Integration utilities for custom layers with main navigation

import { getAllCustomLayers, getCustomLayer } from './geoStorage.js';

/**
 * Check if there are custom layers that should override default navigation
 */
export const getCustomLayerForNavigation = async (country, level, target = null) => {
  try {
    const customLayers = await getAllCustomLayers();
    
    console.log('All custom layers:', customLayers);
    console.log(`Looking for: country=${country}, level=${level}, target=${target}`);
    
    // Find matching custom layers
    const matchingLayers = customLayers.filter(layer => {
      const scope = layer.scope;
      
      console.log(`Checking layer:`, layer.name, `scope:`, scope);
      
      // Check if this layer applies to the current navigation context
      if (scope.country !== country || scope.level !== level) {
        console.log(`  → Skipped: country/level mismatch (${scope.country}/${scope.level})`);
        return false;
      }
      
      // For replace layers, check if they should override
      if (scope.uploadType === 'replace') {
        if (scope.replaceScope === 'worldwide') {
          console.log(`  → Match: worldwide replacement`);
          return true; // Global replacement
        } else if (scope.replaceScope === 'country' && scope.targetCountry === country) {
          console.log(`  → Match: country-specific replacement`);
          return true; // Country-specific replacement
        } else if (scope.replaceScope === 'regional' && scope.targetCountry === country && scope.targetRegion === target) {
          console.log(`  → Match: regional replacement for ${target} in ${country}`);
          return true; // Regional replacement
        } else if (scope.replaceScope === 'regional') {
          console.log(`  → Skip: regional replacement for ${scope.targetRegion} in ${scope.targetCountry}, looking for ${target} in ${country}`);
        }
      }
      
      // For local layers, check if they match the target
      if (scope.uploadType === 'local') {
        console.log(`  → Checking local target: '${scope.localTarget}' === '${target}'`);
        const matches = scope.localTarget === target;
        console.log(`  → Local match result: ${matches}`);
        return matches;
      }
      
      console.log(`  → No match conditions met`);
      return false;
    });
    
    // Return the most specific matching layer with full data
    if (matchingLayers.length > 0) {
      console.log(`Found ${matchingLayers.length} matching layers:`, matchingLayers);
      
      // Prioritize local over regional over country over worldwide
      const priorityOrder = ['local', 'regional', 'country', 'worldwide'];
      matchingLayers.sort((a, b) => {
        const aPriority = priorityOrder.indexOf(a.scope.uploadType === 'replace' ? a.scope.replaceScope : 'local');
        const bPriority = priorityOrder.indexOf(b.scope.uploadType === 'replace' ? b.scope.replaceScope : 'local');
        return aPriority - bPriority;
      });
      
      console.log(`Returning highest priority layer:`, matchingLayers[0]);
      
      // Get the full layer data including GeoJSON
      const fullLayerData = await getCustomLayer(matchingLayers[0].id);
      console.log('Full layer data retrieved:', fullLayerData ? 'SUCCESS' : 'FAILED');
      
      if (fullLayerData) {
        console.log('Layer has GeoJSON:', !!fullLayerData.geoJson);
        console.log('Layer has processedFeatures:', !!fullLayerData.processedFeatures);
        return fullLayerData;
      } else {
        console.error('Failed to retrieve full layer data for ID:', matchingLayers[0].id);
        return null;
      }
    }
    
    console.log(`No matching layers found`);
    return null;
  } catch (error) {
    console.error('Error checking custom layers:', error);
    return null;
  }
};

/**
 * Convert custom layer data to the format expected by the main app
 */
export const convertCustomLayerToAppData = (customLayer) => {
  if (!customLayer || !customLayer.processedFeatures) {
    console.error('Invalid custom layer for conversion:', customLayer);
    return [];
  }
  
  // Convert processed features to the format expected by the main app
  const converted = Object.values(customLayer.processedFeatures).map(feature => {
    const convertedFeature = {
      name: feature.name,
      value: feature.value,
      parent: feature.parent,
      id: feature.id,
      description: feature.description,
      enabled: feature.enabled,
      customLayer: true,
      layerId: customLayer.id
    };
    
    // Debug logging for value issues
    if (convertedFeature.value === undefined || convertedFeature.value === null || isNaN(convertedFeature.value)) {
      console.warn('Invalid value for feature:', feature.name, 'value:', feature.value, 'type:', typeof feature.value);
    }
    
    return convertedFeature;
  });
  
  console.log('Converted custom layer data:', converted);
  return converted;
};

/**
 * Get the GeoJSON data for a custom layer
 */
export const getCustomLayerGeoJSON = (customLayer) => {
  if (!customLayer || !customLayer.geoJson) {
    return null;
  }
  
  return customLayer.geoJson;
};

/**
 * Create a data URL for custom layer GeoJSON (for echarts registration)
 */
export const createCustomLayerDataUrl = (customLayer) => {
  const geoJson = getCustomLayerGeoJSON(customLayer);
  if (!geoJson) {
    console.error('No GeoJSON data found for custom layer:', customLayer);
    return null;
  }
  
  try {
    // Validate that geoJson is a proper object
    if (typeof geoJson !== 'object' || geoJson === null) {
      console.error('Invalid GeoJSON data type:', typeof geoJson);
      return null;
    }
    
    // Validate basic GeoJSON structure
    if (!geoJson.type || !geoJson.features) {
      console.error('Invalid GeoJSON structure - missing type or features:', geoJson);
      return null;
    }
    
    // Deep clone to avoid any reference issues
    const cleanGeoJson = JSON.parse(JSON.stringify(geoJson));
    
    const jsonString = JSON.stringify(cleanGeoJson);
    console.log('Creating blob for GeoJSON, size:', jsonString.length, 'characters');
    console.log('GeoJSON type:', cleanGeoJson.type, 'features count:', cleanGeoJson.features?.length);
    
    const blob = new Blob([jsonString], { 
      type: 'application/json; charset=utf-8'
    });
    const url = URL.createObjectURL(blob);
    
    console.log('Created blob URL:', url);
    
    // Test the blob URL immediately
    fetch(url)
      .then(response => {
        console.log('Blob URL test - status:', response.status, 'content-type:', response.headers.get('content-type'));
        return response.text();
      })
      .then(text => {
        console.log('Blob URL test - first 200 chars:', text.substring(0, 200));
        try {
          const parsed = JSON.parse(text);
          console.log('Blob URL test - JSON parse SUCCESS, type:', parsed.type);
        } catch (e) {
          console.error('Blob URL test - JSON parse FAILED:', e.message);
        }
      })
      .catch(error => {
        console.error('Blob URL test FAILED:', error);
      });
    
    return url;
  } catch (error) {
    console.error('Error creating custom layer data URL:', error);
    console.error('GeoJSON data:', geoJson);
    return null;
  }
};

/**
 * Check if a custom layer should be used for drill-down navigation
 */
export const shouldUseCustomLayerForDrillDown = async (fromLevel, toLevel, country, target) => {
  // Check if there's a custom layer that should be used for this drill-down
  const customLayer = await getCustomLayerForNavigation(country, toLevel, target);
  return customLayer !== null;
};

/**
 * Get all custom layers that could be used for a specific context
 */
export const getAvailableCustomLayers = async (country, level) => {
  try {
    const customLayers = await getAllCustomLayers();
    
    return customLayers.filter(layer => {
      const scope = layer.scope;
      return scope.country === country && scope.level === level;
    });
  } catch (error) {
    console.error('Error getting available custom layers:', error);
    return [];
  }
};

/**
 * Generate a unique map key for custom layers
 */
export const getCustomLayerMapKey = (customLayer) => {
  return `custom-${customLayer.id}`;
};

/**
 * Check if we should show drill-down for a custom layer
 */
export const canDrillDownFromCustomLayer = async (customLayer, clickedFeature) => {
  // Check if there are child-level custom layers for this feature
  const childLevel = getChildLevel(customLayer.scope.level);
  if (!childLevel) return false;
  
  // Check if there are custom layers at the child level that match this feature
  const customLayers = await getAllCustomLayers();
  
  return customLayers.some(layer => {
    const scope = layer.scope;
    return scope.level === childLevel && 
           scope.country === customLayer.scope.country &&
           (scope.uploadType === 'local' && scope.localTarget === clickedFeature.name);
  });
};

/**
 * Get the child level for a given level
 */
const getChildLevel = (level) => {
  const hierarchy = {
    'countries': ['states', 'counties'],
    'states': 'districts',
    'counties': 'constituencies',
    'districts': 'wards',
    'constituencies': 'wards',
    'wards': null
  };
  
  return hierarchy[level] || null;
};

/**
 * Get navigation breadcrumb for custom layers
 */
export const getCustomLayerBreadcrumb = (customLayer) => {
  const scope = customLayer.scope;
  const parts = [];
  
  if (scope.country) parts.push(scope.country);
  if (scope.uploadType === 'local' && scope.localTarget) {
    parts.push(scope.localTarget);
  }
  parts.push(customLayer.name);
  
  return parts.join(' → ');
};