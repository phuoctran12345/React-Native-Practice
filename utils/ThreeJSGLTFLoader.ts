import * as THREE from 'three';
import { GLTFLoader } from 'three-stdlib';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';

// Custom Three.js GLTFLoader for React Native
export class ThreeJSGLTFLoader {
  private loadedModels: Map<string, THREE.Object3D> = new Map();
  
  constructor() {
    console.log('🔧 Three.js GLTFLoader initialized for React Native');
  }

  /**
   * Load GLTF model với Three.js GLTFLoader - 100% chính xác
   */
  async loadModel(config: any): Promise<THREE.Object3D> {
    try {
      console.log(`📦 Loading GLTF model with Three.js: ${config.name}`);
      
      // Check cache trước
      if (this.loadedModels.has(config.id)) {
        console.log(`✅ Using cached model: ${config.name}`);
        return this.loadedModels.get(config.id)!.clone();
      }

      // Load asset từ file
      let assetUri: string;
      try {
        console.log(`🏠 Loading from local assets: ${config.filePath}`);
        assetUri = await this.resolveLocalAsset(config.filePath);
        console.log(`✅ Local asset loaded: ${assetUri}`);
      } catch (localError) {
        console.log(`❌ Local asset failed: ${localError}`);
        throw localError;
      }
      
      // Parse GLTF với Three.js GLTFLoader
      const model = await this.parseGLTFWithThreeJS(assetUri, config);
      
      // Cache model
      this.loadedModels.set(config.id, model);
      
      console.log(`✅ Three.js GLTF model loaded successfully: ${config.name}`);
      return model.clone();
      
    } catch (error) {
      console.error(`❌ Error loading Three.js GLTF model ${config.name}:`, error);
      throw error;
    }
  }

  /**
   * Resolve local asset
   */
  private async resolveLocalAsset(filePath: string): Promise<string> {
    try {
      console.log(`🔍 Resolving local asset: ${filePath}`);
      
      let asset: Asset;
      
      if (filePath.includes('pokemon_concua/scene.gltf')) {
        console.log(`📁 Loading scene.gltf from pokemon_concua bundle`);
        asset = Asset.fromModule(require('../assets/models/pokemon_concua/scene.gltf'));
        
        // Load scene.bin
        console.log(`📁 Loading scene.bin for GLTF support`);
        const binAsset = Asset.fromModule(require('../assets/models/pokemon_concua/scene.bin'));
        await binAsset.downloadAsync();
        
        // Load texture files
        console.log(`🎨 Loading texture files for 100% accuracy`);
        const eyeTexture = Asset.fromModule(require('../assets/models/pokemon_concua/textures/Eye.002_baseColor.png'));
        const mouthTexture = Asset.fromModule(require('../assets/models/pokemon_concua/textures/Mouth.002_baseColor.png'));
        const wingTexture = Asset.fromModule(require('../assets/models/pokemon_concua/textures/Wing_baseColor.png'));
        
        await Promise.all([
          eyeTexture.downloadAsync(),
          mouthTexture.downloadAsync(),
          wingTexture.downloadAsync()
        ]);
        
      } else {
        throw new Error(`Unsupported asset: ${filePath}`);
      }
      
      // Download asset
      await asset.downloadAsync();
      
      console.log(`✅ Asset resolved successfully: ${asset.localUri}`);
      return asset.localUri!;
      
    } catch (error) {
      console.error(`❌ Error resolving asset ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Parse GLTF với Three.js GLTFLoader - 100% chính xác
   */
  private async parseGLTFWithThreeJS(assetUri: string, config: any): Promise<THREE.Object3D> {
    try {
      console.log(`🔄 Parsing GLTF with Three.js GLTFLoader: ${assetUri}`);
      
      // Check if this is fallback mode
      if (assetUri.startsWith('fallback://')) {
        console.log(`🎯 Using fallback model (file loading failed)`);
        return this.createFallbackModel(config);
      }
      
      // Kiểm tra file có tồn tại không
      const fileInfo = await FileSystem.getInfoAsync(assetUri);
      if (!fileInfo.exists) {
        throw new Error(`File not found: ${assetUri}`);
      }
      
      console.log(`✅ File exists: ${assetUri}`);
      
      // ✅ SỬ DỤNG GLTFLoader TỪ THREE-STDLIB - 100% CHÍNH XÁC
      console.log(`🔄 Using GLTFLoader from three-stdlib for 100% accuracy`);
      const gltfData = await this.loadGLTFWithThreeStdlib(assetUri);
      
      console.log(`✅ GLTF data loaded with Three.js:`, {
        hasScene: !!(gltfData as any).scene,
        hasScenes: !!(gltfData as any).scenes,
        type: typeof gltfData,
        keys: Object.keys(gltfData || {}),
        sceneChildren: (gltfData as any).scene?.children?.length || 0,
      });
      
      // Extract scene từ GLTF data
      let scene: THREE.Object3D;
      if ((gltfData as any).scene) {
        scene = (gltfData as any).scene;
        console.log(`✅ Using gltfData.scene`);
      } else if ((gltfData as any).scenes && (gltfData as any).scenes.length > 0) {
        scene = (gltfData as any).scenes[0];
        console.log(`✅ Using gltfData.scenes[0]`);
      } else {
        console.log(`⚠️ No scene found, creating fallback group`);
        scene = new THREE.Group();
        if ((gltfData as any).children) {
          (gltfData as any).children.forEach((child: any) => (scene as THREE.Group).add(child));
        }
      }
      
      // ✅ VALIDATE SCENE HAS CONTENT
      if (!scene.children || scene.children.length === 0) {
        console.warn(`⚠️ Scene has no children - might be empty model`);
        throw new Error(`Model appears to be empty (no children in scene)`);
      }
      
      console.log(`✅ 3D scene extracted successfully with Three.js!`);
      console.log(`📊 Scene info:`, {
        type: scene.type,
        children: scene.children?.length || 0,
        hasGeometry: !!(scene as any).geometry,
      });
      
      // Add metadata
      (scene as any).modelType = config.id;
      (scene as any).isHardcoded = false;
      (scene as any).isFallback = false;
      (scene as any).source = 'three-js-gltf';
      
      return scene;
      
    } catch (error) {
      console.error('❌ Error parsing GLTF with Three.js:', error);
      console.error('❌ Error details:', {
        message: (error as Error).message,
        stack: (error as Error).stack,
        assetUri,
        config: config.name
      });
      throw error;
    }
  }

  /**
   * Load GLTF với GLTFLoader từ three-stdlib - 100% chính xác
   */
  private async loadGLTFWithThreeStdlib(assetUri: string): Promise<any> {
    try {
      console.log(`🔄 Creating GLTFLoader from three-stdlib`);
      const loader = new GLTFLoader();
      
      // ✅ ĐẶT RESOURCE PATH ĐỂ TỰ ĐỘNG LOAD TEXTURES
      const baseDir = assetUri.replace(/[^/]+$/, ''); // Lấy thư mục chứa file
      console.log(`📁 Setting resource path: ${baseDir}`);
      loader.setPath(baseDir);
      loader.setResourcePath(baseDir);
      
      // Load GLTF với Promise
      const gltfData = await new Promise((resolve, reject) => {
        console.log(`🔄 Loading GLTF: ${assetUri}`);
        loader.load(
          assetUri,
          (gltf) => {
            console.log(`✅ GLTFLoader completed successfully!`);
            console.log(`📊 GLTF loaded:`, {
              hasScene: !!gltf.scene,
              sceneChildren: gltf.scene?.children?.length || 0,
              animations: gltf.animations?.length || 0,
            });
            resolve(gltf);
          },
          (progress) => {
            if (progress.total > 0) {
              const percent = (progress.loaded / progress.total * 100).toFixed(1);
              console.log(`📊 Loading progress: ${percent}%`);
            }
          },
          (error) => {
            console.error(`❌ GLTFLoader failed:`, error);
            reject(error);
          }
        );
      });
      
      return gltfData;
    } catch (loadError) {
      console.error(`❌ GLTFLoader from three-stdlib failed:`, loadError);
      throw new Error(`GLTFLoader failed to load GLTF file: ${(loadError as Error).message}`);
    }
  }

  /**
   * Tạo fallback model
   */
  private createFallbackModel(config: any): THREE.Object3D {
    console.log(`🎯 Creating fallback model for ${config.name}`);
    
    const group = new THREE.Group();
    
    // Tạo Scizor-like fallback
    const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.4, 0.8, 8);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x8B0000 }); // Dark red
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.2;
    group.add(body);
    
    // Head
    const headGeometry = new THREE.SphereGeometry(0.25, 8, 6);
    const headMaterial = new THREE.MeshStandardMaterial({ color: 0x8B0000 });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 0.6;
    group.add(head);
    
    // Claws
    const clawGeometry = new THREE.BoxGeometry(0.3, 0.1, 0.1);
    const clawMaterial = new THREE.MeshStandardMaterial({ color: 0x2F4F4F });
    const leftClaw = new THREE.Mesh(clawGeometry, clawMaterial);
    leftClaw.position.set(-0.4, 0.3, 0);
    group.add(leftClaw);
    
    const rightClaw = new THREE.Mesh(clawGeometry, clawMaterial);
    rightClaw.position.set(0.4, 0.3, 0);
    group.add(rightClaw);
    
    // Wings
    const wingGeometry = new THREE.PlaneGeometry(0.4, 0.3);
    const wingMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x4169E1, 
      transparent: true, 
      opacity: 0.7 
    });
    const leftWing = new THREE.Mesh(wingGeometry, wingMaterial);
    leftWing.position.set(-0.2, 0.5, 0);
    leftWing.rotation.z = Math.PI / 4;
    group.add(leftWing);
    
    const rightWing = new THREE.Mesh(wingGeometry, wingMaterial);
    rightWing.position.set(0.2, 0.5, 0);
    rightWing.rotation.z = -Math.PI / 4;
    group.add(rightWing);
    
    // Scale theo config
    if (config.scale) {
      group.scale.setScalar(config.scale);
    }
    
    // Mark as fallback
    (group as any).isFallback = true;
    (group as any).originalScale = config.scale || 1;
    
    return group;
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.loadedModels.clear();
    console.log('🗑️ Three.js model cache cleared');
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

// Export singleton
export const threeJSGLTFLoader = new ThreeJSGLTFLoader();
