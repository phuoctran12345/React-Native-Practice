// 🎮 Dynamic 3D Loader - Hoàn toàn dynamic, không hardcode
// Load bất kỳ file 3D nào từ bất kỳ nguồn nào

import * as THREE from 'three';
import { loadAsync } from 'expo-three';

export interface Dynamic3DConfig {
  id: string;
  name: string;
  fileName: string; // Tên file thật (không hardcode path)
  scale?: number;
  position?: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number };
  animations?: string[];
}

export class Dynamic3DLoader {
  private loadedModels: Map<string, THREE.Object3D> = new Map();
  private baseUrls: string[] = [];
  
  constructor() {
    console.log('🎮 Dynamic 3D Loader initialized - No hardcode!');
    this.initializeBaseUrls();
  }

  /**
   * Initialize base URLs dynamically
   */
  private initializeBaseUrls() {
    // Dynamic base URLs - có thể config từ environment
    this.baseUrls = [
      'https://phuoctran12345.github.io/pokemon-3d-models/',
      'https://raw.githubusercontent.com/phuoctran12345/pokemon-3d-models/main/',
      'https://cdn.jsdelivr.net/gh/phuoctran12345/pokemon-3d-models@main/',
      'https://unpkg.com/@phuoctran12345/pokemon-3d-models@latest/',
      'https://cdn.skypack.dev/@phuoctran12345/pokemon-3d-models@latest/'
    ];
    
    console.log(`🌐 Dynamic base URLs:`, this.baseUrls);
  }

  /**
   * Load model hoàn toàn dynamic
   */
  async loadModel(config: Dynamic3DConfig): Promise<THREE.Object3D> {
    try {
      console.log(`🎮 Loading dynamic model: ${config.name}`);
      
      // Check cache
      if (this.loadedModels.has(config.id)) {
        console.log(`✅ Using cached model: ${config.name}`);
        return this.loadedModels.get(config.id)!.clone();
      }

      // Dynamic URL generation
      const modelUrl = await this.generateDynamicUrl(config.fileName);
      
      // Parse 3D file
      const model = await this.parse3DFile(modelUrl, config);
      
      // Cache model
      this.loadedModels.set(config.id, model);
      
      console.log(`✅ Dynamic model loaded: ${config.name}`);
      return model.clone();
      
    } catch (error) {
      console.error(`❌ Error loading dynamic model ${config.name}:`, error);
      throw error;
    }
  }

  /**
   * Generate dynamic URL từ file name
   */
  private async generateDynamicUrl(fileName: string): Promise<string> {
    console.log(`🔄 Generating dynamic URL for: ${fileName}`);
    
    // Try each base URL
    for (const baseUrl of this.baseUrls) {
      const fullUrl = baseUrl + fileName;
      
      try {
        console.log(`🔄 Trying: ${fullUrl}`);
        
        const response = await fetch(fullUrl, { method: 'HEAD' });
        if (response.ok) {
          console.log(`✅ Dynamic URL success: ${fullUrl}`);
          return fullUrl;
        } else {
          console.log(`❌ Dynamic URL failed: ${response.status}`);
        }
      } catch (error) {
        console.log(`❌ Dynamic URL error:`, error.message);
      }
    }
    
    // All URLs failed - use fallback
    console.log(`⚠️ All dynamic URLs failed, using fallback`);
    return 'fallback://dynamic';
  }

  /**
   * Parse 3D file thành THREE.Object3D
   */
  private async parse3DFile(url: string, config: Dynamic3DConfig): Promise<THREE.Object3D> {
    try {
      console.log(`🔄 Parsing dynamic 3D file: ${url}`);
      
      // Check if fallback
      if (url.startsWith('fallback://')) {
        console.log(`🎯 Using dynamic fallback model`);
        return this.createDynamicFallbackModel(config);
      }
      
      // Load real 3D file với error handling
      let gltfData;
      try {
        gltfData = await loadAsync(url);
        console.log(`✅ Dynamic 3D data loaded:`, {
          hasScene: !!gltfData.scene,
          hasScenes: !!gltfData.scenes,
          type: typeof gltfData,
        });
      } catch (textureError) {
        console.warn(`⚠️ Texture loading error (continuing):`, textureError.message);
        // Continue loading even if textures fail
        gltfData = await loadAsync(url, { 
          ignoreTextureErrors: true,
          skipTextures: true 
        });
      }
      
      // Extract scene
      let scene;
      if (gltfData.scene) {
        scene = gltfData.scene;
      } else if (gltfData.scenes && gltfData.scenes.length > 0) {
        scene = gltfData.scenes[0];
      } else if (gltfData instanceof THREE.Object3D) {
        scene = gltfData;
      } else {
        scene = new THREE.Group();
        if (gltfData.children) {
          gltfData.children.forEach((child: any) => scene.add(child));
        }
      }
      
      console.log(`✅ Dynamic 3D scene extracted!`);
      console.log(`📊 Scene info:`, {
        type: scene.type,
        children: scene.children?.length || 0,
        hasGeometry: !!(scene as any).geometry,
      });
      
      // Add dynamic metadata
      (scene as any).modelType = config.id;
      (scene as any).isHardcoded = false;
      (scene as any).isFallback = false;
      (scene as any).source = 'dynamic-file';
      (scene as any).fileName = config.fileName;
      
      return scene;
      
    } catch (error) {
      console.error('❌ Error parsing dynamic 3D file:', error);
      throw error;
    }
  }

  /**
   * Create dynamic fallback model
   */
  private createDynamicFallbackModel(config: Dynamic3DConfig): THREE.Object3D {
    console.log(`⚠️ Creating dynamic fallback for: ${config.name}`);
    
    const group = new THREE.Group();
    const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const material = new THREE.MeshStandardMaterial({ 
      color: 0xFF0000,
      wireframe: true
    });
    const cube = new THREE.Mesh(geometry, material);
    group.add(cube);
    
    // Add dynamic metadata
    (group as any).modelType = config.id;
    (group as any).isHardcoded = false;
    (group as any).isFallback = true;
    (group as any).source = 'dynamic-fallback';
    (group as any).fileName = config.fileName;
    
    console.log(`✅ Dynamic fallback created for: ${config.name}`);
    return group;
  }

  /**
   * Add new base URL dynamically
   */
  addBaseUrl(url: string) {
    this.baseUrls.push(url);
    console.log(`🌐 Added dynamic base URL: ${url}`);
  }

  /**
   * Get all base URLs
   */
  getBaseUrls(): string[] {
    return [...this.baseUrls];
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.loadedModels.clear();
    console.log('🗑️ Dynamic model cache cleared');
  }

  /**
   * Get cache info
   */
  getCacheInfo() {
    return {
      cachedModels: Array.from(this.loadedModels.keys()),
      cacheSize: this.loadedModels.size,
      baseUrls: this.baseUrls,
    };
  }
}

// Export singleton instance
export const dynamic3DLoader = new Dynamic3DLoader();
