import React, { useState, useEffect } from 'react';
import { analyzeProperties, validateGeoJSON } from '../../utils/geoValidation.js';
import { 
  getAvailableCountries, 
  getRegionsForCountry, 
  getTargetsForLevel 
} from '../../utils/geoDataLoader.js';
import './StreamlinedUploader.css';

const StreamlinedUploader = ({ onComplete, onCancel }) => {
  const [step, setStep] = useState(1);
  const [uploadData, setUploadData] = useState({
    file: null,
    geoJson: null,
    analysis: null,
    
    // New logical flow structure
    name: '',
    description: '',
    country: '', // 'India', 'Kenya', 'Countries'
    level: '', // Based on country: India('states','districts','wards'), Kenya('counties','constituencies','wards'), Countries('countries')
    applicationMethod: '', // 'replace-entire', 'replace-local', 'add'
    targetArea: '', // For replace-local and add operations
    
    // Property mapping (auto-detected + user confirmation)
    nameField: '',
    idField: '',
    
    // Generated scope (internal)
    scope: null
  });

  const [validation, setValidation] = useState({ valid: false, errors: [] });
  const [processing, setProcessing] = useState(false);
  const [availableTargets, setAvailableTargets] = useState([]);

  // Step 1: File Upload & Analysis
  const handleFileUpload = async (file) => {
    setProcessing(true);
    
    try {
      const text = await file.text();
      const geoJson = JSON.parse(text);
      
      // Validate and analyze the GeoJSON
      const validation = validateGeoJSON(geoJson);
      if (!validation.valid) {
        throw new Error(validation.errors.join(', '));
      }
      
      const analysis = {
        ...analyzeProperties(geoJson),
        validFeatures: geoJson.features?.length || 0
      };
      
      // Auto-detect name and ID fields
      const nameField = detectNameField(analysis.properties);
      const idField = detectIdField(analysis.properties);
      
      setUploadData(prev => ({
        ...prev,
        file,
        geoJson,
        analysis,
        name: file.name.replace(/\.(geo)?json$/i, ''),
        nameField: nameField || '',
        idField: idField || ''
      }));
      
      setStep(2);
    } catch (error) {
      setValidation({ valid: false, errors: [`Invalid GeoJSON file: ${error.message}`] });
    } finally {
      setProcessing(false);
    }
  };

  // Smart field detection
  const detectNameField = (properties) => {
    const nameFields = ['name', 'NAME', 'Name', 'district', 'DISTRICT', 'ward', 'WARD', 'county', 'COUNTY'];
    return properties.find(p => nameFields.includes(p.name))?.name;
  };

  const detectIdField = (properties) => {
    const idFields = ['id', 'ID', 'Id', 'code', 'CODE', 'Code'];
    return properties.find(p => idFields.includes(p.name))?.name;
  };


  // Load available targets when country and level change
  useEffect(() => {
    const loadTargetsForCountryAndLevel = async () => {
      if (!uploadData.country || !uploadData.level) return;
      
      const { country, level } = uploadData;
      
      try {
        // Load targets based on what level is being uploaded and for which country
        if (country === 'India') {
          if (level === 'districts') {
            // For districts, load states as potential targets for local replacement
            const states = await getRegionsForCountry('India');
            setAvailableTargets(states.map(s => ({ ...s, country: 'India' })));
          } else if (level === 'wards') {
            // For wards, load districts as potential targets
            const districts = await getTargetsForLevel('India', 'districts');
            setAvailableTargets(districts.map(d => ({ ...d, country: 'India' })));
          }
        } else if (country === 'Kenya') {
          if (level === 'constituencies') {
            // For constituencies, load counties as potential targets
            const counties = await getRegionsForCountry('Kenya');
            setAvailableTargets(counties.map(c => ({ ...c, country: 'Kenya' })));
          } else if (level === 'wards') {
            // For wards, load both counties and constituencies as potential targets
            const counties = await getRegionsForCountry('Kenya');
            const constituencies = await getTargetsForLevel('Kenya', 'constituencies');
            setAvailableTargets([
              ...counties.map(c => ({ ...c, country: 'Kenya', type: 'county' })),
              ...constituencies.map(c => ({ ...c, country: 'Kenya', type: 'constituency' }))
            ]);
          }
        }
        // For 'Countries' country selection, no targets needed since it's always global replacement
      } catch (error) {
        console.error('Error loading targets:', error);
        setAvailableTargets([]);
      }
    };
    
    loadTargetsForCountryAndLevel();
  }, [uploadData.country, uploadData.level]);


  // Generate final scope configuration
  const generateScopeConfig = () => {
    const { country, level, applicationMethod, targetArea } = uploadData;
    
    // Special case: Countries upload (always global replacement)
    if (country === 'Countries') {
      return {
        uploadType: 'replace',
        country: 'Global',
        level: 'countries',
        replaceScope: 'worldwide',
        targetCountry: null
      };
    }
    
    // Replace entire layer globally
    if (applicationMethod === 'replace-entire') {
      return {
        uploadType: 'replace',
        country: 'Global',
        level: level,
        replaceScope: 'worldwide',
        targetCountry: null
      };
    }
    
    // Replace locally within a specific area
    if (applicationMethod === 'replace-local') {
      const selectedTarget = availableTargets.find(t => t.value === targetArea);
      return {
        uploadType: 'replace',
        country: country,
        level: level,
        replaceScope: 'regional',
        targetCountry: country,
        targetRegion: selectedTarget?.label || targetArea
      };
    }
    
    // Add as local detail layer
    if (applicationMethod === 'add') {
      const selectedTarget = availableTargets.find(t => t.value === targetArea);
      return {
        uploadType: 'local',
        country: country,
        level: level,
        localTarget: selectedTarget?.label || targetArea
      };
    }
    
    return null;
  };

  // Render different steps
  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="upload-step">
            <h2>Upload Your GeoJSON</h2>
            <p>Select your custom geographic data file</p>
            
            <div className="file-upload-zone">
              <input
                type="file"
                accept=".json,.geojson"
                onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0])}
                disabled={processing}
              />
              {processing && <div>Analyzing file...</div>}
            </div>
            
            {validation.errors.length > 0 && (
              <div className="validation-errors">
                {validation.errors.map((error, i) => (
                  <div key={i} className="error">{error}</div>
                ))}
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="upload-step">
            <h2>Which Country/Region?</h2>
            <p>Which geographic area does your data cover?</p>
            
            {uploadData.analysis && (
              <div className="file-info">
                <strong>File Analysis:</strong> {uploadData.analysis.validFeatures} features detected
              </div>
            )}
            
            <div className="level-options">
              <div
                className={`level-card ${uploadData.country === 'India' ? 'selected' : ''}`}
                onClick={() => setUploadData(prev => ({ 
                  ...prev, 
                  country: 'India',
                  level: '', // Reset level when country changes
                  applicationMethod: '',
                  targetArea: ''
                }))}
              >
                <h4>India</h4>
                <div className="examples">
                  Upload data for Indian states, districts, or wards
                </div>
              </div>
              
              <div
                className={`level-card ${uploadData.country === 'Kenya' ? 'selected' : ''}`}
                onClick={() => setUploadData(prev => ({ 
                  ...prev, 
                  country: 'Kenya',
                  level: '', // Reset level when country changes
                  applicationMethod: '',
                  targetArea: ''
                }))}
              >
                <h4>Kenya</h4>
                <div className="examples">
                  Upload data for Kenyan counties, constituencies, or wards
                </div>
              </div>
              
              <div
                className={`level-card ${uploadData.country === 'Countries' ? 'selected' : ''}`}
                onClick={() => setUploadData(prev => ({ 
                  ...prev, 
                  country: 'Countries',
                  level: 'countries', // Set level automatically for countries
                  applicationMethod: 'replace-entire', // Always replace entire for countries
                  targetArea: ''
                }))}
              >
                <h4>World Countries</h4>
                <div className="examples">
                  Upload custom world countries boundaries
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        // Skip for Countries since level is already set
        if (uploadData.country === 'Countries') {
          setStep(6); // Skip to field mapping since Countries always replace entire
          return null;
        }
        
        const getLevelOptions = () => {
          if (uploadData.country === 'India') {
            return [
              { value: 'states', label: 'States', description: 'Indian state boundaries' },
              { value: 'districts', label: 'Districts', description: 'District boundaries within states' },
              { value: 'wards', label: 'Wards', description: 'Ward boundaries within districts' }
            ];
          } else if (uploadData.country === 'Kenya') {
            return [
              { value: 'counties', label: 'Counties', description: 'Kenyan county boundaries' },
              { value: 'constituencies', label: 'Constituencies', description: 'Parliamentary constituencies' },
              { value: 'wards', label: 'Wards', description: 'Electoral wards' }
            ];
          }
          return [];
        };
        
        return (
          <div className="upload-step">
            <h2>What are you uploading?</h2>
            <p>What type of geographic features does your {uploadData.country} data contain?</p>
            
            <div className="level-options">
              {getLevelOptions().map(option => (
                <div
                  key={option.value}
                  className={`level-card ${uploadData.level === option.value ? 'selected' : ''}`}
                  onClick={() => setUploadData(prev => ({ 
                    ...prev, 
                    level: option.value,
                    applicationMethod: '', // Reset when level changes
                    targetArea: ''
                  }))}
                >
                  <h4>{option.label}</h4>
                  <div className="examples">
                    {option.description}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 4:
        const getApplicationOptions = () => {
          const options = [
            {
              value: 'replace-entire',
              label: 'Replace Entire Layer',
              description: `Replace all ${uploadData.level} globally in the application`
            },
            {
              value: 'replace-local',
              label: 'Replace Locally',
              description: `Replace ${uploadData.level} within a specific area only`
            }
          ];
          
          // Only allow "Add" for wards
          if (uploadData.level === 'wards') {
            options.push({
              value: 'add',
              label: 'Add Detail Layer',
              description: 'Add ward details to existing districts/constituencies'
            });
          }
          
          return options;
        };
        
        return (
          <div className="upload-step">
            <h2>How to Apply?</h2>
            <p>How do you want to use your {uploadData.level} data?</p>
            
            <div className="scope-options">
              {getApplicationOptions().map(option => (
                <div
                  key={option.value}
                  className={`scope-card ${uploadData.applicationMethod === option.value ? 'selected' : ''}`}
                  onClick={() => setUploadData(prev => ({ 
                    ...prev, 
                    applicationMethod: option.value,
                    targetArea: '' // Reset target when method changes
                  }))}
                >
                  <h4>{option.label}</h4>
                  <p>{option.description}</p>
                </div>
              ))}
            </div>
          </div>
        );

      case 5:
        // Target Area Selection (only if needed for replace-local or add)
        if (['replace-local', 'add'].includes(uploadData.applicationMethod)) {
          const isLocal = uploadData.applicationMethod === 'replace-local';
          const title = isLocal ? 'Select Area to Replace' : 'Select Target Area';
          
          let description = '';
          if (isLocal) {
            if (uploadData.level === 'districts') {
              description = `Which state should have its ${uploadData.level} replaced?`;
            } else if (uploadData.level === 'wards') {
              description = `Which district/constituency should have its ${uploadData.level} replaced?`;
            } else if (uploadData.level === 'constituencies') {
              description = `Which county should have its ${uploadData.level} replaced?`;
            }
          } else { // add
            description = `Which area should get the new ${uploadData.level} detail?`;
          }
          
          return (
            <div className="upload-step">
              <h2>{title}</h2>
              <p>{description}</p>
              
              <div className="target-selection">
                <select
                  value={uploadData.targetArea}
                  onChange={(e) => setUploadData(prev => ({ ...prev, targetArea: e.target.value }))}
                  className="target-select"
                >
                  <option value="">Select target area...</option>
                  {availableTargets.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label} {option.type && `(${option.type})`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          );
        }
        // If no target area needed, go to field mapping

      case 6:
        return (
          <div className="upload-step">
            <h2>Field Mapping</h2>
            <p>Confirm which fields contain the names and IDs</p>
            
            <div className="field-mapping">
              <div className="field-group">
                <label>Name Field (Required)</label>
                <select
                  value={uploadData.nameField}
                  onChange={(e) => setUploadData(prev => ({ ...prev, nameField: e.target.value }))}
                >
                  <option value="">Select field...</option>
                  {uploadData.analysis?.properties.map(prop => (
                    <option key={prop.name} value={prop.name}>
                      {prop.name} ({prop.type}){prop.samples?.[0] ? ` - Sample: ${prop.samples[0]}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="field-group">
                <label>ID Field (Optional)</label>
                <select
                  value={uploadData.idField}
                  onChange={(e) => setUploadData(prev => ({ ...prev, idField: e.target.value }))}
                >
                  <option value="">Select field...</option>
                  {uploadData.analysis?.properties.map(prop => (
                    <option key={prop.name} value={prop.name}>
                      {prop.name} ({prop.type}){prop.samples?.[0] ? ` - Sample: ${prop.samples[0]}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        );

      case 7:
        const scope = generateScopeConfig();
        return (
          <div className="upload-step">
            <h2>Review & Upload</h2>
            <p>Confirm your configuration before uploading</p>
            
            <div className="config-summary">
              <div className="summary-item">
                <strong>File:</strong> {uploadData.file?.name}
              </div>
              <div className="summary-item">
                <strong>Country:</strong> {uploadData.country}
              </div>
              <div className="summary-item">
                <strong>Level:</strong> {uploadData.level}
              </div>
              <div className="summary-item">
                <strong>Application:</strong> {uploadData.applicationMethod}
              </div>
              {uploadData.targetArea && (
                <div className="summary-item">
                  <strong>Target Area:</strong> {availableTargets.find(t => t.value === uploadData.targetArea)?.label || uploadData.targetArea}
                </div>
              )}
              <div className="summary-item">
                <strong>Name Field:</strong> {uploadData.nameField}
              </div>
              <div className="summary-item">
                <strong>Features:</strong> {uploadData.analysis?.validFeatures}
              </div>
            </div>
            
            <div className="final-actions">
              <button
                onClick={() => onComplete({
                  file: uploadData.file,
                  geoJson: uploadData.geoJson,
                  analysis: uploadData.analysis,
                  propertyMapping: {
                    name: uploadData.nameField,
                    id: uploadData.idField
                  },
                  scope: scope,
                  metadata: {
                    name: uploadData.name,
                    description: uploadData.description
                  }
                })}
                disabled={!uploadData.nameField || processing}
                className="primary-button"
              >
                Upload Layer
              </button>
              
              <button onClick={onCancel} className="secondary-button">
                Cancel
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Helper function to determine next step
  const getNextStep = (currentStep) => {
    if (currentStep === 2) {
      // Countries skip level selection and go directly to field mapping
      return uploadData.country === 'Countries' ? 6 : 3;
    }
    if (currentStep === 3) {
      return 4; // Level → Application method
    }
    if (currentStep === 4) {
      // Check if we need target area selection
      const needsTarget = ['replace-local', 'add'].includes(uploadData.applicationMethod);
      return needsTarget ? 5 : 6; // Skip to field mapping if no target needed
    }
    if (currentStep === 5) {
      return 6; // Target area → Field mapping
    }
    if (currentStep === 6) {
      return 7; // Field mapping → Review
    }
    return currentStep + 1;
  };

  // Helper function to check if we can progress from current step
  const canProgressFromStep = (currentStep) => {
    switch (currentStep) {
      case 2: return uploadData.country;
      case 3: return uploadData.level;
      case 4: return uploadData.applicationMethod;
      case 5: 
        const needsTarget = ['replace-local', 'add'].includes(uploadData.applicationMethod);
        return !needsTarget || uploadData.targetArea;
      case 6: return uploadData.nameField;
      default: return false;
    }
  };

  return (
    <div className="streamlined-uploader">
      <div className="progress-bar">
        {[1, 2, 3, 4, 5].map(stepNum => {
          // Adjust step numbers for dynamic flow
          const actualSteps = ['Upload', 'Level', 'Scope', 'Target', 'Mapping', 'Review'];
          const needsTarget = ['replace-region', 'add-details'].includes(uploadData.howReplace);
          const displaySteps = needsTarget ? actualSteps : actualSteps.filter((_, i) => i !== 3);
          
          if (!needsTarget && stepNum > 3) return null;
          
          const isActive = needsTarget ? step === stepNum : (stepNum <= 3 ? step === stepNum : step === stepNum + 1);
          const isCompleted = needsTarget ? step > stepNum : (stepNum <= 3 ? step > stepNum : step > stepNum + 1);
          
          return (
            <div
              key={stepNum}
              className={`progress-step ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}
            >
              {stepNum}
            </div>
          );
        })}
      </div>
      
      {renderStep()}
      
      {step > 1 && (
        <div className="navigation">
          <button onClick={() => {
            if (step === 4) {
              setStep(3);
            } else if (step === 5 && uploadData.whereScope) {
              setStep(4);
            } else if (step === 6 && uploadData.whereScope) {
              // Check if we came from step 5 or 4
              const needsTarget = ['replace-region', 'add-details'].includes(uploadData.howReplace);
              setStep(needsTarget ? 5 : 4);
            } else {
              setStep(step - 1);
            }
          }} className="secondary-button">
            ← Back
          </button>
          {(() => {
            const maxStep = 7;
            const canProg = canProgressFromStep(step);
            
            if (step < maxStep && canProg) {
              const nextStep = getNextStep(step);
              return (
                <button onClick={() => setStep(nextStep)} className="primary-button">
                  Next →
                </button>
              );
            }
            return null;
          })()}
        </div>
      )}
    </div>
  );
};

export default StreamlinedUploader;