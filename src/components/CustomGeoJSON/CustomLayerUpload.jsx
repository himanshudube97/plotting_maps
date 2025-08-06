import React, { useState, useCallback } from 'react';
import { validateFile, validateGeoJSON, analyzeProperties } from '../../utils/geoValidation.js';
import './CustomLayerUpload.css';

const CustomLayerUpload = ({ onFileAnalyzed, onError }) => {
  const [dragActive, setDragActive] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);

  // Handle drag events
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  // Handle drop
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  // Handle file input change
  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  // Process uploaded file
  const handleFile = async (file) => {
    setProcessing(true);
    setUploadStatus({ type: 'info', message: 'Analyzing file...' });

    try {
      // Basic file validation
      const fileValidation = validateFile(file);
      if (!fileValidation.valid) {
        throw new Error(fileValidation.errors.join(', '));
      }

      // Read file content
      const fileContent = await readFileAsText(file);
      
      setUploadStatus({ type: 'info', message: 'Parsing GeoJSON...' });
      
      // Parse JSON
      let geoJson;
      try {
        geoJson = JSON.parse(fileContent);
      } catch (error) {
        throw new Error('Invalid JSON format');
      }

      // Validate GeoJSON structure
      const geoValidation = validateGeoJSON(geoJson);
      
      setUploadStatus({ type: 'info', message: 'Analyzing properties...' });
      
      // Analyze properties for mapping suggestions
      const propertyAnalysis = analyzeProperties(geoJson);

      // Compile results
      const analysisResult = {
        file,
        geoJson,
        validation: {
          file: fileValidation,
          geoJson: geoValidation
        },
        analysis: propertyAnalysis,
        timestamp: new Date().toISOString()
      };

      setUploadStatus({ 
        type: 'success', 
        message: `Successfully analyzed ${geoValidation.info.validFeatures} features` 
      });

      // Pass result to parent
      onFileAnalyzed(analysisResult);

    } catch (error) {
      const errorMessage = error.message || 'Failed to process file';
      setUploadStatus({ type: 'error', message: errorMessage });
      onError(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  // Read file as text
  const readFileAsText = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  return (
    <div className="custom-layer-upload">
      <div 
        className={`upload-area ${dragActive ? 'drag-active' : ''} ${processing ? 'processing' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {processing ? (
          <div className="upload-processing">
            <div className="upload-spinner"></div>
            <p>Processing file...</p>
            {uploadStatus && (
              <div className={`upload-status ${uploadStatus.type}`}>
                {uploadStatus.message}
              </div>
            )}
          </div>
        ) : (
          <div className="upload-content">
            <div className="upload-icon">📁</div>
            <h3>Upload Custom GeoJSON</h3>
            <p>Drag and drop your GeoJSON file here, or click to browse</p>
            
            <input
              type="file"
              accept=".geojson,.json"
              onChange={handleFileInput}
              className="file-input"
              id="geojson-file-input"
            />
            <label htmlFor="geojson-file-input" className="upload-button">
              Choose File
            </label>
            
            <div className="upload-hints">
              <h4>📋 Requirements:</h4>
              <ul>
                <li>Valid GeoJSON FeatureCollection format</li>
                <li>Maximum file size: 10MB</li>
                <li>Must contain geographic features with properties</li>
                <li>Supported geometry types: Polygon, MultiPolygon, Point, etc.</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {uploadStatus && !processing && (
        <div className={`upload-result ${uploadStatus.type}`}>
          <div className="result-icon">
            {uploadStatus.type === 'success' ? '✅' : 
             uploadStatus.type === 'error' ? '❌' : 'ℹ️'}
          </div>
          <div className="result-message">{uploadStatus.message}</div>
        </div>
      )}
    </div>
  );
};

export default CustomLayerUpload;