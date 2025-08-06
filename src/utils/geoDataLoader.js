// geoDataLoader.js - Load geographic data for custom layer dropdowns

let geoDataConfig = null;

/**
 * Load geographic data configuration
 */
export const loadGeoDataConfig = async () => {
  if (geoDataConfig) return geoDataConfig;
  
  try {
    const response = await fetch('/geoDataConfig.json');
    if (!response.ok) throw new Error('Failed to load geo data config');
    
    geoDataConfig = await response.json();
    return geoDataConfig;
  } catch (error) {
    console.error('Error loading geo data config:', error);
    return null;
  }
};

/**
 * Get available countries
 */
export const getAvailableCountries = () => {
  return [
    { value: 'India', label: '🇮🇳 India' },
    { value: 'Kenya', label: '🇰🇪 Kenya' }
  ];
};

/**
 * Get available regions/states for a country
 */
export const getRegionsForCountry = async (country) => {
  const config = await loadGeoDataConfig();
  if (!config) return [];
  
  const regions = [];
  
  if (country === 'India') {
    const states = Object.keys(config.data.indiaStates || {});
    regions.push(...states.map(state => ({ value: state, label: state })));
  } else if (country === 'Kenya') {
    const counties = Object.keys(config.data.kenyaCounties || {});
    regions.push(...counties.map(county => ({ value: county, label: county })));
  }
  
  // Add "Other" option for custom input
  regions.push({ value: 'Other', label: 'Other (specify below)' });
  
  return regions.sort((a, b) => {
    if (a.value === 'Other') return 1;
    if (b.value === 'Other') return -1;
    return a.label.localeCompare(b.label);
  });
};

/**
 * Get available targets for local addition based on country and level
 */
export const getTargetsForLevel = async (country, level) => {
  const config = await loadGeoDataConfig();
  if (!config) return [];
  
  const targets = [];
  
  if (country === 'India') {
    if (level === 'states') {
      // For state-level, target would be the country itself
      targets.push({ value: 'India', label: 'India', country: 'India' });
    } else if (level === 'districts') {
      // For district-level, target would be specific states
      const states = Object.keys(config.data.indiaStates || {});
      targets.push(...states.map(state => ({ value: state, label: state, country: 'India' })));
    } else if (level === 'wards') {
      // For ward-level, target would be specific districts
      const districts = Object.keys(config.data.indiaDistricts || {});
      targets.push(...districts.map(district => ({ value: district, label: district, country: 'India' })));
      // Add special case for Pune since we have detailed wards
      if (!districts.includes('Pune')) {
        targets.push({ value: 'Pune', label: 'Pune', country: 'India' });
      }
    }
  } else if (country === 'Kenya') {
    if (level === 'counties') {
      // For county-level, target would be the country itself
      targets.push({ value: 'Kenya', label: 'Kenya', country: 'Kenya' });
    } else if (level === 'constituencies') {
      // For constituency-level, target would be specific counties
      const counties = Object.keys(config.data.kenyaCounties || {});
      targets.push(...counties.map(county => ({ value: county, label: county, country: 'Kenya' })));
    } else if (level === 'wards') {
      // For ward-level, target would be specific constituencies or counties
      const constituencies = Object.keys(config.data.kenyaConstituencies || {});
      targets.push(...constituencies.map(constituency => ({ value: constituency, label: constituency, country: 'Kenya' })));
    }
  }
  
  // Add "Other" option for custom input
  targets.push({ value: 'Other', label: 'Other (specify below)' });
  
  return targets.sort((a, b) => {
    if (a.value === 'Other') return 1;
    if (b.value === 'Other') return -1;
    return a.label.localeCompare(b.label);
  });
};

/**
 * Get available levels for a country
 */
export const getAvailableLevels = (country) => {
  const allLevels = [
    { value: 'countries', label: 'Countries', example: 'National boundaries' },
    { value: 'states', label: 'States/Provinces', example: 'First-level divisions' },
    { value: 'counties', label: 'Counties', example: 'Second-level divisions' },
    { value: 'districts', label: 'Districts', example: 'Administrative districts' },
    { value: 'constituencies', label: 'Constituencies', example: 'Electoral districts' },
    { value: 'wards', label: 'Wards', example: 'Local administrative units' }
  ];
  
  // Filter levels based on country (exclude 'countries' since a country is already selected)
  if (country === 'India') {
    return allLevels.filter(level => 
      ['states', 'districts', 'wards'].includes(level.value)
    );
  } else if (country === 'Kenya') {
    return allLevels.filter(level => 
      ['counties', 'constituencies', 'wards'].includes(level.value)
    );
  }
  
  return allLevels.filter(level => level.value !== 'countries');
};

/**
 * Validate if a level is valid for a country
 */
export const isValidLevelForCountry = (country, level) => {
  const validLevels = getAvailableLevels(country);
  return validLevels.some(l => l.value === level);
};