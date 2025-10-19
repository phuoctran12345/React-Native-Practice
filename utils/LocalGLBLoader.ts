import * as THREE from 'three';
import { Asset } from 'expo-asset';
import { loadAsync } from 'expo-three';

// Interface cho Local GLB Model Data
export interface LocalGLBModelConfig {
  id: string;
  name: string;
  filePath: string; // Đường dẫn file .glb trong assets
  scale?: number;
  position?: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number };
  animations?: string[];
}

// Local GLB Loader Class - Load trực tiếp từ assets
export class LocalGLBLoader {
  private loadedModels: Map<string, THREE.Object3D> = new Map();
  
  constructor() {
    console.log('🏠 Local GLB Loader initialized - Load from assets only');
  }

  /**
   * Load model .glb từ assets local
   */
  async loadModel(config: LocalGLBModelConfig): Promise<THREE.Object3D> {
    try {
      console.log(`📦 Loading LOCAL GLB model: ${config.name}`);
      console.log(`📁 File path: ${config.filePath}`);
      
      // Check cache trước
      if (this.loadedModels.has(config.id)) {
        console.log(`✅ Using cached LOCAL model: ${config.name}`);
        return this.loadedModels.get(config.id)!.clone();
      }

      // Load asset từ file local
      const assetUri = await this.loadLocalAsset(config.filePath);
      
      // Parse GLB file
      const model = await this.parseGLB(assetUri, config);
      
      // Cache model
      this.loadedModels.set(config.id, model);
      
      console.log(`✅ LOCAL GLB model loaded successfully: ${config.name}`);
      return model.clone();
      
    } catch (error) {
      console.error(`❌ Error loading LOCAL GLB model ${config.name}:`, error);
      throw error;
    }
  }

  /**
   * Load asset từ file local trong assets
   */
  private async loadLocalAsset(filePath: string): Promise<string> {
    try {
      console.log(`📦 Loading LOCAL asset: ${filePath}`);
      
      // Sử dụng Asset.fromURI với đường dẫn bundle
      let asset;
      
      // Tạo đường dẫn bundle
      const bundlePath = `file:///android_asset/${filePath}`;
      console.log(`🔄 Creating asset from bundle path: ${bundlePath}`);
      
      // Tạo asset từ bundle path
      asset = new Asset({
        name: filePath.split('/').pop() || 'model',
        type: filePath.endsWith('.glb') ? 'glb' : 'gltf',
        uri: bundlePath,
      });
      
      // Download asset
      await asset.downloadAsync();
      
      console.log(`✅ LOCAL asset loaded: ${asset.localUri}`);
      return asset.localUri!;
      
    } catch (error) {
      console.error('❌ Error loading LOCAL asset:', error);
      throw error;
    }
  }

  /**
   * Parse GLB file thành THREE.Object3D
   */
  private async parseGLB(assetUri: string, config: LocalGLBModelConfig): Promise<THREE.Object3D> {
    try {
      console.log(`🔄 Parsing LOCAL GLB file: ${assetUri}`);
      
      // Load GLB file với expo-three
      const gltfData = await loadAsync(assetUri);
      
      console.log(`✅ LOCAL GLB data loaded:`, {
        hasScene: !!gltfData.scene,
        hasScenes: !!gltfData.scenes,
        type: typeof gltfData,
      });
      
      // Extract scene từ GLTF data
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
      
      console.log(`✅ LOCAL GLB scene extracted successfully!`);
      console.log(`📊 Scene info:`, {
        type: scene.type,
        children: scene.children?.length || 0,
        hasGeometry: !!(scene as any).geometry,
      });
      
      // Add metadata
      (scene as any).modelType = config.id;
      (scene as any).isHardcoded = false;
      (scene as any).isFallback = false;
      (scene as any).source = 'local-asset';
      (scene as any).fileName = config.filePath;
      
      return scene;
      
    } catch (error) {
      console.error('❌ Error parsing LOCAL GLB file:', error);
      throw error;
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.loadedModels.clear();
    console.log('🗑️ LOCAL model cache cleared');
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
}

// Export singleton instance
export const localGLBLoader = new LocalGLBLoader();
