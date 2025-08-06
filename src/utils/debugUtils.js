// debugUtils.js - Debug utilities for custom layer troubleshooting

import { getAllCustomLayers, getCustomLayer } from './geoStorage.js';

/**
 * Debug utility to inspect all custom layers in storage
 */
export const debugCustomLayers = async () => {
  console.group('🔍 CUSTOM LAYERS DEBUG');
  
  try {
    const allLayers = await getAllCustomLayers();
    console.log(`Found ${allLayers.length} custom layers in storage:`);
    
    if (allLayers.length === 0) {
      console.warn('⚠️ No custom layers found in storage!');
      console.log('This means either:');
      console.log('1. No layers have been uploaded yet');
      console.log('2. Layers were uploaded but not saved correctly');
      console.log('3. IndexedDB storage is empty');
      console.groupEnd();
      return;
    }
    
    allLayers.forEach((layer, index) => {
      console.group(`Layer ${index + 1}: ${layer.name}`);
      console.log('ID:', layer.id);
      console.log('Name:', layer.name);
      console.log('Upload Date:', layer.uploadDate);
      console.log('Scope:', layer.scope);
      console.log('File Info:', {
        fileName: layer.fileName,
        fileSize: layer.fileSize,
        featureCount: layer.stats?.featureCount
      });
      console.groupEnd();
    });
    
    // Test specific lookup for Bangalore Urban
    console.group('🎯 Testing Bangalore Urban Lookup');
    const bangalore = await testCustomLayerLookup('India', 'wards', 'Bangalore Urban');
    console.log('Bangalore Urban lookup result:', bangalore);
    console.groupEnd();
    
  } catch (error) {
    console.error('❌ Error debugging custom layers:', error);
  }
  
  console.groupEnd();
};

/**
 * Test custom layer lookup with detailed logging
 */
export const testCustomLayerLookup = async (country, level, target) => {
  console.group(`🔍 Testing lookup: ${country}/${level}/${target}`);
  
  try {
    const allLayers = await getAllCustomLayers();
    console.log(`Total layers available: ${allLayers.length}`);
    
    const matchingLayers = allLayers.filter(layer => {
      const scope = layer.scope;
      console.log(`Checking layer "${layer.name}":`, {
        scope: scope,
        countryMatch: scope.country === country,
        levelMatch: scope.level === level,
        uploadTypeMatch: scope.uploadType === 'local',
        targetMatch: scope.localTarget === target
      });
      
      if (scope.country !== country || scope.level !== level) {
        console.log(`  → Skip: country/level mismatch`);
        return false;
      }
      
      if (scope.uploadType === 'local') {
        const matches = scope.localTarget === target;
        console.log(`  → Local target check: "${scope.localTarget}" === "${target}" = ${matches}`);
        return matches;
      }
      
      console.log(`  → Skip: not local upload type`);
      return false;
    });
    
    console.log(`Found ${matchingLayers.length} matching layers`);
    console.groupEnd();
    return matchingLayers.length > 0 ? matchingLayers[0] : null;
    
  } catch (error) {
    console.error('Error in test lookup:', error);
    console.groupEnd();
    return null;
  }
};

/**
 * Debug a specific layer by ID
 */
export const debugLayerById = async (layerId) => {
  console.group(`🔍 Debugging layer: ${layerId}`);
  
  try {
    const layer = await getCustomLayer(layerId);
    
    if (!layer) {
      console.error('❌ Layer not found!');
      console.groupEnd();
      return;
    }
    
    console.log('Layer data:', {
      id: layer.id,
      name: layer.name,
      scope: layer.scope,
      geoJsonFeatures: layer.geoJson?.features?.length || 0,
      processedFeatures: Object.keys(layer.processedFeatures || {}).length,
      metadata: layer.metadata
    });
    
    // Sample some processed features
    if (layer.processedFeatures) {
      const featureKeys = Object.keys(layer.processedFeatures);
      console.log('Sample processed features:', featureKeys.slice(0, 5));
      
      if (featureKeys.length > 0) {
        const sampleFeature = layer.processedFeatures[featureKeys[0]];
        console.log('Sample feature structure:', sampleFeature);
      }
    }
    
  } catch (error) {
    console.error('❌ Error debugging layer:', error);
  }
  
  console.groupEnd();
};

/**
 * Clear all debug logs and run fresh analysis
 */
export const clearDebugAndAnalyze = async () => {
  console.clear();
  console.log('🧹 Debug console cleared');
  console.log('🔍 Running fresh analysis...');
  
  await debugCustomLayers();
};

/**
 * Export debug information for sharing
 */
export const exportDebugInfo = async () => {
  const debugInfo = {
    timestamp: new Date().toISOString(),
    layers: [],
    browser: navigator.userAgent,
    url: window.location.href
  };
  
  try {
    const allLayers = await getAllCustomLayers();
    debugInfo.layers = allLayers.map(layer => ({
      id: layer.id,
      name: layer.name,
      scope: layer.scope,
      uploadDate: layer.uploadDate,
      featureCount: layer.stats?.featureCount || 0,
      fileSize: layer.fileSize || 0
    }));
    
    const debugString = JSON.stringify(debugInfo, null, 2);
    console.log('Debug info exported:', debugString);
    
    // Copy to clipboard if possible
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(debugString);
      console.log('📋 Debug info copied to clipboard');
    }
    
    return debugInfo;
    
  } catch (error) {
    console.error('❌ Error exporting debug info:', error);
    return null;
  }
};

// Auto-run debug when this module is imported in development
if (process.env.NODE_ENV === 'development') {
  // Add a global debug function
  window.debugCustomLayers = debugCustomLayers;
  window.testCustomLayerLookup = testCustomLayerLookup;
  window.debugLayerById = debugLayerById;
  window.clearDebugAndAnalyze = clearDebugAndAnalyze;
  window.exportDebugInfo = exportDebugInfo;
  
  console.log('🔧 Debug utilities loaded. Available commands:');
  console.log('- debugCustomLayers()');
  console.log('- testCustomLayerLookup(country, level, target)');
  console.log('- debugLayerById(id)');
  console.log('- clearDebugAndAnalyze()');
  console.log('- exportDebugInfo()');
}