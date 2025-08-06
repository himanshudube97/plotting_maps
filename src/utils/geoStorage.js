// geoStorage.js - IndexedDB utilities for custom GeoJSON storage

const DB_NAME = 'CustomGeoJSONDB';
const DB_VERSION = 1;
const STORE_LAYERS = 'customLayers';
const STORE_METADATA = 'layerMetadata';

/**
 * Initialize IndexedDB for custom GeoJSON storage
 */
export const initGeoStorage = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => {
      console.error('Failed to open IndexedDB');
      reject(request.error);
    };
    
    request.onsuccess = () => {
      resolve(request.result);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Store for GeoJSON file content
      if (!db.objectStoreNames.contains(STORE_LAYERS)) {
        const layerStore = db.createObjectStore(STORE_LAYERS, { keyPath: 'id' });
        layerStore.createIndex('scope', 'scope', { unique: false });
        layerStore.createIndex('level', 'level', { unique: false });
      }
      
      // Store for layer metadata
      if (!db.objectStoreNames.contains(STORE_METADATA)) {
        const metaStore = db.createObjectStore(STORE_METADATA, { keyPath: 'id' });
        metaStore.createIndex('uploadDate', 'uploadDate', { unique: false });
        metaStore.createIndex('scope', 'scope', { unique: false });
      }
    };
  });
};

/**
 * Store a custom GeoJSON layer
 */
export const storeCustomLayer = async (layerData) => {
  const db = await initGeoStorage();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_LAYERS, STORE_METADATA], 'readwrite');
    
    transaction.onerror = () => {
      console.error('Storage transaction failed');
      reject(transaction.error);
    };
    
    transaction.oncomplete = () => {
      console.log('Custom layer stored successfully');
      resolve(layerData.id);
    };
    
    // Store the GeoJSON content
    const layerStore = transaction.objectStore(STORE_LAYERS);
    layerStore.add({
      id: layerData.id,
      geoJson: layerData.geoJson,
      processedFeatures: layerData.processedFeatures,
      scope: layerData.metadata.scope,
      level: layerData.metadata.hierarchy.level
    });
    
    // Store the metadata
    const metaStore = transaction.objectStore(STORE_METADATA);
    metaStore.add(layerData.metadata);
  });
};

/**
 * Retrieve a custom layer by ID
 */
export const getCustomLayer = async (layerId) => {
  const db = await initGeoStorage();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_LAYERS, STORE_METADATA], 'readonly');
    const layerStore = transaction.objectStore(STORE_LAYERS);
    const metaStore = transaction.objectStore(STORE_METADATA);
    
    const layerRequest = layerStore.get(layerId);
    const metaRequest = metaStore.get(layerId);
    
    Promise.all([
      new Promise((res, rej) => {
        layerRequest.onsuccess = () => res(layerRequest.result);
        layerRequest.onerror = () => rej(layerRequest.error);
      }),
      new Promise((res, rej) => {
        metaRequest.onsuccess = () => res(metaRequest.result);
        metaRequest.onerror = () => rej(metaRequest.error);
      })
    ]).then(([layerData, metadata]) => {
      if (layerData && metadata) {
        resolve({ ...layerData, metadata });
      } else {
        resolve(null);
      }
    }).catch(reject);
  });
};

/**
 * Get all custom layers metadata
 */
export const getAllCustomLayers = async () => {
  const db = await initGeoStorage();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_METADATA], 'readonly');
    const store = transaction.objectStore(STORE_METADATA);
    const request = store.getAll();
    
    request.onsuccess = () => {
      resolve(request.result || []);
    };
    
    request.onerror = () => {
      console.error('Failed to retrieve custom layers');
      reject(request.error);
    };
  });
};

/**
 * Get custom layers by scope
 */
export const getCustomLayersByScope = async (scope) => {
  const db = await initGeoStorage();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_LAYERS], 'readonly');
    const store = transaction.objectStore(STORE_LAYERS);
    const index = store.index('scope');
    const request = index.getAll(scope);
    
    request.onsuccess = () => {
      resolve(request.result || []);
    };
    
    request.onerror = () => {
      console.error('Failed to retrieve layers by scope');
      reject(request.error);
    };
  });
};

/**
 * Delete a custom layer
 */
export const deleteCustomLayer = async (layerId) => {
  const db = await initGeoStorage();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_LAYERS, STORE_METADATA], 'readwrite');
    
    transaction.oncomplete = () => {
      console.log('Custom layer deleted successfully');
      resolve();
    };
    
    transaction.onerror = () => {
      console.error('Failed to delete custom layer');
      reject(transaction.error);
    };
    
    // Delete from both stores
    const layerStore = transaction.objectStore(STORE_LAYERS);
    const metaStore = transaction.objectStore(STORE_METADATA);
    
    layerStore.delete(layerId);
    metaStore.delete(layerId);
  });
};

/**
 * Update custom layer metadata
 */
export const updateCustomLayerMetadata = async (layerId, updates) => {
  const db = await initGeoStorage();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_METADATA], 'readwrite');
    const store = transaction.objectStore(STORE_METADATA);
    
    // First get the existing metadata
    const getRequest = store.get(layerId);
    
    getRequest.onsuccess = () => {
      const existingData = getRequest.result;
      if (!existingData) {
        reject(new Error('Layer not found'));
        return;
      }
      
      // Merge updates
      const updatedData = { ...existingData, ...updates };
      
      // Update the record
      const putRequest = store.put(updatedData);
      
      putRequest.onsuccess = () => {
        resolve(updatedData);
      };
      
      putRequest.onerror = () => {
        reject(putRequest.error);
      };
    };
    
    getRequest.onerror = () => {
      reject(getRequest.error);
    };
  });
};

/**
 * Get storage usage statistics
 */
export const getStorageStats = async () => {
  try {
    const layers = await getAllCustomLayers();
    
    let totalSize = 0;
    let totalFeatures = 0;
    
    for (const layer of layers) {
      totalSize += layer.stats?.fileSize || 0;
      totalFeatures += layer.stats?.featureCount || 0;
    }
    
    return {
      layerCount: layers.length,
      totalSize,
      totalFeatures,
      layers: layers.map(l => ({
        id: l.id,
        name: l.name,
        size: l.stats?.fileSize || 0,
        features: l.stats?.featureCount || 0
      }))
    };
  } catch (error) {
    console.error('Failed to get storage stats:', error);
    return {
      layerCount: 0,
      totalSize: 0,
      totalFeatures: 0,
      layers: []
    };
  }
};

/**
 * Clear all custom layers (for testing/reset)
 */
export const clearAllCustomLayers = async () => {
  const db = await initGeoStorage();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_LAYERS, STORE_METADATA], 'readwrite');
    
    transaction.oncomplete = () => {
      console.log('All custom layers cleared');
      resolve();
    };
    
    transaction.onerror = () => {
      console.error('Failed to clear custom layers');
      reject(transaction.error);
    };
    
    const layerStore = transaction.objectStore(STORE_LAYERS);
    const metaStore = transaction.objectStore(STORE_METADATA);
    
    layerStore.clear();
    metaStore.clear();
  });
};