# 🇮🇳 Interactive India Map - React Edition

A modern, interactive map of India built with React, ECharts, and GeoJSON data. This application provides a beautiful and responsive interface for exploring India's states and territories with drill-down capabilities.

## ✨ Features

- **Interactive Map**: Click on any state to view detailed information
- **Multiple Data Types**: Visualize population, GDP, literacy rate, area, and population density
- **Color Schemes**: Choose from 5 different color palettes (Viridis, Plasma, Inferno, Magma, Cividis)
- **Zoom Controls**: Adjust zoom level with slider or mouse wheel
- **File Upload**: Upload custom shapefiles (.shp, .dbf, .shx) for custom data
- **Responsive Design**: Works perfectly on desktop and mobile devices
- **State Information Panel**: Real-time display of selected state details
- **Breadcrumb Navigation**: Navigate between different map levels
- **Modern UI**: Beautiful gradient backgrounds and smooth animations

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
- **Click** on any state to view its information
- **Scroll** to zoom in/out
- **Drag** to pan around the map
- **Use the zoom slider** to adjust zoom level

### Controls Panel
- **Upload Shapefile**: Upload your own .shp, .dbf, and .shx files
- **Data Type**: Choose what data to visualize (Population, GDP, Literacy, Area, Density)
- **Color Scheme**: Select from different color palettes
- **Zoom Level**: Adjust the map zoom with the slider
- **Load Default**: Load the default India map
- **Reset View**: Reset to the default view

### Data Visualization
The application generates realistic dummy data for demonstration:
- **Population**: 1M - 50M people
- **GDP**: ₹1B - ₹50B
- **Literacy Rate**: 60% - 95%
- **Area**: 1,000 - 50,000 km²
- **Population Density**: 50 - 2,000 people/km²

## 📁 Project Structure

```
geomap/
├── src/
│   ├── components/
│   │   ├── Map.jsx           # Main map component with ECharts
│   │   ├── Controls.jsx      # File upload and configuration controls
│   │   ├── Breadcrumb.jsx    # Navigation breadcrumbs
│   │   └── InfoPanel.jsx     # Region information display
│   ├── utils/
│   │   └── dataUtils.js      # Data processing utilities
│   ├── App.jsx               # Main application component
│   ├── main.jsx              # React entry point
│   ├── index.css             # Global styles
│   └── india.geojson         # India GeoJSON data
├── index.html                # HTML template
├── package.json              # Dependencies and scripts
├── vite.config.js            # Vite configuration
└── README.md                 # This file
```

## 🛠️ Technical Details

### Technologies Used
- **React 18**: Modern React with hooks and functional components
- **ECharts 5.4.3**: Powerful charting library for map visualization
- **Vite**: Fast build tool and development server
- **Shapefile.js**: Shapefile to GeoJSON conversion
- **D3-geo & D3-array**: Geographic and data processing utilities

### Key Features Implementation

#### Map Rendering
- Uses ECharts `registerMap()` API to register GeoJSON data
- Implements choropleth visualization with custom color scales
- Handles click events for region selection
- Supports zoom, pan, and hover interactions

#### Data Processing
- Converts shapefiles to GeoJSON format
- Generates realistic dummy data for visualization
- Validates GeoJSON structure
- Formats values for display (e.g., "1.5M" for population)

#### File Upload
- Supports multiple file upload (.shp, .dbf, .shx)
- Groups files by base name
- Validates complete shapefile sets
- Converts to GeoJSON for visualization

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
