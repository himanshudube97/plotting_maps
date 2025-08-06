// dataLoader.js - Utility for loading and accessing map data configuration

let geoDataConfig = null;

/**
 * Load the geographic data configuration from JSON file
 */
export const loadGeoDataConfig = async () => {
  if (geoDataConfig) return geoDataConfig;
  
  try {
    const response = await fetch('/geoDataConfig.json');
    geoDataConfig = await response.json();
    return geoDataConfig;
  } catch (error) {
    console.error('Error loading geographic data configuration:', error);
    throw error;
  }
};

/**
 * Update the in-memory geo data configuration
 */
export const updateGeoDataConfig = (newConfig) => {
  geoDataConfig = newConfig;
};

/**
 * Get world data (countries)
 */
export const getWorldData = async () => {
  const config = await loadGeoDataConfig();
  const countries = config.data.countries;
  return Object.values(countries).map(country => ({
    name: country.name,
    value: country.value
  }));
};

/**
 * Get India state data
 */
export const getIndiaStateData = async () => {
  const config = await loadGeoDataConfig();
  const states = config.data.indiaStates;
  return Object.values(states).map(state => ({
    name: state.name,
    value: state.value
  }));
};

/**
 * Get Kenya county data
 */
export const getKenyaCountyData = async () => {
  const config = await loadGeoDataConfig();
  const counties = config.data.kenyaCounties;
  return Object.values(counties).map(county => ({
    name: county.name,
    value: county.value
  }));
};

/**
 * Get Pune ward data
 */
export const getPuneWardData = async () => {
  const config = await loadGeoDataConfig();
  const wards = config.data.puneWards;
  return Object.values(wards).map(ward => ({
    name: ward.name,
    value: ward.value
  }));
};

/**
 * Generate district data for a specific state using configured values
 */
export const generateDistrictDataForState = async (stateName) => {
  try {
    const config = await loadGeoDataConfig();
    const districts = config.data.indiaDistricts;
    
    // Filter districts for the specific state and return configured values
    return Object.values(districts)
      .filter(district => district.parent === stateName)
      .map(district => ({
        name: district.name,
        value: district.value
      }));
  } catch (error) {
    console.error('Error loading district data:', error);
    return [];
  }
};

/**
 * Generate constituency data for a specific Kenya county using configured values
 */
export const generateConstituencyDataForCounty = async (countyName) => {
  try {
    const config = await loadGeoDataConfig();
    const constituencies = config.data.kenyaConstituencies;
    
    // Filter constituencies for the specific county and return configured values
    return Object.values(constituencies)
      .filter(constituency => constituency.parent === countyName)
      .map(constituency => ({
        name: constituency.name,
        value: constituency.value
      }));
  } catch (error) {
    console.error('Error loading constituency data:', error);
    return [];
  }
};

/**
 * Generate ward data for a specific Kenya constituency using configured values
 */
export const generateWardDataForConstituency = async (constituencyName) => {
  try {
    const config = await loadGeoDataConfig();
    const wards = config.data.kenyaWards;
    
    // Find the matching constituency parent and filter wards
    return Object.values(wards)
      .filter(ward => {
        // Ward parent is the county, so we need to find wards by constituency through the GeoJSON
        // For now, we'll use a direct match approach - this may need refinement
        return ward.parent && ward.parent.toLowerCase() === constituencyName.toLowerCase();
      })
      .map(ward => ({
        name: ward.name,
        value: ward.value
      }));
  } catch (error) {
    console.error('Error loading ward data for constituency:', error);
    return [];
  }
};

/**
 * Generate ward data for a specific Kenya county using configured values (direct county to ward mapping)
 */
export const generateWardDataForCounty = async (countyName) => {
  try {
    const config = await loadGeoDataConfig();
    const wards = config.data.kenyaWards;
    
    // Filter wards for the specific county (case-insensitive matching)
    return Object.values(wards)
      .filter(ward => 
        ward.parent && 
        ward.parent.toUpperCase() === countyName.toUpperCase()
      )
      .map(ward => ({
        name: ward.name,
        value: ward.value
      }));
  } catch (error) {
    console.error('Error loading ward data for county:', error);
    return [];
  }
};

/**
 * Automatically detect features from all active GeoJSON files
 * This function scans custom layers and regular GeoJSON files to populate features
 */
export const detectFeaturesFromActiveGeoJSONs = async () => {
  console.log('🔍 Starting automatic feature detection from active GeoJSON files...');
  
  const detectedFeatures = {
    countries: {},
    indiaStates: {},
    indiaDistricts: {},
    kenyaCounties: {},
    kenyaConstituencies: {},
    kenyaWards: {},
    puneWards: {},
    customLayers: {}
  };

  try {
    // Get existing config
    const config = await loadGeoDataConfig();
    
    // Scan custom layers from IndexedDB
    const customLayers = await getCustomLayersFromIndexedDB();
    
    if (customLayers.length > 0) {
      console.log(`Found ${customLayers.length} custom layers to scan for features`);
      
      customLayers.forEach(layer => {
        const layerFeatures = {};
        
        if (layer.processedFeatures) {
          Object.values(layer.processedFeatures).forEach(feature => {
            layerFeatures[feature.name] = {
              name: feature.name,
              value: 0, // Default value as requested
              parent: feature.parent || null,
              id: feature.id || null,
              description: feature.description || null,
              enabled: true,
              customLayer: true,
              layerId: layer.metadata.id
            };
          });
        }
        
        detectedFeatures.customLayers[layer.metadata.id] = layerFeatures;
        console.log(`Detected ${Object.keys(layerFeatures).length} features from custom layer: ${layer.metadata.name}`);
      });
    }
    
    // Scan regular GeoJSON files that are currently loaded
    await scanStandardGeoJSONFiles(detectedFeatures);
    
    // Merge with existing configuration, preserving user-edited values
    const mergedConfig = mergeDetectedFeatures(config, detectedFeatures);
    
    // Update the in-memory configuration
    updateGeoDataConfig(mergedConfig);
    
    console.log('✅ Feature detection completed and configuration updated');
    return mergedConfig;
    
  } catch (error) {
    console.error('❌ Error during feature detection:', error);
    return null;
  }
};

/**
 * Get custom layers from IndexedDB
 */
const getCustomLayersFromIndexedDB = async () => {
  return new Promise((resolve) => {
    const request = indexedDB.open('GeoLayerStorage', 1);
    
    request.onerror = () => {
      console.warn('IndexedDB not available, skipping custom layer detection');
      resolve([]);
    };
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('layers')) {
        resolve([]);
        return;
      }
      
      const transaction = db.transaction(['layers'], 'readonly');
      const store = transaction.objectStore('layers');
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => {
        resolve(getAllRequest.result || []);
      };
      
      getAllRequest.onerror = () => {
        console.error('Error reading custom layers from IndexedDB');
        resolve([]);
      };
    };
  });
};

/**
 * Scan standard GeoJSON files for features
 */
const scanStandardGeoJSONFiles = async (detectedFeatures) => {
  const geoJsonFiles = [
    { url: '/countries.geo.json', level: 'countries' },
    { url: '/india.geojson', level: 'indiaStates' },
    { url: '/india_districts.geojson', level: 'indiaDistricts' },
    { url: '/kenya_counties.json', level: 'kenyaCounties' },
    { url: '/kenya_constituencies.json', level: 'kenyaConstituencies' },
    { url: '/kenya_wards.json', level: 'kenyaWards' },
    { url: '/pune-electoral-wards_2022.geojson', level: 'puneWards' }
  ];

  for (const file of geoJsonFiles) {
    try {
      const response = await fetch(file.url);
      if (response.ok) {
        const geoJson = await response.json();
        
        if (geoJson.features) {
          geoJson.features.forEach((feature) => {
            const properties = feature.properties;
            const name = extractFeatureName(properties);
            
            if (name) {
              detectedFeatures[file.level][name] = {
                name: name,
                value: 0, // Default value as requested
                parent: extractParentName(properties, file.level),
                id: properties.id || properties.ID || null,
                enabled: true,
                source: 'geojson'
              };
            }
          });
          
          console.log(`Detected ${Object.keys(detectedFeatures[file.level]).length} features from ${file.url}`);
        }
      }
    } catch (error) {
      console.warn(`Could not scan ${file.url}:`, error.message);
    }
  }
};

/**
 * Extract feature name from properties using common name fields
 */
const extractFeatureName = (properties) => {
  const nameFields = ['name', 'Name', 'NAME', 'ward_name', 'WARD_NAME', 'district', 'DISTRICT', 'state', 'STATE', 'county', 'COUNTY'];
  
  for (const field of nameFields) {
    if (properties[field] && typeof properties[field] === 'string') {
      return properties[field].trim();
    }
  }
  
  return null;
};

/**
 * Extract parent name from properties
 */
const extractParentName = (properties, level) => {
  const parentFields = {
    'indiaDistricts': ['state', 'State', 'STATE'],
    'kenyaConstituencies': ['county', 'County', 'COUNTY'],
    'kenyaWards': ['county', 'County', 'COUNTY'],
    'puneWards': []
  };
  
  const fields = parentFields[level] || [];
  
  for (const field of fields) {
    if (properties[field] && typeof properties[field] === 'string') {
      return properties[field].trim();
    }
  }
  
  return null;
};

/**
 * Merge detected features with existing configuration, preserving user edits
 */
const mergeDetectedFeatures = (existingConfig, detectedFeatures) => {
  const merged = { ...existingConfig };
  
  // Merge each level
  Object.keys(detectedFeatures).forEach(level => {
    if (!merged.data[level]) {
      merged.data[level] = {};
    }
    
    Object.keys(detectedFeatures[level]).forEach(featureName => {
      const detectedFeature = detectedFeatures[level][featureName];
      const existingFeature = merged.data[level][featureName];
      
      if (existingFeature) {
        // Preserve existing value if user has edited it (not 0)
        merged.data[level][featureName] = {
          ...detectedFeature,
          value: existingFeature.value !== 0 ? existingFeature.value : 0
        };
      } else {
        // Add new detected feature with default value 0
        merged.data[level][featureName] = detectedFeature;
      }
    });
  });
  
  return merged;
};