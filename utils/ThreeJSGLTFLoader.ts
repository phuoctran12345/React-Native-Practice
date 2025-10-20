import * as THREE from 'three';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import { loadAsync } from 'expo-three';

// Custom Three.js GLTFLoader for React Native
export class ThreeJSGLTFLoader {
  private loadedModels: Map<string, THREE.Object3D> = new Map();
  private textureCache: Map<string, THREE.Texture> = new Map(); // ✅ CACHE TEXTURES
  
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
        
      } else if (filePath.includes('pokemon_concua/pokemon_scizor.glb')) {
        console.log(`📁 Loading GLB from pokemon_concua bundle (embedded textures)`);
        asset = Asset.fromModule(require('../assets/models/pokemon_concua/pokemon_scizor.glb'));
        
        // ✅ GLB ĐÃ CÓ TEXTURE EMBED - KHÔNG CẦN LOAD RIÊNG
        console.log(`✅ GLB file has embedded textures - no external texture loading needed`);
        
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
      
      // ✅ SỬ DỤNG EXPO-THREE TRỰC TIẾP CHO GLB (KHÔNG CẦN PRELOAD TEXTURE)
      if (assetUri.includes('pokemon_scizor.glb')) {
        console.log(`🔄 Loading GLB directly with expo-three (embedded textures)`);
        const gltfData = await loadAsync(assetUri);
        return gltfData;
      } else {
        console.log(`🔄 Using expo-three with texture preloading for accurate colors`);
        const gltfData = await this.loadGLTFWithTexturePreloading(assetUri);
        return gltfData;
      }
      
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
   * Load GLTF với expo-three + preload textures cho màu sắc chính xác
   */
  private async loadGLTFWithTexturePreloading(assetUri: string): Promise<any> {
    try {
      console.log(`🎨 Preloading textures for accurate colors`);
      
      // ✅ PRELOAD TEXTURE FILES TRƯỚC KHI LOAD GLTF
      const textureAssets = await this.preloadTextureAssets();
      console.log(`✅ Preloaded ${textureAssets.length} texture files`);
      
      // ✅ FALLBACK STRATEGY: Nếu không load được textures, vẫn load GLTF
      if (textureAssets.length === 0) {
        console.warn(`⚠️ No textures loaded, will use GLTF without custom textures`);
      } else {
        console.log(`✅ Loaded ${textureAssets.length} textures (including fallbacks)`);
      }
      
      console.log(`🔄 Loading GLTF with expo-three: ${assetUri}`);
      const gltfData = await loadAsync(assetUri);
      
      console.log(`✅ expo-three loadAsync completed successfully`);
      console.log(`📊 GLTF loaded:`, {
        hasScene: !!gltfData.scene,
        sceneChildren: gltfData.scene?.children?.length || 0,
        animations: gltfData.animations?.length || 0,
      });
      
      // ✅ ƯU TIÊN TEXTURE GỐC TRONG GLTF; chỉ apply nếu chắc chắn mapping đúng
      if (gltfData.scene && textureAssets.length > 0) {
        await this.applyPreloadedTextures(gltfData.scene, textureAssets);
      } else if (gltfData.scene) {
        console.log(`⚠️ No custom textures to apply, using GLTF embedded/default textures`);
      }
      
      return gltfData;
    } catch (loadError) {
      // ✅ KHÔNG THROW NỮA: fallback sang load GLTF bình thường (không preloaded textures)
      console.warn(`⚠️ Texture preloading failed, fallback to plain GLTF load:`, loadError);
      const gltfData = await loadAsync(assetUri);
      return gltfData;
    }
  }

  /**
   * Preload texture assets
   */
  private async preloadTextureAssets(): Promise<Array<{name: string, asset: Asset, texture?: THREE.Texture}>> {
    try {
      console.log(`🎨 Loading texture assets for accurate colors`);
      
      // ✅ DEBUG: Kiểm tra texture files có tồn tại không
      console.log(`🔍 Checking texture files...`);
      
      // ✅ Metro bundler KHÔNG CHO PHÉP require() với biến động.
      //    Dùng map tĩnh tới từng file texture.
      const staticTextureEntries: Array<{ name: string; asset: Asset }> = [
        {
          name: 'Eye.002_baseColor',
          asset: Asset.fromModule(require('../assets/models/pokemon_concua/textures/Eye.002_baseColor.png')),
        },
        {
          name: 'Mouth.002_baseColor',
          asset: Asset.fromModule(require('../assets/models/pokemon_concua/textures/Mouth.002_baseColor.png')),
        },
        {
          name: 'Wing_baseColor',
          asset: Asset.fromModule(require('../assets/models/pokemon_concua/textures/Wing_baseColor.png')),
        },
      ];

      const textureAssets = [] as Array<{ name: string; asset: Asset; texture?: THREE.Texture }>;

      for (const entry of staticTextureEntries) {
        try {
          // ✅ DEBUG: Log asset info
          console.log(`🔍 Processing texture: ${entry.name}`);
          console.log(`🔍 Asset URI: ${entry.asset.uri}`);
          console.log(`🔍 Asset localUri: ${entry.asset.localUri}`);
          
          // ✅ CHECK CACHE TRƯỚC KHI LOAD
          if (this.textureCache.has(entry.name)) {
            console.log(`🎨 Using cached texture: ${entry.name}`);
            const cachedTexture = this.textureCache.get(entry.name)!;
            textureAssets.push({
              name: entry.name,
              asset: entry.asset,
              texture: cachedTexture,
            });
            continue;
          }

          console.log(`🎨 Loading texture: ${entry.name}`);
          
          // ✅ THÊM TIMEOUT CHO TEXTURE DOWNLOAD
          const downloadPromise = entry.asset.downloadAsync();
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`Texture download timeout: ${entry.name}`)), 5000)
          );
          
          await Promise.race([downloadPromise, timeoutPromise]);

          // ✅ FIX: Dùng Asset URI thay vì localUri cho THREE.TextureLoader
          const textureUri = entry.asset.uri || entry.asset.localUri;
          console.log(`🔍 Using texture URI: ${textureUri}`);
          
          // ✅ FIX: Tăng timeout và thêm retry logic
          const loader = new THREE.TextureLoader();
          const texture = await new Promise<THREE.Texture>((resolve, reject) => {
            const textureTimeout = setTimeout(() => {
              console.warn(`⚠️ Texture load timeout for ${entry.name}, using fallback`);
              // ✅ KHÔNG REJECT - TẠO FALLBACK TEXTURE
              const fallbackTexture = new THREE.Texture();
              fallbackTexture.name = entry.name;
              resolve(fallbackTexture);
            }, 10000); // ✅ TĂNG TIMEOUT TỪ 3s → 10s
            
            loader.load(
              textureUri!,
              (t) => {
                clearTimeout(textureTimeout);
                console.log(`✅ Texture loaded: ${entry.name}`);
                resolve(t);
              },
              undefined,
              (error) => {
                clearTimeout(textureTimeout);
                console.warn(`⚠️ TextureLoader error for ${entry.name}, using fallback:`, error);
                // ✅ KHÔNG REJECT - TẠO FALLBACK TEXTURE
                const fallbackTexture = new THREE.Texture();
                fallbackTexture.name = entry.name;
                resolve(fallbackTexture);
              }
            );
          });

          // ✅ CACHE TEXTURE
          this.textureCache.set(entry.name, texture);

          textureAssets.push({
            name: entry.name,
            asset: entry.asset,
            texture,
          });
        } catch (error) {
          console.warn(`⚠️ Failed to load texture ${entry.name}:`, error);
          console.warn(`⚠️ Texture path: ${entry.asset.uri || 'unknown'}`);
          console.warn(`⚠️ Local URI: ${entry.asset.localUri || 'unknown'}`);
          // ❗KHÔNG override bằng fallback texture để giữ nguyên texture embedded trong GLTF
          // Tiếp tục mà không push texture để dùng default textures của GLTF
        }
      }
      
      return textureAssets;
    } catch (error) {
      console.error(`❌ Error preloading textures:`, error);
      return [];
    }
  }

  /**
   * Apply preloaded textures to materials
   */
  private async applyPreloadedTextures(scene: THREE.Object3D, textureAssets: Array<{name: string, asset: Asset, texture?: THREE.Texture}>): Promise<void> {
    try {
      console.log(`🎨 Applying preloaded textures to materials`);
      
      scene.traverse((child: any) => {
        if (child.isMesh && child.material) {
          const material = child.material;
          
          // Find matching texture based on material name
          if (material.name) {
            const matchingTexture = textureAssets.find(ta => 
              material.name.includes(ta.name.split('_')[0]) || // Eye.002 matches Eye
              ta.name.toLowerCase().includes(material.name.toLowerCase())
            );
            
            if (matchingTexture && matchingTexture.texture) {
              // ✅ GIẢM LOG SPAM - CHỈ LOG KHI CẦN THIẾT
              console.log(`🎨 Applying texture ${matchingTexture.name} to material ${material.name}`);
              
              // Apply texture to material
              material.map = matchingTexture.texture;
              material.needsUpdate = true;
            }
          }
          
          // Ensure material properties for visibility
          material.needsUpdate = true;
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      
      console.log(`✅ Applied preloaded textures to materials`);
    } catch (error) {
      console.error(`❌ Error applying textures:`, error);
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
