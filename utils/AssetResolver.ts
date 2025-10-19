import { Asset } from 'expo-asset';

// Asset Resolver cho Pokemon Models
export class AssetResolver {
  private static instance: AssetResolver;
  private assetCache: Map<string, Asset> = new Map();

  static getInstance(): AssetResolver {
    if (!AssetResolver.instance) {
      AssetResolver.instance = new AssetResolver();
    }
    return AssetResolver.instance;
  }

  /**
   * Resolve asset từ file path
   */
  async resolveAsset(filePath: string): Promise<string> {
    try {
      console.log(`🔍 Resolving asset: ${filePath}`);
      
      // Check cache
      if (this.assetCache.has(filePath)) {
        const cachedAsset = this.assetCache.get(filePath)!;
        console.log(`✅ Using cached asset: ${cachedAsset.localUri}`);
        return cachedAsset.localUri!;
      }

      // Resolve asset dựa trên file path
      // ✅ FIX: LOAD TỪ BUNDLE THAY VÌ URI!
      console.log(`🔄 Loading from bundle: ${filePath}`);
      
      let asset: Asset;
      
      // ✅ LOAD TỪ BUNDLE - KHÔNG HARDCODE!
      if (filePath.includes('pokemon_concua/pokemon_scizor.glb')) {
        console.log(`🦂 Loading Pokemon Scizor from pokemon_concua bundle`);
        asset = Asset.fromModule(require('../assets/models/pokemon_concua/pokemon_scizor.glb'));
      } else if (filePath.includes('pokemon_concua/scene.gltf')) {
        console.log(`📁 Loading scene.gltf from pokemon_concua bundle`);
        asset = Asset.fromModule(require('../assets/models/pokemon_concua/scene.gltf'));
        console.log(`📁 Also loading scene.bin for GLTF support`);
        // Load scene.bin as well for GLTF support
        const binAsset = Asset.fromModule(require('../assets/models/pokemon_concua/scene.bin'));
        await binAsset.downloadAsync();
      } else if (filePath.includes('scene.gltf')) {
        console.log(`📁 Loading scene.gltf from root bundle`);
        asset = Asset.fromModule(require('../assets/models/scene.gltf'));
      } else if (filePath.includes('pokemon_scizor.glb')) {
        console.log(`🦂 Loading Pokemon Scizor from root bundle`);
        asset = Asset.fromModule(require('../assets/models/pokemon_scizor.glb'));
      } else {
        throw new Error(`Unsupported asset: ${filePath}`);
      }
      
      // Download asset
      await asset.downloadAsync();
      
      // Cache asset
      this.assetCache.set(filePath, asset);
      
      console.log(`✅ Asset resolved successfully: ${asset.localUri}`);
      console.log(`📁 File size: ${asset.downloaded ? 'Downloaded' : 'Local'}`);
      return asset.localUri!;
      
    } catch (error) {
      console.error(`❌ Error resolving asset ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.assetCache.clear();
    console.log('🗑️ Asset cache cleared');
  }

  /**
   * Get cache info
   */
  getCacheInfo() {
    return {
      cachedAssets: Array.from(this.assetCache.keys()),
      cacheSize: this.assetCache.size,
    };
  }
}

// Export singleton
export const assetResolver = AssetResolver.getInstance();
