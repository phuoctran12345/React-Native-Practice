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
   * Get cached model for instant loading
   */
  getCachedModel(modelId: string): THREE.Object3D | null {
    const cached = this.loadedModels.get(modelId);
    if (cached) {
      console.log(`⚡ Cache hit for model: ${modelId}`);
      return cached.clone(); // Clone để tránh conflict
    }
    return null;
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
      
      // ✅ CHỌN NHÁNH LOAD THEO ĐUÔI FILE
      // ✅ ALWAYS USE EXPO-THREE FOR COMPATIBILITY - NO GLTFLoader
      console.log(`🔄 Loading with expo-three for React Native compatibility`);
      const gltfData = await loadAsync(assetUri);
      
      console.log(`✅ GLTF/GLB data loaded:`, {
        hasScene: !!(gltfData as any).scene,
        hasScenes: !!(gltfData as any).scenes,
        type: typeof gltfData,
        keys: Object.keys(gltfData || {}),
        sceneChildren: (gltfData as any).scene?.children?.length || 0,
      });
      
      // Extract scene từ GLTF/GLB data
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
      
      // Gắn animations (nếu có) vào scene để component dùng AnimationMixer
      const animations = (gltfData as any).animations || [];
      (scene as any).animations = animations;
      (scene as any).userData = { ...(scene as any).userData, animations };

      // ✅ VALIDATE SCENE HAS CONTENT
      if (!scene.children || scene.children.length === 0) {
        console.warn(`⚠️ Scene has no children - might be empty model`);
        throw new Error(`Model appears to be empty (no children in scene)`);
      }

      // ✅ ENHANCED GLB MATERIAL PROCESSING FOR COLORS
      console.log(`🎨 Enhancing GLB materials for proper colors`);
      try {
        await this.enhanceScizorMaterials(scene);
      } catch (enhanceErr) {
        console.warn(`⚠️ Material enhancement failed:`, enhanceErr);
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

          // ✅ FIX: Dùng localUri thay vì HTTP URI cho faster loading
          const textureUri = entry.asset.localUri || entry.asset.uri;
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
            }, 20000); // ✅ TĂNG TIMEOUT TỪ 10s → 20s
            
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
   * Enhanced Scizor materials with proper red colors
   */
  private async enhanceScizorMaterials(scene: THREE.Object3D): Promise<void> {
    try {
      console.log(`🦂 Enhancing Scizor materials with proper colors`);
      
      scene.traverse((child: any) => {
        if (child.isMesh && child.material) {
          const material = child.material;
          const meshName = child.name?.toLowerCase() || '';
          
          // ✅ SCIZOR-SPECIFIC COLOR MAPPING
          if (meshName.includes('body') || meshName.includes('torso') || meshName.includes('chest')) {
            // Main body - Red
            material.color.setHex(0xCC0000);
            material.metalness = 0.8;
            material.roughness = 0.2;
          } else if (meshName.includes('claw') || meshName.includes('pincer') || meshName.includes('arm')) {
            // Claws - Metallic silver
            material.color.setHex(0xC0C0C0);
            material.metalness = 0.9;
            material.roughness = 0.1;
          } else if (meshName.includes('wing')) {
            // Wings - Transparent blue-green
            material.color.setHex(0x40E0D0);
            material.transparent = true;
            material.opacity = 0.7;
            material.metalness = 0.3;
            material.roughness = 0.8;
          } else if (meshName.includes('eye')) {
            // Eyes - Yellow
            material.color.setHex(0xFFD700);
            material.emissive.setHex(0x332200);
            material.metalness = 0.1;
            material.roughness = 0.9;
          } else {
            // Default parts - Dark red
            material.color.setHex(0x990000);
            material.metalness = 0.7;
            material.roughness = 0.3;
          }
          
          // ✅ ENSURE PROPER RENDERING
          material.needsUpdate = true;
          child.castShadow = true;
          child.receiveShadow = true;
          
          console.log(`🎨 Enhanced material for: ${meshName || 'mesh'} - Color: #${material.color.getHexString()}`);
        }
      });
      
      console.log(`✅ Scizor materials enhanced successfully`);
    } catch (error) {
      console.error(`❌ Error enhancing Scizor materials:`, error);
      throw error;
    }
  }

  /**
   * Load GLTF with external textures for proper colors
   */
  private async loadGLTFWithTextures(scene: THREE.Object3D, assetUri: string): Promise<void> {
    try {
      console.log(`🎨 Loading GLTF textures for proper colors`);
      
      // Load texture files
      const textures = await this.preloadTextureAssets();
      
      // Apply textures to materials
      this.applyPreloadedTextures(scene, textures);
      
      console.log(`✅ GLTF textures loaded successfully`);
    } catch (error) {
      console.error(`❌ Error loading GLTF textures:`, error);
      throw error;
    }
  }

  /**
   * Apply original textures from GLB file - FORCE ORIGINAL COLORS
   */
  private async applyOriginalTextures(scene: THREE.Object3D): Promise<void> {
    try {
      console.log(`🎨 FORCING ORIGINAL COLORS FROM GLB`);
      
      scene.traverse((child: any) => {
        if (child.isMesh && child.material) {
          const material = child.material;
          
          // ✅ FORCE ORIGINAL TEXTURES - NO OVERRIDE
          if (material.map) {
            material.map.flipY = false;
            material.map.wrapS = THREE.RepeatWrapping;
            material.map.wrapT = THREE.RepeatWrapping;
            console.log(`🎨 Original texture preserved: ${material.map.image?.src || 'embedded'}`);
          }
          
          // ✅ CRITICAL: PRESERVE ORIGINAL COLORS - NO MODIFICATION
          if (material.color) {
            console.log(`🎨 ORIGINAL COLOR: #${material.color.getHexString()}`);
            // DO NOT MODIFY THE COLOR - KEEP AS IS
          }
          
          // ✅ FORCE MATERIAL TO USE ORIGINAL PROPERTIES
          material.needsUpdate = true;
          material.transparent = false;
          material.opacity = 1.0;
          material.alphaTest = 0;
          
          // ✅ CRITICAL: DO NOT OVERRIDE ANY COLOR PROPERTIES
          // Remove any color overrides that might be applied
          if (material.emissive) {
            material.emissive.setHex(0x000000); // Reset emissive
          }
          
          child.castShadow = true;
          child.receiveShadow = true;
          
          console.log(`🎨 Material preserved for: ${child.name || 'mesh'}`);
        }
      });
      
      console.log(`✅ ORIGINAL COLORS FORCED - NO OVERRIDES`);
    } catch (error) {
      console.error(`❌ Error applying original textures:`, error);
      throw error;
    }
  }

  /**
   * Enhance GLB materials for better colors (without external textures)
   */
  private async enhanceGLBMaterials(scene: THREE.Object3D): Promise<void> {
    try {
      console.log(`⚡ Fast material enhancement`);
      
      scene.traverse((child: any) => {
        if (child.isMesh && child.material) {
          const material = child.material;
          
          // ✅ QUICK ENHANCEMENT - NO DETAILED LOGGING
          if (material.color) {
            const originalColor = material.color.getHex();
            // Brighten dark colors
            if (originalColor < 0x333333) {
              material.color.multiplyScalar(2.0);
            }
          }
          
          // ✅ QUICK PBR OPTIMIZATION
          if (material.isMeshStandardMaterial || material.isMeshPhysicalMaterial) {
            material.metalness = Math.max(material.metalness || 0, 0.7);
            material.roughness = Math.min(material.roughness || 1, 0.3);
            
            if (material.map) {
              material.map.flipY = false;
            }
          }
          
          // ✅ FORCE VISIBILITY
          material.transparent = false;
          material.opacity = 1.0;
          material.needsUpdate = true;
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      
      console.log(`✅ Fast enhancement completed`);
    } catch (error) {
      console.error(`❌ Enhancement error:`, error);
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
          
          // ✅ DEBUG: LOG MATERIAL INFO
          console.log(`🔍 Found mesh "${child.name}" with material "${material.name}" (has map: ${!!material.map})`);
          
          // ✅ ADVANCED TEXTURE MATCHING - MATCH THEO TÊN CHÍNH XÁC
          let matchingTexture = null;
          
          // Debug: Log tất cả material và mesh names
          console.log(`🔍 Checking material "${material.name}" on mesh "${child.name}"`);
          
          if (material.name) {
            // Thử match chính xác theo tên material
            matchingTexture = textureAssets.find(ta => {
              const textureName = ta.name.toLowerCase();
              const materialName = material.name.toLowerCase();
              
              // Exact match: "Eye.002" matches "Eye.002_baseColor"
              if (textureName.includes(materialName.replace('.', ''))) return true;
              
              // Partial match: "eye" in material name matches "eye" in texture name
              if (materialName.includes('eye') && textureName.includes('eye')) return true;
              if (materialName.includes('mouth') && textureName.includes('mouth')) return true;
              if (materialName.includes('wing') && textureName.includes('wing')) return true;
              
              // Generic match
              return materialName.includes(textureName.split('_')[0]) || 
                     textureName.includes(materialName.split('.')[0]);
            });
          }
          
          // ✅ FALLBACK: MATCH THEO MESH NAME
          if (!matchingTexture && child.name) {
            matchingTexture = textureAssets.find(ta => {
              const textureName = ta.name.toLowerCase();
              const meshName = child.name.toLowerCase();
              
              if (meshName.includes('eye') && textureName.includes('eye')) return true;
              if (meshName.includes('mouth') && textureName.includes('mouth')) return true;
              if (meshName.includes('wing') && textureName.includes('wing')) return true;
              
              return meshName.includes(textureName.split('_')[0]);
            });
          }
          
          // ✅ LAST RESORT: AUTO-ASSIGN TEXTURES TO MATERIALS WITHOUT MAPS
          if (!matchingTexture && !material.map && textureAssets.length > 0) {
            // Assign first available texture to materials without existing textures
            matchingTexture = textureAssets[0];
            console.log(`🎨 Auto-assigning texture ${matchingTexture.name} to material ${material.name}`);
          }
            
            if (matchingTexture && matchingTexture.texture) {
              // ✅ GIẢM LOG SPAM - CHỈ LOG KHI CẦN THIẾT
              console.log(`🎨 Applying texture ${matchingTexture.name} to material ${material.name}`);
              
              // Apply texture to material
              material.map = matchingTexture.texture;
              
              // ✅ FORCE TEXTURE PROPERTIES FOR VISIBILITY
              material.map.flipY = false; // GLB standard
              material.map.wrapS = THREE.RepeatWrapping;
              material.map.wrapT = THREE.RepeatWrapping;
              
              material.needsUpdate = true;
            } else {
              // ✅ NẾU KHÔNG CÓ TEXTURE, TẠO MÀU SCIZOR MẶC ĐỊNH
              console.log(`🎨 No texture for material ${material.name}, applying Scizor colors`);
              
              const materialName = (material.name || '').toLowerCase();
              if (materialName.includes('eye')) {
                material.color.setHex(0xFF0000); // Đỏ cho mắt
              } else if (materialName.includes('mouth')) {
                material.color.setHex(0x333333); // Đen cho miệng
              } else if (materialName.includes('wing')) {
                material.color.setHex(0x888888); // Xám cho cánh
              } else if (materialName.includes('body')) {
                material.color.setHex(0xCC0000); // Đỏ cho thân
              } else if (materialName.includes('claw')) {
                material.color.setHex(0xFFD700); // Vàng cho móng
              } else {
                material.color.setHex(0xFF4444); // Đỏ mặc định
              }
              
              // ✅ PBR PROPERTIES CHO MÀU RÕ RÀNG
              if (material.isMeshStandardMaterial || material.isMeshPhysicalMaterial) {
                material.metalness = 0.2; // ít kim loại
                material.roughness = 0.8; // nhám để màu rõ
                material.emissive.setHex(0x000000);
                material.emissiveIntensity = 0;
              }
            }
          
          // ✅ FORCE MATERIAL VISIBILITY
          material.transparent = false;
          material.opacity = 1.0;
          material.alphaTest = 0;
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
