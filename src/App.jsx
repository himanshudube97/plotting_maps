// App.js
import React, { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts/core';
import { MapChart } from 'echarts/charts';
import {
  TooltipComponent,
  VisualMapComponent,
  TitleComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import {
  getWorldData,
  getIndiaStateData,
  getKenyaCountyData,
  getPuneWardData,
  generateDistrictDataForState,
  generateConstituencyDataForCounty,
  generateWardDataForConstituency,
  generateWardDataForCounty
} from './dataLoader.js';
import {
  getCustomLayerForNavigation,
  convertCustomLayerToAppData,
  createCustomLayerDataUrl,
  getCustomLayerMapKey
} from './utils/customLayerIntegration.js';
import { debugCustomLayers, testCustomLayerLookup } from './utils/debugUtils.js';
import './utils/testCustomLayers.js'; // Import test utilities
import Settings from './Settings.jsx';

// Register ECharts components
echarts.use([
  MapChart,
  TooltipComponent,
  VisualMapComponent,
  TitleComponent,
  CanvasRenderer,
]);

/**
 * GenericMap: renders any GeoJSON + data as a hoverable map.
 */
function GenericMap({
  geoJsonUrl,
  mapKey,
  mapData,
  title,
  nameProperty = ['name', 'NAME_1', 'NAME_2', 'district'],
  onMapClick,
  stateFilter = null, // NEW: filter districts by state
  countyFilter = null, // NEW: filter constituencies by county
  constituencyFilter = null, // NEW: filter wards by constituency
  countyWardFilter = null, // NEW: filter wards by county directly
}) {
  const [option, setOption] = useState(null);

  useEffect(() => {
    fetch(geoJsonUrl)
      .then((r) => {
        if (!r.ok) {
          throw new Error(`HTTP error! status: ${r.status}`);
        }
        return r.json();
      })
      .then((geo) => {
        // Filter features by state if specified (for India districts)
        if (stateFilter) {
          geo.features = geo.features.filter(f => 
            f.properties.NAME_1 === stateFilter
          );
        }

        // Filter features by county if specified (for Kenya constituencies)
        if (countyFilter) {
          console.log('=== COUNTY FILTER DEBUG ===');
          console.log('Filtering by county:', countyFilter);
          console.log('Total features before filter:', geo.features.length);
          
          geo.features = geo.features.filter(f => {
            const match = f.properties.COUNTY_NAM && f.properties.COUNTY_NAM.toUpperCase() === countyFilter.toUpperCase();
            if (!match) {
              console.log(`Feature ${f.properties.CONSTITUEN || f.properties.ward} county ${f.properties.COUNTY_NAM || f.properties.county} doesn't match ${countyFilter}`);
            }
            return match;
          });
          
          console.log('Total features after filter:', geo.features.length);
          console.log('Sample filtered features:', geo.features.slice(0, 3).map(f => ({
            name: f.properties.CONSTITUEN || f.properties.ward,
            county: f.properties.COUNTY_NAM || f.properties.county
          })));
        }

        // Filter features by constituency if specified (for Kenya wards)
        if (constituencyFilter) {
          console.log('=== CONSTITUENCY FILTER DEBUG ===');
          console.log('Filtering by constituency:', constituencyFilter);
          console.log('Total features before filter:', geo.features.length);
          
          geo.features = geo.features.filter(f => {
            const match = f.properties.const && f.properties.const.toUpperCase() === constituencyFilter.toUpperCase();
            if (!match) {
              console.log(`Ward ${f.properties.ward} constituency ${f.properties.const} doesn't match ${constituencyFilter}`);
            }
            return match;
          });
          
          console.log('Total features after filter:', geo.features.length);
          console.log('Sample filtered features:', geo.features.slice(0, 3).map(f => ({
            ward: f.properties.ward,
            constituency: f.properties.const
          })));
        }

        // Filter features by county if specified (for Kenya wards - direct county to ward)
        if (countyWardFilter) {
          console.log('=== COUNTY WARD FILTER DEBUG ===');
          console.log('Filtering wards by county:', countyWardFilter);
          console.log('Total features before filter:', geo.features.length);
          
          geo.features = geo.features.filter(f => {
            const match = f.properties.county && 
              f.properties.county.toUpperCase() === countyWardFilter.toUpperCase();
            if (!match) {
              console.log(`Ward ${f.properties.ward} county ${f.properties.county} doesn't match ${countyWardFilter}`);
            }
            return match;
          });
          
          console.log('Total features after filter:', geo.features.length);
          console.log('Sample filtered features:', geo.features.slice(0, 3).map(f => ({
            ward: f.properties.ward,
            county: f.properties.county
          })));
        }

        // Copy the right property into feature.properties.name
        geo.features.forEach((f) => {
          for (const prop of nameProperty) {
            if (f.properties[prop]) {
              f.properties.name = f.properties[prop];
              break;
            }
          }
        });
        echarts.registerMap(mapKey, geo);

        setOption({
          title: { text: title, left: 'center' },
          tooltip: {
            trigger: 'item',
            formatter: ({ name, value }) =>
              `<strong>${name}</strong><br/>Value: ${value?.toLocaleString() ?? 'N/A'}`,
            appendToBody: true,
          },
          visualMap: {
            min: 0,
            max: (() => {
              if (!mapData.length) return 1;
              const validValues = mapData
                .map(d => d.value)
                .filter(v => typeof v === 'number' && !isNaN(v) && isFinite(v));
              
              if (validValues.length === 0) {
                console.warn('No valid values found in mapData:', mapData);
                return 1;
              }
              
              const maxValue = Math.max(...validValues);
              console.log('Visual map range: 0 to', maxValue, 'from', validValues.length, 'valid values');
              return maxValue;
            })(),
            left: 'left',
            bottom: '10%',
            text: ['High', 'Low'],
            calculable: true,
          },
          series: [
            {
              type: 'map',
              map: mapKey,
              roam: true,
              data: mapData.map(d => ({
                ...d,
                value: typeof d.value === 'number' && !isNaN(d.value) && isFinite(d.value) ? d.value : 0
              })),
              emphasis: {
                focus: 'self',
                label: { show: true },
                itemStyle: {
                  areaColor: '#ffd700',
                  borderColor: '#333',
                  borderWidth: 1,
                },
              },
              blur: { itemStyle: { opacity: 0.3 } },
            },
          ],
        });
      })
      .catch((error) => {
        console.error('Error loading GeoJSON:', error);
        console.error('GeoJSON URL:', geoJsonUrl);
        
        // If it's a blob URL, try to read it directly to debug
        if (geoJsonUrl && geoJsonUrl.startsWith('blob:')) {
          fetch(geoJsonUrl)
            .then(response => response.text())
            .then(text => {
              console.error('Blob content (first 500 chars):', text.substring(0, 500));
            })
            .catch(blobError => {
              console.error('Error reading blob:', blobError);
            });
        }
      });
  }, [geoJsonUrl, mapKey, mapData, title, nameProperty, stateFilter, countyFilter, constituencyFilter, countyWardFilter]);

  if (!option) return <div>Loading map…</div>;

  return (
    <ReactECharts
      echarts={echarts}
      option={option}
      style={{ width: '100%', height: 500 }}
      notMerge
      lazyUpdate
      onEvents={
        onMapClick
          ? { click: (params) => onMapClick(params.name) }
          : {}
      }
    />
  );
}

// StateDistrictsView component to handle replacement layer logic
function StateDistrictsView({ currentState, setView, handleStateDistrictClick }) {
  const [replacementLayer, setReplacementLayer] = useState(null);
  const [replacementChecked, setReplacementChecked] = useState(false);
  const [districtData, setDistrictData] = useState([]);
  const [dataUrl, setDataUrl] = useState(null);

  useEffect(() => {
    const checkReplacementLayer = async () => {
      console.log(`🔍 Checking for replacement districts layer for ${currentState}...`);
      
      // Check for regional replacement layer
      const customLayer = await getCustomLayerForNavigation('India', 'districts', currentState);
      
      if (customLayer) {
        console.log(`✅ Found replacement districts layer for ${currentState}:`, customLayer);
        console.log('Custom layer has GeoJSON:', !!customLayer.geoJson);
        console.log('Custom layer has processedFeatures:', !!customLayer.processedFeatures);
        
        setReplacementLayer(customLayer);
        
        // Create blob URL for the custom layer
        const newDataUrl = createCustomLayerDataUrl(customLayer);
        if (newDataUrl) {
          console.log('✅ Successfully created blob URL for custom layer');
          setDataUrl(newDataUrl);
        } else {
          console.error('❌ Failed to create blob URL for custom layer');
          setReplacementLayer(null);
        }
      } else {
        console.log(`📍 No replacement layer found, using default districts for ${currentState}`);
        setReplacementLayer(null);
        setDataUrl(null);
        
        // Load default district data
        try {
          const stateDistrictData = await generateDistrictDataForState(currentState);
          setDistrictData(stateDistrictData || []);
        } catch (error) {
          console.error('Error loading district data:', error);
          setDistrictData([]);
        }
      }
      
      setReplacementChecked(true);
    };
    
    if (currentState) {
      // Reset state when currentState changes
      setReplacementChecked(false);
      setReplacementLayer(null);
      setDistrictData([]);
      
      // Clean up previous blob URL
      if (dataUrl) {
        console.log('🧹 Cleaning up previous blob URL:', dataUrl);
        URL.revokeObjectURL(dataUrl);
        setDataUrl(null);
      }
      
      checkReplacementLayer();
    }
  }, [currentState]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (dataUrl) {
        console.log('🧹 Cleaning up blob URL on unmount:', dataUrl);
        URL.revokeObjectURL(dataUrl);
      }
    };
  }, [dataUrl]);

  // Show loading while checking for replacement
  if (!replacementChecked) {
    return (
      <div style={{ padding: 16 }}>
        <button onClick={() => setView('india')} style={{ marginBottom: 8 }}>
          ← Back to India
        </button>
        <div>Loading districts for {currentState}...</div>
      </div>
    );
  }

  // Use replacement layer if found
  if (replacementLayer && dataUrl) {
    const customData = convertCustomLayerToAppData(replacementLayer);
    
    // Validate property mapping and provide fallbacks
    const nameProperty = replacementLayer.propertyMapping?.name 
      ? [replacementLayer.propertyMapping.name]
      : ['name', 'NAME', 'Name', 'district', 'DISTRICT', 'District'];
    
    console.log(`🔍 Using nameProperty for replacement layer:`, nameProperty);
    
    return (
      <div style={{ padding: 16 }}>
        <button onClick={() => setView('india')} style={{ marginBottom: 8 }}>
          ← Back to India
        </button>
        <GenericMap
          geoJsonUrl={dataUrl}
          mapKey={getCustomLayerMapKey(replacementLayer)}
          mapData={customData}
          title={`${currentState} Districts (Custom: ${replacementLayer.name})`}
          nameProperty={nameProperty}
          onMapClick={handleStateDistrictClick}
        />
      </div>
    );
  }

  // Default districts view
  return (
    <div style={{ padding: 16 }}>
      <button onClick={() => setView('india')} style={{ marginBottom: 8 }}>
        ← Back to India
      </button>
      <GenericMap
        geoJsonUrl="/india_districts.geojson"
        mapKey={`IN-${currentState.toUpperCase().replace(/\s+/g, '')}-DISTRICTS`}
        mapData={districtData}
        title={`${currentState} Districts${currentState === 'Maharashtra' ? ' (click Pune)' : ''}`}
        nameProperty={['NAME_2']} // Use NAME_2 for district names in the unified file
        onMapClick={handleStateDistrictClick}
        stateFilter={currentState} // Filter to show only this state's districts
      />
    </div>
  );
}

export default function App() {
  // view: 'world' | 'india' | 'kenya' | 'maharashtra' | 'pune' | or any state/county name
  const [view, setView] = useState('world');
  const [currentState, setCurrentState] = useState(null); // Track which state we're viewing
  const [currentCounty, setCurrentCounty] = useState(null); // Track which Kenya county we're viewing
  const [currentConstituency, setCurrentConstituency] = useState(null); // Track which Kenya constituency we're viewing
  const [districtData, setDistrictData] = useState([]); // Store district data for current state
  const [constituencyData, setConstituencyData] = useState([]); // Store constituency data for current county
  const [wardData, setWardData] = useState([]); // Store ward data for current constituency
  
  // Data loaded from configuration
  const [worldData, setWorldData] = useState([]);
  const [indiaStateData, setIndiaStateData] = useState([]);
  const [kenyaCountyData, setKenyaCountyData] = useState([]);
  const [puneWardData, setPuneWardData] = useState([]);
  
  // Custom layer state
  const [activeCustomLayer, setActiveCustomLayer] = useState(null);
  const [customLayerData, setCustomLayerData] = useState([]);
  const [customLayerGeoJsonUrl, setCustomLayerGeoJsonUrl] = useState(null);

  // Settings state
  const [showSettings, setShowSettings] = useState(false);
  const [hierarchyConfig, setHierarchyConfig] = useState({
    india: {
      levels: ['state', 'district', 'ward'],
      enabled: { state: true, district: true, ward: true },
      required: { state: true, district: false, ward: false } // States are always required
    },
    kenya: {
      levels: ['county', 'constituency', 'ward'],
      enabled: { county: true, constituency: true, ward: true },
      required: { county: true, constituency: false, ward: false } // Counties are always required
    }
  });

  // Utility functions for hierarchy checking
  const isLevelEnabled = (country, level) => {
    return hierarchyConfig[country]?.enabled[level] ?? false;
  };

  const getNextEnabledLevel = (country, currentLevel) => {
    const levels = hierarchyConfig[country]?.levels || [];
    const currentIndex = levels.indexOf(currentLevel);
    
    for (let i = currentIndex + 1; i < levels.length; i++) {
      if (isLevelEnabled(country, levels[i])) {
        return levels[i];
      }
    }
    return null;
  };

  // Load data from configuration on component mount and when config changes
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [world, indiaStates, kenyaCounties, puneWards] = await Promise.all([
          getWorldData(),
          getIndiaStateData(),
          getKenyaCountyData(),
          getPuneWardData()
        ]);
        
        setWorldData(world);
        setIndiaStateData(indiaStates);
        setKenyaCountyData(kenyaCounties);
        setPuneWardData(puneWards);
      } catch (error) {
        console.error('Error loading initial data:', error);
      }
    };

    loadInitialData();
  }, []);

  // Function to refresh all data when configuration changes
  const refreshMapData = async () => {
    try {
      const [world, indiaStates, kenyaCounties, puneWards] = await Promise.all([
        getWorldData(),
        getIndiaStateData(),
        getKenyaCountyData(),
        getPuneWardData()
      ]);
      
      setWorldData(world);
      setIndiaStateData(indiaStates);
      setKenyaCountyData(kenyaCounties);
      setPuneWardData(puneWards);
    } catch (error) {
      console.error('Error refreshing map data:', error);
    }
  };

  // Level 1 → Level 2
  const handleWorldClick = (name) => {
    if (name === 'India') {
      // Reset state when navigating to India
      setCurrentState(null);
      setCurrentCounty(null);
      setCurrentConstituency(null);
      setView('india');
    } else if (name === 'Kenya') {
      // Reset state when navigating to Kenya
      setCurrentState(null);
      setCurrentCounty(null);
      setCurrentConstituency(null);
      setView('kenya');
    }
  };

  // Level 2 → Level 3 (Dynamic state handling)
  const handleIndiaClick = async (stateName) => {
    console.log('🎯 Clicked on state:', stateName);
    console.log('🔍 Current state before click:', currentState);
    console.log('🔍 Current view before click:', view);
    
    const nextLevel = getNextEnabledLevel('india', 'state');
    if (!nextLevel) {
      console.log('No next level enabled for India');
      return;
    }
    
    try {
      if (nextLevel === 'district') {
        // Generate district data for the clicked state
        const stateDistrictData = await generateDistrictDataForState(stateName);
        
        if (stateDistrictData && stateDistrictData.length > 0) {
          setCurrentState(stateName);
          setDistrictData(stateDistrictData);
          setView(stateName.toLowerCase().replace(/\s+/g, '')); // Convert to view format
        } else {
          console.log(`No districts found for ${stateName}`);
          // Still allow navigation even if no data - the GeoJSON might have the geometry
          setCurrentState(stateName);
          setDistrictData([]);
          setView(stateName.toLowerCase().replace(/\s+/g, ''));
        }
      } else if (nextLevel === 'ward') {
        // Skip directly to ward level if districts are disabled
        console.log('Skipping directly to ward level for', stateName);
        
        // Check if there are custom layers for this state
        const customLayer = await getCustomLayerForNavigation('India', 'wards', stateName);
        if (customLayer) {
          console.log(`Found custom ward layer for ${stateName}:`, customLayer);
          
          // Convert custom layer data to app format
          const customData = convertCustomLayerToAppData(customLayer);
          
          // Create a data URL for the GeoJSON
          const dataUrl = createCustomLayerDataUrl(customLayer);
          
          // Set custom layer state
          setActiveCustomLayer(customLayer);
          setCustomLayerData(customData);
          setCustomLayerGeoJsonUrl(dataUrl);
          
          // Set current state and view to show custom layer
          setCurrentState(stateName);
          setView(`${stateName.toLowerCase().replace(/\s+/g, '')}-custom-wards`);
          
          return;
        }
        
        if (stateName === 'Maharashtra') {
          // For now, only Pune has ward data, so go directly there
          setCurrentState(stateName);
          setView('pune');
        } else {
          console.log(`No ward-level data available for ${stateName}`);
          // Don't navigate if no ward data is available
        }
      }
    } catch (error) {
      console.error('Error loading district data:', error);
    }
  };

  // Level 3 → Level 4 (Generic district handler)
  const handleStateDistrictClick = async (districtName) => {
    console.group(`🎯 DISTRICT CLICK: ${districtName}`);
    
    const nextLevel = getNextEnabledLevel('india', 'district');
    console.log('Next enabled level after district:', nextLevel);
    
    if (!nextLevel) {
      console.log('❌ No next level enabled after district for India');
      console.groupEnd();
      return;
    }
    
    if (nextLevel === 'ward') {
      // Run full debug first
      console.log('🔍 Running full debug before lookup...');
      await debugCustomLayers();
      
      // First check if there's a custom layer for this district
      console.log(`🔍 Looking for custom layer: country='India', level='wards', target='${districtName}'`);
      const customLayer = await getCustomLayerForNavigation('India', 'wards', districtName);
      
      console.log(`📊 Custom layer lookup result:`, customLayer);
      
      if (customLayer) {
        console.log(`✅ Found custom ward layer for ${districtName}:`, customLayer);
        
        // Convert custom layer data to app format
        const customData = convertCustomLayerToAppData(customLayer);
        console.log('🔄 Converted custom data:', customData);
        
        // Create a data URL for the GeoJSON
        const dataUrl = createCustomLayerDataUrl(customLayer);
        console.log('🔗 Created data URL:', dataUrl ? 'SUCCESS' : 'FAILED');
        
        // Set custom layer state
        setActiveCustomLayer(customLayer);
        setCustomLayerData(customData);
        setCustomLayerGeoJsonUrl(dataUrl);
        
        // Set view to show custom layer
        const viewName = `${districtName.toLowerCase().replace(/\s+/g, '')}-custom-wards`;
        console.log('🎨 Setting view to:', viewName);
        setView(viewName);
        
        console.groupEnd();
        return;
      }
      
      // Fallback to default logic for Pune (this works for both original and replacement districts)
      if (districtName === 'Pune') {
        console.log('📍 Fallback to default Pune view');
        setView('pune');
      } else {
        console.log(`❌ No ward-level data available for ${districtName}`);
        console.log(`💡 This district (${districtName}) doesn't have ward-level data configured.`);
        console.log(`💡 You can upload a custom ward layer for this district using the upload feature.`);
      }
    }
    
    console.groupEnd();
  };

  // Level 2 → Level 3 (Kenya county to constituency handling)
  const handleKenyaClick = async (countyName) => {
    console.log('=== KENYA COUNTY CLICK DEBUG ===');
    console.log('Clicked on county:', countyName);
    
    const nextLevel = getNextEnabledLevel('kenya', 'county');
    if (!nextLevel) {
      console.log('No next level enabled for Kenya');
      return;
    }
    
    try {
      if (nextLevel === 'constituency') {
        // Generate constituency data for the clicked county
        const countyConstituencyData = await generateConstituencyDataForCounty(countyName);
        console.log('Generated constituency data:', countyConstituencyData);
        
        if (countyConstituencyData && countyConstituencyData.length > 0) {
          const newView = countyName.toLowerCase().replace(/\s+/g, '') + '-constituencies';
          console.log('Setting new view to:', newView);
          setCurrentCounty(countyName);
          setConstituencyData(countyConstituencyData);
          setView(newView);
        } else {
          console.log(`No constituencies found for ${countyName}`);
          // Still allow navigation even if no data
          const newView = countyName.toLowerCase().replace(/\s+/g, '') + '-constituencies';
          console.log('Setting new view to (no data):', newView);
          setCurrentCounty(countyName);
          setConstituencyData([]);
          setView(newView);
        }
      } else if (nextLevel === 'ward') {
        // Skip directly to ward level if constituencies are disabled
        console.log('Skipping directly to ward level for', countyName);
        
        try {
          const countyWardData = await generateWardDataForCounty(countyName);
          console.log('Generated ward data for county:', countyWardData);
          
          if (countyWardData && countyWardData.length > 0) {
            const newView = countyName.toLowerCase().replace(/\s+/g, '') + '-wards';
            console.log('Setting new view to (direct):', newView);
            setCurrentCounty(countyName);
            setCurrentConstituency(null); // Clear constituency since we're skipping it
            setWardData(countyWardData);
            setView(newView);
          } else {
            console.log(`No wards found for county ${countyName}`);
          }
        } catch (error) {
          console.error('Error loading ward data for county:', error);
        }
      }
    } catch (error) {
      console.error('Error loading constituency data:', error);
    }
  };

  // Level 3 → Level 4 (Kenya constituency to ward handling)
  const handleKenyaConstituencyClick = async (constituencyName) => {
    console.log('=== KENYA CONSTITUENCY CLICK DEBUG ===');
    console.log('Clicked on constituency:', constituencyName);
    
    const nextLevel = getNextEnabledLevel('kenya', 'constituency');
    if (!nextLevel) {
      console.log('No next level enabled after constituency for Kenya');
      return;
    }
    
    try {
      if (nextLevel === 'ward') {
        // Generate ward data for the clicked constituency
        const constituencyWardData = await generateWardDataForConstituency(constituencyName);
        console.log('Generated ward data:', constituencyWardData);
        
        if (constituencyWardData && constituencyWardData.length > 0) {
          const newView = constituencyName.toLowerCase().replace(/\s+/g, '') + '-wards';
          console.log('Setting new view to:', newView);
          setCurrentConstituency(constituencyName);
          setWardData(constituencyWardData);
          setView(newView);
        } else {
          console.log(`No wards found for ${constituencyName}`);
          // Still allow navigation even if no data
          const newView = constituencyName.toLowerCase().replace(/\s+/g, '') + '-wards';
          console.log('Setting new view to (no data):', newView);
          setCurrentConstituency(constituencyName);
          setWardData([]);
          setView(newView);
        }
      }
    } catch (error) {
      console.error('Error loading ward data:', error);
    }
  };

  // --- WORLD MAP ---
  if (view === 'world') {
    return (
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 100 }}>
          <button 
            onClick={() => setShowSettings(true)}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 16px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.transform = 'translateY(-1px)'}
            onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
          >
            ⚙️ Settings
          </button>
        </div>
        <GenericMap
          geoJsonUrl="/countries.geo.json"
          mapKey="WORLD"
          mapData={worldData}
          title="World (click India or Kenya)"
          nameProperty={['name']}
          onMapClick={handleWorldClick}
        />
        <Settings
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          hierarchyConfig={hierarchyConfig}
          onHierarchyChange={setHierarchyConfig}
          onDataConfigChange={refreshMapData}
        />
      </div>
    );
  }

  // --- INDIA MAP ---
  if (view === 'india') {
    return (
      <div style={{ padding: 16 }}>
        <button onClick={() => {
          // Reset all state when going back to world
          setCurrentState(null);
          setCurrentCounty(null);
          setCurrentConstituency(null);
          setView('world');
        }} style={{ marginBottom: 8 }}>
          ← Back to World
        </button>
        <GenericMap
          geoJsonUrl="/india.geojson"
          mapKey="IN"
          mapData={indiaStateData}
          title={`India${getNextEnabledLevel('india', 'state') ? ' (click any state)' : ' (drill-down disabled)'}`}
          nameProperty={['NAME_1']}
          onMapClick={getNextEnabledLevel('india', 'state') ? handleIndiaClick : undefined}
        />
      </div>
    );
  }

  // --- KENYA MAP ---
  if (view === 'kenya') {
    const nextLevel = getNextEnabledLevel('kenya', 'county');
    
    return (
      <div style={{ padding: 16 }}>
        <button onClick={() => {
          // Reset all state when going back to world
          setCurrentState(null);
          setCurrentCounty(null);
          setCurrentConstituency(null);
          setView('world');
        }} style={{ marginBottom: 8 }}>
          ← Back to World
        </button>
        <GenericMap
          geoJsonUrl="/kenya_counties.json"
          mapKey="KE"
          mapData={kenyaCountyData}
          title={`Kenya Counties${nextLevel ? ' (click any county)' : ' (drill-down disabled)'}`}
          nameProperty={['COUNTY_NAM']}
          onMapClick={nextLevel ? handleKenyaClick : undefined}
        />
      </div>
    );
  }

  // --- GENERIC STATE DISTRICTS MAP (with replacement layer support) ---
  const shouldRenderStateDistricts = view !== 'world' && view !== 'india' && view !== 'kenya' && view !== 'pune' && 
      !view.endsWith('-constituencies') && !view.endsWith('-wards') && 
      currentState && !currentCounty;
  
  console.log('🔍 StateDistrictsView condition check:', {
    view,
    currentState,
    currentCounty,
    shouldRender: shouldRenderStateDistricts
  });
  
  if (shouldRenderStateDistricts) {
    console.log('🎯 Rendering StateDistrictsView for:', currentState, 'view:', view);
    return <StateDistrictsView 
      currentState={currentState} 
      setView={setView} 
      handleStateDistrictClick={handleStateDistrictClick}
    />;
  }

  // --- KENYA COUNTY CONSTITUENCIES MAP ---
  if (view.endsWith('-constituencies') && currentCounty) {
    console.log('=== CONSTITUENCY VIEW DEBUG ===');
    console.log('Current view:', view);
    console.log('Current county:', currentCounty);
    console.log('Constituency data:', constituencyData);
    
    return (
      <div style={{ padding: 16 }}>
        <button onClick={() => setView('kenya')} style={{ marginBottom: 8 }}>
          ← Back to Kenya Counties
        </button>
        <GenericMap
          geoJsonUrl="/kenya_constituencies.json"
          mapKey={`KE-${currentCounty.toUpperCase().replace(/\s+/g, '')}-CONSTITUENCIES`}
          mapData={constituencyData}
          title={`${currentCounty} Constituencies (click any constituency to view wards)`}
          nameProperty={['CONSTITUEN']} // Use 'CONSTITUEN' property for constituency names
          countyFilter={currentCounty} // Filter to show only this county's constituencies
          onMapClick={handleKenyaConstituencyClick}
        />
      </div>
    );
  }

  // --- KENYA WARDS MAP (from constituency or county) ---
  if (view.endsWith('-wards') && (currentConstituency || currentCounty)) {
    console.log('=== WARD VIEW DEBUG ===');
    console.log('Current view:', view);
    console.log('Current constituency:', currentConstituency);
    console.log('Current county:', currentCounty);
    console.log('Ward data:', wardData);
    
    // Determine if we came from constituency or directly from county
    const cameFromConstituency = currentConstituency && isLevelEnabled('kenya', 'constituency');
    const backButtonText = cameFromConstituency 
      ? `← Back to ${currentCounty} Constituencies`
      : `← Back to Kenya Counties`;
    
    const backButtonAction = cameFromConstituency
      ? () => {
          const constituencyView = currentCounty.toLowerCase().replace(/\s+/g, '') + '-constituencies';
          setView(constituencyView);
        }
      : () => {
          // Clear constituency state when going back to county level
          setCurrentConstituency(null);
          setView('kenya');
        };
    
    const mapTitle = cameFromConstituency 
      ? `${currentConstituency} Wards`
      : `${currentCounty} Wards`;
    
    const mapKey = cameFromConstituency
      ? `KE-${currentConstituency.toUpperCase().replace(/\s+/g, '')}-WARDS`
      : `KE-${currentCounty.toUpperCase().replace(/\s+/g, '')}-WARDS`;
    
    return (
      <div style={{ padding: 16 }}>
        <button onClick={backButtonAction} style={{ marginBottom: 8 }}>
          {backButtonText}
        </button>
        <GenericMap
          geoJsonUrl="/kenya_wards.json"
          mapKey={mapKey}
          mapData={wardData}
          title={mapTitle}
          nameProperty={['ward']} // Use 'ward' property for ward names
          constituencyFilter={cameFromConstituency ? currentConstituency : null} // Filter by constituency if we came from there
          countyWardFilter={cameFromConstituency ? null : currentCounty} // Filter by county if we skipped constituencies
        />
      </div>
    );
  }

  // --- MAHARASHTRA DISTRICTS MAP (legacy - keeping for reference) ---
  if (view === 'maharashtra') {
    return (
      <div style={{ padding: 16 }}>
        <button onClick={() => setView('india')} style={{ marginBottom: 8 }}>
          ← Back to India
        </button>
        <GenericMap
          geoJsonUrl="/india_districts.geojson"
          mapKey="IN-MH-DISTRICTS"
          mapData={districtData.length > 0 ? districtData : []} // Use dynamic data if available
          title="Maharashtra Districts (click Pune)"
          nameProperty={['NAME_2']} // Use NAME_2 for district names in the unified file
          onMapClick={handleStateDistrictClick}
          stateFilter="Maharashtra" // Filter to show only Maharashtra districts
        />
      </div>
    );
  }

  // --- CUSTOM LAYER VIEW ---
  if (view.endsWith('-custom-wards') && activeCustomLayer && customLayerGeoJsonUrl) {
    const districtName = activeCustomLayer.scope.localTarget;
    
    return (
      <div style={{ padding: 16 }}>
        <button 
          onClick={() => {
            // Clean up custom layer state
            setActiveCustomLayer(null);
            setCustomLayerData([]);
            if (customLayerGeoJsonUrl) {
              URL.revokeObjectURL(customLayerGeoJsonUrl);
            }
            setCustomLayerGeoJsonUrl(null);
            
            // Go back to district view
            if (isLevelEnabled('india', 'district') && currentState) {
              setView(currentState.toLowerCase().replace(/\s+/g, ''));
            } else {
              setView('india');
            }
          }} 
          style={{ marginBottom: 8 }}
        >
          ← Back to {isLevelEnabled('india', 'district') ? (currentState || 'Maharashtra') : 'India'}
        </button>
        <GenericMap
          geoJsonUrl={customLayerGeoJsonUrl}
          mapKey={getCustomLayerMapKey(activeCustomLayer)}
          mapData={customLayerData}
          title={`${districtName} Wards (Custom Layer: ${activeCustomLayer.name})`}
          nameProperty={activeCustomLayer.propertyMapping?.name 
            ? [activeCustomLayer.propertyMapping.name]
            : ['name', 'NAME', 'Name', 'ward', 'WARD', 'Ward']}
        />
      </div>
    );
  }

  // --- PUNE ELECTORAL WARDS MAP ---
  return (
    <div style={{ padding: 16 }}>
      <button 
        onClick={() => {
          // Check if districts are enabled, if not go back to india
          if (isLevelEnabled('india', 'district') && currentState) {
            setView(currentState.toLowerCase().replace(/\s+/g, ''));
          } else {
            setView('india'); // Go back to India level if districts are disabled
          }
        }} 
        style={{ marginBottom: 8 }}
      >
        ← Back to {isLevelEnabled('india', 'district') ? (currentState || 'Maharashtra') : 'India'}
      </button>
      <GenericMap
        geoJsonUrl="/pune-electoral-wards_2022.geojson"
        mapKey="PUNE-WARDS"
        mapData={puneWardData}
        title="Pune Electoral Wards"
        nameProperty={['Name1', 'Name2', 'wardnum']}
      />
    </div>
  );
}