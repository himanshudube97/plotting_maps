#!/usr/bin/env node

/**
 * Script to extract all geographic feature names from GeoJSON files
 * and create a comprehensive data configuration for choropleth mapping
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration for each geographic level
const geoConfigs = [
  {
    file: 'public/countries.geo.json',
    level: 'countries',
    nameProperty: 'name',
    parent: null
  },
  {
    file: 'public/india.geojson',
    level: 'indiaStates',
    nameProperty: 'NAME_1',
    parent: null
  },
  {
    file: 'public/india_districts.geojson',
    level: 'indiaDistricts',
    nameProperty: 'NAME_2',
    parent: 'NAME_1' // State name
  },
  {
    file: 'public/pune-electoral-wards_2022.geojson',
    level: 'puneWards',
    nameProperty: ['Name1', 'Name2', 'wardnum'],
    parent: null
  },
  {
    file: 'public/kenya_counties.json',
    level: 'kenyaCounties',
    nameProperty: 'COUNTY_NAM',
    parent: null
  },
  {
    file: 'public/kenya_constituencies.json',
    level: 'kenyaConstituencies',
    nameProperty: 'CONSTITUEN',
    parent: 'COUNTY_NAM' // County name
  },
  {
    file: 'public/kenya_wards.json',
    level: 'kenyaWards',
    nameProperty: 'ward',
    parent: 'county' // County name (for direct county-ward mapping)
  }
];

/**
 * Extract feature name from properties using name property config
 */
function extractName(properties, nameProperty) {
  if (Array.isArray(nameProperty)) {
    // Try multiple properties in order
    for (const prop of nameProperty) {
      if (properties[prop]) {
        return properties[prop];
      }
    }
    return null;
  } else {
    return properties[nameProperty];
  }
}

/**
 * Generate default value for a feature (can be customized later)
 */
function generateDefaultValue(featureName, level) {
  // Special handling for countries - only India and Kenya get non-zero values
  if (level === 'countries') {
    if (featureName === 'India') return 1000;
    if (featureName === 'Kenya') return 800;
    return 0; // All other countries get 0
  }
  
  // Generate a consistent but varied default value based on name hash for other levels
  const hash = featureName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const baseValue = 50 + (hash % 450); // Range: 50-500
  
  // Add some level-specific scaling
  const levelMultipliers = {
    indiaStates: 5,
    indiaDistricts: 3,
    puneWards: 1,
    kenyaCounties: 4,
    kenyaConstituencies: 2,
    kenyaWards: 1
  };
  
  return Math.round(baseValue * (levelMultipliers[level] || 1));
}

/**
 * Process a single GeoJSON file
 */
function processGeoFile(config) {
  const filePath = path.join(__dirname, '..', config.file);
  
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filePath}`);
    return {};
  }
  
  console.log(`Processing ${config.file}...`);
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const geoData = JSON.parse(content);
    
    const features = {};
    
    if (geoData.features) {
      geoData.features.forEach((feature, index) => {
        const name = extractName(feature.properties, config.nameProperty);
        const parent = config.parent ? feature.properties[config.parent] : null;
        
        if (name) {
          features[name] = {
            name: name,
            value: generateDefaultValue(name, config.level),
            parent: parent,
            enabled: true,
            index: index
          };
          
          if (parent) {
            console.log(`  ${name} (${parent})`);
          } else {
            console.log(`  ${name}`);
          }
        }
      });
    }
    
    console.log(`  Found ${Object.keys(features).length} features\n`);
    return features;
    
  } catch (error) {
    console.error(`Error processing ${config.file}:`, error.message);
    return {};
  }
}

/**
 * Main execution
 */
function main() {
  console.log('Extracting geographic data from GeoJSON files...\n');
  
  const dataConfig = {
    metadata: {
      generated: new Date().toISOString(),
      version: '1.0.0',
      description: 'Geographic feature data configuration for choropleth mapping'
    },
    data: {}
  };
  
  // Process each file
  geoConfigs.forEach(config => {
    dataConfig.data[config.level] = processGeoFile(config);
  });
  
  // Write the configuration file
  const outputPath = path.join(__dirname, '..', 'public', 'geoDataConfig.json');
  fs.writeFileSync(outputPath, JSON.stringify(dataConfig, null, 2));
  
  console.log(`\n✅ Data configuration written to: ${outputPath}`);
  console.log(`\n📊 Summary:`);
  
  Object.entries(dataConfig.data).forEach(([level, features]) => {
    console.log(`  ${level}: ${Object.keys(features).length} features`);
  });
  
  console.log(`\n🎯 Usage:`);
  console.log(`  - Import this config in your application`);
  console.log(`  - Edit values through the settings panel`);
  console.log(`  - Values will be used for choropleth coloring`);
}

// Run the script
main();