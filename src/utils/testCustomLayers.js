// testCustomLayers.js - Test script to verify custom layer functionality

import { debugCustomLayers, testCustomLayerLookup } from './debugUtils.js';
import { getAllCustomLayers } from './geoStorage.js';

/**
 * Run comprehensive tests on custom layers
 */
export const runCustomLayerTests = async () => {
  console.log('🧪 Running Custom Layer Tests...');
  console.log('=====================================');
  
  // Test 1: Check if any layers exist
  console.log('\n📊 Test 1: Checking storage...');
  const allLayers = await getAllCustomLayers();
  console.log(`Found ${allLayers.length} layers in storage`);
  
  if (allLayers.length === 0) {
    console.log('❌ No custom layers found!');
    console.log('You need to upload a custom layer first.');
    return {
      success: false,
      message: 'No custom layers found in storage'
    };
  }
  
  // Test 2: Display all layer information
  console.log('\n📋 Test 2: Layer details...');
  allLayers.forEach((layer, index) => {
    console.log(`\nLayer ${index + 1}:`);
    console.log(`  Name: ${layer.name}`);
    console.log(`  ID: ${layer.id}`);
    console.log(`  Scope: ${JSON.stringify(layer.scope)}`);
    console.log(`  Upload Date: ${layer.uploadDate}`);
    console.log(`  Features: ${layer.stats?.featureCount || 'unknown'}`);
  });
  
  // Test 3: Test specific lookups
  console.log('\n🔍 Test 3: Testing specific lookups...');
  
  const testCases = [
    { country: 'India', level: 'wards', target: 'Bangalore Urban' },
    { country: 'India', level: 'wards', target: 'Bengaluru Urban' },
    { country: 'India', level: 'wards', target: 'Bangalore' },
    { country: 'India', level: 'wards', target: 'Bengaluru' },
  ];
  
  for (const testCase of testCases) {
    console.log(`\nTesting: ${testCase.country}/${testCase.level}/${testCase.target}`);
    const result = await testCustomLayerLookup(testCase.country, testCase.level, testCase.target);
    console.log(`Result: ${result ? '✅ FOUND' : '❌ NOT FOUND'}`);
    
    if (result) {
      console.log(`  Found layer: ${result.name}`);
      console.log(`  Layer scope: ${JSON.stringify(result.scope)}`);
      return {
        success: true,
        message: `Found matching layer for ${testCase.target}`,
        layer: result
      };
    }
  }
  
  // Test 4: Debug layer scope structures
  console.log('\n🔬 Test 4: Analyzing scope structures...');
  const scopeTypes = new Set();
  const countries = new Set();
  const levels = new Set();
  const targets = new Set();
  
  allLayers.forEach(layer => {
    const scope = layer.scope;
    scopeTypes.add(scope.uploadType || 'unknown');
    countries.add(scope.country || 'unknown');
    levels.add(scope.level || 'unknown');
    
    if (scope.uploadType === 'local' && scope.localTarget) {
      targets.add(scope.localTarget);
    }
  });
  
  console.log('Upload types found:', Array.from(scopeTypes));
  console.log('Countries found:', Array.from(countries));
  console.log('Levels found:', Array.from(levels));
  console.log('Local targets found:', Array.from(targets));
  
  // Test 5: Suggest fixes
  console.log('\n💡 Test 5: Suggestions...');
  
  const indiaWardLayers = allLayers.filter(layer => 
    layer.scope.country === 'India' && layer.scope.level === 'wards'
  );
  
  if (indiaWardLayers.length === 0) {
    console.log('❌ No India ward layers found');
    console.log('Suggestion: Make sure your layer has:');
    console.log('  - country: "India"');
    console.log('  - level: "wards"');
    console.log('  - uploadType: "local"');
    console.log('  - localTarget: "Bangalore Urban"');
  } else {
    console.log(`✅ Found ${indiaWardLayers.length} India ward layer(s)`);
    indiaWardLayers.forEach(layer => {
      console.log(`  - ${layer.name}: localTarget="${layer.scope.localTarget}"`);
    });
    
    if (!Array.from(targets).includes('Bangalore Urban')) {
      console.log('❌ No layer with localTarget "Bangalore Urban" found');
      console.log('Available targets:', Array.from(targets));
      console.log('Suggestion: Re-upload your layer with localTarget set to "Bangalore Urban"');
    }
  }
  
  console.log('\n🏁 Tests completed!');
  return {
    success: indiaWardLayers.length > 0,
    message: indiaWardLayers.length > 0 ? 'Found India ward layers' : 'No India ward layers found',
    layers: indiaWardLayers,
    allTargets: Array.from(targets)
  };
};

// Make it available globally in development
if (process.env.NODE_ENV === 'development') {
  window.runCustomLayerTests = runCustomLayerTests;
  console.log('🧪 Test utility loaded. Run: runCustomLayerTests()');
}