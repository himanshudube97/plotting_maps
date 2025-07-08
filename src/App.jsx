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
}) {
  const [option, setOption] = useState(null);

  useEffect(() => {
    fetch(geoJsonUrl)
      .then((r) => r.json())
      .then((geo) => {
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
            max: mapData.length ? Math.max(...mapData.map((d) => d.value)) : 1,
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
              data: mapData,
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
      .catch(console.error);
  }, [geoJsonUrl, mapKey, mapData, title, nameProperty]);

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

// --- Dummy/shading data ---

// Only shade India on the world map
const worldData = [
  { name: 'India', value: 1 },
];

// Example state-level data for India
const indiaStateData = [
  { name: 'Maharashtra', value: 24 },
  { name: 'Karnataka',   value: 18 },
  { name: 'Tamil Nadu',  value: 20 },
  { name: 'Gujarat',     value: 15 },
  { name: 'West Bengal', value: 22 },
];

// Example district-level data for Maharashtra
const mhDistrictData = [
  { name: 'Gondia', value: 50000 },
  { name: 'Mumbai', value: 75000 },
  { name: 'Pune',   value: 50000 },
  { name: 'Nagpur', value: 35000 },
  { name: 'Nashik', value: 60000 },
];

export default function App() {
  // view: 'world' | 'india' | 'maharashtra'
  const [view, setView] = useState('world');

  // Level 1 → Level 2
  const handleWorldClick = (name) => {
    if (name === 'India') setView('india');
  };

  // Level 2 → Level 3
  const handleIndiaClick = (name) => {
    if (name === 'Maharashtra') setView('maharashtra');
  };

  // --- WORLD MAP ---
  if (view === 'world') {
    return (
      <GenericMap
        geoJsonUrl="/src/countries.geo.json"
        mapKey="WORLD"
        mapData={worldData}
        title="World (click India)"
        nameProperty={['name']}
        onMapClick={handleWorldClick}
      />
    );
  }

  // --- INDIA MAP ---
  if (view === 'india') {
    return (
      <div style={{ padding: 16 }}>
        <button onClick={() => setView('world')} style={{ marginBottom: 8 }}>
          ← Back to World
        </button>
        <GenericMap
          geoJsonUrl="/src/india.geojson"
          mapKey="IN"
          mapData={indiaStateData}
          title="India (click Maharashtra)"
          nameProperty={['NAME_1']}
          onMapClick={handleIndiaClick}
        />
      </div>
    );
  }

  // --- MAHARASHTRA MAP ---
  return (
    <div style={{ padding: 16 }}>
      <button onClick={() => setView('india')} style={{ marginBottom: 8 }}>
        ← Back to India
      </button>
      <GenericMap
        geoJsonUrl="/src/maharashtra.geojson"
        mapKey="IN-MH"
        mapData={mhDistrictData}
        title="Maharashtra Districts"
        nameProperty={['district']}
      />
    </div>
  );
}
