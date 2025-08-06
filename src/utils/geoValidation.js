// geoValidation.js - Validation utilities for GeoJSON files

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit
const MIN_FEATURES = 1;
const MAX_FEATURES = 10000; // Reasonable limit for performance

/**
 * Validate uploaded file basic properties
 */
export const validateFile = (file) => {
  const errors = [];
  const warnings = [];
  
  // File type validation
  if (file.type && !file.type.includes('json') && !file.name.toLowerCase().endsWith('.geojson')) {
    errors.push('File must be a GeoJSON file (.geojson or .json)');
  }
  
  // File size validation
  if (file.size > MAX_FILE_SIZE) {
    errors.push(`File size (${formatFileSize(file.size)}) exceeds maximum limit of ${formatFileSize(MAX_FILE_SIZE)}`);
  }
  
  if (file.size > MAX_FILE_SIZE * 0.5) {
    warnings.push(`Large file size (${formatFileSize(file.size)}) may cause slow processing`);
  }
  
  return { 
    valid: errors.length === 0, 
    errors, 
    warnings 
  };
};

/**
 * Validate GeoJSON structure and content
 */
export const validateGeoJSON = (geoJson) => {
  const errors = [];
  const warnings = [];
  const info = {};
  
  try {
    // Basic structure validation
    if (!geoJson || typeof geoJson !== 'object') {
      errors.push('Invalid JSON structure');
      return { valid: false, errors, warnings, info };
    }
    
    if (geoJson.type !== 'FeatureCollection') {
      errors.push('GeoJSON must be a FeatureCollection');
    }
    
    if (!Array.isArray(geoJson.features)) {
      errors.push('GeoJSON must have a features array');
      return { valid: false, errors, warnings, info };
    }
    
    // Features validation
    const features = geoJson.features;
    
    if (features.length < MIN_FEATURES) {
      errors.push(`Must have at least ${MIN_FEATURES} feature(s)`);
    }
    
    if (features.length > MAX_FEATURES) {
      errors.push(`Too many features (${features.length}). Maximum allowed: ${MAX_FEATURES}`);
    }
    
    // Feature structure validation
    let validFeatures = 0;
    let invalidFeatures = 0;
    const geometryTypes = {};
    const allProperties = new Set();
    
    features.forEach((feature, index) => {
      if (!feature || typeof feature !== 'object') {
        invalidFeatures++;
        return;
      }
      
      if (feature.type !== 'Feature') {
        invalidFeatures++;
        if (index < 5) { // Only report first few
          warnings.push(`Feature ${index + 1}: Invalid type '${feature.type}', expected 'Feature'`);
        }
        return;
      }
      
      // Geometry validation
      if (!feature.geometry || !feature.geometry.type) {
        invalidFeatures++;
        if (index < 5) {
          warnings.push(`Feature ${index + 1}: Missing or invalid geometry`);
        }
        return;
      }
      
      // Count geometry types
      const geomType = feature.geometry.type;
      geometryTypes[geomType] = (geometryTypes[geomType] || 0) + 1;
      
      // Collect property names
      if (feature.properties && typeof feature.properties === 'object') {
        Object.keys(feature.properties).forEach(prop => allProperties.add(prop));
      }
      
      validFeatures++;
    });
    
    // Set info for analysis
    info.totalFeatures = features.length;
    info.validFeatures = validFeatures;
    info.invalidFeatures = invalidFeatures;
    info.geometryTypes = geometryTypes;
    info.properties = Array.from(allProperties).sort();
    
    // Validation results
    if (invalidFeatures > 0) {
      if (invalidFeatures === features.length) {
        errors.push('No valid features found');
      } else {
        warnings.push(`${invalidFeatures} invalid features found (${validFeatures} valid)`);
      }
    }
    
    if (info.properties.length === 0) {
      warnings.push('No properties found in features - you may need to map properties manually');
    }
    
    // Geometry type analysis
    const geomTypeCount = Object.keys(geometryTypes).length;
    if (geomTypeCount === 0) {
      errors.push('No valid geometries found');
    } else if (geomTypeCount > 1) {
      warnings.push(`Mixed geometry types found: ${Object.keys(geometryTypes).join(', ')}`);
    }
    
    // Performance warnings
    if (validFeatures > 1000) {
      warnings.push(`Large number of features (${validFeatures}) may impact performance`);
    }
    
  } catch (error) {
    errors.push(`JSON parsing error: ${error.message}`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    info
  };
};

/**
 * Analyze GeoJSON properties to suggest mappings
 */
export const analyzeProperties = (geoJson) => {
  const analysis = {
    properties: [],
    suggestions: {},
    samples: {},
    info: {
      totalFeatures: geoJson?.features?.length || 0,
      validFeatures: 0
    }
  };
  
  if (!geoJson?.features?.length) {
    return analysis;
  }
  
  // Collect all properties with type analysis
  const propertyStats = {};
  const sampleValues = {};
  
  geoJson.features.slice(0, 100).forEach(feature => { // Sample first 100 features
    if (feature.properties) {
      Object.entries(feature.properties).forEach(([key, value]) => {
        if (!propertyStats[key]) {
          propertyStats[key] = {
            count: 0,
            types: {},
            hasNull: false,
            sampleValues: []
          };
        }
        
        const stat = propertyStats[key];
        stat.count++;
        
        if (value === null || value === undefined) {
          stat.hasNull = true;
        } else {
          const type = typeof value;
          stat.types[type] = (stat.types[type] || 0) + 1;
          
          if (stat.sampleValues.length < 5) {
            stat.sampleValues.push(value);
          }
        }
      });
    }
  });
  
  // Generate property analysis
  analysis.properties = Object.entries(propertyStats).map(([name, stats]) => {
    const mostCommonType = Object.entries(stats.types)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'unknown';
    
    return {
      name,
      type: mostCommonType,
      count: stats.count,
      completeness: Math.round((stats.count / Math.min(100, geoJson.features.length)) * 100),
      hasNull: stats.hasNull,
      samples: stats.sampleValues
    };
  }).sort((a, b) => b.completeness - a.completeness);
  
  // Generate mapping suggestions
  analysis.suggestions = generateMappingSuggestions(analysis.properties);
  
  // Update valid features count (features that have valid properties)
  analysis.info.validFeatures = geoJson.features.filter(feature => 
    feature && feature.properties && typeof feature.properties === 'object'
  ).length;
  
  return analysis;
};

/**
 * Generate intelligent mapping suggestions for simplified workflow
 */
const generateMappingSuggestions = (properties) => {
  const suggestions = {
    name: [],
    id: []
  };
  
  properties.forEach(prop => {
    const name = prop.name.toLowerCase();
    const type = prop.type;
    
    // Name field suggestions (prioritize string fields with good completeness)
    if (name.includes('name') || name.includes('title') || name.includes('label')) {
      suggestions.name.push({ 
        property: prop.name, 
        confidence: 'high', 
        reason: 'Contains "name" keyword',
        completeness: prop.completeness 
      });
    } else if (name.includes('ward') || name.includes('district') || name.includes('county') || name.includes('state')) {
      suggestions.name.push({ 
        property: prop.name, 
        confidence: 'medium', 
        reason: 'Geographic entity name',
        completeness: prop.completeness 
      });
    } else if (type === 'string' && prop.completeness > 80) {
      suggestions.name.push({ 
        property: prop.name, 
        confidence: 'low', 
        reason: 'String type with high completeness',
        completeness: prop.completeness 
      });
    }
    
    // ID field suggestions (prioritize ID-like fields)
    if (name.includes('id') || name.includes('code') || name.includes('fid')) {
      suggestions.id.push({ 
        property: prop.name, 
        confidence: 'high', 
        reason: 'Contains ID keyword',
        completeness: prop.completeness 
      });
    } else if (name.includes('number') || name.includes('num') || name.includes('seq')) {
      suggestions.id.push({ 
        property: prop.name, 
        confidence: 'medium', 
        reason: 'Numeric identifier field',
        completeness: prop.completeness 
      });
    } else if (type === 'number' && prop.completeness > 90) {
      suggestions.id.push({ 
        property: prop.name, 
        confidence: 'low', 
        reason: 'Numeric type with high completeness',
        completeness: prop.completeness 
      });
    } else if (type === 'string' && prop.completeness > 95 && prop.samples && prop.samples.every(s => s && s.length < 20)) {
      suggestions.id.push({ 
        property: prop.name, 
        confidence: 'low', 
        reason: 'Short string, might be identifier',
        completeness: prop.completeness 
      });
    }
  });
  
  // Sort suggestions by confidence and completeness
  Object.keys(suggestions).forEach(key => {
    suggestions[key].sort((a, b) => {
      const confidenceOrder = { high: 3, medium: 2, low: 1 };
      const confidenceDiff = confidenceOrder[b.confidence] - confidenceOrder[a.confidence];
      if (confidenceDiff !== 0) return confidenceDiff;
      
      // If same confidence, sort by completeness
      return (b.completeness || 0) - (a.completeness || 0);
    });
  });
  
  return suggestions;
};

/**
 * Validate property mapping configuration for simplified workflow
 */
export const validatePropertyMapping = (properties, mapping) => {
  const errors = [];
  const warnings = [];
  
  // Required field validation
  if (!mapping.name) {
    errors.push('Name property is required');
  } else {
    const nameProperty = properties.find(p => p.name === mapping.name);
    if (!nameProperty) {
      errors.push(`Name property '${mapping.name}' not found in GeoJSON`);
    } else {
      // Check if name property has good coverage
      if (nameProperty.completeness && nameProperty.completeness < 80) {
        warnings.push(`Name property '${mapping.name}' has low completeness (${nameProperty.completeness}%)`);
      }
      
      // Check if name property is string type
      if (nameProperty.type && nameProperty.type !== 'string') {
        warnings.push(`Name property '${mapping.name}' is not a string type (${nameProperty.type})`);
      }
    }
  }
  
  // Optional ID field validation
  if (mapping.id) {
    const idProperty = properties.find(p => p.name === mapping.id);
    if (!idProperty) {
      warnings.push(`ID property '${mapping.id}' not found in GeoJSON`);
    } else {
      // Check if ID property has good coverage
      if (idProperty.completeness && idProperty.completeness < 90) {
        warnings.push(`ID property '${mapping.id}' has low completeness (${idProperty.completeness}%)`);
      }
      
      // Check if ID property is appropriate type
      if (idProperty.type && !['string', 'number'].includes(idProperty.type)) {
        warnings.push(`ID property '${mapping.id}' should be string or number type (${idProperty.type})`);
      }
    }
  }
  
  // Check for duplicate mappings (name and ID can't be the same)
  if (mapping.name && mapping.id && mapping.name === mapping.id) {
    warnings.push('Name and ID fields cannot be mapped to the same property');
  }
  
  // Quality checks
  if (properties.length > 0) {
    const nameProperty = properties.find(p => p.name === mapping.name);
    if (nameProperty && nameProperty.samples) {
      // Check if name values look reasonable
      const samples = nameProperty.samples.filter(s => s && s.length > 0);
      if (samples.length === 0) {
        warnings.push('Name property appears to have empty values');
      } else if (samples.some(s => s.length > 100)) {
        warnings.push('Name property contains very long values - consider using description field instead');
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Validate scope configuration for simplified workflow
 */
export const validateScope = (scope) => {
  const errors = [];
  const warnings = [];
  
  if (!scope || !scope.uploadType) {
    errors.push('Upload type is required');
    return { valid: false, errors, warnings };
  }
  
  const validUploadTypes = ['replace', 'local'];
  if (!validUploadTypes.includes(scope.uploadType)) {
    errors.push(`Invalid upload type. Must be one of: ${validUploadTypes.join(', ')}`);
  }
  
  if (!scope.level) {
    errors.push('Geographic level is required');
  }
  
  const validLevels = ['countries', 'states', 'counties', 'districts', 'constituencies', 'wards'];
  if (scope.level && !validLevels.includes(scope.level)) {
    errors.push(`Invalid geographic level. Must be one of: ${validLevels.join(', ')}`);
  }
  
  // Validate replace-specific fields
  if (scope.uploadType === 'replace') {
    if (!scope.replaceScope) {
      errors.push('Replacement scope is required for replace uploads');
    } else {
      const validReplaceScopes = ['worldwide', 'country', 'regional'];
      if (!validReplaceScopes.includes(scope.replaceScope)) {
        errors.push(`Invalid replacement scope. Must be one of: ${validReplaceScopes.join(', ')}`);
      }
      
      // Validate country-specific requirements
      if (scope.replaceScope === 'country' && !scope.targetCountry) {
        errors.push('Target country is required for country-specific replacements');
      }
      
      // Validate regional-specific requirements
      if (scope.replaceScope === 'regional') {
        if (!scope.targetCountry) {
          errors.push('Target country is required for regional replacements');
        }
        if (!scope.targetRegion) {
          errors.push('Target region is required for regional replacements');
        }
      }
      
      // Validate parent field for non-worldwide replacements
      if (scope.replaceScope !== 'worldwide' && !scope.parentField) {
        errors.push('Parent field is required for scoped replacements');
      }
    }
  }
  
  // Validate local-specific fields
  if (scope.uploadType === 'local') {
    if (!scope.localTarget) {
      errors.push('Target area is required for local additions');
    }
    
    // Warn about hierarchy compatibility
    if (scope.level === 'countries') {
      warnings.push('Adding countries as local features is unusual - consider using replace instead');
    }
  }
  
  // Validate level-specific requirements
  if (scope.level === 'wards' && scope.uploadType === 'local') {
    if (!scope.localTarget || scope.localTarget === 'Other') {
      warnings.push('For ward-level local additions, please specify the exact district/city');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
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

/**
 * Comprehensive validation pipeline for simplified workflow
 */
export const validateCustomLayer = async (file, geoJson, mapping, scope) => {
  const results = {
    file: validateFile(file),
    geoJson: validateGeoJSON(geoJson),
    mapping: null,
    scope: null,
    overall: { valid: true, errors: [], warnings: [] }
  };
  
  // Only validate mapping and scope if GeoJSON is valid
  if (results.geoJson.valid) {
    // Extract property information from GeoJSON analysis
    const analysis = analyzeProperties(geoJson);
    results.mapping = validatePropertyMapping(analysis.properties, mapping);
    results.scope = validateScope(scope);
  }
  
  // Compile overall results
  const allResults = [results.file, results.geoJson, results.mapping, results.scope].filter(Boolean);
  
  results.overall.valid = allResults.every(r => r.valid);
  results.overall.errors = allResults.flatMap(r => r.errors || []);
  results.overall.warnings = allResults.flatMap(r => r.warnings || []);
  
  // Add specific validation for simplified workflow
  if (results.overall.valid && scope && mapping) {
    // Extract property information from GeoJSON analysis
    const analysis = analyzeProperties(geoJson);
    const additionalValidation = validateLayerConfiguration(scope, mapping, analysis.properties);
    if (additionalValidation.errors.length > 0) {
      results.overall.valid = false;
      results.overall.errors.push(...additionalValidation.errors);
    }
    results.overall.warnings.push(...additionalValidation.warnings);
  }
  
  return results;
};

/**
 * Additional validation for layer configuration compatibility
 */
const validateLayerConfiguration = (scope, mapping, properties) => {
  const errors = [];
  const warnings = [];
  
  // Check if parent field is valid for replace operations
  if (scope.uploadType === 'replace' && scope.parentField) {
    const parentProperty = properties.find(p => p.name === scope.parentField);
    if (!parentProperty) {
      errors.push(`Parent field '${scope.parentField}' not found in GeoJSON properties`);
    } else if (parentProperty.completeness < 70) {
      warnings.push(`Parent field '${scope.parentField}' has low completeness (${parentProperty.completeness}%)`);
    }
  }
  
  // Check if the scope configuration makes sense for the level
  if (scope.level === 'countries' && scope.uploadType === 'local') {
    warnings.push('Adding countries as local features may not integrate properly with existing hierarchy');
  }
  
  // Check if mapping fields have good quality for the intended use
  if (mapping.name) {
    const nameProperty = properties.find(p => p.name === mapping.name);
    if (nameProperty && nameProperty.samples) {
      // Check for consistency in naming
      const samples = nameProperty.samples.filter(s => s && s.length > 0);
      if (samples.length > 0) {
        const hasNumbers = samples.some(s => /\d/.test(s));
        const hasSpecialChars = samples.some(s => /[^a-zA-Z0-9\s-]/.test(s));
        
        if (hasNumbers && scope.level === 'countries') {
          warnings.push('Name field contains numbers, unusual for country names');
        }
        if (hasSpecialChars) {
          warnings.push('Name field contains special characters, may cause display issues');
        }
      }
    }
  }
  
  return { errors, warnings };
};