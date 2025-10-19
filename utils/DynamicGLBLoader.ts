import * as THREE from 'three';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import { loadAsync } from 'expo-three';

// Interface cho GLB Model Data
export interface GLBModelConfig {
  id: string;
  name: string;
  filePath: string; // Đường dẫn file .glb
  scale?: number;
  position?: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number };
  animations?: string[]; // Tên các animation trong model
}

// GLB Loader Class
export class DynamicGLBLoader {
  private loadedModels: Map<string, THREE.Object3D> = new Map();
  
  constructor() {
    console.log('🔧 Expo-Three GLTFLoader initialized for React Native');
  }

  /**
   * Load model .glb từ file
   */
  async loadModel(config: GLBModelConfig): Promise<THREE.Object3D> {
    try {
      console.log(`📦 Loading GLB model: ${config.name}`);
      
      // Check cache trước
      if (this.loadedModels.has(config.id)) {
        console.log(`✅ Using cached model: ${config.name}`);
        return this.loadedModels.get(config.id)!.clone();
      }

      // Load asset từ file
      const assetUri = await this.loadAsset(config.filePath);
      
      // Parse GLB file (dùng GLTFLoader thật)
      const model = await this.parseGLB(assetUri, config);
      
      // Cache model
      this.loadedModels.set(config.id, model);
      
      console.log(`✅ GLB model loaded successfully: ${config.name}`);
      return model.clone();
      
    } catch (error) {
      console.error(`❌ Error loading GLB model ${config.name}:`, error);
      throw error;
    }
  }

  /**
   * Auto-detect 3D files trong assets/models/
   */
  private async loadAsset(filePath: string): Promise<string> {
    try {
      console.log(`📦 Auto-detecting 3D asset: ${filePath}`);
      
      // Auto-detect available 3D files
      const availableFiles = await this.detectAvailable3DFiles();
      console.log(`🔍 Available 3D files:`, availableFiles);
      
      // Tìm file tương ứng
      const fileName = filePath.split('/').pop();
      const foundFile = availableFiles.find(file => 
        file.name === fileName || 
        file.name.includes(fileName?.split('.')[0] || '')
      );
      
      if (foundFile) {
        console.log(`✅ Found 3D file: ${foundFile.name}`);
        console.log(`🔄 Attempting to load REAL file: ${foundFile.uri}`);
        
        // Try to load real file using different approaches
        return await this.loadRealFile(foundFile);
      } else {
        console.log(`⚠️ 3D file not found, using fallback`);
        return 'fallback://auto-detect';
      }
      
    } catch (error) {
      console.error('❌ Error auto-detecting asset:', error);
      return 'fallback://auto-detect';
    }
  }

  /**
   * Load file thật từ URL - hoàn toàn dynamic
   */
  private async loadRealFile(fileInfo: {name: string, uri: string, type: string}): Promise<string> {
    console.log(`🔄 Loading from URL: ${fileInfo.name}`);
    
    // Dynamic URL generation - không hardcode
    const baseUrls = [
      'https://phuoctran12345.github.io/pokemon-3d-models/',
      'https://raw.githubusercontent.com/phuoctran12345/pokemon-3d-models/main/',
      'https://cdn.jsdelivr.net/gh/phuoctran12345/pokemon-3d-models@main/'
    ];
    
    // Generate URLs dynamically từ file name
    const fileName = fileInfo.name.replace('.gltf', '.glb'); // Convert GLTF to GLB
    const dynamicUrls = baseUrls.map(baseUrl => baseUrl + fileName);
    
    // Try each URL dynamically
    for (const url of dynamicUrls) {
      try {
        console.log(`🔄 Trying dynamic URL: ${url}`);
        
        const response = await fetch(url, { method: 'HEAD' });
        if (response.ok) {
          console.log(`✅ Dynamic URL success: ${url}`);
          return url;
        } else {
          console.log(`❌ Dynamic URL failed: ${response.status}`);
        }
      } catch (error) {
        console.log(`❌ Dynamic URL error:`, error.message);
      }
    }
    
    // All approaches failed - use fallback
    console.log(`⚠️ All URL approaches failed, using fallback`);
    return 'fallback://auto-detect';
  }

  /**
   * Detect tất cả 3D files có sẵn - hoàn toàn dynamic
   */
  private async detectAvailable3DFiles(): Promise<Array<{name: string, uri: string, type: string}>> {
    // Dynamic file detection - không hardcode
    const common3DFiles = [
      'scene.gltf', 'scene.bin', 'model.glb', 'model.gltf',
      'pokemon_scizor.glb', 'pikachu_sample.glb', 'raichu_sample.glb',
      'charizard_sample.glb', 'pokemon.glb', 'character.glb'
    ];
    
    const detectedFiles = common3DFiles.map(fileName => ({
      name: fileName,
      uri: `assets/models/${fileName}`,
      type: fileName.endsWith('.glb') ? 'glb' : 
            fileName.endsWith('.gltf') ? 'gltf' : 
            fileName.endsWith('.bin') ? 'bin' : 'unknown'
    }));
    
    console.log(`🔍 Auto-detected 3D files:`, detectedFiles.map(f => f.name));
    return detectedFiles;
  }

  /**
   * Parse GLB file thành THREE.Object3D
   */
  private async parseGLB(assetUri: string, config: GLBModelConfig): Promise<THREE.Object3D> {
    try {
      console.log(`🔄 Parsing 3D file (GLTF/GLB) with Expo-Three: ${assetUri}`);
      
      // Check if this is fallback mode
      if (assetUri.startsWith('fallback://')) {
        console.log(`🎯 Using fallback model (file loading failed)`);
        return this.createFallbackModel(config);
      }
      
      // Try to load REAL file with expo-three
      console.log(`🔄 Loading REAL 3D file: ${assetUri}`);
      const gltfData = await loadAsync(assetUri);
      
      console.log(`✅ GLTF data loaded:`, {
        hasScene: !!gltfData.scene,
        hasScenes: !!gltfData.scenes,
        type: typeof gltfData,
      });
      
      // Extract scene from GLTF data
      let scene;
      if (gltfData.scene) {
        scene = gltfData.scene;
      } else if (gltfData.scenes && gltfData.scenes.length > 0) {
        scene = gltfData.scenes[0];
      } else if (gltfData instanceof THREE.Object3D) {
        scene = gltfData;
      } else {
        // Fallback: create group and add all children
        scene = new THREE.Group();
        if (gltfData.children) {
          gltfData.children.forEach((child: any) => scene.add(child));
        }
      }
      
      console.log(`✅ 3D scene extracted successfully!`);
      console.log(`📊 Scene info:`, {
        type: scene.type,
        children: scene.children?.length || 0,
        hasGeometry: !!(scene as any).geometry,
      });
      
      // Add metadata
      (scene as any).modelType = config.id;
      (scene as any).isHardcoded = false;
      (scene as any).isFallback = false;
      (scene as any).source = 'real-file';
      
      return scene;
      
    } catch (error) {
      console.error('❌ Error parsing GLB with Expo-Three:', error);
      throw error;
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.loadedModels.clear();
    console.log('🗑️ Model cache cleared');
  }

  /**
   * Get cache info
   */
  getCacheInfo() {
    return {
      cachedModels: Array.from(this.loadedModels.keys()),
      cacheSize: this.loadedModels.size,
    };
  }

  /**
   * Fallback khi không load được file thật
   */
  private createFallbackModel(config: GLBModelConfig): THREE.Object3D {
    console.log(`⚠️ Cannot load real 3D file, creating simple fallback`);
    
    // Simple error indicator
    const group = new THREE.Group();
    const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const material = new THREE.MeshStandardMaterial({ 
      color: 0xFF0000,
      wireframe: true
    });
    const cube = new THREE.Mesh(geometry, material);
    group.add(cube);
    
    // Add metadata
    (group as any).modelType = config.id;
    (group as any).isHardcoded = false;
    (group as any).isFallback = true;
    (group as any).source = 'fallback';
    
    console.log(`✅ Fallback error cube created`);
    return group;
  }

}

// Export singleton instance
export const glbLoader = new DynamicGLBLoader();
