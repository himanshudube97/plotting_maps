# 🌍 Interactive Geographic Map - React Edition

A modern, interactive mapping application built with React, ECharts, and GeoJSON data. This application provides a beautiful and responsive interface for exploring multiple countries with configurable drill-down capabilities.

## ✨ Features

- **Interactive Map**: Click on any region to view detailed information
- **Multi-Level Drill-Down**: Navigate from world → countries → states/counties → districts/constituencies → wards
- **Configurable Hierarchy**: Customize drill-down levels through the settings page
- **Multiple Countries**: Support for India (State → District → Ward) and Kenya (County → Constituency → Ward)
- **Settings Panel**: Configure which hierarchy levels are enabled for each country
- **Responsive Design**: Works perfectly on desktop and mobile devices
- **Real-time Navigation**: Dynamic breadcrumb navigation between map levels
- **Modern UI**: Beautiful gradient backgrounds and smooth animations
- **Data Visualization**: Interactive tooltips and visual mapping with dummy data

## 🚀 Quick Start

### Prerequisites
- Node.js (version 16 or higher)
- npm or yarn

### Installation

1. **Clone or download the project**
   ```bash
   cd geomap
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   The application will automatically open at `http://localhost:3000`

## 🎮 How to Use

### Basic Navigation
- **Click** on any region to drill down to the next level
- **Use back buttons** to navigate up the hierarchy
- **Scroll** to zoom in/out on any map
- **Drag** to pan around the map

### Settings Configuration
- **Settings Button**: Click the ⚙️ Settings button on the world map
- **Hierarchy Configuration**: Enable/disable levels for each country
  - **India**: Toggle State → District → Ward levels
  - **Kenya**: Toggle County → Constituency → Ward levels
- **Real-time Preview**: See your hierarchy changes in the preview panel
- **Save Settings**: Apply changes to immediately affect navigation

### Navigation Examples
- **Full India Hierarchy**: World → India → State → District → Ward
- **Simplified India**: World → India → State → Ward (skip districts)
- **Full Kenya Hierarchy**: World → Kenya → County → Constituency → Ward
- **Direct Kenya**: World → Kenya → County → Ward (skip constituencies)

### Data Visualization
The application handles data for the chloropleth demonstration across all geographic levels:
- **Visual Tooltips**: Hover over any region to see data
- **Color Mapping**: Regions are colored based on data values
- **Interactive Elements**: Click regions only when drill-down is enabled
- **Dynamic Titles**: Map titles reflect current navigation capabilities

## 📁 Project Structure

```
plotting_maps/
├── src/
│   ├── App.jsx               # Main application component with navigation logic
│   ├── Settings.jsx          # Settings modal for hierarchy configuration
│   ├── Settings.css          # Styling for settings modal
│   ├── dataLoader.js         # Data loading and processing utilities
│   ├── IndiaDistrictDrilldown.css # Legacy styling
│   └── main.jsx              # React entry point
├── public/
│   ├── countries.geo.json    # World countries GeoJSON
│   ├── india.geojson         # India states GeoJSON
│   ├── india_districts.geojson # India districts GeoJSON
│   ├── kenya_counties.json   # Kenya counties GeoJSON
│   ├── kenya_constituencies.json # Kenya constituencies GeoJSON
│   ├── kenya_wards.json      # Kenya wards GeoJSON
│   ├── pune-electoral-wards_2022.geojson # Pune wards GeoJSON
│   └── dataConfig.json       # Data configuration
├── index.html                # HTML template
├── package.json              # Dependencies and scripts
├── vite.config.js            # Vite configuration
├── README.md                 # This file
└── CLAUDE.md                 # Development context
```

## 🛠️ Technical Details

### Technologies Used
- **React 18**: Modern React with hooks and functional components
- **ECharts 5.4.3**: Powerful charting library for map visualization
- **Vite**: Fast build tool and development server
- **D3-geo & D3-array**: Geographic and data processing utilities

### Key Features Implementation

#### Hierarchical Navigation
- Dynamic view state management for multi-level drill-down
- Configurable hierarchy settings stored in React state
- Conditional navigation based on enabled levels
- Real-time updates when settings change

#### Settings System
- Modal-based settings interface with beautiful UI
- Toggle switches for each hierarchy level
- Real-time preview of enabled navigation paths
- Persistent configuration during session

#### Map Rendering
- Uses ECharts `registerMap()` API to register GeoJSON data
- Implements choropleth visualization with color mapping
- Conditional click handlers based on hierarchy settings
- Dynamic filtering of geographic features by parent regions

#### Data Processing
- Generates realistic dummy data for all geographic levels
- Loads data configuration from JSON files
- Processes GeoJSON features with property mapping
- Supports filtering by state, county, and constituency

## 🎨 Customization

### Adding New Color Schemes
Edit the `colorSchemes` object in `src/utils/dataUtils.js`:

```javascript
const colorSchemes = {
    // ... existing schemes
    custom: ['#color1', '#color2', '#color3', '#color4', '#color5']
};
```

### Modifying Data Ranges
Update the `dataRanges` object in `generateDummyData()` function:

```javascript
const dataRanges = {
    population: { min: 1000000, max: 50000000 },
    // ... other data types
};
```

### Styling Changes
Modify the CSS in `src/index.css` to change the appearance:
- Colors and gradients
- Layout and spacing
- Typography
- Responsive breakpoints

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

### Deploy to Static Hosting
The built files in the `dist` folder can be deployed to:
- GitHub Pages
- Netlify
- Vercel
- Any static file hosting service

## 🔧 Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Adding New Features
1. **New Data Types**: Add to `dataRanges` in `dataUtils.js`
2. **New Color Schemes**: Add to `colorSchemes` in `dataUtils.js`
3. **New Components**: Create in `src/components/`
4. **New Utilities**: Add to `src/utils/`

## 📊 Data Sources

- **India GeoJSON**: Custom GeoJSON file with all Indian states and union territories
- **Shapefile Support**: Upload your own shapefiles for custom data
- **Dummy Data**: Realistic data generation for demonstration

## 🤝 Contributing

Feel free to contribute to this project by:
1. Reporting bugs
2. Suggesting new features
3. Improving documentation
4. Adding new color schemes or interactions
5. Enhancing the UI/UX

## 📝 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- **Apache ECharts** for the powerful mapping library
- **React Team** for the amazing framework
- **Vite** for the excellent development experience
- **D3.js** for geographic utilities

## 📞 Support

If you encounter any issues or have questions:
1. Check the browser console for error messages
2. Ensure all dependencies are installed correctly
3. Verify that the GeoJSON file is properly formatted
4. Make sure you're using a supported browser

---

**Enjoy exploring India with this interactive map! 🇮🇳**
